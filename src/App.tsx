import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import data from './data/buildings.json'
import { getBuildingCopy, getLocaleFromPath, localeHref, translations } from './i18n'
import type { Locale, Translation } from './i18n'

type Coordinates = [number, number]
type Variant = 'a' | 'b'
type FontChoice = 'a' | 'b' | 'c'
type VisualChoice = 'baseline' | 'cartographic' | 'editorial' | 'civic'
type MapChoice = 'm1' | 'm2' | 'm3'
type TypeScaleChoice = 'current' | 'govuk' | 'sgm'
type DesignPresetId = '1' | '2' | '3'
type VisualLabChoice = 'baseline' | 'signal' | 'tile' | 'orbit'

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
const fontChoices: Record<FontChoice, { name: string; checks: string[] }> = {
  'a': { name: 'Quiet Grotesque', checks: ['400 16px "Hanken Grotesk"', '500 16px "Hanken Grotesk"', '600 16px "Hanken Grotesk"', '700 16px "Hanken Grotesk"'] },
  'b': { name: 'Legible Character', checks: ['400 16px "Atkinson Hyperlegible Next"', '500 16px "Atkinson Hyperlegible Next"', '600 16px "Atkinson Hyperlegible Next"'] },
  'c': { name: 'Editorial Restraint', checks: ['400 16px "DM Sans"', '500 16px "Newsreader"', '600 16px "DM Sans"'] },
}

const typeScaleChoices: Record<TypeScaleChoice, { code: string; name: string }> = {
  current: { code: 'CUR', name: 'Current SGM scale' },
  govuk: { code: 'GOV', name: 'GOV.UK mobile scale' },
  sgm: { code: 'SGM', name: 'SGM light mobile scale' },
}

const visualChoices: Record<VisualChoice, { code: string; name: string; pin: { default: string; selected: string; stroke: string; halo: string } }> = {
  baseline: { code: 'BASE', name: 'Warm Utility', pin: { default: '#f7f1e7', selected: '#ef6f51', stroke: '#282724', halo: 'rgba(255,255,255,.72)' } },
  cartographic: { code: 'A', name: 'Cartographic Clarity', pin: { default: '#326b5d', selected: '#d26f40', stroke: '#24342e', halo: 'rgba(250,250,247,.82)' } },
  editorial: { code: 'B', name: 'Editorial Index', pin: { default: '#414a43', selected: '#a4513b', stroke: '#252b28', halo: 'rgba(248,246,240,.82)' } },
  civic: { code: 'C', name: 'Civic Character', pin: { default: '#286c84', selected: '#d98048', stroke: '#26362f', halo: 'rgba(249,247,241,.82)' } },
}

type MapPalette = {
  code: string
  name: string
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
  pin: { default: string; selected: string; stroke: string; halo: string; radius: number; selectedRadius: number }
}

const mapChoices: Record<MapChoice, MapPalette> = {
  m1: {
    code: 'M1', name: 'Balanced Context',
    background: '#eef0ea', residential: '#e9ece7', park: '#dce8dc', wood: '#d4e2d4', grass: '#e2ebde',
    water: '#d8e8eb', waterway: '#92b8c0', roadMinor: '#ffffff', roadMajor: '#f8f5ee', roadMotorway: '#f5eee1', roadCasing: '#c9d0ca',
    building: '#e1ddd4', buildingOutline: '#cbc7bf', label: '#34453e', labelSecondary: '#66756e', labelWater: '#416d79', labelHalo: '#fafaf7', poiOpacity: .68,
    pin: { default: '#286c84', selected: '#d98048', stroke: '#26362f', halo: 'rgba(249,247,241,.84)', radius: 6, selectedRadius: 8 },
  },
  m2: {
    code: 'M2', name: 'Quiet Infrastructure',
    background: '#eeeee9', residential: '#e9e9e4', park: '#dfe5dd', wood: '#d9e1d8', grass: '#e4e7df',
    water: '#dce3e5', waterway: '#aebfc3', roadMinor: '#f8f7f2', roadMajor: '#f4f1e8', roadMotorway: '#eee8dc', roadCasing: '#b9c0ba',
    building: '#dddcd7', buildingOutline: '#c6c6c0', label: '#303732', labelSecondary: '#626a64', labelWater: '#566d73', labelHalo: '#f8f6f0', poiOpacity: .5,
    pin: { default: '#414a43', selected: '#a4513b', stroke: '#252b28', halo: 'rgba(248,246,240,.86)', radius: 5.5, selectedRadius: 8 },
  },
  m3: {
    code: 'M3', name: 'Living Geography',
    background: '#f0efe7', residential: '#ebece5', park: '#cfe3d3', wood: '#c5dcca', grass: '#dbe8d3',
    water: '#cce5eb', waterway: '#75aebb', roadMinor: '#fffdf7', roadMajor: '#f8f0dd', roadMotorway: '#f1dfbf', roadCasing: '#b8c5bd',
    building: '#dfd9cc', buildingOutline: '#c2bbae', label: '#26362f', labelSecondary: '#56685f', labelWater: '#245f77', labelHalo: '#f9f7f1', poiOpacity: .72,
    pin: { default: '#1f6a82', selected: '#e07b3f', stroke: '#203a33', halo: 'rgba(249,247,241,.88)', radius: 6.5, selectedRadius: 9 },
  },
}

