export interface SavedGroup {
  id: string
  name: string
  createdAt: string
  layers: any[]
  measurements: any[]
  mapView: { center: [number, number]; zoom: number }
}
