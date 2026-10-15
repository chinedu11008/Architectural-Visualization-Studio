function isExternal(properties = {}) {
  const raw = properties.IsExternal ?? properties.isExternal;
  const value = raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw;
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'true' || normalized === 't') return true;
  if (normalized === 'false' || normalized === 'f') return false;
  return null;
}

export function elementColorRole(element = {}) {
  const type = String(element.type || '').toUpperCase();
  const predefined = String(element.predefinedType || element.properties?.PredefinedType || '').toUpperCase();
  const description = [predefined, element.name, element.objectType, element.materials].filter(Boolean).join(' ').toUpperCase();
  if (/IFCWINDOW|IFCCURTAINWALL/.test(type) || /\b(WINDOW|GLASS|GLAZING|CURTAIN\s?WALL)\b/.test(description)) return 'glazing';
  if (/IFCDOOR/.test(type) || /\bDOOR\b/.test(description)) return 'door';
  if (/IFCRAILING/.test(type) || /\b(RAILING|BALUSTRADE|HANDRAIL|GUARDRAIL)\b/.test(description)) return 'balustrade';
  if (/IFCROOF/.test(type) || (type === 'IFCCOVERING' && /ROOF/.test(predefined)) || /\bROOF(ING)?\b/.test(description)) return 'roof';
  if (/IFCWALL/.test(type)) return isExternal(element.properties) === false ? 'interiorWall' : 'exteriorWall';
  if (type === 'IFCPLATE') {
    const external = isExternal(element.properties);
    if (external !== null) return external ? 'exteriorWall' : 'interiorWall';
  }
  if (/\b(INTERIOR|PARTITION)\b/.test(description)) return 'interiorWall';
  if (/\b(WALL|FACADE|CLADDING|SIDING|MASONRY)\b/.test(description)) return 'exteriorWall';
  if (type === 'IFCSLAB' && /ROOF/.test(predefined)) return 'roof';
  if (type === 'IFCCOVERING') return /CLADDING|FACADE/.test(predefined) ? 'exteriorWall' : 'trim';
  if (/IFCMEMBER|IFCCOLUMN|IFCBEAM/.test(type)) return 'trim';
  if (/IFCBUILDINGELEMENTPROXY|IFCELEMENTASSEMBLY/.test(type) && /\b(WALL|FACADE|CLADDING|SIDING|MASONRY)\b/.test(description)) return 'exteriorWall';
  return null;
}
