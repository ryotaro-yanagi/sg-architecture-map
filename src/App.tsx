import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowSquareOut, CaretDown, Check, Cloud, CloudRain, CloudSun, Compass, Crosshair, Lightning, MagnifyingGlass, NavigationArrow, Sun, X } from '@phosphor-icons/react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import data from './data/buildings.json'
import { getBuildingCopy, getLocaleFromPath, localeHref, translations } from './i18n'
import type { ErrorInfo, ReactNode, RefObject } from 'react'
import type { Locale, Translation } from './i18n'
import { parseWeatherPayloads } from './weather'
import type { WeatherState } from './weather'

type Coordinates = [number, number]
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

// The detailed database types remain unchanged; map symbols use six visual groups.
const mapCategoryByType = {
  civic_cultural: 'culture_civic',
  community: 'culture_civic',
  sports: 'culture_civic',
  mixed_use: 'mixed_use',
  retail: 'commercial',
  office: 'commercial',
  education: 'education',
  hospitality: 'hospitality',
  residential: 'residential',
} as const

type MapCategory = typeof mapCategoryByType[keyof typeof mapCategoryByType]

const mapCategoryStyle: Record<MapCategory, { color: string; icon: string }> = {
  culture_civic: { color: '#AA9BC6', icon: 'landmark' },
  mixed_use: { color: '#EF9E76', icon: 'layers' },
  commercial: { color: '#83ADC8', icon: 'building' },
  education: { color: '#E9CC76', icon: 'graduation-cap' },
  hospitality: { color: '#E9A2A0', icon: 'bed' },
  residential: { color: '#78AF92', icon: 'house' },
}

const getMapCategory = (buildingType: string): MapCategory | null =>
  Object.prototype.hasOwnProperty.call(mapCategoryByType, buildingType)
    ? mapCategoryByType[buildingType as keyof typeof mapCategoryByType]
    : null

