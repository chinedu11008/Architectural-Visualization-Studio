import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { IfcAPI } from 'web-ifc';
import wasmUrl from 'web-ifc/web-ifc.wasm?url';
import { getLocalAssetBlob, MAX_BROWSER_IFC_BYTES } from '../lib/local-assets';
import { analyzeIfcModel, completeIfcAnalysis } from '../lib/ifc-analysis';
import { makeRuleBasedContextLayer } from '../lib/context-layer';
import { locateMainEntrance } from '../lib/ifc-entrance';
import { elementColorRole } from '../lib/element-roles';
import { buildRoomFurnishings } from '../lib/room-furnishings';

const materialPalettes = {
  source: null,
  reference: null,
  warm: { color: '#d8c7aa', roughness: 0.78 },
  concrete: { color: '#9ba3a4', roughness: 0.84 },
  timber: { color: '#a96f45', roughness: 0.7 },
};

const lightingPalettes = {
  daylight: { ambient: 1.05, key: 2.2, color: '#fff1d6', fill: 0.5 },
  overcast: { ambient: 1.55, key: 1.1, color: '#d6e2ed', fill: 0.8 },
  golden: { ambient: 0.78, key: 2.7, color: '#ffd09a', fill: 0.35 },
  blue: { ambient: 0.48, key: 1.65, color: '#9ab8ef', fill: 0.25 },
};

function inferSurfaceRole(object, buildingBounds) {
  const bounds = new THREE.Box3().setFromObject(object);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const buildingSize = buildingBounds.getSize(new THREE.Vector3());
  const isNearTop = center.z >= buildingBounds.max.z - buildingSize.z * 0.18;
  const isShallow = size.z <= Math.max(buildingSize.z * 0.24, Math.max(size.x, size.y) * 0.35);
  // Position alone cannot safely distinguish a wall from a window or facade trim.
  // Only infer a roof when the geometry is both high and shallow; leave the rest
  // in its original IFC colour until element metadata identifies its role.
  return isNearTop && isShallow ? 'roof' : null;
}

function presetRoleColor(style, role) {
  if (style === 'reference' || style === 'source' || !role || role === 'glazing') return null;
  if (role === 'exteriorWall') return materialPalettes[style]?.color || null;
  return null;
}

function getMeshMaterial(color, style, roles, role, materialCache) {
  const roleColor = role ? (presetRoleColor(style, role) || (style === 'reference' ? roles?.[role] : null)) : null;
  const cacheKey = `${style}:${role || 'source'}:${color.x}:${color.y}:${color.z}:${color.w}:${roleColor || ''}`;
  if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
  const source = roleColor ? new THREE.Color(roleColor) : new THREE.Color(color.x, color.y, color.z);
  const roughness = (role === 'glazing') ? 0.16 : (materialPalettes[style]?.roughness ?? 0.82);
  const material = new THREE.MeshStandardMaterial({
    color: source,
    roughness,
    metalness: 0,
    opacity: color.w ?? 1,
    transparent: (color.w ?? 1) < 0.99,
    side: THREE.DoubleSide,
  });
  materialCache.set(cacheKey, material);
  return material;
}

function buildGeometry(api, modelId, placed) {
  const ifcGeometry = api.GetGeometry(modelId, placed.geometryExpressID);
  const ifcVertices = api.GetVertexArray(ifcGeometry.GetVertexData(), ifcGeometry.GetVertexDataSize());
  const ifcIndices = api.GetIndexArray(ifcGeometry.GetIndexData(), ifcGeometry.GetIndexDataSize());
  const geometry = new THREE.BufferGeometry();
  const interleavedVertices = new THREE.InterleavedBuffer(ifcVertices, 6);
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(interleavedVertices, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(interleavedVertices, 3, 3));
  geometry.setIndex(new THREE.BufferAttribute(ifcIndices, 1));
  geometry.computeBoundingSphere();
  ifcGeometry.delete();
  return geometry;
}

function detectIfcUpAxis(api, modelId) {
  try {
    const contextType = api.GetTypeCodeFromName('IFCGEOMETRICREPRESENTATIONCONTEXT');
    const contexts = api.GetLineIDsWithType(modelId, contextType, true);
    for (let index = 0; index < contexts.size(); index += 1) {
      const context = api.GetLine(modelId, contexts.get(index), true);
      const ratios = context?.WorldCoordinateSystem?.Axis?.DirectionRatios;
      if (!ratios || ratios.length < 3) continue;
      const values = Array.from(ratios, (ratio) => Number(ratio?.value ?? ratio));
      if (values.some((value) => !Number.isFinite(value))) continue;
      const dominant = values.slice(0, 3).reduce((largest, value, axis, directions) => (
        Math.abs(value) > Math.abs(directions[largest]) ? axis : largest
      ), 0);
      // Only trust metadata when one component clearly dominates (a definitive axis direction)
      if (Math.abs(values[dominant]) > 0.7) return dominant;
    }
  } catch {
    // fall through to heuristic
  }
  return null; // no conclusive metadata — caller should use bounding-box heuristic
}

function detectUpAxisFromBounds(bounds) {
  // Heuristic: for architectural models the up axis typically has its bounding-box
  // minimum closest to zero (ground level) while horizontal axes are more symmetric
  // around the centre. As a secondary signal the vertical extent is usually the
  // largest axis for multi-storey buildings, but we weight ground-proximity higher
  // because it is more reliable across low-rise and high-rise models alike.
  const size = bounds.getSize(new THREE.Vector3());
  const min = bounds.min;
  const axes = [
    { axis: 0, absMin: Math.abs(min.x), extent: size.x },
    { axis: 1, absMin: Math.abs(min.y), extent: size.y },
    { axis: 2, absMin: Math.abs(min.z), extent: size.z },
  ];
  // Sort: prefer axis whose min is closest to 0, then break ties with larger extent
  axes.sort((a, b) => a.absMin - b.absMin || b.extent - a.extent);
  return axes[0].axis;
}

