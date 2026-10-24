import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowSquareOut, CaretDown, Crosshair, MagnifyingGlass, Minus, NavigationArrow, Plus, X } from '@phosphor-icons/react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import data from './data/buildings.json'
import { getBuildingCopy, getLocaleFromPath, localeHref, translations } from './i18n'
import type { RefObject } from 'react'
import type { Locale, Translation } from './i18n'

type Coordinates = [number, number]
type Variant = 'a' | 'b'
type FontChoice = 'a' | 'b' | 'c'
type VisualChoice = 'baseline' | 'cartographic' | 'editorial' | 'civic'
type MapChoice = 'm1' | 'm2' | 'm3'
type TypeScaleChoice = 'current' | 'govuk' | 'sgm'
type DesignPresetId = '1' | '2' | '3'
type VisualLabChoice = 'baseline' | 'signal' | 'tile' | 'orbit'
type ShapeAxis = 'square' | 'round'
type MapColorAxis = 'neutral' | 'colored'
type TypographyAxis = 'light' | 'bold'
type SurfaceAxis = 'flat' | 'layered'
type SpacingAxis = 'compact' | 'spacious'
type ColorSystem = 'civic' | 'graphic' | 'archive'
type IdentityChoice = 'plot' | 'frame' | 'link'
type MapMode = 'colored' | 'mono' | 'satellite'

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

const motionDuration = (duration: number) =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : duration

