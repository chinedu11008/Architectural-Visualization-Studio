import * as THREE from 'three';

const roomUseRules = [
  ['circulation', /\b(corridor|hallway|passage|stair|stairwell|lift|elevator|shaft|lobby circulation)\b/],
  ['bathroom', /\b(toilet|restroom|bath(?:room)?|washroom|shower|lavatory|wc|w\.c\.?|ensuite|en-suite)\b/],
  ['kitchen', /\b(kitchen|pantry|scullery|food preparation|cooking)\b/],
  ['bedroom', /\b(bedroom|sleeping|guest room|dormitory|hotel room)\b/],
  ['meeting', /\b(meeting|conference|boardroom|collaboration)\b/],
  ['classroom', /\b(classroom|lecture|teaching|training|student)\b/],
  ['patient', /\b(patient|ward|treatment|examination|exam room|clinical)\b/],
  ['retail', /\b(retail|shop|showroom|sales|display)\b/],
  ['office', /\b(office|workstation|workspace|work.?room|administration)\b/],
  ['dining', /\b(dining|cafeteria|canteen|break.?room|lunch)\b/],
  ['living', /\b(living|family|lounge|sitting|reception|waiting)\b/],
];

const material = (color, roughness = 0.78, extra = {}) => new THREE.MeshStandardMaterial({
  color,
  roughness,
  metalness: 0,
  ...extra,
});

function createMaterials(referenceRoles = {}) {
  const roleColor = (role, fallback) => /^#[\da-f]{6}$/i.test(referenceRoles[role] || '') ? referenceRoles[role] : fallback;
  return {
    wood: material(roleColor('trim', '#806047')),
    lightWood: material(roleColor('interiorWall', '#b99a73')),
    darkWood: material(roleColor('door', '#47372c')),
    fabric: material(roleColor('exteriorWall', '#71817e'), 0.92),
    cushion: material(roleColor('interiorWall', '#c7b7a1'), 0.94),
    ceramic: material('#eeeeea', 0.24),
    metal: material('#555e62', 0.32),
    black: material('#1b2024', 0.4),
    screen: material('#182832', 0.2),
    glass: material('#b8dce5', 0.16, { transparent: true, opacity: 0.36, depthWrite: false }),
    white: material('#f4f1ea', 0.78),
    counter: material(roleColor('interiorWall', '#bab5aa'), 0.36),
    mattress: material('#e2ded5', 0.96),
    accent: material(roleColor('roof', '#8f6548'), 0.84),
  };
}

function addBox(group, name, x, y, z, width, depth, height, surface) {
  if (width <= 0 || depth <= 0 || height <= 0) return null;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, depth, height), surface);
  mesh.name = name;
  mesh.position.set(x, y, z + height / 2);
  mesh.userData.geometryPolicy = 'presentation-only';
  mesh.userData.generatedFurniture = true;
  group.add(mesh);
  return mesh;
}

function addVerticalCylinder(group, name, x, y, z, radiusTop, radiusBottom, height, surface) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16), surface);
  mesh.name = name;
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z + height / 2);
  mesh.userData.geometryPolicy = 'presentation-only';
  mesh.userData.generatedFurniture = true;
  group.add(mesh);
  return mesh;
}

function addChair(group, mats, x, y, scale = 1, name = 'Chair') {
  const width = 0.46 * scale;
  const depth = 0.46 * scale;
  const seatZ = 0.44 * scale;
  addBox(group, `${name} seat`, x, y, seatZ, width, depth, 0.09 * scale, mats.fabric);
  addBox(group, `${name} back`, x, y + depth * 0.42, seatZ + 0.08 * scale, width, 0.08 * scale, 0.52 * scale, mats.fabric);
  for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
    addBox(group, `${name} leg`, x + dx * width * 0.4, y + dy * depth * 0.4, 0, 0.045 * scale, 0.045 * scale, seatZ, mats.metal);
  }
}

