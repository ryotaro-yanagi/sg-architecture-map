import type { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl'

// The rail stop is geographical context, not a navigation overlay.
// Liberty provides the feature names and MapLibre handles label collision.
export const railStationLabelLayerId = 'poi_transit'
export const railStationLabelMinZoom = 14
export const railStationLabelFilter: FilterSpecification = [
  'all',
  // OpenMapTiles poi class is 'railway'; 'rail' is for transportation geometry.
  ['==', ['get', 'class'], 'railway'],
  ['match', ['get', 'subclass'], ['station', 'halt', 'subway'], true, false],
  ['any', ['has', 'name'], ['has', 'name_en']],
]

export const applyRailStationLabels = (map: MapLibreMap): boolean => {
  if (!map.getLayer(railStationLabelLayerId)) return false
  map.setFilter(railStationLabelLayerId, railStationLabelFilter)
  map.setLayerZoomRange(railStationLabelLayerId, railStationLabelMinZoom, 24)
  map.setLayoutProperty(railStationLabelLayerId, 'visibility', 'visible')
  map.setLayoutProperty(railStationLabelLayerId, 'icon-image', '')
  map.setLayoutProperty(railStationLabelLayerId, 'text-anchor', 'center')
  map.setLayoutProperty(railStationLabelLayerId, 'text-offset', [0, 0])
  map.setLayoutProperty(railStationLabelLayerId, 'text-font', ['Noto Sans Regular'])
  map.setLayoutProperty(railStationLabelLayerId, 'text-size', [
    'interpolate', ['linear'], ['zoom'], 14, 10.5, 16, 11.5, 18, 12,
  ])
  map.setLayoutProperty(railStationLabelLayerId, 'text-max-width', 10)
  map.setLayoutProperty(railStationLabelLayerId, 'text-padding', 4)
  return true
}

export type CartographyLayerAuditRow = {
  id: string
  type: string
  source: string
  sourceLayer: string
  visibility: string
  minzoom: number | string
  maxzoom: number | string
}

// Opt-in development audit: ?cartographyAudit=1; no controls in production UI.
export const snapshotCartographyLayers = (map: MapLibreMap): CartographyLayerAuditRow[] =>
  (map.getStyle()?.layers ?? []).map(layer => ({
    id: layer.id,
    type: layer.type,
    source: 'source' in layer ? String(layer.source ?? '') : '',
    sourceLayer: 'source-layer' in layer ? String(layer['source-layer'] ?? '') : '',
    visibility: String(layer.layout?.visibility ?? 'visible'),
    minzoom: layer.minzoom ?? 'default',
    maxzoom: layer.maxzoom ?? 'default',
  }))

export type CartographyStudyCamera = { center: [number, number]; zoom: number }

// Preview-only deep-link for inspecting the experimental rail labels without
// changing the default map opening camera: ?cartographyPreview=marina
export const getCartographyStudyCamera = (location: string | null): CartographyStudyCamera | null => {
  switch (location) {
    case 'marina': return { center: [103.851, 1.284], zoom: 15.25 }
    case 'orchard': return { center: [103.837, 1.305], zoom: 15.25 }
    case 'west': return { center: [103.681, 1.347], zoom: 15.25 }
    // v0.2 isolated caplet review cameras (station-address proxy points).
    case 'downtown': return { center: [103.8528404, 1.2794462], zoom: 16 }
    case 'bugis': return { center: [103.8557064, 1.3004651], zoom: 16 }
    case 'marina-station': return { center: [103.8545978, 1.2764274], zoom: 16 }
    case 'orchard-station': return { center: [103.8322453, 1.3039799], zoom: 16 }
    case 'outram': return { center: [103.8395135, 1.2797397], zoom: 16 }
    // Full-network review: sparse/urban and peripheral contexts.
    case 'jurong': return { center: [103.7423, 1.3332], zoom: 15.5 }
    case 'punggol': return { center: [103.9015, 1.4030], zoom: 15.5 }
    case 'tampines': return { center: [103.9451, 1.3533], zoom: 15.5 }
    case 'woodlands': return { center: [103.7865, 1.4370], zoom: 15.5 }
    default: return null
  }
}

/** A dedicated preview camera may specify a zoom within the existing SMA bounds. */
export const getCartographyReviewZoom = (raw: string | null): number | null => {
  if (raw == null || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= 9 && value <= 18 ? value : null
}
