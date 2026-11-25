import type { CollectionSnapshot } from './collectionState'

type RecordBuilding = Readonly<{ id: string }>

export type ArchitectureRecordGroup<T extends RecordBuilding> = Readonly<{
  year: string | null
  buildings: readonly T[]
}>

export const getWantToVisitBuildings = <T extends RecordBuilding>(
  buildings: readonly T[],
  snapshot: CollectionSnapshot,
): T[] => buildings.filter((building) => {
  const state = snapshot.buildings[building.id]
  return state?.saved === true && state.visited !== true
})

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
