import type { ArchitectureColorTokens } from './colorTokens'

// Shared by the live map and exported record graphics.
export const mapCategoryByType = {
  civic_cultural: 'culture_civic',
  community: 'culture_civic',
  sports: 'culture_civic',
  infrastructure: 'culture_civic',
  healthcare: 'culture_civic',
  mixed_use: 'mixed_use',
  retail: 'commercial',
  office: 'commercial',
  education: 'education',
  hospitality: 'hospitality',
  residential: 'residential',
} as const

export type MapCategory = typeof mapCategoryByType[keyof typeof mapCategoryByType]

export const mapCategories: MapCategory[] = [
  'culture_civic',
  'mixed_use',
  'commercial',
  'education',
  'hospitality',
  'residential',
]

export const categoryColor = (
  tokens: ArchitectureColorTokens,
  category: MapCategory,
): string => ({
  culture_civic: tokens.cultureCivic,
  mixed_use: tokens.mixedUse,
  commercial: tokens.commercial,
  education: tokens.education,
  hospitality: tokens.hospitality,
  residential: tokens.residential,
})[category]

export const getMapCategory = (buildingType: string): MapCategory | null =>
  Object.prototype.hasOwnProperty.call(mapCategoryByType, buildingType)
    ? mapCategoryByType[buildingType as keyof typeof mapCategoryByType]
    : null

export const buildingCategoryColor = (
  tokens: ArchitectureColorTokens,
  buildingType: string,
): string => {
  const category = getMapCategory(buildingType)
  return category ? categoryColor(tokens, category) : tokens.genericFill
}
