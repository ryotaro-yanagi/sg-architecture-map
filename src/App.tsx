import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowSquareOut, Crosshair, MagnifyingGlass, Minus, NavigationArrow, Plus, X } from '@phosphor-icons/react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import data from './data/buildings.json'
import { getBuildingCopy, getLocaleFromPath, localeHref, translations } from './i18n'
import type { RefObject } from 'react'
import type { Locale, Translation } from './i18n'

type Coordinates = [number, number]
type ColorSystem = 'archive' | 'living'
type MapColor = 'colored' | 'light'
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

const revealBuilding = (map: MapLibreMap | null, coordinates: Coordinates) => {
  if (!map) return
  const wide = window.matchMedia('(min-width: 720px)').matches
  const offset: [number, number] = wide ? [210, 0] : [0, -76]
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
  pin: { default: string; selected: string; stroke: string; halo: string }
}

const mapPalettes: Record<MapColor, MapPalette> = {
  colored: {
    background: '#eef0e8', residential: '#e8ebe4', park: '#c9dfca', wood: '#bfd7c2', grass: '#d9e7d3',
    water: '#bedde6', waterway: '#67a7b7', roadMinor: '#fffdf6', roadMajor: '#f8edd2', roadMotorway: '#f0d8a9', roadCasing: '#aebdb4',
    building: '#ddd8cc', buildingOutline: '#bbb7ab', label: '#203b33', labelSecondary: '#526860', labelWater: '#216b7c', labelHalo: '#fafbf5', poiOpacity: .68,
    pin: { default: '#17697c', selected: '#e5653f', stroke: '#183c3b', halo: 'rgba(250,251,245,.92)' },
  },
  light: {
    background: '#f5f6f5', residential: '#f1f3f2', park: '#dce9dd', wood: '#d3e4d5', grass: '#e6eee6',
    water: '#c8e4eb', waterway: '#83b8c4', roadMinor: '#ffffff', roadMajor: '#fafbfa', roadMotorway: '#f2f4f3', roadCasing: '#cbd0cd',
    building: '#e3e5e4', buildingOutline: '#c8ccca', label: '#414744', labelSecondary: '#6b726e', labelWater: '#3f7885', labelHalo: '#ffffff', poiOpacity: .58,
    pin: { default: '#17697c', selected: '#e5653f', stroke: '#183c3b', halo: 'rgba(250,251,245,.92)' },
  },
}

const livingMarker = { default: '#35946b', selected: '#ff965c' }
const legacyComparisonParams = ['ui', 'font', 'visual', 'map', 'scale', 'preset', 'lab', 'shape', 'weight', 'pin', 'surface', 'spacing', 'identity', 'mapMode']

