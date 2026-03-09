import { describe, it, expect, beforeEach } from 'vitest'
import { saveGroup, loadGroups, deleteGroup, saveBoundaryCache, loadBoundaryCache } from '../storage'
import type { SavedGroup } from '../../types'

const mockGroup: SavedGroup = {
  id: 'test-1',
  name: 'Test Group',
  createdAt: '2026-03-09T00:00:00Z',
  layers: [],
  measurements: [],
  mapView: { center: [0, 0], zoom: 2 },
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and loads groups', () => {
    saveGroup(mockGroup)
    const groups = loadGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('Test Group')
  })

  it('overwrites group with same id', () => {
    saveGroup(mockGroup)
    saveGroup({ ...mockGroup, name: 'Updated' })
    const groups = loadGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('Updated')
  })

  it('deletes a group', () => {
    saveGroup(mockGroup)
    deleteGroup('test-1')
    expect(loadGroups()).toHaveLength(0)
  })

  it('returns empty array when no groups saved', () => {
    expect(loadGroups()).toEqual([])
  })

  it('caches and loads boundary GeoJSON', () => {
    const geojson = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } }
    saveBoundaryCache('place-123', geojson)
    expect(loadBoundaryCache('place-123')).toEqual(geojson)
  })

  it('returns null for uncached boundary', () => {
    expect(loadBoundaryCache('nonexistent')).toBeNull()
  })
})
