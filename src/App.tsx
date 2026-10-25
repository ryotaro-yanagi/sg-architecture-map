import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowSquareOut, CaretDown, Check, Cloud, CloudRain, CloudSun, Crosshair, Lightning, MagnifyingGlass, NavigationArrow, Sun, X } from '@phosphor-icons/react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import data from './data/buildings.json'
import { getBuildingCopy, getLocaleFromPath, localeHref, translations } from './i18n'
import type { RefObject } from 'react'
import type { Locale, Translation } from './i18n'

type Coordinates = [number, number]
type WeatherState = { temperature: number | null; condition: string | null }
const weatherPortalUrl = 'https://www.weather.gov.sg/'
const weatherTemperatureUrl = 'https://api-open.data.gov.sg/v2/real-time/api/air-temperature'
const weatherForecastUrl = 'https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast'

type Building = {
  id: string
  name: string
  architects: string[]
  buildingType: string
  completionYear: number | null
  address: string
  coordinates: Coordinates
  coordinatePrecision: string
  coordinateSource: string
  officialSource: string
  photo: null
  publicAccess: string
}

type RestoredMapState = {
  savedAt: number
  center: Coordinates
  zoom: number
  bearing: number
  pitch: number
  selectedId: string | null
  expanded: boolean
}

const buildings = data.buildings as unknown as Building[]
const defaultCenter: Coordinates = [103.879, 1.315]
const defaultZoom = 11.35
const mapStateKey = 'sgm-language-map-state'

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const motionDuration = (duration: number) =>
  prefersReducedMotion() ? 0 : duration

// Preserve the user's camera when selecting a building. Only pan when the
// selected pin would overlap the visible UI or approach the viewport edge.
const revealBuilding = (map: MapLibreMap | null, coordinates: Coordinates) => {
  if (!map) return
  const canvas = map.getCanvas()
  const bounds = canvas.getBoundingClientRect()
  const point = map.project(coordinates)
  const pinHalfWidth = 22
  const pinHeight = 52
  const margin = 24
  const search = document.querySelector<HTMLElement>('.search-shell')
  const searchBounds = search?.getBoundingClientRect()
  const top = searchBounds && searchBounds.bottom > bounds.top && searchBounds.top < bounds.bottom
    ? searchBounds.bottom - bounds.top + margin
    : 24
  // Wider comfort zone: do not park a selected pin against the edge.
  const left = Math.max(pinHalfWidth + margin, bounds.width * 0.22)
  const right = Math.min(bounds.width - pinHalfWidth - margin, bounds.width * 0.78)
  let bottom = Math.min(bounds.height - margin, bounds.height * 0.76)
  const card = document.querySelector<HTMLElement>('.preview-card')
  const cardBounds = card?.getBoundingClientRect()
  // On desktop the card occupies only the lower-left portion of the map.
  if (cardBounds && point.x + bounds.left >= cardBounds.left - pinHalfWidth - margin
    && point.x + bounds.left <= cardBounds.right + pinHalfWidth + margin) {
    bottom = Math.min(bottom, cardBounds.top - bounds.top - margin)
  }
  const safeTop = Math.min(Math.max(top + pinHeight, bounds.height * 0.22), bottom)
  // If the pin falls outside the comfort zone, move it toward the usable
  // center, not merely to the nearest edge of the zone.
  const outside = point.x < left || point.x > right || point.y < safeTop || point.y > bottom
  if (!outside) return
  const targetX = bounds.width / 2
  const targetY = Math.max(safeTop, Math.min(bottom, (safeTop + bottom) / 2))
  const dx = point.x - targetX
  const dy = point.y - targetY
  const distance = Math.hypot(dx, dy)
  // The new center is the geographic point currently under the displaced
  // viewport center. This preserves zoom, bearing, and pitch.
  const center = map.unproject([bounds.width / 2 + dx, bounds.height / 2 + dy])
  if (prefersReducedMotion()) {
    map.jumpTo({ center })
    return
  }
  map.easeTo({
    center,
    duration: Math.min(1100, Math.max(520, distance * 1.5)),
    easing: t => t * t * (3 - 2 * t),
    essential: false,
  })
}

const getRequestedSelectedId = (): string | null => {
  const value = new URLSearchParams(window.location.search).get('selected')
  return value && buildings.some((building) => building.id === value) ? value : null
}