const designPresets: Record<DesignPresetId, { name: string; visual: VisualChoice; map: MapChoice }> = {
  '1': { name: 'Visual A + Map M3', visual: 'cartographic', map: 'm3' },
  '2': { name: 'Visual C + Map M3', visual: 'civic', map: 'm3' },
  '3': { name: 'Visual A + Map M1', visual: 'cartographic', map: 'm1' },
}

const visualLabChoices: Record<VisualLabChoice, { code: string; name: string; note: string }> = {
  baseline: { code: 'BL', name: 'Current baseline', note: 'TA + Civic Character + Balanced Context' },
  signal: { code: 'S1', name: 'Signal Field', note: 'Directional pin · soft floating surface' },
  tile: { code: 'S2', name: 'Civic Tiles', note: 'Architectural tile · flat indexed surface' },
  orbit: { code: 'S3', name: 'Island Orbit', note: 'Ring marker · translucent connected surface' },
}

const labMapChoices: Record<Exclude<VisualLabChoice, 'baseline'>, MapPalette> = {
  signal: {
    code: 'S1', name: 'Signal Field',
    background: '#e9efe9', residential: '#e4ebe5', park: '#c9ddcc', wood: '#bfd5c4', grass: '#d7e5d5',
    water: '#bedce2', waterway: '#72a8b3', roadMinor: '#fffdf4', roadMajor: '#f7edd6', roadMotorway: '#efdcb5', roadCasing: '#aebdb4',
    building: '#d9d9ce', buildingOutline: '#bfc2b7', label: '#183a33', labelSecondary: '#557068', labelWater: '#266b7a', labelHalo: '#f7fbf5', poiOpacity: .62,
    pin: { default: '#146b5c', selected: '#e45d3f', stroke: '#11352f', halo: 'rgba(247,251,245,.9)', radius: 7, selectedRadius: 10 },
  },
  tile: {
    code: 'S2', name: 'Civic Tiles',
    background: '#f2eee3', residential: '#ece8de', park: '#d8dfce', wood: '#ced9c8', grass: '#e1e4d5',
    water: '#d5e5e5', waterway: '#8eafb0', roadMinor: '#fffdf7', roadMajor: '#f7f0df', roadMotorway: '#f0dfbd', roadCasing: '#b9b4a8',
    building: '#ded8cc', buildingOutline: '#bdb5a8', label: '#252b28', labelSecondary: '#62665e', labelWater: '#3b6d73', labelHalo: '#faf7ef', poiOpacity: .54,
    pin: { default: '#244d42', selected: '#f0b83d', stroke: '#172b26', halo: 'rgba(250,247,239,.94)', radius: 7, selectedRadius: 10 },
  },
  orbit: {
    code: 'S3', name: 'Island Orbit',
    background: '#edf1e8', residential: '#e7ece3', park: '#c5ddbf', wood: '#b9d2b6', grass: '#d7e6cf',
    water: '#b8dbe6', waterway: '#62a2b5', roadMinor: '#fffdf4', roadMajor: '#f8edcf', roadMotorway: '#f2d9a7', roadCasing: '#afbeb2',
    building: '#ded9cb', buildingOutline: '#bcb8aa', label: '#183731', labelSecondary: '#4c675f', labelWater: '#1d667c', labelHalo: '#f7faef', poiOpacity: .68,
    pin: { default: '#195f78', selected: '#ef7041', stroke: '#153a3b', halo: 'rgba(247,250,239,.88)', radius: 7, selectedRadius: 10 },
  },
}

const getRequestedPreset = (): DesignPresetId | null => {
  const value = new URLSearchParams(window.location.search).get('preset')
  return value && value in designPresets ? value as DesignPresetId : null
}

const getRequestedVisualLab = (): VisualLabChoice => {
  const value = new URLSearchParams(window.location.search).get('lab')
  return value && value in visualLabChoices ? value as VisualLabChoice : 'baseline'
}

const getInitialFontChoice = (): FontChoice => {
  if (getRequestedPreset() || getRequestedVisualLab() !== 'baseline') return 'a'
  const value = new URLSearchParams(window.location.search).get('font')
  return value && value in fontChoices ? value as FontChoice : 'a'
}

const getInitialVisualChoice = (): VisualChoice => {
  if (getRequestedVisualLab() !== 'baseline') return 'civic'
  const preset = getRequestedPreset()
  if (preset) return designPresets[preset].visual
  const value = new URLSearchParams(window.location.search).get('visual')
  return value && value in visualChoices ? value as VisualChoice : 'civic'
}

