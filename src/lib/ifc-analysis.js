const unwrap = (value) => {
  if (value && typeof value === 'object' && 'value' in value) return value.value;
  return value;
};

const refId = (value) => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && Number.isFinite(Number(value.value))) return Number(value.value);
  return null;
};

function idsOf(api, modelId, typeName) {
  try {
    const code = api.GetTypeCodeFromName(typeName.toUpperCase());
    if (!code) return [];
    const ids = api.GetLineIDsWithType(modelId, code, false);
    return Array.from({ length: ids.size() }, (_, index) => ids.get(index));
  } catch {
    return [];
  }
}

function getLine(api, modelId, id, flatten = false) {
  try { return api.GetLine(modelId, id, flatten); } catch { return null; }
}

function lineType(api, modelId, id) {
  try {
    const type = api.GetRawLineData(modelId, id)?.type;
    return type ? api.GetNameFromTypeCode(type) : '';
  } catch {
    return '';
  }
}

function textField(line, name) {
  const value = unwrap(line?.[name]);
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return null;
}

function getPropertyValues(api, modelId) {
  const output = new Map();
  for (const relationshipId of idsOf(api, modelId, 'IFCRELDEFINESBYPROPERTIES')) {
    const relationship = getLine(api, modelId, relationshipId);
    const propertySetId = refId(relationship?.RelatingPropertyDefinition);
    if (!propertySetId) continue;
    const propertySet = getLine(api, modelId, propertySetId, true);
    const properties = [...(propertySet?.HasProperties || []), ...(propertySet?.Quantities || [])];
    const values = {};
    for (const property of properties) {
      const name = textField(property, 'Name');
      if (!name) continue;
      const raw = property.NominalValue ?? property.LengthValue ?? property.AreaValue ?? property.CountValue
        ?? property.VolumeValue ?? property.EnumerationValues ?? property.ListValues;
      const value = Array.isArray(raw) ? raw.map(unwrap).filter((item) => item !== null && item !== undefined).join(', ') : unwrap(raw);
      if (value !== null && value !== undefined && value !== '') values[name] = value;
    }
    for (const related of relationship.RelatedObjects || []) {
      const elementId = refId(related);
      if (elementId) output.set(elementId, { ...(output.get(elementId) || {}), ...values });
    }
  }
  return output;
}

function getMaterialNames(api, modelId) {
  const output = new Map();
  for (const relationshipId of idsOf(api, modelId, 'IFCRELASSOCIATESMATERIAL')) {
    const relationship = getLine(api, modelId, relationshipId);
    const materialId = refId(relationship?.RelatingMaterial);
    if (!materialId) continue;
    const names = new Set();
    const visited = new Set();
    const visit = (id, depth = 0) => {
      if (!id || depth > 8 || visited.has(id)) return;
      visited.add(id);
      const type = lineType(api, modelId, id).toUpperCase();
      if (!type.includes('MATERIAL')) return;
      const line = getLine(api, modelId, id);
      if (type === 'IFCMATERIAL') {
        const name = textField(line, 'Name');
        if (name) names.add(name);
      }
      for (const [key, value] of Object.entries(line || {})) {
        if (!/material|layer|constituent/i.test(key)) continue;
        const values = Array.isArray(value) ? value : [value];
        for (const item of values) visit(refId(item), depth + 1);
      }
    };
    visit(materialId);
    const joined = [...names].join(', ');
    if (!joined) continue;
    for (const related of relationship.RelatedObjects || []) {
      const elementId = refId(related);
      if (elementId) output.set(elementId, [...new Set([...(output.get(elementId) || []), joined])].join(', '));
    }
  }
  return output;
}

