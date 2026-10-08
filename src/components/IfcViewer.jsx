import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { IfcAPI } from 'web-ifc';
import wasmUrl from 'web-ifc/web-ifc.wasm?url';
import { getLocalAssetBlob, MAX_BROWSER_IFC_BYTES } from '../lib/local-assets';

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

function referenceSurfaceColor(sourceColor, palette) {
  if (!palette?.length) return new THREE.Color(sourceColor.x, sourceColor.y, sourceColor.z);
  const hsl = {};
  new THREE.Color(sourceColor.x, sourceColor.y, sourceColor.z).getHSL(hsl);
  const luminanceOrdered = [...palette].sort((first, second) => {
    const firstHsl = {};
    const secondHsl = {};
    new THREE.Color(first).getHSL(firstHsl);
    new THREE.Color(second).getHSL(secondHsl);
    return firstHsl.l - secondHsl.l;
  });
  const index = Math.round(hsl.l * (luminanceOrdered.length - 1));
  return new THREE.Color(luminanceOrdered[index]);
}

function getMeshMaterial(color, style, referencePalette, materialCache) {
  const cacheKey = `${style}:${color.x}:${color.y}:${color.z}:${color.w}:${referencePalette.join(',')}`;
  if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
  const palette = materialPalettes[style];
  const source = style === 'reference' ? referenceSurfaceColor(color, referencePalette) : new THREE.Color(color.x, color.y, color.z);
  const material = new THREE.MeshStandardMaterial({
    color: palette?.color || source,
    roughness: palette?.roughness ?? 0.82,
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
      return values.slice(0, 3).reduce((largest, value, axis, directions) => (
        Math.abs(value) > Math.abs(directions[largest]) ? axis : largest
      ), 0);
    }
  } catch {
    return 2;
  }
  return 2;
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
    if (preset === 'top') return new THREE.Vector3(center.x, center.y + 0.001, center.z + radius * 2.1);
    if (preset === 'eye-level') return new THREE.Vector3(center.x + radius * 1.65, center.y + radius * 1.2, center.z + radius * 0.22);
    return new THREE.Vector3(center.x + radius * 1.45, center.y + radius * 1.65, center.z + radius * 1.2);
  }
  if (preset === 'top') return new THREE.Vector3(center.x, center.y + radius * 2.1, center.z + 0.001);
  if (preset === 'eye-level') return new THREE.Vector3(center.x + radius * 1.2, center.y + radius * 0.22, center.z + radius * 1.65);
  return new THREE.Vector3(center.x + radius * 1.45, center.y + radius * 1.2, center.z + radius * 1.65);
}

const skyPalettes = {
  clear: ['#376b91', '#d9d9c9'],
  overcast: ['#667786', '#c6c9c5'],
  golden: ['#426080', '#f0aa68'],
  blue: ['#081222', '#526c91'],
};

