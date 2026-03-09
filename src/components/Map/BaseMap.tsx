import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getDefaultProvider, getProviderById } from '../../utils/tiles'
import { useLayerStore } from '../../hooks/useLayerStore'
import { useMeasure } from '../../hooks/useMeasure'
import { fetchBoundary } from '../../utils/boundaries'
import { OverlayLayer } from './OverlayLayer'
import './BaseMap.css'

export function BaseMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const baseTileRef = useRef<L.TileLayer | null>(null)
  const [map, setMap] = useState<L.Map | null>(null)
  const layers = useLayerStore((s) => s.layers)
  const firstLayer = layers[0] ?? null
  const setMapCenter = useLayerStore((s) => s.setMapCenter)
  const { init, handleMapClick, handleMapDblClick } = useMeasure(map)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const provider = getDefaultProvider()
    const leafletMap = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: true,
      scrollWheelZoom: 'center',
    })

    baseTileRef.current = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom ?? 19,
    }).addTo(leafletMap)

    leafletMap.on('moveend', () => {
      const center = leafletMap.getCenter()
      setMapCenter([center.lat, center.lng])
    })

    let prevZoom = leafletMap.getZoom()
    leafletMap.on('zoomend', () => {
      const newZoom = leafletMap.getZoom()
      const delta = newZoom - prevZoom
      prevZoom = newZoom
      const state = useLayerStore.getState()
      // Apply zoom delta to ALL layers (group zoom)
      state.layers.forEach((l) => {
        const clamped = Math.max(1, Math.min(18, l.zoom + delta))
        state.updateLayer(l.id, { zoom: clamped })
      })
    })

    leafletMap.on('click', () => {
      if (!useLayerStore.getState().activeTool) {
        useLayerStore.getState().selectLayer(null)
      }
    })

    mapRef.current = leafletMap
    setMap(leafletMap)
    useLayerStore.getState().setMapInstance(leafletMap)

    // Leaflet needs to recalculate size after flex layout settles
    requestAnimationFrame(() => leafletMap.invalidateSize())

    const ro = new ResizeObserver(() => leafletMap.invalidateSize())
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      leafletMap.remove()
      mapRef.current = null
    }
  }, [])

  // Sync base map tile source with first layer's tile choice
  const firstLayerTileSourceId = firstLayer?.tileSourceId
  const prevTileSourceRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!baseTileRef.current || !firstLayerTileSourceId) return
    // Only update if the tile source actually changed (not on first mount)
    if (prevTileSourceRef.current && prevTileSourceRef.current !== firstLayerTileSourceId) {
      const provider = getProviderById(firstLayerTileSourceId) ?? getDefaultProvider()
      baseTileRef.current.setUrl(provider.url)
    }
    prevTileSourceRef.current = firstLayerTileSourceId
  }, [firstLayerTileSourceId])

  // Hide/show base tile layer when first layer visibility toggles
  useEffect(() => {
    const container = baseTileRef.current?.getContainer()
    if (!container) return
    container.style.display = firstLayer?.visible === false ? 'none' : ''
  }, [firstLayer?.visible])

  // Fetch boundary for first layer
  const updateLayer = useLayerStore((s) => s.updateLayer)
  useEffect(() => {
    if (!firstLayer || !firstLayer.showBoundary || firstLayer.boundaryGeoJSON) return
    fetchBoundary(firstLayer.name, firstLayer.bounds, firstLayer.osmId, firstLayer.osmType, firstLayer.searchQuery).then((geojson) => {
      if (geojson) updateLayer(firstLayer.id, { boundaryGeoJSON: geojson })
    })
  }, [firstLayer?.id, firstLayer?.showBoundary, firstLayer?.boundaryGeoJSON])

  // Render first layer's boundary on the base map
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null)
  useEffect(() => {
    if (!map) return
    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current)
      boundaryLayerRef.current = null
    }
    if (firstLayer?.visible && firstLayer?.showBoundary && firstLayer.boundaryGeoJSON) {
      boundaryLayerRef.current = L.geoJSON(firstLayer.boundaryGeoJSON as any, {
        style: { color: '#1565c0', weight: 4, fillOpacity: 0.05, fillColor: '#1565c0' },
      }).addTo(map)
    }
  }, [map, firstLayer?.visible, firstLayer?.showBoundary, firstLayer?.boundaryGeoJSON, firstLayer?.id])

  useEffect(() => {
    if (!map) return
    init(map)
    map.on('click', handleMapClick)
    map.on('dblclick', handleMapDblClick)
    return () => {
      map.off('click', handleMapClick)
      map.off('dblclick', handleMapDblClick)
    }
  }, [map, handleMapClick, handleMapDblClick, init])

  return (
    <div className="base-map-wrapper">
      <div ref={containerRef} className="base-map-container" />
      {map && layers.slice(1).map((layer) => (
        <OverlayLayer key={layer.id} layer={layer} map={map} />
      ))}
    </div>
  )
}