const revealBuilding = (map: MapLibreMap | null, coordinates: Coordinates, variant: Variant) => {
  if (!map) return
  const wide = window.matchMedia('(min-width: 720px)').matches
  const offset: [number, number] = wide && variant === 'a' ? [210, 0] : [0, variant === 'b' ? -120 : -76]
  map.flyTo({ center: coordinates, zoom: Math.max(map.getZoom(), 14), offset, duration: motionDuration(700) })
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

const visualAxisChoices = {
  colorSystem: {
    label: 'COLOR SYSTEM',
    values: { civic: 'Civic', graphic: 'Graphic', archive: 'Archive' } satisfies Record<ColorSystem, string>,
  },
  identity: {
    label: 'IDENTITY',
    values: { plot: 'Plot', frame: 'Frame', link: 'Link' } satisfies Record<IdentityChoice, string>,
  },
  mapMode: {
    label: 'MAP MODE',
    values: { colored: 'Color', mono: 'Mono', satellite: 'Aerial' } satisfies Record<MapMode, string>,
  },
  shape: {
    label: 'UI SHAPE',
    values: { square: 'Square', round: 'Round' } satisfies Record<ShapeAxis, string>,
  },
  mapColor: {
    label: 'MAP COLOR',
    values: { neutral: 'Neutral', colored: 'Colored' } satisfies Record<MapColorAxis, string>,
  },
  typography: {
    label: 'TYPOGRAPHY',
    values: { light: 'Light', bold: 'Bold' } satisfies Record<TypographyAxis, string>,
  },
  surface: {
    label: 'SURFACE',
    values: { flat: 'Flat', layered: 'Layered' } satisfies Record<SurfaceAxis, string>,
  },
  spacing: {
    label: 'SPACING',
    values: { compact: 'Compact', spacious: 'Spacious' } satisfies Record<SpacingAxis, string>,
  },
}

const axisMapChoices: Record<MapColorAxis, MapPalette> = {
  neutral: {
    code: 'N', name: 'Neutral',
    background: '#eceeeb', residential: '#e8eae7', park: '#dfe4dc', wood: '#d9dfd6', grass: '#e3e7df',
    water: '#dce5e7', waterway: '#9aafb3', roadMinor: '#ffffff', roadMajor: '#f7f6f1', roadMotorway: '#f1eee5', roadCasing: '#bfc4bf',
    building: '#dddcd7', buildingOutline: '#c4c4bf', label: '#2c3531', labelSecondary: '#626b66', labelWater: '#4e6870', labelHalo: '#fafbf8', poiOpacity: .52,
    pin: { default: '#32423c', selected: '#c85f3f', stroke: '#1f2c27', halo: 'rgba(250,251,248,.9)', radius: 5, selectedRadius: 8 },
  },
  colored: {
    code: 'C', name: 'Colored',
    background: '#eef0e8', residential: '#e8ebe4', park: '#c9dfca', wood: '#bfd7c2', grass: '#d9e7d3',
    water: '#bedde6', waterway: '#67a7b7', roadMinor: '#fffdf6', roadMajor: '#f8edd2', roadMotorway: '#f0d8a9', roadCasing: '#aebdb4',
    building: '#ddd8cc', buildingOutline: '#bbb7ab', label: '#203b33', labelSecondary: '#526860', labelWater: '#216b7c', labelHalo: '#fafbf5', poiOpacity: .68,
    pin: { default: '#17697c', selected: '#e5653f', stroke: '#183c3b', halo: 'rgba(250,251,245,.92)', radius: 5.5, selectedRadius: 8.5 },
  },
}

const getAxisValue = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  const value = new URLSearchParams(window.location.search).get(key) as T | null
  return value && allowed.includes(value) ? value : fallback
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

const applyMapTheme = (map: MapLibreMap, choice: MapChoice, labChoice: VisualLabChoice = 'baseline') => {
  applyMapPalette(map, labChoice === 'baseline' ? mapChoices[choice] : labMapChoices[labChoice])
}

const applyAxisMapTheme = (map: MapLibreMap, choice: MapColorAxis) => {
  applyMapPalette(map, axisMapChoices[choice])
}

const applySoftHaloTheme = (map: MapLibreMap, mapColor: MapColorAxis) => {
  if (!map.getLayer('building-points')) return
  const pin = axisMapChoices[mapColor].pin
  map.setPaintProperty('building-halo', 'circle-color', ['case', ['get', 'selected'], pin.selected, pin.default])
  map.setPaintProperty('building-labels', 'text-color', pin.stroke)
  map.setPaintProperty('building-labels', 'text-halo-color', pin.halo)
  map.setPaintProperty('building-points', 'circle-color', ['case', ['get', 'selected'], pin.selected, pin.default])
}

const applyMapMode = (map: MapLibreMap, mode: MapMode) => {
  if (map.getLayer('sgm-satellite')) map.setLayoutProperty('sgm-satellite', 'visibility', mode === 'satellite' ? 'visible' : 'none')
  ;(map.getStyle().layers ?? []).forEach((layer) => {
    if (layer.type === 'symbol' && layer.id.startsWith('poi_')) {
      setPaint(map, layer.id, 'icon-opacity', mode === 'mono' ? .12 : mode === 'satellite' ? 0 : .72)
    }
  })
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

const BrandMark = ({ choice }: { choice: IdentityChoice }) => {
  const drawings = {
    plot: <><path d="M7 7h10v10H7z"/><circle cx="17" cy="7" r="2.25" fill="currentColor" stroke="none"/><path d="M4 20h16"/></>,
    frame: <><path d="M5 10V5h5M14 5h5v5M19 14v5h-5M10 19H5v-5"/><path d="m9 15 6-6"/></>,
    link: <><path d="M4 12h16M12 4v16"/><path d="m6 6 12 12"/><circle cx="12" cy="12" r="3.25" fill="var(--paper-strong)"/></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter">{drawings[choice]}</svg>
}

function App() {
  const locale = useMemo(getLocaleFromPath, [])
  const t = translations[locale]
  const restoredState = useMemo(readRestoredMapState, [])
  const requestedSelectedId = useMemo(getRequestedSelectedId, [])
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const mapChoiceRef = useRef<MapChoice>('m1')
  const typeScaleChoiceRef = useRef<TypeScaleChoice>('sgm')
  const visualLabChoiceRef = useRef<VisualLabChoice>('baseline')
  const mapColorAxisRef = useRef<MapColorAxis>(getAxisValue('mapColor', ['neutral', 'colored'], 'neutral'))
  const variantRef = useRef<Variant>('b')
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const detailBackRef = useRef<HTMLButtonElement>(null)
  const sheetHandleRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(requestedSelectedId ?? restoredState?.selectedId ?? null)
  const [expanded, setExpanded] = useState(getRequestedExpandedState() ?? restoredState?.expanded ?? false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [variant, setVariant] = useState<Variant>(() => {
    const requested = new URLSearchParams(window.location.search).get('ui')
    if (requested === 'a' || requested === 'b') return requested
    return 'b'
  })
  const previousVariantRef = useRef<Variant>(variant)
  const fontChoice: FontChoice = 'a'
  const visualChoice: VisualChoice = 'civic'
  const mapChoice: MapChoice = 'm1'
  const typeScaleChoice: TypeScaleChoice = 'sgm'
  const visualLabChoice: VisualLabChoice = 'baseline'
  const [shapeAxis, setShapeAxis] = useState<ShapeAxis>(() => getAxisValue('shape', ['square', 'round'], 'square'))
  const [mapColorAxis, setMapColorAxis] = useState<MapColorAxis>(() => mapColorAxisRef.current)
  const [typographyAxis, setTypographyAxis] = useState<TypographyAxis>(() => getAxisValue('weight', ['light', 'bold'], 'light'))
  const [surfaceAxis, setSurfaceAxis] = useState<SurfaceAxis>(() => getAxisValue('surface', ['flat', 'layered'], 'flat'))
  const [spacingAxis, setSpacingAxis] = useState<SpacingAxis>(() => getAxisValue('spacing', ['compact', 'spacious'], 'compact'))
  const [colorSystem, setColorSystem] = useState<ColorSystem>(() => getAxisValue('color', ['civic', 'graphic', 'archive'], 'archive'))
  const [identityChoice, setIdentityChoice] = useState<IdentityChoice>(() => getAxisValue('identity', ['plot', 'frame', 'link'], 'plot'))
  const [mapMode, setMapMode] = useState<MapMode>(() => getAxisValue('mapMode', ['colored', 'mono', 'satellite'], 'colored'))
  const [fontsReady, setFontsReady] = useState(false)
  const [comparisonOpen, setComparisonOpen] = useState(false)

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
    if (expanded) {
      detailBackRef.current?.closest('.bottom-sheet, .detail-panel')?.scrollTo({ top: 0 })
      detailBackRef.current?.focus({ preventScroll: true })
    }
  }, [expanded, selectedId])

  useEffect(() => {
    if (locale === 'en') {
      const url = new URL(window.location.href)
      url.searchParams.set('font', fontChoice)
      window.history.replaceState({}, '', url)
    }
    setFontsReady(false)
    const checks = locale === 'ja'
      ? ['400 16px "LINE Seed JP"', '700 16px "LINE Seed JP"']
      : fontChoices[fontChoice].checks
    const sample = locale === 'ja' ? '建築かなカナABC123' : undefined
    const fontSet = document.fonts
    const loading = typeof fontSet.load === 'function'
      ? Promise.all(checks.map((font) => fontSet.load(font, sample)))
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

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      const markerTransition = { duration: motionDuration(150) }
      map.addSource('buildings', { type: 'geojson', data: featureCollection(selectedId, locale) })
      map.addSource('sgm-satellite', {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Imagery &copy; Esri and contributors',
      })
      map.addLayer({
        id: 'building-hit-targets', type: 'circle', source: 'buildings',
        layout: { 'circle-sort-key': ['case', ['get', 'selected'], 1, 0] },
        paint: { 'circle-radius': 22, 'circle-opacity': 0 },
      })
      map.addLayer({
        id: 'building-halo', type: 'circle', source: 'buildings',
        layout: { 'circle-sort-key': ['case', ['get', 'selected'], 1, 0] },
        paint: {
          'circle-radius': ['case', ['get', 'selected'], 24, 18],
          'circle-radius-transition': markerTransition,
          'circle-color': '#32423c',
          'circle-opacity': ['case', ['get', 'selected'], .28, .18],
          'circle-opacity-transition': markerTransition,
          'circle-blur': .72,
        },
      })
      map.addLayer({
        id: 'building-points', type: 'circle', source: 'buildings',
        layout: { 'circle-sort-key': ['case', ['get', 'selected'], 1, 0] },
        paint: {
          'circle-radius': ['case', ['get', 'selected'], 9, 6],
          'circle-radius-transition': markerTransition,
          'circle-color': ['case', ['get', 'selected'], '#c85f3f', '#32423c'],
        },
      })
      map.addLayer({
        id: 'building-labels', type: 'symbol', source: 'buildings', minzoom: 13.2,
        layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.45], 'text-anchor': 'top', 'text-variable-anchor': ['top', 'bottom', 'left', 'right'], 'text-radial-offset': 0.75 },
        paint: { 'text-color': '#282724', 'text-halo-color': '#f8f4ec', 'text-halo-width': 2 },
      })
      map.addLayer({
        id: 'sgm-satellite', type: 'raster', source: 'sgm-satellite',
        layout: { visibility: mapMode === 'satellite' ? 'visible' : 'none' },
        paint: { 'raster-saturation': -.22, 'raster-contrast': .08, 'raster-brightness-max': .9, 'raster-fade-duration': 180 },
      }, 'building-hit-targets')
      applyMapTheme(map, mapChoiceRef.current, visualLabChoiceRef.current)
      applyTypeScaleToMap(map, locale === 'en' ? typeScaleChoiceRef.current : 'current')
      applyAxisMapTheme(map, mapColorAxisRef.current)
      applySoftHaloTheme(map, mapColorAxisRef.current)
      applyMapMode(map, mapMode)
      const deepLinkedBuilding = buildings.find((building) => building.id === requestedSelectedId)
      if (deepLinkedBuilding && !restoredState) {
        window.requestAnimationFrame(() => revealBuilding(map, deepLinkedBuilding.coordinates, variantRef.current))
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
          window.requestAnimationFrame(() => revealBuilding(map, nearest.coordinates, variantRef.current))
        }
      })
      map.on('mouseenter', 'building-hit-targets', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'building-hit-targets', () => { map.getCanvas().style.cursor = '' })
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
    mapColorAxisRef.current = mapColorAxis
    const url = new URL(window.location.href)
    url.searchParams.set('mapColor', mapColorAxis)
    window.history.replaceState({}, '', url)
    const map = mapRef.current
    if (map?.isStyleLoaded()) {
      applyAxisMapTheme(map, mapColorAxis)
      applySoftHaloTheme(map, mapColorAxis)
    }
  }, [mapColorAxis])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('shape', shapeAxis)
    window.history.replaceState({}, '', url)
  }, [shapeAxis])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('weight', typographyAxis)
    window.history.replaceState({}, '', url)
  }, [typographyAxis])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('surface', surfaceAxis)
    window.history.replaceState({}, '', url)
  }, [surfaceAxis])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('spacing', spacingAxis)
    window.history.replaceState({}, '', url)
  }, [spacingAxis])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('color', colorSystem)
    url.searchParams.set('identity', identityChoice)
    window.history.replaceState({}, '', url)
  }, [colorSystem, identityChoice])

  useEffect(() => {
    const derivedMapColor: MapColorAxis = mapMode === 'colored' ? 'colored' : 'neutral'
    mapColorAxisRef.current = derivedMapColor
    setMapColorAxis(derivedMapColor)
    const url = new URL(window.location.href)
    url.searchParams.set('mapMode', mapMode)
    window.history.replaceState({}, '', url)
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    applyAxisMapTheme(map, derivedMapColor)
    applySoftHaloTheme(map, derivedMapColor)
    applyMapMode(map, mapMode)
  }, [mapMode])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('ui', variant)
    window.history.replaceState({}, '', url)
    variantRef.current = variant
    if (previousVariantRef.current !== variant) setExpanded(false)
    previousVariantRef.current = variant
  }, [variant])

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
      if (comparisonOpen) {
        setComparisonOpen(false)
      } else if (searchOpen) {
        setSearchOpen(false)
        searchInputRef.current?.focus()
      } else if (expanded) {
        setExpanded(false)
        window.requestAnimationFrame(() => sheetHandleRef.current?.focus())
      }
    }
    window.addEventListener('keydown', closeLayer)
    return () => window.removeEventListener('keydown', closeLayer)
  }, [comparisonOpen, expanded, searchOpen])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const chooseBuilding = (building: Building, focusMap = false) => {
    setSelectedId(building.id)
    setExpanded(false)
    setSearchOpen(false)
    if (focusMap) revealBuilding(mapRef.current, building.coordinates, variant)
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
        revealBuilding(mapRef.current, location, variant)
        setLocating(false)
        setNotice(t.locationSuccess)
      },
      () => { setLocating(false); setNotice(t.locationFailure) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const axisSettings = [
    { key: 'colorSystem', meta: visualAxisChoices.colorSystem, current: colorSystem, select: (value: string) => setColorSystem(value as ColorSystem) },
    { key: 'identity', meta: visualAxisChoices.identity, current: identityChoice, select: (value: string) => setIdentityChoice(value as IdentityChoice) },
    { key: 'mapMode', meta: visualAxisChoices.mapMode, current: mapMode, select: (value: string) => setMapMode(value as MapMode) },
    { key: 'shape', meta: visualAxisChoices.shape, current: shapeAxis, select: (value: string) => setShapeAxis(value as ShapeAxis) },
    { key: 'typography', meta: visualAxisChoices.typography, current: typographyAxis, select: (value: string) => setTypographyAxis(value as TypographyAxis) },
    { key: 'surface', meta: visualAxisChoices.surface, current: surfaceAxis, select: (value: string) => setSurfaceAxis(value as SurfaceAxis) },
    { key: 'spacing', meta: visualAxisChoices.spacing, current: spacingAxis, select: (value: string) => setSpacingAxis(value as SpacingAxis) },
  ]

  return (
    <main
      className={`app locale-${locale} variant-${variant} ${selected ? 'has-selection' : ''} ${expanded ? 'details-expanded' : ''} visual-study visual-${visualChoice} map-${mapChoice} lab-${visualLabChoice} type-scale-${typeScaleChoice} type-scale-large typography-test font-${fontChoice} color-system-${colorSystem} identity-${identityChoice} map-mode-${mapMode} axis-shape-${shapeAxis} axis-map-${mapColorAxis} axis-type-${typographyAxis} axis-surface-${surfaceAxis} axis-spacing-${spacingAxis}`}
      data-font-ready={fontsReady}
      data-shape={shapeAxis}
      data-map-color={mapColorAxis}
      data-typography={typographyAxis}
      data-surface={surfaceAxis}
      data-spacing={spacingAxis}
    >
      <div ref={mapContainer} className="map" role="region" aria-label={t.mapLabel} />

      <header className="topbar">
        <button className="brand" type="button" onClick={() => mapRef.current?.flyTo({ center: defaultCenter, zoom: defaultZoom })} aria-label={t.resetMap}>
          <span className="brand-mark"><BrandMark choice={identityChoice} /></span>
        </button>
        <div className="top-controls">
          <div className="variant-switch" role="group" aria-label={t.uiSwitcher}>
            <span>UI</span>
            <button className={variant === 'a' ? 'active' : ''} onClick={() => setVariant('a')} aria-pressed={variant === 'a'}>A</button>
            <button className={variant === 'b' ? 'active' : ''} onClick={() => setVariant('b')} aria-pressed={variant === 'b'}>B</button>
          </div>
          <nav className="language-switch" aria-label={t.languageSwitcher}>
            <a className={locale === 'en' ? 'active' : ''} href={localeHref('en', { ui: variant, shape: shapeAxis, mapColor: mapColorAxis, mapMode, color: colorSystem, identity: identityChoice, weight: typographyAxis, surface: surfaceAxis, spacing: spacingAxis, selected: selectedId ?? '', sheet: expanded ? 'expanded' : 'compact' })} hrefLang="en" aria-current={locale === 'en' ? 'page' : undefined} onClick={switchLanguage}>EN</a>
            <a className={locale === 'ja' ? 'active' : ''} href={localeHref('ja', { ui: variant, shape: shapeAxis, mapColor: mapColorAxis, mapMode, color: colorSystem, identity: identityChoice, weight: typographyAxis, surface: surfaceAxis, spacing: spacingAxis, selected: selectedId ?? '', sheet: expanded ? 'expanded' : 'compact' })} hrefLang="ja" aria-current={locale === 'ja' ? 'page' : undefined} onClick={switchLanguage}>JP</a>
          </nav>
        </div>
      </header>

      {locale === 'en' && (
        <section className={`experiment-switch ${comparisonOpen ? 'open' : ''}`} aria-label="Independent visual system comparison axes">
          <button className="experiment-toggle" type="button" onClick={() => setComparisonOpen(!comparisonOpen)} aria-expanded={comparisonOpen} aria-controls="experiment-options">
            <span>SYSTEM LAB</span>
            <strong>{`${colorSystem.slice(0, 1).toUpperCase()} · ${identityChoice.slice(0, 1).toUpperCase()} · ${mapMode === 'colored' ? 'C' : mapMode === 'mono' ? 'M' : 'A'} · UI ${variant.toUpperCase()}`}</strong>
          </button>
          <div className="experiment-options" id="experiment-options" hidden={!comparisonOpen}>
            {axisSettings.map(({ key, meta, current, select }) => {
              return (
                <div className="experiment-group" key={key}>
                  <span className="experiment-label">{meta.label}</span>
                  <div>
                    {Object.entries(meta.values).map(([value, label]) => (
                      <button key={value} type="button" className={current === value ? 'active' : ''} onClick={() => select(value)} aria-pressed={current === value}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            <small>Each axis changes independently.<br />{fontsReady ? 'Hanken Grotesk ready' : 'Loading Hanken Grotesk'}</small>
          </div>
        </section>
      )}

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

      <div className="map-navigation" role="group" aria-label={locale === 'ja' ? '地図の拡大縮小' : 'Map zoom controls'}>
        <button type="button" onClick={() => mapRef.current?.zoomIn({ duration: motionDuration(150) })} aria-label={t.mapControls['NavigationControl.ZoomIn'] ?? 'Zoom in'}>
          <Plus aria-hidden="true" size={20} weight="regular" />
        </button>
        <button type="button" onClick={() => mapRef.current?.zoomOut({ duration: motionDuration(150) })} aria-label={t.mapControls['NavigationControl.ZoomOut'] ?? 'Zoom out'}>
          <Minus aria-hidden="true" size={20} weight="regular" />
        </button>
      </div>
      <button className={`locate-button ${locating ? 'loading' : ''}`} onClick={locate} disabled={locating} aria-label={t.locate}>
        <Crosshair aria-hidden="true" size={20} weight="regular" /><span>{locating ? t.locating : t.locate}</span>
      </button>
      <div className="data-note">{t.dataNote}</div>

      {selected && variant === 'a' && !expanded && <PreviewCard building={selected} locale={locale} t={t} onDetails={() => setExpanded(true)} onClose={() => setSelectedId(null)} />}
      {selected && variant === 'a' && expanded && (
        <aside className="detail-panel panel-a" aria-label={t.detailLabel(getBuildingCopy(locale, selected.id, selected.name).name)}>
          <DetailContent building={selected} locale={locale} t={t} onClose={() => setExpanded(false)} backRef={detailBackRef} />
        </aside>
      )}
      {selected && variant === 'b' && (
        <aside className={`bottom-sheet ${expanded ? 'expanded' : ''}`} aria-label={(expanded ? t.detailLabel : t.sheetPreviewLabel)(getBuildingCopy(locale, selected.id, selected.name).name)}>
          <button ref={sheetHandleRef} className="sheet-handle" onClick={() => setExpanded(!expanded)} aria-label={expanded ? t.collapseDetails : t.expandDetails} aria-expanded={expanded}><span /></button>
          {expanded
            ? <DetailContent building={selected} locale={locale} t={t} onClose={() => { setExpanded(false); window.requestAnimationFrame(() => sheetHandleRef.current?.focus()) }} backRef={detailBackRef} sheet />
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
      <button className="icon-button close-preview" onClick={onClose} aria-label={t.clearSelection}><X aria-hidden="true" size={20} weight="regular" /></button>
      <div className="preview-meta">
        <p className="eyebrow">{t.types[building.buildingType]}</p>
        <span className="record-index">SGM / {String(buildings.indexOf(building) + 1).padStart(2, '0')}</span>
      </div>
      <h1>{copy.name}</h1>
      <p className="architects">{copy.architectCredit}</p>
      <button className="primary-button" onClick={onDetails}>{t.viewDetails} <ArrowRight aria-hidden="true" size={20} weight="regular" /></button>
    </section>
  )
}

function DetailContent({ building, locale, t, onClose, backRef, sheet = false }: LocalizedProps & { onClose: () => void; backRef: RefObject<HTMLButtonElement | null>; sheet?: boolean }) {
  const copy = getBuildingCopy(locale, building.id, building.name)
  const mapsQuery = encodeURIComponent(`${building.coordinates[1]},${building.coordinates[0]}`)
  const searchQuery = encodeURIComponent(`${copy.name} Singapore architecture`)
  return (
    <div className="detail-content">
      <div className="detail-heading">
        <button ref={backRef} className="back-button" onClick={onClose}>
          {sheet ? <CaretDown aria-hidden="true" size={16} weight="regular" /> : <ArrowLeft aria-hidden="true" size={16} weight="regular" />}
          {sheet ? t.collapse : t.backToMap}
        </button>
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
        <a className="primary-button" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noreferrer">Google Maps <NavigationArrow aria-hidden="true" size={20} weight="regular" /></a>
        <a href={`https://www.google.com/search?q=${searchQuery}`} target="_blank" rel="noreferrer">{t.googleSearch} <ArrowSquareOut aria-hidden="true" size={20} weight="regular" /></a>
        <a href={`https://www.google.com/search?tbm=isch&q=${searchQuery}`} target="_blank" rel="noreferrer">{t.imageSearch} <ArrowSquareOut aria-hidden="true" size={20} weight="regular" /></a>
      </div>
      <div className="sources">
        <p>{t.sources}</p>
        <a href={building.officialSource} target="_blank" rel="noreferrer">{t.officialProject} <ArrowSquareOut aria-hidden="true" size={16} weight="regular" /></a>
        <a href={building.coordinateSource} target="_blank" rel="noreferrer">{t.coordinateSource} <ArrowSquareOut aria-hidden="true" size={16} weight="regular" /></a>
      </div>
    </div>
  )
}

export default App
