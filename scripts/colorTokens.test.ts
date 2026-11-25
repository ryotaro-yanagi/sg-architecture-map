import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cloneColorTokens,
  colorTokenCssVariables,
  contrastRatio,
  coreUiColorDefaults,
  defaultColorTokens,
  deriveUiColorScheme,
  parseColorPaletteV1,
} from '../src/colorTokens.ts'

test('core UI defaults are the three requested colors per appearance', () => {
  assert.deepEqual(coreUiColorDefaults, {
    day: { background: '#FAFAFA', foreground: '#0A0A0A', accent: '#FF463A' },
    night: { background: '#1B211F', foreground: '#F2F4F0', accent: '#FF463A' },
  })
})

test('legacy UI tokens are retained and consistently derived from the core colors', () => {
  for (const schemeName of ['day', 'night'] as const) {
    const scheme = defaultColorTokens[schemeName]
    const derived = deriveUiColorScheme(scheme)

    assert.deepEqual(Object.keys(derived.neutral), ['canvas', 'surface', 'subtleSurface', 'border'])
    assert.deepEqual(Object.keys(derived.interaction), [
      'identity', 'primaryAction', 'hover', 'pressed', 'selectedBackground',
      'selectedIndicator', 'focus',
    ])
    assert.equal(derived.neutral.surface, derived.neutral.canvas)
    assert.equal(derived.interaction.primaryAction, derived.interaction.identity)
    assert.equal(derived.interaction.selectedIndicator, derived.interaction.identity)
    assert.equal(derived.interaction.focus, derived.interaction.identity)
  }
})

test('changing core UI colors does not alter map or architecture palettes', () => {
  const original = cloneColorTokens().night
  const edited = structuredClone(original)
  edited.neutral.canvas = '#101820'
  edited.typography.primary = '#F8F8F2'
  edited.interaction.identity = '#FF3366'

  const derived = deriveUiColorScheme(edited)
  assert.deepEqual(derived.architecture, original.architecture)
  assert.deepEqual(derived.geographic, original.geographic)
  assert.equal(derived.typography.geographicPrimary, original.typography.geographicPrimary)
  assert.equal(derived.typography.geographicSecondary, original.typography.geographicSecondary)
  assert.equal(derived.typography.geographicWater, original.typography.geographicWater)
  assert.equal(derived.typography.geographicHalo, original.typography.geographicHalo)
  assert.equal(derived.typography.architectureLabel, original.typography.architectureLabel)
})

test('architecture categories share one Day/Night fill palette with appearance-specific pin foregrounds', () => {
  const categoryPalette = {
    cultureCivic: '#FF3B32',
    mixedUse: '#A5E3E8',
    commercial: '#51A0D9',
    education: '#FFE030',
    hospitality: '#9550A8',
    residential: '#F59A36',
  } as const
  for (const [appearance, scheme] of Object.entries(defaultColorTokens)) {
    const pinForeground = appearance === 'day' ? '#FFFFFF' : '#000000'
    for (const [category, fill] of Object.entries(categoryPalette) as [keyof typeof categoryPalette, string][]) {
      assert.equal(scheme.architecture[category], fill)
    }
    assert.equal(scheme.architecture.categoryGlyph, pinForeground)
    assert.equal(scheme.architecture.genericGlyph, pinForeground)
    assert.equal(scheme.architecture.markerOutline, pinForeground)
  }

  assert.deepEqual(
    Object.fromEntries(Object.keys(categoryPalette).map(category => [
      category,
      defaultColorTokens.day.architecture[category as keyof typeof categoryPalette],
    ])),
    Object.fromEntries(Object.keys(categoryPalette).map(category => [
      category,
      defaultColorTokens.night.architecture[category as keyof typeof categoryPalette],
    ])),
  )
})

test('Color Lab v1 JSON remains importable, including pre-identity exports', () => {
  const payload = {
    schemaVersion: 1,
    name: 'Legacy SGM palette',
    day: structuredClone(defaultColorTokens.day),
    night: structuredClone(defaultColorTokens.night),
  }
  delete (payload.day.interaction as Partial<typeof payload.day.interaction>).identity
  delete (payload.night.interaction as Partial<typeof payload.night.interaction>).identity

  const imported = parseColorPaletteV1(JSON.stringify(payload))
  assert.equal(imported.day.interaction.identity, coreUiColorDefaults.day.accent)
  assert.equal(imported.night.interaction.identity, coreUiColorDefaults.night.accent)
  assert.deepEqual(imported.day.architecture, defaultColorTokens.day.architecture)
  assert.deepEqual(imported.night.geographic, defaultColorTokens.night.geographic)
})

test('foreground, accent focus, and derived on-accent text meet WCAG contrast targets', () => {
  for (const scheme of Object.values(defaultColorTokens)) {
    const variables = colorTokenCssVariables(scheme)
    assert.ok(contrastRatio(variables['--ui-background'], variables['--ui-foreground']) >= 4.5)
    assert.ok(contrastRatio(variables['--ui-background'], variables['--muted']) >= 4.5)
    assert.ok(contrastRatio(variables['--ui-background'], variables['--focus-ring']) >= 3)
    assert.ok(contrastRatio(variables['--ui-accent'], variables['--on-accent']) >= 4.5)
  }
})

// Study 09 is the shared Day base-map palette; retain the v1 token keys.
test('Day geographic defaults match Glazed Green Study 09', () => {
  assert.deepEqual(defaultColorTokens.day.geographic, {
    background: '#F2F0ED',
    residential: '#F2F0ED',
    park: '#97E5A6',
    wood: '#9CDF9D',
    grass: '#97E5A6',
    water: '#E1E8EE',
    waterway: '#E1E8EE',
    roadMinor: '#ECEBE1',
    roadMajor: '#FEFEFE',
    roadMotorway: '#B6B5B8',
    roadCasing: '#FEFEFE',
    building: '#E4E2DF',
    buildingOutline: '#E4E2DF',
  })
})