function getLengthUnit(api, modelId) {
  for (const assignmentId of idsOf(api, modelId, 'IFCUNITASSIGNMENT')) {
    const assignment = getLine(api, modelId, assignmentId, true);
    const units = Array.isArray(assignment?.Units) ? assignment.Units : [];
    const unit = units.find((item) => String(unwrap(item?.UnitType) || '').toUpperCase() === 'LENGTHUNIT');
    if (!unit) continue;
    const unitName = String(unwrap(unit.Name) || '').toUpperCase();
    const prefix = String(unwrap(unit.Prefix) || '').toUpperCase();
    const prefixFactors = { EXA: 1e18, PETA: 1e15, TERA: 1e12, GIGA: 1e9, MEGA: 1e6, KILO: 1e3, HECTO: 1e2, DECA: 1e1, DECI: 1e-1, CENTI: 1e-2, MILLI: 1e-3, MICRO: 1e-6, NANO: 1e-9 };
    const baseFactors = { METRE: 1, METER: 1, FOOT: 0.3048, INCH: 0.0254, YARD: 0.9144 };
    const factor = (baseFactors[unitName] || null) * (prefixFactors[prefix] || 1);
    return {
      name: `${prefix ? `${prefix[0]}${prefix.slice(1).toLowerCase()} ` : ''}${unitName.toLowerCase()}`,
      sourceToMeters: Number.isFinite(factor) && factor > 0 ? factor : null,
      assumedSi: Boolean(unitName === 'METRE' || unitName === 'METER'),
    };
  }
  return { name: 'Not declared', sourceToMeters: null, assumedSi: false };
}

function summarizeSite(api, modelId) {
  const siteId = idsOf(api, modelId, 'IFCSITE')[0];
  if (!siteId) return null;
  const site = getLine(api, modelId, siteId);
  const coordinates = [site?.RefLatitude, site?.RefLongitude].map((value) => (
    Array.isArray(value) ? value.map(unwrap).filter((part) => part !== null && part !== undefined) : null
  ));
  return {
    name: textField(site, 'Name'),
    description: textField(site, 'Description'),
    landTitleNumber: textField(site, 'LandTitleNumber'),
    siteAddress: textField(site, 'SiteAddress'),
    latitude: coordinates[0],
    longitude: coordinates[1],
    elevation: unwrap(site?.SiteElevation) ?? null,
    hasPlotBoundary: false,
  };
}

const TYPE_RULES = [
  ['hospital', /hospital|clinic|medical|health.?care|patient|ward|surgery|emergency|ambulance/],
  ['school', /school|classroom|education|university|college|student|teacher|nursery/],
  ['worship', /church|mosque|temple|chapel|worship|sanctuary|congregation/],
  ['hotel', /hotel|resort|guest.?room|hospitality|lobby|reception/],
  ['industrial', /industrial|warehouse|factory|manufactur|logistics|distribution|workshop/],
  ['retail', /retail|shop|store|mall|market|showroom|sales/],
  ['office', /office|workplace|administration|conference|meeting|corporate/],
  ['apartment', /apartment|flat|condominium|residential.?unit|multi.?family/],
  ['house', /house|villa|dwelling|single.?family|residence|residential/],
];

function detectBuildingType(signals) {
  const scores = Object.fromEntries([...TYPE_RULES.map(([type]) => [type, 0]), ['other', 0.1]]);
  const evidence = Object.fromEntries(Object.keys(scores).map((type) => [type, []]));
  for (const signal of signals) {
    const text = String(signal.value || '').toLowerCase();
    if (!text) continue;
    for (const [type, pattern] of TYPE_RULES) {
      if (pattern.test(text)) {
        scores[type] += signal.weight;
        evidence[type].push(signal.label);
      }
    }
    const explicit = text.match(/\b(hospital|clinic|school|office|retail|hotel|warehouse|industrial|church|mosque|temple|house|villa|apartment)\b/);
    if (explicit) {
      const matched = TYPE_RULES.find(([, pattern]) => pattern.test(explicit[0]));
      if (matched) scores[matched[0]] += signal.weight * 1.5;
    }
  }
  const ranked = Object.entries(scores).sort((first, second) => second[1] - first[1]);
  const [type, best] = ranked[0];
  const second = ranked[1]?.[1] || 0;
  const confidence = type === 'other' ? 0.2 : Math.max(0.24, Math.min(0.96, 0.38 + best * 0.18 + (best - second) * 0.06));
  return {
    type: confidence >= 0.43 ? type : 'other',
    detectedType: type,
    confidence: Math.round(confidence * 100) / 100,
    uncertain: confidence < 0.58,
    signals: evidence[type] || [],
  };
}

