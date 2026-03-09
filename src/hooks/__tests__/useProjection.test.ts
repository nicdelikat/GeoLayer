import { describe, it, expect } from 'vitest'
import { calculateMercatorScale, haversineDistance, geodesicArea } from '../useProjection'

describe('projection utilities', () => {
  it('returns 1.0 when layer and map are at same latitude', () => {
    const scale = calculateMercatorScale(45, 45)
    expect(scale).toBeCloseTo(1.0, 5)
  })

  it('scales up when moving equatorial layer to high latitude', () => {
    const scale = calculateMercatorScale(40, 0)
    expect(scale).toBeGreaterThan(1.0)
  })

  it('scales down when moving high-latitude layer to equator', () => {
    const scale = calculateMercatorScale(0, 70)
    expect(scale).toBeLessThan(1.0)
  })

  it('calculates haversine distance between two points', () => {
    const dist = haversineDistance(34.0522, -118.2437, 40.7128, -74.006)
    expect(dist).toBeGreaterThan(3900000)
    expect(dist).toBeLessThan(4000000)
  })

  it('returns 0 distance for same point', () => {
    const dist = haversineDistance(0, 0, 0, 0)
    expect(dist).toBe(0)
  })

  it('calculates geodesic area of a polygon', () => {
    const points: [number, number][] = [
      [0, 0], [0, 1], [1, 1], [1, 0],
    ]
    const area = geodesicArea(points)
    expect(area).toBeGreaterThan(12000e6)
    expect(area).toBeLessThan(12500e6)
  })
})
