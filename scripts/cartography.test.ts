import assert from 'node:assert/strict'
import test from 'node:test'
import type { Map as MapLibreMap } from 'maplibre-gl'
import {
  applyRailStationLabels,
  getCartographyStudyCamera,
  railStationLabelFilter,
  railStationLabelLayerId,
  railStationLabelMinZoom,
  snapshotCartographyLayers,
} from '../src/cartographyRail.ts'

const fakeMap = (hasTransitLayer: boolean) => {
  const calls: { method: string; args: unknown[] }[] = []
  const map = {
    getLayer: (id: string) => hasTransitLayer && id === railStationLabelLayerId ? { id } : undefined,
    setFilter: (...args: unknown[]) => { calls.push({ method: 'setFilter', args }) },
    setLayerZoomRange: (...args: unknown[]) => { calls.push({ method: 'setLayerZoomRange', args }) },
    setLayoutProperty: (...args: unknown[]) => { calls.push({ method: 'setLayoutProperty', args }) },
    getStyle: () => ({ layers: [
      { id: 'poi_transit', type: 'symbol', source: 'openmaptiles', 'source-layer': 'poi', layout: { visibility: hasTransitLayer ? 'visible' : 'none' }, minzoom: 14 },
      { id: 'poi_r1', type: 'symbol', source: 'openmaptiles', 'source-layer': 'poi', layout: { visibility: 'none' } },
    ] }),
  }
  return { map: map as unknown as MapLibreMap, calls }
}

test('OpenMapTiles railway POI class selects named stations only, not other transit', () => {
  assert.deepEqual(railStationLabelFilter, [
    'all', ['==', ['get', 'class'], 'railway'],
    ['match', ['get', 'subclass'], ['station', 'halt', 'subway'], true, false],
    ['any', ['has', 'name'], ['has', 'name_en']],
  ])
})

test('restores only the rail labels at the intended zoom', () => {
  const { map, calls } = fakeMap(true)
  assert.equal(applyRailStationLabels(map), true)
  assert.deepEqual(calls.find(call => call.method === 'setFilter')?.args, [railStationLabelLayerId, railStationLabelFilter])
  assert.deepEqual(calls.find(call => call.method === 'setLayerZoomRange')?.args, [railStationLabelLayerId, railStationLabelMinZoom, 24])
  assert.ok(calls.some(call => call.method === 'setLayoutProperty' && call.args[1] === 'visibility' && call.args[2] === 'visible'))
  assert.ok(calls.some(call => call.method === 'setLayoutProperty' && call.args[1] === 'icon-image' && call.args[2] === ''))
  assert.ok(calls.every(call => call.args[0] === railStationLabelLayerId))
})

test('missing Liberty transit layer results in a no-op', () => {
  const { map, calls } = fakeMap(false)
  assert.equal(applyRailStationLabels(map), false)
  assert.equal(calls.length, 0)
})

test('audit records effective visibility and zoom without modifying the map', () => {
  const { map, calls } = fakeMap(true)
  const rows = snapshotCartographyLayers(map)
  assert.equal(rows[0].visibility, 'visible')
  assert.equal(rows[0].minzoom, 14)
  assert.equal(rows[1].visibility, 'none')
  assert.equal(calls.length, 0)
})

test('preview focus selects known areas without changing the default camera', () => {
  assert.equal(getCartographyStudyCamera(null), null)
  assert.equal(getCartographyStudyCamera('invalid'), null)
  const study = getCartographyStudyCamera('marina')
  assert.ok(study)
  assert.equal(study.zoom, 15.25)
  assert.deepEqual(study.center, [103.851, 1.284])
})

test('v0.2 station-specific cameras allow direct review of each caplet', () => {
  for (const key of ['downtown', 'bugis', 'marina-station', 'orchard-station', 'outram']) {
    const camera = getCartographyStudyCamera(key)
    assert.ok(camera, key)
    assert.equal(camera.zoom, 16)
    assert.ok(camera.center[0] > 103.8 && camera.center[0] < 103.9)
    assert.ok(camera.center[1] > 1.27 && camera.center[1] < 1.32)
  }
})
