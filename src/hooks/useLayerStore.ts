import { create } from 'zustand'
import type L from 'leaflet'
import type { Layer, Measurement } from '../types'

type ToolType = 'pin' | 'ruler' | 'area' | 'annotation' | null

interface LayerStore {
  layers: Layer[]
  selectedLayerId: string | null
  measurements: Measurement[]
  activeTool: ToolType
  unitSystem: 'metric' | 'imperial'
  mapCenter: [number, number]

  addLayer: (partial: {
    name: string
    center: [number, number]
    bounds: [number, number, number, number]
    tileSourceId?: string
    mapCenterLat?: number
    zoom?: number
    osmId?: number
    osmType?: string
    searchQuery?: string
  }) => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, updates: Partial<Layer>) => void
  selectLayer: (id: string | null) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void

  addMeasurement: (partial: {
    type: Measurement['type']
    points: [number, number][]
    label?: string
    value?: number
  }) => void
  removeMeasurement: (id: string) => void
  updateMeasurement: (id: string, updates: Partial<Measurement>) => void

  setActiveTool: (tool: ToolType) => void
  toggleUnitSystem: () => void
  setMapCenter: (center: [number, number]) => void
  mapInstance: L.Map | null
  setMapInstance: (map: L.Map | null) => void
}

let nextId = 1
function generateId(): string {
  return `layer-${nextId++}-${Date.now()}`
}

let nextMeasurementId = 1
function generateMeasurementId(): string {
  return `meas-${nextMeasurementId++}-${Date.now()}`
}

export const useLayerStore = create<LayerStore>((set) => ({
  layers: [],
  selectedLayerId: null,
  measurements: [],
  activeTool: null,
  unitSystem: 'metric',
  mapCenter: [20, 0],

  addLayer: (partial) =>
    set((state) => {
      const isFirst = state.layers.length === 0

      // For the first layer, scale is 1 (it's the reference)
      // For subsequent layers, correct for Mercator distortion:
      // Mercator inflates areas at higher latitudes. To show TRUE relative size,
      // scale overlay by cos(overlayLat) / cos(baseLat)
      let scale = 1
      if (!isFirst) {
        const baseLat = state.layers[0].center[0]
        const overlayLat = partial.center[0]
        scale = Math.cos((overlayLat * Math.PI) / 180) / Math.cos((baseLat * Math.PI) / 180)
      }

      return {
        layers: [
          ...state.layers,
          {
            id: generateId(),
            name: partial.name,
            center: partial.center,
            bounds: partial.bounds,
            tileSourceId: partial.tileSourceId ?? 'carto-light',
            offset: { x: 0, y: 0 },
            rotation: 0,
            scale,
            zoom: partial.zoom ?? 10,
            opacity: 0.8,
            visible: true,
            blendMode: 'normal',
            showBoundary: true,
            boundaryGeoJSON: null,
            osmId: partial.osmId,
            osmType: partial.osmType,
            searchQuery: partial.searchQuery,
          },
        ],
      }
    }),

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
    })),

  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  selectLayer: (id) => set({ selectedLayerId: id }),

  reorderLayers: (fromIndex, toIndex) =>
    set((state) => {
      const layers = [...state.layers]
      const [moved] = layers.splice(fromIndex, 1)
      layers.splice(toIndex, 0, moved)
      return { layers }
    }),

  addMeasurement: (partial) =>
    set((state) => ({
      measurements: [
        ...state.measurements,
        {
          id: generateMeasurementId(),
          type: partial.type,
          points: partial.points,
          label: partial.label,
          value: partial.value,
          unit: state.unitSystem,
        },
      ],
    })),

  removeMeasurement: (id) =>
    set((state) => ({
      measurements: state.measurements.filter((m) => m.id !== id),
    })),

  updateMeasurement: (id, updates) =>
    set((state) => ({
      measurements: state.measurements.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    })),

  setActiveTool: (tool) => set({ activeTool: tool }),

  toggleUnitSystem: () =>
    set((state) => ({
      unitSystem: state.unitSystem === 'metric' ? 'imperial' : 'metric',
    })),

  setMapCenter: (center) => set({ mapCenter: center }),

  mapInstance: null,
  setMapInstance: (map) => set({ mapInstance: map }),
}))
