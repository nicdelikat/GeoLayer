import { saveBoundaryCache, loadBoundaryCache } from './storage'
import { getContinentBoundaryAsync } from './continents'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'

export async function fetchBoundary(
  name: string,
  bounds: [number, number, number, number],
  osmId?: number,
  osmType?: string,
  searchQuery?: string,
): Promise<any | null> {
  const cacheKey = `${name}-${bounds.join(',')}`
  const cached = loadBoundaryCache(cacheKey)
  if (cached) return cached

  try {
    let geojson: any = null

    // Try Nominatim lookup with OSM ID (only for Relations/Ways which have polygons)
    if (osmId && osmType && osmType !== 'N') {
      const typePrefix = osmType === 'R' ? 'R' : 'W'
      geojson = await nominatimLookup(`${typePrefix}${osmId}`, name)
    }

    // For non-Relations, also try looking up as R (relation)
    if (!geojson && osmId && osmType !== 'R') {
      geojson = await nominatimLookup(`R${osmId}`, name)
    }

    // Fallback: search by the user's original query (handles localized names like "Afrika")
    if (!geojson && searchQuery) {
      geojson = await nominatimSearch(searchQuery)
    }

    // Fallback: search by the Photon name
    if (!geojson) {
      geojson = await nominatimSearch(name)
    }

    // Fallback: continent outlines from Natural Earth data
    if (!geojson) {
      geojson = await getContinentBoundaryAsync(searchQuery || name)
    }

    if (geojson) {
      saveBoundaryCache(cacheKey, geojson)
    }
    return geojson
  } catch {
    return null
  }
}

async function nominatimSearch(query: string): Promise<any | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    polygon_geojson: '1',
  })
  const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
    headers: { 'User-Agent': 'GeoLayer/1.0' },
  })
  if (!response.ok) return null
  const data = await response.json()
  const withPoly = data.find((d: any) =>
    d.geojson && d.geojson.type !== 'Point'
  )
  if (withPoly?.geojson) {
    return {
      type: 'Feature',
      properties: { name: withPoly.display_name || query },
      geometry: withPoly.geojson,
    }
  }
  return null
}

async function nominatimLookup(osmIds: string, name: string): Promise<any | null> {
  const params = new URLSearchParams({
    osm_ids: osmIds,
    format: 'json',
    polygon_geojson: '1',
  })
  const response = await fetch(`${NOMINATIM_URL}/lookup?${params}`, {
    headers: { 'User-Agent': 'GeoLayer/1.0' },
  })
  if (!response.ok) return null
  const data = await response.json()
  if (data[0]?.geojson && data[0].geojson.type !== 'Point') {
    return {
      type: 'Feature',
      properties: { name: data[0].display_name || name },
      geometry: data[0].geojson,
    }
  }
  return null
}