function makeSkyTexture(environment) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  const colors = skyPalettes[environment] || skyPalettes.clear;
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGrassTexture(repeatA, repeatB, referenceColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const baseColor = new THREE.Color('#789b57');
  if (referenceColor) baseColor.lerp(new THREE.Color(referenceColor), 0.14);
  context.fillStyle = `#${baseColor.getHexString()}`;
  context.fillRect(0, 0, 128, 128);
  let seed = 19;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const colors = ['#78975a', '#526f42', '#8ba565', '#6f824d', '#9a9a65'];
  for (let blade = 0; blade < 900; blade += 1) {
    const x = random() * 128;
    const y = random() * 128;
    context.strokeStyle = colors[Math.floor(random() * colors.length)];
    context.globalAlpha = 0.25 + random() * 0.45;
    context.lineWidth = 0.5 + random() * 0.8;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 3, y - 2 - random() * 5);
    context.stroke();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(Math.max(1, repeatA / 18), Math.max(1, repeatB / 18));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeFoliageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#718d4f';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const colors = ['#344f32', '#4b6939', '#6c8747', '#829854', '#a0a361'];
  let seed = 83;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let leaf = 0; leaf < 1500; leaf += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    context.fillStyle = colors[Math.floor(random() * colors.length)];
    context.globalAlpha = 0.45 + random() * 0.5;
    context.beginPath();
    context.ellipse(x, y, 1 + random() * 2.2, 0.7 + random() * 1.6, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeContextLayer(bounds, radius, { trees, shrubs, cars, grass }, environment, groundStyle, referenceColor) {
  const group = new THREE.Group();
  group.name = 'Site context · presentation only';
  group.userData.geometryPolicy = 'presentation-only';
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const upAxis = 2;
  const horizontalAxes = [0, 1, 2].filter((axis) => axis !== upAxis);
  const [axisA, axisB] = horizontalAxes;
  const extentA = size.getComponent(axisA);
  const extentB = size.getComponent(axisB);
  const floor = bounds.min.getComponent(upAxis) - Math.max(radius * 0.002, 0.02);
  const margin = Math.max(radius * 0.13, 0.65);
  const groundWidth = Math.max(extentA + radius * 2.4, radius * 3.5);
  const groundDepth = Math.max(extentB + radius * 2.4, radius * 3.5);
  const sitePoint = (a, b, vertical = floor) => {
    const point = center.clone();
    point.setComponent(axisA, a);
    point.setComponent(axisB, b);
    point.setComponent(upAxis, vertical);
    return point;
  };
  const grassColor = referenceColor && grass ? new THREE.Color(referenceColor).lerp(new THREE.Color('#527b42'), 0.72) : new THREE.Color('#65854e');
  const groundColors = {
    grass: grassColor,
    gravel: new THREE.Color('#89877c'),
    paving: new THREE.Color('#747876'),
  };
  const groundGeometry = new THREE.PlaneGeometry(groundWidth, groundDepth);
  if (upAxis === 1) groundGeometry.rotateX(-Math.PI / 2);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: groundStyle === 'grass' ? '#ffffff' : groundColors[groundStyle], roughness: 1, metalness: 0 });
  if (groundStyle === 'grass') groundMaterial.map = makeGrassTexture(groundWidth, groundDepth, referenceColor);
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.name = `${groundStyle || 'grass'} site ground · presentation only`;
  ground.userData.ignoreFraming = true;
  ground.position.copy(sitePoint(center.getComponent(axisA), center.getComponent(axisB)));
  group.add(ground);

  const verticalRotation = upAxis === 2 ? Math.PI / 2 : 0;
  const halfA = extentA / 2;
  const halfB = extentB / 2;
  const treePositions = [
    [center.getComponent(axisA) - halfA - margin, center.getComponent(axisB) - halfB * 0.55],
    [center.getComponent(axisA) + halfA + margin, center.getComponent(axisB) - halfB * 0.2],
    [center.getComponent(axisA) - halfA * 0.7, center.getComponent(axisB) + halfB + margin],
    [center.getComponent(axisA) + halfA * 0.75, center.getComponent(axisB) + halfB + margin],
  ];

  if (trees) {
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#594432', roughness: 0.94 });
    const barkMaterial = new THREE.MeshStandardMaterial({ color: '#72583d', roughness: 0.96 });
    const foliageTexture = makeFoliageTexture();
    const foliageMaterials = ['#82925d', '#718553', '#657b4b'].map((color) => new THREE.MeshStandardMaterial({
      color,
      map: foliageTexture,
      roughness: 0.96,
    }));
    const crownGeometry = new THREE.SphereGeometry(1, 14, 10);
    treePositions.forEach(([a, b], index) => {
      const tree = new THREE.Group();
      tree.name = `Context tree ${index + 1} · presentation only`;
      tree.rotation.x = verticalRotation;
      const height = Math.max(radius * 0.38, 2.4);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.021, height * 0.038, height * 0.52, 9), trunkMaterial);
      trunk.position.y = height * 0.26;
      tree.add(trunk);
      for (let branchIndex = 0; branchIndex < 4; branchIndex += 1) {
        const angle = branchIndex * Math.PI * 0.5 + index * 0.43;
        const start = new THREE.Vector3(0, height * (0.29 + branchIndex * 0.035), 0);
        const end = new THREE.Vector3(Math.cos(angle) * height * 0.22, height * (0.5 + branchIndex * 0.035), Math.sin(angle) * height * 0.22);
        const direction = end.clone().sub(start);
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.012, height * 0.022, direction.length(), 7), barkMaterial);
        branch.position.copy(start).add(end).multiplyScalar(0.5);
        branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        tree.add(branch);
      }
      const crownScale = height * 0.19;
      const crownOffsets = [
        [0, 0.68, 0, 1.08], [-0.12, 0.58, 0.1, 0.84], [0.13, 0.61, -0.1, 0.9],
        [-0.08, 0.77, -0.08, 0.78], [0.08, 0.76, 0.11, 0.82], [0, 0.53, -0.12, 0.78],
      ];
      crownOffsets.forEach(([offsetX, offsetY, offsetZ, scale], crownIndex) => {
        const crown = new THREE.Mesh(crownGeometry, foliageMaterials[(index + crownIndex) % foliageMaterials.length]);
        crown.position.set(offsetX * height, offsetY * height, offsetZ * height);
        crown.scale.setScalar(crownScale * scale);
        crown.scale.y *= 0.88;
        tree.add(crown);
      });
      tree.position.copy(sitePoint(a, b));
      group.add(tree);
    });
  }

  if (shrubs) {
    const shrubMaterial = new THREE.MeshStandardMaterial({ color: '#587c48', roughness: 1 });
    const shrubCount = 7;
    for (let index = 0; index < shrubCount; index += 1) {
      const t = (index + 0.5) / shrubCount;
      const a = center.getComponent(axisA) - halfA * 0.82 + t * extentA * 0.82;
      const b = center.getComponent(axisB) + halfB + margin * 0.38;
      const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(Math.max(radius * 0.045, 0.28), 1), shrubMaterial);
      shrub.name = `Context shrub ${index + 1} · presentation only`;
      const position = sitePoint(a, b, floor + Math.max(radius * 0.045, 0.28));
      shrub.position.copy(position);
      shrub.scale.set(1.2, 0.75, 1.05);
      if (upAxis === 1) shrub.scale.set(1.2, 1.05, 0.75);
      group.add(shrub);
    }
  }

  if (cars) {
    const car = new THREE.Group();
    car.name = 'Context car · presentation only';
    car.rotation.x = verticalRotation;
    const width = Math.max(radius * 0.24, 1.8);
    const length = Math.max(radius * 0.4, 3.6);
    const height = Math.max(radius * 0.1, 0.72);
    const paint = new THREE.MeshPhysicalMaterial({ color: '#87999a', roughness: 0.23, metalness: 0.42, clearcoat: 0.86, clearcoatRoughness: 0.18 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#182b31', roughness: 0.14, metalness: 0.18, clearcoat: 0.7, transparent: true, opacity: 0.94 });
    const tire = new THREE.MeshStandardMaterial({ color: '#1d2020', roughness: 0.94 });
    const alloy = new THREE.MeshStandardMaterial({ color: '#b8b9b3', roughness: 0.29, metalness: 0.78 });
    const lamp = new THREE.MeshStandardMaterial({ color: '#f7e8c9', emissive: '#8e7653', emissiveIntensity: 0.35, roughness: 0.24 });
    const taillight = new THREE.MeshStandardMaterial({ color: '#8b3026', emissive: '#5f160f', emissiveIntensity: 0.3, roughness: 0.3 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(width, height * 0.42, length, 4, height * 0.08), paint);
    body.position.y = height * 0.31;
    car.add(body);
    const cabin = new THREE.Mesh(new RoundedBoxGeometry(width * 0.7, height * 0.48, length * 0.49, 4, height * 0.1), glass);
    cabin.position.set(0, height * 0.7, -length * 0.035);
    car.add(cabin);
    const roof = new THREE.Mesh(new RoundedBoxGeometry(width * 0.58, height * 0.06, length * 0.33, 3, height * 0.025), paint);
    roof.position.set(0, height * 0.96, -length * 0.06);
    car.add(roof);
    for (const side of [-1, 1]) {
      for (const axle of [-1, 1]) {
        const wheel = new THREE.Group();
        wheel.position.set(side * width * 0.49, height * 0.19, axle * length * 0.31);
        const rubber = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.19, height * 0.19, width * 0.1, 20), tire);
        rubber.rotation.z = Math.PI / 2;
        wheel.add(rubber);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.105, height * 0.105, width * 0.105, 16), alloy);
        rim.rotation.z = Math.PI / 2;
        rim.position.x = side * width * 0.02;
        wheel.add(rim);
        car.add(wheel);
      }
    }
    for (const side of [-1, 1]) {
      const headlamp = new THREE.Mesh(new THREE.SphereGeometry(height * 0.055, 10, 8), lamp);
      headlamp.scale.set(1.15, 0.65, 0.32);
      headlamp.position.set(side * width * 0.34, height * 0.34, length * 0.48);
      car.add(headlamp);
      const rearLamp = new THREE.Mesh(new THREE.BoxGeometry(width * 0.13, height * 0.09, height * 0.035), taillight);
      rearLamp.position.set(side * width * 0.34, height * 0.33, -length * 0.49);
      car.add(rearLamp);
    }
    for (const side of [-1, 1]) {
      const windowBand = new THREE.Mesh(new THREE.BoxGeometry(width * 0.025, height * 0.24, length * 0.26), glass);
      windowBand.position.set(side * width * 0.355, height * 0.73, -length * 0.035);
      car.add(windowBand);
    }
    const carA = center.getComponent(axisA) + halfA * 0.3;
    const carB = center.getComponent(axisB) + halfB + margin * 0.55;
    car.position.copy(sitePoint(carA, carB));
    group.add(car);
  }

  return group;
}

