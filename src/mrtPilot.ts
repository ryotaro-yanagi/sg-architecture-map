import type { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl'
import type { ColorTokens } from './colorTokens'
// Kept local so Node's native TypeScript test runner needs no extensionless runtime import.
const railStationLabelFilter: FilterSpecification = [
  'all',
  ['==', ['get', 'class'], 'railway'],
  ['match', ['get', 'subclass'], ['station', 'halt', 'subway'], true, false],
  ['any', ['has', 'name'], ['has', 'name_en']],
]

// Screen colours are provisional approximations, not official LTA sRGB tokens.
export const mrtLineColors = {
  NS: '#D32F2F', EW: '#007D43', NE: '#84369A',
  CC: '#F3A817', DT: '#0565AF', TE: '#8B582D',
} as const
export type MrtLine = keyof typeof mrtLineColors
export type PilotStation = {
  id: string
  nameEn: string
  coordinates: [number, number]
  codes: ReadonlyArray<{ code: string; line: MrtLine }>
  status: 'operational'
  coordinateSource: string
  codeSource: string
  verifiedOn: string
}

// Approximate historical OneMap-derived station-address positions, not platform
// centroids or exits. Current service codes crosschecked with LTA/SMRT 2026-11-27.
const positions = 'https://github.com/xkjyeah/singapore-postal-codes/blob/master/mrt_stations.json'
const lta = 'https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html'
const smrt = 'https://journey.smrt.com.sg/journey/'
export const mrtPilotStations: ReadonlyArray<PilotStation> = [
  { id: 'downtown', nameEn: 'Downtown', coordinates: [103.8528404, 1.2794462],
    codes: [{ code: 'DT17', line: 'DT' }], status: 'operational',
    coordinateSource: positions, codeSource: lta, verifiedOn: '2026-11-27' },
  { id: 'bugis', nameEn: 'Bugis', coordinates: [103.8557064, 1.3004651],
    codes: [{ code: 'EW12', line: 'EW' }, { code: 'DT14', line: 'DT' }], status: 'operational',
    coordinateSource: positions, codeSource: lta, verifiedOn: '2026-11-27' },
  { id: 'orchard', nameEn: 'Orchard', coordinates: [103.8322453, 1.3039799],
    codes: [{ code: 'NS22', line: 'NS' }, { code: 'TE14', line: 'TE' }], status: 'operational',
    coordinateSource: positions, codeSource: lta, verifiedOn: '2026-11-27' },
  { id: 'marina-bay', nameEn: 'Marina Bay', coordinates: [103.8545978, 1.2764274],
    codes: [{ code: 'NS27', line: 'NS' }, { code: 'CC33', line: 'CC' }, { code: 'TE20', line: 'TE' }],
    status: 'operational', coordinateSource: positions, codeSource: smrt, verifiedOn: '2026-11-27' },
  { id: 'outram-park', nameEn: 'Outram Park', coordinates: [103.8395135, 1.2797397],
    codes: [{ code: 'EW16', line: 'EW' }, { code: 'NE3', line: 'NE' }, { code: 'TE17', line: 'TE' }],
    status: 'operational', coordinateSource: positions, codeSource: lta, verifiedOn: '2026-11-27' },
]
export const mrtPilotSourceId = 'sma-mrt-pilot'
export const mrtPilotContextLayerId = 'sma-mrt-context'
export const mrtPilotFullLayerId = 'sma-mrt-full'
export const mrtPilotContextMinZoom = 13.75
export const mrtPilotFullMinZoom = 15
export const isMrtPilotEnabled = (search: string): boolean =>
  new URLSearchParams(search).get('mrtPilot') === '1'

const escapeXml = (s: string): string => s.replace(/&/g, '&amp;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const luminance = (hex: string) => {
  const rgb = [1, 3, 5].map(i => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4
  })
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]
}
export const readableMrtCodeColor = (hex: string): '#FFFFFF' | '#000000' =>
  1.05 / (luminance(hex) + .05) >= (luminance(hex) + .05) / .05 ? '#FFFFFF' : '#000000'

export type MrtAppearance = 'day' | 'night'
export type MrtIconMode = 'context' | 'full'
export const mrtPilotImageId = (station: PilotStation, scheme: MrtAppearance, mode: MrtIconMode) =>
  `sma-mrt-${scheme}-${mode}-${station.id}`

