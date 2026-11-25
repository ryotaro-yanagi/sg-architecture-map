export const COLLECTION_SCHEMA_VERSION = 2 as const
export const COLLECTION_STORAGE_KEY = 'sgm-collection-state'

export type BuildingCollectionState = Readonly<{
  saved: boolean
  visited: boolean
  visitDate: string | null
  note: string
}>

export type CollectionSnapshot = Readonly<{
  schemaVersion: typeof COLLECTION_SCHEMA_VERSION
  buildings: Readonly<Record<string, BuildingCollectionState>>
}>

export type CollectionUpdate = Partial<BuildingCollectionState>

export type CollectionUpdateResult =
  | Readonly<{
    ok: true
    persisted: true
    state: BuildingCollectionState
  }>
  | Readonly<{
    ok: false
    persisted: false
    reason: 'invalid-building-id' | 'storage-unavailable'
    state: BuildingCollectionState
  }>

type CollectionStorage = Pick<Storage, 'getItem' | 'setItem'>
type CollectionListener = () => void

export type CollectionStateStore = Readonly<{
  getSnapshot: () => CollectionSnapshot
  getBuildingState: (buildingId: string) => BuildingCollectionState
  updateBuildingState: (buildingId: string, update: CollectionUpdate) => CollectionUpdateResult
  subscribe: (listener: CollectionListener) => () => void
}>

const defaultBuildingState: BuildingCollectionState = Object.freeze({
  saved: false,
  visited: false,
  visitDate: null,
  note: '',
})

const validVisitDate = (value: unknown): value is string =>
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

const emptySnapshot = (): CollectionSnapshot => Object.freeze({
  schemaVersion: COLLECTION_SCHEMA_VERSION,
  buildings: Object.freeze({}),
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const freezeSnapshot = (
  buildings: Record<string, BuildingCollectionState>,
): CollectionSnapshot => Object.freeze({
  schemaVersion: COLLECTION_SCHEMA_VERSION,
  buildings: Object.freeze(buildings),
})

const parseStoredSnapshot = (
  raw: string | null,
  validBuildingIds: ReadonlySet<string>,
): CollectionSnapshot => {
  if (!raw) return emptySnapshot()

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)
      || (parsed.schemaVersion !== 1 && parsed.schemaVersion !== COLLECTION_SCHEMA_VERSION)
      || !isRecord(parsed.buildings)) return emptySnapshot()

    const buildings: Record<string, BuildingCollectionState> = {}
    for (const [buildingId, value] of Object.entries(parsed.buildings)) {
      if (!validBuildingIds.has(buildingId)
        || !isRecord(value)
        || typeof value.saved !== 'boolean'
        || typeof value.visited !== 'boolean') continue

      buildings[buildingId] = Object.freeze({
        saved: value.saved,
        visited: value.visited,
        visitDate: parsed.schemaVersion === COLLECTION_SCHEMA_VERSION && validVisitDate(value.visitDate)
          ? value.visitDate
          : null,
        note: parsed.schemaVersion === COLLECTION_SCHEMA_VERSION && typeof value.note === 'string'
          ? value.note.slice(0, 2000)
          : '',
      })
    }
    return freezeSnapshot(buildings)
  } catch {
    return emptySnapshot()
  }
}

const getBrowserStorage = (): CollectionStorage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export const createCollectionStateStore = (
  buildingIds: Iterable<string>,
  storage: CollectionStorage | null = getBrowserStorage(),
): CollectionStateStore => {
  const validBuildingIds = new Set(buildingIds)
  const listeners = new Set<CollectionListener>()
  let snapshot = emptySnapshot()
  let storageReadable = storage !== null

  if (storage) {
    try {
      snapshot = parseStoredSnapshot(
        storage.getItem(COLLECTION_STORAGE_KEY),
        validBuildingIds,
      )
    } catch {
      snapshot = emptySnapshot()
      storageReadable = false
    }
  }

  const getBuildingState = (buildingId: string): BuildingCollectionState =>
    snapshot.buildings[buildingId] ?? defaultBuildingState

  return Object.freeze({
    getSnapshot: () => snapshot,
    getBuildingState,
    updateBuildingState: (buildingId, update) => {
      const currentState = getBuildingState(buildingId)
      if (!validBuildingIds.has(buildingId)) {
        return Object.freeze({
          ok: false,
          persisted: false,
          reason: 'invalid-building-id',
          state: currentState,
        })
      }

      const nextState = Object.freeze({
        saved: typeof update.saved === 'boolean' ? update.saved : currentState.saved,
        visited: typeof update.visited === 'boolean' ? update.visited : currentState.visited,
        visitDate: update.visitDate === null || validVisitDate(update.visitDate) ? update.visitDate : currentState.visitDate,
        note: typeof update.note === 'string' ? update.note.slice(0, 2000) : currentState.note,
      })
      const nextSnapshot = freezeSnapshot({
        ...snapshot.buildings,
        [buildingId]: nextState,
      })

      try {
        if (!storage || !storageReadable) throw new Error('Collection storage is unavailable')
        storage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(nextSnapshot))
      } catch {
        return Object.freeze({
          ok: false,
          persisted: false,
          reason: 'storage-unavailable',
          state: currentState,
        })
      }

      snapshot = nextSnapshot
      for (const listener of listeners) {
        try { listener() } catch { /* A subscriber cannot undo a persisted update. */ }
      }
      return Object.freeze({
        ok: true,
        persisted: true,
        state: nextState,
      })
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  })
}
