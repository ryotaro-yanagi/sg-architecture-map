import assert from 'node:assert/strict'
import { test } from 'node:test'
import coastline from '../src/data/share-record-coastline-sla.json' with { type: 'json' }
import buildingData from '../src/data/buildings.json' with { type: 'json' }

const polygons = (geometry) => geometry.type === 'Polygon'
  ? [geometry.coordinates]
  : geometry.coordinates

const rings = (geometry) => polygons(geometry).flat()

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

const selfIntersects = (ring) => {
  const points = ring.slice(0, -1)
  for (let first = 0; first < points.length; first += 1) {
    const firstEnd = (first + 1) % points.length
    for (let second = first + 1; second < points.length; second += 1) {
      const secondEnd = (second + 1) % points.length
      if (first === second || firstEnd === second || secondEnd === first) continue
      if (segmentsIntersect(points[first], points[firstEnd], points[second], points[secondEnd])) return true
    }
  }
  return false
}

const pointInRing = (point, ring) => {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const a = ring[index]
    const b = ring[previous]
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}

const pointInPolygon = (point, polygon) =>
  pointInRing(point, polygon[0]) && !polygon.slice(1).some((hole) => pointInRing(point, hole))

const pointInCoastline = (point) => coastline.features.some((feature) =>
  polygons(feature.geometry).some((polygon) => pointInPolygon(point, polygon)))

const bounds = (feature) => {
  const coordinates = rings(feature.geometry).flat()
  return [
    Math.min(...coordinates.map((point) => point[0])),
    Math.min(...coordinates.map((point) => point[1])),
    Math.max(...coordinates.map((point) => point[0])),
    Math.max(...coordinates.map((point) => point[1])),
  ]
}

test('contains the four selected SLA coastal features with their original geometry families', () => {
  assert.deepEqual(
    coastline.features.map((feature) => [feature.properties.name, feature.properties.sourceObjectId, feature.geometry.type]),
    [
      ['SINGAPORE - MAIN ISLAND', 7394, 'Polygon'],
      ['SENTOSA', 7386, 'Polygon'],
      ['PULAU UBIN', 7372, 'MultiPolygon'],
      ['JURONG ISLAND', 7374, 'Polygon'],
    ],
  )
})

test('keeps every ring closed and free of self intersections', () => {
  for (const feature of coastline.features) {
    for (const ring of rings(feature.geometry)) {
      assert.ok(ring.length >= 4, `${feature.properties.name} ring has too few vertices`)
      assert.deepEqual(ring[0], ring.at(-1), `${feature.properties.name} ring is open`)
      assert.equal(selfIntersects(ring), false, `${feature.properties.name} ring self-intersects`)
    }
  }
})

test('keeps polygon holes inside their exterior ring', () => {
  for (const feature of coastline.features) {
    for (const polygon of polygons(feature.geometry)) {
      for (const hole of polygon.slice(1)) {
        assert.equal(pointInRing(hole[0], polygon[0]), true, `${feature.properties.name} hole is outside its shell`)
      }
    }
  }
})

test('preserves the relative position of Sentosa, Pulau Ubin, and Jurong Island', () => {
  const byName = Object.fromEntries(coastline.features.map((feature) => [feature.properties.name, bounds(feature)]))
  assert.ok(byName['JURONG ISLAND'][2] < byName.SENTOSA[0], 'Jurong Island should be west of Sentosa')
  assert.ok(byName.SENTOSA[3] < byName['PULAU UBIN'][1], 'Sentosa should be south of Pulau Ubin')
  const mainCentreLongitude = (byName['SINGAPORE - MAIN ISLAND'][0] + byName['SINGAPORE - MAIN ISLAND'][2]) / 2
  assert.ok(byName['PULAU UBIN'][0] > mainCentreLongitude, 'Pulau Ubin should be east of the main-island centre')
})

test('places every current building coordinate on one of the selected land polygons', () => {
  const outside = buildingData.buildings.filter((building) => !pointInCoastline(building.coordinates))
  assert.deepEqual(outside.map((building) => building.id), [])
})
