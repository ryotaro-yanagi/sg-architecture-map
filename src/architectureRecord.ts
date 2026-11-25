import type { CollectionSnapshot } from './collectionState'
import type { BuildingCollectionState, CollectionUpdate } from './collectionState'

type RecordBuilding = Readonly<{ id: string }>

export const formatLocalVisitDate = (date: Date): string => {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const addInitialVisitDate = (
  state: BuildingCollectionState,
  update: CollectionUpdate,
  now: Date,
  preserveUndated = false,
): CollectionUpdate => update.visited === true
  && !state.visited
  && state.visitDate === null
  && !preserveUndated
  ? { ...update, visitDate: formatLocalVisitDate(now) }
  : update

export type ArchitectureRecordGroup<T extends RecordBuilding> = Readonly<{
  year: string | null
  buildings: readonly T[]
}>

export const getWantToVisitBuildings = <T extends RecordBuilding>(
  buildings: readonly T[],
  snapshot: CollectionSnapshot,
): T[] => buildings.filter((building) =>
  snapshot.buildings[building.id]?.saved === true
)

export const createArchitectureRecordGroups = <T extends RecordBuilding>(
  buildings: readonly T[],
  snapshot: CollectionSnapshot,
): ArchitectureRecordGroup<T>[] => {
  const visited = buildings.filter((building) => snapshot.buildings[building.id]?.visited)
  visited.sort((first, second) => {
    const firstDate = snapshot.buildings[first.id]?.visitDate
    const secondDate = snapshot.buildings[second.id]?.visitDate
    if (firstDate && secondDate) return secondDate.localeCompare(firstDate) || first.id.localeCompare(second.id)
    if (firstDate) return -1
    if (secondDate) return 1
    return first.id.localeCompare(second.id)
  })

  const groups = new Map<string | null, T[]>()
  for (const building of visited) {
    const visitDate = snapshot.buildings[building.id]?.visitDate
    const year = visitDate ? visitDate.slice(0, 4) : null
    const group = groups.get(year) ?? []
    group.push(building)
    groups.set(year, group)
  }
  return [...groups].map(([year, groupedBuildings]) => ({ year, buildings: groupedBuildings }))
}
