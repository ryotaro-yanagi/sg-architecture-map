import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const data = JSON.parse(readFileSync(new URL('../src/data/mrtStations2026.json', import.meta.url), 'utf8'))
const stations = data.stations
const named = name => stations.find(s => s.nameEn === name)
const codes = name => named(name)?.codes.map(c => c.code)

test('the six operating MRT lines have 146 unique physical stations and 174 line-specific codes', () => {
  assert.equal(data.metadata.stationCount, 146)
  assert.equal(data.metadata.codeCount, 174)
  assert.equal(stations.length, 146)
  assert.equal(stations.reduce((total, station) => total + station.codes.length, 0), 174)
  assert.equal(new Set(stations.map(s => s.id)).size, 146)
  assert.equal(new Set(stations.map(s => s.nameEn)).size, 146)
  assert.equal(new Set(stations.flatMap(s => s.codes.map(c => c.code))).size, 174)
})

test('station points are usable in Singapore and every record includes data provenance', () => {
  const methods = new Set(['lta-exits-mean', 'lta-gtfs', 'reference-map-proxy'])
  for (const station of stations) {
    assert.ok(station.id && station.nameEn)
    assert.ok(methods.has(station.coordMethod), station.nameEn)
    assert.equal(station.coordinates.length, 2)
    const [lng, lat] = station.coordinates
    assert.ok(lng >= 103.6 && lng <= 104.1, station.nameEn)
    assert.ok(lat >= 1.2 && lat <= 1.5, station.nameEn)
    assert.ok(station.codes.length > 0)
    for (const item of station.codes) {
      assert.match(item.code, /^(NS|EW|CG|NE|CC|DT|TE)[0-9]+$/)
      assert.ok(['NS', 'EW', 'NE', 'CC', 'DT', 'TE'].includes(item.line))
      assert.equal(item.line, item.code.startsWith('CG') ? 'EW' : item.code.slice(0,2))
    }
  }
  const fallback = stations.filter(s => s.coordMethod === 'reference-map-proxy').map(s => s.nameEn).sort()
  assert.deepEqual(fallback, ['Hume', 'Punggol Coast'])
  assert.ok(data.metadata.primarySource.includes('mrt-kiasu'))
  assert.ok(data.metadata.primarySourceLicense.includes('Singapore Open Data Licence'))
})

test('2026 Circle Line closure is represented by CC30–CC34, not old CE codes', () => {
  assert.deepEqual(codes('Keppel'), ['CC30'])
  assert.deepEqual(codes('Cantonment'), ['CC31'])
  assert.deepEqual(codes('Prince Edward Road'), ['CC32'])
  assert.ok(codes('Marina Bay').includes('CC33'))
  assert.ok(codes('Bayfront').includes('CC34'))
  assert.equal(stations.flatMap(s => s.codes).filter(c => c.code.startsWith('CE')).length, 0)
})

test('all three-line interchanges remain whole stations with three badges', () => {
  const tripleNames = stations.filter(s => s.codes.length === 3).map(s => s.nameEn).sort()
  assert.deepEqual(tripleNames, ['Dhoby Ghaut', 'Marina Bay', 'Outram Park'])
  assert.deepEqual(codes('Marina Bay'), ['NS27', 'CC33', 'TE20'])
  assert.deepEqual(codes('Outram Park'), ['EW16', 'NE3', 'TE17'])
  assert.deepEqual(codes('Orchard'), ['NS22', 'TE14'])
})

test('future stations and LRT points are excluded from the operating network', () => {
  for (const name of ['Bedok South', 'Sungei Bedok', 'Xilin']) assert.equal(named(name), undefined)
  for (const station of stations) for (const item of station.codes) {
    assert.doesNotMatch(item.code, /^(BP|SE|SW|PE|PW|JS|JW|CR|CP)/)
  }
  assert.equal(data.metadata.snapshotDate, '2026-11-27')
})
