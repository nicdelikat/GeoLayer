import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getDefaultProvider } from '../../utils/tiles'
import { useLayerStore } from '../../hooks/useLayerStore'
import { useMeasure } from '../../hooks/useMeasure'
import { OverlayLayer } from './OverlayLayer'
import './BaseMap.css'

export function BaseMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [map, setMap] = useState<L.Map | null>(null)
  const layers = useLayerStore((s) => s.layers)
  const setMapCenter = useLayerStore((s) => s.setMapCenter)
  const { init, handleMapClick, handleMapDblClick } = useMeasure(map)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const provider = getDefaultProvider()
    const leafletMap = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: true,
    })

    L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom ?? 19,
    }).addTo(leafletMap)

    leafletMap.on('moveend', () => {
      const center = leafletMap.getCenter()
      setMapCenter([center.lat, center.lng])
    })

    leafletMap.on('click', () => {
      if (!useLayerStore.getState().activeTool) {
        useLayerStore.getState().selectLayer(null)
      }
    })

    mapRef.current = leafletMap
    setMap(leafletMap)

    return () => {
      leafletMap.remove()
      mapRef.current = null
    }
  }, [])

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
      {map && layers.map((layer) => (
        <OverlayLayer key={layer.id} layer={layer} map={map} />
      ))}
    </div>
  )
}
