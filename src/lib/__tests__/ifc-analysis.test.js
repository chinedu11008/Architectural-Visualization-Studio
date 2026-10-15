import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { analyzeIfcModel, completeIfcAnalysis } from '../ifc-analysis';

function list(values) {
  return { size: () => values.length, get: (index) => values[index] };
}

function makeIfcApi() {
  const typeCodes = {
    IFCWALL: 1,
    IFCWINDOW: 2,
    IFCBUILDINGSTOREY: 3,
    IFCRELCONTAINEDINSPATIALSTRUCTURE: 4,
    IFCSPACE: 5,
    IFCBUILDING: 6,
    IFCPROJECT: 7,
    IFCSITE: 8,
    IFCUNITASSIGNMENT: 9,
    IFCRELDEFINESBYPROPERTIES: 10,
    IFCRELASSOCIATESMATERIAL: 11,
  };
  const names = Object.fromEntries(Object.entries(typeCodes).map(([name, code]) => [code, name]));
  const entityIds = { 1: [101], 2: [102], 3: [201], 4: [301] };
  const lines = {
    101: { Name: { value: 'Exterior wall' } },
    102: { Name: { value: 'Living room window' } },
    201: { Name: { value: 'Level 01' }, Elevation: { value: 0 } },
    301: { RelatedElements: [{ value: 101 }, { value: 102 }], RelatingStructure: { value: 201 } },
  };
  const rawTypes = { 101: 1, 102: 2 };
  return {
    GetTypeCodeFromName: (name) => typeCodes[name] || 0,
    GetLineIDsWithType: (_modelId, code) => list(entityIds[code] || []),
    GetLine: (_modelId, id) => lines[id] || null,
    GetIfcEntityList: () => [1, 2],
    IsIfcElement: (code) => code === 1 || code === 2,
    GetNameFromTypeCode: (code) => names[code] || '',
    GetRawLineData: (_modelId, id) => ({ type: rawTypes[id] }),
    GetModelSchema: () => 'IFC4',
  };
}

describe('IFC analysis', () => {
  it('associates elements with storeys through spatial containment', () => {
    const result = analyzeIfcModel(makeIfcApi(), 7);
    expect(result.storeys).toEqual([{ id: 201, name: 'Level 01', elevation: 0 }]);
    expect(result.elementMetadata['101']).toMatchObject({ type: 'IFCWALL', storeyId: 201, storeyName: 'Level 01' });
    expect(result.elementMetadata['102']).toMatchObject({ type: 'IFCWINDOW', storeyId: 201 });
  });

  it('keeps storey IDs in the compact report and removes raw element metadata', () => {
    const analysis = analyzeIfcModel(makeIfcApi(), 7);
    const report = completeIfcAnalysis(analysis, {
      bounds: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 8, 6)),
      geometryMeshCount: 2,
    });
    expect(report.storeys[0]).toMatchObject({ id: 201, name: 'Level 01' });
    expect(report).not.toHaveProperty('elementMetadata');
  });
});
