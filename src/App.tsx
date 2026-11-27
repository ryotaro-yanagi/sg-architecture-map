import { Component, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, ArrowSquareOut, CheckCircle, Cloud, CloudRain, CloudSun, DownloadSimple, Gear, Lightning, MagnifyingGlass, Moon, NavigationArrow, Notebook, ShareNetwork, Sneaker, Sun, X } from '@phosphor-icons/react'
import * as maplibregl from 'maplibre-gl'
import { flushSync } from 'react-dom'
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import data from './data/buildings.json'
import { getBuildingCopy, getLocaleFromPath, localeHref, translations } from './i18n'
import type { ErrorInfo, ReactNode, RefObject } from 'react'
import type { Locale, Translation } from './i18n'
import { parseWeatherPayloads } from './weather'
import type { WeatherState } from './weather'
import ColorLabPanel from './ColorLabPanel'
import { cloneColorTokens, colorTokenCssVariables, readColorLabDraft, saveColorLabDraft } from './colorTokens'
import type { ArchitectureColorTokens, ColorSchemeTokens, ColorTokens } from './colorTokens'
import { categoryColor, getMapCategory, mapCategories } from './buildingCategories'
import { applyRailStationLabels, getCartographyStudyCamera, getCartographyReviewZoom, snapshotCartographyLayers, railStationLabelLayerId } from './cartographyRail'
import { applyMrtPilotAppearance, installMrtPilot, isMrtPilotEnabled } from './mrtPilot'
import { applyMrtNetworkAppearance, installMrtNetwork, isMrtNetworkEnabled } from './mrtNetwork'
import type { MapCategory } from './buildingCategories'
import { addInitialVisitDate, createArchitectureRecordGroups, getWantToVisitBuildings } from './architectureRecord'
import { collectionStateStore } from './collection'
import type { CollectionUpdate } from './collection'
import { canShareRecordFile, createShareRecordFile, generateShareRecordPng, SHARE_RECORD_FILENAME } from './shareRecordExport'

type Coordinates = [number, number]
type Appearance = 'system' | 'day' | 'night'
type InitialMapState = 'loading' | 'fading' | 'hidden' | 'error'
type CollectionTab = 'visited' | 'saved'
const appearanceKey = 'sgm-appearance'
const undatedVisitedIdsThisSession = new Set<string>()
const readAppearance = (): Appearance => {
  try {
    const value = window.localStorage.getItem(appearanceKey)
    return value === 'day' || value === 'night' ? value : 'system'
  } catch { return 'system' }
}
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

const buildings = data.buildings as unknown as Building[]
// Main island, Sentosa and Pulau Ubin; peripheral southern islands are outside this overview.
const overviewBounds: [[number, number], [number, number]] = [[103.62, 1.205], [104.085, 1.465]]
const overviewPadding = { top: 132, right: 18, bottom: 100, left: 18 }
const mapStateKey = 'sgm-language-map-state'
const normalPinWidth = 28
const normalPinHeight = 33
const selectedPinWidth = 58
const selectedPinHeight = 68
const normalPinOutlineWidth = 2
const selectedPinOutlineWidth = 2.5
const normalPinIconSize = 13
const selectedPinIconSize = 26
const distantSelectionZoomThreshold = 12
const distantSelectionTargetZoom = 13.8

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const motionDuration = (duration: number) =>
  prefersReducedMotion() ? 0 : duration

// Approximate a bounce-free, critically damped spring for the panel shell.
// The panel accelerates from rest, carries momentum through the middle,
// then spends the final part of the timeline gently settling into place.
const panelSpringOffsets = [0, 0.06, 0.12, 0.20, 0.30, 0.42, 0.56, 0.72, 0.86, 1]
const panelSpringProgress = (time: number) => {
  const response = 7
  const end = 1 - (1 + response) * Math.exp(-response)
  const x = response * time
  return (1 - (1 + x) * Math.exp(-x)) / end
}
const panelSpringHeightFrames = (from: number, to: number): Keyframe[] =>
  panelSpringOffsets.map((offset) => ({
    height: `${from + (to - from) * panelSpringProgress(offset)}px`,
    offset,
  }))

