import { describe, it, expect, beforeEach } from 'vitest'
import { useLayerStore } from '../useLayerStore'

describe('useLayerStore', () => {
  beforeEach(() => {
    useLayerStore.setState({
      layers: [],
      selectedLayerId: null,
      measurements: [],
      activeTool: null,
      unitSystem: 'metric',
    })
  })

  it('starts with empty layers', () => {
    const { layers } = useLayerStore.getState()
    expect(layers).toEqual([])
  })

  it('adds a layer', () => {
    const { addLayer } = useLayerStore.getState()
    addLayer({
      name: 'Los Angeles',
      center: [34.05, -118.24],
      bounds: [33.7, 34.33, -118.67, -118.15],
    })
    const { layers } = useLayerStore.getState()
    expect(layers).toHaveLength(1)
    expect(layers[0].name).toBe('Los Angeles')
    expect(layers[0].visible).toBe(true)
    expect(layers[0].opacity).toBe(0.8)
    expect(layers[0].blendMode).toBe('normal')
  })

  it('removes a layer', () => {
    const { addLayer } = useLayerStore.getState()
    addLayer({ name: 'LA', center: [34, -118], bounds: [33, 35, -119, -117] })
    const { layers, removeLayer } = useLayerStore.getState()
    removeLayer(layers[0].id)
    expect(useLayerStore.getState().layers).toHaveLength(0)
  })

  it('updates a layer property', () => {
    const { addLayer } = useLayerStore.getState()
    addLayer({ name: 'LA', center: [34, -118], bounds: [33, 35, -119, -117] })
    const { layers, updateLayer } = useLayerStore.getState()
    updateLayer(layers[0].id, { opacity: 0.5, rotation: 45 })
    const updated = useLayerStore.getState().layers[0]
    expect(updated.opacity).toBe(0.5)
    expect(updated.rotation).toBe(45)
  })

  it('selects a layer', () => {
    const { addLayer } = useLayerStore.getState()
    addLayer({ name: 'LA', center: [34, -118], bounds: [33, 35, -119, -117] })
    const { layers, selectLayer } = useLayerStore.getState()
    selectLayer(layers[0].id)
    expect(useLayerStore.getState().selectedLayerId).toBe(layers[0].id)
  })

  it('reorders layers', () => {
    const { addLayer } = useLayerStore.getState()
    addLayer({ name: 'A', center: [0, 0], bounds: [-1, 1, -1, 1] })
    addLayer({ name: 'B', center: [0, 0], bounds: [-1, 1, -1, 1] })
    const { reorderLayers } = useLayerStore.getState()
    reorderLayers(1, 0)
    const reordered = useLayerStore.getState().layers
    expect(reordered[0].name).toBe('B')
    expect(reordered[1].name).toBe('A')
  })

  it('adds a measurement', () => {
    const { addMeasurement } = useLayerStore.getState()
    addMeasurement({
      type: 'pin',
      points: [[34.05, -118.24]],
      label: 'Test pin',
    })
    const { measurements } = useLayerStore.getState()
    expect(measurements).toHaveLength(1)
    expect(measurements[0].type).toBe('pin')
  })

  it('removes a measurement', () => {
    const { addMeasurement } = useLayerStore.getState()
    addMeasurement({ type: 'pin', points: [[0, 0]] })
    const { measurements, removeMeasurement } = useLayerStore.getState()
    removeMeasurement(measurements[0].id)
    expect(useLayerStore.getState().measurements).toHaveLength(0)
  })

  it('toggles unit system', () => {
    const { toggleUnitSystem } = useLayerStore.getState()
    toggleUnitSystem()
    expect(useLayerStore.getState().unitSystem).toBe('imperial')
    toggleUnitSystem()
    expect(useLayerStore.getState().unitSystem).toBe('metric')
  })

  it('sets active tool', () => {
    const { setActiveTool } = useLayerStore.getState()
    setActiveTool('ruler')
    expect(useLayerStore.getState().activeTool).toBe('ruler')
    setActiveTool(null)
    expect(useLayerStore.getState().activeTool).toBeNull()
  })
})
