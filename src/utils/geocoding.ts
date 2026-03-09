export interface GeocodingResult {
  placeId: string
  name: string
  displayName: string
  lat: number
  lng: number
  boundingBox: [number, number, number, number]
  type: string
  osmId?: number
  osmType?: string // 'N', 'W', or 'R'
  searchQuery?: string // original user query for boundary lookup
}

const PHOTON_URL = 'https://photon.komoot.io/api'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  if (!query.trim()) return []

  // Try Photon first (fast autocomplete), fall back to Nominatim
  try {
    const results = await searchPhoton(query, signal)
    // Attach original query for boundary lookups
    return results.map(r => ({ ...r, searchQuery: query }))
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e
    const results = await searchNominatim(query, signal)
    return results.map(r => ({ ...r, searchQuery: query }))
  }
}

async function searchPhoton(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '8',
  })

  const response = await fetch(`${PHOTON_URL}?${params}`, { signal })
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
      let [west, south, east, north] = [extent[0], extent[1], extent[2], extent[3]]
      // Handle antimeridian-crossing bounds (e.g. Alaska: -180 to 180)
      // If span is > 180°, clamp to a reasonable bbox around the center point
      if (Math.abs(east - west) > 180) {
        const delta = 15 // ~15° around center
        west = lng - delta
        east = lng + delta
      }
      boundingBox = [south, north, west, east]
    } else {
      // Scale fallback bbox based on type
      const osmValue = props.osm_value || ''
      let delta = 0.05
      if (osmValue === 'continent') delta = 30
      else if (osmValue === 'country') delta = 10
      else if (osmValue === 'state') delta = 5
      else if (osmValue === 'city' || osmValue === 'town') delta = 0.2
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
      osmId: props.osm_id,
      osmType: props.osm_type, // 'N', 'W', or 'R'
    }
  })
}

async function searchNominatim(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '1',
  })

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'GeoLayer/1.0' },
    signal,
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
