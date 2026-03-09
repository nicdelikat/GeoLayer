export interface GeocodingResult {
  placeId: string
  name: string
  displayName: string
  lat: number
  lng: number
  boundingBox: [number, number, number, number]
  type: string
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export async function searchPlaces(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return []

  try {
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
  } catch {
    return []
  }
}