export default function IfcViewer({ asset, referenceUrl, camera = 'isometric', lighting = 'daylight', materialStyle = 'reference', upAxisPreference = 'auto', environment = 'clear', groundStyle = 'grass', contextObjects = {}, referenceColor, referencePalette = [], captureRequest, onStatus, onReady, onCapture }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const orientationRootRef = useRef(null);
  const sourceBoundsRef = useRef(null);
  const detectedUpAxisRef = useRef(2);
  const modelBoundsRef = useRef(null);
  const contextRef = useRef(null);
  const cameraTargetRef = useRef(null);
  const skyTextureRef = useRef(null);
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
        onStatus?.(asset.uploadError || 'IFC saved locally. Export a simplified IFC below 16 MiB to preview it safely in this browser.');
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
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight('#d8e2ef', 0.5);
      fillLight.position.set(-1.2, 0.8, -0.7);
      scene.add(fillLight);
      const ambient = new THREE.HemisphereLight('#eaf0f8', '#4d463d', 1.05);
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
              const object = new THREE.Mesh(geometry, getMeshMaterial(placed.color, materialStyle, referencePalette, materialCache));
              object.name = `IFC element ${flatMesh.expressID}`;
              object.matrix.fromArray(placed.flatTransformation);
              object.matrixAutoUpdate = false;
              object.userData.ifcExpressID = flatMesh.expressID;
              object.userData.geometryPolicy = 'immutable';
              object.userData.sourceColor = new THREE.Color(placed.color.x, placed.color.y, placed.color.z).getHexString();
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
      api.CloseModel(modelId);
      modelId = -1;
      if (!placedMeshCount) throw new Error('This IFC contains no renderable 3D elements. Check that the export includes model geometry.');

      modelGroup.updateMatrixWorld(true);
      const sourceBounds = new THREE.Box3().setFromObject(modelGroup);
      const activeUpAxis = upAxisPreference === 'auto' ? detectedUpAxis : Number(upAxisPreference);
      applyAxisCorrection(orientationRoot, sourceBounds, activeUpAxis);
      const bounds = new THREE.Box3().setFromObject(orientationRoot);
      if (bounds.isEmpty()) throw new Error('No visible IFC geometry was found.');
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const radius = Math.max(size.length() * 0.5, 0.5);
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
      sourceBoundsRef.current = sourceBounds;
      detectedUpAxisRef.current = detectedUpAxis;
      modelBoundsRef.current = bounds.clone();
      cameraTargetRef.current = { center, radius, upAxis };
      setMeshCount(placedMeshCount);
      setLoadState('ready');
      onStatus?.(`IFC loaded · ${placedMeshCount.toLocaleString()} meshes · ${schema}${skippedMeshCount ? ` · ${skippedMeshCount} empty items skipped` : ''}`);
      onReady?.({ meshCount: placedMeshCount, schema, size: { x: size.x, y: size.y, z: size.z } });
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
      orientationRootRef.current = null;
      sourceBoundsRef.current = null;
      detectedUpAxisRef.current = 2;
      modelBoundsRef.current = null;
      contextRef.current = null;
      skyTextureRef.current?.dispose();
      skyTextureRef.current = null;
    };
  }, [asset?.id]);

  useEffect(() => {
    if (loadState !== 'ready' || !sceneRef.current || !modelBoundsRef.current || !cameraTargetRef.current) return;
    const scene = sceneRef.current;
    const orientationRoot = orientationRootRef.current;
    const sourceBounds = sourceBoundsRef.current;
    if (orientationRoot && sourceBounds) {
      const axis = upAxisPreference === 'auto' ? detectedUpAxisRef.current : Number(upAxisPreference);
      applyAxisCorrection(orientationRoot, sourceBounds, axis);
      modelBoundsRef.current = new THREE.Box3().setFromObject(orientationRoot);
    }
    if (contextRef.current) {
      scene.remove(contextRef.current);
      contextRef.current.traverse((object) => {
        if (!object.isMesh) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      });
    }
    skyTextureRef.current?.dispose();
    skyTextureRef.current = makeSkyTexture(environment);
    scene.background = skyTextureRef.current;
    const radius = cameraTargetRef.current.radius;
    const fogColor = new THREE.Color((skyPalettes[environment] || skyPalettes.clear)[1]);
    scene.fog = new THREE.Fog(fogColor, radius * 5, radius * 19);
    const contextGroup = makeContextLayer(modelBoundsRef.current, radius, contextObjects, environment, groundStyle, referenceColor);
    contextRef.current = contextGroup;
    scene.add(contextGroup);
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
    const cameraObject = cameraRef.current;
    const controls = controlsRef.current;
    if (cameraObject && controls) {
      cameraObject.position.copy(cameraPosition(camera, center, framingRadius, upAxis));
      cameraObject.near = Math.max(framingRadius / 10000, 0.001);
      cameraObject.far = Math.max(framingRadius * 100, 1000);
      cameraObject.lookAt(center);
      cameraObject.updateProjectionMatrix();
      controls.target.copy(center);
      controls.update();
    }
    if (scene.fog) scene.fog.far = framingRadius * 19;
  }, [camera, contextObjects, environment, groundStyle, loadState, referenceColor, upAxisPreference]);

  useEffect(() => {
    if (loadState !== 'ready' || !modelRef.current) return;
    modelRef.current.traverse((object) => {
      if (!object.isMesh) return;
      const palette = materialPalettes[materialStyle];
      object.material.color.set(palette?.color || (materialStyle === 'reference' && referencePalette.length
        ? referenceSurfaceColor(new THREE.Color(`#${object.userData.sourceColor}`), referencePalette)
        : `#${object.userData.sourceColor}`));
      object.material.roughness = palette?.roughness ?? 0.82;
      object.material.needsUpdate = true;
    });
    const lightingPreset = lightingPalettes[lighting] || lightingPalettes.daylight;
    if (sceneRef.current) {
      sceneRef.current.children.find((child) => child.isDirectionalLight)?.color.set(lightingPreset.color);
      const directionalLights = sceneRef.current.children.filter((child) => child.isDirectionalLight);
      if (directionalLights[0]) directionalLights[0].intensity = lightingPreset.key;
      if (directionalLights[1]) directionalLights[1].intensity = lightingPreset.fill;
      const hemisphere = sceneRef.current.children.find((child) => child.isHemisphereLight);
      if (hemisphere) hemisphere.intensity = lightingPreset.ambient;
    }
  }, [lighting, materialStyle, loadState, referencePalette]);

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