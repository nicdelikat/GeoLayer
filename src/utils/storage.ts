import type { SavedGroup } from '../types'

const GROUPS_KEY = 'geolayer:groups'
const BOUNDARY_PREFIX = 'geolayer:boundaries:'

export function saveGroup(group: SavedGroup): void {
  const groups = loadGroups()
  const index = groups.findIndex((g) => g.id === group.id)
  if (index >= 0) {
    groups[index] = group
  } else {
    groups.push(group)
  }
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
}

export function loadGroups(): SavedGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function deleteGroup(id: string): void {
  const groups = loadGroups().filter((g) => g.id !== id)
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
}

export function saveBoundaryCache(placeId: string, geojson: any): void {
  localStorage.setItem(BOUNDARY_PREFIX + placeId, JSON.stringify(geojson))
}

export function loadBoundaryCache(placeId: string): any | null {
  try {
    const raw = localStorage.getItem(BOUNDARY_PREFIX + placeId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
