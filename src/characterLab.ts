// Developer-only visual study. Never mounted in normal production browsing.
import { Marker } from 'maplibre-gl'
import type { Map as MapLibreMap } from 'maplibre-gl'

import { avatarSvg, forms, shapeIds, zoomSize } from './locationCharacterShapes'
import type { ShapeId, Edge, Face, Scheme, SizeChoice, Color } from './locationCharacterShapes'

type ViewMode = 'single' | 'compare'

const css = [
  '.sgm-cl{position:fixed;top:82px;right:16px;z-index:2500;width:272px;max-height:calc(100dvh - 96px);overflow:auto;',
  'color:#26312D;background:#FAFAF8;border:1px solid #C9CEC6;border-radius:15px;',
  'box-shadow:0 6px 28px #151F1940;font:13px/1.4 system-ui,-apple-system,sans-serif;}',
  '.sgm-cl *{box-sizing:border-box}.sgm-cl button{font:inherit;cursor:pointer;touch-action:manipulation}',
  '.sgm-cl-header{position:sticky;top:0;background:#FAFAF8;display:flex;align-items:center;justify-content:space-between;',
  'padding:13px 14px 10px;border-bottom:1px solid #E2E5DF;z-index:1;}',
  '.sgm-cl-title{display:block;font-size:12px;letter-spacing:.04em;font-weight:700}',
  '.sgm-cl-sub{font-size:10px;color:#718075}',
  '.sgm-cl-collapse{width:28px;height:28px;border:1px solid #DBDFDA;border-radius:9px;background:transparent}',
  '.sgm-cl-body{padding:12px 13px 15px;display:grid;gap:11px}',
  '.sgm-cl[data-collapsed="true"] .sgm-cl-body{display:none}',
  '.sgm-cl-label{display:flex;align-items:center;justify-content:space-between;margin:0 0 5px;font-size:11px;font-weight:700}',
  '.sgm-cl-row{display:flex;gap:5px;flex-wrap:wrap}',
  '.sgm-cl-choice{flex:1 1 auto;min-height:30px;padding:5px 8px;color:#46544B;background:transparent;',
  'border:1px solid #D8DDD6;border-radius:9px;white-space:nowrap}',
  '.sgm-cl-choice[aria-pressed="true"]{border-color:#26312D;background:#E8ECE6;color:#202B24}',
  '.sgm-cl-forms{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}',
  '.sgm-cl-form{display:flex;align-items:center;flex-direction:column;gap:3px;justify-content:center;',
  'min-height:61px;padding:5px 2px;font-size:10px;border:1px solid #D8DDD6;border-radius:10px;color:#344039;background:transparent}',
  '.sgm-cl-form[aria-pressed="true"]{border-color:#26312D;background:#E8ECE6}',
  '.sgm-cl-thumb{display:grid;place-items:center;height:29px;width:40px}',
  '.sgm-cl-note{font-size:11px;color:#617168;line-height:1.45;margin:0}',
  '.sgm-cl-bottom{display:flex;gap:5px}.sgm-cl-bottom button{flex:1}',
  '.sgm-cl-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));',
  'column-gap:16px;row-gap:9px;width:100%;height:100%;align-items:center;pointer-events:none}',
  '.sgm-cl-grid-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}',
  '.sgm-cl-grid-label{font:600 10px/1.2 system-ui,sans-serif;color:#26312D;background:#FAFAF8E8;',
  'border-radius:99px;padding:2px 7px;box-shadow:0 1px 3px #26312D22}',
  '.sgm-cl-compare-hint{margin:0;font-size:10px;color:#718075}',
  '@media(max-width:640px){.sgm-cl{top:auto;bottom:90px;right:10px;width:min(288px,calc(100vw - 20px));',
  'max-height:calc(100dvh - 125px)}}',
].join('')

interface LabOptions {
  map: MapLibreMap
  scheme: Scheme
  onSchemeChange: (scheme: Scheme) => void
}