const buildings = data.buildings as unknown as Building[]
// Main island, Sentosa and Pulau Ubin; peripheral southern islands are outside this overview.
const overviewBounds: [[number, number], [number, number]] = [[103.62, 1.205], [104.085, 1.465]]
const overviewPadding = { top: 54, right: 18, bottom: 100, left: 18 }
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
  const pinHalfWidth = 26
  const pinHeight = 56
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
  background: '#f5f2eb', residential: '#f0ede7', park: '#dce6d7', wood: '#d3e4d5', grass: '#e6eee6',
  water: '#c7dbe1', waterway: '#83b8c4', roadMinor: '#ffffff', roadMajor: '#ffffff', roadMotorway: '#fafafa', roadCasing: '#cbd0cd',
  building: '#e9d7cc', buildingOutline: '#c8ccca', label: '#414744', labelSecondary: '#6b726e', labelWater: '#3f7885', labelHalo: '#ffffff', poiOpacity: .58,
}
const markerFill = '#35946b'
const markerStroke = '#242424'
const markerOutline = '#ffffff'
const markerPixelRatio = 3
const markerSwitchZoom = 13.5
const markerIcon = '#ffffff'
const phosphorBuildingFillPath = 'M232,224H208V32h8a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16h8V224H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM88,56h24a8,8,0,0,1,0,16H88a8,8,0,0,1,0-16Zm0,40h24a8,8,0,0,1,0,16H88a8,8,0,0,1,0-16Zm-8,48a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H88A8,8,0,0,1,80,144Zm72,80H104V184h48Zm16-72H144a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16Zm0-40H144a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16Zm0-40H144a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16Z'
// Restrained line pictograms keep category meaning readable without changing pin shape.
const categoryIconPaths: Record<MapCategory, string> = {
  culture_civic: 'M7.5,0L1,3.5V4h13V3.5L7.5,0z M2,5v5l-1,1.6V13h13v-1.4L13,10V5H2z M4,6h1v5.5H4V6z M7,6h1v5.5H7V6z M10,6h1 v5.5h-1V6z', // Maki museum
  mixed_use: 'M3,2v11h5v-3h3v3h1V2H3z M7,12H4v-2h3V12z M7,9H4V7h3V9z M7,6H4V4h3V6z M11,9H8V7h3V9z M11,6H8V4h3V6z', // Maki building
  commercial: 'm14 6h-13c.0881-1.3829.427-2.7383 1-4h11c.5731 1.2617.9119 2.6171 1 4zm-11 1h9v6h-1v-5h-3v5h-5zm1 3h3v-2h-3z', // Maki commercial
  education: 'M5.542 3.647 3.106 3l.443-1.63a.505.505 0 0 1 .618-.352l1.46.392a.5.5 0 0 1 .355.613l-.44 1.624Zm-4.52 7.356a.496.496 0 0 1-.005-.276l1.819-6.726 2.435.647-1.819 6.726a.499.499 0 0 1-.143.237l-1.457 1.347a.152.152 0 0 1-.247-.066l-.583-1.889ZM10 5c-2.25 0-3-.75-3-3 2.25 0 3 .75 3 3Zm-1.4 7.984c-1.37.21-3.126-1.706-3.52-3.8L5.969 5.9c.399-.35.903-.533 1.419-.533a2.71 2.71 0 0 1 1.564.489.964.964 0 0 0 1.089-.01 2.438 2.438 0 0 1 1.46-.479c.77 0 1.643.489 2.05 1.201 1.536 2.696-1.194 6.709-3.144 6.417a.867.867 0 0 1-.255-.093 1.427 1.427 0 0 0-1.302 0 .866.866 0 0 1-.25.092Z', // Maki school
  hospitality: 'M0.5,2.5C0.2,2.5,0,2.7,0,3v7.5v2C0,12.8,0.2,13,0.5,13S1,12.8,1,12.5V11h13v1.5 c0,0.3,0.2,0.5,0.5,0.5s0.5-0.2,0.5-0.5v-2c0-0.3-0.2-0.5-0.5-0.5H1V3C1,2.7,0.8,2.5,0.5,2.5z M3.5,3C2.7,3,2,3.7,2,4.5l0,0 C2,5.3,2.7,6,3.5,6l0,0C4.3,6,5,5.3,5,4.5l0,0C5,3.7,4.3,3,3.5,3L3.5,3z M7,4C5.5,4,5.5,5.5,5.5,5.5V7h-3C2.2,7,2,7.2,2,7.5v1 C2,8.8,2.2,9,2.5,9H6h9V6.5C15,4,12.5,4,12.5,4H7z', // Maki lodging
  residential: 'M2,13.7478c0,0.13807,0.11193,0.25,0.25,0.25h3.749v-3h3v3h3.749c0.13807,0,0.25-0.11193,0.25-0.25V7.9987H2 C2,7.9987,2,13.7478,2,13.7478z M13.93,6.5778l-0.9319-0.8189V2c0-0.55228-0.44771-1-1-1s-1,0.44772-1,1v2L7.6808,1.09 C7.5863,0.9897,7.42846,0.98478,7.3279,1.079L7.3169,1.09L1.0678,6.553C0.9734,6.65376,0.97856,6.81197,1.07932,6.90637 C1.12478,6.94896,1.18451,6.97304,1.2468,6.9739L3,6.9989h10.7468c0.13807,0.00046,0.25037-0.1111,0.25083-0.24917 C13.99784,6.68592,13.97365,6.62445,13.93,6.5779V6.5778z', // Maki home
}