function addDesk(group, mats, x, y, scale = 1, name = 'Work desk') {
  const width = 1.35 * scale;
  const depth = 0.68 * scale;
  const top = 0.74 * scale;
  addBox(group, `${name} top`, x, y, top, width, depth, 0.07 * scale, mats.lightWood);
  for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
    addBox(group, `${name} leg`, x + dx * width * 0.42, y + dy * depth * 0.38, 0, 0.055 * scale, 0.055 * scale, top, mats.metal);
  }
  addBox(group, `${name} computer monitor`, x, y + depth * 0.28, top + 0.07 * scale, 0.46 * scale, 0.08 * scale, 0.34 * scale, mats.black);
  addBox(group, `${name} screen`, x, y + depth * 0.33, top + 0.11 * scale, 0.39 * scale, 0.018 * scale, 0.25 * scale, mats.screen);
  addBox(group, `${name} keyboard`, x, y - depth * 0.22, top + 0.075 * scale, 0.38 * scale, 0.12 * scale, 0.025 * scale, mats.white);
  addChair(group, mats, x, y - depth * 0.95, scale * 0.92, `${name} chair`);
}

function buildBathroom(group, mats) {
  // Shower enclosure and tray
  addBox(group, 'Shower tray', -0.53, 0.34, 0.03, 0.86, 0.86, 0.08, mats.white);
  addBox(group, 'Shower glass side', -0.98, 0.34, 0.1, 0.025, 0.86, 1.9, mats.glass);
  addBox(group, 'Shower glass front', -0.53, -0.11, 0.1, 0.86, 0.025, 1.9, mats.glass);
  addBox(group, 'Shower frame', -0.53, -0.13, 0.1, 0.035, 0.035, 1.92, mats.metal);
  addBox(group, 'Shower frame', -0.98, -0.12, 0.1, 0.035, 0.035, 1.92, mats.metal);
  addBox(group, 'Shower head', -0.86, 0.67, 1.78, 0.08, 0.08, 0.06, mats.metal);
  addBox(group, 'Shower mixer', -0.91, 0.57, 1.05, 0.06, 0.08, 0.12, mats.metal);
  // Toilet and cistern
  addBox(group, 'Toilet cistern', 0.47, 0.45, 0.52, 0.4, 0.16, 0.62, mats.ceramic);
  addVerticalCylinder(group, 'Toilet bowl', 0.47, 0.04, 0.34, 0.22, 0.24, 0.2, mats.ceramic);
  addBox(group, 'Toilet seat', 0.47, 0.04, 0.53, 0.43, 0.52, 0.055, mats.white);
  // Vanity and basin
  addBox(group, 'Bathroom vanity', 0.43, -0.55, 0.12, 0.82, 0.4, 0.68, mats.wood);
  addBox(group, 'Bathroom counter', 0.43, -0.55, 0.8, 0.9, 0.47, 0.08, mats.counter);
  addBox(group, 'Bathroom basin', 0.43, -0.55, 0.88, 0.42, 0.25, 0.08, mats.ceramic);
  addBox(group, 'Bathroom faucet', 0.43, -0.7, 0.96, 0.06, 0.16, 0.12, mats.metal);
}

function buildLiving(group, mats) {
  // Sofa
  addBox(group, 'Sofa base', 0, 0.65, 0.14, 2.0, 0.86, 0.42, mats.fabric);
  addBox(group, 'Sofa back', 0, 1.0, 0.56, 2.0, 0.22, 0.62, mats.fabric);
  addBox(group, 'Sofa left arm', -0.93, 0.62, 0.42, 0.2, 0.9, 0.44, mats.fabric);
  addBox(group, 'Sofa right arm', 0.93, 0.62, 0.42, 0.2, 0.9, 0.44, mats.fabric);
  for (const x of [-0.53, 0.53]) addBox(group, 'Sofa cushion', x, 0.53, 0.57, 0.82, 0.54, 0.12, mats.cushion);
  // Coffee table and television unit
  addBox(group, 'Coffee table top', 0, -0.55, 0.42, 1.05, 0.6, 0.08, mats.lightWood);
  for (const x of [-0.42, 0.42]) for (const y of [-0.2, 0.2]) addBox(group, 'Coffee table leg', x, -0.55 + y, 0, 0.05, 0.05, 0.42, mats.darkWood);
  addBox(group, 'TV console', 0, -1.0, 0.08, 1.55, 0.34, 0.45, mats.wood);
  addBox(group, 'Television', 0, -0.94, 0.54, 1.1, 0.08, 0.66, mats.black);
  addBox(group, 'TV screen', 0, -0.89, 0.59, 1.02, 0.018, 0.56, mats.screen);
}

