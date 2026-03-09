export interface TileProvider {
  id: string
  name: string
  url: string
  attribution: string
  maxZoom?: number
}

export interface Layer {
  id: string
  name: string
  center: [number, number]
  bounds: [number, number, number, number]
  tileSourceId: string
  offset: { x: number; y: number }
  rotation: number
  scale: number
  opacity: number
  visible: boolean
  blendMode: string
  zoom: number
  showBoundary: boolean
  boundaryGeoJSON?: any | null
  osmId?: number
  osmType?: string
  searchQuery?: string
}

export interface Measurement {
  id: string
  type: 'pin' | 'ruler' | 'area' | 'annotation'
  points: [number, number][]
  label?: string
  value?: number
  unit: 'metric' | 'imperial'
}

export interface SavedGroup {
  id: string
  name: string
  createdAt: string
  layers: Layer[]
  measurements: Measurement[]
  mapView: { center: [number, number]; zoom: number }
}
