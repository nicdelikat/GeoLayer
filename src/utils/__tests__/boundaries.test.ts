import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBoundary } from '../boundaries'

describe('boundaries', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('returns null on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const result = await fetchBoundary('nowhere', [0, 0, 0, 0])
    expect(result).toBeNull()
  })

  it('returns null when no elements found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ elements: [] }),
    })
    const result = await fetchBoundary('nowhere', [0, 0, 0, 0])
    expect(result).toBeNull()
  })

  it('returns GeoJSON from Overpass response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        elements: [{
          type: 'relation',
          id: 1,
          tags: { name: 'Test' },
          members: [{
            type: 'way',
            role: 'outer',
            geometry: [
              { lat: 0, lon: 0 },
              { lat: 1, lon: 0 },
              { lat: 1, lon: 1 },
              { lat: 0, lon: 0 },
            ],
          }],
        }],
      }),
    })
    const result = await fetchBoundary('Test', [0, 1, 0, 1])
    expect(result).not.toBeNull()
    expect((result as any).type).toBe('Feature')
  })
})
