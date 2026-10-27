import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowSquareOut, CaretDown, Check, Cloud, CloudRain, CloudSun, Compass, Crosshair, Lightning, MagnifyingGlass, NavigationArrow, Sun, X } from '@phosphor-icons/react'
import * as maplibregl from 'maplibre-gl'
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
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
  aliases?: string[]
  architects: string[]
  buildingType: string
  completionYear: number | null
  openingYear?: number
  pdaAwardYear?: number
  pdaAwardDiscipline?: string
  pdaAwardSource?: string
  address: string
  coordinates: Coordinates
  coordinatePrecision: string
  coordinateSource: string
  officialSource: string
  photo: null
  publicAccess: string
}

// Keep building completion, public opening, and design awards as distinct events.
const getOpeningLabel = (building: Building, t: Translation): string =>
  building.buildingType === 'hospitality' ? t.openedHospitality
    : building.buildingType === 'education' ? t.openedEducation
      : t.opened

const yearEvent = (label: string, year: number, locale: Locale): string =>
  locale === 'ja' ? `${year}年${label}` : `${label} ${year}`

const getBuildingYearDetails = (building: Building, locale: Locale, t: Translation) => {
  const primary = building.completionYear != null
    ? yearEvent(t.completed, building.completionYear, locale)
    : building.openingYear != null
      ? yearEvent(getOpeningLabel(building, t), building.openingYear, locale)
      : null
  const details: string[] = []
  if (building.completionYear != null) details.push(yearEvent(t.completed, building.completionYear, locale))
  if (building.openingYear != null && building.openingYear !== building.completionYear)
    details.push(yearEvent(getOpeningLabel(building, t), building.openingYear, locale))
  if (building.pdaAwardYear != null) {
    const award = `P*DA ${locale === 'ja' ? `${building.pdaAwardYear}年` : building.pdaAwardYear}`
    const discipline = building.pdaAwardDiscipline === 'Interior Design' ? ` (${t.awardInterior})` : ''
    details.push(award + discipline)
  }
  return { primary, details }
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
  infrastructure: 'culture_civic',
  mixed_use: 'mixed_use',
  retail: 'commercial',
  office: 'commercial',
  education: 'education',
  hospitality: 'hospitality',
  residential: 'residential',
} as const

type MapCategory = typeof mapCategoryByType[keyof typeof mapCategoryByType]

