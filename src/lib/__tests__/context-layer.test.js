import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { makeRuleBasedContextLayer, seededRandom } from '../context-layer';

let previousDocument;

function canvasContext() {
  return {
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    ellipse() {}, fill() {}, bezierCurveTo() {},
  };
}

function createContextLayer(seed, siteBounds = null) {
  const bounds = new THREE.Box3(new THREE.Vector3(-5, -5, 0), new THREE.Vector3(5, 5, 8));
  return makeRuleBasedContextLayer(bounds, 8, {
    contextObjects: { trees: true, shrubs: false, cars: false, people: false, boundary: false, paths: false, grass: false },
    buildingType: 'house',
    rule: { trees: 4, vegetation: 'formal' },
    seed,
    siteBounds,
  });
}

function treePositions(group) {
  const positions = [];
  group.traverse((object) => {
    if (object.isGroup && object.name.includes(' tree ')) positions.push(object.position.toArray());
  });
  return positions;
}

describe('seeded context layer', () => {
  beforeEach(() => {
    previousDocument = globalThis.document;
    globalThis.document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => canvasContext() }),
    };
  });

  afterEach(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });

  it('returns a reproducible random sequence for the same seed', () => {
    const first = seededRandom(321);
    const second = seededRandom(321);
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('places the same tree layout for a seed and a different layout for another seed', () => {
    const first = createContextLayer(19);
    const repeat = createContextLayer(19);
    const changed = createContextLayer(20);
    expect(first.userData.geometryPolicy).toBe('presentation-only');
    expect(treePositions(first).length).toBeGreaterThan(0);
    expect(treePositions(first)).toEqual(treePositions(repeat));
    expect(treePositions(first)).not.toEqual(treePositions(changed));
  });

  it('uses the accepted IfcSite boundary as the exact plot bounds', () => {
    const siteBounds = new THREE.Box3(new THREE.Vector3(-12, -9, 0), new THREE.Vector3(18, 16, 0));
    const group = createContextLayer(19, siteBounds);
    expect(group.userData.layout).toMatchObject({
      setback: 0,
      plotBounds: { minX: -12, maxX: 18, minY: -9, maxY: 16 },
    });
  });

  it('applies the setback only when no IfcSite boundary is available', () => {
    const group = createContextLayer(19);
    expect(group.userData.layout.setback).toBeGreaterThanOrEqual(10);
    expect(group.userData.layout.plotBounds).toMatchObject({ minX: -15, maxX: 15, minY: -15, maxY: 15 });
  });
});
