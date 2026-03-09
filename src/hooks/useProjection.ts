const EARTH_RADIUS = 6371000

export function calculateMercatorScale(mapLat: number, layerLat: number): number {
  const mapRad = (mapLat * Math.PI) / 180
  const layerRad = (layerLat * Math.PI) / 180
  return Math.cos(layerRad) / Math.cos(mapRad)
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS * c
}

export function geodesicArea(points: [number, number][]): number {
  if (points.length < 3) return 0
  const toRad = (deg: number) => (deg * Math.PI) / 180

  let total = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const [lat1, lng1] = points[i]
    const [lat2, lng2] = points[(i + 1) % n]
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)))
  }
  return Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2)
}
