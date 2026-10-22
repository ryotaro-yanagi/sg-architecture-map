import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import data from './data/buildings.json'
import { getBuildingCopy, getLocaleFromPath, localeHref, translations } from './i18n'
import type { Locale, Translation } from './i18n'

type Coordinates = [number, number]
type Variant = 'a' | 'b'

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
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const variantEffectReady = useRef(false)
  const [selectedId, setSelectedId] = useState<string | null>(restoredState?.selectedId ?? null)
  const [expanded, setExpanded] = useState(restoredState?.expanded ?? false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [variant, setVariant] = useState<Variant>(() => new URLSearchParams(window.location.search).get('ui') === 'b' ? 'b' : 'a')

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
      map.addLayer({
        id: 'building-halo', type: 'circle', source: 'buildings',
        paint: { 'circle-radius': ['case', ['get', 'selected'], 13, 10], 'circle-color': 'rgba(255,255,255,.72)', 'circle-blur': 0.45 },
      })
      map.addLayer({
        id: 'building-points', type: 'circle', source: 'buildings',
        paint: { 'circle-radius': ['case', ['get', 'selected'], 8, 6], 'circle-color': ['case', ['get', 'selected'], '#ef6f51', '#f7f1e7'], 'circle-stroke-color': '#282724', 'circle-stroke-width': 1.7 },
      })
      map.addLayer({
        id: 'building-labels', type: 'symbol', source: 'buildings', minzoom: 13.2,
        layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.45], 'text-anchor': 'top', 'text-variable-anchor': ['top', 'bottom', 'left', 'right'], 'text-radial-offset': 0.75 },
        paint: { 'text-color': '#282724', 'text-halo-color': '#f8f4ec', 'text-halo-width': 2 },
      })

      map.on('click', (event) => {
        const features = map.queryRenderedFeatures(event.point, { layers: ['building-points'] })
        const id = features[0]?.properties?.id as string | undefined
        if (id) {
          setSelectedId(id)
          setExpanded(false)
          setSearchOpen(false)
        }
      })
      map.on('mouseenter', 'building-points', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'building-points', () => { map.getCanvas().style.cursor = '' })
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
    const url = new URL(window.location.href)
    url.searchParams.set('ui', variant)
    window.history.replaceState({}, '', url)
    if (variantEffectReady.current) setExpanded(false)
    variantEffectReady.current = true
  }, [variant])

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
    <main className={`app variant-${variant}`}>
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
            <a className={locale === 'en' ? 'active' : ''} href={localeHref('en')} hrefLang="en" aria-current={locale === 'en' ? 'page' : undefined} onClick={switchLanguage}>EN</a>
            <a className={locale === 'ja' ? 'active' : ''} href={localeHref('ja')} hrefLang="ja" aria-current={locale === 'ja' ? 'page' : undefined} onClick={switchLanguage}>日本語</a>
          </nav>
        </div>
      </header>

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
