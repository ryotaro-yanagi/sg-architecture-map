import { readFile } from 'node:fs/promises'

const dataUrl = new URL('../src/data/buildings.json', import.meta.url)
const data = JSON.parse(await readFile(dataUrl, 'utf8'))
const failures = []

const assert = (condition, message) => {
  if (!condition) failures.push(message)
}

assert(data.status === 'test-data-only', 'Dataset must remain marked test-data-only.')
assert(data.buildings?.length === 7, 'Prototype 01 must contain exactly seven buildings.')

for (const building of data.buildings ?? []) {
  const label = building.id || '(missing id)'
  assert(Array.isArray(building.coordinates) && building.coordinates.length === 2, `${label}: coordinates are missing.`)
  assert(building.coordinatePrecision?.includes('approximate'), `${label}: coordinate precision must remain approximate.`)
  assert(/^https:\/\//.test(building.coordinateSource ?? ''), `${label}: coordinate source must be an HTTPS URL.`)
  assert(/^https:\/\//.test(building.officialSource ?? ''), `${label}: official source must be an HTTPS URL.`)
  assert(building.photo === null, `${label}: a photo was added without the publication review workflow.`)
  assert(building.publicAccess === 'unverified', `${label}: public access must remain unverified.`)
}

const sourceFiles = ['../src/App.tsx', '../src/main.tsx']
for (const sourceFile of sourceFiles) {
  const content = await readFile(new URL(sourceFile, import.meta.url), 'utf8')
  assert(!/\bconsole\.(log|debug)\s*\(/.test(content), `${sourceFile}: debug logging remains.`)
  assert(!/\bdebugger\b/.test(content), `${sourceFile}: debugger statement remains.`)
  assert(!/localhost|127\.0\.0\.1/.test(content), `${sourceFile}: local-only URL remains.`)
}

if (failures.length) {
  console.error('Publication checks failed:\n' + failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Publication checks passed: 7 test records, approximate coordinates, HTTPS sources, no photos, no debug statements.')
