import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getDefaultProvider } from '../../utils/tiles'
import { useLayerStore } from '../../hooks/useLayerStore'
import './BaseMap.css'

export function BaseMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const setMapCenter = useLayerStore((s) => s.setMapCenter)

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

    mapRef.current = leafletMap

    return () => {
      leafletMap.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="base-map-wrapper">
      <div ref={containerRef} className="base-map-container" />
    </div>
  )
}
