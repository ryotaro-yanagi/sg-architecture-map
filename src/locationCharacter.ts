// Opt-in implementation of SGM's architecture-derived current-location character.
// The MapLibre marker coordinates remain the only source of geographic position.
// This module modifies its inner SVG, never the marker's actual lng/lat.
import { forms, shapeIds, zoomSize } from './locationCharacterShapes'
import type { ShapeId, Point } from './locationCharacterShapes'

const SVG_NS = 'http://www.w3.org/2000/svg'
const SAMPLE_COUNT = 72
const MORPH_DURATION_MS = 760
const FORM_HOLD_MIN_MS = 45_000
const FORM_HOLD_RANGE_MS = 45_000
const GAZE_HOLD_MIN_MS = 9_000
const GAZE_HOLD_RANGE_MS = 10_000
const EYE_WHITE = '#FAF8F1'
const EYE_DARK = '#26312D'
const BODY_OCHRE = '#E9C77D'

const smooth = (t: number) => t * t * (3 - 2 * t)
const blend = (a: number, b: number, t: number) => a + (b - a) * t

/** Fixed-size closed contours allow a direct morph without changing the GPS anchor. */
function sampledContour(pathData: string): Point[] {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 120 120')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.cssText = 'position:absolute;pointer-events:none;visibility:hidden'
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', pathData)
  svg.append(path)
  document.body.append(svg)
  try {
    const length = path.getTotalLength()
    if (!(length > 0)) throw new Error('Invalid avatar contour')
    return Array.from({ length: SAMPLE_COUNT }, (_, i): Point => {
      const p = path.getPointAtLength(length * i / SAMPLE_COUNT)
      return [p.x, p.y]
    })
  } finally {
    svg.remove()
  }
}

function closedCurve(points: Point[]): string {
  const count = points.length
  const f = (n: number) => Number(n.toFixed(3))
  const commands = ['M' + f(points[0][0]) + ' ' + f(points[0][1])]
  for (let i = 0; i < count; i++) {
    const prev = points[(i - 1 + count) % count]
    const a = points[i]
    const b = points[(i + 1) % count]
    const next = points[(i + 2) % count]
    const c1: Point = [a[0] + (b[0] - prev[0]) / 6, a[1] + (b[1] - prev[1]) / 6]
    const c2: Point = [b[0] - (next[0] - a[0]) / 6, b[1] - (next[1] - a[1]) / 6]
    commands.push('C' + f(c1[0]) + ' ' + f(c1[1]) + ' ' +
      f(c2[0]) + ' ' + f(c2[1]) + ' ' + f(b[0]) + ' ' + f(b[1]))
  }
  return commands.join(' ') + ' Z'
}

const opticalPaths = (id: ShapeId, tiny: boolean): string =>
  tiny ? forms[id].opticalPath ?? forms[id].path : forms[id].path

const eyePositions = (id: ShapeId, tiny: boolean): [Point, Point] =>
  tiny ? forms[id].opticalEyes ?? forms[id].eyes : forms[id].eyes

const allForms = () => {
  const normal = {} as Record<ShapeId, Point[]>
  const optical = {} as Record<ShapeId, Point[]>
  shapeIds.forEach(id => {
    normal[id] = sampledContour(opticalPaths(id, false))
    optical[id] = sampledContour(opticalPaths(id, true))
  })
  return { normal, optical }
}

const createEllipse = (fill: string) => {
  const el = document.createElementNS(SVG_NS, 'ellipse')
  el.setAttribute('fill', fill)
  return el
}

export interface LocationCharacterOptions {
  map: import('maplibre-gl').Map
  body: HTMLDivElement
}

/**
 * Mount SVG and animation controls on an already-positioned MapLibre user marker.
 * The caller owns the MapLibre marker; call the returned cleanup before removal.
 */