function buildKitchen(group, mats) {
  // Cabinet run: sink, worktop, cooker and refrigerator
  addBox(group, 'Kitchen base cabinets', 0, 0.78, 0.08, 2.8, 0.58, 0.78, mats.wood);
  addBox(group, 'Kitchen worktop', 0, 0.78, 0.86, 2.9, 0.66, 0.08, mats.counter);
  addBox(group, 'Kitchen sink', -0.63, 0.72, 0.94, 0.62, 0.37, 0.08, mats.metal);
  addBox(group, 'Kitchen faucet', -0.63, 0.49, 0.99, 0.06, 0.08, 0.24, mats.metal);
  addBox(group, 'Cooker hob', 0.48, 0.72, 0.95, 0.6, 0.48, 0.04, mats.black);
  for (const x of [0.31, 0.65]) for (const y of [0.6, 0.84]) addVerticalCylinder(group, 'Cooker burner', x, y, 0.99, 0.075, 0.075, 0.025, mats.metal);
  addBox(group, 'Oven door', 0.48, 0.47, 0.33, 0.5, 0.035, 0.34, mats.black);
  addBox(group, 'Kitchen wall cabinets', 0, 1.08, 1.48, 2.75, 0.28, 0.72, mats.lightWood);
  addBox(group, 'Refrigerator', 1.48, 0.84, 0.02, 0.62, 0.68, 1.95, mats.white);
  addBox(group, 'Refrigerator handle', 1.22, 0.47, 1.03, 0.045, 0.05, 0.62, mats.metal);
  addBox(group, 'Kitchen island / table', 0, -0.62, 0.72, 1.2, 0.68, 0.08, mats.lightWood);
  for (const x of [-0.46, 0.46]) addChair(group, mats, x, -1.12, 0.82, 'Kitchen chair');
}

function buildBedroom(group, mats) {
  addBox(group, 'Bed frame', 0, 0.35, 0.12, 2.0, 2.05, 0.3, mats.wood);
  addBox(group, 'Mattress', 0, 0.35, 0.42, 1.9, 1.95, 0.24, mats.mattress);
  addBox(group, 'Headboard', 0, 1.43, 0.15, 2.05, 0.12, 1.15, mats.accent);
  for (const x of [-0.48, 0.48]) addBox(group, 'Bed pillow', x, 1.03, 0.68, 0.72, 0.42, 0.12, mats.white);
  for (const x of [-1.32, 1.32]) {
    addBox(group, 'Bedside table', x, 1.0, 0.1, 0.52, 0.5, 0.58, mats.wood);
    addBox(group, 'Bedside lamp', x, 1.0, 0.69, 0.16, 0.16, 0.36, mats.white);
  }
  addBox(group, 'Bedroom dresser', 0, -1.16, 0.12, 1.35, 0.46, 0.78, mats.lightWood);
}

function buildOffice(group, mats) {
  for (const x of [-1.35, 0, 1.35]) addDesk(group, mats, x, 0.48, 0.9, 'Office workstation');
}