const getRequestedExpandedState = (): boolean | null => {
  const value = new URLSearchParams(window.location.search).get('sheet')
  if (value === 'expanded') return true
  if (value === 'compact') return false
  return null
}
type MapPalette = {
  background: string
  residential: string
  park: string
  wood: string
  grass: string
  water: string
  waterway: string
  roadMinor: string
  roadMajor: string
  roadMotorway: string
  roadCasing: string
  building: string
  buildingOutline: string
  label: string
  labelSecondary: string
  labelWater: string
  labelHalo: string
  poiOpacity: number
}

const productionMapPalette: MapPalette = {
  background: '#f0f1f0', residential: '#eceeec', park: '#dce9dd', wood: '#d3e4d5', grass: '#e6eee6',
  water: '#c8e4eb', waterway: '#83b8c4', roadMinor: '#ffffff', roadMajor: '#ffffff', roadMotorway: '#fafafa', roadCasing: '#cbd0cd',
  building: '#e3e5e4', buildingOutline: '#c8ccca', label: '#414744', labelSecondary: '#6b726e', labelWater: '#3f7885', labelHalo: '#ffffff', poiOpacity: .58,
}
const markerFill = '#35946b'
const markerStroke = '#242424'
const markerOutline = '#ffffff'
const markerPixelRatio = 3
const markerSwitchZoom = 14.5
const markerIcon = '#ffffff'
const phosphorBuildingFillPath = 'M232,224H208V32h8a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16h8V224H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM88,56h24a8,8,0,0,1,0,16H88a8,8,0,0,1,0-16Zm0,40h24a8,8,0,0,1,0,16H88a8,8,0,0,1,0-16Zm-8,48a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H88A8,8,0,0,1,80,144Zm72,80H104V184h48Zm16-72H144a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16Zm0-40H144a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16Zm0-40H144a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16Z'
const createBuildingPinSvg = (width: number, height: number, strokeWidth: number, iconSize: number) => {
  const cx = width / 2
  const iconX = (width - iconSize) / 2
  const iconY = width <= 24 ? 5 : 9
  const path = [
    `M ${cx} ${height - strokeWidth / 2}`,
    `C ${cx - width * .08} ${height * .89}, ${width * .12} ${height * .67}, ${width * .12} ${height * .42}`,
    `C ${width * .12} ${height * .18}, ${width * .29} ${strokeWidth}, ${cx} ${strokeWidth}`,
    `C ${width * .71} ${strokeWidth}, ${width * .88} ${height * .18}, ${width * .88} ${height * .42}`,
    `C ${width * .88} ${height * .67}, ${cx + width * .08} ${height * .89}, ${cx} ${height - strokeWidth / 2} Z`,
  ].join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * markerPixelRatio}" height="${height * markerPixelRatio}" viewBox="0 0 ${width} ${height}">
    <path d="${path}" fill="${markerFill}" stroke="${markerOutline}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
    <svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 256 256" fill="${markerIcon}"><path d="${phosphorBuildingFillPath}"/></svg>
  </svg>`
}
const loadSvgMarker = (svg: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('Failed to load marker SVG'))
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
})
const legacyComparisonParams = ['ui', 'font', 'visual', 'map', 'scale', 'preset', 'lab', 'shape', 'weight', 'pin', 'surface', 'spacing', 'identity', 'mapMode', 'color', 'mapColor']

const mapThemeDiagnosticsKey = 'sgm-map-theme-diagnostics'

const recordMapThemeDiagnostic = (entry: string) => {
  try {
    const current = JSON.parse(window.sessionStorage.getItem(mapThemeDiagnosticsKey) ?? '[]') as string[]
    window.sessionStorage.setItem(mapThemeDiagnosticsKey, JSON.stringify([...current.slice(-19), entry]))
  } catch {
    // Diagnostics must never affect map rendering.
  }
}

const setPaint = (map: MapLibreMap, layerId: string, property: string, value: unknown) => {
  if (!map.getLayer(layerId)) return
  try {
    map.setPaintProperty(layerId, property as never, value as never)
  } catch (error) {
    recordMapThemeDiagnostic(`paint:${layerId}:${property}:${error instanceof Error ? error.message : String(error)}`)
  }
}

const setLayout = (map: MapLibreMap, layerId: string, property: string, value: unknown) => {
  if (!map.getLayer(layerId)) return
  try {
    map.setLayoutProperty(layerId, property as never, value as never)
  } catch (error) {
    recordMapThemeDiagnostic(`layout:${layerId}:${property}:${error instanceof Error ? error.message : String(error)}`)
  }
}

const setZoomRange = (map: MapLibreMap, layerId: string, minzoom: number, maxzoom: number) => {
  if (!map.getLayer(layerId)) return
  try {
    map.setLayerZoomRange(layerId, minzoom, maxzoom)
  } catch (error) {
    recordMapThemeDiagnostic(`zoom:${layerId}:${error instanceof Error ? error.message : String(error)}`)
  }
}

const applyMapPalette = (map: MapLibreMap, palette: MapPalette) => {
  setPaint(map, 'background', 'background-color', palette.background)
  setPaint(map, 'landuse_residential', 'fill-color', palette.residential)
  setPaint(map, 'park', 'fill-color', palette.park)
  setPaint(map, 'park_outline', 'line-color', palette.park)
  setPaint(map, 'landcover_wood', 'fill-color', palette.wood)
  setPaint(map, 'landcover_grass', 'fill-color', palette.grass)
  ;['landuse_pitch', 'landuse_track', 'landuse_cemetery', 'landuse_hospital', 'landuse_school'].forEach((id) => setPaint(map, id, 'fill-color', palette.grass))
  setPaint(map, 'water', 'fill-color', palette.water)
  ;['waterway_tunnel', 'waterway_river', 'waterway_other'].forEach((id) => setPaint(map, id, 'line-color', palette.waterway))
  // Liberty's 2D buildings otherwise stop at z14 when 3D buildings begin.
  setZoomRange(map, 'building', 13, 24)
  setPaint(map, 'building', 'fill-color', palette.building)
  setPaint(map, 'building', 'fill-outline-color', palette.building)
  setLayout(map, 'building-3d', 'visibility', 'none')

  // Keep line-based water labels subordinate to district names.
  setLayout(map, 'waterway_line_label', 'text-size', 12)
  setLayout(map, 'water_name_line_label', 'text-size', 13)

  // Let district names lead until the viewer zooms closer to street level.
  setZoomRange(map, 'highway-name-minor', 15.5, 24)

  const layers = map.getStyle().layers ?? []
  layers.forEach((layer) => {
    const id = layer.id
    if (layer.type === 'line' && /^(road|bridge|tunnel)_.*_casing$/.test(id)) {
      setLayout(map, id, 'visibility', 'none')
      return
    }
    // Navigation-only symbols are not needed on an architecture discovery map.
    if (layer.type === 'symbol' && (
      id === 'road_one_way_arrow' ||
      id === 'road_one_way_arrow_opposite' ||
      id === 'highway-shield-non-us' ||
      id === 'highway-shield-us-interstate' ||
      id === 'road_shield_us'
    )) {
      setLayout(map, id, 'visibility', 'none')
      return
    }
    if (layer.type === 'symbol' && id.startsWith('poi_')) {
      setLayout(map, id, 'visibility', 'none')
      return
    }
    if (layer.type === 'line' && /^(road|bridge|tunnel)_/.test(id)) {
      const color = id.includes('casing')
        ? palette.roadCasing
        : /(motorway|trunk_primary)/.test(id)
          ? palette.roadMotorway
          : /(secondary_tertiary|motorway_link|road_link)/.test(id)
            ? palette.roadMajor
            : palette.roadMinor
      setPaint(map, id, 'line-color', color)
    }

    if (layer.type !== 'symbol' || id === 'building-labels') return
    const isWater = id.startsWith('water')
    const isPoi = id.startsWith('poi_')
    const isSecondary = isPoi || /^(airport|railway|highway-name)/.test(id)
    if (isWater || isSecondary || id.startsWith('label_')) {
      setPaint(map, id, 'text-color', isWater ? palette.labelWater : isSecondary ? palette.labelSecondary : palette.label)
      setPaint(map, id, 'text-halo-color', palette.labelHalo)
      setPaint(map, id, 'text-halo-width', 1.25)
      if (isPoi) setPaint(map, id, 'text-opacity', palette.poiOpacity)
    }
  })
}

const applyProductionMapTheme = (map: MapLibreMap) => {
  applyMapPalette(map, productionMapPalette)
  if (!map.getLayer('building-labels')) return
  map.setPaintProperty('building-labels', 'text-color', markerStroke)
  map.setPaintProperty('building-labels', 'text-halo-color', productionMapPalette.labelHalo)
}

const applyProductionTypeScaleToMap = (map: MapLibreMap, locale: Locale) => {
  if (!map.getLayer('building-labels')) return
  map.setLayoutProperty('building-labels', 'text-size', locale === 'en' ? 16 : 12)
  map.setLayoutProperty('building-labels', 'text-offset', locale === 'en' ? [0, 1.25] : [0, 1.45])
}

const readRestoredMapState = (): RestoredMapState | null => {
  try {
    const raw = window.sessionStorage.getItem(mapStateKey)
    window.sessionStorage.removeItem(mapStateKey)
    if (!raw) return null
    const state = JSON.parse(raw) as RestoredMapState
    if (Date.now() - state.savedAt > 5 * 60 * 1000 || !Array.isArray(state.center)) return null
    return state
  } catch {
    return null
  }
}

const featureCollection = (selectedId: string | null, locale: Locale): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: buildings.map((building) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: building.coordinates },
    properties: {
      id: building.id,
      name: getBuildingCopy(locale, building.id, building.name).name,
      selected: building.id === selectedId,
    },
  })),
})

const BrandMark = () => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter"><path d="M7 7h10v10H7z"/><circle cx="17" cy="7" r="2.25" fill="currentColor" stroke="none"/><path d="M4 20h16"/></svg>

function App() {
  const locale = useMemo(getLocaleFromPath, [])
  const t = translations[locale]
  const restoredState = useMemo(readRestoredMapState, [])
  const requestedSelectedId = useMemo(getRequestedSelectedId, [])
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null)
  const detailBackRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(requestedSelectedId ?? restoredState?.selectedId ?? null)
  const [expanded, setExpanded] = useState(getRequestedExpandedState() ?? restoredState?.expanded ?? false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [weather, setWeather] = useState<WeatherState>({ temperature: null, condition: null })

  const selected = buildings.find((building) => building.id === selectedId) ?? null
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    if (!normalized) return buildings
    return buildings.filter((building) => {
      const copy = getBuildingCopy(locale, building.id, building.name)
      return `${copy.name} ${copy.architectCredit} ${building.architects.join(' ')}`.toLocaleLowerCase(locale).includes(normalized)
    })
  }, [locale, query])

  useEffect(() => {
    let cancelled = false
    const loadWeather = async () => {
      try {
        const [temperatureResponse, forecastResponse] = await Promise.all([
          fetch(weatherTemperatureUrl),
          fetch(weatherForecastUrl),
        ])
        if (!temperatureResponse.ok || !forecastResponse.ok) throw new Error('Weather request failed')
        const temperatureJson = await temperatureResponse.json()
        const forecastJson = await forecastResponse.json()
        const temperatureReadings = temperatureJson?.data?.readings?.[0]?.data ?? temperatureJson?.data?.readings ?? []
        const values = Array.isArray(temperatureReadings)
          ? temperatureReadings.map((reading: { value?: number }) => Number(reading?.value)).filter((value: number) => Number.isFinite(value)).sort((x: number, y: number) => x - y)
          : []
        const median = values.length
          ? values.length % 2
            ? values[Math.floor(values.length / 2)]
            : (values[values.length / 2 - 1] + values[values.length / 2]) / 2
          : null
        const forecastRecord = forecastJson?.data?.records?.[0] ?? forecastJson?.data?.items?.[0] ?? forecastJson?.data
        const condition = forecastRecord?.general?.forecast ?? forecastRecord?.general?.condition ?? forecastRecord?.forecast ?? null
        if (!cancelled) setWeather({ temperature: median === null ? null : Math.round(median), condition })
      } catch {
        if (!cancelled) setWeather({ temperature: null, condition: null })
      }
    }
    loadWeather()
    const timer = window.setInterval(loadWeather, 5 * 60 * 1000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = 'ltr'
    const url = new URL(window.location.href)
    legacyComparisonParams.forEach((param) => url.searchParams.delete(param))
    window.history.replaceState({}, '', url)
  }, [locale])

  useEffect(() => {
    if (expanded) {
      detailBackRef.current?.closest('.sheet-expanded')?.scrollTo({ top: 0 })
      detailBackRef.current?.focus({ preventScroll: true })
    }
  }, [expanded, selectedId])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: restoredState?.center ?? defaultCenter,
      zoom: restoredState?.zoom ?? defaultZoom,
      bearing: restoredState?.bearing ?? 0,
      pitch: 0,
      minPitch: 0,
      maxPitch: 0,
      touchPitch: false,
      pitchWithRotate: false,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: false,
      locale: t.mapControls,
    })

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    try { window.sessionStorage.removeItem(mapThemeDiagnosticsKey) } catch {}
    map.on('error', (event) => {
      const error = event.error
      recordMapThemeDiagnostic(`map:${error instanceof Error ? error.message : String(error ?? 'unknown error')}`)
    })

    map.on('load', async () => {
      const [normalPin, selectedPin] = await Promise.all([
        loadSvgMarker(createBuildingPinSvg(24, 29, 1.5, 11)),
        loadSvgMarker(createBuildingPinSvg(44, 52, 2, 20)),
      ])
      map.addImage('building-pin-normal', normalPin, { pixelRatio: markerPixelRatio })
      map.addImage('building-pin-selected', selectedPin, { pixelRatio: markerPixelRatio })
      map.addSource('buildings', { type: 'geojson', data: featureCollection(selectedId, locale) })
      map.addLayer({
        id: 'building-hit-targets', type: 'circle', source: 'buildings',
        layout: { 'circle-sort-key': ['case', ['get', 'selected'], 1, 0] },
        paint: { 'circle-radius': 22, 'circle-opacity': 0 },
      })
      map.addLayer({
        id: 'building-dots', type: 'circle', source: 'buildings', maxzoom: markerSwitchZoom,
        filter: ['==', ['get', 'selected'], false],
        paint: {
          'circle-radius': 4,
          'circle-color': markerFill,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-opacity': 1,
        },
      })
      map.addLayer({
        id: 'building-pins', type: 'symbol', source: 'buildings', minzoom: markerSwitchZoom,
        filter: ['==', ['get', 'selected'], false],
        layout: { 'icon-image': 'building-pin-normal', 'icon-anchor': 'bottom', 'icon-overlap': 'always', 'icon-ignore-placement': true },
        paint: { 'icon-opacity': 1 },
      })
      map.addLayer({
        id: 'building-pin-selected', type: 'symbol', source: 'buildings',
        filter: ['==', ['get', 'selected'], true],
        layout: { 'icon-image': 'building-pin-selected', 'icon-anchor': 'bottom', 'icon-overlap': 'always', 'icon-ignore-placement': true },
        paint: { 'icon-opacity': 0 },
      })
      map.addLayer({
        id: 'building-labels', type: 'symbol', source: 'buildings', minzoom: 13.2,
        layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.45], 'text-anchor': 'top', 'text-variable-anchor': ['top', 'bottom', 'left', 'right'], 'text-radial-offset': 0.75 },
        paint: { 'text-color': '#282724', 'text-halo-color': '#f8f4ec', 'text-halo-width': 2 },
      })
      applyProductionMapTheme(map)
      applyProductionTypeScaleToMap(map, locale)
      const deepLinkedBuilding = buildings.find((building) => building.id === requestedSelectedId)
      if (deepLinkedBuilding && !restoredState) {
        window.requestAnimationFrame(() => revealBuilding(map, deepLinkedBuilding.coordinates))
      }

      map.on('click', (event) => {
        const nearest = buildings
          .map((building) => {
            const point = map.project(building.coordinates)
            return { building, distance: Math.hypot(point.x - event.point.x, point.y - event.point.y) }
          })
          .filter(({ distance }) => distance <= 22)
          .sort((a, b) => a.distance - b.distance)[0]?.building
        if (nearest) {
          setSelectedId(nearest.id)
          setExpanded(false)
          setSearchOpen(false)
          window.requestAnimationFrame(() => revealBuilding(map, nearest.coordinates))
        } else {
          setSelectedId(null)
          setExpanded(false)
          setSearchOpen(false)
        }
      })
      map.on('mouseenter', 'building-hit-targets', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'building-hit-targets', () => { map.getCanvas().style.cursor = '' })
    })

    mapRef.current = map
    return () => {
      userMarkerRef.current?.remove()
      selectedMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [locale, restoredState])

  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource('buildings') as GeoJSONSource | undefined
    source?.setData(featureCollection(selectedId, locale))

    selectedMarkerRef.current?.remove()
    selectedMarkerRef.current = null
    const building = buildings.find(item => item.id === selectedId)
    if (!map || !building) return

    // Animate the two visual priorities independently. The normal map symbol
    // is filtered out on selection, so this temporary copy fades out in its
    // place while the selected pin responds immediately.
    const element = document.createElement('div')
    element.style.width = '44px'
    element.style.height = '52px'
    element.style.pointerEvents = 'none'
    element.style.zIndex = '20'
    element.style.isolation = 'isolate'
    const createImage = (svg: string, width: number, height: number, zIndex: number) => {
      // Render our own generated SVG inline: no asynchronous <img> decoding
      // between adding the marker and starting its opacity animation.
      const image = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement as unknown as SVGSVGElement
      image.setAttribute('width', String(width))
      image.setAttribute('height', String(height))
      image.setAttribute('aria-hidden', 'true')
      image.style.position = 'absolute'
      image.style.bottom = '0'
      image.style.left = `${(44 - width) / 2}px`
      image.style.display = 'block'
      image.style.zIndex = String(zIndex)
      return image
    }
    const normal = map.getZoom() >= markerSwitchZoom
      ? createImage(createBuildingPinSvg(24, 29, 1.5, 11), 24, 29, 1)
      : document.createElement('span')
    if (normal instanceof HTMLSpanElement) {
      normal.style.position = 'absolute'
      normal.style.width = '8px'
      normal.style.height = '8px'
      normal.style.left = '18px'
      normal.style.bottom = '0'
      normal.style.border = '1px solid #ffffff'
      normal.style.borderRadius = '50%'
      normal.style.background = markerFill
      normal.style.boxSizing = 'border-box'
      normal.style.zIndex = '1'
    }
    const selected = createImage(createBuildingPinSvg(44, 52, 2, 20), 44, 52, 2)
    element.append(normal, selected)
    const marker = new maplibregl.Marker({ element, anchor: 'bottom' })
      .setLngLat(building.coordinates)
      .addTo(map)
    selectedMarkerRef.current = marker

    if (prefersReducedMotion()) {
      normal.style.opacity = '0'
      selected.style.opacity = '1'
    } else {
      normal.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 300, easing: 'ease-out', fill: 'forwards',
      })
      selected.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 100, easing: 'ease-out', fill: 'forwards',
      })
    }
    return () => {
      marker.remove()
      if (selectedMarkerRef.current === marker) selectedMarkerRef.current = null
    }
  }, [locale, selectedId])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedId) url.searchParams.set('selected', selectedId)
    else url.searchParams.delete('selected')
    url.searchParams.set('sheet', expanded ? 'expanded' : 'compact')
    window.history.replaceState({}, '', url)
  }, [expanded, selectedId])

  useEffect(() => {
    const closeLayer = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (searchOpen) {
        setSearchOpen(false)
        searchInputRef.current?.focus()
      } else if (expanded) {
        setExpanded(false)
      }
    }
    window.addEventListener('keydown', closeLayer)
    return () => window.removeEventListener('keydown', closeLayer)
  }, [expanded, searchOpen])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const chooseBuilding = (building: Building, focusMap = false) => {
    setSelectedId(building.id)
    setExpanded(false)
    setSearchOpen(false)
    if (focusMap) window.requestAnimationFrame(() => revealBuilding(mapRef.current, building.coordinates))
  }

  const goHome = () => {
    setSelectedId(null)
    setExpanded(false)
    setSearchOpen(false)
    mapRef.current?.flyTo({ center: defaultCenter, zoom: defaultZoom, bearing: 0, pitch: 0, duration: motionDuration(700) })
  }

  const switchLanguage = () => {
    const map = mapRef.current
    if (!map) return
    const center = map.getCenter()
    const state: RestoredMapState = {
      savedAt: Date.now(), center: [center.lng, center.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), selectedId, expanded,
    }
    window.sessionStorage.setItem(mapStateKey, JSON.stringify(state))
  }

  const locate = () => {
    if (!navigator.geolocation) {
      setNotice(t.locationUnsupported)
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location: Coordinates = [coords.longitude, coords.latitude]
        userMarkerRef.current?.remove()
        const element = document.createElement('div')
        element.className = 'user-location-marker'
        element.setAttribute('aria-label', t.currentLocation)
        userMarkerRef.current = new maplibregl.Marker({ element }).setLngLat(location).addTo(mapRef.current!)
        const wide = window.matchMedia('(min-width: 720px)').matches
        mapRef.current?.flyTo({ center: location, zoom: Math.max(mapRef.current.getZoom(), 14), offset: wide ? [210, 0] : [0, -76], duration: motionDuration(700) })
        setLocating(false)
        setNotice(t.locationSuccess)
      },
      () => { setLocating(false); setNotice(t.locationFailure) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <main className={`app locale-${locale} ${expanded ? 'details-expanded' : ''}`}>
      <div ref={mapContainer} className="map" role="region" aria-label={t.mapLabel} />

      <header className="topbar">
        <button className="brand" type="button" onClick={goHome} aria-label={t.resetMap}>
          <span className="brand-mark"><BrandMark /></span>
        </button>
        <div className="top-controls">
          <a className="weather-chip" href={weatherPortalUrl} target="_blank" rel="noreferrer" aria-label={weather.condition ? `${weather.condition}${weather.temperature === null ? '' : `, ${weather.temperature} degrees Celsius`}` : 'Singapore weather'}>
            <WeatherGlyph condition={weather.condition} />
            {weather.temperature !== null && <span>{weather.temperature}°</span>}
          </a>
          <div className="language-menu">
            <button type="button" className="language-trigger" aria-label={t.languageSwitcher} aria-haspopup="menu" aria-expanded={languageOpen} onClick={() => setLanguageOpen((open) => !open)}>
              <span>{locale.toUpperCase()}</span>
              <CaretDown aria-hidden="true" size={16} weight="regular" />
            </button>
            {languageOpen && (
              <nav className="language-popover" aria-label={t.languageSwitcher}>
                <a href={localeHref('en', { selected: selectedId ?? '', sheet: expanded ? 'expanded' : 'compact' })} hrefLang="en" aria-current={locale === 'en' ? 'page' : undefined} onClick={switchLanguage}>
                  <span>EN</span>{locale === 'en' && <Check aria-hidden="true" size={16} weight="bold" />}
                </a>
                <a href={localeHref('ja', { selected: selectedId ?? '', sheet: expanded ? 'expanded' : 'compact' })} hrefLang="ja" aria-current={locale === 'ja' ? 'page' : undefined} onClick={switchLanguage}>
                  <span>JP</span>{locale === 'ja' && <Check aria-hidden="true" size={16} weight="bold" />}
                </a>
              </nav>
            )}
          </div>
        </div>
      </header>

      <search className={`search-shell ${searchOpen ? 'open' : ''}`}>
        <div className="search-input-wrap">
          <MagnifyingGlass aria-hidden="true" size={20} weight="regular" />
          <input ref={searchInputRef} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)} aria-label={t.searchLabel} aria-expanded={searchOpen} aria-controls="search-results" autoComplete="off" placeholder={t.searchPlaceholder} />
          {searchOpen && <button className="icon-button small" onClick={() => { setSearchOpen(false); setQuery('') }} aria-label={t.closeSearch}><X aria-hidden="true" size={16} weight="regular" /></button>}
        </div>
        {searchOpen && (
          <div className="search-results" id="search-results" aria-label={t.searchResults}>
            <p className="result-count" aria-live="polite">{results.length ? t.resultCount(results.length) : t.noResults}</p>
            {results.map((building) => {
              const copy = getBuildingCopy(locale, building.id, building.name)
              return (
                <button key={building.id} className={building.id === selectedId ? 'selected' : ''} aria-current={building.id === selectedId ? 'true' : undefined} onClick={() => chooseBuilding(building, true)}>
                  <span><strong>{copy.name}</strong><small>{copy.architectCredit}</small></span>
                  <ArrowRight aria-hidden="true" size={20} weight="regular" />
                </button>
              )
            })}
          </div>
        )}
      </search>

      <div className="map-tools">
        <button className={`locate-button ${locating ? 'loading' : ''}`} onClick={locate} disabled={locating} aria-label={locating ? t.locating : t.locate}>
          <Crosshair aria-hidden="true" size={20} weight="regular" />
        </button>
      </div>
      <div className="data-note">{t.dataNote(buildings.length)}</div>

      {selected && (
        <aside className={`place-sheet ${expanded ? 'expanded' : 'compact'}`} aria-label={expanded ? t.detailLabel(getBuildingCopy(locale, selected.id, selected.name).name) : t.previewLabel(getBuildingCopy(locale, selected.id, selected.name).name)}>
          <div className="sheet-compact" aria-hidden={expanded}>
            <PreviewCard building={selected} locale={locale} t={t} onDetails={() => setExpanded(true)} onClose={() => setSelectedId(null)} />
          </div>
          <div className="sheet-expanded" aria-hidden={!expanded}>
            <DetailContent building={selected} locale={locale} t={t} onClose={() => setExpanded(false)} backRef={detailBackRef} />
          </div>
        </aside>
      )}

      {notice && <div className="notice" role="status">{notice}</div>}
    </main>
  )
}

function WeatherGlyph({ condition }: { condition: string | null }) {
  const normalized = condition?.toLowerCase() ?? ''
  if (/thunder|lightning/.test(normalized)) return <Lightning aria-hidden="true" size={20} weight="regular" />
  if (/shower|rain/.test(normalized)) return <CloudRain aria-hidden="true" size={20} weight="regular" />
  if (/cloud|overcast/.test(normalized)) return <Cloud aria-hidden="true" size={20} weight="regular" />
  if (/partly|fair/.test(normalized)) return <CloudSun aria-hidden="true" size={20} weight="regular" />
  return <Sun aria-hidden="true" size={20} weight="regular" />
}

type LocalizedProps = { building: Building; locale: Locale; t: Translation }

function PreviewCard({ building, locale, t, onDetails, onClose }: LocalizedProps & { onDetails: () => void; onClose: () => void }) {
  const copy = getBuildingCopy(locale, building.id, building.name)
  return (
    <section className="preview-card" aria-label={t.previewLabel(copy.name)}>
      <button className="icon-button close-preview" onClick={onClose} aria-label={t.clearSelection}><X aria-hidden="true" size={20} weight="regular" /></button>
      <div className="preview-meta">
        <p className="eyebrow">{t.types[building.buildingType]}</p>
        <span className="record-index">SGM / {String(buildings.indexOf(building) + 1).padStart(2, '0')}</span>
      </div>
      <h1>{copy.name}</h1>
      <p className="architects">
        <span>{copy.architectCredit}</span>
        {building.completionYear && <span className="preview-year">{building.completionYear}</span>}
      </p>
      <button className="preview-details" onClick={onDetails}>
        <span>{t.viewDetails}</span>
        <ArrowRight aria-hidden="true" size={20} weight="regular" />
      </button>
    </section>
  )
}

function DetailContent({ building, locale, t, onClose, backRef }: LocalizedProps & { onClose: () => void; backRef: RefObject<HTMLButtonElement | null> }) {
  const copy = getBuildingCopy(locale, building.id, building.name)
  const mapsQuery = encodeURIComponent(`${building.coordinates[1]},${building.coordinates[0]}`)
  const searchQuery = encodeURIComponent(`${copy.name} Singapore architecture`)
  return (
    <div className="detail-content">
      <div className="detail-heading">
        <button ref={backRef} className="back-button" onClick={onClose}>
          <ArrowLeft aria-hidden="true" size={16} weight="regular" />
          {t.backToMap}
        </button>
        <span className="record-index">SGM / {String(buildings.indexOf(building) + 1).padStart(2, '0')}</span>
      </div>

      <header className="detail-intro">
        <p className="eyebrow">{t.types[building.buildingType]}</p>
        <h1>{copy.name}</h1>
        <p className="detail-architects">{copy.architectCredit}</p>
        <p className="detail-year">{building.completionYear ?? t.unverified}</p>
      </header>

      <section className="detail-location" aria-label={t.address}>
        <p>{building.address}</p>
        <small>{t.verificationNote}</small>
      </section>

      <nav className="actions" aria-label={locale === 'ja' ? '建築を調べる' : 'Explore this building'}>
        <a className="map-action" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noreferrer">
          <span>Google Maps</span>
          <NavigationArrow aria-hidden="true" size={20} weight="regular" />
        </a>
        <a href={`https://www.google.com/search?q=${searchQuery}`} target="_blank" rel="noreferrer">
          <span>{t.googleSearch}</span>
          <ArrowSquareOut aria-hidden="true" size={20} weight="regular" />
        </a>
        <a href={`https://www.google.com/search?tbm=isch&q=${searchQuery}`} target="_blank" rel="noreferrer">
          <span>{t.imageSearch}</span>
          <ArrowSquareOut aria-hidden="true" size={20} weight="regular" />
        </a>
      </nav>

      <div className="sources">
        <p>{t.sources}</p>
        <a href={building.officialSource} target="_blank" rel="noreferrer">{t.officialProject} <ArrowSquareOut aria-hidden="true" size={16} weight="regular" /></a>
        <a href={building.coordinateSource} target="_blank" rel="noreferrer">{t.coordinateSource} <ArrowSquareOut aria-hidden="true" size={16} weight="regular" /></a>
      </div>
    </div>
  )
}

export default App