function applyAxisCorrection(root, sourceBounds, upAxis) {
  const sourceUp = new THREE.Vector3().setComponent(upAxis, 1);
  root.quaternion.setFromUnitVectors(sourceUp, new THREE.Vector3(0, 0, 1));
  const center = sourceBounds.getCenter(new THREE.Vector3());
  root.position.copy(center).sub(center.clone().applyQuaternion(root.quaternion));
  root.updateMatrixWorld(true);
}

function cameraPosition(preset, center, radius, upAxis) {
  if (upAxis === 2) {
    if (preset === 'top') return new THREE.Vector3(center.x, center.y - radius * 0.04, center.z + radius * 2.15);
    if (preset === 'eye-level') return new THREE.Vector3(center.x + radius * 1.65, center.y + radius * 1.2, center.z + radius * 0.22);
    return new THREE.Vector3(center.x + radius * 1.45, center.y + radius * 1.65, center.z + radius * 1.2);
  }
  if (preset === 'top') return new THREE.Vector3(center.x, center.y + radius * 2.15, center.z - radius * 0.04);
  if (preset === 'eye-level') return new THREE.Vector3(center.x + radius * 1.2, center.y + radius * 0.22, center.z + radius * 1.65);
  return new THREE.Vector3(center.x + radius * 1.45, center.y + radius * 1.2, center.z + radius * 1.65);
}

const skyPalettes = {
  clear: ['#376b91', '#d9d9c9'],
  overcast: ['#667786', '#c6c9c5'],
  golden: ['#426080', '#f0aa68'],
  blue: ['#081222', '#526c91'],
};

function smoothStep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function makeNoiseGrid(columns, rows, seed) {
  let state = seed;
  const values = new Float32Array(columns * rows);
  for (let index = 0; index < values.length; index += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    values[index] = state / 4294967296;
  }
  return { columns, rows, values };
}

function sampleNoiseGrid(grid, u, v) {
  const x = u * grid.columns;
  const y = THREE.MathUtils.clamp(v, 0, 0.999999) * (grid.rows - 1);
  const x0 = Math.floor(x) % grid.columns;
  const x1 = (x0 + 1) % grid.columns;
  const y0 = Math.floor(y);
  const y1 = Math.min(y0 + 1, grid.rows - 1);
  const tx = x - Math.floor(x);
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const top = THREE.MathUtils.lerp(grid.values[y0 * grid.columns + x0], grid.values[y0 * grid.columns + x1], sx);
  const bottom = THREE.MathUtils.lerp(grid.values[y1 * grid.columns + x0], grid.values[y1 * grid.columns + x1], sx);
  return THREE.MathUtils.lerp(top, bottom, sy);
}