const getInitialMapChoice = (): MapChoice => {
  if (getRequestedVisualLab() !== 'baseline') return 'm3'
  const preset = getRequestedPreset()
  if (preset) return designPresets[preset].map
  const value = new URLSearchParams(window.location.search).get('map')
  return value && value in mapChoices ? value as MapChoice : 'm1'
}

const getInitialTypeScaleChoice = (): TypeScaleChoice => {
  if (getRequestedPreset() || getRequestedVisualLab() !== 'baseline') return 'sgm'
  const value = new URLSearchParams(window.location.search).get('scale')
  return value && value in typeScaleChoices ? value as TypeScaleChoice : 'current'
}

const getInitialVisualLabChoice = (): VisualLabChoice => {
  return getRequestedVisualLab()
}

const createMarkerImage = (choice: Exclude<VisualLabChoice, 'baseline'>, selected: boolean): ImageData => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')!
  const palette = labMapChoices[choice].pin
  context.lineJoin = 'round'
  context.lineCap = 'round'

  if (choice === 'signal') {
    context.beginPath()
    context.moveTo(32, 5)
    context.lineTo(57, 32)
    context.lineTo(32, 59)
    context.lineTo(7, 32)
    context.closePath()
    context.fillStyle = selected ? palette.selected : palette.default
    context.fill()
    context.lineWidth = 5
    context.strokeStyle = palette.stroke
    context.stroke()
    context.beginPath()
    context.arc(32, 32, selected ? 8 : 6, 0, Math.PI * 2)
    context.fillStyle = '#fffaf0'
    context.fill()
  } else if (choice === 'tile') {
    context.save()
    context.translate(32, 32)
    context.rotate(Math.PI / 4)
    context.beginPath()
    context.roundRect(-20, -20, 40, 40, 7)
    context.fillStyle = selected ? palette.selected : palette.default
    context.fill()
    context.lineWidth = 5
    context.strokeStyle = palette.stroke
    context.stroke()
    context.restore()
    context.fillStyle = selected ? palette.stroke : '#f8f4e9'
    context.fillRect(28, 27, 8, 16)
  } else {
    context.beginPath()
    context.arc(31, 33, 20, 0, Math.PI * 2)
    context.fillStyle = '#f8faef'
    context.fill()
    context.lineWidth = selected ? 8 : 6
    context.strokeStyle = selected ? palette.selected : palette.default
    context.stroke()
    context.beginPath()
    context.arc(selected ? 31 : 42, selected ? 33 : 22, selected ? 7 : 5, 0, Math.PI * 2)
    context.fillStyle = selected ? palette.default : palette.selected
    context.fill()
  }

  return context.getImageData(0, 0, 64, 64)
}

const addLabMarkerImages = (map: MapLibreMap) => {
  ;(['signal', 'tile', 'orbit'] as const).forEach((choice) => {
    ;([false, true] as const).forEach((selected) => {
      const id = `sgm-${choice}-${selected ? 'selected' : 'default'}`
      if (!map.hasImage(id)) map.addImage(id, createMarkerImage(choice, selected), { pixelRatio: 2 })
    })
  })
}

const setPaint = (map: MapLibreMap, layerId: string, property: string, value: unknown) => {
  if (map.getLayer(layerId)) map.setPaintProperty(layerId, property as never, value as never)
}

