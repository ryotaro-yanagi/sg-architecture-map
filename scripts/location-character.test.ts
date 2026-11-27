import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { avatarSvg, colors, forms, shapeIds, zoomSize } from '../src/locationCharacterShapes.ts'

test('four unique architecture-derived silhouettes share stable form identifiers', () => {
  assert.deepEqual(shapeIds, ['long', 'rise', 'steps', 'sway'])
  assert.equal(new Set(shapeIds.map(id => forms[id].path)).size, 4)
  for (const id of shapeIds) {
    const form = forms[id]
    assert.match(form.path, /^M/)
    assert.match(form.path, /Z$/)
    assert.equal(form.eyes.length, 2)
    for (const [x, y] of form.eyes) {
      assert.ok(x > 0 && x < 120 && y > 0 && y < 120)
    }
  }
})

test('marker size follows production zoom stops without arbitrary scale jumps', () => {
  const stops: Array<[number, number]> = [[9,20],[11,24],[13,29],[14,33],[16,39],[18,44]]
  for (const [z, size] of stops) assert.equal(zoomSize(z), size)
  assert.equal(zoomSize(3), 20)
  assert.equal(zoomSize(20), 44)
  assert.equal(zoomSize(12), 26.5)
  for (let z = 9; z < 18; z += .1) {
    assert.ok(zoomSize(z + .1) >= zoomSize(z))
  }
})

test('16px marker retains two white eyes and dark pupils in every shape', () => {
  for (const id of shapeIds) {
    const svg = avatarSvg(id, 16, 'ochre', 'shadow', 'look', true)
    assert.equal((svg.match(/fill="#FAF8F1"/g) ?? []).length, 2)
    assert.equal((svg.match(/fill="#26312D"/g) ?? []).length, 2)
    assert.match(svg, /width="16"/)
    assert.match(svg, /drop-shadow/)
    assert.ok(!svg.includes('NaN'))
  }
})

test('optical correction modifies only tiny forms with intentional overrides', () => {
  for (const id of ['long', 'steps'] as const) {
    assert.notEqual(avatarSvg(id, 16, 'ochre', 'none', 'neutral', true),
      avatarSvg(id, 16, 'ochre', 'none', 'neutral', false))
    assert.equal(avatarSvg(id, 26, 'ochre', 'none', 'neutral', true),
      avatarSvg(id, 26, 'ochre', 'none', 'neutral', false))
  }
})

test('different map edge treatments do not change silhouette and face identity', () => {
  const plain = avatarSvg('steps', 34, 'ochre', 'none', 'look', false)
  const shadow = avatarSvg('steps', 34, 'ochre', 'shadow', 'look', false)
  const line = avatarSvg('steps', 34, 'ochre', 'keyline', 'look', false)
  assert.equal(plain.includes('drop-shadow'), false)
  assert.match(shadow, /drop-shadow/)
  assert.match(line, /stroke="#31453B"/)
  assert.equal(plain.includes(colors.ochre), true)
  assert.equal((plain.match(/<ellipse/g) ?? []).length, 4)
})

test('production locate button mounts the character without a URL flag', () => {
  const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.match(source, /userMarkerZoomCleanupRef\.current\s*=\s*mountLocationCharacter\(\{ map, body \}\)/)
  assert.match(source, /new maplibregl\.Marker\(\{ element, anchor: 'center' \}\)/)
  assert.doesNotMatch(source, /locationAvatarRequested|locationAvatar=1/)
})

test('Night has no halo and Day retains a light separation shadow', () => {
  const source = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  assert.match(source, /\.user-location-blob--character svg > path:first-child/)
  assert.match(source, /\.night-preview \.user-location-blob--character svg > path:first-child \{\s*filter: none;/)
})