const mapCategoryStyle: Record<MapCategory, { color: string; icon: string }> = {
  culture_civic: { color: '#A987FF', icon: 'landmark' },
  mixed_use: { color: '#FF8D4F', icon: 'layers' },
  commercial: { color: '#46A5FF', icon: 'building' },
  education: { color: '#FFC341', icon: 'graduation-cap' },
  hospitality: { color: '#FD6360', icon: 'bed' },
  residential: { color: '#5DD089', icon: 'house' },
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
  background: '#fbf8f3', residential: '#eae0d0', park: '#e1ebb0', wood: '#d3e4d5', grass: '#e6eee6',
  water: '#b0d0d6', waterway: '#83b8c4', roadMinor: '#E7E5E0', roadMajor: '#DADCD9', roadMotorway: '#C8D0D2', roadCasing: '#cbd0cd',
  building: '#ded3be', buildingOutline: '#c8ccca', label: '#414744', labelSecondary: '#6b726e', labelWater: '#3f7885', labelHalo: '#ffffff', poiOpacity: .58,
}
// N1b is a comparison palette, not an adopted production Dark theme.
const nightPreviewPalette: MapPalette = {
  background: '#202824', residential: '#202824', park: '#3E5645', wood: '#293D32', grass: '#2B3930',
  water: '#365562', waterway: '#477687', roadMinor: '#46554D', roadMajor: '#586A5F', roadMotorway: '#6C7C72', roadCasing: '#202824',
  building: '#4D5951', buildingOutline: '#4D5951', label: '#D4DDD6', labelSecondary: '#A6B3AA', labelWater: '#85B6C7', labelHalo: '#202824', poiOpacity: .58,
}
const markerFill = '#35946b'
const markerStroke = '#242424'
const markerOutline = '#ffffff'
const markerPixelRatio = 3
const markerSwitchZoom = 13.5
const markerIcon = '#ffffff'
const categoryMarkerIcon = '#212121' // Night preview keeps the existing dark pictogram ink.
const dayCategoryMarkerIcon = '#FFFFFF'
const phosphorBuildingFillPath = 'M232,224H208V32h8a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16h8V224H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM88,56h24a8,8,0,0,1,0,16H88a8,8,0,0,1,0-16Zm0,40h24a8,8,0,0,1,0,16H88a8,8,0,0,1,0-16Zm-8,48a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H88A8,8,0,0,1,80,144Zm72,80H104V184h48Zm16-72H144a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16Zm0-40H144a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16Zm0-40H144a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16Z'
// Restrained line pictograms keep category meaning readable without changing pin shape.
const categoryIconPaths: Record<MapCategory, string> = {
  culture_civic: 'M200-320v-200q0-17 11.5-28.5T240-560q17 0 28.5 11.5T280-520v200q0 17-11.5 28.5T240-280q-17 0-28.5-11.5T200-320Zm240 0v-200q0-17 11.5-28.5T480-560q17 0 28.5 11.5T520-520v200q0 17-11.5 28.5T480-280q-17 0-28.5-11.5T440-320ZM120-120q-17 0-28.5-11.5T80-160q0-17 11.5-28.5T120-200h720q17 0 28.5 11.5T880-160q0 17-11.5 28.5T840-120H120Zm560-200v-200q0-17 11.5-28.5T720-560q17 0 28.5 11.5T760-520v200q0 17-11.5 28.5T720-280q-17 0-28.5-11.5T680-320Zm160-320H116q-15 0-25.5-10.5T80-676v-22q0-11 5.5-19t14.5-13l344-172q17-8 36-8t36 8l342 171q11 5 16.5 15t5.5 21v15q0 17-11.5 28.5T840-640Z', // Material Symbols Rounded Filled: account_balance
  mixed_use: 'M80-200v-560q0-33 23.5-56.5T160-840h240q33 0 56.5 23.5T480-760v80h320q33 0 56.5 23.5T880-600v400q0 33-23.5 56.5T800-120H160q-33 0-56.5-23.5T80-200Zm80 0h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 480h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 480h320v-400H480v80h80v80h-80v80h80v80h-80v80Zm160-240v-80h80v80h-80Zm0 160v-80h80v80h-80Z', // Material Symbols Rounded Filled: domain
  commercial: 'M440-360v-80h80v80h-80Zm-40-360h160v-80H400v80ZM160-120q-33 0-56.5-23.5T80-200v-160h280v40q0 17 11.5 28.5T400-280h160q17 0 28.5-11.5T600-320v-40h280v160q0 33-23.5 56.5T800-120H160ZM80-440v-200q0-33 23.5-56.5T160-720h160v-80q0-33 23.5-56.5T400-880h160q33 0 56.5 23.5T640-800v80h160q33 0 56.5 23.5T880-640v200H600v-40q0-17-11.5-28.5T560-520H400q-17 0-28.5 11.5T360-480v40H80Z', // Material Symbols Rounded Filled: business_center
  education: 'M840-320v-236L518-381q-18 10-38 10t-38-10L104-565q-11-6-15.5-15T84-600q0-11 4.5-20t15.5-15l338-184q9-5 18.5-7.5T480-829q10 0 19.5 2.5T518-819l381 208q10 5 15.5 14.5T920-576v256q0 17-11.5 28.5T880-280q-17 0-28.5-11.5T840-320ZM442-141 242-249q-20-11-31-30t-11-41v-152l242 131q18 10 38 10t38-10l242-131v152q0 22-11 41t-31 30L518-141q-9 5-18.5 7.5T480-131q-10 0-19.5-2.5T442-141Z', // Material Symbols Rounded Filled: school
  hospitality: 'M80-200q-17 0-28.5-11.5T40-240v-520q0-17 11.5-28.5T80-800q17 0 28.5 11.5T120-760v360h320v-240q0-33 23.5-56.5T520-720h240q66 0 113 47t47 113v320q0 17-11.5 28.5T880-200q-17 0-28.5-11.5T840-240v-80H120v80q0 17-11.5 28.5T80-200Zm200-240q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Z', // Material Symbols Rounded Filled: hotel
  residential: 'M160-200v-360q0-19 8.5-36t23.5-28l240-180q21-16 48-16t48 16l240 180q15 11 23.5 28t8.5 36v360q0 33-23.5 56.5T720-120H600q-17 0-28.5-11.5T560-160v-200q0-17-11.5-28.5T520-400h-80q-17 0-28.5 11.5T400-360v200q0 17-11.5 28.5T360-120H240q-33 0-56.5-23.5T160-200Z', // Material Symbols Rounded Filled: home
}

