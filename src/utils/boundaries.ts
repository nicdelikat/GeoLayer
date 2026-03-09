import { saveBoundaryCache, loadBoundaryCache } from './storage'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export async function fetchBoundary(
  name: string,
  bounds: [number, number, number, number],
): Promise<any | null> {
  const cacheKey = `${name}-${bounds.join(',')}`
  const cached = loadBoundaryCache(cacheKey)
  if (cached) return cached

  try {
    const query = `
      [out:json][timeout:10];
      relation["name"="${name}"]["boundary"="administrative"](${bounds[0]},${bounds[2]},${bounds[1]},${bounds[3]});
      out geom;
    `

    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.elements || data.elements.length === 0) return null

    const geojson = overpassToGeoJSON(data.elements[0])
    if (geojson) {
      saveBoundaryCache(cacheKey, geojson)
    }
    return geojson
  } catch {
    return null
  }
}

function overpassToGeoJSON(element: any): any | null {
  if (!element.members) return null

  const outerWays = element.members
    .filter((m: any) => m.type === 'way' && m.role === 'outer' && m.geometry)
    .map((m: any) => m.geometry.map((p: any) => [p.lon, p.lat]))

  if (outerWays.length === 0) return null

  return {
    type: 'Feature',
    properties: { name: element.tags?.name || '' },
    geometry: {
      type: outerWays.length === 1 ? 'Polygon' : 'MultiPolygon',
      coordinates: outerWays.length === 1 ? [outerWays[0]] : outerWays.map((w: any) => [w]),
    },
  }
}
