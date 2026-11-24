import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { tmpdir } from 'node:os'
import { createServer } from 'vite'
import data from '../src/data/buildings.json' with { type: 'json' }
import {
  COLLECTION_SCHEMA_VERSION,
  COLLECTION_STORAGE_KEY,
  createCollectionStateStore,
} from '../src/collectionState.ts'

const root = resolve(import.meta.dirname, '..')
const outputDirectory = resolve(root, 'artifacts/share-record')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const chromeProfile = mkdtempSync(join(tmpdir(), 'sgm-share-record-chrome-'))
const snapshotArgument = process.argv.find((argument) => argument.startsWith('--snapshot='))
const snapshotPath = snapshotArgument ? resolve(snapshotArgument.slice('--snapshot='.length)) : null
const vite = await createServer({
  root,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
})
const { createShareRecordSvg } = await vite.ssrLoadModule('/src/shareRecordGraphic.ts')

const fontData = {
  regular: readFileSync(resolve(root, 'node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-400-normal.woff2')).toString('base64'),
  medium: readFileSync(resolve(root, 'node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-500-normal.woff2')).toString('base64'),
  semibold: readFileSync(resolve(root, 'node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-600-normal.woff2')).toString('base64'),
}

const memoryStorage = (initialSnapshot) => {
  let value = initialSnapshot ? JSON.stringify(initialSnapshot) : null
  return {
    getItem: (key) => key === COLLECTION_STORAGE_KEY ? value : null,
    setItem: (key, nextValue) => { if (key === COLLECTION_STORAGE_KEY) value = nextValue },
  }
}

const createFixture = (count, buildingType = null) => {
  const sourceBuildings = data.buildings
  const buildings = count <= sourceBuildings.length
    ? sourceBuildings
    : Array.from({ length: count }, (_, index) => {
      const source = sourceBuildings[index % sourceBuildings.length]
      const ring = Math.floor(index / sourceBuildings.length)
      const angle = index * 2.399963
      const offset = ring === 0 ? 0 : .0014 * ring
      return {
        ...source,
        id: `stress-${index + 1}`,
        coordinates: [
          source.coordinates[0] + Math.cos(angle) * offset,
          source.coordinates[1] + Math.sin(angle) * offset,
        ],
      }
    })
  const fixtureBuildings = buildingType
    ? buildings.map((building) => ({ ...building, buildingType }))
    : buildings
  const storage = memoryStorage(null)
  const store = createCollectionStateStore(fixtureBuildings.map((building) => building.id), storage)
  fixtureBuildings.slice(0, count).forEach((building) => {
    const result = store.updateBuildingState(building.id, { visited: true })
    if (!result.ok) throw new Error(`Could not create ${count}-record fixture`)
  })
  return { buildings: fixtureBuildings, snapshot: store.getSnapshot() }
}

const currentFixture = () => {
  const snapshot = snapshotPath
    ? JSON.parse(readFileSync(snapshotPath, 'utf8'))
    : { schemaVersion: COLLECTION_SCHEMA_VERSION, buildings: {} }
  const storage = memoryStorage(snapshot)
  const store = createCollectionStateStore(data.buildings.map((building) => building.id), storage)
  return { buildings: data.buildings, snapshot: store.getSnapshot() }
}

const renderPng = (name, fixture) => {
  const svgPath = resolve(outputDirectory, `${name}.svg`)
  const pngPath = resolve(outputDirectory, `${name}.png`)
  writeFileSync(svgPath, createShareRecordSvg({ ...fixture, fonts: fontData }))
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--user-data-dir=${chromeProfile}`,
    '--force-device-scale-factor=1',
    '--window-size=1080,1350',
    `--screenshot=${pngPath}`,
    `file://${svgPath}`,
  ], { stdio: 'pipe' })
  return pngPath
}

mkdirSync(outputDirectory, { recursive: true })
const outputs = [
  renderPng('SGM-Share-Record-v0.6-current', currentFixture()),
  renderPng('SGM-Share-Record-v0.6-validation-000', createFixture(0)),
  renderPng('SGM-Share-Record-v0.6-validation-001', createFixture(1)),
  renderPng('SGM-Share-Record-v0.6-validation-010', createFixture(10)),
  renderPng('SGM-Share-Record-v0.6-validation-120', createFixture(120)),
]
process.stdout.write(`${outputs.join('\n')}\n`)
await vite.close()