const createBuildingPinSvg = (width: number, height: number, strokeWidth: number, iconSize: number, fill = markerFill, category: MapCategory | null = null, glyphColor = categoryMarkerIcon) => {
  const cx = width / 2
  const iconX = (width - iconSize) / 2
  const iconY = (width <= 28 ? 5 : 9) + (width <= 28 ? 1 : 2)
  const path = [
    `M ${cx} ${height - strokeWidth / 2}`,
    `C ${cx - width * .16} ${height * .84}, ${width * .07} ${height * .68}, ${width * .07} ${height * .44}`,
    `C ${width * .07} ${height * .17}, ${width * .28} ${strokeWidth}, ${cx} ${strokeWidth}`,
    `C ${width * .72} ${strokeWidth}, ${width * .93} ${height * .17}, ${width * .93} ${height * .44}`,
    `C ${width * .93} ${height * .68}, ${cx + width * .16} ${height * .84}, ${cx} ${height - strokeWidth / 2} Z`,
  ].join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * markerPixelRatio}" height="${height * markerPixelRatio}" viewBox="0 0 ${width} ${height}">
    <path d="${path}" fill="${fill}" stroke="${markerOutline}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
    ${category ? `<svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 -960 960 960" fill="${glyphColor}"><path d="${categoryIconPaths[category]}"/></svg>` : `<svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 256 256" fill="${markerIcon}"><path d="${phosphorBuildingFillPath}"/></svg>`}
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

const applyMapStructure = (map: MapLibreMap) => {
  // Liberty's residential land-use polygons reappear below z12 and resemble building footprints.
  // Keep the broad overview neutral; actual buildings remain controlled by z14–15.5.
  if (map.getLayer('landuse_residential')) map.setLayoutProperty('landuse_residential', 'visibility', 'none')
  // Local administrative boundaries are visual clutter in the architecture map.
  // Preserve national and disputed boundaries as separate semantic layers.
  // Preserve only broad administrative boundaries as quiet solid geography.
  // Liberty's default boundary_3 includes fine divisions and conspicuous dashes.
  if (map.getLayer('boundary_3')) {
    map.setFilter('boundary_3', ['all',
      ['>=', ['get', 'admin_level'], 3],
      ['<=', ['get', 'admin_level'], 4],
      ['!=', ['get', 'maritime'], 1],
      ['!=', ['get', 'disputed'], 1],
      ['!', ['has', 'claimed_by']],
    ])
    map.setLayerZoomRange('boundary_3', 5, 13)
    map.setPaintProperty('boundary_3', 'line-dasharray', [1, 0])
    map.setPaintProperty('boundary_3', 'line-width', 0.8)
  }
  // Liberty's 2D buildings otherwise stop at z14 when 3D buildings begin.
  if (map.getLayer('building')) map.setLayerZoomRange('building', 14, 24)
  // Reveal building footprints gradually as the viewer zooms into street scale.
  setPaint(map, 'building', 'fill-opacity', ['interpolate', ['linear'], ['zoom'], 14, 0, 15.5, 1])
  if (map.getLayer('building-3d')) map.setLayoutProperty('building-3d', 'visibility', 'none')

  // Keep line-based water labels subordinate to district names.
  if (map.getLayer('waterway_line_label')) map.setLayoutProperty('waterway_line_label', 'text-size', 12)
  if (map.getLayer('water_name_line_label')) map.setLayoutProperty('water_name_line_label', 'text-size', 13)

  // City labels orient the overview; district and architecture labels lead closer in.
  ;['label_city', 'label_city_capital'].forEach((id) => {
    if (!map.getLayer(id)) return
    map.setLayerZoomRange(id, 3, 12.5)
    // Only Singapore is emphasized; other cities retain the Liberty size scale.
    const singapore: ExpressionSpecification = ['==', ['coalesce', ['get', 'name_en'], ['get', 'name'], ''], 'Singapore']
    map.setLayoutProperty(id, 'text-size', ['interpolate', ['linear'], ['zoom'],
      4, ['case', singapore, 15, id === 'label_city_capital' ? 12 : 11],
      7, ['case', singapore, 19, id === 'label_city_capital' ? 14 : 13],
      11, ['case', singapore, 26, id === 'label_city_capital' ? 20 : 18],
    ])
  })

  // Let district names lead until the viewer zooms closer to street level.
  // Preserve district names as the primary context until architecture markers appear.
  if (map.getLayer('highway-name-major')) map.setLayerZoomRange('highway-name-major', 13.2, 24)
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
  })
}

