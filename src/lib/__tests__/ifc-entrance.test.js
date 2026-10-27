import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { locateMainEntrance } from '../ifc-entrance';

const bounds = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(20, 15, 8));

function door(id, position, dimensions = [0.9, 0.15, 2]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), new THREE.MeshBasicMaterial());
  mesh.position.set(...position);
  mesh.userData.ifcExpressID = id;
  return mesh;
}

describe('main entrance detection', () => {
  it('ranks ground-level doors by their nearest bounds edge distance', () => {
    const model = new THREE.Group();
    model.add(door(10, [0.6, 7.5, 1]));
    model.add(door(11, [10, 0.3, 1]));

    const entrance = locateMainEntrance(model, bounds, {
      10: { type: 'IFCDOOR', properties: { IsExternal: true }, name: 'West door' },
      11: { type: 'IFCDOOR', properties: { IsExternal: true }, name: 'South door' },
    });

    expect(entrance).toMatchObject({ id: 11, side: 'south', isExternal: true });
    expect(entrance.edgeDistance).toBeCloseTo(0.3);
  });

  it('demotes doors whose IsExternal value is unknown', () => {
    const model = new THREE.Group();
    model.add(door(20, [0.4, 7.5, 1]));
    model.add(door(21, [10, 0.4, 1]));

    const entrance = locateMainEntrance(model, bounds, {
      20: { type: 'IFCDOOR', properties: {}, name: 'Unclassified door' },
      21: { type: 'IFCDOOR', properties: { IsExternal: false }, name: 'Known interior door' },
    });

    expect(entrance).toMatchObject({ id: 21, isExternal: false });
  });
});
