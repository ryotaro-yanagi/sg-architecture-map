import assert from 'node:assert/strict'
import test from 'node:test'
import { contrastRatio, defaultColorTokens } from '../src/colorTokens.ts'
import {
  mrtLineColors, mrtPilotStations, mrtPilotFeatureCollection,
  mrtPilotGenericLabelFilter, mrtPilotContextMinZoom, mrtPilotFullMinZoom,
  makeMrtCapletSvg, readableMrtCodeColor, isMrtPilotEnabled,
} from '../src/mrtPilot.ts'

test('pilot contains five distinct, coordinate-provenanced station records', () => {
  assert.equal(mrtPilotStations.length, 5)
  assert.equal(new Set(mrtPilotStations.map(station => station.id)).size, 5)
  assert.equal(new Set(mrtPilotStations.map(station => station.nameEn)).size, 5)
  for (const station of mrtPilotStations) {
    assert.equal(station.status, 'operational')
    assert.ok(station.coordinateSource.startsWith('https://'))
    assert.ok(station.codeSource.startsWith('https://'))
    assert.equal(station.verifiedOn, '2026-11-27')
    const [longitude, latitude] = station.coordinates
    assert.ok(longitude > 103.6 && longitude < 104.1)
    assert.ok(latitude > 1.2 && latitude < 1.5)
    assert.ok(station.codes.length >= 1)
    assert.equal(new Set(station.codes.map(entry => entry.code)).size, station.codes.length)
  }
})

test('source-proven MRT code line identities, including a three-line interchange', () => {
  const byId = Object.fromEntries(mrtPilotStations.map(station => [station.id, station.codes.map(value => value.code)]))
  assert.deepEqual(byId['downtown'], ['DT17'])
  assert.deepEqual(byId['bugis'], ['EW12', 'DT14'])
  assert.deepEqual(byId['orchard'], ['NS22', 'TE14'])
  assert.deepEqual(byId['marina-bay'], ['NS27', 'CC33', 'TE20'])
  assert.deepEqual(byId['outram-park'], ['EW16', 'NE3', 'TE17'])
  assert.ok(!JSON.stringify(byId).includes('CE2'))
  const availableColours = Object.keys(mrtLineColors)
  assert.deepEqual(availableColours, ['NS', 'EW', 'NE', 'CC', 'DT', 'TE'])
  for (const station of mrtPilotStations) {
    for (const entry of station.codes) {
      assert.equal(entry.code.substring(0, 2), entry.line)
    }
  }
})

test('each caplet has a readable monochrome code as well as line colour', () => {
  for (const color of Object.values(mrtLineColors)) {
    const foreground = readableMrtCodeColor(color)
    assert.ok(foreground === '#FFFFFF' || foreground === '#000000')
    assert.ok(contrastRatio(foreground, color) >= 4.5, `contrast too weak on ${color}`)
  }
  for (const station of mrtPilotStations) {
    const svg = makeMrtCapletSvg(station, 'full', 'day', defaultColorTokens)
    assert.ok(svg.startsWith('<svg'))
    assert.ok(svg.includes(station.nameEn))
    for (const entry of station.codes) {
      assert.ok(svg.includes(entry.code), `missing ${entry.code} in ${station.nameEn}`)
      assert.ok(svg.includes(mrtLineColors[entry.line]))
    }
    const abbreviated = makeMrtCapletSvg(station, 'context', 'night', defaultColorTokens)
    assert.ok(abbreviated.includes(station.nameEn))
    assert.ok(!abbreviated.includes('font-weight="700"'))
  }
})

test('feature collection carries one point per station, never one point per line', () => {
  const collection = mrtPilotFeatureCollection()
  assert.equal(collection.type, 'FeatureCollection')
  assert.equal(collection.features.length, 5)
  assert.equal(collection.features.find(feature => feature.properties.id === 'marina-bay')?.properties.lineCount, 3)
})

test('v0.2 preview is opt-in and preserves the v0.1 baseline by default', () => {
  assert.equal(isMrtPilotEnabled(''), false)
  assert.equal(isMrtPilotEnabled('?cartographyPreview=marina'), false)
  assert.equal(isMrtPilotEnabled('?cartographyPreview=marina&mrtPilot=1'), true)
  assert.equal(isMrtPilotEnabled('?mrtPilot=0'), false)
  assert.equal(mrtPilotContextMinZoom, 13.75)
  assert.equal(mrtPilotFullMinZoom, 15)
  assert.equal(JSON.stringify(mrtPilotGenericLabelFilter).includes('DOWNTOWN'), true)
  assert.equal(JSON.stringify(mrtPilotGenericLabelFilter).includes('MARINA BAY'), true)
})
