import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COLLECTION_SCHEMA_VERSION,
  COLLECTION_STORAGE_KEY,
  createCollectionStateStore,
} from '../src/collectionState.ts'

type TestStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

const createStorage = (initialValue: string | null = null): TestStorage => {
  const values = new Map<string, string>()
  if (initialValue !== null) values.set(COLLECTION_STORAGE_KEY, initialValue)
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  }
}

test('updates saved and visited independently and persists each change', () => {
  const storage = createStorage()
  const store = createCollectionStateStore(['building-a'], storage)
  let notifications = 0
  store.subscribe(() => { notifications += 1 })

  assert.deepEqual(store.updateBuildingState('building-a', { saved: true }), {
    ok: true,
    persisted: true,
    state: { saved: true, visited: false, visitDate: null, note: '' },
  })
  assert.deepEqual(store.updateBuildingState('building-a', { visited: true }), {
    ok: true,
    persisted: true,
    state: { saved: true, visited: true, visitDate: null, note: '' },
  })
  assert.equal(notifications, 2)
  assert.deepEqual(JSON.parse(storage.getItem(COLLECTION_STORAGE_KEY)!), {
    schemaVersion: COLLECTION_SCHEMA_VERSION,
    buildings: {
      'building-a': { saved: true, visited: true, visitDate: null, note: '' },
    },
  })
})

test('restores a persisted versioned snapshot', () => {
  const storage = createStorage(JSON.stringify({
    schemaVersion: COLLECTION_SCHEMA_VERSION,
    buildings: {
      'building-a': { saved: true, visited: false },
      'building-b': { saved: false, visited: true },
    },
  }))

  const restored = createCollectionStateStore(['building-a', 'building-b'], storage)

  assert.deepEqual(restored.getBuildingState('building-a'), { saved: true, visited: false, visitDate: null, note: '' })
  assert.deepEqual(restored.getBuildingState('building-b'), { saved: false, visited: true, visitDate: null, note: '' })
})

test('ignores malformed data, unsupported versions, and unknown building IDs', () => {
  const malformed = createCollectionStateStore(['building-a'], createStorage('{broken'))
  assert.deepEqual(malformed.getSnapshot(), {
    schemaVersion: COLLECTION_SCHEMA_VERSION,
    buildings: {},
  })

  const unsupported = createCollectionStateStore(['building-a'], createStorage(JSON.stringify({
    schemaVersion: 999,
    buildings: { 'building-a': { saved: true, visited: true } },
  })))
  assert.deepEqual(unsupported.getBuildingState('building-a'), { saved: false, visited: false, visitDate: null, note: '' })

  const filtered = createCollectionStateStore(['building-a'], createStorage(JSON.stringify({
    schemaVersion: COLLECTION_SCHEMA_VERSION,
    buildings: {
      'building-a': { saved: true, visited: false },
      'building-b': { saved: true, visited: true },
      'building-c': { saved: 'yes', visited: false },
    },
  })))
  assert.deepEqual(filtered.getSnapshot(), {
    schemaVersion: COLLECTION_SCHEMA_VERSION,
    buildings: { 'building-a': { saved: true, visited: false, visitDate: null, note: '' } },
  })
  assert.deepEqual(filtered.updateBuildingState('building-b', { saved: true }), {
    ok: false,
    persisted: false,
    reason: 'invalid-building-id',
    state: { saved: false, visited: false, visitDate: null, note: '' },
  })
})

test('keeps the last persisted state when storage writes fail', () => {
  const storage: TestStorage = {
    getItem: () => JSON.stringify({
      schemaVersion: COLLECTION_SCHEMA_VERSION,
      buildings: { 'building-a': { saved: true, visited: false } },
    }),
    setItem: () => { throw new Error('quota exceeded') },
  }
  const store = createCollectionStateStore(['building-a'], storage)
  let notifications = 0
  store.subscribe(() => { notifications += 1 })

  assert.deepEqual(store.updateBuildingState('building-a', { visited: true }), {
    ok: false,
    persisted: false,
    reason: 'storage-unavailable',
    state: { saved: true, visited: false, visitDate: null, note: '' },
  })
  assert.deepEqual(store.getBuildingState('building-a'), { saved: true, visited: false, visitDate: null, note: '' })
  assert.equal(notifications, 0)
})

test('degrades storage read failures to an empty state', () => {
  const storage: TestStorage = {
    getItem: () => { throw new Error('access denied') },
    setItem: () => { throw new Error('access denied') },
  }
  const store = createCollectionStateStore(['building-a'], storage)

  assert.deepEqual(store.getBuildingState('building-a'), { saved: false, visited: false, visitDate: null, note: '' })
  assert.equal(store.updateBuildingState('building-a', { saved: true }).persisted, false)
})

test('migrates schema v1 without losing saved or visited state', () => {
  const storage = createStorage(JSON.stringify({
    schemaVersion: 1,
    buildings: { 'building-a': { saved: true, visited: true } },
  }))
  const store = createCollectionStateStore(['building-a'], storage)

  assert.deepEqual(store.getBuildingState('building-a'), {
    saved: true,
    visited: true,
    visitDate: null,
    note: '',
  })
})

test('adds, edits and clears record details without coupling them to visited', () => {
  const storage = createStorage()
  const store = createCollectionStateStore(['building-a'], storage)
  store.updateBuildingState('building-a', { visited: true, visitDate: '2026-11-24', note: 'First visit' })
  assert.deepEqual(store.getBuildingState('building-a'), {
    saved: false, visited: true, visitDate: '2026-11-24', note: 'First visit',
  })

  store.updateBuildingState('building-a', { visitDate: '2025-04-03', note: 'Revised note' })
  store.updateBuildingState('building-a', { visited: false })
  assert.deepEqual(store.getBuildingState('building-a'), {
    saved: false, visited: false, visitDate: '2025-04-03', note: 'Revised note',
  })

  store.updateBuildingState('building-a', { visitDate: null, note: '' })
  assert.equal(store.getBuildingState('building-a').visitDate, null)
  assert.equal(store.getBuildingState('building-a').note, '')
})