const getQueryChoice = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  const value = new URLSearchParams(window.location.search).get(key) as T | null
  return value && allowed.includes(value) ? value : fallback
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

  // Keep line-based water labels subordinate to district names.
  if (map.getLayer('waterway_line_label')) map.setLayoutProperty('waterway_line_label', 'text-size', 12)
  if (map.getLayer('water_name_line_label')) map.setLayoutProperty('water_name_line_label', 'text-size', 13)

  // Let district names lead until the viewer zooms closer to street level.
  if (map.getLayer('highway-name-minor')) map.setLayerZoomRange('highway-name-minor', 15.5, 24)

  const layers = map.getStyle().layers ?? []
  layers.forEach((layer) => {
    const id = layer.id
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

const applyProductionMapTheme = (map: MapLibreMap, mapColor: MapColor, colorSystem: ColorSystem) => {
  const palette = mapPalettes[mapColor]
  applyMapPalette(map, palette)
  if (!map.getLayer('building-points')) return
  const marker = colorSystem === 'living' ? livingMarker : palette.pin
  map.setPaintProperty('building-halo', 'circle-color', ['case', ['get', 'selected'], marker.selected, marker.default])
  const { pin } = palette
  map.setPaintProperty('building-labels', 'text-color', pin.stroke)
  map.setPaintProperty('building-labels', 'text-halo-color', pin.halo)
  map.setPaintProperty('building-points', 'circle-color', ['case', ['get', 'selected'], marker.selected, marker.default])
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
  const colorSystem = useMemo(() => getQueryChoice<ColorSystem>('color', ['archive', 'living'], 'archive'), [])
  const mapColor = useMemo(() => getQueryChoice<MapColor>('mapColor', ['colored', 'light'], 'colored'), [])
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const detailBackRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(requestedSelectedId ?? restoredState?.selectedId ?? null)
  const [expanded, setExpanded] = useState(getRequestedExpandedState() ?? restoredState?.expanded ?? false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

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
    const url = new URL(window.location.href)
    legacyComparisonParams.forEach((param) => url.searchParams.delete(param))
    window.history.replaceState({}, '', url)
  }, [locale])

  useEffect(() => {
    if (expanded) {
      detailBackRef.current?.closest('.detail-panel')?.scrollTo({ top: 0 })
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
      applyProductionMapTheme(map, mapColor, colorSystem)
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
  }, [colorSystem, locale, mapColor, restoredState])

  useEffect(() => {
    const source = mapRef.current?.getSource('buildings') as GeoJSONSource | undefined
    source?.setData(featureCollection(selectedId, locale))
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
    if (focusMap) revealBuilding(mapRef.current, building.coordinates)
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
        revealBuilding(mapRef.current, location)
        setLocating(false)
        setNotice(t.locationSuccess)
      },
      () => { setLocating(false); setNotice(t.locationFailure) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <main className={`app locale-${locale} color-system-${colorSystem} map-color-${mapColor} ${expanded ? 'details-expanded' : ''}`}>
      <div ref={mapContainer} className="map" role="region" aria-label={t.mapLabel} />

      <header className="topbar">
        <button className="brand" type="button" onClick={goHome} aria-label={t.resetMap}>
          <span className="brand-mark"><BrandMark /></span>
        </button>
        <div className="top-controls">
          <nav className="language-switch" aria-label={t.languageSwitcher}>
            <a className={locale === 'en' ? 'active' : ''} href={localeHref('en', { color: colorSystem, mapColor, selected: selectedId ?? '', sheet: expanded ? 'expanded' : 'compact' })} hrefLang="en" aria-current={locale === 'en' ? 'page' : undefined} onClick={switchLanguage}>EN</a>
            <a className={locale === 'ja' ? 'active' : ''} href={localeHref('ja', { color: colorSystem, mapColor, selected: selectedId ?? '', sheet: expanded ? 'expanded' : 'compact' })} hrefLang="ja" aria-current={locale === 'ja' ? 'page' : undefined} onClick={switchLanguage}>JP</a>
          </nav>
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
        <div className="map-navigation" role="group" aria-label={locale === 'ja' ? '地図の拡大縮小' : 'Map zoom controls'}>
          <button type="button" onClick={() => mapRef.current?.zoomIn({ duration: motionDuration(150) })} aria-label={t.mapControls['NavigationControl.ZoomIn'] ?? 'Zoom in'}>
            <Plus aria-hidden="true" size={20} weight="regular" />
          </button>
          <button type="button" onClick={() => mapRef.current?.zoomOut({ duration: motionDuration(150) })} aria-label={t.mapControls['NavigationControl.ZoomOut'] ?? 'Zoom out'}>
            <Minus aria-hidden="true" size={20} weight="regular" />
          </button>
        </div>
        <button className={`locate-button ${locating ? 'loading' : ''}`} onClick={locate} disabled={locating} aria-label={locating ? t.locating : t.locate}>
          <Crosshair aria-hidden="true" size={20} weight="regular" />
        </button>
      </div>
      <div className="data-note">{t.dataNote}</div>

      {selected && !expanded && <PreviewCard building={selected} locale={locale} t={t} onDetails={() => setExpanded(true)} onClose={() => setSelectedId(null)} />}
      {selected && expanded && (
        <aside className="detail-panel" aria-label={t.detailLabel(getBuildingCopy(locale, selected.id, selected.name).name)}>
          <DetailContent building={selected} locale={locale} t={t} onClose={() => setExpanded(false)} backRef={detailBackRef} />
        </aside>
      )}

      {notice && <div className="notice" role="status">{notice}</div>}
    </main>
  )
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
      <p className="architects">{copy.architectCredit}</p>
      <button className="primary-button" onClick={onDetails}>{t.viewDetails} <ArrowRight aria-hidden="true" size={20} weight="regular" /></button>
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
