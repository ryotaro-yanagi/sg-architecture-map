// Geometry, optical sizes and SVG rendering shared by the Character Lab and actual location marker.
export type ShapeId = 'long' | 'rise' | 'steps' | 'sway'
export type Edge = 'none' | 'shadow' | 'keyline'
export type Face = 'neutral' | 'look' | 'rest'
export type Scheme = 'day' | 'night'
export type SizeChoice = 'auto' | '16' | '26' | '34'
export type Point = [number, number]

export interface Form {
  label: string
  path: string
  eyes: [Point, Point]
  opticalPath?: string
  opticalEyes?: [Point, Point]
}

// Exactly the v10 silhouette study, with the v14 16px corrections.
export const forms: Record<ShapeId, Form> = {
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

export const shapeIds: ShapeId[] = ['long', 'rise', 'steps', 'sway']
export const colors = { coral: '#EE8974', ochre: '#E9C77D', sage: '#91B7A2' } as const
export type Color = keyof typeof colors

export function zoomSize(zoom: number): number {
  const stops: Point[] = [[9, 20], [11, 23], [13, 28], [14, 32], [16, 37], [18, 40]]
  if (zoom <= stops[0][0]) return stops[0][1]
  if (zoom >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let i = 1; i < stops.length; i++) {
    const [z1, s1] = stops[i]
    const [z0, s0] = stops[i - 1]
    if (zoom <= z1) return s0 + ((zoom - z0) / (z1 - z0)) * (s1 - s0)
  }
  return 34
}

export function avatarSvg(
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