function makeSkyTexture(environment, referenceSky = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 384;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const [paletteTop, paletteHorizon] = skyPalettes[environment] || skyPalettes.clear;
  const referenceBlue = new THREE.Color(referenceSky.skyColor || paletteTop);
  const horizonColor = new THREE.Color(paletteHorizon);
  const topColor = referenceSky.skyColor
    ? referenceBlue.clone().lerp(new THREE.Color(environment === 'blue' ? '#081222' : '#174b78'), environment === 'blue' ? 0.18 : 0.28)
    : new THREE.Color(paletteTop);
  const cloudColor = new THREE.Color(referenceSky.cloudColor || '#edf2f3');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, `#${topColor.getHexString()}`);
  gradient.addColorStop(0.43, `#${referenceBlue.clone().lerp(horizonColor, 0.3).getHexString()}`);
  gradient.addColorStop(0.68, `#${horizonColor.clone().lerp(cloudColor, 0.23).getHexString()}`);
  gradient.addColorStop(1, `#${horizonColor.getHexString()}`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const requestedCloudiness = Number(referenceSky.cloudiness);
  const cloudiness = environment === 'overcast'
    ? Math.max(0.78, Number.isFinite(requestedCloudiness) ? requestedCloudiness : 0.78)
    : THREE.MathUtils.clamp(Number.isFinite(requestedCloudiness) ? requestedCloudiness : 0.38, 0.18, 0.88);
  const grids = [
    { grid: makeNoiseGrid(7, 5, 2027), weight: 0.48 },
    { grid: makeNoiseGrid(15, 10, 7141), weight: 0.29 },
    { grid: makeNoiseGrid(31, 19, 991), weight: 0.15 },
    { grid: makeNoiseGrid(61, 35, 4421), weight: 0.08 },
  ];
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const cloudHex = cloudColor.getHex();
  const cloudRgb = [(cloudHex >> 16) & 255, (cloudHex >> 8) & 255, cloudHex & 255];
  const coverage = THREE.MathUtils.clamp(0.28 + cloudiness * 0.7, 0.38, 0.93);
  const threshold = 0.83 - coverage * 0.47;
  for (let y = 0; y < canvas.height; y += 1) {
    const v = y / canvas.height;
    const aboveHorizon = 1 - smoothStep(0.47, 0.57, v);
    const cloudHeight = 0.38 + 0.62 * smoothStep(0.015, 0.17, v);
    if (aboveHorizon < 0.005) continue;
    for (let x = 0; x < canvas.width; x += 1) {
      const u = x / canvas.width;
      let noise = 0;
      grids.forEach(({ grid, weight }) => { noise += sampleNoiseGrid(grid, u, v) * weight; });
      const billow = noise + (sampleNoiseGrid(grids[1].grid, u + 0.035, v + 0.06) - 0.5) * 0.1;
      const puff = smoothStep(threshold, threshold + 0.17, billow);
      const alpha = puff * aboveHorizon * cloudHeight * (0.22 + coverage * 0.68);
      if (alpha < 0.01) continue;
      const pixel = (y * canvas.width + x) * 4;
      image.data[pixel] = THREE.MathUtils.lerp(image.data[pixel], cloudRgb[0], alpha);
      image.data[pixel + 1] = THREE.MathUtils.lerp(image.data[pixel + 1], cloudRgb[1], alpha);
      image.data[pixel + 2] = THREE.MathUtils.lerp(image.data[pixel + 2], cloudRgb[2], alpha);
    }
  }
  context.putImageData(image, 0, 0);

  const sunX = canvas.width * 0.35;
  const sunY = canvas.height * 0.2;
  const glow = context.createRadialGradient(sunX, sunY, 2, sunX, sunY, canvas.width * 0.13);
  glow.addColorStop(0, environment === 'golden' ? 'rgba(255,222,166,0.72)' : 'rgba(255,249,223,0.52)');
  glow.addColorStop(0.18, environment === 'golden' ? 'rgba(255,211,151,0.26)' : 'rgba(255,248,227,0.19)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = glow;
  context.fillRect(sunX - canvas.width * 0.14, sunY - canvas.width * 0.14, canvas.width * 0.28, canvas.width * 0.28);
  if (environment !== 'overcast') {
    context.beginPath();
    context.arc(sunX, sunY, environment === 'blue' ? 4 : 5.5, 0, Math.PI * 2);
    context.fillStyle = environment === 'blue' ? '#dce7f8' : '#fff9e7';
    context.shadowColor = environment === 'golden' ? '#ffd08a' : '#fff4d5';
    context.shadowBlur = 16;
    context.fill();
    context.shadowBlur = 0;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function getBuildingBounds(root) {
  const bounds = new THREE.Box3();
  root.traverse((object) => {
    if (!object.isMesh) return;
    const type = String(object.userData.ifcType || '').toUpperCase();
    if (/IFCSITE|IFCBUILDINGSTOREY|^IFCBUILDING$|IFCSPACE|IFCGEOGRAPHIC|IFCCIVIL|IFCROAD/.test(type)) return;
    object.updateWorldMatrix(true, false);
    bounds.union(new THREE.Box3().setFromObject(object));
  });
  if (bounds.isEmpty()) bounds.setFromObject(root);
  return bounds;
}

function collectSpaceBounds(modelGroup) {
  const boundsById = new Map();
  modelGroup.updateWorldMatrix(true, true);
  modelGroup.traverse((object) => {
    if (!object.isMesh || String(object.userData.ifcType || '').toUpperCase() !== 'IFCSPACE') return;
    const id = String(object.userData.ifcExpressID ?? '');
    if (!id) return;
    object.updateWorldMatrix(true, false);
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) return;
    const accumulated = boundsById.get(id);
    if (accumulated) accumulated.union(bounds);
    else boundsById.set(id, bounds);
  });
  return boundsById;
}

function collectFloorBounds(modelGroup, sourceToMeters = null) {
  const slabs = [];
  const modelBounds = new THREE.Box3().setFromObject(modelGroup);
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const modelExtent = Math.max(modelSize.x, modelSize.y, modelSize.z);
  const metersPerUnit = Number.isFinite(sourceToMeters) && sourceToMeters > 0
    ? sourceToMeters
    : modelExtent > 150 ? 0.001 : 1;

  modelGroup.updateWorldMatrix(true, true);
  modelGroup.traverse((object) => {
    if (!object.isMesh || String(object.userData.ifcType || '').toUpperCase() !== 'IFCSLAB') return;
    const name = [object.userData.ifcName, object.userData.ifcObjectType, object.userData.ifcPredefinedType]
      .filter(Boolean).join(' ').toLowerCase();
    if (/landing|roof|ceiling|ramp|parking|sidewalk/.test(name)) return;
    if (!/floor|base.?slab|\.floor\./.test(name)) return;

    object.updateWorldMatrix(true, false);
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) return;
    const size = bounds.getSize(new THREE.Vector3());
    const width = size.x * metersPerUnit;
    const depth = size.y * metersPerUnit;
    const thickness = size.z * metersPerUnit;
    if (Math.min(width, depth) < 2.8 || width * depth < 8 || thickness > 0.9) return;
    slabs.push({ bounds, storeyId: object.userData.storeyId ?? null });
  });

  const levels = [];
  const levelTolerance = 0.55 / metersPerUnit;
  for (const slab of slabs.sort((first, second) => first.bounds.max.z - second.bounds.max.z)) {
    const level = levels.find((candidate) => Math.abs(candidate.floorZ - slab.bounds.max.z) <= levelTolerance);
    if (level) {
      level.bounds.union(slab.bounds);
      level.floorZ = Math.max(level.floorZ, slab.bounds.max.z);
      level.storeyId ??= slab.storeyId;
    } else {
      levels.push({ bounds: slab.bounds.clone(), floorZ: slab.bounds.max.z, storeyId: slab.storeyId });
    }
  }

  return new Map(levels.map((level, index) => {
    const bounds = level.bounds.clone();
    bounds.min.z = level.floorZ;
    bounds.max.z = level.floorZ + 2.8 / metersPerUnit;
    return [String(level.storeyId ?? `estimated-floor-${index + 1}`), { bounds, storeyId: level.storeyId }];
  }));
}

function disposePresentationGroup(group) {
  const materials = new Set();
  group.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose();
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => material && materials.add(material));
  });
  materials.forEach((material) => material.dispose());
}

