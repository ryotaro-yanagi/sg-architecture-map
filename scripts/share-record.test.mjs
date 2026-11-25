import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { createCollectionStateStore } from '../src/collectionState.ts'

const root = resolve(import.meta.dirname, '..')
const vite = await createServer({
  root,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
})
const {
  SHARE_RECORD_HEIGHT,
  SHARE_RECORD_WIDTH,
  createShareRecordSvg,
  getVisitedBuildings,
} = await vite.ssrLoadModule('/src/shareRecordGraphic.ts')
const {
  buildingCategoryColor,
  getMapCategory,
} = await vite.ssrLoadModule('/src/buildingCategories.ts')
const { defaultColorTokens } = await vite.ssrLoadModule('/src/colorTokens.ts')

after(async () => vite.close())

const createBuildings = (count) => Array.from({ length: count }, (_, index) => ({
  id: `building-${index + 1}`,
  name: `Building ${index + 1}`,
  buildingType: 'office',
  coordinates: [103.7 + (index % 20) * .012, 1.24 + (index % 12) * .014],
}))

const createSnapshot = (buildings, visitedIds) => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const store = createCollectionStateStore(buildings.map((building) => building.id), storage)
  for (const id of visitedIds) {
    const result = store.updateBuildingState(id, { visited: true })
    assert.equal(result.ok, true)
  }
  return store.getSnapshot()
}

test('selects only visited buildings from the shared collection snapshot', () => {
  const buildings = createBuildings(3)
  const snapshot = createSnapshot(buildings, ['building-1', 'building-3'])

  assert.deepEqual(
    getVisitedBuildings(buildings, snapshot).map((building) => building.id),
    ['building-1', 'building-3'],
  )
})

test('shares the live map category classification and colors', () => {
  const architecture = defaultColorTokens.day.architecture
  const cases = [
    ['civic_cultural', 'culture_civic', architecture.cultureCivic],
    ['community', 'culture_civic', architecture.cultureCivic],
    ['sports', 'culture_civic', architecture.cultureCivic],
    ['infrastructure', 'culture_civic', architecture.cultureCivic],
    ['healthcare', 'culture_civic', architecture.cultureCivic],
    ['mixed_use', 'mixed_use', architecture.mixedUse],
    ['retail', 'commercial', architecture.commercial],
    ['office', 'commercial', architecture.commercial],
    ['education', 'education', architecture.education],
    ['hospitality', 'hospitality', architecture.hospitality],
    ['residential', 'residential', architecture.residential],
    ['unmapped', null, architecture.genericFill],
  ]

  for (const [buildingType, category, color] of cases) {
    assert.equal(getMapCategory(buildingType), category)
    assert.equal(buildingCategoryColor(architecture, buildingType), color)
  }
})

test('uses deterministic ID order and keeps coincident buildings at the same coordinates', () => {
  const buildings = [
    { id: 'building-b', name: 'B', buildingType: 'mixed_use', coordinates: [103.8, 1.3] },
    { id: 'building-a', name: 'A', buildingType: 'education', coordinates: [103.8, 1.3] },
  ]
  const snapshot = createSnapshot(buildings, buildings.map((building) => building.id))
  const svg = createShareRecordSvg({ buildings, snapshot })
  const markers = [...svg.matchAll(/<circle class="marker"([^>]*)\/>/g)].map((match) => match[1])

  assert.equal(markers.length, 2)
  assert.match(markers[0], /data-building-id="building-a"/)
  assert.match(markers[1], /data-building-id="building-b"/)
  const positions = markers.map((marker) => marker.match(/cx="([^"]+)" cy="([^"]+)"/)?.slice(1))
  assert.deepEqual(positions[0], positions[1])
})

for (const count of [0, 1, 10, 120]) {
  test(`renders a fixed-size SVG for ${count} visited records`, () => {
    const buildings = createBuildings(count)
    const snapshot = createSnapshot(buildings, buildings.map((building) => building.id))
    const svg = createShareRecordSvg({ buildings, snapshot })

    assert.match(svg, new RegExp(`width="${SHARE_RECORD_WIDTH}" height="${SHARE_RECORD_HEIGHT}"`))
    assert.equal((svg.match(/class="marker"/g) ?? []).length, count)
    assert.match(svg, new RegExp(`record of ${count} visited architecture`))
    assert.deepEqual(
      [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]),
      [
        'Singapore Architecture Map',
        'Visited Record',
        String(count),
        'Places visited',
        'National Map Polygon · SLA · accessed 24 Nov 2026 · data.gov.sg/open-data-licence',
      ],
    )
    assert.equal((svg.match(/class="marker"[^>]*fill="none"/g) ?? []).length, count)
    assert.equal((svg.match(/class="marker"[^>]*stroke="#51A0D9"/g) ?? []).length, count)
    assert.equal((svg.match(/class="marker"[^>]*stroke-opacity="1"/g) ?? []).length, count)
    assert.doesNotMatch(svg, /class="marker"[^>]*(?:\sopacity="|\sfilter=|\sstyle=)/)
    assert.equal((svg.match(/<rect\b/g) ?? []).length, 1)
    assert.equal((svg.match(/class="land"/g) ?? []).length, 4)
    assert.doesNotMatch(svg, /<ellipse\b/)
    assert.doesNotMatch(svg, /<line\b/)
    assert.match(svg, /<text x="72" y="78" class="brand">Singapore Architecture Map<\/text>/)
    assert.match(svg, /<text x="72" y="158" class="title">Visited Record<\/text>/)
    assert.match(svg, /\.title \{ font-size: 48px; font-weight: 400; \}/)
    assert.match(svg, new RegExp(`<text x="72" y="430" class="count">${count}<\\/text>`))
    assert.match(svg, /y="405" class="label">Places visited<\/text>/)
    assert.match(svg, /<text x="72" y="1302" class="attribution">/)
    assert.doesNotMatch(svg, /class="grid"|clipPath|Cumulative Architecture Visits|Outline \/ Natural Earth|island forms are schematic/i)
  })
}
