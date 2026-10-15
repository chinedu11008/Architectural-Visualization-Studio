import { describe, expect, it } from 'vitest';
import { elementColorRole } from '../element-roles';

describe('IFC building element color roles', () => {
  it.each([
    [{ type: 'IFCWALLSTANDARDCASE', properties: { IsExternal: { value: true } } }, 'exteriorWall'],
    [{ type: 'IFCWALL', properties: { IsExternal: false } }, 'interiorWall'],
    [{ type: 'IFCROOF' }, 'roof'],
    [{ type: 'IFCWINDOW' }, 'glazing'],
    [{ type: 'IFCDOOR' }, 'door'],
  ])('maps IFC classes and properties to a visual role', (element, expected) => {
    expect(elementColorRole(element)).toBe(expected);
  });

  it('uses material names for products exported with generic IFC classes', () => {
    expect(elementColorRole({ type: 'IFCBUILDINGELEMENTPROXY', materials: 'Insulated glazing' })).toBe('glazing');
  });

  it('leaves unknown classes alone instead of guessing from position', () => {
    expect(elementColorRole({ type: 'IFCBUILDINGELEMENTPROXY', name: 'Generic object' })).toBeNull();
  });
});
