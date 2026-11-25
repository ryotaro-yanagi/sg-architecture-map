import data from './data/buildings.json'
import { createCollectionStateStore } from './collectionState'

const buildingIds = data.buildings.map((building) => building.id)

// Shared by the current map and future collection surfaces.
export const collectionStateStore = createCollectionStateStore(buildingIds)

export type {
  BuildingCollectionState,
  CollectionSnapshot,
  CollectionStateStore,
  CollectionUpdate,
  CollectionUpdateResult,
} from './collectionState'