export function mountLocationCharacter({ map, body }: LocationCharacterOptions): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let currentShape: ShapeId = 'steps'
  let nextShape: ShapeId | null = null
  let gaze = 2.7 // Look, as selected in the v14 iPhone comparison.
  let desiredGaze = gaze
  let inMorph = false
  let closed = false
  let morphTimer = 0
  let idleTimer = 0
  let frame = 0
  let size = zoomSize(map.getZoom())
  let tiny = size <= 16.05
  let cached: ReturnType<typeof allForms> | null = null

  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 120 120')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible'
  const bodyPath = document.createElementNS(SVG_NS, 'path')
  bodyPath.setAttribute('fill', BODY_OCHRE)
  bodyPath.style.filter = 'drop-shadow(0px .7px 1.15px rgba(38,57,45,.36))'
  svg.append(bodyPath)

  const whites = [createEllipse(EYE_WHITE), createEllipse(EYE_WHITE)]
  const pupils = [createEllipse(EYE_DARK), createEllipse(EYE_DARK)]
  whites.forEach((eye, i) => {
    svg.append(eye)
    svg.append(pupils[i])
  })
  body.replaceChildren(svg)
  try {
    cached = allForms()
  } catch (error) {
    // Geometry sampling can fail on unsupported SVG engines; retain the
    // recognizable static form rather than removing the location marker.
    console.warn('Location character morph disabled; showing static form', error)
  }

  const paint = (from: ShapeId, to: ShapeId, progress: number, blink = 0) => {
    const t = Math.max(0, Math.min(1, progress))
    if (from === to || t <= 0 || !cached) {
      bodyPath.setAttribute('d', opticalPaths(from, tiny))
    } else if (t >= 1) {
      bodyPath.setAttribute('d', opticalPaths(to, tiny))
    } else {
      const tracks = tiny ? cached.optical : cached.normal
      const a = tracks[from], b = tracks[to]
      bodyPath.setAttribute('d', closedCurve(a.map((p, i): Point =>
        [blend(p[0], b[i][0], t), blend(p[1], b[i][1], t)])))
    }
    const source = eyePositions(from, tiny)
    const target = eyePositions(to, tiny)
    for (let i = 0; i < 2; i++) {
      const x = blend(source[i][0], target[i][0], t)
      const y = blend(source[i][1], target[i][1], t)
      const eyeWidth = tiny ? 8.6 : 7.5
      const pupilWidth = tiny ? 4.5 : 3.7
      const openness = Math.max(0.12, 1 - blink)
      const white = whites[i], pupil = pupils[i]
      white.setAttribute('cx', String(x))
      white.setAttribute('cy', String(y))
      white.setAttribute('rx', String(eyeWidth))
      white.setAttribute('ry', String((tiny ? 10.1 : 8.8) * openness))
      pupil.setAttribute('cx', String(x + gaze))
      pupil.setAttribute('cy', String(y + .9))
      pupil.setAttribute('rx', String(pupilWidth))
      pupil.setAttribute('ry', String((tiny ? 5.6 : 4.9) * openness))
    }
  }

  const syncScale = () => {
    size = zoomSize(map.getZoom())
    const nextTiny = size <= 16.05
    body.style.setProperty('--location-scale', String(size / 34))
    if (nextTiny !== tiny) {
      tiny = nextTiny
      if (!inMorph) paint(currentShape, currentShape, 0)
    }
  }

  const cancelPending = () => {
    window.clearTimeout(morphTimer)
    window.clearTimeout(idleTimer)
    window.cancelAnimationFrame(frame)
    morphTimer = 0
    idleTimer = 0
    frame = 0
  }

  const canAnimate = () => !closed && !document.hidden && !reduced.matches

  const schedule = () => {
    cancelPending()
    if (!canAnimate() || !cached) return

    idleTimer = window.setTimeout(() => {
      if (!canAnimate() || inMorph) return
      desiredGaze = Math.random() < .5 ? 0 : (Math.random() < .5 ? -2.7 : 2.7)
      const fromGaze = gaze
      const start = performance.now()
      const gazeTick = (now: number) => {
        if (!canAnimate()) return
        const t = Math.min(1, (now - start) / 260)
        gaze = blend(fromGaze, desiredGaze, smooth(t))
        paint(currentShape, currentShape, 0)
        if (t < 1) frame = window.requestAnimationFrame(gazeTick)
        else scheduleGaze()
      }
      frame = window.requestAnimationFrame(gazeTick)
    }, GAZE_HOLD_MIN_MS + Math.random() * GAZE_HOLD_RANGE_MS)

    morphTimer = window.setTimeout(() => {
      if (!canAnimate() || inMorph) return
      const options = shapeIds.filter(id => id !== currentShape)
      const destination = options[Math.floor(Math.random() * options.length)]
      const source = currentShape
      nextShape = destination
      inMorph = true
      const start = performance.now()
      const previousGaze = gaze
      const morphTick = (now: number) => {
        if (!canAnimate()) return
        const u = Math.min(1, (now - start) / MORPH_DURATION_MS)
        const t = smooth(u)
        // The blink is soft and happens only during the middle of the morph.
        const blink = Math.max(0, 1 - Math.abs(u - .5) / .13)
        gaze = blend(previousGaze, 0, smooth(Math.min(1, u * 2)))
        paint(source, destination, t, blink)
        if (u < 1) {
          frame = window.requestAnimationFrame(morphTick)
        } else {
          currentShape = destination
          nextShape = null
          inMorph = false
          gaze = 0
          paint(currentShape, currentShape, 0)
          schedule()
        }
      }
      frame = window.requestAnimationFrame(morphTick)
    }, FORM_HOLD_MIN_MS + Math.random() * FORM_HOLD_RANGE_MS)
  }

  const scheduleGaze = () => {
    if (!canAnimate() || inMorph) return
    window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => {
      if (!canAnimate() || inMorph) return
      gaze = Math.random() < .5 ? 0 : 2.7
      paint(currentShape, currentShape, 0)
      scheduleGaze()
    }, GAZE_HOLD_MIN_MS + Math.random() * GAZE_HOLD_RANGE_MS)
  }

  const onVisibility = () => {
    cancelPending()
    if (nextShape !== null) currentShape = nextShape
    nextShape = null
    inMorph = false
    gaze = 0
    paint(currentShape, currentShape, 0)
    schedule()
  }

  syncScale()
  paint(currentShape, currentShape, 0)
  map.on('zoom', syncScale)
  document.addEventListener('visibilitychange', onVisibility)
  reduced.addEventListener('change', onVisibility)
  schedule()

  return () => {
    closed = true
    cancelPending()
    map.off('zoom', syncScale)
    document.removeEventListener('visibilitychange', onVisibility)
    reduced.removeEventListener('change', onVisibility)
    body.replaceChildren()
  }
}