// Preserve the user's camera when selecting a building. The selected pin
// stays inside the map area that is actually visible around SGM's UI.
const revealBuilding = (
  map: MapLibreMap | null,
  coordinates: Coordinates,
  targetZoom?: number,
) => {
  if (!map) return
  const canvas = map.getCanvas()
  const bounds = canvas.getBoundingClientRect()
  const point = map.project(coordinates)
  const pinHalfWidth = selectedPinWidth / 2
  const pinHeight = selectedPinHeight
  const margin = 24

  // Start with a generous comfort zone so a selected building does not sit
  // against the viewport edge even when no surface overlaps it.
  let left = Math.max(pinHalfWidth + margin, bounds.width * 0.18)
  let right = Math.min(bounds.width - pinHalfWidth - margin, bounds.width * 0.82)
  let top = Math.max(pinHeight + margin, bounds.height * 0.16)
  let bottom = Math.min(bounds.height - margin, bounds.height * 0.84)

  // Keep the pin below the persistent Search + auxiliary-control stack.
  // Measure the visible surfaces rather than the full top UI wrapper.
  const topControls = Array.from(document.querySelectorAll<HTMLElement>('.search-bar, .control-row'))
    .map(element => element.getBoundingClientRect())
    .filter(rect => rect.bottom > bounds.top && rect.top < bounds.bottom)
  if (topControls.length) {
    const controlsBottom = Math.max(...topControls.map(rect => rect.bottom - bounds.top))
    top = Math.max(top, controlsBottom + margin + pinHeight)
  }

  const surface = document.querySelector<HTMLElement>('.bottom-surface')
  const surfaceBounds = surface?.getBoundingClientRect()
  if (surfaceBounds) {
    const surfaceLeft = surfaceBounds.left - bounds.left
    const surfaceRight = surfaceBounds.right - bounds.left
    const surfaceTop = surfaceBounds.top - bounds.top
    const surfaceWidth = surfaceBounds.width
    const surfaceHeight = surfaceBounds.height

    // Read the actual floating panel instead of assuming a mobile bottom sheet
    // or desktop side panel. This keeps camera coordination coupled to the
    // current Visual System geometry.
    if (surfaceWidth >= bounds.width * 0.72) {
      bottom = Math.min(bottom, surfaceTop - margin)
    } else if (surfaceHeight >= bounds.height * 0.72) {
      if (surfaceLeft <= bounds.width / 2) {
        left = Math.max(left, surfaceRight + margin + pinHalfWidth)
      } else {
        right = Math.min(right, surfaceLeft - margin - pinHalfWidth)
      }
    } else {
      const pinOverSurfaceX =
        point.x + pinHalfWidth + margin >= surfaceLeft &&
        point.x - pinHalfWidth - margin <= surfaceRight
      if (pinOverSurfaceX) bottom = Math.min(bottom, surfaceTop - margin)
    }
  }

  // Guard very small viewports from an inverted safe region.
  if (right < left) {
    const centerX = (left + right) / 2
    left = centerX
    right = centerX
  }
  if (bottom < top) {
    const centerY = Math.max(pinHeight + margin, Math.min(bounds.height - margin, (top + bottom) / 2))
    top = centerY
    bottom = centerY
  }

  const outside = point.x < left || point.x > right || point.y < top || point.y > bottom
  const shouldZoom = targetZoom !== undefined && map.getZoom() < targetZoom
  if (!outside && !shouldZoom) return

  // Reframe toward the visual center of the remaining map, preserving zoom,
  // bearing and pitch instead of resetting the user's camera.
  const targetX = (left + right) / 2
  const targetY = (top + bottom) / 2
  if (shouldZoom) {
    map.easeTo({
      center: coordinates,
      zoom: targetZoom,
      offset: [targetX - bounds.width / 2, targetY - bounds.height / 2],
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      duration: motionDuration(760),
      easing: t => t * t * (3 - 2 * t),
      essential: false,
    })
    return
  }
  const dx = point.x - targetX
  const dy = point.y - targetY
  const distance = Math.hypot(dx, dy)
  const center = map.unproject([bounds.width / 2 + dx, bounds.height / 2 + dy])

  if (prefersReducedMotion()) {
    map.jumpTo({ center })
    return
  }
  map.easeTo({
    center,
    duration: Math.min(900, Math.max(420, distance * 1.25)),
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

const getRequestedCollectionState = (): boolean => {
  const params = new URLSearchParams(window.location.search)
  return params.get('view') === 'collection' || params.get('share') === 'record'
}

const getRequestedShareState = (): boolean =>
  getRequestedCollectionState() && new URLSearchParams(window.location.search).get('share') === 'record'
const getRequestedCollectionTab = (): CollectionTab => {
  const params = new URLSearchParams(window.location.search)
  return params.get('share') === 'record' || params.get('collectionTab') === 'visited' ? 'visited' : 'saved'
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

const mapPaletteFromTokens = (tokens: ColorSchemeTokens): MapPalette => ({
  ...tokens.geographic,
  label: tokens.typography.geographicPrimary,
  labelSecondary: tokens.typography.geographicSecondary,
  labelWater: tokens.typography.geographicWater,
  labelHalo: tokens.typography.geographicHalo,
  poiOpacity: .58,
})

const markerPixelRatio = 3
const markerSwitchZoom = 13.5
const singaporeLabelCoordinates: Coordinates = [103.82, 1.36]
const singaporeLabelSourceId = 'singapore-city-label'
const singaporeLabelLayerId = 'label_city_singapore'
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

const createBuildingPinPath = (width: number, height: number, strokeWidth: number) => {
  const inset = strokeWidth / 2
  const topClearance = .25
  const drawableWidth = width - strokeWidth
  const centerX = width / 2
  const topY = inset + topClearance
  const tipY = height - inset
  const sideX = width * .07 + inset
  const headCenterY = topY + drawableWidth * .44
  const headControlY = topY + drawableWidth * .17
  const taperHeight = tipY - headCenterY
  const upperTaperControlY = headCenterY + taperHeight * .43
  const lowerTaperControlY = headCenterY + taperHeight * .71
  return {
    headCenterY,
    path: [
      `M ${centerX} ${tipY}`,
      `C ${centerX - width * .16} ${lowerTaperControlY}, ${sideX} ${upperTaperControlY}, ${sideX} ${headCenterY}`,
      `C ${sideX} ${headControlY}, ${width * .28} ${topY}, ${centerX} ${topY}`,
      `C ${width * .72} ${topY}, ${width - sideX} ${headControlY}, ${width - sideX} ${headCenterY}`,
      `C ${width - sideX} ${upperTaperControlY}, ${centerX + width * .16} ${lowerTaperControlY}, ${centerX} ${tipY} Z`,
    ].join(' '),
  }
}

const createBuildingPinSvg = (
  width: number,
  height: number,
  strokeWidth: number,
  iconSize: number,
  architecture: ArchitectureColorTokens,
  fill = architecture.genericFill,
  category: MapCategory | null = null,
) => {
  const shape = createBuildingPinPath(width, height, strokeWidth)
  const iconX = (width - iconSize) / 2
  const iconY = shape.headCenterY - iconSize / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * markerPixelRatio}" height="${height * markerPixelRatio}" viewBox="0 0 ${width} ${height}">
    <path d="${shape.path}" fill="${fill}" stroke="${architecture.markerOutline}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
    ${category ? `<svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 -960 960 960" fill="${architecture.categoryGlyph}"><path d="${categoryIconPaths[category]}"/></svg>` : `<svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 256 256" fill="${architecture.genericGlyph}"><path d="${phosphorBuildingFillPath}"/></svg>`}
  </svg>`
}
const loadSvgMarker = (svg: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('Failed to load marker SVG'))
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
})

const setMapImage = (map: MapLibreMap, id: string, image: HTMLImageElement) => {
  if (map.hasImage(id)) map.updateImage(id, image)
  else map.addImage(id, image, { pixelRatio: markerPixelRatio })
}

const updateMarkerImages = async (
  map: MapLibreMap,
  tokens: ArchitectureColorTokens,
  scheme: 'day' | 'night',
  isCurrent: () => boolean = () => true,
) => {
  const [normal, selected, ...categoryImages] = await Promise.all([
    loadSvgMarker(createBuildingPinSvg(normalPinWidth, normalPinHeight, normalPinOutlineWidth, normalPinIconSize, tokens)),
    loadSvgMarker(createBuildingPinSvg(selectedPinWidth, selectedPinHeight, selectedPinOutlineWidth, selectedPinIconSize, tokens)),
    ...mapCategories.map((category) => loadSvgMarker(createBuildingPinSvg(
      normalPinWidth,
      normalPinHeight,
      normalPinOutlineWidth,
      normalPinIconSize,
      tokens,
      categoryColor(tokens, category),
      category,
    ))),
  ])
  if (!isCurrent()) return
  setMapImage(map, 'building-pin-normal', normal)
  setMapImage(map, 'building-pin-selected', selected)
  setMapImage(map, `building-pin-${scheme}-fallback`, normal)
  mapCategories.forEach((category, index) => setMapImage(map, `building-pin-${scheme}-${category}`, categoryImages[index]))
}
const legacyComparisonParams = ['ui', 'font', 'visual', 'map', 'scale', 'preset', 'lab', 'shape', 'weight', 'pin', 'surface', 'spacing', 'identity', 'mapMode', 'color', 'mapColor']

const setPaint = (map: MapLibreMap, layerId: string, property: string, value: unknown) => {
  if (map.getLayer(layerId)) map.setPaintProperty(layerId, property as never, value as never)
}

const addSingaporeCityLabel = (map: MapLibreMap, palette: MapPalette) => {
  const excludeSingapore: maplibregl.FilterSpecification = [
    '!=',
    ['coalesce', ['get', 'name_en'], ['get', 'name'], ''],
    'Singapore',
  ]
  ;['label_city', 'label_city_capital', 'label_other'].forEach((id) => {
    if (!map.getLayer(id)) return
    const libertyFilter = map.getFilter(id)
    const filter = (libertyFilter
      ? ['all', libertyFilter, excludeSingapore]
      : excludeSingapore) as maplibregl.FilterSpecification
    map.setFilter(id, filter)
  })

  map.addSource(singaporeLabelSourceId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: { name: 'Singapore' },
      geometry: { type: 'Point', coordinates: singaporeLabelCoordinates },
    },
  })
  map.addLayer({
    id: singaporeLabelLayerId,
    type: 'symbol',
    source: singaporeLabelSourceId,
    // Liberty's country label ends at z9, where this visual-center label takes over.
    minzoom: 9,
    maxzoom: 12.5,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 9, 17, 10, 19, 11, 22, 12, 24, 12.5, 25],
      'text-anchor': 'center',
      'text-justify': 'center',
      'text-max-width': 8,
      'text-padding': 8,
      'text-allow-overlap': true,
      'text-ignore-placement': false,
    },
    paint: {
      'text-color': palette.label,
      'text-halo-color': palette.labelHalo,
      'text-halo-width': 1.25,
      'text-halo-blur': 1,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.9, 9.35, 1, 12, 1, 12.5, 0],
    },
  }, map.getLayer('label_city') ? 'label_city' : undefined)
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
  // Reveal building footprints before architecture pins; at the distant-selection
  // destination (z13.8), the surrounding built fabric should already be visible.
  if (map.getLayer('building')) map.setLayerZoomRange('building', 13.2, 24)
  // Keep the same short, zoom-driven fade rather than adding a new visibility mode.
  setPaint(map, 'building', 'fill-opacity', ['interpolate', ['linear'], ['zoom'], 13.2, 0, 13.4, 1])
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
  // Introduce major road names before building footprints at district scale.
  if (map.getLayer('highway-name-major')) map.setLayerZoomRange('highway-name-major', 12.5, 24)
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
  // Restore named rail stations only; retain the general POI suppression.
  applyRailStationLabels(map)
}

const applyMapColors = (map: MapLibreMap, palette: MapPalette) => {
  setPaint(map, 'background', 'background-color', palette.background)
  setPaint(map, 'park', 'fill-color', palette.park)
  setPaint(map, 'park_outline', 'line-color', palette.park)
  setPaint(map, 'landcover_wood', 'fill-color', palette.wood)
  setPaint(map, 'landcover_grass', 'fill-color', palette.grass)
  ;['landuse_pitch', 'landuse_track', 'landuse_cemetery', 'landuse_hospital', 'landuse_school'].forEach((id) => setPaint(map, id, 'fill-color', palette.grass))
  setPaint(map, 'water', 'fill-color', palette.water)
  // Keep water boundaries consistent with the same OpenMapTiles water polygons.
  setPaint(map, 'water', 'fill-outline-color', palette.waterway)
  setPaint(map, 'landuse_residential', 'fill-color', palette.residential)
  ;['waterway_tunnel', 'waterway_river', 'waterway_other'].forEach((id) => setPaint(map, id, 'line-color', palette.waterway))
  setPaint(map, 'building', 'fill-color', palette.building)
  setPaint(map, 'building', 'fill-outline-color', palette.buildingOutline)
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
      if (isPoi) setPaint(map, id, 'text-opacity', id === railStationLabelLayerId ? 0.75 : palette.poiOpacity)
    }
  })
}
const applyMapTheme = (map: MapLibreMap, tokens: ColorSchemeTokens, nightPreview = false) => {
  const palette = mapPaletteFromTokens(tokens)
  applyMapColors(map, palette)
  // Day: use the chosen landcover palette directly, without Liberty's inherited alpha blending.
  // Night keeps its previous softer landcover opacity until its palette is evaluated separately.
  setPaint(map, 'park', 'fill-opacity', nightPreview ? 0.7 : 1)
  setPaint(map, 'landcover_wood', 'fill-opacity', nightPreview ? 0.4 : 1)
  setPaint(map, 'landcover_grass', 'fill-opacity', nightPreview ? 0.3 : 1)
  if (map.getLayer('building-pins')) {
    map.setLayoutProperty('building-pins', 'icon-image', ['concat', nightPreview ? 'building-pin-night-' : 'building-pin-day-', ['coalesce', ['get', 'mapCategory'], 'fallback']])
  }
  // Keep transport geometry legible while reducing fine-pattern noise in Night.
  // Restore the original visibility hierarchy when returning to Day.
  const railLines = ['road_major_rail', 'road_transit_rail', 'bridge_major_rail', 'bridge_transit_rail', 'tunnel_major_rail', 'tunnel_transit_rail']
  railLines.forEach(id => {
    setPaint(map, id, 'line-opacity', nightPreview ? 0.72 : 1)
    setPaint(map, `${id}_hatching`, 'line-opacity', nightPreview ? 0.16 : 0.4)
  })
  ;['road_path_pedestrian', 'bridge_path_pedestrian'].forEach(id =>
    setPaint(map, id, 'line-opacity', nightPreview ? 0.28 : 0.45))
  setPaint(map, 'tunnel_path_pedestrian', 'line-opacity', nightPreview ? 0.3 : 0.45)
  // Replace Liberty's repeated wetland sprite with a quiet flat cartographic fill.
  // Keep the wetland polygons intact in both modes, unlike hiding the layer at night.
  setPaint(map, 'landcover_wetland', 'fill-pattern', null)
  setPaint(map, 'landcover_wetland', 'fill-color', nightPreview ? '#33463A' : '#DCE7CF')
  // Dark-only overrides for Liberty layers that still have light original paints.
  setPaint(map, 'boundary_3', 'line-color', nightPreview ? '#626A65' : '#B7BBB5')
  if (nightPreview) {
    ;['aeroway_fill', 'landcover_ice'].forEach(id => setPaint(map, id, 'fill-color', '#35413C'))
    setPaint(map, 'landcover_sand', 'fill-color', '#343D37')
    ;['aeroway_runway', 'aeroway_taxiway'].forEach(id => setPaint(map, id, 'line-color', '#54605B'))
    ;['boundary_2', 'boundary_disputed'].forEach(id => setPaint(map, id, 'line-color', '#63736A'))
    ;['road_major_rail', 'road_transit_rail', 'bridge_major_rail', 'bridge_transit_rail', 'tunnel_major_rail', 'tunnel_transit_rail'].forEach(id => setPaint(map, id, 'line-color', '#748079'))
    ;['road_major_rail_hatching', 'road_transit_rail_hatching', 'bridge_major_rail_hatching', 'bridge_transit_rail_hatching', 'tunnel_major_rail_hatching', 'tunnel_transit_rail_hatching'].forEach(id => setPaint(map, id, 'line-color', '#748079'))
    setPaint(map, 'landcover_wetland', 'fill-opacity', 1)
    setPaint(map, 'road_area_pattern', 'fill-opacity', 0)
  } else {
    setPaint(map, 'aeroway_fill', 'fill-color', 'rgba(229, 228, 224, 1)')
    setPaint(map, 'landcover_sand', 'fill-color', '#EEE9DC')
    setPaint(map, 'landcover_ice', 'fill-color', 'rgba(224, 236, 236, 1)')
    ;['aeroway_runway', 'aeroway_taxiway'].forEach(id => setPaint(map, id, 'line-color', '#f0ede9'))
    ;['boundary_2', 'boundary_disputed'].forEach(id => setPaint(map, id, 'line-color', 'hsl(248,1%,41%)'))
    ;['road_major_rail', 'road_transit_rail', 'bridge_major_rail', 'bridge_transit_rail', 'tunnel_major_rail', 'tunnel_transit_rail',
      'road_major_rail_hatching', 'road_transit_rail_hatching', 'bridge_major_rail_hatching', 'bridge_transit_rail_hatching', 'tunnel_major_rail_hatching', 'tunnel_transit_rail_hatching'].forEach(id => setPaint(map, id, 'line-color', '#bbb'))
    setPaint(map, 'landcover_wetland', 'fill-opacity', 1)
    setPaint(map, 'road_area_pattern', 'fill-opacity', 1)
  }
  // Night: quieter halos by semantic text role, not one size for every label.
  // Explicit Day values restore the existing cartography when switching back.
  if (nightPreview) {
    ;['label_city', 'label_city_capital', singaporeLabelLayerId].forEach(id => {
      setPaint(map, id, 'text-halo-width', 1.1)
      setPaint(map, id, 'text-halo-blur', 0.5)
    })
    ;['label_town', 'label_village', 'label_neighbourhood', 'label_suburb', 'label_state'].forEach(id => {
      setPaint(map, id, 'text-halo-width', 0.85)
      setPaint(map, id, 'text-halo-blur', 0.4)
    })
    ;['highway-name', 'railway', 'airport'].forEach(id => {
      setPaint(map, id, 'text-halo-width', 0.7)
      setPaint(map, id, 'text-halo-blur', 0.3)
    })
  } else {
    ;['label_city', 'label_city_capital', singaporeLabelLayerId, 'label_town', 'label_village',
      'label_neighbourhood', 'label_suburb', 'label_state', 'highway-name',
      'railway', 'airport'].forEach(id => {
      setPaint(map, id, 'text-halo-width', 1.25)
      setPaint(map, id, 'text-halo-blur', 1)
    })
  }
  if (!map.getLayer('building-labels')) return
  map.setPaintProperty('building-labels', 'text-color', tokens.typography.architectureLabel)
  map.setPaintProperty('building-labels', 'text-halo-color', palette.labelHalo)
  map.setPaintProperty('building-labels', 'text-halo-width', nightPreview ? 0.85 : 1)
  map.setPaintProperty('building-labels', 'text-halo-blur', nightPreview ? 0.35 : 0)
}

const applyProductionTypeScaleToMap = (map: MapLibreMap) => {
  if (!map.getLayer('building-labels')) return
  map.setLayoutProperty('building-labels', 'text-size', 13)
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

const featureCollection = (selectedId: string | null, locale: Locale, architecture: ArchitectureColorTokens): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: buildings.map((building) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: building.coordinates },
    properties: {
      id: building.id,
      name: getBuildingCopy(locale, building.id, building.name).name,
      selected: building.id === selectedId,
      mapCategory: getMapCategory(building.buildingType),
      mapCategoryColor: getMapCategory(building.buildingType) ? categoryColor(architecture, getMapCategory(building.buildingType)!) : null,
    },
  })),
})

const BrandMark = () => <img src="../sma-island-symbol-v2.svg" alt="" aria-hidden="true" />

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
  const loadingAnimationDelay = useMemo(() => `-${performance.now() % 600}ms`, [])
  const t = translations[locale]
  const nextLocale: Locale = locale === 'en' ? 'ja' : 'en'
  const restoredState = useMemo(readRestoredMapState, [])
  const requestedSelectedId = useMemo(getRequestedSelectedId, [])
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const userMarkerZoomCleanupRef = useRef<(() => void) | null>(null)
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null)
  const detailBackRef = useRef<HTMLButtonElement>(null)
  const visitTriggerRef = useRef<HTMLButtonElement>(null)
  const notebookTriggerRef = useRef<HTMLButtonElement>(null)
  const searchTriggerRef = useRef<HTMLButtonElement>(null)
  const settingsTriggerRef = useRef<HTMLButtonElement>(null)
  const settingsDialogRef = useRef<HTMLDialogElement>(null)
  const settingsTitleRef = useRef<HTMLHeadingElement>(null)
  const collectionOriginRef = useRef<CollectionTab>(getRequestedCollectionTab())
  const collectionCloseRef = useRef<HTMLButtonElement>(null)
  const shareTriggerRef = useRef<HTMLButtonElement>(null)
  const shareCloseRef = useRef<HTMLButtonElement>(null)
  const collectionFocusTargetRef = useRef<'trigger' | 'preview' | 'share' | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const previewSurfaceRef = useRef<HTMLDivElement>(null)
  const previewContentRef = useRef<HTMLDivElement>(null)
  const detailContentRef = useRef<HTMLDivElement>(null)
  const previewReleaseAnimationRef = useRef<Animation | null>(null)
  const previewReleaseTargetRef = useRef<string | null>(null)
  const panelDepthAnimationsRef = useRef<Animation[]>([])
  const panelDepthTransitionIdRef = useRef(0)
  const [selectedId, setSelectedId] = useState<string | null>(requestedSelectedId ?? restoredState?.selectedId ?? null)
  const [expanded, setExpanded] = useState(getRequestedExpandedState() ?? restoredState?.expanded ?? false)
  const selectedIdRef = useRef(selectedId)
  const expandedRef = useRef(expanded)
  selectedIdRef.current = selectedId
  expandedRef.current = expanded
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [collectionOpen, setCollectionOpen] = useState(getRequestedCollectionState)
  const [collectionTab, setCollectionTab] = useState<CollectionTab>(getRequestedCollectionTab)
  const [shareOpen, setShareOpen] = useState(getRequestedShareState)
  const collectionOpenRef = useRef(collectionOpen)
  const shareOpenRef = useRef(shareOpen)
  collectionOpenRef.current = collectionOpen
  shareOpenRef.current = shareOpen
  const [locating, setLocating] = useState(false)
  const [mapBearing, setMapBearing] = useState(restoredState?.bearing ?? 0)
  const [notice, setNotice] = useState<string | null>(null)
  const [appearance, setAppearance] = useState<Appearance>(readAppearance)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [initialMapState, setInitialMapState] = useState<InitialMapState>('loading')
  const nightPreview = appearance === 'night' || (appearance === 'system' && systemDark)
  const activeScheme = nightPreview ? 'night' : 'day'
  const colorLabEnabled = useMemo(
    () => (import.meta.env.DEV || import.meta.env.VITE_ENABLE_COLOR_LAB === 'true') && new URLSearchParams(window.location.search).get('lab') === 'color',
    [],
  )
  const [colorTokens, setColorTokens] = useState<ColorTokens>(() =>
    colorLabEnabled ? readColorLabDraft() : cloneColorTokens(),
  )
  useEffect(() => {
    if (colorLabEnabled) saveColorLabDraft(colorTokens)
  }, [colorLabEnabled, colorTokens])
  const activeColorTokens = colorTokens[activeScheme]
  const activeArchitecture = activeColorTokens.architecture
  const colorTokensRef = useRef(colorTokens)
  const markerUpdateIdRef = useRef(0)
  colorTokensRef.current = colorTokens
  // Async MapLibre style/image loading must use the latest requested appearance.
  const nightPreviewRef = useRef(nightPreview)
  nightPreviewRef.current = nightPreview
  const [weather, setWeather] = useState<WeatherState>({ temperature: null, condition: null })

  const selected = buildings.find((building) => building.id === selectedId) ?? null
  const surfaceState = collectionOpen ? 'collection' : expanded ? 'detail' : selected ? 'preview' : searchOpen ? 'search' : 'explore'
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
  const hasSearchQuery = query.trim().length > 0

  const openCollection = (tab: CollectionTab) => {
    collectionOriginRef.current = tab
    setCollectionTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'collection')
    url.searchParams.set('collectionTab', tab)
    url.searchParams.delete('share')
    window.history.pushState({ ...window.history.state, sgmCollection: true }, '', url)
    setSearchOpen(false)
    setQuery('')
    searchInputRef.current?.blur()
    collectionFocusTargetRef.current = null
    setCollectionOpen(true)
  }

  const closeCollection = () => {
    collectionFocusTargetRef.current = 'trigger'
    if (window.history.state?.sgmCollection) {
      window.history.back()
      return
    }
    const url = new URL(window.location.href)
    url.searchParams.delete('view')
    url.searchParams.delete('collectionTab')
    url.searchParams.delete('share')
    window.history.replaceState({ ...window.history.state, sgmCollection: false, sgmShare: false }, '', url)
    setShareOpen(false)
    setCollectionOpen(false)
  }

  const openShareRecord = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'collection')
    url.searchParams.set('collectionTab', 'visited')
    url.searchParams.set('share', 'record')
    setCollectionTab('visited')
    window.history.pushState({ ...window.history.state, sgmCollection: true, sgmShare: true }, '', url)
    setShareOpen(true)
  }

  const closeShareRecord = () => {
    collectionFocusTargetRef.current = 'share'
    if (window.history.state?.sgmShare) {
      window.history.back()
      return
    }
    const url = new URL(window.location.href)
    url.searchParams.delete('share')
    url.searchParams.set('collectionTab', 'visited')
    window.history.replaceState({ ...window.history.state, sgmShare: false }, '', url)
    setShareOpen(false)
  }

  const chooseCollectionBuilding = (building: Building, keyboardActivated: boolean) => {
    const url = new URL(window.location.href)
    url.searchParams.delete('view')
    url.searchParams.delete('collectionTab')
    url.searchParams.delete('share')
    url.searchParams.set('selected', building.id)
    url.searchParams.set('sheet', 'compact')
    window.history.replaceState({ ...window.history.state, sgmCollection: false, sgmShare: false }, '', url)
    collectionFocusTargetRef.current = keyboardActivated ? 'preview' : null
    setShareOpen(false)
    setCollectionOpen(false)
    setSelectedId(building.id)
    setExpanded(false)
    window.requestAnimationFrame(() => revealBuilding(mapRef.current, building.coordinates))
  }

  const releasePreview = () => {
    const surface = previewSurfaceRef.current
    const releasingId = selectedIdRef.current
    const finish = () => {
      if (selectedIdRef.current !== releasingId) return
      previewReleaseAnimationRef.current = null
      previewReleaseTargetRef.current = null
      setSelectedId(null)
      setExpanded(false)
      setSearchOpen(false)
      setQuery('')
      searchInputRef.current?.blur()
    }

    if (!surface || expandedRef.current || !releasingId) {
      finish()
      return
    }

    previewReleaseAnimationRef.current?.cancel()
    const animation = surface.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      {
        duration: prefersReducedMotion() ? 80 : 140,
        easing: prefersReducedMotion() ? 'linear' : 'cubic-bezier(.2, 0, 1, .9)',
        fill: 'forwards',
      },
    )
    previewReleaseAnimationRef.current = animation
    previewReleaseTargetRef.current = releasingId
    animation.addEventListener('finish', finish, { once: true })
  }

  useEffect(() => {
    const target = previewReleaseTargetRef.current
    if (!target || target === selectedId) return
    previewReleaseAnimationRef.current?.cancel()
    previewReleaseAnimationRef.current = null
    previewReleaseTargetRef.current = null
  }, [selectedId])

  const transitionSurfaceDepth = (toExpanded: boolean, keyboardActivated = false) => {
    const surface = previewSurfaceRef.current
    const outgoing = toExpanded ? previewContentRef.current : detailContentRef.current
    const incoming = toExpanded ? detailContentRef.current : previewContentRef.current
    if (!surface || !outgoing || !incoming || expandedRef.current === toExpanded) return

    const transitionId = ++panelDepthTransitionIdRef.current
    panelDepthAnimationsRef.current.forEach(animation => animation.cancel())
    panelDepthAnimationsRef.current = []

    const first = surface.getBoundingClientRect()
    const reduced = prefersReducedMotion()

    outgoing.style.opacity = '1'
    incoming.style.opacity = '0'

    const activeBeforeTransition = document.activeElement
    flushSync(() => setExpanded(toExpanded))
    const last = surface.getBoundingClientRect()

    if (keyboardActivated) {
      window.requestAnimationFrame(() => {
        if (toExpanded) {
          detailBackRef.current?.focus({ preventScroll: true })
        } else {
          previewContentRef.current?.querySelector<HTMLButtonElement>('.preview-details')?.focus({ preventScroll: true })
        }
      })
    } else if (activeBeforeTransition instanceof HTMLElement && outgoing.contains(activeBeforeTransition)) {
      activeBeforeTransition.blur()
    }

    if (reduced) {
      const outgoingFade = outgoing.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 60,
        easing: 'linear',
        fill: 'forwards',
      })
      panelDepthAnimationsRef.current = [outgoingFade]
      outgoingFade.addEventListener('finish', () => {
        if (panelDepthTransitionIdRef.current !== transitionId) return
        outgoing.style.removeProperty('opacity')
        const incomingFade = incoming.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 80,
          easing: 'linear',
          fill: 'forwards',
        })
        panelDepthAnimationsRef.current = [incomingFade]
        incomingFade.addEventListener('finish', () => {
          if (panelDepthTransitionIdRef.current !== transitionId) return
          incoming.style.removeProperty('opacity')
          incomingFade.cancel()
          panelDepthAnimationsRef.current = []
        }, { once: true })
      }, { once: true })
      return
    }

    const duration = toExpanded ? 280 : 240
    const shell = surface.animate(
      panelSpringHeightFrames(first.height, last.height),
      {
        duration,
        easing: 'linear',
        fill: 'both',
      },
    )
    const outgoingFade = outgoing.animate(
      [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.12, easing: 'cubic-bezier(.2, 0, 1, .9)' },
        { opacity: 0, offset: 0.42 },
        { opacity: 0, offset: 1 },
      ],
      {
        duration,
        easing: 'linear',
        fill: 'forwards',
      },
    )
    const incomingFade = incoming.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: 0.32, easing: 'cubic-bezier(0, 0, .38, .9)' },
        { opacity: 1, offset: 0.78 },
        { opacity: 1, offset: 1 },
      ],
      {
        duration,
        easing: 'linear',
        fill: 'forwards',
      },
    )
    panelDepthAnimationsRef.current = [shell, outgoingFade, incomingFade]

    shell.addEventListener('finish', () => {
      if (panelDepthTransitionIdRef.current !== transitionId) return
      outgoing.style.removeProperty('opacity')
      incoming.style.removeProperty('opacity')
      panelDepthAnimationsRef.current.forEach(animation => animation.cancel())
      panelDepthAnimationsRef.current = []
    }, { once: true })
  }

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
    const preference = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setSystemDark(preference.matches)
    preference.addEventListener('change', sync)
    return () => preference.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.appearance = nightPreview ? 'night' : 'day'
    document.documentElement.style.backgroundColor = activeColorTokens.neutral.canvas
    document.body.style.backgroundColor = activeColorTokens.neutral.canvas
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', activeColorTokens.neutral.canvas)
  }, [activeColorTokens.neutral.canvas, nightPreview])

  useEffect(() => {
    if (initialMapState !== 'fading') return
    const timer = window.setTimeout(
      () => setInitialMapState('hidden'),
      prefersReducedMotion() ? 0 : 240,
    )
    return () => window.clearTimeout(timer)
  }, [initialMapState])

  const selectAppearance = (nextAppearance: 'day' | 'night') => {
    setAppearance(nextAppearance)
    try { window.localStorage.setItem(appearanceKey, nextAppearance) } catch { /* Private browsing can restrict storage. */ }
  }

  const toggleAppearance = () => {
    selectAppearance(nightPreview ? 'day' : 'night')
  }

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('building-pins')) return
    applyMapTheme(map, activeColorTokens, nightPreview)
    if (isMrtNetworkEnabled(window.location.search)) applyMrtNetworkAppearance(map, nightPreview ? 'night' : 'day')
    else if (isMrtPilotEnabled(window.location.search)) applyMrtPilotAppearance(map, nightPreview ? 'night' : 'day')
  }, [activeColorTokens, nightPreview])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('building-pins')) return
    const updateId = ++markerUpdateIdRef.current
    void updateMarkerImages(map, activeArchitecture, activeScheme, () => (
      markerUpdateIdRef.current === updateId && mapRef.current === map
    )).then(() => {
      if (markerUpdateIdRef.current === updateId && mapRef.current === map) map.triggerRepaint()
    })
    const source = map.getSource('buildings') as GeoJSONSource | undefined
    source?.setData(featureCollection(selectedIdRef.current, locale, activeArchitecture))
    setPaint(map, 'building-dots', 'circle-color', ['coalesce', ['get', 'mapCategoryColor'], activeArchitecture.genericFill])
    setPaint(map, 'building-dots', 'circle-stroke-color', activeArchitecture.markerOutline)
    return () => { markerUpdateIdRef.current += 1 }
  }, [activeArchitecture, activeScheme, locale])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = 'ltr'
    const url = new URL(window.location.href)
    legacyComparisonParams.forEach((param) => {
      if (param !== 'lab' || !colorLabEnabled) url.searchParams.delete(param)
    })
    window.history.replaceState({}, '', url)
  }, [colorLabEnabled, locale])

  useEffect(() => {
    if (expanded) {
      detailBackRef.current?.closest('.sheet-expanded')?.scrollTo({ top: 0 })
    }
  }, [expanded, selectedId])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    setInitialMapState('loading')
    let disposed = false
    let disposeMrtNetwork: (() => void) | null = null
    let readyTimeout: number | undefined

    const finishInitialLoad = () => {
      if (disposed) return
      if (readyTimeout !== undefined) window.clearTimeout(readyTimeout)
      setInitialMapState('fading')
    }

    let map: MapLibreMap
    try {
      // Opt-in comparison camera for this experiment; the normal opening
      // view remains unchanged without ?cartographyPreview=marina.
      const reviewParams = new URLSearchParams(window.location.search)
      const studyCamera = getCartographyStudyCamera(reviewParams.get('cartographyPreview'))
      const reviewZoom = studyCamera ? getCartographyReviewZoom(reviewParams.get('cartographyZoom')) : null
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        // An explicit comparison URL overrides a saved camera to make A/B reliable.
        ...(studyCamera
          ? { center: studyCamera.center, zoom: reviewZoom ?? studyCamera.zoom }
          : restoredState
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
    } catch {
      setInitialMapState('error')
      return
    }

    readyTimeout = window.setTimeout(() => {
      if (!disposed) setInitialMapState('error')
    }, 15000)

    map.addControl(new maplibregl.AttributionControl({
      compact: true,
      ...(isMrtNetworkEnabled(window.location.search)
        ? { customAttribution: 'MRT data: <a href="https://datamall.lta.gov.sg/" target="_blank" rel="noopener noreferrer">LTA</a> (Singapore Open Data Licence)' }
        : {}),
    }), 'bottom-left')

    map.on('load', async () => {
      // Apply geographic styling before asynchronous marker SVG decoding.
      // Otherwise Liberty's original buildings and linework can briefly appear.
      const initialScheme = nightPreviewRef.current ? 'night' : 'day'
      const initialTokens = colorTokensRef.current[initialScheme]
      const shouldAuditCartography = import.meta.env.DEV &&
        new URLSearchParams(window.location.search).get('cartographyAudit') === '1'
      const originalLayerState = shouldAuditCartography ? snapshotCartographyLayers(map) : null
      applyMapStructure(map)
      addSingaporeCityLabel(map, mapPaletteFromTokens(initialTokens))
      applyMapColors(map, mapPaletteFromTokens(initialTokens))
      await Promise.all([
        updateMarkerImages(map, colorTokensRef.current.day.architecture, 'day'),
        updateMarkerImages(map, colorTokensRef.current.night.architecture, 'night'),
      ])
      // The full network and five-station pilot are independent opt-in variants.
      // Never mount both together; default remains v0.1 railway names.
      if (isMrtNetworkEnabled(window.location.search)) {
        try {
          disposeMrtNetwork = installMrtNetwork(map, colorTokensRef.current, initialScheme)
        } catch (error) {
          console.warn('MRT v0.3 network preview unavailable:', error)
        }
      } else if (isMrtPilotEnabled(window.location.search)) {
        try {
          await installMrtPilot(map, colorTokensRef.current, initialScheme)
        } catch (error) {
          console.warn('MRT v0.2 caplet prototype unavailable:', error)
        }
      }
      map.addSource('buildings', { type: 'geojson', data: featureCollection(selectedId, locale, initialTokens.architecture) })
      map.addLayer({
        id: 'building-hit-targets', type: 'circle', source: 'buildings',
        layout: { 'circle-sort-key': ['case', ['get', 'selected'], 1, 0] },
        paint: { 'circle-radius': 26, 'circle-opacity': 0 },
      })
      map.addLayer({
        id: 'building-dots', type: 'circle', source: 'buildings', maxzoom: markerSwitchZoom,
        filter: ['==', ['get', 'selected'], false],
        paint: {
          // Keep overview dots quiet while retaining category colors and touch targets.
          'circle-radius': 4.5,
          'circle-color': ['coalesce', ['get', 'mapCategoryColor'], initialTokens.architecture.genericFill],
          'circle-stroke-color': initialTokens.architecture.markerOutline,
          'circle-stroke-width': 0.75,
          'circle-opacity': 1,
        },
      })
      map.addLayer({
        id: 'building-pins', type: 'symbol', source: 'buildings', minzoom: markerSwitchZoom,
        filter: ['==', ['get', 'selected'], false],
        layout: { 'icon-image': ['concat', 'building-pin-day-', ['coalesce', ['get', 'mapCategory'], 'fallback']], 'icon-anchor': 'bottom', 'icon-overlap': 'always', 'icon-ignore-placement': false },
        paint: { 'icon-opacity': 1 },
      })
      map.addLayer({
        id: 'building-pin-selected', type: 'symbol', source: 'buildings',
        filter: ['==', ['get', 'selected'], true],
        layout: { 'icon-image': 'building-pin-selected', 'icon-anchor': 'bottom', 'icon-overlap': 'always', 'icon-ignore-placement': false },
        paint: { 'icon-opacity': 0 },
      })
      map.addLayer({
        id: 'building-labels', type: 'symbol', source: 'buildings', minzoom: markerSwitchZoom,
        filter: ['==', ['get', 'selected'], false],
        layout: { 'text-field': ['get', 'name'], 'text-size': 13, 'text-anchor': 'left', 'text-justify': 'auto', 'text-variable-anchor-offset': ['left', [1.55, -1.3], 'right', [-1.55, -1.3], 'bottom', [0, -1.7], 'top', [0, 1.7]], 'text-max-width': 12 },
        paint: { 'text-color': initialTokens.typography.architectureLabel, 'text-halo-color': initialTokens.typography.geographicHalo, 'text-halo-width': 1 },
      })
      applyMapTheme(map, initialTokens, nightPreviewRef.current)
      applyProductionTypeScaleToMap(map)
      if (originalLayerState) {
        const initialById = new Map(originalLayerState.map(layer => [layer.id, layer]))
        console.table(snapshotCartographyLayers(map).map(layer => ({
          ...layer,
          originalVisibility: initialById.get(layer.id)?.visibility ?? 'new',
          originalMinzoom: initialById.get(layer.id)?.minzoom ?? 'new',
        })))
      }

      // Do not uncover the application at MapLibre's generic `load` event.
      // First render the SGM sources and layers, then wait until MapLibre has
      // no outstanding camera/style/tile work for this initial frame.
      map.triggerRepaint()
      map.once('render', () => map.once('idle', finishInitialLoad))
      const deepLinkedBuilding = buildings.find((building) => building.id === requestedSelectedId)
      if (deepLinkedBuilding && !restoredState) {
        window.requestAnimationFrame(() => revealBuilding(map, deepLinkedBuilding.coordinates))
      }

      map.on('click', (event) => {
        const currentBuilding = buildings.find((building) => building.id === selectedIdRef.current)
        const currentPoint = currentBuilding ? map.project(currentBuilding.coordinates) : null
        const currentPin = currentBuilding && currentPoint &&
          Math.abs(currentPoint.x - event.point.x) <= selectedPinWidth / 2 &&
          event.point.y >= currentPoint.y - selectedPinHeight &&
          event.point.y <= currentPoint.y
          ? currentBuilding
          : null
        const nearest = currentPin ?? buildings
          .map((building) => {
            const point = map.project(building.coordinates)
            return { building, distance: Math.hypot(point.x - event.point.x, point.y - event.point.y) }
          })
          .filter(({ distance }) => distance <= 26)
          .sort((a, b) => a.distance - b.distance)[0]?.building
        if (nearest) {
          // Detail remains nonmodal: map gestures and the current pin keep the
          // record open. In Preview the current pin toggles closed; choosing a
          // different building returns to Preview for identification.
          if (expandedRef.current && nearest.id === selectedIdRef.current) return
          if (nearest.id === selectedIdRef.current) {
            releasePreview()
            return
          }
          setSelectedId(nearest.id)
          setExpanded(false)
          setSearchOpen(false)
          setQuery('')
          searchInputRef.current?.blur()
          const targetZoom = map.getZoom() < distantSelectionZoomThreshold
            ? distantSelectionTargetZoom
            : undefined
          window.requestAnimationFrame(() => revealBuilding(map, nearest.coordinates, targetZoom))
        } else if (!expandedRef.current) {
          // Compact Preview is transient and releases back to the map.
          // Detail is persistent until Back/Escape/Home or another building.
          releasePreview()
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
      disposed = true
      disposeMrtNetwork?.()
      if (readyTimeout !== undefined) window.clearTimeout(readyTimeout)
      map.off('rotate', syncBearing)
      userMarkerZoomCleanupRef.current?.()
      userMarkerZoomCleanupRef.current = null
      userMarkerRef.current?.remove()
      selectedMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [locale, restoredState])

  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource('buildings') as GeoJSONSource | undefined
    source?.setData(featureCollection(selectedId, locale, activeArchitecture))

    selectedMarkerRef.current?.remove()
    selectedMarkerRef.current = null
    const building = buildings.find(item => item.id === selectedId)
    if (!map || !building) return

    // Animate the two visual priorities independently. The normal map symbol
    // is filtered out on selection, so this temporary copy fades out in its
    // place while the selected pin responds immediately.
    const element = document.createElement('div')
    element.className = 'sgm-selected-pin'
    element.style.width = `${selectedPinWidth}px`
    element.style.height = `${selectedPinHeight}px`
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
      image.style.left = `${(selectedPinWidth - width) / 2}px`
      image.style.display = 'block'
      image.style.zIndex = String(zIndex)
      return image
    }
    const category = getMapCategory(building.buildingType)
    const fill = category ? categoryColor(activeArchitecture, category) : activeArchitecture.genericFill
    const normal = map.getZoom() >= markerSwitchZoom
      ? createImage(createBuildingPinSvg(normalPinWidth, normalPinHeight, normalPinOutlineWidth, normalPinIconSize, activeArchitecture, fill, category), normalPinWidth, normalPinHeight, 1)
      : document.createElement('span')
    if (normal instanceof HTMLSpanElement) {
      normal.style.position = 'absolute'
      normal.style.width = '10px'
      normal.style.height = '10px'
      normal.style.left = `${(selectedPinWidth - 10) / 2}px`
      normal.style.bottom = '0'
      normal.style.border = `1px solid ${activeArchitecture.markerOutline}`
      normal.style.borderRadius = '50%'
      normal.style.background = fill
      normal.style.boxSizing = 'border-box'
      normal.style.zIndex = '1'
    }
    const selected = createImage(createBuildingPinSvg(selectedPinWidth, selectedPinHeight, selectedPinOutlineWidth, selectedPinIconSize, activeArchitecture, fill, category), selectedPinWidth, selectedPinHeight, 2)
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
  }, [activeArchitecture, locale, selectedId])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedId) url.searchParams.set('selected', selectedId)
    else url.searchParams.delete('selected')
    url.searchParams.set('sheet', expanded ? 'expanded' : 'compact')
    window.history.replaceState({ ...window.history.state }, '', url)
  }, [expanded, selectedId])

  useEffect(() => {
    const restoreUrlState = () => {
      const nextCollectionOpen = getRequestedCollectionState()
      const nextShareOpen = getRequestedShareState()
      if (shareOpenRef.current && !nextShareOpen) collectionFocusTargetRef.current = 'share'
      if (collectionOpenRef.current && !nextCollectionOpen) collectionFocusTargetRef.current = 'trigger'
      if (nextCollectionOpen && !collectionOpenRef.current) collectionOriginRef.current = getRequestedCollectionTab()
      setCollectionTab(getRequestedCollectionTab())
      setCollectionOpen(nextCollectionOpen)
      setShareOpen(nextShareOpen)
      setSelectedId(getRequestedSelectedId())
      setExpanded(getRequestedExpandedState() ?? false)
      setSearchOpen(false)
      setQuery('')
    }
    window.addEventListener('popstate', restoreUrlState)
    return () => window.removeEventListener('popstate', restoreUrlState)
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (shareOpen) shareCloseRef.current?.focus({ preventScroll: true })
      else if (collectionOpen && collectionFocusTargetRef.current === 'share') shareTriggerRef.current?.focus({ preventScroll: true })
      else if (collectionOpen) collectionCloseRef.current?.focus({ preventScroll: true })
      else if (collectionFocusTargetRef.current === 'trigger') (collectionOriginRef.current === 'visited' ? notebookTriggerRef : visitTriggerRef).current?.focus({ preventScroll: true })
      else if (collectionFocusTargetRef.current === 'preview') previewContentRef.current?.querySelector<HTMLButtonElement>('.preview-details')?.focus({ preventScroll: true })
      collectionFocusTargetRef.current = null
    })
    return () => window.cancelAnimationFrame(frame)
  }, [collectionOpen, selectedId, shareOpen])

  useEffect(() => {
    if (!collectionOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [collectionOpen])

  useEffect(() => {
    const closeLayer = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (shareOpen) {
        closeShareRecord()
      } else if (collectionOpen) {
        closeCollection()
      } else if (searchOpen) {
        closeSearch()
      } else if (expanded) {
        transitionSurfaceDepth(false, true)
      }
    }
    window.addEventListener('keydown', closeLayer)
    return () => window.removeEventListener('keydown', closeLayer)
  }, [collectionOpen, expanded, searchOpen, shareOpen])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const openSearch = () => {
    // Focus within the originating gesture for mobile Safari.
    flushSync(() => {
      setSelectedId(null)
      setExpanded(false)
      setSearchOpen(true)
    })
    searchInputRef.current?.focus({ preventScroll: true })
  }

  const closeSearch = () => {
    searchInputRef.current?.blur()
    setSearchOpen(false)
    setQuery('')
    window.requestAnimationFrame(() => searchTriggerRef.current?.focus({ preventScroll: true }))
  }

  const openSettings = () => {
    settingsDialogRef.current?.showModal()
    window.requestAnimationFrame(() => settingsTitleRef.current?.focus({ preventScroll: true }))
  }

  const chooseBuilding = (building: Building, focusMap = false, keyboardActivated = false) => {
    if (keyboardActivated) collectionFocusTargetRef.current = 'preview'
    setSelectedId(building.id)
    setExpanded(false)
    setSearchOpen(false)
    setQuery('')
    searchInputRef.current?.blur()
    if (focusMap) window.requestAnimationFrame(() => revealBuilding(mapRef.current, building.coordinates))
  }

  const goHome = () => {
    setSelectedId(null)
    setExpanded(false)
    setSearchOpen(false)
    setQuery('')
    searchInputRef.current?.blur()
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
        userMarkerZoomCleanupRef.current?.()
        userMarkerZoomCleanupRef.current = null
        userMarkerRef.current?.remove()
        const element = document.createElement('div')
        element.className = 'user-location-marker'
        element.setAttribute('aria-label', t.currentLocation)
        element.setAttribute('role', 'img')
        const body = document.createElement('div')
        body.className = 'user-location-blob'
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
        body.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="user-location-shape" cx="50" cy="50" r="46.5" stroke="#FFFFFF" stroke-width="5"/><g class="user-location-face"><rect/><rect/><path d="M33 31L43 40 33 49M67 31L57 40 67 49" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0"/></g></svg>'
        element.append(body)
        const eyes = body.querySelectorAll<SVGRectElement>('rect')
        const happy = body.querySelector<SVGPathElement>('path')!
        const neutral = [39.5,40,9,23,0,60.5,40,9,23,0,0]
        const paint = (v: number[]) => {
          eyes.forEach((eye, i) => {
            const [x,y,w,h,angle] = v.slice(i*5,i*5+5)
            eye.setAttribute('x', String(x-w/2))
            eye.setAttribute('y', String(y-h/2))
            eye.setAttribute('width', String(w))
            eye.setAttribute('height', String(h))
            eye.setAttribute('rx', String(Math.min(w,h)/2))
            eye.setAttribute('transform', 'rotate('+angle+' '+x+' '+y+')')
            eye.setAttribute('opacity', String(1-v[10]))
          })
          happy.setAttribute('opacity', String(v[10]))
        }
        const poses = [
          [[39.5,44,9,3,0,60.5,44,9,3,0,0],75,45,140],
          [[39.5,44,13,3,0,60.5,40,9,23,0,0],140,240,200],
          [[39.5,40,9,23,0,60.5,44,13,3,0,0],140,240,200],
          [[24.5,41,9,23,-6,45.5,41,9,23,-6,0],220,900,280],
          [[54.5,41,9,23,6,75.5,41,9,23,6,0],220,900,280],
          [[39.5,25,9,23,0,60.5,25,9,23,0,0],250,900,300],
          [[47,35,10,26,-8,68,40,8,17,-8,0],250,1000,350],
          [[39.5,40,9,3,0,60.5,40,9,3,0,1],190,650,250],
          [[39.5,48,12,3,0,60.5,48,12,3,0,0],400,1500,350],
        ] as const
        let timer = 0
        let frame = 0
        let previous = -1
        let stopped = false
        const cancelFace = () => {
          window.clearTimeout(timer)
          window.cancelAnimationFrame(frame)
          paint(neutral)
        }
        const interpolate = (from: readonly number[], to: readonly number[], duration: number, done: () => void) => {
          const start = performance.now()
          const tick = (now: number) => {
            if (stopped || !element.isConnected || reducedMotion.matches || document.hidden) { paint(neutral); return }
            const u = Math.min(1, (now-start)*1.1/duration)
            const e = u*u*(3-2*u)
            paint(from.map((v,i) => v+(to[i]-v)*e))
            if (u < 1) frame = window.requestAnimationFrame(tick)
            else done()
          }
          frame = window.requestAnimationFrame(tick)
        }
        const schedule = () => {
          if (stopped || reducedMotion.matches || document.hidden) return
          timer = window.setTimeout(() => {
            if (stopped || !element.isConnected) return
            const choices = [0,0,0,1,2,3,4,5,6,7,8].filter(i => i !== previous)
            const index = choices[Math.floor(Math.random()*choices.length)]
            previous = index
            const [pose, enter, hold, exit] = poses[index]
            interpolate(neutral, pose, enter, () => {
              timer = window.setTimeout(() => interpolate(pose, neutral, exit, schedule), hold/1.1)
            })
          }, 4000*(0.7+Math.random()*0.6)/1.1)
        }
        const resetFace = () => { cancelFace(); schedule() }
        paint(neutral)
        const map = mapRef.current
        if (!map) { setLocating(false); return }
        const sizeForZoom = (zoom: number) => {
          const stops = [[9, 16], [11, 19], [13, 23], [14, 26], [16, 31], [18, 34]] as const
          if (zoom <= stops[0][0]) return stops[0][1]
          if (zoom >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
          for (let i = 1; i < stops.length; i += 1) {
            const [z1, s1] = stops[i]
            const [z0, s0] = stops[i - 1]
            if (zoom <= z1) return s0 + ((zoom - z0) / (z1 - z0)) * (s1 - s0)
          }
          return 34
        }
        const syncScale = () => body.style.setProperty('--location-scale', String(sizeForZoom(map.getZoom()) / 34))
        syncScale()
        map.on('zoom', syncScale)
        userMarkerZoomCleanupRef.current = () => {
          stopped = true
          cancelFace()
          map.off('zoom', syncScale)
          document.removeEventListener('visibilitychange', resetFace)
          reducedMotion.removeEventListener('change', resetFace)
        }
        userMarkerRef.current = new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(location).addTo(map)
        document.addEventListener('visibilitychange', resetFace)
        reducedMotion.addEventListener('change', resetFace)
        schedule()
        const wide = window.matchMedia('(min-width: 720px)').matches
        mapRef.current?.flyTo({ center: location, zoom: Math.max(mapRef.current.getZoom(), 14), offset: wide ? [210, 0] : [0, -76], duration: motionDuration(700) })
        setLocating(false)
        setNotice(t.locationSuccess)
      },
      (error) => {
        setLocating(false)
        setNotice(error.code === 1 ? t.locationDenied : error.code === 3 ? t.locationTimeout : t.locationFailure)
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 },
    )
  }

  return (
    <main
      className={`app locale-${locale} state-${surfaceState} ${expanded ? 'details-expanded' : ''} ${nightPreview ? 'night-preview' : ''} ${colorLabEnabled ? 'color-lab-active' : ''}`}
      style={colorTokenCssVariables(activeColorTokens) as CSSProperties}
      aria-busy={initialMapState !== 'hidden'}
    >
      <div className="sgm-stage">
      <div ref={mapContainer} className="map" role="region" aria-label={t.mapLabel} inert={collectionOpen ? true : undefined} />

      <div className="top-ui" aria-hidden={collectionOpen} inert={collectionOpen ? true : undefined}>
        {searchOpen && <search className="search-shell open">
          <div className="search-bar">
            <div className="search-input-wrap">
              <MagnifyingGlass aria-hidden="true" size={20} weight="regular" />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }}
                aria-label={t.searchLabel}
                aria-expanded={searchOpen}
                aria-controls="search-results"
                autoComplete="off"
                placeholder={t.searchPlaceholder}
              />
              {hasSearchQuery && <button className="icon-button small" onClick={() => { setQuery(''); searchInputRef.current?.focus() }} aria-label={t.clearSearch}><X aria-hidden="true" size={16} weight="regular" /></button>}
            </div>
            <button type="button" className="icon-button" onClick={closeSearch} aria-label={t.cancelSearch}><X aria-hidden="true" size={20} weight="regular" /></button>
          </div>
          {searchOpen && (
            <div className="search-results" id="search-results" aria-label={t.searchResults}>
              {hasSearchQuery && <p className="result-count" role="status" aria-atomic="true">{results.length ? t.resultCount(results.length) : t.noResults}</p>}
              {results.map((building) => {
                const copy = getBuildingCopy(locale, building.id, building.name)
                return (
                  <button key={building.id} onClick={(event) => chooseBuilding(building, true, event.detail === 0)}>
                    <span><strong>{copy.name}</strong><small>{copy.previewArchitectCredit ?? copy.architectCredit}</small></span>
                    <ArrowRight aria-hidden="true" size={20} weight="regular" />
                  </button>
                )
              })}
            </div>
          )}
        </search>}

        {!searchOpen && <div className="control-row">
          <div className="control-left">
            <button className="brand" type="button" onClick={goHome} aria-label={t.resetMap}>
              <span className="brand-mark"><BrandMark /></span>
            </button>
          </div>
          <div className="control-right">
            <WeatherBoundary>
              <a className="weather-chip" href={weatherPortalUrl} target="_blank" rel="noreferrer" aria-label={weather.condition ? `${weather.condition}${weather.temperature === null ? '' : `, ${weather.temperature} degrees Celsius`}` : 'Singapore weather'}>
                <WeatherGlyph condition={weather.condition} />
                {weather.temperature !== null && <span>{weather.temperature}°</span>}
              </a>
            </WeatherBoundary>
          </div>
        </div>}
      </div>

      {surfaceState === 'explore' && (
        <>
          <div className="experience-actions experience-action-bar" role="group" aria-label={locale === 'ja' ? '建築を巡る' : 'Architecture experiences'}>
            <button ref={searchTriggerRef} className="experience-action ui-ring-control" type="button" onClick={openSearch} aria-label={t.searchLabel} title={locale === 'ja' ? '検索' : 'Discover'}>
              <MagnifyingGlass aria-hidden="true" size={26} weight="regular" />
            </button>
            <button ref={visitTriggerRef} className="experience-action ui-ring-control" type="button" onClick={() => openCollection('saved')} aria-label={t.wantToVisit} aria-haspopup="dialog" title={t.wantToVisit}>
              <Sneaker aria-hidden="true" size={26} weight="regular" />
            </button>
            <button ref={notebookTriggerRef} className="experience-action ui-ring-control" type="button" onClick={() => openCollection('visited')} aria-label={t.myRecord} aria-haspopup="dialog" title={t.myRecord}>
              <Notebook aria-hidden="true" size={26} weight="regular" />
            </button>
          </div>
          <button ref={settingsTriggerRef} type="button" className="locate-button experience-settings-trigger" aria-label={locale === 'ja' ? '設定' : 'Settings'} aria-haspopup="dialog" onClick={openSettings}>
            <Gear aria-hidden="true" size={22} weight="regular" />
          </button>
        </>
      )}

      <dialog ref={settingsDialogRef} className="experience-settings" aria-labelledby="experience-settings-title" onClose={() => settingsTriggerRef.current?.focus({ preventScroll: true })}>
        <header>
          <h2 ref={settingsTitleRef} id="experience-settings-title" tabIndex={-1}>{locale === 'ja' ? '設定' : 'Settings'}</h2>
          <button type="button" className="icon-button" aria-label={locale === 'ja' ? '閉じる' : 'Close settings'} onClick={() => settingsDialogRef.current?.close()}><X aria-hidden="true" size={20} /></button>
        </header>
        <div className="experience-setting-row">
          <span>{locale === 'ja' ? '言語' : 'Language'}</span>
            <a
              className="language-trigger"
              href={localeHref(nextLocale, {
                selected: selectedId ?? '',
                sheet: expanded ? 'expanded' : 'compact',
                ...(colorLabEnabled ? { lab: 'color' } : {}),
              })}
              hrefLang={nextLocale}
              onClick={switchLanguage}
              aria-label={locale === 'en' ? 'Switch to Japanese' : '英語に切り替える'}
            >
              <span>{locale.toUpperCase()}</span>
            </a>

        </div>
        <div className="experience-setting-row">
          <span>{locale === 'ja' ? '表示' : 'Appearance'}</span>
            <button
              type="button"
              className="appearance-toggle"
              aria-label={nightPreview ? (locale === 'ja' ? '昼表示に切り替える' : 'Switch to Day') : (locale === 'ja' ? '夜表示に切り替える' : 'Switch to Night')}
              onClick={toggleAppearance}
            >
              {nightPreview
                ? <Moon aria-hidden="true" size={20} weight="regular" />
                : <Sun aria-hidden="true" size={20} weight="regular" />}
            </button>

        </div>
      </dialog>

      {selected && !collectionOpen && (
        <div ref={previewSurfaceRef} className={`bottom-surface ${surfaceState}`}>
          <aside className="place-surface" aria-label={expanded ? t.detailLabel(getBuildingCopy(locale, selected.id, selected.name).name) : t.previewLabel(getBuildingCopy(locale, selected.id, selected.name).name)}>
            <div ref={previewContentRef} className="sheet-compact" aria-hidden={expanded}>
              <PreviewCard
                building={selected}
                locale={locale}
                t={t}
                onDetails={(keyboardActivated) => transitionSurfaceDepth(true, keyboardActivated)}
                onClose={releasePreview}
              />
            </div>
            <div ref={detailContentRef} className="sheet-expanded" aria-hidden={!expanded}>
              <DetailContent building={selected} locale={locale} t={t} onClose={(keyboardActivated) => transitionSurfaceDepth(false, keyboardActivated)} backRef={detailBackRef} />
            </div>
          </aside>
        </div>
      )}

      {collectionOpen && (
        <CollectionView
          locale={locale}
          t={t}
          closeRef={collectionCloseRef}
          shareTriggerRef={shareTriggerRef}
          shareCloseRef={shareCloseRef}
          shareOpen={shareOpen}
          activeTab={collectionTab}
          onClose={closeCollection}
          onChoose={chooseCollectionBuilding}
          onOpenShare={openShareRecord}
          onCloseShare={closeShareRecord}
        />
      )}

      <div className="map-tools" aria-hidden={collectionOpen} inert={collectionOpen ? true : undefined}>
        <button
          className={`locate-button compass-button ${Math.abs(((mapBearing + 180) % 360 + 360) % 360 - 180) > 3 ? 'is-visible' : ''}`}
          type="button"
          onClick={resetNorth}
          aria-hidden={Math.abs(((mapBearing + 180) % 360 + 360) % 360 - 180) <= 3}
          tabIndex={Math.abs(((mapBearing + 180) % 360 + 360) % 360 - 180) > 3 ? 0 : -1}
          aria-label={locale === 'ja' ? '北を上に戻す' : 'Reset map to north'}
          title={locale === 'ja' ? '北を上に戻す' : 'Reset map to north'}
        >
          <span aria-hidden="true" className="compass-north" style={{ transform: `rotate(${-mapBearing}deg)` }}>N</span>
        </button>
        <button className={`locate-button ${locating ? 'loading' : ''}`} onClick={locate} disabled={locating} aria-label={locating ? t.locating : t.locate}>
          <NavigationArrow aria-hidden="true" size={20} weight="fill" />
        </button>
      </div>

      {notice && <div className="notice" role="status">{notice}</div>}

      {initialMapState !== 'hidden' && (
        <div
          className={`initial-loading-screen ${initialMapState === 'fading' ? 'is-fading' : ''} ${initialMapState === 'error' ? 'has-error' : ''}`}
          role={initialMapState === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <p className="loading-title" style={{ animationDelay: loadingAnimationDelay }}>Singapore Architecture Map</p>
          {initialMapState === 'error' && (
            <div className="initial-loading-error">
              <span>{locale === 'ja' ? '地図を読み込めませんでした。' : 'The map could not be loaded.'}</span>
              <button type="button" onClick={() => window.location.reload()}>
                {locale === 'ja' ? '再試行' : 'Retry'}
              </button>
            </div>
          )}
        </div>
      )}
      </div>
      {colorLabEnabled && (
        <ColorLabPanel tokens={colorTokens} activeScheme={activeScheme} onChange={setColorTokens} onPreviewSchemeChange={selectAppearance} />
      )}
    </main>
  )
}

function CollectionView({ locale, t, closeRef, shareTriggerRef, shareCloseRef, shareOpen, activeTab, onClose, onChoose, onOpenShare, onCloseShare }: {
  locale: Locale
  t: Translation
  closeRef: RefObject<HTMLButtonElement | null>
  shareTriggerRef: RefObject<HTMLButtonElement | null>
  shareCloseRef: RefObject<HTMLButtonElement | null>
  shareOpen: boolean
  activeTab: CollectionTab
  onClose: () => void
  onChoose: (building: Building, keyboardActivated: boolean) => void
  onOpenShare: () => void
  onCloseShare: () => void
}) {
  const snapshot = useSyncExternalStore(collectionStateStore.subscribe, collectionStateStore.getSnapshot, collectionStateStore.getSnapshot)
  const visitedBuildings = useMemo(() => buildings.filter((building) => snapshot.buildings[building.id]?.visited), [snapshot])
  const savedBuildings = useMemo(() => getWantToVisitBuildings(buildings, snapshot), [snapshot])
  const recordGroups = useMemo(() => createArchitectureRecordGroups(buildings, snapshot), [snapshot])

  const renderPanel = (tab: CollectionTab, items: Building[], emptyMessage: string) => (
    <div className="collection-panel" role="region" aria-label={tab === 'saved' ? t.wantToVisit : t.myRecord}>
      {tab === 'visited' && <button ref={shareTriggerRef} className="record-summary-card" type="button" onClick={onOpenShare} aria-label={t.openRecordSummary(items.length)}>
        <strong>{items.length}</strong><span>{t.placesVisited}</span>
      </button>}
      {items.length === 0 ? (
        <div className="collection-empty">
          <p>{emptyMessage}</p>
          <button type="button" className="back-button" onClick={onClose}><ArrowLeft aria-hidden="true" size={16} />{t.returnToMap}</button>
        </div>
      ) : tab === 'visited' ? (
        <div className="architecture-records">
          {recordGroups.map((group) => (
            <section className="record-year" key={group.year ?? 'undated'} aria-labelledby={`record-year-${group.year ?? 'undated'}`}>
              <h3 id={`record-year-${group.year ?? 'undated'}`}>{group.year ?? t.recordDateNotSet}</h3>
              <ul>
                {group.buildings.map((building) => (
                  <ArchitectureRecordEntry key={building.id} building={building} locale={locale} t={t} snapshot={snapshot} onChoose={onChoose} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="collection-list">
          {items.map((building) => {
            const copy = getBuildingCopy(locale, building.id, building.name)
            return <li key={building.id}><button type="button" onClick={(event) => onChoose(building, event.detail === 0)}>
              <span><strong>{copy.name}</strong><small>{copy.previewArchitectCredit ?? copy.architectCredit}</small></span>
              <ArrowRight aria-hidden="true" size={20} weight="regular" />
            </button></li>
          })}
        </ul>
      )}
    </div>
  )

  return (
    <aside className="collection-surface" role="dialog" aria-modal="true" aria-labelledby="collection-title">
      <div aria-hidden={shareOpen} inert={shareOpen ? true : undefined} className="collection-base">
        <header className="collection-header"><h1 id="collection-title">{activeTab === 'saved' ? t.wantToVisit : t.myRecord}</h1>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label={t.closeCollection}><X aria-hidden="true" size={20} /></button>
        </header>
        <div className="collection-panels">{activeTab === 'saved'
          ? renderPanel('saved', savedBuildings, t.emptyWantToVisit)
          : renderPanel('visited', visitedBuildings, t.emptyVisited)}</div>
      </div>
      {shareOpen && <ShareRecordPreview snapshot={snapshot} t={t} closeRef={shareCloseRef} onClose={onCloseShare} />}
    </aside>
  )
}

function ArchitectureRecordEntry({ building, locale, t, snapshot, onChoose }: {
  building: Building
  locale: Locale
  t: Translation
  snapshot: ReturnType<typeof collectionStateStore.getSnapshot>
  onChoose: (building: Building, keyboardActivated: boolean) => void
}) {
  const state = snapshot.buildings[building.id] ?? collectionStateStore.getBuildingState(building.id)
  const copy = getBuildingCopy(locale, building.id, building.name)
  const [editing, setEditing] = useState(false)
  const [visitDate, setVisitDate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dateParts = state.visitDate?.split('-')
  const month = dateParts
    ? new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', timeZone: 'UTC' })
      .format(new Date(`${state.visitDate}T00:00:00Z`)).toLocaleUpperCase(locale)
    : null

  const beginEditing = () => {
    setVisitDate(state.visitDate ?? '')
    setNote(state.note)
    setError(null)
    setEditing(true)
  }
  const saveRecord = () => {
    const result = collectionStateStore.updateBuildingState(building.id, {
      visitDate: visitDate || null,
      note: note.trim(),
    })
    if (!result.ok) {
      setError(t.collectionSaveError)
      return
    }
    setEditing(false)
    setError(null)
  }

  return <li className="architecture-record-entry">
    <div className="record-summary">
      <div className={`record-date ${state.visitDate ? '' : 'is-undated'}`} aria-label={state.visitDate ?? t.recordDateNotSet}>
        {dateParts && month
          ? <><strong>{dateParts[2]}</strong><span aria-hidden="true">/</span><small>{month}</small></>
          : <span className="record-undated-dash" aria-hidden="true">—</span>}
      </div>
      <div className="record-body">
        <button className="record-building" type="button" onClick={(event) => onChoose(building, event.detail === 0)}>
          <strong>{copy.name}</strong><ArrowRight aria-hidden="true" size={18} />
        </button>
        <p className="record-meta">{copy.previewArchitectCredit ?? copy.architectCredit} · {t.types[building.buildingType]}</p>
        {state.note && <p className="record-note">{state.note}</p>}
        <button className="record-edit" type="button" onClick={beginEditing}>{state.visitDate || state.note ? t.editRecord : t.addRecordDetails}</button>
      </div>
    </div>
    {editing && <div className="record-editor" role="group" aria-label={t.editRecordFor(copy.name)}>
      <label><span>{t.visitDate}</span><input type="date" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} /></label>
      <label><span>{t.personalNote}</span><textarea value={note} maxLength={2000} rows={4} placeholder={t.personalNotePlaceholder} onChange={(event) => setNote(event.target.value)} /></label>
      {error && <p className="collection-error" role="alert">{error}</p>}
      <div className="record-editor-actions">
        <button type="button" className="primary-button" onClick={saveRecord}>{t.saveRecord}</button>
        <button type="button" className="secondary-button" onClick={() => setEditing(false)}>{t.cancel}</button>
        {(state.visitDate || state.note) && <button type="button" className="record-clear" onClick={() => { setVisitDate(''); setNote('') }}>{t.clearRecordDetails}</button>}
      </div>
    </div>}
  </li>
}

function ShareRecordPreview({ snapshot, t, closeRef, onClose }: {
  snapshot: ReturnType<typeof collectionStateStore.getSnapshot>
  t: Translation
  closeRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [png, setPng] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [shareSupported, setShareSupported] = useState(false)
  const [operationError, setOperationError] = useState<string | null>(null)
  const requestId = useRef(0)

  const generate = useCallback(async () => {
    const id = ++requestId.current
    setStatus('loading')
    setOperationError(null)
    try {
      const nextPng = await generateShareRecordPng(snapshot)
      if (id !== requestId.current) return
      const nextUrl = URL.createObjectURL(nextPng)
      setPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return nextUrl })
      setPng(nextPng)
      setShareSupported(canShareRecordFile(createShareRecordFile(nextPng)))
      setStatus('ready')
    } catch {
      if (id === requestId.current) setStatus('error')
    }
  }, [snapshot])

  useEffect(() => { void generate(); return () => { requestId.current += 1 } }, [generate])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const share = async () => {
    if (!png) return
    setOperationError(null)
    try { await navigator.share({ files: [createShareRecordFile(png)], title: 'Singapore Architecture Map — Visited Record' }) }
    catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setOperationError(t.recordGenerationError)
    }
  }

  return <section className="share-record-preview" role="dialog" aria-modal="true" aria-labelledby="share-record-title">
    <header className="share-preview-header"><h2 id="share-record-title">{t.myRecord}</h2>
      <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label={t.closeShareRecord}><X aria-hidden="true" size={20} /></button>
    </header>
    <div className="share-preview-body">
      {status === 'loading' && <p className="share-status" role="status">{t.generatingRecord}</p>}
      {status === 'error' && <div className="share-status" role="alert"><p>{t.recordGenerationError}</p><button className="primary-button" type="button" onClick={() => void generate()}>{t.retryGeneration}</button></div>}
      {status === 'ready' && previewUrl && <img src={previewUrl} alt="Singapore Architecture Map visited record" width="1080" height="1350" />}
    </div>
    {status === 'ready' && png && <footer className="share-preview-footer">
      <div className="share-actions"><a className="primary-button" href={previewUrl ?? undefined} download={SHARE_RECORD_FILENAME}><DownloadSimple aria-hidden="true" size={20} />{t.savePng}</a>
        {shareSupported && <button className="secondary-button" type="button" onClick={() => void share()}><ShareNetwork aria-hidden="true" size={20} />{t.sharePng}</button>}
      </div>
      {operationError && <p className="collection-error" role="alert">{operationError}</p>}
      <p className="share-attribution">Source: <a href="https://data.gov.sg/datasets/d_29f066d67df3eae91df8a42f443863c8/view" target="_blank" rel="noreferrer">SLA National Map Polygon</a> · <a href="https://data.gov.sg/open-data-licence" target="_blank" rel="noreferrer">Singapore Open Data Licence</a></p>
    </footer>}
  </section>
}

function WeatherGlyph({ condition }: { condition: string | null }) {
  const normalized = typeof condition === 'string' ? condition.toLowerCase() : ''
  if (/thunder|lightning/.test(normalized)) return <Lightning aria-hidden="true" size={20} weight="regular" />
  if (/shower|rain/.test(normalized)) return <CloudRain aria-hidden="true" size={20} weight="regular" />
  if (/partly|fair/.test(normalized)) return <CloudSun aria-hidden="true" size={20} weight="regular" />
  if (/cloud|overcast/.test(normalized)) return <Cloud aria-hidden="true" size={20} weight="regular" />
  return <Sun aria-hidden="true" size={20} weight="regular" />
}

type LocalizedProps = { building: Building; locale: Locale; t: Translation }

function PreviewCard({ building, locale, t, onDetails, onClose }: LocalizedProps & { onDetails: (keyboardActivated: boolean) => void; onClose: () => void }) {
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
        <span>{copy.previewArchitectCredit ?? copy.architectCredit}</span>
        {primaryYear && <span className="preview-year">{primaryYear}</span>}
      </p>
      <button className="preview-details" onClick={(event) => onDetails(event.detail === 0)}>
        <span>{t.viewDetails}</span>
        <ArrowRight aria-hidden="true" size={20} weight="regular" />
      </button>
    </section>
  )
}

function DetailContent({ building, locale, t, onClose, backRef }: LocalizedProps & { onClose: (keyboardActivated: boolean) => void; backRef: RefObject<HTMLButtonElement | null> }) {
  const copy = getBuildingCopy(locale, building.id, building.name)
  const mapsQuery = encodeURIComponent(`${building.name}, ${building.address}`)
  const searchQuery = encodeURIComponent(`${copy.name} Singapore architecture`)
  const { details: yearDetails } = getBuildingYearDetails(building, locale, t)
  const getCollectionState = useCallback(() => collectionStateStore.getBuildingState(building.id), [building.id])
  const collectionState = useSyncExternalStore(collectionStateStore.subscribe, getCollectionState, getCollectionState)
  const [collectionError, setCollectionError] = useState<string | null>(null)
  useEffect(() => {
    setCollectionError(null)
    if (collectionState.visited && collectionState.visitDate === null) {
      undatedVisitedIdsThisSession.add(building.id)
    }
  }, [building.id, collectionState.visitDate, collectionState.visited])
  const updateCollectionState = (update: CollectionUpdate) => {
    if (update.visited === false && collectionState.visited && collectionState.visitDate === null) {
      undatedVisitedIdsThisSession.add(building.id)
    }
    const updateWithInitialDate = addInitialVisitDate(
      collectionState,
      update,
      new Date(),
      undatedVisitedIdsThisSession.has(building.id),
    )
    const result = collectionStateStore.updateBuildingState(building.id, updateWithInitialDate)
    setCollectionError(result.ok ? null : t.collectionSaveError)
  }
  return (
    <div className="detail-content">
      <div className="detail-heading">
        <button ref={backRef} className="back-button" onClick={(event) => onClose(event.detail === 0)} aria-label={t.backToOverviewLabel(copy.name)}>
          <ArrowLeft aria-hidden="true" size={16} weight="regular" />
          {t.back}
        </button>
        <span className="record-index">SGM / {String(buildings.indexOf(building) + 1).padStart(2, '0')}</span>
      </div>

      <header className="detail-intro">
        <p className="eyebrow">{t.types[building.buildingType]}</p>
        <h1>{copy.name}</h1>
        <p className="detail-architects">{copy.architectCredit}</p>
        {yearDetails.length > 0 && <p className="detail-year">{yearDetails.join(' · ')}</p>}
      </header>

      <section className="collection-actions" aria-label={t.collectionActions}>
        <div className="collection-toggle-row">
          <button type="button" className={`collection-toggle ${collectionState.saved ? 'is-active' : ''}`} aria-pressed={collectionState.saved} onClick={() => updateCollectionState({ saved: !collectionState.saved })}>
            <span className="collection-toggle-glyph ui-ring-glyph" aria-hidden="true"><Sneaker size={20} weight={collectionState.saved ? 'fill' : 'regular'} /></span><span>{t.wantToVisit}</span>
          </button>
          <button type="button" className={`collection-toggle ${collectionState.visited ? 'is-active' : ''}`} aria-pressed={collectionState.visited} onClick={() => updateCollectionState({ visited: !collectionState.visited })}>
            <span className="collection-toggle-glyph ui-ring-glyph" aria-hidden="true"><CheckCircle size={20} weight={collectionState.visited ? 'fill' : 'regular'} /></span><span>{t.visited}</span>
          </button>
        </div>
        {collectionError && <p className="collection-error" role="alert">{collectionError}</p>}
      </section>

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