/** A sample marker on the real map; it never requests geolocation or updates the production user marker. */
export function mountCharacterLab({ map, scheme: initialScheme, onSchemeChange }: LabOptions): () => void {
  // Screenshot-approved reference configuration (v14). Keep size fixed at 34px
  // for A/B studies; Zoom uses the existing 16–34px SGM scaling function.
  let shape: ShapeId = 'steps'
  let size: SizeChoice = '34'
  let edge: Edge = 'shadow'
  let face: Face = 'look'
  let color: Color = 'ochre'
  let view: ViewMode = 'single'
  let scheme: Scheme = initialScheme
  let optical = true
  let collapsed = false

  const style = document.createElement('style')
  style.dataset.characterLab = 'true'
  style.textContent = css
  document.head.append(style)

  const panel = document.createElement('aside')
  panel.className = 'sgm-cl'
  panel.setAttribute('aria-label', 'Character Lab – developer preview')
  panel.dataset.collapsed = 'false'
  panel.innerHTML = [
    '<header class="sgm-cl-header"><div><span class="sgm-cl-title">Character Lab</span>',
    '<span class="sgm-cl-sub">Development preview · not GPS</span></div>',
    '<button type="button" class="sgm-cl-collapse" data-action="collapse" aria-label="Collapse lab" aria-expanded="true">−</button></header>',
    '<div class="sgm-cl-body">',
    '<section><div class="sgm-cl-label">Map comparison</div><div class="sgm-cl-row">',
    '<button type="button" class="sgm-cl-choice" data-view="single" aria-pressed="true">Single</button>',
    '<button type="button" class="sgm-cl-choice" data-view="compare" aria-pressed="false">All four</button>',
    '</div><p class="sgm-cl-compare-hint">The same color, face, edge and size for every shape.</p></section>',
    '<section><div class="sgm-cl-label">Shape</div><div class="sgm-cl-forms">',
    ...shapeIds.map(id => '<button type="button" class="sgm-cl-form" data-shape="' + id +
      '" aria-pressed="false"><span class="sgm-cl-thumb" data-thumb="' + id + '"></span>' +
      forms[id].label + '</button>'),
    '</div></section>',
    '<section><div class="sgm-cl-label">Size <output data-size-output></output></div>',
    '<div class="sgm-cl-row">',
    ...(['auto', '16', '26', '34'] as SizeChoice[]).map(value =>
      '<button type="button" class="sgm-cl-choice" data-size="' + value + '" aria-pressed="false">' +
      (value === 'auto' ? 'Zoom' : value + 'px') + '</button>'),
    '</div></section>',
    '<section><div class="sgm-cl-label">Edge separation</div><div class="sgm-cl-row">',
    ...(['none', 'shadow', 'keyline'] as Edge[]).map(value =>
      '<button type="button" class="sgm-cl-choice" data-edge="' + value +
      '" aria-pressed="false">' + (value === 'none' ? 'None' : value === 'shadow' ? 'Shadow' : 'Keyline') + '</button>'),
    '</div></section>',
    '<section><div class="sgm-cl-label">Body color</div><div class="sgm-cl-row">',
    ...(['coral', 'ochre', 'sage'] as Color[]).map(value =>
      '<button type="button" class="sgm-cl-choice" data-color="' + value +
      '" aria-pressed="false">' + value[0].toUpperCase() + value.slice(1) + '</button>'),
    '</div></section>',
    '<section><div class="sgm-cl-label">Face</div><div class="sgm-cl-row">',
    ...(['neutral', 'look', 'rest'] as Face[]).map(value =>
      '<button type="button" class="sgm-cl-choice" data-face="' + value +
      '" aria-pressed="false">' + value[0].toUpperCase() + value.slice(1) + '</button>'),
    '</div></section>',
    '<section><div class="sgm-cl-label">Map appearance</div><div class="sgm-cl-row">',
    '<button type="button" class="sgm-cl-choice" data-scheme="day" aria-pressed="false">Day</button>',
    '<button type="button" class="sgm-cl-choice" data-scheme="night" aria-pressed="false">Night</button>',
    '</div></section>',
    '<section><button type="button" class="sgm-cl-choice" data-action="optical" aria-pressed="true">',
    '16px optical correction: on</button></section>',
    '<p class="sgm-cl-note">Tap the map to move the sample. Use All four, then collapse this panel to compare on the actual map. Not GPS.</p>',
    '<div class="sgm-cl-bottom"><button type="button" class="sgm-cl-choice" data-action="center">Place at map center</button>',
    '<button type="button" class="sgm-cl-choice" data-action="zoom">Zoom to 14</button></div>',
    '</div>',
  ].join('')
  document.body.append(panel)

  const element = document.createElement('div')
  element.style.pointerEvents = 'none'
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', 'Character Lab sample marker, not your current location')
  const marker = new Marker({ element, anchor: 'center' }).setLngLat(map.getCenter()).addTo(map)

  const render = () => {
    const actualSize = size === 'auto' ? zoomSize(map.getZoom()) : Number(size)
    if (view === 'compare') {
      element.style.width = '184px'
      element.style.height = '144px'
      element.setAttribute('aria-label', 'Character Lab, four sample shapes on the map, not GPS')
      element.innerHTML = '<div class="sgm-cl-grid">' +
        shapeIds.map(id => '<div class="sgm-cl-grid-item">' +
          avatarSvg(id, actualSize, color, edge, face, optical) +
          '<span class="sgm-cl-grid-label">' + forms[id].label + '</span></div>').join('') +
        '</div>'
    } else {
      element.style.width = actualSize + 'px'
      element.style.height = actualSize + 'px'
      element.setAttribute('aria-label', 'Character Lab, ' + forms[shape].label + ', not GPS')
      element.innerHTML = avatarSvg(shape, actualSize, color, edge, face, optical)
    }
    panel.querySelectorAll<HTMLElement>('[data-thumb]').forEach(el => {
      const id = el.dataset.thumb as ShapeId
      el.innerHTML = avatarSvg(id, 28, color, 'none', 'neutral', false)
    })
    panel.querySelectorAll<HTMLButtonElement>('button[data-shape], button[data-view], button[data-size], button[data-edge], button[data-color], button[data-face], button[data-scheme]')
      .forEach(button => {
        const data = button.dataset
        button.setAttribute('aria-pressed', String(
          (data.shape === shape && view === 'single') || data.view === view ||
          data.size === size || data.edge === edge ||
          data.color === color || data.face === face || data.scheme === scheme,
        ))
      })
    const correction = panel.querySelector<HTMLButtonElement>('[data-action="optical"]')
    if (correction) {
      correction.textContent = '16px optical correction: ' + (optical ? 'on' : 'off')
      correction.setAttribute('aria-pressed', String(optical))
    }
    const output = panel.querySelector<HTMLOutputElement>('[data-size-output]')
    if (output) output.textContent = actualSize.toFixed(1) + 'px'
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('button')
    if (!button || !panel.contains(button)) return
    const data = button.dataset
    if (data.view) view = data.view as ViewMode
    if (data.shape) { shape = data.shape as ShapeId; view = 'single' }
    if (data.size) size = data.size as SizeChoice
    if (data.edge) edge = data.edge as Edge
    if (data.color) color = data.color as Color
    if (data.face) face = data.face as Face
    if (data.scheme === 'day' || data.scheme === 'night') {
      scheme = data.scheme
      onSchemeChange(scheme)
    }
    if (data.action === 'optical') optical = !optical
    if (data.action === 'center') marker.setLngLat(map.getCenter())
    if (data.action === 'zoom') map.easeTo({ zoom: 14, duration: 250 })
    if (data.action === 'collapse') {
      collapsed = !collapsed
      panel.dataset.collapsed = String(collapsed)
      button.textContent = collapsed ? '+' : '−'
      button.setAttribute('aria-expanded', String(!collapsed))
      button.setAttribute('aria-label', collapsed ? 'Expand lab' : 'Collapse lab')
    }
    render()
  }
  const onMapClick = (event: { lngLat: { lng: number; lat: number } }) => marker.setLngLat(event.lngLat)
  const onZoom = () => { if (size === 'auto') render() }
  panel.addEventListener('click', onClick)
  map.on('click', onMapClick)
  map.on('zoom', onZoom)
  render()

  return () => {
    panel.removeEventListener('click', onClick)
    map.off('click', onMapClick)
    map.off('zoom', onZoom)
    marker.remove()
    panel.remove()
    style.remove()
  }
}
