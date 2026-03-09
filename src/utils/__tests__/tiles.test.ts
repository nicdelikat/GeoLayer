import { describe, it, expect } from 'vitest'
import { getTileProviders, getDefaultProvider } from '../tiles'

describe('tiles', () => {
  it('returns a list of tile providers', () => {
    const providers = getTileProviders()
    expect(providers.length).toBeGreaterThan(0)
    expect(providers[0]).toHaveProperty('id')
    expect(providers[0]).toHaveProperty('name')
    expect(providers[0]).toHaveProperty('url')
    expect(providers[0]).toHaveProperty('attribution')
  })

  it('returns OSM as the default provider', () => {
    const provider = getDefaultProvider()
    expect(provider.id).toBe('osm')
    expect(provider.url).toContain('openstreetmap')
  })

  it('includes CartoDB and Stadia providers', () => {
    const providers = getTileProviders()
    const ids = providers.map(p => p.id)
    expect(ids).toContain('carto-light')
    expect(ids).toContain('carto-dark')
  })
})