const createBuildingPinSvg = (width: number, height: number, strokeWidth: number, iconSize: number, fill = markerFill, category: MapCategory | null = null) => {
  const cx = width / 2
  const iconX = (width - iconSize) / 2
  const iconY = width <= 28 ? 5 : 9
  const path = [
    `M ${cx} ${height - strokeWidth / 2}`,
    `C ${cx - width * .16} ${height * .84}, ${width * .07} ${height * .68}, ${width * .07} ${height * .44}`,
    `C ${width * .07} ${height * .17}, ${width * .28} ${strokeWidth}, ${cx} ${strokeWidth}`,
    `C ${width * .72} ${strokeWidth}, ${width * .93} ${height * .17}, ${width * .93} ${height * .44}`,
    `C ${width * .93} ${height * .68}, ${cx + width * .16} ${height * .84}, ${cx} ${height - strokeWidth / 2} Z`,
  ].join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * markerPixelRatio}" height="${height * markerPixelRatio}" viewBox="0 0 ${width} ${height}">
    <path d="${path}" fill="${fill}" stroke="${markerOutline}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
    ${category ? `<svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 15 15" fill="${markerIcon}"><path d="${categoryIconPaths[category]}"/></svg>` : `<svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 256 256" fill="${markerIcon}"><path d="${phosphorBuildingFillPath}"/></svg>`}
  </svg>`
}
const loadSvgMarker = (svg: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('Failed to load marker SVG'))
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
})
const legacyComparisonParams = ['ui', 'font', 'visual', 'map', 'scale', 'preset', 'lab', 'shape', 'weight', 'pin', 'surface', 'spacing', 'identity', 'mapMode', 'color', 'mapColor']

const setPaint = (map: MapLibreMap, layerId: string, property: string, value: unknown) => {
  if (map.getLayer(layerId)) map.setPaintProperty(layerId, property as never, value as never)
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
  if (map.getLayer('building')) map.setLayerZoomRange('building', markerSwitchZoom, 24)
  setPaint(map, 'building', 'fill-color', palette.building)
  // Reveal building footprints gradually as the viewer zooms into street scale.
  setPaint(map, 'building', 'fill-opacity', ['interpolate', ['linear'], ['zoom'], markerSwitchZoom, 0, 15, 1])
  setPaint(map, 'building', 'fill-outline-color', palette.building)
  if (map.getLayer('building-3d')) map.setLayoutProperty('building-3d', 'visibility', 'none')

  // Keep line-based water labels subordinate to district names.
  if (map.getLayer('waterway_line_label')) map.setLayoutProperty('waterway_line_label', 'text-size', 12)
  if (map.getLayer('water_name_line_label')) map.setLayoutProperty('water_name_line_label', 'text-size', 13)

  // City labels orient the overview; district and architecture labels lead closer in.
  ;['label_city', 'label_city_capital'].forEach((id) => {
    if (map.getLayer(id)) map.setLayerZoomRange(id, 3, 12.5)
  })

  // Let district names lead until the viewer zooms closer to street level.
  if (map.getLayer('highway-name-minor')) map.setLayerZoomRange('highway-name-minor', 15.5, 24)

  const layers = map.getStyle().layers ?? []
  layers.forEach((layer) => {
    const id = layer.id
    if (layer.type === 'line' && /^(road|bridge|tunnel)_.*_casing$/.test(id)) {
      map.setLayoutProperty(id, 'visibility', 'none')
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
      map.setLayoutProperty(id, 'visibility', 'none')
      return
    }
    if (layer.type === 'symbol' && id.startsWith('poi_')) {
      map.setLayoutProperty(id, 'visibility', 'none')
      return
    }
    // Reduce rail cross-hatching while retaining the continuous rail geometry.
    if (layer.type === 'line' && /^(road|bridge|tunnel)_(major|transit)_rail_hatching$/.test(id)) {
      setPaint(map, id, 'line-opacity', 0.4)
    }
    // Surface walking routes use quiet solid lines; tunnel dashes still indicate underground passages.
    if (layer.type === 'line' && /^(road|bridge)_path_pedestrian$/.test(id)) {
      setPaint(map, id, 'line-dasharray', [1, 0])
      setPaint(map, id, 'line-opacity', 0.45)
    }
    if (id === 'tunnel_path_pedestrian') setPaint(map, id, 'line-opacity', 0.45)
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
  map.setLayoutProperty('building-labels', 'text-size', locale === 'en' ? 13 : 11)
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
      mapCategory: getMapCategory(building.buildingType),
      mapCategoryColor: getMapCategory(building.buildingType) ? mapCategoryStyle[getMapCategory(building.buildingType)!].color : null,
    },
  })),
})

const BrandMark = () => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter"><path d="M7 7h10v10H7z"/><circle cx="17" cy="7" r="2.25" fill="currentColor" stroke="none"/><path d="M4 20h16"/></svg>

class WeatherBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // React 19 reports caught render errors to the console. Keep the optional
    // weather feature contained so the map and primary navigation stay usable.
  }

  render() {
    if (this.state.hasError) {
      return (
        <a className="weather-chip" href={weatherPortalUrl} target="_blank" rel="noreferrer" aria-label="Singapore weather">
          <Sun aria-hidden="true" size={20} weight="regular" />
        </a>
      )
    }
    return this.props.children
  }
}

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
  const [mapBearing, setMapBearing] = useState(restoredState?.bearing ?? 0)
  const [notice, setNotice] = useState<string | null>(null)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [weather, setWeather] = useState<WeatherState>({ temperature: null, condition: null })

  const selected = buildings.find((building) => building.id === selectedId) ?? null
  const surfaceState = expanded ? 'detail' : selected ? 'preview' : searchOpen ? 'search' : 'explore'
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
        const temperatureJson: unknown = await temperatureResponse.json()
        const forecastJson: unknown = await forecastResponse.json()
        const nextWeather = parseWeatherPayloads(temperatureJson, forecastJson)
        if (!cancelled) setWeather(nextWeather)
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
      ...(restoredState
        ? { center: restoredState.center, zoom: restoredState.zoom }
        : { bounds: overviewBounds, fitBoundsOptions: { padding: overviewPadding, maxZoom: 12 } }),
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

    map.on('load', async () => {
      const [normalPin, selectedPin] = await Promise.all([
        loadSvgMarker(createBuildingPinSvg(28, 31, 1.5, 13)),
        loadSvgMarker(createBuildingPinSvg(52, 56, 2, 24)),
      ])
      map.addImage('building-pin-normal', normalPin, { pixelRatio: markerPixelRatio })
      map.addImage('building-pin-selected', selectedPin, { pixelRatio: markerPixelRatio })
      await Promise.all(Object.entries(mapCategoryStyle).map(async ([category, style]) => {
        const normal = await loadSvgMarker(createBuildingPinSvg(28, 31, 1.5, 13, style.color, category as MapCategory))
        map.addImage(`building-pin-normal-${category}`, normal, { pixelRatio: markerPixelRatio })
      }))
      map.addSource('buildings', { type: 'geojson', data: featureCollection(selectedId, locale) })
      map.addLayer({
        id: 'building-hit-targets', type: 'circle', source: 'buildings',
        layout: { 'circle-sort-key': ['case', ['get', 'selected'], 1, 0] },
        paint: { 'circle-radius': 26, 'circle-opacity': 0 },
      })
      map.addLayer({
        id: 'building-dots', type: 'circle', source: 'buildings', maxzoom: markerSwitchZoom,
        filter: ['==', ['get', 'selected'], false],
        paint: {
          'circle-radius': 5,
          'circle-color': ['coalesce', ['get', 'mapCategoryColor'], markerFill],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-opacity': 1,
        },
      })
      map.addLayer({
        id: 'building-pins', type: 'symbol', source: 'buildings', minzoom: markerSwitchZoom,
        filter: ['==', ['get', 'selected'], false],
        layout: { 'icon-image': ['concat', 'building-pin-normal-', ['coalesce', ['get', 'mapCategory'], 'fallback']], 'icon-anchor': 'bottom', 'icon-overlap': 'always', 'icon-ignore-placement': true },
        paint: { 'icon-opacity': 1 },
      })
      map.addLayer({
        id: 'building-pin-selected', type: 'symbol', source: 'buildings',
        filter: ['==', ['get', 'selected'], true],
        layout: { 'icon-image': 'building-pin-selected', 'icon-anchor': 'bottom', 'icon-overlap': 'always', 'icon-ignore-placement': true },
        paint: { 'icon-opacity': 0 },
      })
      map.addLayer({
        id: 'building-labels', type: 'symbol', source: 'buildings', minzoom: markerSwitchZoom,
        filter: ['==', ['get', 'selected'], false],
        layout: { 'text-field': ['get', 'name'], 'text-size': 13, 'text-anchor': 'left', 'text-justify': 'auto', 'text-variable-anchor-offset': ['left', [1.55, -1.3], 'right', [-1.55, -1.3]], 'text-max-width': 12 },
        paint: { 'text-color': '#282724', 'text-halo-color': '#f8f4ec', 'text-halo-width': 1 },
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
          .filter(({ distance }) => distance <= 26)
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

    const syncBearing = () => setMapBearing(map.getBearing())
    map.on('rotate', syncBearing)
    syncBearing()
    mapRef.current = map
    return () => {
      map.off('rotate', syncBearing)
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
    element.style.width = '52px'
    element.style.height = '56px'
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
      image.style.left = `${(52 - width) / 2}px`
      image.style.display = 'block'
      image.style.zIndex = String(zIndex)
      return image
    }
    const category = getMapCategory(building.buildingType)
    const fill = category ? mapCategoryStyle[category].color : markerFill
    const normal = map.getZoom() >= markerSwitchZoom
      ? createImage(createBuildingPinSvg(28, 31, 1.5, 13, fill, category), 28, 31, 1)
      : document.createElement('span')
    if (normal instanceof HTMLSpanElement) {
      normal.style.position = 'absolute'
      normal.style.width = '10px'
      normal.style.height = '10px'
      normal.style.left = '21px'
      normal.style.bottom = '0'
      normal.style.border = '1px solid #ffffff'
      normal.style.borderRadius = '50%'
      normal.style.background = fill
      normal.style.boxSizing = 'border-box'
      normal.style.zIndex = '1'
    }
    const selected = createImage(createBuildingPinSvg(52, 56, 2, 24, fill, category), 52, 56, 2)
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
    mapRef.current?.fitBounds(overviewBounds, { padding: overviewPadding, maxZoom: 12, bearing: 0, pitch: 0, duration: motionDuration(700) })
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

  const resetNorth = () => {
    mapRef.current?.easeTo({ bearing: 0, duration: motionDuration(350) })
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
    <main className={`app locale-${locale} state-${surfaceState} ${expanded ? 'details-expanded' : ''}`}>
      <div ref={mapContainer} className="map" role="region" aria-label={t.mapLabel} />

      <header className="topbar">
        <button className="brand" type="button" onClick={goHome} aria-label={t.resetMap}>
          <span className="brand-mark"><BrandMark /></span>
        </button>
        <div className="top-controls">
          <WeatherBoundary>
            <a className="weather-chip" href={weatherPortalUrl} target="_blank" rel="noreferrer" aria-label={weather.condition ? `${weather.condition}${weather.temperature === null ? '' : `, ${weather.temperature} degrees Celsius`}` : 'Singapore weather'}>
              <WeatherGlyph condition={weather.condition} />
              {weather.temperature !== null && <span>{weather.temperature}°</span>}
            </a>
          </WeatherBoundary>
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

      <div className={`bottom-surface ${surfaceState}`}>
        {!selected ? (
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
        ) : (
          <aside className="place-surface" aria-label={expanded ? t.detailLabel(getBuildingCopy(locale, selected.id, selected.name).name) : t.previewLabel(getBuildingCopy(locale, selected.id, selected.name).name)}>
            <div className="sheet-compact" aria-hidden={expanded}>
              <PreviewCard building={selected} locale={locale} t={t} onDetails={() => setExpanded(true)} onClose={() => setSelectedId(null)} />
            </div>
            <div className="sheet-expanded" aria-hidden={!expanded}>
              <DetailContent building={selected} locale={locale} t={t} onClose={() => setExpanded(false)} backRef={detailBackRef} />
            </div>
          </aside>
        )}
      </div>

      <div className="map-tools">
        {Math.abs(((mapBearing + 180) % 360 + 360) % 360 - 180) > 3 && (
          <button className="locate-button" type="button" onClick={resetNorth} aria-label={locale === 'ja' ? '北を上に戻す' : 'Reset map to north'} title={locale === 'ja' ? '北を上に戻す' : 'Reset map to north'}>
            <Compass aria-hidden="true" size={20} weight="regular" style={{ transform: `rotate(${-mapBearing}deg)` }} />
          </button>
        )}
        <button className={`locate-button ${locating ? 'loading' : ''}`} onClick={locate} disabled={locating} aria-label={locating ? t.locating : t.locate}>
          <Crosshair aria-hidden="true" size={20} weight="regular" />
        </button>
      </div>
      <div className="data-note">{t.dataNote(buildings.length)}</div>

      {notice && <div className="notice" role="status">{notice}</div>}
    </main>
  )
}

function WeatherGlyph({ condition }: { condition: string | null }) {
  const normalized = typeof condition === 'string' ? condition.toLowerCase() : ''
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