function buildMeeting(group, mats) {
  addBox(group, 'Meeting table', 0, 0.18, 0.72, 2.55, 1.15, 0.1, mats.lightWood);
  for (const x of [-1.0, 1.0]) for (const y of [-0.55, 0.55]) addBox(group, 'Meeting table leg', x, y + 0.18, 0, 0.09, 0.09, 0.72, mats.metal);
  for (const x of [-0.86, 0, 0.86]) {
    addChair(group, mats, x, -0.78, 0.86, 'Meeting chair');
    addChair(group, mats, x, 1.12, 0.86, 'Meeting chair');
  }
}

function buildClassroom(group, mats) {
  for (const x of [-1.2, 0, 1.2]) {
    addBox(group, 'Student desk', x, 0.15, 0.68, 0.88, 0.56, 0.07, mats.lightWood);
    addChair(group, mats, x, -0.42, 0.82, 'Student chair');
  }
  addBox(group, 'Classroom board', 0, 1.22, 1.12, 2.75, 0.06, 1.18, mats.white);
}

function buildDining(group, mats) {
  addBox(group, 'Dining table', 0, 0.18, 0.74, 1.9, 0.92, 0.09, mats.lightWood);
  for (const x of [-0.72, 0.72]) for (const y of [-0.26, 0.26]) addBox(group, 'Dining table leg', x, y + 0.18, 0, 0.08, 0.08, 0.74, mats.darkWood);
  for (const x of [-0.62, 0, 0.62]) {
    addChair(group, mats, x, -0.62, 0.86, 'Dining chair');
    addChair(group, mats, x, 0.98, 0.86, 'Dining chair');
  }
}

function buildPatientRoom(group, mats) {
  addBox(group, 'Hospital bed frame', -0.24, 0.1, 0.18, 1.08, 2.08, 0.28, mats.metal);
  addBox(group, 'Hospital mattress', -0.24, 0.1, 0.46, 1.0, 2.0, 0.18, mats.white);
  addBox(group, 'Hospital headboard', -0.24, 1.15, 0.5, 1.1, 0.08, 0.78, mats.white);
  for (const x of [-0.74, 0.26]) addBox(group, 'Bed rail', x, 0.15, 0.75, 0.06, 1.45, 0.14, mats.metal);
  addBox(group, 'Patient bedside cabinet', 0.96, 0.94, 0.14, 0.48, 0.5, 0.72, mats.lightWood);
  addChair(group, mats, 0.96, -0.18, 0.85, 'Visitor chair');
}

function buildRetail(group, mats) {
  addBox(group, 'Retail display island', 0, 0.38, 0.22, 2.25, 0.78, 0.84, mats.lightWood);
  addBox(group, 'Retail counter', 0.45, -0.82, 0.12, 1.55, 0.58, 0.95, mats.wood);
  addBox(group, 'Point of sale screen', 0.45, -0.7, 1.08, 0.28, 0.08, 0.24, mats.screen);
  for (const x of [-1.45, 1.45]) addBox(group, 'Retail wall shelf', x, 0.55, 0.55, 0.28, 1.75, 1.1, mats.wood);
}

const kits = {
  bathroom: { width: 2.45, depth: 1.85, build: buildBathroom },
  kitchen: { width: 3.5, depth: 2.7, build: buildKitchen },
  bedroom: { width: 4.1, depth: 3.25, build: buildBedroom },
  living: { width: 4.2, depth: 3.0, build: buildLiving },
  office: { width: 4.3, depth: 3.2, build: buildOffice },
  meeting: { width: 3.8, depth: 3.4, build: buildMeeting },
  classroom: { width: 4.6, depth: 2.9, build: buildClassroom },
  patient: { width: 3.2, depth: 2.9, build: buildPatientRoom },
  retail: { width: 4.1, depth: 3.0, build: buildRetail },
  dining: { width: 3.5, depth: 2.8, build: buildDining },
};

