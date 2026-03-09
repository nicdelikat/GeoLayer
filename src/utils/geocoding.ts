export interface GeocodingResult {
  placeId: string
  name: string
  displayName: string
  lat: number
  lng: number
  boundingBox: [number, number, number, number]
  type: string
}

const PHOTON_URL = 'https://photon.komoot.io/api'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export async function searchPlaces(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return []

  // Try Photon first (fast autocomplete), fall back to Nominatim
  try {
    return await searchPhoton(query)
  } catch {
    return await searchNominatim(query)
  }
}

async function searchPhoton(query: string): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '6',
  })

  const response = await fetch(`${PHOTON_URL}?${params}`)
  if (!response.ok) throw new Error('Photon failed')

  const data = await response.json()
  if (!data.features?.length) return []

  return data.features.map((f: any) => {
    const props = f.properties
    const [lng, lat] = f.geometry.coordinates
    const extent = props.extent // [west, south, east, north] or undefined
    const name = props.name || props.city || props.state || props.country || ''
    const parts = [props.name, props.city, props.state, props.country].filter(Boolean)

    // Build bounding box: [south, north, west, east]
    let boundingBox: [number, number, number, number]
    if (extent) {
      boundingBox = [extent[1], extent[3], extent[0], extent[2]]
    } else {
      // Fallback: create a small bbox around the point
      const delta = 0.05
      boundingBox = [lat - delta, lat + delta, lng - delta, lng + delta]
    }

    return {
      placeId: String(props.osm_id || `${lat},${lng}`),
      name,
      displayName: parts.join(', '),
      lat,
      lng,
      boundingBox,
      type: props.osm_value || props.type || 'unknown',
    }
  })
}

async function searchNominatim(query: string): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '1',
  })

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'GeoLayer/1.0' },
  })

  if (!response.ok) return []

  const data = await response.json()

  return data.map((item: any) => ({
    placeId: String(item.place_id),
    name: item.name || item.display_name.split(',')[0],
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    boundingBox: item.boundingbox.map(Number) as [number, number, number, number],
    type: item.type || 'unknown',
  }))
}
