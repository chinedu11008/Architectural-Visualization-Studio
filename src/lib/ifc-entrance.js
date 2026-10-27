import * as THREE from 'three';

function isExternal(properties = {}) {
  const raw = properties.IsExternal ?? properties.isExternal;
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  const normalized = String(raw ?? '').toLowerCase();
  if (normalized === 'true' || normalized === 't') return true;
  if (normalized === 'false' || normalized === 'f') return false;
  return null;
}

/** Find the most plausible ground-level exterior door without modifying IFC geometry. */
export function locateMainEntrance(modelGroup, bounds, elementMetadata = {}) {
  const doors = [];
  modelGroup.traverse((object) => {
    if (!object.isMesh) return;
    const metadata = elementMetadata[object.userData.ifcExpressID];
    if (!String(metadata?.type || '').toUpperCase().includes('DOOR')) return;
    object.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const distances = [
      ['west', Math.abs(center.x - bounds.min.x)],
      ['east', Math.abs(bounds.max.x - center.x)],
      ['south', Math.abs(center.y - bounds.min.y)],
      ['north', Math.abs(bounds.max.y - center.y)],
    ].sort((a, b) => a[1] - b[1]);
    const groundDelta = Math.max(0, box.min.z - bounds.min.z);
    const size = box.getSize(new THREE.Vector3());
    doors.push({
      id: object.userData.ifcExpressID,
      side: distances[0][0],
      edgeDistance: distances[0][1],
      position: { x: center.x, y: center.y, z: box.min.z },
      width: Math.max(size.x, size.y),
      isExternal: isExternal(metadata.properties),
      groundDelta,
      name: metadata.name || null,
    });
  });

  const groundLimit = Math.max(0.8, bounds.getSize(new THREE.Vector3()).z * 0.1);
  const groundDoors = doors.filter((door) => door.groundDelta <= groundLimit);
  const candidates = groundDoors.length ? groundDoors : doors;
  const externalRank = (value) => value === true ? 0 : value === false ? 1 : 2;
  return candidates.sort((first, second) => externalRank(first.isExternal) - externalRank(second.isExternal)
    || first.groundDelta - second.groundDelta
    || first.edgeDistance - second.edgeDistance
    || second.width - first.width)[0] || null;
}