const applyMapColors = (map: MapLibreMap, palette: MapPalette) => {
  setPaint(map, 'background', 'background-color', palette.background)
  setPaint(map, 'park', 'fill-color', palette.park)
  setPaint(map, 'park_outline', 'line-color', palette.park)
  setPaint(map, 'landcover_wood', 'fill-color', palette.wood)
  setPaint(map, 'landcover_grass', 'fill-color', palette.grass)
  ;['landuse_pitch', 'landuse_track', 'landuse_cemetery', 'landuse_hospital', 'landuse_school'].forEach((id) => setPaint(map, id, 'fill-color', palette.grass))
  setPaint(map, 'water', 'fill-color', palette.water)
  ;['waterway_tunnel', 'waterway_river', 'waterway_other'].forEach((id) => setPaint(map, id, 'line-color', palette.waterway))
  setPaint(map, 'building', 'fill-color', palette.building)
  setPaint(map, 'building', 'fill-outline-color', palette.building)
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
const applyProductionMapTheme = (map: MapLibreMap, nightPreview = false) => {
  const palette = nightPreview ? nightPreviewPalette : productionMapPalette
  applyMapColors(map, palette)
  if (map.getLayer('building-pins')) {
    map.setLayoutProperty('building-pins', 'icon-image', ['concat', nightPreview ? 'building-pin-night-' : 'building-pin-day-', ['coalesce', ['get', 'mapCategory'], 'fallback']])
  }
  // Dark-only overrides for Liberty layers that still have light original paints.
  setPaint(map, 'boundary_3', 'line-color', nightPreview ? '#626A65' : '#B7BBB5')
  if (nightPreview) {
    ;['aeroway_fill', 'landcover_sand', 'landcover_ice'].forEach(id => setPaint(map, id, 'fill-color', '#35413C'))
    ;['aeroway_runway', 'aeroway_taxiway'].forEach(id => setPaint(map, id, 'line-color', '#54605B'))
    ;['boundary_2', 'boundary_disputed'].forEach(id => setPaint(map, id, 'line-color', '#63736A'))
    ;['road_major_rail', 'road_transit_rail', 'bridge_major_rail', 'bridge_transit_rail', 'tunnel_major_rail', 'tunnel_transit_rail'].forEach(id => setPaint(map, id, 'line-color', '#748079'))
    ;['road_major_rail_hatching', 'road_transit_rail_hatching', 'bridge_major_rail_hatching', 'bridge_transit_rail_hatching', 'tunnel_major_rail_hatching', 'tunnel_transit_rail_hatching'].forEach(id => setPaint(map, id, 'line-color', '#748079'))
    setPaint(map, 'landcover_wetland', 'fill-opacity', 0)
    setPaint(map, 'road_area_pattern', 'fill-opacity', 0)
  } else {
    setPaint(map, 'aeroway_fill', 'fill-color', 'rgba(229, 228, 224, 1)')
    setPaint(map, 'landcover_sand', 'fill-color', 'rgba(247, 239, 195, 1)')
    setPaint(map, 'landcover_ice', 'fill-color', 'rgba(224, 236, 236, 1)')
    ;['aeroway_runway', 'aeroway_taxiway'].forEach(id => setPaint(map, id, 'line-color', '#f0ede9'))
    ;['boundary_2', 'boundary_disputed'].forEach(id => setPaint(map, id, 'line-color', 'hsl(248,1%,41%)'))
    ;['road_major_rail', 'road_transit_rail', 'bridge_major_rail', 'bridge_transit_rail', 'tunnel_major_rail', 'tunnel_transit_rail',
      'road_major_rail_hatching', 'road_transit_rail_hatching', 'bridge_major_rail_hatching', 'bridge_transit_rail_hatching', 'tunnel_major_rail_hatching', 'tunnel_transit_rail_hatching'].forEach(id => setPaint(map, id, 'line-color', '#bbb'))
    setPaint(map, 'landcover_wetland', 'fill-opacity', 0.8)
    setPaint(map, 'road_area_pattern', 'fill-opacity', 1)
  }
  if (!map.getLayer('building-labels')) return
  map.setPaintProperty('building-labels', 'text-color', nightPreview ? '#F2F4F0' : markerStroke)
  map.setPaintProperty('building-labels', 'text-halo-color', palette.labelHalo)
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
  const [nightPreview, setNightPreview] = useState(false)
  const [weather, setWeather] = useState<WeatherState>({ temperature: null, condition: null })

  const selected = buildings.find((building) => building.id === selectedId) ?? null
  const surfaceState = expanded ? 'detail' : selected ? 'preview' : searchOpen ? 'search' : 'explore'
  const results = useMemo(() => {
    const normalizeSearch = (value: string) =>
      value.normalize('NFKC').replace(/[‘’]/g, "'").toLocaleLowerCase(locale)
    const normalized = normalizeSearch(query.trim())
    if (!normalized) return buildings
    return buildings.filter((building) => {
      const en = getBuildingCopy('en', building.id, building.name)
      const ja = getBuildingCopy('ja', building.id, building.name)
      const searchable = [
        building.name,
        ...building.architects,
        ...(building.aliases ?? []),
        ...(building.pdaAwardYear != null ? [
          'P*DA', 'PDA',
          `P*DA ${building.pdaAwardYear}`, `PDA ${building.pdaAwardYear}`,
          "President's Design Award",
        ] : []),
        en.name, en.architectCredit,
        ja.name, ja.architectCredit,
      ]
      return normalizeSearch(searchable.join(' ')).includes(normalized)
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
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    applyProductionMapTheme(map, nightPreview)
  }, [nightPreview])

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
      // Apply geographic styling before asynchronous marker SVG decoding.
      // Otherwise Liberty's original buildings and linework can briefly appear.
      applyMapStructure(map)
      applyMapColors(map, productionMapPalette)
      const [normalPin, selectedPin] = await Promise.all([
        loadSvgMarker(createBuildingPinSvg(28, 31, 1.5, 13)),
        loadSvgMarker(createBuildingPinSvg(52, 56, 2, 24)),
      ])
      map.addImage('building-pin-normal', normalPin, { pixelRatio: markerPixelRatio })
      map.addImage('building-pin-selected', selectedPin, { pixelRatio: markerPixelRatio })
      await Promise.all(Object.entries(mapCategoryStyle).map(async ([category, style]) => {
        const [day, night] = await Promise.all([
          loadSvgMarker(createBuildingPinSvg(28, 31, 1.5, 13, style.color, category as MapCategory, dayCategoryMarkerIcon)),
          loadSvgMarker(createBuildingPinSvg(28, 31, 1.5, 13, style.color, category as MapCategory, categoryMarkerIcon)),
        ])
        map.addImage(`building-pin-day-${category}`, day, { pixelRatio: markerPixelRatio })
        map.addImage(`building-pin-night-${category}`, night, { pixelRatio: markerPixelRatio })
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
        layout: { 'icon-image': ['concat', 'building-pin-day-', ['coalesce', ['get', 'mapCategory'], 'fallback']], 'icon-anchor': 'bottom', 'icon-overlap': 'always', 'icon-ignore-placement': true },
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
    element.className = 'sgm-selected-pin'
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
    <main className={`app locale-${locale} state-${surfaceState} ${expanded ? 'details-expanded' : ''} ${nightPreview ? 'night-preview' : ''}`}>
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
          <button type="button" className="appearance-preview-trigger" aria-label={nightPreview ? 'Switch to light map preview' : 'Switch to night map preview'} aria-pressed={nightPreview} onClick={() => setNightPreview(value => !value)}>{nightPreview ? 'Day' : 'Night'}</button>
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
  const { primary: primaryYear } = getBuildingYearDetails(building, locale, t)
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
        {primaryYear && <span className="preview-year">{primaryYear}</span>}
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
  const mapsQuery = encodeURIComponent(`${building.name}, ${building.address}`)
  const searchQuery = encodeURIComponent(`${copy.name} Singapore architecture`)
  const { details: yearDetails } = getBuildingYearDetails(building, locale, t)
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
        {yearDetails.length > 0 && <p className="detail-year">{yearDetails.join(' · ')}</p>}
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
        {building.pdaAwardSource && <a href={building.pdaAwardSource} target="_blank" rel="noreferrer">{t.pdaSourceLabel} <ArrowSquareOut aria-hidden="true" size={16} weight="regular" /></a>}
        <a href={building.coordinateSource} target="_blank" rel="noreferrer">{t.coordinateSource} <ArrowSquareOut aria-hidden="true" size={16} weight="regular" /></a>
      </div>
    </div>
  )
}

export default App
