// Developer-only visual study. Never mounted in normal production browsing.
import { Marker } from 'maplibre-gl'
import type { Map as MapLibreMap } from 'maplibre-gl'

type ShapeId = 'long' | 'rise' | 'steps' | 'sway'
type Edge = 'none' | 'shadow' | 'keyline'
type Face = 'neutral' | 'look' | 'rest'
type Scheme = 'day' | 'night'
type SizeChoice = 'auto' | '16' | '26' | '34'
type ViewMode = 'single' | 'compare'
type Point = [number, number]

interface Form {
  label: string
  path: string
  eyes: [Point, Point]
  opticalPath?: string
  opticalEyes?: [Point, Point]
}

// Exactly the v10 silhouette study, with the v14 16px corrections.
const forms: Record<ShapeId, Form> = {
  long: {
    label: 'Long',
    path: 'M23 45 C42 41 83 41 101 45 C110 47 115 53 115 64 C115 76 108 84 96 85 C72 85 43 86 23 85 C12 84 7 76 7 65 C7 55 12 47 23 45 Z',
    eyes: [[49, 64], [73, 64]],
    opticalPath: 'M23 39 C42 36 84 36 100 40 C111 43 115 51 115 63 C115 76 109 88 98 90 C73 91 42 92 22 90 C12 89 7 80 7 67 C7 53 12 42 23 39 Z',
    opticalEyes: [[46, 64], [76, 64]],
  },
  rise: {
    label: 'Rise',
    path: 'M43 18 C60 13 85 15 99 20 C107 23 109 29 106 38 C98 59 88 85 80 100 C76 109 68 112 59 112 L47 112 C36 112 29 103 29 93 L29 36 C29 27 34 21 43 18 Z',
    eyes: [[54, 55], [77, 55]],
    opticalEyes: [[51, 55], [80, 55]],
  },
  steps: {
    label: 'Steps',
    path: 'M28 24 C40 24 46 29 46 39 L46 44 C46 49 50 52 55 52 L62 52 C70 52 75 58 75 65 L75 69 C75 74 79 77 85 77 L93 77 C104 77 111 85 111 95 C111 105 103 111 93 111 L27 111 C15 111 11 103 11 92 L11 41 C11 30 17 24 28 24 Z',
    eyes: [[42, 88], [65, 88]],
    opticalPath: 'M28 19 C40 19 48 25 48 36 L48 42 C48 48 52 50 58 50 L65 50 C74 50 79 56 79 65 L79 69 C79 74 83 77 89 77 L94 77 C105 77 112 86 112 96 C112 106 103 112 93 112 L26 112 C15 112 10 103 10 92 L10 37 C10 27 17 19 28 19 Z',
    opticalEyes: [[40, 88], [71, 88]],
  },
  sway: {
    label: 'Sway',
    path: 'M39 24 C56 16 83 17 99 28 C109 37 109 53 103 65 C114 79 101 98 81 103 C65 107 40 103 26 98 C11 92 11 79 17 70 C23 63 33 61 39 58 C29 52 28 32 39 24 Z',
    eyes: [[50, 77], [73, 77]],
    opticalEyes: [[47, 77], [76, 77]],
  },
}

const shapeIds: ShapeId[] = ['long', 'rise', 'steps', 'sway']
const colors = { coral: '#EE8974', ochre: '#E9C77D', sage: '#91B7A2' } as const
type Color = keyof typeof colors

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

function zoomSize(zoom: number): number {
  const stops: Point[] = [[9, 16], [11, 19], [13, 23], [14, 26], [16, 31], [18, 34]]
  if (zoom <= stops[0][0]) return stops[0][1]
  if (zoom >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let i = 1; i < stops.length; i++) {
    const [z1, s1] = stops[i]
    const [z0, s0] = stops[i - 1]
    if (zoom <= z1) return s0 + ((zoom - z0) / (z1 - z0)) * (s1 - s0)
  }
  return 34
}

function avatarSvg(
  id: ShapeId, size: number, color: Color, edge: Edge, face: Face, optical: boolean,
): string {
  const form = forms[id]
  const tiny = size <= 16 && optical
  const path = tiny ? form.opticalPath ?? form.path : form.path
  const eyes = tiny ? form.opticalEyes ?? form.eyes : form.eyes
  const [rx, ry, prx, pry] = tiny ? [8.6, 10.1, 4.5, 5.6] : [7.5, 8.8, 3.7, 4.9]
  const stroke = edge === 'keyline'
    ? ' stroke="#31453B" stroke-opacity=".65" stroke-width="' + (0.68 * 120 / size).toFixed(2) + '" stroke-linejoin="round" paint-order="stroke fill"'
    : ''
  const shadow = edge === 'shadow'
    ? ' style="filter:drop-shadow(0px .7px 1.15px rgba(38,57,45,.36))"'
    : ''
  const eyeMarkup = eyes.map(([x, y]) => {
    if (face === 'rest') {
      return '<path d="M' + (x - 6.4) + ' ' + (y - 1) + ' Q' + x + ' ' + (y + 6) +
        ' ' + (x + 6.4) + ' ' + (y - 1) + '" fill="none" stroke="#26312D" stroke-width="3.4" stroke-linecap="round"/>'
    }
    const dx = face === 'look' ? 2.7 : 0
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="#FAF8F1"/>' +
      '<ellipse cx="' + (x + dx) + '" cy="' + (y + .9) + '" rx="' + prx + '" ry="' + pry + '" fill="#26312D"/>'
  }).join('')
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
    '" viewBox="0 0 120 120" aria-hidden="true" style="display:block;overflow:visible">' +
    '<path d="' + path + '" fill="' + colors[color] + '"' + stroke + shadow + '/>' +
    eyeMarkup + '</svg>'
}

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