function getSiteBounds(root, buildingBounds) {
  const siteBounds = new THREE.Box3();
  root.traverse((object) => {
    if (!object.isMesh || !String(object.userData.ifcType || '').toUpperCase().includes('IFCSITE')) return;
    object.updateWorldMatrix(true, false);
    siteBounds.union(new THREE.Box3().setFromObject(object));
  });
  if (siteBounds.isEmpty()) return null;
  const siteSize = siteBounds.getSize(new THREE.Vector3());
  const buildingSize = buildingBounds.getSize(new THREE.Vector3());
  const minimumMargin = Math.max(2.2, Math.max(buildingSize.x, buildingSize.y) * 0.04);
  const containsBuildingWithMargin = siteBounds.min.x <= buildingBounds.min.x - minimumMargin
    && siteBounds.max.x >= buildingBounds.max.x + minimumMargin
    && siteBounds.min.y <= buildingBounds.min.y - minimumMargin
    && siteBounds.max.y >= buildingBounds.max.y + minimumMargin;
  const largeEnough = siteSize.x >= buildingSize.x + 2 * minimumMargin
    && siteSize.y >= buildingSize.y + 2 * minimumMargin;
  return containsBuildingWithMargin && largeEnough ? siteBounds : null;
}

export default function IfcViewer({ asset, referenceUrl, camera = 'isometric', lighting = 'daylight', materialStyle = 'reference', upAxisPreference = 'auto', environment = 'clear', groundStyle = 'grass', contextObjects = {}, referenceRoles = {}, referenceStyle, buildingType = 'other', surroundingsRules = {}, layoutSeed = 1, entrance = null, visibleStoreyId = '', interiorMode = false, captureRequest, onStatus, onReady, onCapture, onFurnishingsReady }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const roomSpacesRef = useRef([]);
  const sourceToMetersRef = useRef(null);
  const roomFurnishingsRef = useRef(null);
  const orientationRootRef = useRef(null);
  const sourceBoundsRef = useRef(null);
  const siteBoundsRef = useRef(null);
  const detectedUpAxisRef = useRef(2);
  const modelBoundsRef = useRef(null);
  const contextRef = useRef(null);
  const contextLayoutSignatureRef = useRef(null);
  const cameraTargetRef = useRef(null);
  const skyTextureRef = useRef(null);
  const skyDomeRef = useRef(null);
  const onStatusRef = useRef(onStatus);
  const onCaptureRef = useRef(onCapture);
  const [loadState, setLoadState] = useState(asset ? 'loading' : 'empty');
  const [meshCount, setMeshCount] = useState(0);

  useEffect(() => {
    onStatusRef.current = onStatus;
    onCaptureRef.current = onCapture;
  }, [onStatus, onCapture]);

  useEffect(() => {
    let disposed = false;
    let api;
    let modelId;
    let scene;
    let renderer;
    let controls;
    let resizeObserver;

    const initialize = async () => {
      if (!asset?.id || !hostRef.current) {
        setLoadState('empty');
        return;
      }
      if (asset.previewBlocked || (asset.size_bytes || 0) > MAX_BROWSER_IFC_BYTES) {
        setLoadState('too-large');
        onStatus?.(asset.uploadError || 'IFC saved locally. Export a simplified IFC below 64 MiB to preview it safely in this browser.');
        return;
      }
      setLoadState('loading');
      onStatus?.('Downloading IFC source…');
      const localBlob = asset.localId ? await getLocalAssetBlob(asset.localId) : null;
      let ifcBytes;
      if (localBlob) {
        ifcBytes = new Uint8Array(await localBlob.arrayBuffer());
      } else {
        const response = await fetch(`/api/assets/${encodeURIComponent(asset.id)}/content`);
        if (!response.ok) throw new Error(`IFC download failed (${response.status}).`);
        ifcBytes = new Uint8Array(await response.arrayBuffer());
      }
      if (disposed) return;

      api = new IfcAPI();
      await api.Init((path) => path.endsWith('.wasm') ? wasmUrl : path, true);
      if (disposed) return;
      modelId = api.OpenModel(ifcBytes, {
        COORDINATE_TO_ORIGIN: false,
        CIRCLE_SEGMENTS: 12,
        MEMORY_LIMIT: Math.min(Math.max(ifcBytes.byteLength * 16, 128 * 1024 * 1024), 384 * 1024 * 1024),
      });
      ifcBytes = null;
      if (modelId < 0) throw new Error('Web-IFC could not open this model. Export it as IFC4 or IFC2x3 and try again.');
      const schema = api.GetModelSchema(modelId);
      const detectedUpAxis = detectIfcUpAxis(api, modelId);
      const ifcAnalysis = analyzeIfcModel(api, modelId);
      roomSpacesRef.current = ifcAnalysis.spaces || [];
      sourceToMetersRef.current = ifcAnalysis.units?.sourceToMeters ?? null;
      const elementMetadata = ifcAnalysis.elementMetadata || {};

      scene = new THREE.Scene();
      scene.background = new THREE.Color('#0d141c');
      const cameraObject = new THREE.PerspectiveCamera(42, 1, 0.01, 1e8);
      cameraObject.up.set(0, 0, 1);
      const canvasRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
      renderer = canvasRenderer;
      canvasRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      canvasRenderer.outputColorSpace = THREE.SRGBColorSpace;
      canvasRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      canvasRenderer.toneMappingExposure = 1;
      canvasRenderer.shadowMap.enabled = true;
      canvasRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
      hostRef.current.replaceChildren(canvasRenderer.domElement);
      const orbit = new OrbitControls(cameraObject, canvasRenderer.domElement);
      controls = orbit;
      orbit.enableDamping = true;
      orbit.dampingFactor = 0.08;

      const orientationRoot = new THREE.Group();
      orientationRoot.name = 'IFC coordinate correction · presentation only';
      const modelGroup = new THREE.Group();
      modelGroup.name = 'IFC source geometry · locked';
      modelGroup.matrixAutoUpdate = false;
      modelGroup.matrix.identity();
      modelGroup.userData.geometryPolicy = 'immutable';
      orientationRoot.add(modelGroup);
      scene.add(orientationRoot);
      const keyLight = new THREE.DirectionalLight('#fff1d6', 2.2);
      keyLight.position.set(1, 1.8, 1.2);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      keyLight.shadow.bias = -0.00012;
      keyLight.shadow.normalBias = 0.025;
      keyLight.shadow.radius = 3;
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight('#d8e2ef', 0.5);
      fillLight.position.set(-1.2, 0.8, -0.7);
      scene.add(fillLight);
      const ambient = new THREE.HemisphereLight('#eaf0f8', '#4d463d', 1.05);
      ambient.position.set(0, 0, 100);
      scene.add(ambient);

      let placedMeshCount = 0;
      let skippedMeshCount = 0;
      const materialCache = new Map();
      api.StreamAllMeshes(modelId, (flatMesh) => {
        try {
          if (disposed) return;
          for (let geometryIndex = 0; geometryIndex < flatMesh.geometries.size(); geometryIndex += 1) {
            const placed = flatMesh.geometries.get(geometryIndex);
            const geometry = buildGeometry(api, modelId, placed);
            if (geometry.index?.count && geometry.getAttribute('position').count) {
              const metadata = elementMetadata[flatMesh.expressID] || {};
              const role = elementColorRole(metadata);
              const object = new THREE.Mesh(geometry, getMeshMaterial(placed.color, materialStyle, referenceRoles, role, materialCache));
              object.castShadow = true;
              object.receiveShadow = true;
              object.name = `IFC element ${flatMesh.expressID}`;
              object.matrix.fromArray(placed.flatTransformation);
              object.matrixAutoUpdate = false;
              object.userData.ifcExpressID = flatMesh.expressID;
              object.userData.ifcType = metadata.type || '';
              object.userData.ifcName = metadata.name || '';
              object.userData.ifcObjectType = metadata.objectType || '';
              object.userData.ifcPredefinedType = metadata.predefinedType || '';
              object.userData.storeyId = metadata.storeyId ?? null;
              object.userData.colorRole = role || '';
              object.userData.geometryPolicy = 'immutable';
              object.userData.sourceColor = new THREE.Color(placed.color.x, placed.color.y, placed.color.z).getHexString();
              object.userData.sourceOpacity = placed.color.w ?? 1;
              // IfcSpace geometry is a room volume for analysis, not visible building fabric.
              object.visible = metadata.type !== 'IFCSPACE';
              modelGroup.add(object);
              placedMeshCount += 1;
            } else {
              geometry.dispose();
              skippedMeshCount += 1;
            }
          }
        } finally {
          flatMesh.delete?.();
        }
      }, true);

      if (disposed) {
        api.CloseModel(modelId);
        modelId = -1;
        return;
      }
      if (!placedMeshCount) throw new Error('This IFC contains no renderable 3D elements. Check that the export includes model geometry.');

      modelGroup.updateMatrixWorld(true);
      const sourceBounds = new THREE.Box3().setFromObject(modelGroup);
      const resolvedDetectedAxis = detectedUpAxis ?? detectUpAxisFromBounds(sourceBounds);
      const activeUpAxis = upAxisPreference === 'auto' ? resolvedDetectedAxis : Number(upAxisPreference);
      applyAxisCorrection(orientationRoot, sourceBounds, activeUpAxis);
      const bounds = getBuildingBounds(orientationRoot);
      if (bounds.isEmpty()) throw new Error('No visible IFC geometry was found.');
      modelGroup.traverse((object) => {
        if (!object.isMesh || object.userData.colorRole) return;
        object.material = object.material.clone();
        object.userData.colorRole = inferSurfaceRole(object, bounds);
      });
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const radius = Math.max(size.length() * 0.5, 0.5);
      if (keyLight) {
        keyLight.target.position.copy(center);
        scene.add(keyLight.target);
        keyLight.position.copy(center).add(new THREE.Vector3(1.05, -1.35, 1.7).normalize().multiplyScalar(radius * 2.4));
        keyLight.shadow.camera.left = -radius * 1.65;
        keyLight.shadow.camera.right = radius * 1.65;
        keyLight.shadow.camera.top = radius * 1.65;
        keyLight.shadow.camera.bottom = -radius * 1.65;
        keyLight.shadow.camera.near = Math.max(0.1, radius * 0.02);
        keyLight.shadow.camera.far = radius * 7;
        keyLight.shadow.camera.updateProjectionMatrix();
        keyLight.shadow.autoUpdate = false;
        keyLight.shadow.needsUpdate = true;
      }
      if (fillLight) fillLight.position.copy(center).add(new THREE.Vector3(-1.2, 0.8, 0.6).normalize().multiplyScalar(radius * 2));
      ambient.position.copy(center).add(new THREE.Vector3(0, 0, radius * 2));
      const siteBounds = getSiteBounds(orientationRoot, bounds);
      siteBoundsRef.current = siteBounds?.clone() || null;
      const mainEntrance = locateMainEntrance(modelGroup, bounds, elementMetadata);
      const analysis = completeIfcAnalysis(ifcAnalysis, { bounds, siteBounds, entrance: mainEntrance, geometryMeshCount: placedMeshCount });
      api.CloseModel(modelId);
      modelId = -1;
      const upAxis = 2;
      cameraObject.position.copy(cameraPosition(camera, center, radius, upAxis));
      cameraObject.near = Math.max(radius / 10000, 0.001);
      cameraObject.far = Math.max(radius * 100, 1000);
      cameraObject.lookAt(center);
      cameraObject.updateProjectionMatrix();
      orbit.target.copy(center);
      orbit.update();

      const resize = () => {
        if (!hostRef.current || !renderer) return;
        const width = Math.max(hostRef.current.clientWidth, 1);
        const height = Math.max(hostRef.current.clientHeight, 1);
        cameraObject.aspect = width / height;
        cameraObject.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(hostRef.current);
      resize();
      renderer.setAnimationLoop(() => {
        orbit.update();
        renderer.render(scene, cameraObject);
      });

      sceneRef.current = scene;
      cameraRef.current = cameraObject;
      rendererRef.current = canvasRenderer;
      controlsRef.current = orbit;
      modelRef.current = modelGroup;
      orientationRootRef.current = orientationRoot;
      roomFurnishingsRef.current = null;
      sourceBoundsRef.current = sourceBounds;
      detectedUpAxisRef.current = resolvedDetectedAxis;
      modelBoundsRef.current = bounds.clone();
      cameraTargetRef.current = { center, radius, upAxis };
      setMeshCount(placedMeshCount);
      setLoadState('ready');
      onStatus?.(`IFC loaded · ${placedMeshCount.toLocaleString()} meshes · ${schema}${skippedMeshCount ? ` · ${skippedMeshCount} empty items skipped` : ''}`);
      onReady?.({ meshCount: placedMeshCount, schema, size: { x: size.x, y: size.y, z: size.z }, analysis });
    };

    initialize().catch((error) => {
      if (!disposed) {
        setLoadState('error');
        const message = error.message || 'IFC could not be loaded.';
        onStatus?.(/memory|allocation|array buffer|out of memory/i.test(message)
          ? 'This IFC exceeded available browser memory. Try a smaller or simplified IFC export.'
          : message);
        if (api && modelId >= 0 && api.IsModelOpen(modelId)) {
          api.CloseModel(modelId);
          modelId = -1;
        }
        controls?.dispose();
        controls = null;
        if (renderer) {
          renderer.setAnimationLoop(null);
          renderer.dispose();
          renderer.domElement.remove();
          renderer = null;
        }
        scene?.traverse((object) => {
          if (!object.isMesh) return;
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        });
      }
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      controls?.dispose();
      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
      }
      if (api && modelId >= 0 && api.IsModelOpen(modelId)) api.CloseModel(modelId);
      scene?.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      if (hostRef.current) hostRef.current.replaceChildren();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      modelRef.current = null;
      roomSpacesRef.current = [];
      sourceToMetersRef.current = null;
      roomFurnishingsRef.current = null;
      orientationRootRef.current = null;
      sourceBoundsRef.current = null;
      siteBoundsRef.current = null;
      detectedUpAxisRef.current = 2;
      modelBoundsRef.current = null;
      contextRef.current = null;
      contextLayoutSignatureRef.current = null;
      skyDomeRef.current = null;
      skyTextureRef.current?.dispose();
      skyTextureRef.current = null;
    };
  }, [asset?.id]);

  useEffect(() => {
    if (loadState !== 'ready' || !sceneRef.current || !modelBoundsRef.current || !cameraTargetRef.current) return;
    const scene = sceneRef.current;
    const layoutSignature = JSON.stringify({ buildingType, contextObjects, entrance, layoutSeed, surroundingsRules, upAxisPreference });
    const shouldReframe = contextLayoutSignatureRef.current !== layoutSignature;
    contextLayoutSignatureRef.current = layoutSignature;
    const previousCameraPosition = cameraRef.current?.position.clone();
    const previousControlsTarget = controlsRef.current?.target.clone();
    const orientationRoot = orientationRootRef.current;
    const sourceBounds = sourceBoundsRef.current;
    if (orientationRoot && sourceBounds) {
      const axis = upAxisPreference === 'auto' ? detectedUpAxisRef.current : Number(upAxisPreference);
      applyAxisCorrection(orientationRoot, sourceBounds, axis);
      modelBoundsRef.current = getBuildingBounds(orientationRoot);
      siteBoundsRef.current = getSiteBounds(orientationRoot, modelBoundsRef.current);
    }
    if (contextRef.current) {
      scene.remove(contextRef.current);
      contextRef.current.traverse((object) => {
        if (!object.isMesh) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (!material) return;
          material.map?.dispose();
          material.dispose();
        });
      });
    }
    if (skyDomeRef.current) {
      scene.remove(skyDomeRef.current);
      skyDomeRef.current.geometry.dispose();
      skyDomeRef.current.material.dispose();
      skyDomeRef.current = null;
    }
    skyTextureRef.current?.dispose();
    skyTextureRef.current = makeSkyTexture(environment, referenceStyle?.sky);
    const skyColors = skyPalettes[environment] || skyPalettes.clear;
    const skyHorizon = new THREE.Color(referenceStyle?.sky?.skyColor || skyColors[1]).lerp(new THREE.Color(skyColors[1]), referenceStyle?.sky?.skyColor ? 0.28 : 0);
    scene.background = skyHorizon;
    const radius = cameraTargetRef.current.radius;
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(radius * 32, 120), 48, 32),
      new THREE.MeshBasicMaterial({ map: skyTextureRef.current, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }),
    );
    skyDome.name = 'Procedural cloud sky';
    skyDome.rotation.x = Math.PI / 2;
    skyDome.position.copy(modelBoundsRef.current.getCenter(new THREE.Vector3()));
    skyDome.renderOrder = -1000;
    skyDome.frustumCulled = false;
    skyDomeRef.current = skyDome;
    scene.add(skyDome);
    const fogColor = skyHorizon.clone();
    scene.fog = new THREE.Fog(fogColor, radius * 5, radius * 19);
    const contextGroup = makeRuleBasedContextLayer(modelBoundsRef.current, radius, {
      contextObjects,
      environment,
      groundStyle,
      buildingType,
      rule: surroundingsRules[buildingType] || {},
      seed: layoutSeed,
      entrance,
      siteBounds: siteBoundsRef.current,
      referenceStyle,
      referenceRoles,
    });
    contextRef.current = contextGroup;
    scene.add(contextGroup);
    contextGroup.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    scene.updateMatrixWorld(true);
    const framingBounds = modelBoundsRef.current.clone();
    contextGroup.traverse((object) => {
      if (object.isMesh && !object.userData.ignoreFraming) framingBounds.expandByObject(object);
    });
    const center = framingBounds.getCenter(new THREE.Vector3());
    const size = framingBounds.getSize(new THREE.Vector3());
    const upAxis = 2;
    const framingRadius = Math.max(size.length() * 0.5, 0.5);
    cameraTargetRef.current = { center, radius: framingRadius, upAxis };
    skyDome.scale.setScalar(Math.max(framingRadius / radius, 1));
    skyDome.position.copy(center);
    const keyLight = scene.children.find((child) => child.isDirectionalLight);
    if (keyLight) {
      keyLight.target.position.copy(center);
      keyLight.position.copy(center).add(new THREE.Vector3(1.05, -1.35, 1.7).normalize().multiplyScalar(framingRadius * 2.4));
      keyLight.shadow.camera.left = -framingRadius * 1.35;
      keyLight.shadow.camera.right = framingRadius * 1.35;
      keyLight.shadow.camera.top = framingRadius * 1.35;
      keyLight.shadow.camera.bottom = -framingRadius * 1.35;
      keyLight.shadow.camera.near = Math.max(0.1, framingRadius * 0.02);
      keyLight.shadow.camera.far = framingRadius * 7;
      keyLight.shadow.camera.updateProjectionMatrix();
      keyLight.shadow.needsUpdate = true;
    }
    const fillLight = scene.children.filter((child) => child.isDirectionalLight)[1];
    if (fillLight) fillLight.position.copy(center).add(new THREE.Vector3(-1.2, 0.8, 0.6).normalize().multiplyScalar(framingRadius * 2));
    const hemisphere = scene.children.find((child) => child.isHemisphereLight);
    if (hemisphere) hemisphere.position.copy(center).add(new THREE.Vector3(0, 0, framingRadius * 2));
    const cameraObject = cameraRef.current;
    const controls = controlsRef.current;
    if (cameraObject && controls) {
      cameraObject.near = Math.max(framingRadius / 10000, 0.001);
      cameraObject.far = Math.max(framingRadius * 100, 1000);
      const target = !shouldReframe && previousControlsTarget ? previousControlsTarget : center;
      if (!shouldReframe && previousCameraPosition && previousControlsTarget) {
        cameraObject.position.copy(previousCameraPosition);
      } else {
        cameraObject.position.copy(cameraPosition(camera, center, framingRadius, upAxis));
      }
      cameraObject.lookAt(target);
      cameraObject.updateProjectionMatrix();
      controls.target.copy(target);
      controls.update();
    }
    if (scene.fog) scene.fog.far = framingRadius * 19;
  }, [buildingType, contextObjects, entrance, environment, groundStyle, layoutSeed, loadState, referenceRoles, referenceStyle, surroundingsRules, upAxisPreference]);

  useEffect(() => {
    if (loadState !== 'ready' || !sceneRef.current || !modelRef.current) return;
    const previous = roomFurnishingsRef.current;
    if (previous) {
      sceneRef.current.remove(previous);
      disposePresentationGroup(previous);
    }
    const spaceBounds = collectSpaceBounds(modelRef.current);
    const floorBounds = collectFloorBounds(modelRef.current, sourceToMetersRef.current);
    const { group, stats } = buildRoomFurnishings(roomSpacesRef.current, spaceBounds, buildingType, sourceToMetersRef.current, referenceRoles, floorBounds);
    roomFurnishingsRef.current = group;
    // Space bounds are measured after axis correction, so furnishings live in scene coordinates.
    sceneRef.current.add(group);
    sceneRef.current?.updateMatrixWorld(true);

    const summary = stats.furnishedRooms
      ? stats.estimatedRooms
        ? `${stats.furnishedRooms} room${stats.furnishedRooms === 1 ? '' : 's'} staged from IFC floor geometry; this file has no IfcSpace room records`
        : `${stats.furnishedRooms} room${stats.furnishedRooms === 1 ? '' : 's'} furnished from IFC room data`
      : !stats.spacesDetected
        ? 'No IfcSpace rooms or usable floor slabs were found; automatic furnishings skipped'
        : !stats.roomsWithGeometry
          ? `Found ${stats.spacesDetected} IFC rooms, but neither room volumes nor usable floor slabs; export IfcSpace geometry to place furnishings`
          : stats.unclassified > 0 && stats.tooSmall === 0
            ? `Found ${stats.roomsWithGeometry} room volumes, but their IFC names/properties did not identify uses such as toilet, kitchen, bedroom, or office`
            : 'Room volumes found, but their dimensions did not safely fit the furniture sets';
    onStatusRef.current?.(`IFC loaded · ${meshCount.toLocaleString()} meshes · ${summary}`);
    onFurnishingsReady?.({ furnishedRooms: stats.furnishedRooms, estimatedRooms: stats.estimatedRooms || 0 });
  }, [buildingType, loadState, meshCount, onFurnishingsReady, referenceRoles, upAxisPreference]);

  useEffect(() => {
    if (loadState !== 'ready' || !modelRef.current) return;
    modelRef.current.traverse((object) => {
      if (!object.isMesh) return;
      const belongsToVisibleStorey = !visibleStoreyId || String(object.userData.storeyId ?? '') === String(visibleStoreyId);
      const cutawaySurface = interiorMode && ['roof', 'exteriorWall'].includes(object.userData.colorRole);
      const isRoomVolume = String(object.userData.ifcType || '').toUpperCase() === 'IFCSPACE';
      object.visible = !isRoomVolume && belongsToVisibleStorey && !cutawaySurface;
    });
    roomFurnishingsRef.current?.children.forEach((room) => {
      room.visible = !visibleStoreyId || String(room.userData.storeyId ?? '') === String(visibleStoreyId);
    });
  }, [interiorMode, loadState, visibleStoreyId]);

  useEffect(() => {
    if (loadState !== 'ready' || !modelRef.current) return;
    modelRef.current.traverse((object) => {
      if (!object.isMesh) return;
      const role = object.userData.colorRole;
      const roleColor = role
        ? (presetRoleColor(materialStyle, role) || (materialStyle === 'reference' ? referenceRoles?.[role] : null))
        : null;
      object.material.color.set(roleColor || `#${object.userData.sourceColor}`);
      object.material.opacity = object.userData.sourceOpacity ?? 1;
      object.material.transparent = (object.userData.sourceOpacity ?? 1) < 0.99;
      object.material.roughness = role === 'glazing' ? 0.16 : (presetRoleColor(materialStyle, role) ? materialPalettes[materialStyle]?.roughness : 0.82);
      object.material.needsUpdate = true;
    });
    const matchedEnvironment = lighting === 'daylight' && environment !== 'clear' ? environment : lighting;
    const lightingPreset = lightingPalettes[matchedEnvironment] || lightingPalettes.daylight;
    if (sceneRef.current) {
      sceneRef.current.children.find((child) => child.isDirectionalLight)?.color.set(lightingPreset.color);
      const directionalLights = sceneRef.current.children.filter((child) => child.isDirectionalLight);
      if (directionalLights[0]) directionalLights[0].intensity = lightingPreset.key;
      if (directionalLights[0]) directionalLights[0].shadow.radius = environment === 'overcast' ? 8 : environment === 'golden' ? 2 : 3;
      if (directionalLights[1]) directionalLights[1].intensity = lightingPreset.fill;
      const hemisphere = sceneRef.current.children.find((child) => child.isHemisphereLight);
      if (hemisphere) hemisphere.intensity = lightingPreset.ambient;
    }
  }, [environment, lighting, materialStyle, loadState, referenceRoles]);

  useEffect(() => {
    if (loadState !== 'ready') return;
    const cameraObject = cameraRef.current;
    const controls = controlsRef.current;
    const target = cameraTargetRef.current;
    if (cameraObject && controls && target) {
      cameraObject.position.copy(cameraPosition(camera, target.center, target.radius, target.upAxis));
      controls.target.copy(target.center);
      controls.update();
    }
  }, [camera, loadState]);

  useEffect(() => {
    if (!captureRequest || loadState !== 'ready' || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    const renderer = rendererRef.current;
    renderer.render(sceneRef.current, cameraRef.current);
    renderer.domElement.toBlob((blob) => {
      if (!blob) {
        onStatusRef.current?.('The browser could not capture this render. Try a smaller IFC.');
        onCaptureRef.current?.(captureRequest.id, null, meshCount, null, new Error('The browser could not capture this render.'));
        return;
      }
      onCaptureRef.current?.(captureRequest.id, blob, meshCount, { width: renderer.domElement.width, height: renderer.domElement.height });
    }, 'image/png');
  }, [captureRequest, loadState, meshCount]);

  return (
    <div className="absolute inset-0 bg-page">
      <div ref={hostRef} className="absolute inset-0" />
      {loadState === 'ready' && referenceUrl && <div className="absolute right-3 top-3 w-24 sm:w-36 border border-line rounded-[4px] overflow-hidden bg-surface shadow-lg pointer-events-none">
        <img src={referenceUrl} alt="Render reference" className="w-full aspect-[4/3] object-cover" />
        <p className="text-muted text-[8px] uppercase px-2 py-1 bg-surface">Reference</p>
      </div>}
      {loadState !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-page/90 p-6 text-center pointer-events-none">
          <div className="max-w-sm">
            <div className={`mx-auto mb-3 w-8 h-8 rounded-full border border-line ${loadState === 'loading' ? 'border-t-primary animate-spin' : ''}`} />
            <p className="text-ink text-[12px] font-medium">{loadState === 'loading' ? 'Reading IFC geometry…' : loadState === 'too-large' ? 'IFC saved locally · preview limit reached' : loadState === 'error' ? 'IFC could not be displayed' : 'Upload an IFC model to open the 3D viewer'}</p>
            <p className="text-muted text-[10px] leading-5 mt-1">{loadState === 'loading' ? 'The source file is parsed locally in your browser.' : loadState === 'too-large' ? 'Export a simplified IFC with fewer faces. The original file remains saved on this device.' : 'The model canvas displays source geometry only.'}</p>
          </div>
        </div>
      )}
      {loadState === 'ready' && <span className="absolute top-3 left-3 bg-chip text-accent text-[9px] uppercase px-2 py-1 rounded-[3px] pointer-events-none">IFC source geometry · {meshCount.toLocaleString()} meshes · locked</span>}
    </div>
  );
}
