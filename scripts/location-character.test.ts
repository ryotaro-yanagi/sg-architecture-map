import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { avatarSvg, colors, forms, shapeIds, zoomSize } from '../src/locationCharacterShapes.ts'
import { blinkAmount, BLINK_DURATION_MS, BLINK_INTRO_DELAY_MS, BLINK_MIN_INTERVAL_MS, BLINK_RANDOM_RANGE_MS } from '../src/locationCharacterBehavior.ts'

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
  const stops: Array<[number, number]> = [[9,20],[11,23],[13,28],[14,32],[16,37],[18,40]]
  for (const [z, size] of stops) assert.equal(zoomSize(z), size)
  assert.equal(zoomSize(3), 20)
  assert.equal(zoomSize(20), 40)
  assert.equal(zoomSize(12), 25.5)
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

test('one small introductory blink is followed by unhurried ambient blinks', () => {
  assert.ok(BLINK_INTRO_DELAY_MS >= 600 && BLINK_INTRO_DELAY_MS <= 1700)
  assert.ok(BLINK_MIN_INTERVAL_MS >= 9000)
  assert.ok(BLINK_MIN_INTERVAL_MS + BLINK_RANDOM_RANGE_MS <= 25000)
  assert.ok(BLINK_DURATION_MS >= 140 && BLINK_DURATION_MS <= 320)
  assert.equal(blinkAmount(0), 0)
  assert.equal(blinkAmount(1), 0)
  assert.ok(blinkAmount(.38) > .9)
  assert.ok(blinkAmount(.85) < blinkAmount(.45))
  assert.ok(blinkAmount(-1) === 0 && blinkAmount(2) === 0)
})

test('location marker provides a 44px touch target and avoids map tap propagation', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  const controller = readFileSync(new URL('../src/locationCharacter.ts', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.match(css, /\.user-location-marker--interactive\s*\{[^}]*width: 44px;[^}]*height: 44px;/)
  assert.match(css, /\.user-location-marker--interactive:focus-visible/)
  assert.match(controller, /hitTarget\?\.addEventListener\('pointerdown', stopPointer\)/)
  assert.match(controller, /hitTarget\?\.addEventListener\('click', onTap\)/)
  assert.match(controller, /hitTarget\?\.removeEventListener\('click', onTap\)/)
  assert.match(controller, /hitTarget\.setAttribute\('role', 'button'\)/)
  assert.match(controller, /hitTarget\.setAttribute\('tabindex', '0'\)/)
  assert.match(controller, /event\.stopPropagation\(\)/)
  assert.match(controller, /onActivate\?\.\(\)/)
  assert.match(app, /現在地のキャラクター。タップすると反応します/)
  assert.match(app, /Your current-location character\. Tap to interact/)
})

test('ambient blink and user reaction are canceled with the existing lifecycle', () => {
  const controller = readFileSync(new URL('../src/locationCharacter.ts', import.meta.url), 'utf8')
  assert.match(controller, /scheduleBlink\(firstBlink \? BLINK_INTRO_DELAY_MS : undefined\)/)
  assert.match(controller, /const playBlink = \(tapped: boolean\)/)
  assert.match(controller, /window\.cancelAnimationFrame\(blinkFrame\)/)
  assert.match(controller, /window\.clearTimeout\(blinkTimer\)/)
  assert.match(controller, /if \(!canAnimate\(\) \|\| inMorph\) return/)
  assert.match(controller, /reduced\.addEventListener\('change', onVisibility\)/)
  assert.match(controller, /reduced\.removeEventListener\('change', onVisibility\)/)
})
