import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const sourcePath = resolve(process.argv[2] ?? '/private/tmp/sgm-national-map-polygon.geojson')
const outputPath = resolve(process.argv[3] ?? 'src/data/share-record-coastline-sla.json')
const tolerance = 0.00018
const targetFeatures = new Map([
  ['SINGAPORE - MAIN ISLAND', 7394],
  ['SENTOSA', 7386],
  ['PULAU UBIN', 7372],
  ['JURONG ISLAND', 7374],
])

const sourceBytes = readFileSync(sourcePath)
const source = JSON.parse(sourceBytes.toString('utf8'))

const squaredSegmentDistance = (point, start, end) => {
  let x = start[0]
  let y = start[1]
  let dx = end[0] - x
  let dy = end[1] - y
  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) {
      x = end[0]
      y = end[1]
    } else if (t > 0) {
      x += dx * t
      y += dy * t
    }
  }
  dx = point[0] - x
  dy = point[1] - y
  return dx * dx + dy * dy
}

const simplifyOpen = (points, ringTolerance) => {
  if (points.length <= 2) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  const squaredTolerance = ringTolerance * ringTolerance
  while (stack.length) {
    const [first, last] = stack.pop()
    let maxDistance = squaredTolerance
    let index = -1
    for (let cursor = first + 1; cursor < last; cursor += 1) {
      const distance = squaredSegmentDistance(points[cursor], points[first], points[last])
      if (distance > maxDistance) {
        index = cursor
        maxDistance = distance
      }
    }
    if (index >= 0) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, index) => keep[index])
}

const orientation = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

const onSegment = (a, b, point) => Math.abs(orientation(a, b, point)) < 1e-12 &&
  point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]) &&
  point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1])

const segmentsIntersect = (a, b, c, d) => {
  const abC = orientation(a, b, c)
  const abD = orientation(a, b, d)
  const cdA = orientation(c, d, a)
  const cdB = orientation(c, d, b)
  if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
    ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return true
  return (Math.abs(abC) < 1e-12 && onSegment(a, b, c)) ||
    (Math.abs(abD) < 1e-12 && onSegment(a, b, d)) ||
    (Math.abs(cdA) < 1e-12 && onSegment(c, d, a)) ||
    (Math.abs(cdB) < 1e-12 && onSegment(c, d, b))
}

const ringSelfIntersects = (ring) => {
  const points = ring.slice(0, -1)
  for (let first = 0; first < points.length; first += 1) {
    const firstEnd = (first + 1) % points.length
    for (let second = first + 1; second < points.length; second += 1) {
      const secondEnd = (second + 1) % points.length
      if (firstEnd === second || secondEnd === first) continue
      if (segmentsIntersect(points[first], points[firstEnd], points[second], points[secondEnd])) return true
    }
  }
  return false
}

const closeAndRound = (points, decimals = 6) => {
  const rounded = points.map(([longitude, latitude]) => [
    Number(longitude.toFixed(decimals)),
    Number(latitude.toFixed(decimals)),
  ])
  return [...rounded, rounded[0]]
}

const simplifyRing = (ring) => {
  const open = ring.slice(0, -1).map(([longitude, latitude]) => [longitude, latitude])
  let startIndex = 0
  for (let index = 1; index < open.length; index += 1) {
    if (open[index][0] < open[startIndex][0] ||
      (open[index][0] === open[startIndex][0] && open[index][1] < open[startIndex][1])) startIndex = index
  }
  const rotated = [...open.slice(startIndex), ...open.slice(0, startIndex)]
  let oppositeIndex = 1
  let farthest = -1
  for (let index = 1; index < rotated.length; index += 1) {
    const dx = rotated[index][0] - rotated[0][0]
    const dy = rotated[index][1] - rotated[0][1]
    const distance = dx * dx + dy * dy
    if (distance > farthest) {
      farthest = distance
      oppositeIndex = index
    }
  }
  for (let attempt = 0; attempt < 9; attempt += 1) {
    const ringTolerance = tolerance / (2 ** attempt)
    const firstArc = simplifyOpen(rotated.slice(0, oppositeIndex + 1), ringTolerance)
    const secondArc = simplifyOpen([...rotated.slice(oppositeIndex), rotated[0]], ringTolerance)
    const simplified = [...firstArc, ...secondArc.slice(1, -1)]
    if (simplified.length < 3) continue
    const candidate = closeAndRound(simplified)
    if (!ringSelfIntersects(candidate)) return candidate
  }
  // Preserve tiny or topologically sensitive parts at source precision.
  const fallback = closeAndRound(open, 7)
  if (ringSelfIntersects(fallback)) throw new Error('Source coastal ring self-intersects')
  return fallback
}

const simplifyPolygon = (rings) => rings.map(simplifyRing)
const simplifyGeometry = (geometry) => geometry.type === 'Polygon'
  ? { type: 'Polygon', coordinates: simplifyPolygon(geometry.coordinates) }
  : geometry.type === 'MultiPolygon'
    ? { type: 'MultiPolygon', coordinates: geometry.coordinates.map(simplifyPolygon) }
    : (() => { throw new Error(`Unsupported coastal geometry: ${geometry.type}`) })()

const features = [...targetFeatures].map(([name, objectId]) => {
  const feature = source.features.find((candidate) =>
    candidate.properties?.FOLDERPATH === 'Layers/Coastal_Outlines' &&
    candidate.properties?.NAME === name &&
    candidate.properties?.OBJECTID === objectId)
  if (!feature) throw new Error(`Missing SLA coastal feature: ${name} (${objectId})`)
  return {
    type: 'Feature',
    properties: {
      name,
      sourceObjectId: objectId,
      sourceGeometryType: feature.geometry.type,
      sourceAreaSquareMetres: feature.properties['SHAPE.AREA'],
    },
    geometry: simplifyGeometry(feature.geometry),
  }
})

const allCoordinates = []
const collect = (value) => {
  if (typeof value[0] === 'number') allCoordinates.push(value)
  else for (const child of value) collect(child)
}
for (const feature of features) collect(feature.geometry.coordinates)
const bbox = [
  Math.min(...allCoordinates.map((point) => point[0])),
  Math.min(...allCoordinates.map((point) => point[1])),
  Math.max(...allCoordinates.map((point) => point[0])),
  Math.max(...allCoordinates.map((point) => point[1])),
]

const output = {
  type: 'FeatureCollection',
  bbox,
  metadata: {
    dataset: 'National Map Polygon',
    agency: 'Singapore Land Authority',
    datasetUrl: 'https://data.gov.sg/datasets/d_29f066d67df3eae91df8a42f443863c8/view',
    licence: 'Singapore Open Data Licence version 1.0',
    licenceUrl: 'https://data.gov.sg/open-data-licence',
    sourceDataPeriod: 'Jun 2025',
    sourceLastUpdated: '2026-10-22',
    accessed: '2026-11-24',
    sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    sourceFilter: 'FOLDERPATH = Layers/Coastal_Outlines; exact NAME and OBJECTID match',
    selectedObjectIds: [...targetFeatures.values()],
    processing: 'Removed Z values; topology-checked Douglas-Peucker simplification starting at 0.00018 degrees and halving per ring when needed; rounded to 6 decimals (7 for source-precision fallbacks); preserved Polygon/MultiPolygon parts, ring order, holes, and closure.',
  },
  features,
}

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
process.stdout.write(`${outputPath}\n`)
