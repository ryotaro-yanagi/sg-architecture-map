import assert from 'node:assert/strict'
import test from 'node:test'
import { createArchitectureRecordGroups, getWantToVisitBuildings } from '../src/architectureRecord.ts'
import { createCollectionStateStore } from '../src/collectionState.ts'

test('groups visited buildings by year, newest first, with undated records last', () => {
  const buildings = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }))
  const values = new Map<string, string>()
  const store = createCollectionStateStore(buildings.map(({ id }) => id), {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  })
  store.updateBuildingState('a', { visited: true, visitDate: '2025-01-04' })
  store.updateBuildingState('b', { visited: true, visitDate: '2026-11-24' })
  store.updateBuildingState('c', { visited: true })
  store.updateBuildingState('d', { visited: false, visitDate: '2027-01-01' })
  store.updateBuildingState('e', { visited: true, visitDate: '2026-03-02' })

  assert.deepEqual(createArchitectureRecordGroups(buildings, store.getSnapshot()), [
    { year: '2026', buildings: [{ id: 'b' }, { id: 'e' }] },
    { year: '2025', buildings: [{ id: 'a' }] },
    { year: null, buildings: [{ id: 'c' }] },
  ])
})

test('want to visit includes only saved buildings that are not visited', () => {
  const buildings = ['a', 'b', 'c'].map((id) => ({ id }))
  const values = new Map<string, string>()
  const store = createCollectionStateStore(buildings.map(({ id }) => id), {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  })
  store.updateBuildingState('a', { saved: true })
  store.updateBuildingState('b', { saved: true, visited: true })
  store.updateBuildingState('c', { visited: true })

  assert.deepEqual(getWantToVisitBuildings(buildings, store.getSnapshot()), [{ id: 'a' }])
  assert.equal(store.getBuildingState('b').saved, true)
})

test('visited status remains independent from optional visit details', () => {
  const buildings = [{ id: 'a' }]
  const values = new Map<string, string>()
  const store = createCollectionStateStore(['a'], {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  })

  store.updateBuildingState('a', { visited: true })
  assert.deepEqual(store.getBuildingState('a'), {
    saved: false,
    visited: true,
    visitDate: null,
    note: '',
  })

  store.updateBuildingState('a', { visitDate: '2026-11-24', note: 'Evening visit' })
  assert.deepEqual(store.getBuildingState('a'), {
    saved: false,
    visited: true,
    visitDate: '2026-11-24',
    note: 'Evening visit',
  })
})