// SVG is rasterized to a 3× image before adding it to MapLibre. One image for
// the complete station keeps all interchange codes together during collision.
export const makeMrtCapletSvg = (
  station: PilotStation, mode: MrtIconMode, scheme: MrtAppearance, tokens: ColorTokens,
): string => {
  let x = 3
  const parts: string[] = []
  for (const item of station.codes) {
    const colour = mrtLineColors[item.line]
    if (mode === 'full') {
      const width = 12 + item.code.length * 6.05
      parts.push(`<rect x="${x}" y="3" width="${width}" height="18" rx="4" fill="${colour}"/>`)
      parts.push(`<text x="${x + width / 2}" y="15.7" font-family="Arial,sans-serif" font-size="10.1" font-weight="700" text-anchor="middle" fill="${readableMrtCodeColor(colour)}">${escapeXml(item.code)}</text>`)
      x += width + 3
    } else {
      parts.push(`<rect x="${x}" y="5" width="4.6" height="14" rx="1.8" fill="${colour}"/>`)
      x += 6.5
    }
  }
  x += 3
  const totalWidth = Math.ceil(x + station.nameEn.length * (mode === 'full' ? 6.35 : 5.95) + 7)
  const foreground = tokens[scheme].typography.geographicSecondary
  const halo = tokens[scheme].typography.geographicHalo
  parts.push(`<text x="${x}" y="16.2" font-family="Arial,sans-serif" font-size="${mode === 'full' ? 11.25 : 10.7}" font-weight="500" stroke="${halo}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke" fill="${foreground}">${escapeXml(station.nameEn)}</text>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth * 3}" height="72" viewBox="0 0 ${totalWidth} 24">${parts.join('')}</svg>`
}
export const mrtPilotFeatureCollection = () => ({
  type: 'FeatureCollection' as const,
  features: mrtPilotStations.map(station => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: station.coordinates },
    properties: { id: station.id, name: station.nameEn, lineCount: station.codes.length },
  })),
})
// Keep v0.1 station names for all stations OUTSIDE the five-station pilot.
export const mrtPilotGenericLabelFilter: FilterSpecification = [
  'all',
  railStationLabelFilter,
  ['!', ['in', ['upcase', ['coalesce', ['get', 'name_en'], ['get', 'name'], '']],
    ['literal', mrtPilotStations.flatMap(s => [s.nameEn.toUpperCase(), `${s.nameEn.toUpperCase()} MRT STATION`])]]],
]

const loadSvg = (svg: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('MRT station SVG could not be loaded'))
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
})
export const applyMrtPilotAppearance = (map: MapLibreMap, scheme: MrtAppearance): void => {
  for (const [mode, layer] of [['context', mrtPilotContextLayerId], ['full', mrtPilotFullLayerId]] as const) {
    if (map.getLayer(layer)) map.setLayoutProperty(layer, 'icon-image', [
      'concat', `sma-mrt-${scheme}-${mode}-`, ['get', 'id'],
    ])
  }
}

export const installMrtPilot = async (map: MapLibreMap, tokens: ColorTokens, scheme: MrtAppearance) => {
  const images = await Promise.all(mrtPilotStations.flatMap(station =>
    (['day', 'night'] as const).flatMap(appearance =>
      (['context', 'full'] as const).map(async mode => ({
        id: mrtPilotImageId(station, appearance, mode),
        image: await loadSvg(makeMrtCapletSvg(station, mode, appearance, tokens)),
      })),
    ),
  ))
  for (const entry of images) if (!map.hasImage(entry.id)) {
    map.addImage(entry.id, entry.image, { pixelRatio: 3 })
  }
  if (map.getLayer('poi_transit')) map.setFilter('poi_transit', mrtPilotGenericLabelFilter)
  map.addSource(mrtPilotSourceId, { type: 'geojson', data: mrtPilotFeatureCollection() })
  // Added BEFORE architecture layers so pin symbols remain visually foreground.
  map.addLayer({
    id: mrtPilotContextLayerId, type: 'symbol', source: mrtPilotSourceId,
    minzoom: mrtPilotContextMinZoom, maxzoom: mrtPilotFullMinZoom,
    filter: ['>=', ['get', 'lineCount'], 2],
    layout: {
      'icon-image': ['concat', `sma-mrt-${scheme}-context-`, ['get', 'id']],
      'icon-anchor': 'bottom', 'icon-allow-overlap': false,
      'icon-ignore-placement': false,
    },
  })
  map.addLayer({
    id: mrtPilotFullLayerId, type: 'symbol', source: mrtPilotSourceId,
    minzoom: mrtPilotFullMinZoom,
    layout: {
      'icon-image': ['concat', `sma-mrt-${scheme}-full-`, ['get', 'id']],
      'icon-anchor': 'bottom', 'icon-allow-overlap': false,
      'icon-ignore-placement': false,
    },
  })
}
