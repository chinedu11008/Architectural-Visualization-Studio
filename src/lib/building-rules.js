export const BUILDING_TYPES = [
  { id: 'house', label: 'House / villa' },
  { id: 'apartment', label: 'Apartment block' },
  { id: 'hospital', label: 'Hospital / clinic' },
  { id: 'school', label: 'School' },
  { id: 'office', label: 'Office' },
  { id: 'retail', label: 'Retail' },
  { id: 'worship', label: 'Place of worship' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'industrial', label: 'Industrial / warehouse' },
  { id: 'other', label: 'Other' },
];

export const DEFAULT_SURROUNDINGS_RULES = {
  house: { vegetation: 'ornamental', trees: 2, shrubs: 6, people: 2, vehicles: ['car'], fence: 'masonry with metal gate' },
  apartment: { vegetation: 'shared courtyard', trees: 4, shrubs: 8, people: 8, vehicles: ['car'], fence: 'dark metal' },
  hospital: { vegetation: 'formal', trees: 5, shrubs: 10, people: 12, vehicles: ['ambulance', 'car'], fence: 'low masonry and dark metal' },
  school: { vegetation: 'shade trees and lawn', trees: 5, shrubs: 6, people: 14, vehicles: ['bus', 'car'], fence: 'secure dark metal' },
  office: { vegetation: 'formal', trees: 4, shrubs: 8, people: 8, vehicles: ['car'], fence: 'low masonry and dark metal' },
  retail: { vegetation: 'minimal', trees: 2, shrubs: 4, people: 10, vehicles: ['car', 'van'], fence: 'low dark metal' },
  worship: { vegetation: 'courtyard trees', trees: 4, shrubs: 6, people: 8, vehicles: ['car'], fence: 'painted masonry' },
  hotel: { vegetation: 'ornamental', trees: 5, shrubs: 10, people: 10, vehicles: ['car', 'van'], fence: 'low masonry and dark metal' },
  industrial: { vegetation: 'sparse perimeter', trees: 2, shrubs: 2, people: 4, vehicles: ['van', 'truck'], fence: 'secure industrial metal' },
  other: { vegetation: 'light planting', trees: 2, shrubs: 4, people: 3, vehicles: [], fence: 'dark metal' },
};

export const BUILDING_ROLE_LABELS = {
  exteriorWall: 'Exterior walls',
  interiorWall: 'Interior walls',
  roof: 'Roof',
  trim: 'Trim / frames',
  door: 'Doors',
  balustrade: 'Balustrades',
  glazing: 'Windows / glass',
};

export const DEFAULT_BUILDING_ROLES = {
  exteriorWall: '#e8e1d6',
  interiorWall: '#d8d2c8',
  roof: '#41494d',
  trim: '#898c88',
  door: '#795b43',
  balustrade: '#343b3c',
  glazing: '#53646b',
};

export const VEHICLE_OPTIONS = ['none', 'car', 'ambulance', 'bus', 'van', 'truck'];

export function labelBuildingType(type) {
  return BUILDING_TYPES.find((item) => item.id === type)?.label || 'Other';
}

