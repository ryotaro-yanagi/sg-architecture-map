import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import data from './data/buildings.json'

type Coordinates = [number, number]
type Variant = 'a' | 'b'

type Building = {
  id: string
  name: string
  architects: string[]
  architectCredit: string
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

const buildings = data.buildings as unknown as Building[]

const typeLabels: Record<string, string> = {
  civic_cultural: '文化・公共',
  mixed_use: '複合用途',
  retail: '商業',
  community: 'コミュニティ',
}

const featureCollection = (selectedId: string | null): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: buildings.map((building) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: building.coordinates },
    properties: {
      id: building.id,
      name: building.name,
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
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [variant, setVariant] = useState<Variant>(() => new URLSearchParams(window.location.search).get('ui') === 'b' ? 'b' : 'a')

  const selected = buildings.find((building) => building.id === selectedId) ?? null
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return buildings
    return buildings.filter((building) =>
      `${building.name} ${building.architectCredit}`.toLocaleLowerCase().includes(normalized),
    )
  }, [query])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [103.879, 1.315],
      zoom: 11.35,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      map.addSource('buildings', { type: 'geojson', data: featureCollection(null) })
      map.addLayer({
        id: 'building-halo',
        type: 'circle',
        source: 'buildings',
        paint: {
          'circle-radius': ['case', ['get', 'selected'], 13, 10],
          'circle-color': 'rgba(255,255,255,.72)',
          'circle-blur': 0.45,
        },
      })
      map.addLayer({
        id: 'building-points',
        type: 'circle',
        source: 'buildings',
        paint: {
          'circle-radius': ['case', ['get', 'selected'], 8, 6],
          'circle-color': ['case', ['get', 'selected'], '#ef6f51', '#f7f1e7'],
          'circle-stroke-color': '#282724',
          'circle-stroke-width': 1.7,
        },
      })
      map.addLayer({
        id: 'building-labels',
        type: 'symbol',
        source: 'buildings',
        minzoom: 13.2,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-offset': [0, 1.45],
          'text-anchor': 'top',
          'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
          'text-radial-offset': 0.75,
        },
        paint: {
          'text-color': '#282724',
          'text-halo-color': '#f8f4ec',
          'text-halo-width': 2,
        },
      })

      const selectAtPoint = (event: maplibregl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(event.point, { layers: ['building-points'] })
        const id = features[0]?.properties?.id as string | undefined
        if (id) {
          setSelectedId(id)
          setExpanded(false)
          setSearchOpen(false)
        }
      }
      map.on('click', selectAtPoint)
      map.on('mouseenter', 'building-points', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'building-points', () => { map.getCanvas().style.cursor = '' })
    })

    mapRef.current = map
    return () => {
      userMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    selectedIdRef.current = selectedId
    const source = mapRef.current?.getSource('buildings') as GeoJSONSource | undefined
    source?.setData(featureCollection(selectedId))
  }, [selectedId])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('ui', variant)
    window.history.replaceState({}, '', url)
    setExpanded(false)
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
    if (focusMap) {
      mapRef.current?.flyTo({ center: building.coordinates, zoom: Math.max(mapRef.current.getZoom(), 14), duration: 900 })
    }
  }

  const locate = () => {
    if (!navigator.geolocation) {
      setNotice('このブラウザでは現在地を利用できません。地図はそのまま使えます。')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location: Coordinates = [coords.longitude, coords.latitude]
        userMarkerRef.current?.remove()
        const element = document.createElement('div')
        element.className = 'user-location-marker'
        element.setAttribute('aria-label', '現在地')
        userMarkerRef.current = new maplibregl.Marker({ element }).setLngLat(location).addTo(mapRef.current!)
        mapRef.current?.flyTo({ center: location, zoom: Math.max(mapRef.current.getZoom(), 14), duration: 900 })
        setLocating(false)
        setNotice('現在地を地図に表示しました。')
      },
      () => {
        setLocating(false)
        setNotice('現在地を取得できませんでした。許可しなくても地図は使えます。')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <main className={`app variant-${variant}`}>
      <div ref={mapContainer} className="map" aria-label="シンガポール建築マップ" />

      <header className="topbar">
        <button className="brand" type="button" onClick={() => mapRef.current?.flyTo({ center: [103.879, 1.315], zoom: 11.35 })} aria-label="シンガポール全体へ戻る">
          <span className="brand-mark">SGM</span>
          <span className="brand-title">Architecture<br />Map</span>
        </button>
        <div className="variant-switch" aria-label="操作方式を切り替える">
          <span>UI</span>
          <button className={variant === 'a' ? 'active' : ''} onClick={() => setVariant('a')} aria-pressed={variant === 'a'}>A</button>
          <button className={variant === 'b' ? 'active' : ''} onClick={() => setVariant('b')} aria-pressed={variant === 'b'}>B</button>
        </div>
      </header>

      <section className={`search-shell ${searchOpen ? 'open' : ''}`}>
        <div className="search-input-wrap">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            aria-label="建築名または設計者で検索"
            placeholder="建築名・設計者を検索"
          />
          {searchOpen && <button className="icon-button small" onClick={() => { setSearchOpen(false); setQuery('') }} aria-label="検索を閉じる"><Icon name="close" /></button>}
        </div>
        {searchOpen && (
          <div className="search-results" role="listbox" aria-label="検索結果">
            <p className="result-count">{results.length ? `${results.length}件の建築` : '一致する建築はありません'}</p>
            {results.map((building) => (
              <button key={building.id} role="option" aria-selected={building.id === selectedId} onClick={() => chooseBuilding(building, true)}>
                <span><strong>{building.name}</strong><small>{building.architects.join(' · ')}</small></span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        )}
      </section>

      <button className={`locate-button ${locating ? 'loading' : ''}`} onClick={locate} disabled={locating} aria-label="現在地を表示">
        <Icon name="locate" /><span>{locating ? '取得中' : '現在地'}</span>
      </button>

      <div className="data-note">7 places · 座標は暫定</div>

      {selected && variant === 'a' && !expanded && (
        <PreviewCard building={selected} onDetails={() => setExpanded(true)} onClose={() => setSelectedId(null)} />
      )}
      {selected && variant === 'a' && expanded && (
        <aside className="detail-panel panel-a" aria-label={`${selected.name}の詳細`}>
          <DetailContent building={selected} onClose={() => setExpanded(false)} />
        </aside>
      )}
      {selected && variant === 'b' && (
        <aside className={`bottom-sheet ${expanded ? 'expanded' : ''}`} aria-label={`${selected.name}${expanded ? 'の詳細' : 'のプレビュー'}`}>
          <button className="sheet-handle" onClick={() => setExpanded(!expanded)} aria-label={expanded ? '詳細をたたむ' : '詳細を開く'}><span /></button>
          {expanded
            ? <DetailContent building={selected} onClose={() => setExpanded(false)} sheet />
            : <PreviewCard building={selected} onDetails={() => setExpanded(true)} onClose={() => setSelectedId(null)} sheet />}
        </aside>
      )}

      {notice && <div className="notice" role="status">{notice}</div>}
    </main>
  )
}

function PreviewCard({ building, onDetails, onClose, sheet = false }: { building: Building; onDetails: () => void; onClose: () => void; sheet?: boolean }) {
  return (
    <section className={sheet ? 'sheet-preview' : 'preview-card'} aria-label={`${building.name}のプレビュー`}>
      <button className="icon-button close-preview" onClick={onClose} aria-label="選択を解除"><Icon name="close" /></button>
      <p className="eyebrow">{typeLabels[building.buildingType]}</p>
      <h1>{building.name}</h1>
      <p className="architects">{building.architects.join(' · ')}</p>
      <button className="primary-button" onClick={onDetails}>詳しく見る <Icon name="arrow" /></button>
    </section>
  )
}

function DetailContent({ building, onClose, sheet = false }: { building: Building; onClose: () => void; sheet?: boolean }) {
  const mapsQuery = encodeURIComponent(`${building.coordinates[1]},${building.coordinates[0]}`)
  const searchQuery = encodeURIComponent(`${building.name} Singapore architecture`)
  return (
    <div className="detail-content">
      <div className="detail-heading">
        <button className="back-button" onClick={onClose}>{sheet ? 'たたむ' : '地図へ戻る'}</button>
        <span className="record-index">SGM / {String(buildings.indexOf(building) + 1).padStart(2, '0')}</span>
      </div>
      <div className="image-placeholder" aria-label="写真は未掲載">
        <span>PHOTO<br />NOT ADDED</span>
        <small>写真は検証後に掲載予定</small>
      </div>
      <p className="eyebrow">{typeLabels[building.buildingType]}</p>
      <h1>{building.name}</h1>
      <dl className="facts">
        <div><dt>設計</dt><dd>{building.architectCredit}</dd></div>
        <div><dt>竣工</dt><dd>{building.completionYear ?? '未確認'}</dd></div>
        <div><dt>用途</dt><dd>{typeLabels[building.buildingType]}</dd></div>
        <div><dt>所在地</dt><dd>{building.address}</dd></div>
      </dl>
      <p className="verification-note">座標は代表点の暫定データです。公開アクセスの可否は未確認です。</p>
      <div className="actions">
        <a className="primary-button" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noreferrer">Google Maps <Icon name="external" /></a>
        <a href={`https://www.google.com/search?q=${searchQuery}`} target="_blank" rel="noreferrer">Google検索 <Icon name="external" /></a>
        <a href={`https://www.google.com/search?tbm=isch&q=${searchQuery}`} target="_blank" rel="noreferrer">画像検索 <Icon name="external" /></a>
      </div>
      <div className="sources">
        <p>出典</p>
        <a href={building.officialSource} target="_blank" rel="noreferrer">DP Architects 公式プロジェクト <Icon name="external" /></a>
        <a href={building.coordinateSource} target="_blank" rel="noreferrer">座標情報 <Icon name="external" /></a>
      </div>
    </div>
  )
}

export default App
