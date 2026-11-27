import type { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl'
import data from './data/mrtStations2026.json'
import type { ColorTokens } from './colorTokens'
import { makeMrtCapletSvg } from './mrtPilot'
import type { PilotStation, MrtAppearance, MrtIconMode } from './mrtPilot'

// The v0.3 preview renders the same approved caplets as v0.2, now for the
// complete snapshot of 146 operational MRT stations. It remains opt-in.
// Station codes, geographic proxy points and provenance live in one JSON file.
export const networkSourceId = 'sma-mrt-network'
export const networkContextLayerId = 'sma-mrt-network-context'
export const networkFullLayerId = 'sma-mrt-network-full'
export const networkContextMinZoom = 13.75
export const networkFullMinZoom = 15

export const isMrtNetworkEnabled = (search: string): boolean =>
  new URLSearchParams(search).get('mrtNetwork') === '1'

const stations: ReadonlyArray<PilotStation> = data.stations.map(station => ({
  id: station.id,
  nameEn: station.nameEn,
  coordinates: station.coordinates as [number, number],
  codes: station.codes as PilotStation['codes'],
  status: 'operational',
  coordinateSource: station.coordMethod,
  codeSource: data.metadata.primarySource,
  verifiedOn: data.metadata.snapshotDate,
}))

const stationsById = new Map(stations.map(station => [station.id, station]))

// Exclude the full MRT inventory from Liberty railway POI labels to avoid
// two names at one location. All other railway POIs (e.g. LRT) remain eligible.
const stationNameVariants = stations.flatMap(station => [
  station.nameEn.toUpperCase(),
  `${station.nameEn.toUpperCase()} MRT STATION`,
  `${station.nameEn.toUpperCase()} STATION`,
])
export const mrtNetworkFallbackFilter: FilterSpecification = [
  'all',
  ['==', ['get', 'class'], 'railway'],
  ['match', ['get', 'subclass'], ['station', 'halt', 'subway'], true, false],
  ['any', ['has', 'name'], ['has', 'name_en']],
  ['!', ['in',
    ['upcase', ['coalesce', ['get', 'name_en'], ['get', 'name'], '']],
    ['literal', stationNameVariants],
  ]],
]

const featureCollection = {
  type: 'FeatureCollection' as const,
  features: stations.map(station => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: station.coordinates },
    properties: {
      id: station.id,
      name: station.nameEn,
      lineCount: station.codes.length,
    },
  })),
}

// SVG caplets are decoded on demand using MapLibre v6's missing-image resolver,
// rather than eagerly decoding 146 stations × 2 zoom levels × Day/Night.
// This preserves v0.2's appearance and reduces initial map-load work.
const imagePrefix = 'sma-network-'
const imageKey = (scheme: MrtAppearance, mode: MrtIconMode, id: string) =>
  `${imagePrefix}${scheme}-${mode}-${id}`

const appearanceExpression = (scheme: MrtAppearance, mode: MrtIconMode): ['concat', string, ['get', 'id']] =>
  ['concat', `${imagePrefix}${scheme}-${mode}-`, ['get', 'id']]

export const applyMrtNetworkAppearance = (map: MapLibreMap, scheme: MrtAppearance): void => {
  if (map.getLayer(networkContextLayerId)) {
    map.setLayoutProperty(networkContextLayerId, 'icon-image', appearanceExpression(scheme, 'context'))
  }
  if (map.getLayer(networkFullLayerId)) {
    map.setLayoutProperty(networkFullLayerId, 'icon-image', appearanceExpression(scheme, 'full'))
  }
}

// Returns cleanup for pending decode work and the missing-image resolver.
// The map's sources and layers are subsequently removed by map.remove().
export const installMrtNetwork = (map: MapLibreMap, tokens: ColorTokens, scheme: MrtAppearance): (() => void) => {
  const pending = new Map<string, Promise<void>>()
  let disposed = false

  // MapLibre GL JS v6 requires setMissingStyleImageResolver. The former
  // styleimagemissing event only reports unresolved images in v6.
  const resolveMissingImage = (id: string): Promise<void> | void => {
    if (disposed) return
    const match = /^sma-network-(day|night)-(context|full)-([a-z0-9-]+)$/.exec(id)
    if (!match) return
    const station = stationsById.get(match[3])
    if (!station || (match[2] === 'context' && station.codes.length < 2)) return
    const appearance = match[1] as MrtAppearance
    const mode = match[2] as MrtIconMode
    if (id !== imageKey(appearance, mode, station.id) || map.hasImage(id)) return
    const existing = pending.get(id)
    if (existing) return existing

    const task = new Promise<void>(resolve => {
      const image = new Image()
      image.onload = () => {
        if (!disposed) {
          try {
            if (!map.hasImage(id)) map.addImage(id, image, { pixelRatio: 3 })
          } catch (error) {
            console.warn('MRT station caplet image could not be installed:', error)
          }
        }
        pending.delete(id)
        resolve()
      }
      image.onerror = () => {
        pending.delete(id)
        console.warn('MRT station caplet image failed to decode:', station.id)
        resolve()
      }
      const svg = makeMrtCapletSvg(station, mode, appearance, tokens)
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })
    pending.set(id, task)
    return task
  }

  map.setMissingStyleImageResolver(resolveMissingImage)
  if (map.getLayer('poi_transit')) map.setFilter('poi_transit', mrtNetworkFallbackFilter)
  map.addSource(networkSourceId, { type: 'geojson', data: featureCollection })
  // Architecture layers are inserted later in App.tsx and retain their priority.
  map.addLayer({
    id: networkContextLayerId,
    type: 'symbol',
    source: networkSourceId,
    minzoom: networkContextMinZoom,
    maxzoom: networkFullMinZoom,
    filter: ['>=', ['get', 'lineCount'], 2],
    layout: {
      'icon-image': appearanceExpression(scheme, 'context'),
      'icon-anchor': 'bottom',
      'icon-allow-overlap': false,
      'icon-ignore-placement': false,
    },
  })
  map.addLayer({
    id: networkFullLayerId,
    type: 'symbol',
    source: networkSourceId,
    minzoom: networkFullMinZoom,
    layout: {
      'icon-image': appearanceExpression(scheme, 'full'),
      'icon-anchor': 'bottom',
      'icon-allow-overlap': false,
      'icon-ignore-placement': false,
    },
  })
  return () => {
    disposed = true
    map.setMissingStyleImageResolver(() => {})
    pending.clear()
  }
}