function estimatedUses(buildingType, floorIndex) {
  if (buildingType === 'house') {
    return floorIndex === 0
      ? ['living', 'kitchen', 'dining', 'bathroom']
      : ['bedroom', 'bedroom', 'bathroom', 'living'];
  }
  if (buildingType === 'apartment') return ['living', 'kitchen', 'bedroom', 'bathroom'];
  if (buildingType === 'office') return ['office', 'office', 'meeting', 'dining'];
  if (buildingType === 'hotel') return ['bedroom', 'bedroom', 'bathroom', 'living'];
  if (buildingType === 'school') return ['classroom', 'classroom', 'meeting', 'dining'];
  if (buildingType === 'hospital') return ['patient', 'patient', 'meeting', 'dining'];
  if (buildingType === 'retail') return ['retail', 'retail', 'office', 'dining'];
  if (buildingType === 'industrial') return ['office', 'dining'];
  return ['living'];
}

function createEstimatedFloorRooms(floorBounds = new Map(), buildingType = 'other', sourceToMeters = null) {
  const floors = [...floorBounds.values()]
    .map((floor) => floor?.bounds ? floor : { bounds: floor, storeyId: null })
    .filter((floor) => floor.bounds && !floor.bounds.isEmpty())
    .sort((first, second) => first.bounds.min.z - second.bounds.min.z);
  const rooms = [];

  floors.forEach((floor, floorIndex) => {
    const size = floor.bounds.getSize(new THREE.Vector3());
    const coordinateExtent = Math.max(size.x, size.y);
    const metersPerUnit = Number.isFinite(sourceToMeters) && sourceToMeters > 0
      ? sourceToMeters
      : coordinateExtent > 150 ? 0.001 : 1;
    const widthMeters = size.x * metersPerUnit;
    const depthMeters = size.y * metersPerUnit;
    if (Math.min(widthMeters, depthMeters) < 3 || widthMeters * depthMeters < 12) return;

    const maxZones = Math.min(
      4,
      Math.min(widthMeters, depthMeters) >= 6 ? 4 : Math.max(widthMeters, depthMeters) >= 7 ? 2 : 1,
    );
    const uses = estimatedUses(buildingType, floorIndex).slice(0, maxZones);
    if (!uses.length) return;

    const columns = maxZones >= 4 ? 2 : maxZones === 2 && widthMeters >= depthMeters ? 2 : 1;
    const rows = Math.ceil(uses.length / columns);
    const margin = 0.24 / metersPerUnit;
    const gap = 0.2 / metersPerUnit;
    const availableWidth = size.x - margin * 2 - gap * (columns - 1);
    const availableDepth = size.y - margin * 2 - gap * (rows - 1);
    const zoneWidth = availableWidth / columns;
    const zoneDepth = availableDepth / rows;

    uses.forEach((use, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const min = new THREE.Vector3(
        floor.bounds.min.x + margin + column * (zoneWidth + gap),
        floor.bounds.min.y + margin + row * (zoneDepth + gap),
        floor.bounds.min.z,
      );
      const max = new THREE.Vector3(
        min.x + zoneWidth,
        min.y + zoneDepth,
        min.z + 2.8 / metersPerUnit,
      );
      const id = `estimated-${floorIndex + 1}-${index + 1}`;
      rooms.push({
        space: {
          id,
          name: `Estimated ${use} · IFC floorplate`,
          objectType: use,
          usage: ['Room use estimated from the building type because the IFC has no IfcSpace records.'],
          storeyId: floor.storeyId,
          estimated: true,
        },
        bounds: new THREE.Box3(min, max),
      });
    });
  });

  return rooms;
}

export function detectRoomUse(space = {}, buildingType = 'other') {
  const text = [space.name, space.longName, space.objectType, space.predefinedType,
    ...(space.usage || []), ...Object.entries(space.properties || {}).map(([key, value]) => `${key} ${value}`)]
    .filter(Boolean).join(' ').toLowerCase();
  const explicitUse = roomUseRules.find(([, pattern]) => pattern.test(text))?.[0];
  if (explicitUse) return explicitUse;

  if (/office|administration|corporate/.test(buildingType)) return 'office';
  if (/house|apartment|residential/.test(buildingType)) {
    return /space\s*\d+|room\s*\d+|^room$/i.test(space.name || '') ? 'living' : null;
  }
  if (/hotel/.test(buildingType)) return 'bedroom';
  if (/school/.test(buildingType)) return 'classroom';
  if (/hospital/.test(buildingType)) return 'patient';
  if (/retail/.test(buildingType)) return 'retail';
  return null;
}

