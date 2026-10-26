import { readFile } from 'node:fs/promises'

const dataUrl = new URL('../src/data/buildings.json', import.meta.url)
const data = JSON.parse(await readFile(dataUrl, 'utf8'))
const failures = []

const assert = (condition, message) => {
  if (!condition) failures.push(message)
}

assert(data.status === 'test-data-only', 'Dataset must remain marked test-data-only.')
assert(Array.isArray(data.buildings) && data.buildings.length >= 7, 'Prototype must preserve the original seven or more buildings.')

const ids = new Set()
for (const building of data.buildings ?? []) {
  const label = building.id || '(missing id)'
  assert(!ids.has(building.id), `${label}: duplicate id.`)
  ids.add(building.id)
  if (building.aliases !== undefined) {
    assert(Array.isArray(building.aliases) && building.aliases.every((alias) => typeof alias === 'string' && alias.trim()), `${label}: invalid aliases.`)
  }
  assert(Array.isArray(building.coordinates) && building.coordinates.length === 2 && building.coordinates.every(Number.isFinite), `${label}: coordinates are missing or invalid.`)
  assert(building.coordinates[0] >= 103.6 && building.coordinates[0] <= 104.1 && building.coordinates[1] >= 1.15 && building.coordinates[1] <= 1.50, `${label}: outside Singapore bounds or wrong coordinate order.`)
  assert(building.coordinatePrecision?.includes('approximate'), `${label}: coordinate precision must remain approximate.`)
  assert(/^https:\/\//.test(building.coordinateSource ?? ''), `${label}: coordinate source must be an HTTPS URL.`)
  assert(/^https:\/\//.test(building.officialSource ?? ''), `${label}: official source must be an HTTPS URL.`)
  assert(building.photo === null, `${label}: a photo was added without the publication review workflow.`)
  assert(building.publicAccess === 'unverified', `${label}: public access must remain unverified.`)
}

const sourceFiles = ['../src/App.tsx', '../src/i18n.ts', '../src/main.tsx']
for (const sourceFile of sourceFiles) {
  const content = await readFile(new URL(sourceFile, import.meta.url), 'utf8')
  assert(!/\bconsole\.(log|debug)\s*\(/.test(content), `${sourceFile}: debug logging remains.`)
  assert(!/\bdebugger\b/.test(content), `${sourceFile}: debugger statement remains.`)
  assert(!/localhost|127\.0\.0\.1/.test(content), `${sourceFile}: local-only URL remains.`)
}

const englishEntry = await readFile(new URL('../en/index.html', import.meta.url), 'utf8')
const japaneseEntry = await readFile(new URL('../ja/index.html', import.meta.url), 'utf8')
const rootEntry = await readFile(new URL('../index.html', import.meta.url), 'utf8')
assert(/<html lang="en">/.test(englishEntry), 'English entry must declare lang="en".')
assert(/<html lang="ja">/.test(japaneseEntry), 'Japanese entry must declare lang="ja".')
assert(/\.\/en\//.test(rootEntry), 'Root entry must default to the English route.')

if (failures.length) {
  console.error('Publication checks failed:\n' + failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Publication checks passed: locale entries, ${data.buildings.length} test records, approximate coordinates, HTTPS sources, no photos, no debug statements.`)