const applyMapTheme = (map: MapLibreMap, choice: MapChoice, labChoice: VisualLabChoice = 'baseline') => {
  const palette = labChoice === 'baseline' ? mapChoices[choice] : labMapChoices[labChoice]

  setPaint(map, 'background', 'background-color', palette.background)
  setPaint(map, 'landuse_residential', 'fill-color', palette.residential)
  setPaint(map, 'park', 'fill-color', palette.park)
  setPaint(map, 'park_outline', 'line-color', palette.park)
  setPaint(map, 'landcover_wood', 'fill-color', palette.wood)
  setPaint(map, 'landcover_grass', 'fill-color', palette.grass)
  ;['landuse_pitch', 'landuse_track', 'landuse_cemetery', 'landuse_hospital', 'landuse_school'].forEach((id) => setPaint(map, id, 'fill-color', palette.grass))
  setPaint(map, 'water', 'fill-color', palette.water)
  ;['waterway_tunnel', 'waterway_river', 'waterway_other'].forEach((id) => setPaint(map, id, 'line-color', palette.waterway))
  setPaint(map, 'building', 'fill-color', palette.building)
  setPaint(map, 'building', 'fill-outline-color', palette.buildingOutline)
  setPaint(map, 'building-3d', 'fill-extrusion-color', palette.building)

  const layers = map.getStyle().layers ?? []
  layers.forEach((layer) => {
    const id = layer.id
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

const applyPinTheme = (map: MapLibreMap, choice: VisualChoice, mapChoice: MapChoice, labChoice: VisualLabChoice = 'baseline') => {
  if (!map.getLayer('building-points')) return
  if (labChoice !== 'baseline') {
    const pin = labMapChoices[labChoice].pin
    map.setPaintProperty('building-halo', 'circle-color', pin.halo)
    map.setPaintProperty('building-halo', 'circle-radius', ['case', ['get', 'selected'], pin.selectedRadius + 8, pin.radius + 5])
    map.setPaintProperty('building-halo', 'circle-opacity', ['case', ['get', 'selected'], .9, .58])
    map.setPaintProperty('building-points', 'circle-opacity', 0)
    map.setPaintProperty('building-points', 'circle-stroke-opacity', 0)
    map.setPaintProperty('building-symbols', 'icon-opacity', 1)
    map.setLayoutProperty('building-symbols', 'icon-image', ['case', ['get', 'selected'], `sgm-${labChoice}-selected`, `sgm-${labChoice}-default`])
    map.setPaintProperty('building-labels', 'text-color', pin.stroke)
    map.setPaintProperty('building-labels', 'text-halo-color', pin.halo)
    return
  }
  const pin = choice === 'civic'
    ? mapChoices[mapChoice].pin
    : { ...visualChoices[choice].pin, radius: 6, selectedRadius: 8 }
  map.setPaintProperty('building-symbols', 'icon-opacity', 0)
  map.setPaintProperty('building-points', 'circle-opacity', 1)
  map.setPaintProperty('building-points', 'circle-stroke-opacity', 1)
  map.setPaintProperty('building-halo', 'circle-opacity', 1)
  map.setPaintProperty('building-halo', 'circle-color', pin.halo)
  map.setPaintProperty('building-points', 'circle-color', ['case', ['get', 'selected'], pin.selected, pin.default])
  map.setPaintProperty('building-points', 'circle-stroke-color', pin.stroke)
  map.setPaintProperty('building-labels', 'text-color', pin.stroke)
  map.setPaintProperty('building-labels', 'text-halo-color', pin.halo)
  map.setPaintProperty('building-points', 'circle-radius', ['case', ['get', 'selected'], pin.selectedRadius, pin.radius])
  map.setPaintProperty('building-halo', 'circle-radius', ['case', ['get', 'selected'], pin.selectedRadius + 5, pin.radius + 4])
}

const applyTypeScaleToMap = (map: MapLibreMap, choice: TypeScaleChoice) => {
  if (!map.getLayer('building-labels')) return
  map.setLayoutProperty('building-labels', 'text-size', choice === 'current' ? 12 : 16)
  map.setLayoutProperty('building-labels', 'text-offset', choice === 'current' ? [0, 1.45] : [0, 1.25])
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

const Icon = ({ name }: { name: 'search' | 'locate' | 'arrow' | 'close' | 'external' }) => {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>,
    locate: <><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    external: <><path d="M14 5h5v5M19 5l-8 8"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function App() {
  const locale = useMemo(getLocaleFromPath, [])
  const t = translations[locale]
  const restoredState = useMemo(readRestoredMapState, [])
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const visualChoiceRef = useRef<VisualChoice>(getInitialVisualChoice())
  const mapChoiceRef = useRef<MapChoice>(getInitialMapChoice())
  const typeScaleChoiceRef = useRef<TypeScaleChoice>(getInitialTypeScaleChoice())
  const visualLabChoiceRef = useRef<VisualLabChoice>(getInitialVisualLabChoice())
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(getRequestedSelectedId() ?? restoredState?.selectedId ?? null)
  const [expanded, setExpanded] = useState(getRequestedExpandedState() ?? restoredState?.expanded ?? false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [variant, setVariant] = useState<Variant>(() => {
    const requested = new URLSearchParams(window.location.search).get('ui')
    if (requested === 'a' || requested === 'b') return requested
    return locale === 'en' ? 'b' : 'a'
  })
  const previousVariantRef = useRef<Variant>(variant)
  const [fontChoice, setFontChoice] = useState<FontChoice>(getInitialFontChoice)
  const [visualChoice, setVisualChoice] = useState<VisualChoice>(() => visualChoiceRef.current)
  const [mapChoice, setMapChoice] = useState<MapChoice>(() => mapChoiceRef.current)
  const [typeScaleChoice, setTypeScaleChoice] = useState<TypeScaleChoice>(() => typeScaleChoiceRef.current)
  const [visualLabChoice, setVisualLabChoice] = useState<VisualLabChoice>(() => visualLabChoiceRef.current)
  const [fontsReady, setFontsReady] = useState(false)
  const [comparisonOpen, setComparisonOpen] = useState(false)

  const activePreset = useMemo(() => {
    if (visualLabChoice !== 'baseline' || fontChoice !== 'a' || typeScaleChoice !== 'sgm') return null
    return (Object.keys(designPresets) as DesignPresetId[]).find((id) => {
      const preset = designPresets[id]
      return preset.visual === visualChoice && preset.map === mapChoice
    }) ?? null
  }, [fontChoice, mapChoice, typeScaleChoice, visualChoice, visualLabChoice])

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
    document.documentElement.lang = locale
    document.documentElement.dir = 'ltr'
  }, [locale])

  useEffect(() => {
    if (locale !== 'en') return
    const url = new URL(window.location.href)
    url.searchParams.set('font', fontChoice)
    window.history.replaceState({}, '', url)
    setFontsReady(false)
    const checks = fontChoices[fontChoice].checks
    const fontSet = document.fonts
    const loading = typeof fontSet.load === 'function'
      ? Promise.all(checks.map((font) => fontSet.load(font)))
      : fontSet.ready
    void loading.then(() => {
      setFontsReady(checks.every((font) => document.fonts.check(font)))
    })
  }, [fontChoice, locale])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: restoredState?.center ?? defaultCenter,
      zoom: restoredState?.zoom ?? defaultZoom,
      bearing: restoredState?.bearing ?? 0,
      pitch: restoredState?.pitch ?? 0,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: false,
      locale: t.mapControls,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      map.addSource('buildings', { type: 'geojson', data: featureCollection(selectedId, locale) })
      addLabMarkerImages(map)
      map.addLayer({
        id: 'building-halo', type: 'circle', source: 'buildings',
        paint: { 'circle-radius': ['case', ['get', 'selected'], 13, 10], 'circle-color': 'rgba(255,255,255,.72)', 'circle-blur': 0.45 },
      })
      map.addLayer({
        id: 'building-points', type: 'circle', source: 'buildings',
        paint: { 'circle-radius': ['case', ['get', 'selected'], 8, 6], 'circle-color': ['case', ['get', 'selected'], '#ef6f51', '#f7f1e7'], 'circle-stroke-color': '#282724', 'circle-stroke-width': 1.7 },
      })
      map.addLayer({
        id: 'building-symbols', type: 'symbol', source: 'buildings',
        layout: { 'icon-image': 'sgm-signal-default', 'icon-size': 1, 'icon-allow-overlap': true, 'icon-ignore-placement': true },
        paint: { 'icon-opacity': 0 },
      })
      map.addLayer({
        id: 'building-labels', type: 'symbol', source: 'buildings', minzoom: 13.2,
        layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.45], 'text-anchor': 'top', 'text-variable-anchor': ['top', 'bottom', 'left', 'right'], 'text-radial-offset': 0.75 },
        paint: { 'text-color': '#282724', 'text-halo-color': '#f8f4ec', 'text-halo-width': 2 },
      })
      applyMapTheme(map, mapChoiceRef.current, visualLabChoiceRef.current)
      applyPinTheme(map, visualChoiceRef.current, mapChoiceRef.current, visualLabChoiceRef.current)
      applyTypeScaleToMap(map, locale === 'en' ? typeScaleChoiceRef.current : 'current')

      map.on('click', (event) => {
        const features = map.queryRenderedFeatures(event.point, { layers: ['building-symbols', 'building-points'] })
        const id = features[0]?.properties?.id as string | undefined
        if (id) {
          setSelectedId(id)
          setExpanded(false)
          setSearchOpen(false)
        }
      })
      map.on('mouseenter', 'building-points', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'building-points', () => { map.getCanvas().style.cursor = '' })
      map.on('mouseenter', 'building-symbols', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'building-symbols', () => { map.getCanvas().style.cursor = '' })
    })

    mapRef.current = map
    return () => {
      userMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [locale, restoredState])

  useEffect(() => {
    const source = mapRef.current?.getSource('buildings') as GeoJSONSource | undefined
    source?.setData(featureCollection(selectedId, locale))
  }, [locale, selectedId])

  useEffect(() => {
    visualChoiceRef.current = visualChoice
    const url = new URL(window.location.href)
    url.searchParams.set('visual', visualChoice)
    window.history.replaceState({}, '', url)
    if (mapRef.current?.isStyleLoaded()) applyPinTheme(mapRef.current, visualChoice, mapChoiceRef.current, visualLabChoiceRef.current)
  }, [visualChoice])

  useEffect(() => {
    mapChoiceRef.current = mapChoice
    const url = new URL(window.location.href)
    url.searchParams.set('map', mapChoice)
    window.history.replaceState({}, '', url)
    const map = mapRef.current
    if (map?.isStyleLoaded()) {
      applyMapTheme(map, mapChoice, visualLabChoiceRef.current)
      applyPinTheme(map, visualChoiceRef.current, mapChoice, visualLabChoiceRef.current)
    }
  }, [mapChoice])

  useEffect(() => {
    typeScaleChoiceRef.current = typeScaleChoice
    const url = new URL(window.location.href)
    url.searchParams.set('scale', typeScaleChoice)
    window.history.replaceState({}, '', url)
    if (mapRef.current) applyTypeScaleToMap(mapRef.current, locale === 'en' ? typeScaleChoice : 'current')
  }, [locale, typeScaleChoice])

  useEffect(() => {
    visualLabChoiceRef.current = visualLabChoice
    const url = new URL(window.location.href)
    url.searchParams.set('lab', visualLabChoice)
    window.history.replaceState({}, '', url)
    const map = mapRef.current
    if (map?.isStyleLoaded()) {
      applyMapTheme(map, mapChoiceRef.current, visualLabChoice)
      applyPinTheme(map, visualChoiceRef.current, mapChoiceRef.current, visualLabChoice)
    }
  }, [visualLabChoice])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('ui', variant)
    window.history.replaceState({}, '', url)
    if (previousVariantRef.current !== variant) setExpanded(false)
    previousVariantRef.current = variant
  }, [variant])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (activePreset) url.searchParams.set('preset', activePreset)
    else url.searchParams.delete('preset')
    window.history.replaceState({}, '', url)
  }, [activePreset])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const chooseBuilding = (building: Building, focusMap = false) => {
    setSelectedId(building.id)
    setExpanded(false)
    setSearchOpen(false)
    if (focusMap) mapRef.current?.flyTo({ center: building.coordinates, zoom: Math.max(mapRef.current.getZoom(), 14), duration: 900 })
  }

  const chooseFont = (choice: FontChoice) => {
    setVisualLabChoice('baseline')
    setFontChoice(choice)
    setVariant('b')
  }

  const chooseVisual = (choice: VisualChoice) => {
    setVisualLabChoice('baseline')
    setVisualChoice(choice)
    setVariant('b')
  }

  const chooseMap = (choice: MapChoice) => {
    setVisualLabChoice('baseline')
    setMapChoice(choice)
    setVariant('b')
  }

  const chooseTypeScale = (choice: TypeScaleChoice) => {
    setVisualLabChoice('baseline')
    setTypeScaleChoice(choice)
    setVariant('b')
  }

  const choosePreset = (id: DesignPresetId) => {
    const preset = designPresets[id]
    setFontChoice('a')
    setTypeScaleChoice('sgm')
    setVisualChoice(preset.visual)
    setMapChoice(preset.map)
    setVisualLabChoice('baseline')
    setVariant('b')
  }

  const chooseVisualLab = (choice: VisualLabChoice) => {
    setVisualLabChoice(choice)
    setFontChoice('a')
    setTypeScaleChoice(choice === 'baseline' ? 'current' : 'sgm')
    setVisualChoice('civic')
    setMapChoice(choice === 'baseline' ? 'm1' : 'm3')
    setVariant('b')
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
        mapRef.current?.flyTo({ center: location, zoom: Math.max(mapRef.current.getZoom(), 14), duration: 900 })
        setLocating(false)
        setNotice(t.locationSuccess)
      },
      () => { setLocating(false); setNotice(t.locationFailure) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <main className={`app variant-${variant} visual-study visual-${visualChoice} map-${mapChoice} lab-${visualLabChoice} type-scale-${typeScaleChoice}${typeScaleChoice !== 'current' ? ' type-scale-large' : ''}${locale === 'en' ? ` typography-test font-${fontChoice}` : ''}`} data-font-ready={locale === 'en' ? fontsReady : undefined} data-visual={visualChoice} data-map-style={mapChoice} data-type-scale={typeScaleChoice} data-visual-lab={visualLabChoice} data-design-preset={activePreset ?? undefined}>
      <div ref={mapContainer} className="map" aria-label={t.mapLabel} />

      <header className="topbar">
        <button className="brand" type="button" onClick={() => mapRef.current?.flyTo({ center: defaultCenter, zoom: defaultZoom })} aria-label={t.resetMap}>
          <span className="brand-mark">SGM</span>
          <span className="brand-title">Architecture<br />Map</span>
        </button>
        <div className="top-controls">
          <div className="variant-switch" aria-label={t.uiSwitcher}>
            <span>UI</span>
            <button className={variant === 'a' ? 'active' : ''} onClick={() => setVariant('a')} aria-pressed={variant === 'a'}>A</button>
            <button className={variant === 'b' ? 'active' : ''} onClick={() => setVariant('b')} aria-pressed={variant === 'b'}>B</button>
          </div>
          <nav className="language-switch" aria-label={t.languageSwitcher}>
            <a className={locale === 'en' ? 'active' : ''} href={localeHref('en', { font: fontChoice, visual: visualChoice, map: mapChoice, scale: typeScaleChoice, lab: visualLabChoice, selected: selectedId ?? '', sheet: expanded ? 'expanded' : 'compact' })} hrefLang="en" aria-current={locale === 'en' ? 'page' : undefined} onClick={switchLanguage}>EN</a>
            <a className={locale === 'ja' ? 'active' : ''} href={localeHref('ja', { font: fontChoice, visual: visualChoice, map: mapChoice, scale: typeScaleChoice, lab: visualLabChoice, selected: selectedId ?? '', sheet: expanded ? 'expanded' : 'compact' })} hrefLang="ja" aria-current={locale === 'ja' ? 'page' : undefined} onClick={switchLanguage}>JP</a>
          </nav>
        </div>
      </header>

      {locale === 'en' && (
        <section className={`experiment-switch ${comparisonOpen ? 'open' : ''}`} aria-label="Design set, typography, type scale, visual system, and map style comparison">
          <button className="experiment-toggle" type="button" onClick={() => setComparisonOpen(!comparisonOpen)} aria-expanded={comparisonOpen} aria-controls="experiment-options">
            <span>VISUAL LAB</span><strong>{visualLabChoices[visualLabChoice].code}</strong>
          </button>
          <div className="experiment-options" id="experiment-options" hidden={!comparisonOpen}>
            <div className="experiment-group experiment-lab">
              <span className="experiment-label">VISUAL LANGUAGE</span>
              <div>
                {(Object.keys(visualLabChoices) as VisualLabChoice[]).map((choice) => (
                  <button key={choice} type="button" className={visualLabChoice === choice ? 'active' : ''} onClick={() => chooseVisualLab(choice)} aria-label={`${visualLabChoices[choice].code}: ${visualLabChoices[choice].name}`} aria-pressed={visualLabChoice === choice}>
                    {visualLabChoices[choice].code}
                  </button>
                ))}
              </div>
              <small>{visualLabChoices[visualLabChoice].name}<br />{visualLabChoices[visualLabChoice].note}</small>
            </div>
            <div className="experiment-group experiment-presets">
              <span className="experiment-label">DESIGN SET</span>
              <div>
                {(Object.keys(designPresets) as DesignPresetId[]).map((id) => (
                  <button key={id} type="button" className={activePreset === id ? 'active' : ''} onClick={() => choosePreset(id)} aria-label={`Preset ${id}: TA + ${designPresets[id].name}`} aria-pressed={activePreset === id}>
                    P{id}
                  </button>
                ))}
              </div>
            </div>
            <div className="experiment-group">
              <span className="experiment-label">TYPOGRAPHY</span>
              <div>
                {(Object.keys(fontChoices) as FontChoice[]).map((choice) => (
                  <button key={choice} type="button" className={fontChoice === choice ? 'active' : ''} onClick={() => chooseFont(choice)} aria-label={`Typography ${choice.toUpperCase()}: ${fontChoices[choice].name}`} aria-pressed={fontChoice === choice}>
                    T{choice.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="experiment-group">
              <span className="experiment-label">TYPE SCALE</span>
              <div>
                {(Object.keys(typeScaleChoices) as TypeScaleChoice[]).map((choice) => (
                  <button key={choice} type="button" className={typeScaleChoice === choice ? 'active' : ''} onClick={() => chooseTypeScale(choice)} aria-label={`${typeScaleChoices[choice].code}: ${typeScaleChoices[choice].name}`} aria-pressed={typeScaleChoice === choice}>
                    {typeScaleChoices[choice].code}
                  </button>
                ))}
              </div>
            </div>
            <div className="experiment-group">
              <span className="experiment-label">VISUAL SYSTEM</span>
              <div>
                {(Object.keys(visualChoices) as VisualChoice[]).map((choice) => (
                  <button key={choice} type="button" className={visualChoice === choice ? 'active' : ''} onClick={() => chooseVisual(choice)} aria-label={`${visualChoices[choice].code}: ${visualChoices[choice].name}`} aria-pressed={visualChoice === choice}>
                    {visualChoices[choice].code}
                  </button>
                ))}
              </div>
            </div>
            <div className="experiment-group">
              <span className="experiment-label">MAP STYLE</span>
              <div>
                {(Object.keys(mapChoices) as MapChoice[]).map((choice) => (
                  <button key={choice} type="button" className={mapChoice === choice ? 'active' : ''} onClick={() => chooseMap(choice)} aria-label={`${mapChoices[choice].code}: ${mapChoices[choice].name}`} aria-pressed={mapChoice === choice}>
                    {mapChoices[choice].code}
                  </button>
                ))}
              </div>
            </div>
            <small>{visualLabChoice === 'baseline' ? (activePreset ? `Preset ${activePreset}: ${designPresets[activePreset].name}` : 'Historic custom combination') : 'Integrated lab proposal'}<br />{fontChoices[fontChoice].name}<br />{typeScaleChoices[typeScaleChoice].name}<br />{visualLabChoice === 'baseline' ? visualChoices[visualChoice].name : visualLabChoices[visualLabChoice].name}<br />{visualLabChoice === 'baseline' ? mapChoices[mapChoice].name : labMapChoices[visualLabChoice].name}<br />{fontsReady ? 'fonts ready' : 'loading fonts'}</small>
          </div>
        </section>
      )}

      <section className={`search-shell ${searchOpen ? 'open' : ''}`}>
        <div className="search-input-wrap">
          <Icon name="search" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)} aria-label={t.searchLabel} placeholder={t.searchPlaceholder} />
          {searchOpen && <button className="icon-button small" onClick={() => { setSearchOpen(false); setQuery('') }} aria-label={t.closeSearch}><Icon name="close" /></button>}
        </div>
        {searchOpen && (
          <div className="search-results" role="listbox" aria-label={t.searchResults}>
            <p className="result-count">{results.length ? t.resultCount(results.length) : t.noResults}</p>
            {results.map((building) => {
              const copy = getBuildingCopy(locale, building.id, building.name)
              return (
                <button key={building.id} role="option" aria-selected={building.id === selectedId} onClick={() => chooseBuilding(building, true)}>
                  <span><strong>{copy.name}</strong><small>{copy.architectCredit}</small></span>
                  <Icon name="arrow" />
                </button>
              )
            })}
          </div>
        )}
      </section>

      <button className={`locate-button ${locating ? 'loading' : ''}`} onClick={locate} disabled={locating} aria-label={t.locate}>
        <Icon name="locate" /><span>{locating ? t.locating : t.locate}</span>
      </button>
      <div className="data-note">{t.dataNote}</div>

      {selected && variant === 'a' && !expanded && <PreviewCard building={selected} locale={locale} t={t} onDetails={() => setExpanded(true)} onClose={() => setSelectedId(null)} />}
      {selected && variant === 'a' && expanded && (
        <aside className="detail-panel panel-a" aria-label={t.detailLabel(getBuildingCopy(locale, selected.id, selected.name).name)}>
          <DetailContent building={selected} locale={locale} t={t} onClose={() => setExpanded(false)} />
        </aside>
      )}
      {selected && variant === 'b' && (
        <aside className={`bottom-sheet ${expanded ? 'expanded' : ''}`} aria-label={(expanded ? t.detailLabel : t.sheetPreviewLabel)(getBuildingCopy(locale, selected.id, selected.name).name)}>
          <button className="sheet-handle" onClick={() => setExpanded(!expanded)} aria-label={expanded ? t.collapseDetails : t.expandDetails}><span /></button>
          {expanded
            ? <DetailContent building={selected} locale={locale} t={t} onClose={() => setExpanded(false)} sheet />
            : <PreviewCard building={selected} locale={locale} t={t} onDetails={() => setExpanded(true)} onClose={() => setSelectedId(null)} sheet />}
        </aside>
      )}

      {notice && <div className="notice" role="status">{notice}</div>}
    </main>
  )
}

type LocalizedProps = { building: Building; locale: Locale; t: Translation }

function PreviewCard({ building, locale, t, onDetails, onClose, sheet = false }: LocalizedProps & { onDetails: () => void; onClose: () => void; sheet?: boolean }) {
  const copy = getBuildingCopy(locale, building.id, building.name)
  return (
    <section className={sheet ? 'sheet-preview' : 'preview-card'} aria-label={t.previewLabel(copy.name)}>
      <button className="icon-button close-preview" onClick={onClose} aria-label={t.clearSelection}><Icon name="close" /></button>
      <p className="eyebrow">{t.types[building.buildingType]}</p>
      <h1>{copy.name}</h1>
      <p className="architects">{copy.architectCredit}</p>
      <button className="primary-button" onClick={onDetails}>{t.viewDetails} <Icon name="arrow" /></button>
    </section>
  )
}

function DetailContent({ building, locale, t, onClose, sheet = false }: LocalizedProps & { onClose: () => void; sheet?: boolean }) {
  const copy = getBuildingCopy(locale, building.id, building.name)
  const mapsQuery = encodeURIComponent(`${building.coordinates[1]},${building.coordinates[0]}`)
  const searchQuery = encodeURIComponent(`${copy.name} Singapore architecture`)
  return (
    <div className="detail-content">
      <div className="detail-heading">
        <button className="back-button" onClick={onClose}>{sheet ? t.collapse : t.backToMap}</button>
        <span className="record-index">SGM / {String(buildings.indexOf(building) + 1).padStart(2, '0')}</span>
      </div>
      <div className="image-placeholder" aria-label={t.photoNotPublished}>
        <span>{t.photoOverlay}</span>
        <small>{t.photoPlaceholder}</small>
      </div>
      <p className="eyebrow">{t.types[building.buildingType]}</p>
      <h1>{copy.name}</h1>
      <dl className="facts">
        <div><dt>{t.design}</dt><dd>{copy.architectCredit}</dd></div>
        <div><dt>{t.completion}</dt><dd>{building.completionYear ?? t.unverified}</dd></div>
        <div><dt>{t.type}</dt><dd>{t.types[building.buildingType]}</dd></div>
        <div><dt>{t.address}</dt><dd>{building.address}</dd></div>
      </dl>
      <p className="verification-note">{t.verificationNote}</p>
      <div className="actions">
        <a className="primary-button" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noreferrer">Google Maps <Icon name="external" /></a>
        <a href={`https://www.google.com/search?q=${searchQuery}`} target="_blank" rel="noreferrer">{t.googleSearch} <Icon name="external" /></a>
        <a href={`https://www.google.com/search?tbm=isch&q=${searchQuery}`} target="_blank" rel="noreferrer">{t.imageSearch} <Icon name="external" /></a>
      </div>
      <div className="sources">
        <p>{t.sources}</p>
        <a href={building.officialSource} target="_blank" rel="noreferrer">{t.officialProject} <Icon name="external" /></a>
        <a href={building.coordinateSource} target="_blank" rel="noreferrer">{t.coordinateSource} <Icon name="external" /></a>
      </div>
    </div>
  )
}

export default App