export function analyzeIfcModel(api, modelId, { bounds, entrance = null, geometryMeshCount = 0 } = {}) {
  const propertyMap = getPropertyValues(api, modelId);
  const materialMap = getMaterialNames(api, modelId);
  const elements = new Map();
  const classCounts = {};
  for (const typeCode of api.GetIfcEntityList(modelId)) {
    let isElement = false;
    let typeName = '';
    try {
      isElement = api.IsIfcElement(typeCode);
      typeName = api.GetNameFromTypeCode(typeCode) || '';
    } catch { /* unsupported entity in this schema */ }
    if (!isElement || !typeName.toUpperCase().startsWith('IFC')) continue;
    const lineIds = api.GetLineIDsWithType(modelId, typeCode, false);
    if (!lineIds.size()) continue;
    classCounts[typeName] = lineIds.size();
    for (let index = 0; index < lineIds.size(); index += 1) {
      const id = lineIds.get(index);
      const line = getLine(api, modelId, id);
      const element = {
        id,
        type: typeName,
        name: textField(line, 'Name'),
        objectType: textField(line, 'ObjectType'),
        predefinedType: textField(line, 'PredefinedType'),
        properties: propertyMap.get(id) || {},
        materials: materialMap.get(id) || null,
      };
      elements.set(id, element);
    }
  }

  const spaces = idsOf(api, modelId, 'IFCSPACE').map((id) => {
    const line = getLine(api, modelId, id);
    return {
      name: textField(line, 'Name') || textField(line, 'LongName') || `Space ${id}`,
      longName: textField(line, 'LongName'),
      usage: Object.entries(propertyMap.get(id) || {}).filter(([key]) => /occup|usage|space.?type|activity/i.test(key)).map(([key, value]) => `${key}: ${value}`),
    };
  });
  const storeys = idsOf(api, modelId, 'IFCBUILDINGSTOREY').map((id) => {
    const line = getLine(api, modelId, id);
    return { id, name: textField(line, 'Name') || ('Storey ' + id), elevation: unwrap(line?.Elevation) ?? null };
  });
  const storeysById = new Map(storeys.map((storey) => [storey.id, storey]));
  for (const relationshipId of idsOf(api, modelId, 'IFCRELCONTAINEDINSPATIALSTRUCTURE')) {
    const relationship = getLine(api, modelId, relationshipId);
    const storey = storeysById.get(refId(relationship?.RelatingStructure));
    if (!storey) continue;
    for (const related of relationship.RelatedElements || []) {
      const elementId = refId(related);
      const element = elements.get(elementId);
      if (element) {
        element.storeyId = storey.id;
        element.storeyName = storey.name;
      }
    }
  }
  const buildings = idsOf(api, modelId, 'IFCBUILDING').map((id) => {
    const line = getLine(api, modelId, id);
    return {
      name: textField(line, 'Name'),
      longName: textField(line, 'LongName'),
      description: textField(line, 'Description'),
      predefinedType: textField(line, 'PredefinedType'),
    };
  });
  const projects = idsOf(api, modelId, 'IFCPROJECT').map((id) => getLine(api, modelId, id)).filter(Boolean);
  const sites = idsOf(api, modelId, 'IFCSITE').map((id) => getLine(api, modelId, id)).filter(Boolean);
  const projectSignals = projects.flatMap((line) => ['Name', 'LongName', 'Description', 'ObjectType'].map((key) => ({ label: `Project ${key}`, value: textField(line, key), weight: 1.1 })));
  const buildingSignals = buildings.flatMap((line) => ['Name', 'LongName', 'Description', 'PredefinedType'].map((key) => ({ label: `Building ${key}`, value: line?.[key]?.value ?? line?.[key], weight: key === 'PredefinedType' ? 1.8 : 1.2 })));
  const spaceSignals = spaces.flatMap((space) => [{ label: `Space name: ${space.name}`, value: space.name, weight: 0.65 }, ...space.usage.map((value) => ({ label: `Space properties: ${value}`, value, weight: 0.8 }))]);
  const occupancySignals = [...propertyMap.values()].flatMap((properties) => Object.entries(properties)
    .filter(([key]) => /occup|usage|facility|building.?type|activity/i.test(key))
    .map(([key, value]) => ({ label: `${key}: ${value}`, value: `${key} ${value}`, weight: 1.2 })));
  const buildingType = detectBuildingType([...projectSignals, ...buildingSignals, ...spaceSignals, ...occupancySignals]);
  const units = getLengthUnit(api, modelId);
  const boundsSize = bounds ? {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  } : null;
  const dimensions = boundsSize ? {
    width: Number(boundsSize.x.toFixed(2)),
    depth: Number(boundsSize.y.toFixed(2)),
    height: Number(boundsSize.z.toFixed(2)),
    footprint: Number((boundsSize.x * boundsSize.y).toFixed(2)),
    units: 'm',
    sourceUnits: units.name,
  } : null;
  const materialElementCount = [...elements.values()].filter((element) => element.materials).length;
  const warnings = [];
  if (!sites.length) warnings.push('No IfcSite data was found; surroundings use the building footprint and a setback.');
  if (!materialElementCount) warnings.push('No IFC material associations were found; source mesh colours are used as the natural baseline.');
  if (!entrance) warnings.push('No identifiable ground-level IfcDoor was found; the main approach is estimated from the model bounds.');
  if (dimensions && (dimensions.height < 1 || dimensions.height > 250 || dimensions.width < 0.5 || dimensions.depth < 0.5)) {
    warnings.push('Model dimensions look unusual; confirm the IFC length units before placing scale-sensitive context.');
  }
  if (!units.sourceToMeters) warnings.push('Length unit assignment is missing or unsupported; dimensions are inferred from Web-IFC geometry scaling.');
  const allProperties = [...propertyMap.values()].flatMap((properties) => Object.entries(properties).map(([key, value]) => `${key}: ${value}`));
  const occupancy = allProperties.filter((value) => /occup|usage|activity/i.test(value)).slice(0, 12);
  const site = summarizeSite(api, modelId);
  return {
    schema: api.GetModelSchema(modelId),
    units,
    dimensions,
    storeys,
    overallHeight: dimensions?.height ?? null,
    elementCounts: Object.fromEntries(Object.entries(classCounts).sort((first, second) => first[0].localeCompare(second[0]))),
    elementCount: [...elements.values()].length,
    materialElementCount,
    materialNames: [...new Set([...materialMap.values()].flatMap((value) => value.split(', ')))].slice(0, 24),
    spaces,
    occupancyProperties: occupancy,
    site,
    buildings,
    entrance,
    buildingType,
    geometryMeshCount,
    warnings,
    siteBoundarySource: site?.hasPlotBoundary ? 'IFC site boundary' : 'Building footprint plus setback',
    explicitSiteBoundary: Boolean(site?.hasPlotBoundary),
    elementMetadata: Object.fromEntries([...elements].map(([id, element]) => [id, {
      type: element.type,
      properties: element.properties,
      name: element.name,
      objectType: element.objectType,
      predefinedType: element.predefinedType,
      materials: element.materials,
      storeyId: element.storeyId ?? null,
      storeyName: element.storeyName ?? null,
    }])),
  };
}

