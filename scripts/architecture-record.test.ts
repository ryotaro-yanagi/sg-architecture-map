import assert from 'node:assert/strict'
import test from 'node:test'
import { addInitialVisitDate, createArchitectureRecordGroups, formatLocalVisitDate, getWantToVisitBuildings } from '../src/architectureRecord.ts'
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

test('want to visit reflects saved independently from visited', () => {
  const buildings = ['a', 'b', 'c'].map((id) => ({ id }))
  const values = new Map<string, string>()
  const store = createCollectionStateStore(buildings.map(({ id }) => id), {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  })
  store.updateBuildingState('a', { saved: true })
  store.updateBuildingState('b', { saved: true, visited: true })
  store.updateBuildingState('c', { visited: true })

  assert.deepEqual(getWantToVisitBuildings(buildings, store.getSnapshot()), [{ id: 'a' }, { id: 'b' }])
  assert.equal(store.getBuildingState('b').saved, true)
  assert.equal(store.getBuildingState('b').visited, true)
})

test('adds an editable local date only when Visited is first enabled', () => {
  const now = new Date(2026, 10, 24, 23, 58)
  const undated = { saved: false, visited: false, visitDate: null, note: '' }

  assert.equal(formatLocalVisitDate(now), '2026-11-24')
  assert.deepEqual(addInitialVisitDate(undated, { visited: true }, now), {
    visited: true,
    visitDate: '2026-11-24',
  })
  assert.deepEqual(addInitialVisitDate(undated, { saved: true }, now), { saved: true })
  assert.deepEqual(addInitialVisitDate({ ...undated, visitDate: '2024-05-02' }, { visited: true }, now), { visited: true })
  assert.deepEqual(addInitialVisitDate({ ...undated, visited: true }, { visited: true }, now), { visited: true })
  assert.deepEqual(addInitialVisitDate(undated, { visited: true }, now, true), { visited: true })
})
