import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function getStyleColors(colors, fallback) {
  return Array.isArray(colors) && colors.length ? colors : fallback;
}

function makeGrassTexture(repeatA, repeatB, referenceColors = []) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const colors = getStyleColors(referenceColors, ['#789b57', '#526f42', '#8ba565', '#6f824d', '#9a9a65']);
  const baseColor = new THREE.Color(colors[0]);
  context.fillStyle = `#${baseColor.getHexString()}`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 19;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let blade = 0; blade < 7200; blade += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    context.strokeStyle = colors[Math.floor(random() * colors.length)];
    context.globalAlpha = 0.18 + random() * 0.42;
    context.lineWidth = 0.7 + random() * 1.5;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 5, y - 3 - random() * 10);
    context.stroke();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(Math.max(1, repeatA / 8), Math.max(1, repeatB / 8));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeFoliageTexture(referenceColors = []) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const colors = getStyleColors(referenceColors, ['#718d4f', '#344f32', '#4b6939', '#6c8747', '#829854', '#a0a361']);
  context.fillStyle = colors[0];
  context.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 83;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let leaf = 0; leaf < 6200; leaf += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    context.fillStyle = colors[Math.floor(random() * colors.length)];
    context.globalAlpha = 0.45 + random() * 0.5;
    context.beginPath();
    context.ellipse(x, y, 1.4 + random() * 3.4, 0.9 + random() * 2.5, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeBarkTexture(referenceColors = []) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const colors = getStyleColors(referenceColors, ['#594432', '#72583d', '#604936']);
  context.fillStyle = colors[0];
  context.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 137;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let grain = 0; grain < 230; grain += 1) {
    context.globalAlpha = 0.24 + random() * 0.42;
    context.strokeStyle = colors[Math.floor(random() * colors.length)];
    context.lineWidth = 0.6 + random() * 3;
    const x = random() * canvas.width;
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(x + (random() - 0.5) * 12, 38, x + (random() - 0.5) * 12, 88, x + (random() - 0.5) * 8, canvas.height);
    context.stroke();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function makeHardscapeTexture(referenceColors = [], repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const colors = getStyleColors(referenceColors, ['#888984', '#777b79', '#b8b4aa']);
  context.fillStyle = colors[0];
  context.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 257;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const columns = 8;
  const rows = 16;
  const tileWidth = canvas.width / columns;
  const tileHeight = canvas.height / rows;
  context.fillStyle = '#55534f';
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < rows; row += 1) {
    const offset = row % 2 ? tileWidth / 2 : 0;
    for (let column = -1; column <= columns; column += 1) {
      const x = column * tileWidth + offset;
      const y = row * tileHeight;
      const inset = 2.5;
      const shade = colors[Math.floor(random() * colors.length)];
      context.globalAlpha = 0.62 + random() * 0.32;
      context.fillStyle = shade;
      context.fillRect(x + inset, y + inset, tileWidth - inset * 2, tileHeight - inset * 2);
      context.globalAlpha = 0.1 + random() * 0.16;
      context.fillStyle = '#ffffff';
      context.fillRect(x + inset, y + inset, tileWidth - inset * 2, 1.5 + random() * 2);
      context.globalAlpha = 0.12 + random() * 0.2;
      context.fillStyle = '#292a29';
      context.fillRect(x + inset, y + tileHeight - inset - 2, tileWidth - inset * 2, 2 + random() * 2);
      for (let fleck = 0; fleck < 36; fleck += 1) {
        context.globalAlpha = 0.08 + random() * 0.22;
        context.fillStyle = colors[Math.floor(random() * colors.length)];
        context.fillRect(x + inset + random() * (tileWidth - inset * 2), y + inset + random() * (tileHeight - inset * 2), 1 + random() * 4, 1 + random() * 3);
      }
    }
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function makeMasonryTexture(referenceColors = [], repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const colors = getStyleColors(referenceColors, ['#6f6c63', '#817d72', '#a19b8e', '#56554f']);
  let seed = 481;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  context.fillStyle = '#494944';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const courses = 6;
  const rows = canvas.height / courses;
  const stonesPerCourse = 7;
  const stoneWidth = canvas.width / stonesPerCourse;
  for (let row = 0; row < courses; row += 1) {
    const offset = row % 2 ? stoneWidth / 2 : 0;
    for (let column = -1; column <= stonesPerCourse; column += 1) {
      const x = column * stoneWidth + offset;
      const y = row * rows;
      const insetX = 3 + random() * 3;
      const insetY = 3 + random() * 2;
      context.globalAlpha = 0.72 + random() * 0.27;
      context.fillStyle = colors[Math.floor(random() * colors.length)];
      context.fillRect(x + insetX, y + insetY, stoneWidth - insetX * 2, rows - insetY * 2);
      context.globalAlpha = 0.12 + random() * 0.18;
      context.fillStyle = '#f4eee2';
      context.fillRect(x + insetX, y + insetY, stoneWidth - insetX * 2, 2 + random() * 2);
      for (let fleck = 0; fleck < 24; fleck += 1) {
        context.globalAlpha = 0.08 + random() * 0.19;
        context.fillStyle = colors[Math.floor(random() * colors.length)];
        context.fillRect(x + insetX + random() * (stoneWidth - insetX * 2), y + insetY + random() * (rows - insetY * 2), 1 + random() * 5, 1 + random() * 4);
      }
    }
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function seededRandom(seed) {
  let state = (Number(seed) || 1) % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = state * 16807 % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function makeRuleBasedContextLayer(bounds, radius, options) {
  const {
    contextObjects = {},
    environment = 'clear',
    groundStyle = 'grass',
    buildingType = 'other',
    rule = {},
    seed = 1,
    entrance = null,
    siteBounds = null,
    referenceStyle = {},
    referenceRoles = {},
  } = options;
  const group = new THREE.Group();
  group.name = 'Site context · presentation only';
  group.userData.geometryPolicy = 'presentation-only';
  const random = seededRandom(seed);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const minX = bounds.min.x;
  const maxX = bounds.max.x;
  const minY = bounds.min.y;
  const maxY = bounds.max.y;
  const floor = bounds.min.z - Math.max(radius * 0.002, 0.02);
  const setback = Math.max(10, Math.min(36, Math.max(size.x, size.y) * 0.8));
  const plot = siteBounds
    ? {
      minX: Math.min(siteBounds.min.x, minX - setback),
      maxX: Math.max(siteBounds.max.x, maxX + setback),
      minY: Math.min(siteBounds.min.y, minY - setback),
      maxY: Math.max(siteBounds.max.y, maxY + setback),
    }
    : { minX: minX - setback, maxX: maxX + setback, minY: minY - setback, maxY: maxY + setback };
  const frontSide = entrance?.side || 'south';
  const isHorizontalFront = frontSide === 'south' || frontSide === 'north';
  const doorX = THREE.MathUtils.clamp(entrance?.position?.x ?? center.x, minX + 0.1, maxX - 0.1);
  const doorY = THREE.MathUtils.clamp(entrance?.position?.y ?? minY, minY, maxY);
  const frontPoint = isHorizontalFront
    ? new THREE.Vector3(doorX, frontSide === 'south' ? minY : maxY, floor)
    : new THREE.Vector3(frontSide === 'west' ? minX : maxX, doorY, floor);
  const gatePoint = isHorizontalFront
    ? new THREE.Vector3(doorX, frontSide === 'south' ? plot.minY : plot.maxY, floor)
    : new THREE.Vector3(frontSide === 'west' ? plot.minX : plot.maxX, doorY, floor);
  const outward = gatePoint.clone().sub(frontPoint).normalize();
  const tangent = new THREE.Vector3(-outward.y, outward.x, 0);
  const vehicleDimensions = {
    car: [4.5, 1.8, 1.48], ambulance: [5.6, 2.05, 2.45], bus: [9.5, 2.5, 3.0], van: [5.3, 2.0, 2.25], truck: [7.2, 2.4, 2.8],
  };
  const vehiclesEnabled = Boolean(contextObjects.cars || contextObjects.vehicles);
  const gateWidth = vehiclesEnabled ? 3.8 : (contextObjects.people ? 1.35 : 0);
  const ruleVehicles = Array.isArray(rule.vehicles) ? rule.vehicles.filter((type) => vehicleDimensions[type]) : [];
  const configuredVehicles = vehiclesEnabled ? (ruleVehicles.length ? ruleVehicles : ['car']) : [];
  const plotCenter = new THREE.Vector3((plot.minX + plot.maxX) / 2, (plot.minY + plot.maxY) / 2, floor);
  const plotHalfAlongTangent = Math.abs(tangent.x) * (plot.maxX - plot.minX) / 2 + Math.abs(tangent.y) * (plot.maxY - plot.minY) / 2;
  const entranceAlongTangent = gatePoint.dot(tangent);
  const plotCenterAlongTangent = plotCenter.dot(tangent);
  const availablePositive = plotCenterAlongTangent + plotHalfAlongTangent - entranceAlongTangent;
  const availableNegative = entranceAlongTangent - (plotCenterAlongTangent - plotHalfAlongTangent);
  const pedestrianSide = availablePositive >= availableNegative ? 1 : -1;
  const pedestrianSideSpace = Math.max(0, Math.max(availablePositive, availableNegative));
  const desiredPeopleCount = contextObjects.people ? Math.max(0, Math.min(30, Number(rule.people) || 0)) : 0;
  let peopleColumns = 0;
  let peopleCount = 0;
  let walkWidth = 1.5;
  let pedestrianGateWidth = 1.15;
  let pedestrianOffset = 0;
  if (desiredPeopleCount) {
    const maxColumns = Math.ceil(desiredPeopleCount / 2);
    for (let columns = maxColumns; columns >= 1; columns -= 1) {
      const candidateWalkWidth = Math.max(1.5, columns * 0.82 + 0.6);
      const candidateGateWidth = Math.max(1.15, candidateWalkWidth * 0.8);
      const candidateOffset = vehiclesEnabled ? gateWidth / 2 + 0.3 + candidateGateWidth / 2 : 0;
      const outerEdge = candidateOffset + candidateWalkWidth / 2 + 0.4;
      if (outerEdge <= pedestrianSideSpace) {
        peopleColumns = columns;
        peopleCount = Math.min(desiredPeopleCount, columns * 2);
        walkWidth = candidateWalkWidth;
        pedestrianGateWidth = candidateGateWidth;
        pedestrianOffset = pedestrianSide * candidateOffset;
        break;
      }
    }
  }
  const pedestrianGatePoint = gatePoint.clone().addScaledVector(tangent, pedestrianOffset);
  let vehiclePlans = configuredVehicles.map((type) => ({ type, length: vehicleDimensions[type][0], width: vehicleDimensions[type][1] }));
  const availableParkingWidth = plotHalfAlongTangent * 2 - 0.8;
  while (vehiclePlans.length > 0 && vehiclePlans.reduce((sum, item) => sum + item.length, 0) + (vehiclePlans.length - 1) * 0.9 > availableParkingWidth) {
    vehiclePlans = vehiclePlans.slice(0, -1);
  }
  const totalVehicleLength = vehiclePlans.reduce((sum, item) => sum + item.length, 0) + Math.max(0, vehiclePlans.length - 1) * 0.9;
  let vehicleCursor = -totalVehicleLength / 2;
  vehiclePlans = vehiclePlans.map((item) => {
    const offset = vehicleCursor + item.length / 2;
    vehicleCursor += item.length + 0.9;
    return { ...item, offset };
  });
  const vegetationColors = getStyleColors(referenceStyle.foliage, ['#42683b', '#557b43', '#6d8c4e', '#809956', '#9aa263']);
  const barkColors = getStyleColors(referenceStyle.bark, ['#594432', '#72583d', '#604936']);
  const hardscapeColors = getStyleColors(referenceStyle.hardscape, ['#888984', '#777b79', '#b8b4aa']);
  const vehiclePaints = getStyleColors(referenceStyle.vehiclePaints, ['#79898b', '#dadbd6', '#38434a', '#8793a0', '#9c4c3e', '#5b7191']);
  const groundColors = { grass: '#66854e', gravel: hardscapeColors[0], paving: hardscapeColors[0] };
  const groundWidth = plot.maxX - plot.minX;
  const groundHeight = plot.maxY - plot.minY;
  const grassTexture = groundStyle === 'grass' ? makeGrassTexture(groundWidth, groundHeight, vegetationColors) : null;
  const groundTexture = groundStyle !== 'grass'
    ? makeHardscapeTexture(hardscapeColors, Math.max(1, groundWidth / 3.2), Math.max(1, groundHeight / 3.2))
    : null;
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: groundStyle === 'grass' || groundTexture ? '#ffffff' : (groundColors[groundStyle] || groundColors.grass),
    roughness: 1,
    map: grassTexture || groundTexture,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(plot.maxX - plot.minX + 4, plot.maxY - plot.minY + 4), groundMaterial);
  ground.name = 'Site ground · presentation only';
  ground.position.set((plot.minX + plot.maxX) / 2, (plot.minY + plot.maxY) / 2, floor);
  ground.visible = contextObjects.grass !== false;
  ground.userData.ignoreFraming = true;
  group.add(ground);

  const paving = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.94,
    map: makeHardscapeTexture(hardscapeColors),
  });
  const pathSurface = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.9,
    map: makeHardscapeTexture(hardscapeColors),
  });
  const addStrip = (start, end, width, material, name) => {
    const direction = end.clone().sub(start);
    const length = direction.length();
    if (length < 0.1) return;
    const stripMaterial = material.clone();
    if (material.map) {
      stripMaterial.map = material.map.clone();
      stripMaterial.map.repeat.set(Math.max(1, width / 3.2), Math.max(1, length / 3.2));
      stripMaterial.map.needsUpdate = true;
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), stripMaterial);
    mesh.name = `${name} · presentation only`;
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.position.z = floor + 0.025;
    mesh.rotation.z = Math.atan2(direction.y, direction.x) - Math.PI / 2;
    group.add(mesh);
  };

  const drivewayEnd = frontPoint.clone().addScaledVector(outward, 0.75);
  const driveWidth = 4.2;
  if (contextObjects.paths !== false) {
    const courtyardDepth = Math.max(0, frontPoint.distanceTo(gatePoint) - 0.5);
    const courtyardWidth = Math.max(0, plotHalfAlongTangent * 2 - 2.4);
    if (courtyardDepth > 2 && courtyardWidth > 4) {
      const courtyardMaterial = paving.clone();
      courtyardMaterial.map = paving.map.clone();
      courtyardMaterial.map.repeat.set(courtyardWidth / 3.2, courtyardDepth / 3.2);
      courtyardMaterial.map.needsUpdate = true;
      const courtyard = new THREE.Mesh(new THREE.PlaneGeometry(courtyardWidth, courtyardDepth), courtyardMaterial);
      courtyard.name = 'Paved front courtyard · presentation only';
      courtyard.position.copy(frontPoint).addScaledVector(outward, courtyardDepth / 2);
      courtyard.position.z = floor + 0.018;
      courtyard.rotation.z = Math.atan2(outward.y, outward.x) - Math.PI / 2;
      group.add(courtyard);
    }
  }
  if (contextObjects.cars || contextObjects.vehicles) {
    addStrip(gatePoint, drivewayEnd, driveWidth, paving, 'Driveway');
  }
  if (contextObjects.paths !== false && contextObjects.people) {
    const walkStart = gatePoint.clone().addScaledVector(tangent, pedestrianOffset);
    const walkEnd = frontPoint.clone().addScaledVector(tangent, pedestrianOffset);
    addStrip(walkStart, walkEnd, walkWidth, pathSurface, 'Pedestrian approach');
    addStrip(walkEnd, frontPoint, walkWidth, pathSurface, 'Entry walk');
  }

  const fenceStyle = String(rule.fence || 'dark metal').toLowerCase();
  const fenceHeight = fenceStyle.includes('low') && !fenceStyle.includes('masonry') ? 1.05 : 1.9;
  const fenceMaterial = new THREE.MeshStandardMaterial({
    color: fenceStyle.includes('timber') ? '#72583e' : fenceStyle.includes('masonry') ? '#8a8173' : '#343b3d',
    roughness: 0.78,
    metalness: fenceStyle.includes('metal') ? 0.45 : 0.02,
  });
  const gateMaterial = fenceStyle.includes('masonry')
    ? new THREE.MeshStandardMaterial({ color: '#343b3d', roughness: 0.78, metalness: 0.45 })
    : fenceMaterial;
  const addFenceSegment = (from, to, name) => {
    const direction = to.clone().sub(from);
    const length = direction.length();
    if (length < 0.1) return;
    if (fenceStyle.includes('masonry')) {
      const wallHeight = fenceStyle.includes('low') ? 1.05 : fenceHeight;
      const stoneTexture = makeMasonryTexture(hardscapeColors, Math.max(1, length / 4.3), Math.max(1, wallHeight / 1.5));
      const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', map: stoneTexture, roughness: 0.92 });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(
        Math.abs(direction.x) > Math.abs(direction.y) ? length : 0.24,
        Math.abs(direction.y) >= Math.abs(direction.x) ? length : 0.24,
        wallHeight,
      ), stoneMaterial);
      wall.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, floor + wallHeight / 2);
      wall.name = `${name} wall · presentation only`;
      group.add(wall);
      if (wallHeight < fenceHeight && fenceStyle.includes('metal')) {
        const count = Math.max(1, Math.ceil(length / 0.35));
        for (let index = 0; index < count; index += 1) {
          const position = from.clone().lerp(to, (index + 0.5) / count);
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, fenceHeight - wallHeight), gateMaterial);
          post.position.set(position.x, position.y, floor + wallHeight + (fenceHeight - wallHeight) / 2);
          group.add(post);
        }
        for (const ratio of [0.35, 0.75]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(
            Math.abs(direction.x) > Math.abs(direction.y) ? length : 0.055,
            Math.abs(direction.y) >= Math.abs(direction.x) ? length : 0.055,
            0.055,
          ), gateMaterial);
          rail.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, floor + wallHeight + (fenceHeight - wallHeight) * ratio);
          group.add(rail);
        }
      }
      return;
    }
    const count = Math.max(1, Math.ceil(length / 0.35));
    for (let index = 0; index < count; index += 1) {
      const t = (index + 0.5) / count;
      const position = from.clone().lerp(to, t);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, fenceHeight), fenceMaterial);
      post.position.set(position.x, position.y, floor + fenceHeight / 2);
      post.name = `${name} post · presentation only`;
      group.add(post);
    }
    const railCount = fenceStyle.includes('masonry') ? 0 : 2;
    for (let railIndex = 0; railIndex < railCount; railIndex += 1) {
      const z = floor + fenceHeight * (0.35 + railIndex * 0.4);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(
        Math.abs(direction.x) > Math.abs(direction.y) ? length : 0.07,
        Math.abs(direction.y) >= Math.abs(direction.x) ? length : 0.07,
        0.055,
      ), fenceMaterial);
      rail.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, z);
      rail.name = `${name} rail · presentation only`;
      group.add(rail);
    }
  };
  if (contextObjects.boundary !== false && fenceStyle !== 'none') {
    const a = new THREE.Vector3(plot.minX, plot.minY, floor);
    const b = new THREE.Vector3(plot.maxX, plot.minY, floor);
    const c = new THREE.Vector3(plot.maxX, plot.maxY, floor);
    const d = new THREE.Vector3(plot.minX, plot.maxY, floor);
    const edges = [
      { side: 'south', from: a, to: b, horizontal: true },
      { side: 'east', from: b, to: c, horizontal: false },
      { side: 'north', from: d, to: c, horizontal: true },
      { side: 'west', from: a, to: d, horizontal: false },
    ];
    for (const edge of edges) {
      if (edge.side !== frontSide) {
        addFenceSegment(edge.from, edge.to, edge.side === (frontSide === 'south' ? 'north' : frontSide === 'north' ? 'south' : frontSide === 'east' ? 'west' : 'east') ? 'Rear boundary' : 'Side boundary');
        continue;
      }
      const axisCoord = edge.horizontal ? 'x' : 'y';
      const low = Math.min(edge.from[axisCoord], edge.to[axisCoord]);
      const high = Math.max(edge.from[axisCoord], edge.to[axisCoord]);
      const mainCenter = gatePoint[axisCoord];
      const gaps = gateWidth > 0 ? [[mainCenter - gateWidth / 2, mainCenter + gateWidth / 2]] : [];
      const pedestrianCenter = pedestrianGatePoint[axisCoord];
      if (peopleCount > 0 && vehiclesEnabled) gaps.push([pedestrianCenter - pedestrianGateWidth / 2, pedestrianCenter + pedestrianGateWidth / 2]);
      gaps.sort((first, second) => first[0] - second[0]);
      const pointAt = (coordinate) => edge.horizontal
        ? new THREE.Vector3(coordinate, edge.from.y, floor)
        : new THREE.Vector3(edge.from.x, coordinate, floor);
      let cursor = low;
      for (const [gapStartRaw, gapEndRaw] of gaps) {
        const gapStart = THREE.MathUtils.clamp(gapStartRaw, low, high);
        const gapEnd = THREE.MathUtils.clamp(gapEndRaw, low, high);
        if (gapStart > cursor) addFenceSegment(pointAt(cursor), pointAt(gapStart), 'Front boundary');
        cursor = Math.max(cursor, gapEnd);
      }
      if (cursor < high) addFenceSegment(pointAt(cursor), pointAt(high), 'Front boundary');
      const addOpenGateLeaf = (pivot, length, name) => {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(
          Math.abs(outward.x) > Math.abs(outward.y) ? length : 0.075,
          Math.abs(outward.y) >= Math.abs(outward.x) ? length : 0.075,
          fenceHeight * 0.76,
        ), gateMaterial);
        leaf.position.copy(pivot).addScaledVector(outward, -length / 2);
        leaf.position.z = floor + fenceHeight * 0.5;
        leaf.name = `${name} leaf · presentation only`;
        group.add(leaf);
      };
      const gateStartPoint = pointAt(mainCenter - gateWidth / 2);
      const gateEndPoint = pointAt(mainCenter + gateWidth / 2);
      if (gateWidth > 0) {
        const mainGateName = vehiclesEnabled ? 'Vehicle gate' : 'Pedestrian gate';
        addOpenGateLeaf(gateStartPoint, gateWidth / 2, mainGateName);
        addOpenGateLeaf(gateEndPoint, gateWidth / 2, mainGateName);
      }
      if (peopleCount > 0 && vehiclesEnabled) addOpenGateLeaf(pointAt(pedestrianCenter + pedestrianGateWidth / 2), pedestrianGateWidth, 'Pedestrian gate');
      for (const coordinate of gaps.flat().filter((value) => value >= low && value <= high)) {
        const isVehicleGate = vehiclesEnabled && Math.abs(coordinate - mainCenter) <= gateWidth / 2 + 0.01;
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(isVehicleGate ? 0.2 : 0.14, isVehicleGate ? 0.2 : 0.14, fenceHeight + (isVehicleGate ? 0.15 : 0)),
          gateMaterial,
        );
        const point = pointAt(coordinate);
        post.position.set(point.x, point.y, floor + fenceHeight / 2 + (isVehicleGate ? 0.075 : 0));
        post.name = `${isVehicleGate ? 'Vehicle' : 'Pedestrian'} gate post · presentation only`;
        group.add(post);
      }
    }
  }

  if (contextObjects.trees) {
    const foliageTexture = makeFoliageTexture(vegetationColors);
    const barkTexture = makeBarkTexture(barkColors);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', map: barkTexture, roughness: 0.96 });
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', map: foliageTexture, roughness: 0.96 });
    const count = Math.max(0, Math.min(16, Number(rule.trees) || 0));
    const heightBase = Math.max(2.4, Math.min(5.5, radius * 0.24));
    const rearSide = frontSide === 'south' ? 'north' : frontSide === 'north' ? 'south' : frontSide === 'east' ? 'west' : 'east';
    const planting = String(rule.vegetation || '').toLowerCase();
    const sideOrder = planting.includes('courtyard')
      ? [rearSide, 'east', 'west', 'north', 'south']
      : planting.includes('formal') || planting.includes('shade')
        ? [rearSide, 'west', 'east', 'north', 'south']
        : [rearSide, 'west', 'east', 'south', 'north'];
    const plantingSides = [...new Set(sideOrder)].filter((side) => side !== frontSide);
    const boundaryClearance = heightBase * 0.32 + 0.45;
    const slotsPerSide = Math.max(1, Math.ceil(count / plantingSides.length));
    const treeRandom = seededRandom(Number(seed) + 311);
    const treeCandidates = plantingSides.flatMap((side) => Array.from({ length: slotsPerSide }, (_, slot) => ({
      side,
      t: (slot + 0.35 + treeRandom() * 0.3) / slotsPerSide,
    })));
    const plantedCanopies = [];
    const leafClusterGeometry = new THREE.SphereGeometry(0.5, 12, 8);
    const pointSegmentDistance = (point, start, end) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const ratio = lengthSquared > 0 ? THREE.MathUtils.clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1) : 0;
      return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
    };
    const contextRoutes = [];
    if (vehiclesEnabled) contextRoutes.push({ start: gatePoint, end: drivewayEnd, halfWidth: driveWidth / 2 });
    if (contextObjects.paths !== false && peopleCount > 0) {
      const start = gatePoint.clone().addScaledVector(tangent, pedestrianOffset);
      const end = frontPoint.clone().addScaledVector(tangent, pedestrianOffset);
      contextRoutes.push({ start, end, halfWidth: walkWidth / 2 });
      contextRoutes.push({ start: end, end: frontPoint, halfWidth: walkWidth / 2 });
    }
    const parkedVehicles = vehiclePlans.flatMap(({ type, length, width, offset }) => {
      const parkingDepth = width / 2 + 1.5;
      const tangentCoordinate = frontPoint.clone().sub(plotCenter).dot(tangent) + offset;
      if (frontPoint.distanceTo(gatePoint) < parkingDepth + width / 2 + 0.5
        || Math.abs(tangentCoordinate) + length / 2 + 0.4 > plotHalfAlongTangent) return [];
      return [{ point: frontPoint.clone().addScaledVector(tangent, offset).addScaledVector(outward, parkingDepth), clearance: Math.hypot(length, width) / 2 + 0.5 }];
    });
    for (let index = 0; index < count; index += 1) {
      const tree = new THREE.Group();
      tree.name = `${rule.vegetation || 'Ornamental'} tree ${index + 1} · presentation only`;
      tree.rotation.x = Math.PI / 2;
      const height = heightBase * (0.88 + random() * 0.24);
      const crownRadius = height * 0.32;
      const start = index % Math.max(treeCandidates.length, 1);
      const candidates = [...treeCandidates.slice(start), ...treeCandidates.slice(0, start)];
      let x;
      let y;
      let placed = false;
      for (const candidate of candidates) {
        const along = THREE.MathUtils.lerp(minX, maxX, candidate.t);
        const across = THREE.MathUtils.lerp(minY, maxY, candidate.t);
        const point = candidate.side === 'north' ? { x: along, y: maxY + boundaryClearance }
          : candidate.side === 'south' ? { x: along, y: minY - boundaryClearance }
            : candidate.side === 'west' ? { x: minX - boundaryClearance, y: across }
              : { x: maxX + boundaryClearance, y: across };
        if (point.x < plot.minX + boundaryClearance || point.x > plot.maxX - boundaryClearance
          || point.y < plot.minY + boundaryClearance || point.y > plot.maxY - boundaryClearance) continue;
        const dx = Math.max(minX - point.x, 0, point.x - maxX);
        const dy = Math.max(minY - point.y, 0, point.y - maxY);
        if (Math.hypot(dx, dy) < crownRadius + 0.4) continue;
        if (contextRoutes.some((route) => pointSegmentDistance(point, route.start, route.end) < route.halfWidth + crownRadius + 0.4)) continue;
        if (parkedVehicles.some((vehicle) => Math.hypot(vehicle.point.x - point.x, vehicle.point.y - point.y) < vehicle.clearance + crownRadius)) continue;
        if (plantedCanopies.some((other) => Math.hypot(other.x - point.x, other.y - point.y) < other.radius + crownRadius + 0.35)) continue;
        x = point.x;
        y = point.y;
        placed = true;
        break;
      }
      if (!placed) continue;
      plantedCanopies.push({ x, y, radius: crownRadius });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.025, height * 0.042, height * 0.55, 8), trunkMaterial);
      trunk.position.y = height * 0.275;
      tree.add(trunk);
      for (let branchIndex = 0; branchIndex < 5; branchIndex += 1) {
        const angle = (branchIndex / 5) * Math.PI * 2 + random() * 0.35;
        const branchLength = height * (0.2 + random() * 0.06);
        const direction = new THREE.Vector3(Math.cos(angle) * 0.7, 0.72, Math.sin(angle) * 0.7).normalize();
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.012, height * 0.022, branchLength, 6), trunkMaterial);
        branch.position.set(direction.x * branchLength * 0.34, height * (0.46 + random() * 0.1), direction.z * branchLength * 0.34);
        branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        tree.add(branch);
      }
      const canopyCount = 48;
      const canopy = new THREE.InstancedMesh(leafClusterGeometry, foliageMaterial, canopyCount);
      const dummy = new THREE.Object3D();
      const sphereDirection = new THREE.Vector3();
      for (let leafIndex = 0; leafIndex < canopyCount; leafIndex += 1) {
        sphereDirection.set(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize();
        const spread = leafIndex === 0 ? 0 : Math.pow(random(), 0.42);
        const clusterRadius = height * (0.08 + random() * 0.045);
        dummy.position.set(
          sphereDirection.x * crownRadius * spread,
          height * 0.7 + sphereDirection.y * height * 0.18 * spread,
          sphereDirection.z * crownRadius * 0.78 * spread,
        );
        dummy.scale.set(clusterRadius * (0.85 + random() * 0.5), clusterRadius * (0.78 + random() * 0.5), clusterRadius * (0.85 + random() * 0.5));
        dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
        dummy.updateMatrix();
        canopy.setMatrixAt(leafIndex, dummy.matrix);
        canopy.setColorAt(leafIndex, new THREE.Color(vegetationColors[Math.floor(random() * vegetationColors.length)]));
      }
      canopy.instanceMatrix.needsUpdate = true;
      canopy.computeBoundingBox();
      canopy.computeBoundingSphere();
      tree.add(canopy);
      tree.position.set(x, y, floor);
      group.add(tree);
    }
  }

  if (contextObjects.shrubs) {
    const rearSide = frontSide === 'south' ? 'north' : frontSide === 'north' ? 'south' : frontSide === 'east' ? 'west' : 'east';
    const requestedShrubs = Math.max(0, Math.min(24, Number(rule.shrubs) || 0));
    const horizontalEdge = rearSide === 'north' || rearSide === 'south';
    const edgeLength = horizontalEdge ? plot.maxX - plot.minX : plot.maxY - plot.minY;
    const count = Math.min(requestedShrubs, Math.max(0, Math.floor((edgeLength - 2.4) / 1.25)));
    const shrubMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', map: makeFoliageTexture(vegetationColors), roughness: 1 });
    const shrubInstances = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 10, 8), shrubMaterial, count * 7);
    const shrubTransform = new THREE.Object3D();
    let shrubInstance = 0;
    for (let index = 0; index < count; index += 1) {
      const t = (index + 0.5) / Math.max(count, 1);
      const inset = 0.9;
      const x = horizontalEdge ? plot.minX + inset + t * (plot.maxX - plot.minX - inset * 2) : (rearSide === 'west' ? plot.minX + inset : plot.maxX - inset);
      const y = horizontalEdge ? (rearSide === 'north' ? plot.maxY - inset : plot.minY + inset) : plot.minY + inset + t * (plot.maxY - plot.minY - inset * 2);
      const radiusSize = 0.32 + random() * 0.16;
      for (let cluster = 0; cluster < 7; cluster += 1) {
        const leafRadius = radiusSize * (0.52 + random() * 0.48);
        shrubTransform.position.set(
          x + (random() - 0.5) * radiusSize * 1.55,
          y + (random() - 0.5) * radiusSize * 1.15,
          floor + radiusSize * (0.38 + random() * 0.55),
        );
        shrubTransform.scale.set(leafRadius * 1.1, leafRadius * 0.85, leafRadius * 0.72);
        shrubTransform.rotation.set(random(), random(), random());
        shrubTransform.updateMatrix();
        shrubInstances.setMatrixAt(shrubInstance, shrubTransform.matrix);
        shrubInstances.setColorAt(shrubInstance, new THREE.Color(vegetationColors[Math.floor(random() * vegetationColors.length)]));
        shrubInstance += 1;
      }
    }
    shrubInstances.name = `${rule.vegetation || 'Ornamental'} hedge clusters · presentation only`;
    shrubInstances.count = shrubInstance;
    shrubInstances.instanceMatrix.needsUpdate = true;
    shrubInstances.computeBoundingBox();
    shrubInstances.computeBoundingSphere();
    group.add(shrubInstances);
  }

  if (vehiclesEnabled && vehiclePlans.length) {
    vehiclePlans.forEach(({ type, length, width, offset }) => {
      const height = vehicleDimensions[type][2];
      const parkingDepth = width / 2 + 1.5;
      if (frontPoint.distanceTo(gatePoint) < parkingDepth + width / 2 + 0.5) return;
      const tangentCoordinate = frontPoint.clone().sub(plotCenter).dot(tangent) + offset;
      if (Math.abs(tangentCoordinate) + length / 2 + 0.4 > plotHalfAlongTangent) return;
      const vehicle = new THREE.Group();
      vehicle.name = `Context ${type} · presentation only`;
      const up = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
      const tangentAngle = Math.atan2(tangent.x, -tangent.y);
      vehicle.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), tangentAngle).multiply(up);
      const paint = new THREE.MeshPhysicalMaterial({ color: vehiclePaints[Math.floor(random() * vehiclePaints.length)], roughness: 0.27, metalness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
      const glass = new THREE.MeshPhysicalMaterial({ color: referenceRoles.glazing || '#60737a', roughness: 0.16, metalness: 0.08, clearcoat: 0.85, transparent: true, opacity: 0.84, depthWrite: false });
      const rubber = new THREE.MeshStandardMaterial({ color: '#202222', roughness: 0.94 });
      const alloy = new THREE.MeshStandardMaterial({ color: '#b8b9b3', roughness: 0.3, metalness: 0.65 });
      const darkTrim = new THREE.MeshStandardMaterial({ color: '#272b2b', roughness: 0.72, metalness: 0.12 });
      const headlamp = new THREE.MeshStandardMaterial({ color: '#fff0c9', emissive: '#ffe4a1', emissiveIntensity: 0.12, roughness: 0.2 });
      const tailLamp = new THREE.MeshStandardMaterial({ color: '#8c3024', emissive: '#8c180e', emissiveIntensity: 0.08, roughness: 0.3 });
      const body = new THREE.Mesh(new RoundedBoxGeometry(width, height * 0.36, length, 4, 0.12), paint);
      body.position.y = height * 0.31;
      vehicle.add(body);
      const hood = new THREE.Mesh(new RoundedBoxGeometry(width * 0.86, height * 0.13, length * 0.29, 3, 0.055), paint);
      hood.position.set(0, height * 0.49, length * 0.31);
      vehicle.add(hood);
      const trunk = new THREE.Mesh(new RoundedBoxGeometry(width * 0.82, height * 0.1, length * 0.2, 3, 0.045), paint);
      trunk.position.set(0, height * 0.47, -length * 0.39);
      vehicle.add(trunk);
      const roof = new THREE.Mesh(new RoundedBoxGeometry(width * 0.7, height * 0.075, length * 0.41, 4, 0.075), paint);
      roof.position.set(0, height * 0.86, -length * 0.045);
      vehicle.add(roof);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, height * 0.235, 0.025), glass);
      windshield.position.set(0, height * 0.69, length * 0.19);
      windshield.rotation.x = -0.32;
      vehicle.add(windshield);
      const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(width * 0.58, height * 0.2, 0.022), glass);
      rearWindow.position.set(0, height * 0.68, -length * 0.27);
      rearWindow.rotation.x = 0.32;
      vehicle.add(rearWindow);
      for (const side of [-1, 1]) {
        for (const section of [-1, 1]) {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.055, height * 0.28, length * 0.045), paint);
          pillar.position.set(side * width * 0.33, height * 0.69, section * length * 0.205);
          vehicle.add(pillar);
        }
        const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.018, height * 0.195, length * 0.31), glass);
        sideWindow.position.set(side * width * 0.365, height * 0.69, -length * 0.025);
        vehicle.add(sideWindow);
        const mirror = new THREE.Mesh(new RoundedBoxGeometry(width * 0.1, height * 0.075, length * 0.08, 2, 0.025), paint);
        mirror.position.set(side * width * 0.53, height * 0.65, length * 0.14);
        vehicle.add(mirror);
      }
      const addBox = (geometry, material, position, rotation = null) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position[0], position[1], position[2]);
        if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
        vehicle.add(mesh);
        return mesh;
      };
      addBox(new THREE.BoxGeometry(width * 0.44, height * 0.105, 0.025), darkTrim, [0, height * 0.31, length * 0.502]);
      for (let slat = 0; slat < 3; slat += 1) {
        addBox(new THREE.BoxGeometry(width * 0.36, 0.012, 0.03), alloy, [0, height * (0.275 + slat * 0.035), length * 0.511]);
      }
      for (const side of [-1, 1]) {
        addBox(new THREE.BoxGeometry(width * 0.15, height * 0.075, 0.035), headlamp, [side * width * 0.32, height * 0.43, length * 0.49]);
        addBox(new THREE.BoxGeometry(width * 0.13, height * 0.085, 0.028), tailLamp, [side * width * 0.34, height * 0.4, -length * 0.49]);
      }
      addBox(new RoundedBoxGeometry(width * 0.94, height * 0.065, 0.14, 3, 0.035), alloy, [0, height * 0.22, length * 0.48]);
      addBox(new RoundedBoxGeometry(width * 0.92, height * 0.055, 0.12, 3, 0.03), darkTrim, [0, height * 0.22, -length * 0.48]);
      const wheelRadius = Math.min(0.36, height * 0.23);
      for (const side of [-1, 1]) for (const axle of [-1, 1]) {
        const wheel = new THREE.Group();
        wheel.position.set(side * width * 0.49, wheelRadius, axle * length * 0.31);
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, width * 0.11, 24), rubber);
        tire.rotation.z = Math.PI / 2;
        wheel.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, width * 0.112, 16), alloy);
        rim.rotation.z = Math.PI / 2;
        wheel.add(rim);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.2, wheelRadius * 0.2, width * 0.116, 12), darkTrim);
        hub.rotation.z = Math.PI / 2;
        wheel.add(hub);
        vehicle.add(wheel);
      }
      if (type === 'ambulance') {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(width * 1.01, height * 0.09, length * 0.64), new THREE.MeshStandardMaterial({ color: '#c34739', roughness: 0.8 }));
        stripe.position.y = height * 0.39;
        vehicle.add(stripe);
      }
      if (type === 'bus' || type === 'truck') {
        const box = new THREE.Mesh(new RoundedBoxGeometry(width * 0.96, height * 0.48, length * 0.62, 3, 0.08), paint);
        box.position.set(0, height * 0.75, -length * 0.08);
        vehicle.add(box);
      }
      const position = frontPoint.clone()
        .addScaledVector(tangent, offset)
        .addScaledVector(outward, parkingDepth);
      vehicle.position.set(position.x, position.y, floor);
      group.add(vehicle);
    });
  }

  if (peopleCount > 0) {
    const clothing = ['#687b76', '#a87750', '#536483', '#d0bba0', '#7e665d', '#556b43', '#d8d4ca'];
    const skin = ['#8b5f43', '#b77d58', '#d0a17e', '#6f4936', '#9a6b51'];
    for (let index = 0; index < peopleCount; index += 1) {
      const person = new THREE.Group();
      person.name = `Context person ${index + 1} · presentation only`;
      person.rotation.x = Math.PI / 2;
      const clothingMaterial = new THREE.MeshStandardMaterial({ color: clothing[Math.floor(random() * clothing.length)], roughness: 0.88 });
      const skinMaterial = new THREE.MeshStandardMaterial({ color: skin[Math.floor(random() * skin.length)], roughness: 0.9 });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.74, 8), clothingMaterial);
      torso.position.y = 0.98;
      person.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), skinMaterial);
      head.position.y = 1.48;
      person.add(head);
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.72, 7), new THREE.MeshStandardMaterial({ color: '#363a3c', roughness: 0.9 }));
        leg.position.set(side * 0.09, 0.38, 0);
        person.add(leg);
      }
      const layer = Math.floor(index / peopleColumns);
      const slot = index % peopleColumns;
      const depth = 0.38 + layer * 0.68 + (random() - 0.5) * 0.12;
      const lateral = pedestrianOffset + (slot - (peopleColumns - 1) / 2) * 0.82 + (random() - 0.5) * 0.36;
      const position = frontPoint.clone().addScaledVector(outward, depth).addScaledVector(tangent, lateral);
      person.position.set(position.x, position.y, floor);
      group.add(person);
    }
  }

  group.userData.layout = { buildingType, seed, setback, gateWidth, frontSide };
  return group;
}

export { makeRuleBasedContextLayer, seededRandom };
