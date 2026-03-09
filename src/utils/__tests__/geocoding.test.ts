import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchPlaces, type GeocodingResult } from '../geocoding'

describe('geocoding', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns parsed results from Nominatim', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          place_id: 123,
          display_name: 'Los Angeles, California, USA',
          lat: '34.0522',
          lon: '-118.2437',
          boundingbox: ['33.7037', '34.3373', '-118.6682', '-118.1553'],
          type: 'city',
          name: 'Los Angeles',
        },
      ]),
    })

    const results = await searchPlaces('Los Angeles')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Los Angeles')
    expect(results[0].lat).toBe(34.0522)
    expect(results[0].lng).toBe(-118.2437)
    expect(results[0].boundingBox).toEqual([33.7037, 34.3373, -118.6682, -118.1553])
  })

  it('returns empty array on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const results = await searchPlaces('nowhere')
    expect(results).toEqual([])
  })

  it('returns empty array for empty query', async () => {
    const results = await searchPlaces('')
    expect(results).toEqual([])
  })
})
