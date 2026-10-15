import { describe, expect, it } from 'vitest';
import { DEFAULT_BUILDING_ROLES } from '../building-rules';
import { rolesFromPalette } from '../reference-palette';

describe('rolesFromPalette', () => {
  it('falls back to the editable defaults when sampling has no usable colors', () => {
    expect(rolesFromPalette([])).toEqual(DEFAULT_BUILDING_ROLES);
  });

  it('maps the darkest, lightest, and blue tones to useful building roles', () => {
    const roles = rolesFromPalette(['#222222', '#858585', '#eeeae0', '#5c8ca5', '#a67550']);
    expect(roles.roof).toBe('#222222');
    expect(roles.exteriorWall).toBe('#eeeae0');
    expect(roles.glazing).toBe('#5c8ca5');
    expect(roles).toHaveProperty('interiorWall');
    expect(roles).toHaveProperty('trim');
    expect(roles).toHaveProperty('door');
    expect(roles).toHaveProperty('balustrade');
  });
});