export function completeIfcAnalysis(analysis, { bounds, siteBounds = null, entrance = null, geometryMeshCount = 0 } = {}) {
  const size = bounds ? {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  } : null;
  const dimensions = size ? {
    width: Number(size.x.toFixed(2)),
    depth: Number(size.y.toFixed(2)),
    height: Number(size.z.toFixed(2)),
    footprint: Number((size.x * size.y).toFixed(2)),
    units: 'm',
    sourceUnits: analysis.units.name,
  } : null;
  const warnings = (analysis.warnings || []).filter((warning) => !/dimensions look unusual|identifiable ground-level/i.test(warning));
  if (!entrance) warnings.push('No identifiable ground-level IfcDoor was found; the main approach is estimated from the model bounds.');
  if (analysis.site && !siteBounds) warnings.push('IfcSite data exists without a usable site geometry boundary; a setback around the building is used.');
  if (dimensions && (dimensions.height < 1 || dimensions.height > 250 || dimensions.width < 0.5 || dimensions.depth < 0.5)) {
    warnings.push('Model dimensions look unusual; confirm the IFC length units before placing scale-sensitive context.');
  }
  const { elementMetadata, ...report } = analysis;
  return {
    ...report,
    dimensions,
    spaces: (analysis.spaces || []).slice(0, 100),
    spaceCount: (analysis.spaces || []).length,
    overallHeight: dimensions?.height ?? null,
    entrance,
    geometryMeshCount,
    warnings,
    site: analysis.site ? { ...analysis.site, hasPlotBoundary: Boolean(siteBounds) } : null,
    siteBoundarySource: siteBounds ? 'IfcSite geometry bounds' : 'Building footprint plus setback',
    explicitSiteBoundary: Boolean(siteBounds),
  };
}

