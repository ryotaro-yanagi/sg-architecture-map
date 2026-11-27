import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

test('map credits remain discoverable on the map and never expand through MapLibre', () => {
  assert.match(app, /className="map-credit-entry"/)
  assert.match(app, /className="map-credit-trigger"/)
  assert.match(app, /onClick=\{\(\) => openMapCredits\(false\)\}/)
  assert.match(app, /aria-controls="map-credits-dialog"/)
  assert.doesNotMatch(app, /new maplibregl\.AttributionControl/)
  assert.match(css, /\.map-credit-entry\s*\{[^}]*bottom:/)
  assert.match(css, /\.map-credit-trigger\s*\{[^}]*min-height:\s*32px/)
  const trigger = css.split('.map-credit-trigger {')[1]?.split('}')[0]
  assert.ok(trigger)
  assert.match(trigger, /background:\s*transparent/)
  assert.match(trigger, /box-shadow:\s*none/)
  assert.doesNotMatch(trigger, /border-radius:\s*10px/)
  assert.match(css, /\.state-preview \.map-credit-entry,/)
  assert.match(css, /\.state-detail \.map-credit-entry/)
})

test('visible on-map attribution names OpenStreetMap, OpenMapTiles, OpenFreeMap and LTA', () => {
  const label = app.slice(app.indexOf('<span className="map-credit-names"'), app.indexOf('<Info aria-hidden="true" size={17}'))
  assert.ok(label)
  for (const name of ['OpenStreetMap contributors', 'OpenMapTiles', 'OpenFreeMap', 'LTA']) {
    assert.ok(label.includes(name), `attribution missing: ${name}`)
  }
})

test('credits dialog includes sources and required linked licence information', () => {
  for (const url of [
    'https://www.openstreetmap.org/copyright',
    'https://openmaptiles.org/',
    'https://openfreemap.org/',
    'https://datamall.lta.gov.sg/content/datamall/en/static-data.html',
    'https://datamall.lta.gov.sg/content/datamall/en/SingaporeOpenDataLicence.html',
    'https://github.com/abhijitt/mrt-kiasu',
  ]) {
    assert.ok(app.includes(url), `source URL missing: ${url}`)
  }
  assert.match(app, /Contains information from the Train Station and Train Station Codes/)
  assert.match(app, /Singapore Open Data Licence version 1\.0/)
  assert.match(app, /id="map-credits-dialog"/)
  assert.match(css, /\.map-credits-dialog\s*\{[\s\S]*?max-height:/)
})

test('Settings has an alternate path to the same credits dialog and focus is restored', () => {
  assert.match(app, /onClick=\{\(\) => openMapCredits\(true\)\}/)
  assert.match(app, /'Map data & credits'/)
  assert.match(app, /creditsReturnFocusRef\.current\?\.focus/)
  assert.match(app, /settingsDialogRef\.current\?\.close\(\)/)
  assert.match(app, /creditsDialogRef\.current\?\.showModal\(\)/)
})