export function buildRoomFurnishings(spaces = [], spaceBounds = new Map(), buildingType = 'other', sourceToMeters = null, referenceRoles = {}, floorBounds = new Map()) {
  const root = new THREE.Group();
  root.name = 'Generated room furnishings · presentation only';
  root.userData.geometryPolicy = 'presentation-only';
  const mats = createMaterials(referenceRoles);
  const stats = { spacesDetected: spaces.length, roomsWithGeometry: 0, furnishedRooms: 0, estimatedRooms: 0, missingGeometry: 0, unclassified: 0, tooSmall: 0 };

  const furnishRoom = (space, bounds, estimated = false) => {
    if (!bounds || bounds.isEmpty()) {
      if (!estimated) stats.missingGeometry += 1;
      return;
    }
    if (!estimated) stats.roomsWithGeometry += 1;
    const size = bounds.getSize(new THREE.Vector3());
    const coordinateExtent = Math.max(size.x, size.y);
    const coordinateScale = coordinateExtent > 150
      ? (Number.isFinite(sourceToMeters) && sourceToMeters > 0 ? 1 / sourceToMeters : 1000)
      : 1;
    const roomWidth = size.x / coordinateScale;
    const roomDepth = size.y / coordinateScale;
    if (!Number.isFinite(roomWidth) || !Number.isFinite(roomDepth) || Math.min(roomWidth, roomDepth) < 1.15 || Math.max(roomWidth, roomDepth) > 80) {
      if (!estimated) stats.tooSmall += 1;
      return;
    }
    const roomUse = detectRoomUse(space, buildingType);
    if (!roomUse || roomUse === 'circulation' || !kits[roomUse]) {
      if (!estimated) stats.unclassified += 1;
      return;
    }
    const kit = kits[roomUse];
    const longSide = Math.max(roomWidth, roomDepth) - 0.2;
    const shortSide = Math.min(roomWidth, roomDepth) - 0.2;
    const scale = Math.min(1.05, longSide / kit.width, shortSide / kit.depth);
    if (!Number.isFinite(scale) || scale < 0.34) {
      if (!estimated) stats.tooSmall += 1;
      return;
    }

    const room = new THREE.Group();
    room.name = `${space.name || `Room ${space.id}`} · ${roomUse} furnishings`;
    room.position.set((bounds.min.x + bounds.max.x) / 2, (bounds.min.y + bounds.max.y) / 2, bounds.min.z + 0.015 * coordinateScale);
    room.rotation.z = roomDepth > roomWidth ? Math.PI / 2 : 0;
    room.scale.setScalar(scale * coordinateScale);
    room.userData.geometryPolicy = 'presentation-only';
    room.userData.generatedFurniture = true;
    room.userData.roomId = space.id;
    room.userData.roomUse = roomUse;
    room.userData.storeyId = space.storeyId ?? null;
    kit.build(room, mats);
    root.add(room);
    stats.furnishedRooms += 1;
    if (estimated) stats.estimatedRooms += 1;
  };

  for (const space of spaces) {
    furnishRoom(space, spaceBounds.get(String(space.id)));
  }

  if (!stats.furnishedRooms && floorBounds?.size) {
    for (const { space, bounds } of createEstimatedFloorRooms(floorBounds, buildingType, sourceToMeters)) {
      furnishRoom(space, bounds, true);
    }
  }
  if (!stats.furnishedRooms) Object.values(mats).forEach((surface) => surface.dispose());
  root.userData.furnishingStats = stats;
  return { group: root, stats };
}
