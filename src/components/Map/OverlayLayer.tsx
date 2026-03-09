import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { getProviderById, getDefaultProvider } from '../../utils/tiles'
import { fetchBoundary } from '../../utils/boundaries'
import { useLayerStore } from '../../hooks/useLayerStore'
import type { Layer } from '../../types'

interface OverlayLayerProps {
  layer: Layer
  map: L.Map
}

export function OverlayLayer({ layer, map }: OverlayLayerProps) {
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null)
  const paneRef = useRef<HTMLElement | null>(null)
  const updateLayer = useLayerStore((s) => s.updateLayer)

  const baseCenter = useLayerStore((s) => s.layers[0]?.center) ?? [0, 0]

  // Create a custom pane for this overlay (so we can transform it without breaking Leaflet)
  useEffect(() => {
    const paneName = `overlay-${layer.id}`
    let pane = map.getPane(paneName)
    if (!pane) {
      pane = map.createPane(paneName)
      pane.style.zIndex = '450'
      pane.style.pointerEvents = 'none'
    }
    paneRef.current = pane

    const provider = getProviderById(layer.tileSourceId) ?? getDefaultProvider()
    const tileLayer = L.tileLayer(provider.url, {
      attribution: '',
      maxZoom: provider.maxZoom ?? 19,
      pane: paneName,
    }).addTo(map)

    tileLayerRef.current = tileLayer

    return () => {
      map.removeLayer(tileLayer)
      tileLayerRef.current = null
      // Remove the pane
      if (pane && pane.parentNode) {
        pane.parentNode.removeChild(pane)
      }
      paneRef.current = null
    }
  }, [map, layer.id, layer.tileSourceId])

  // Apply transform to the PANE (not the tile container) on every render + map move
  useEffect(() => {
    const update = () => {
      const pane = paneRef.current
      if (!pane) return

      const basePx = map.latLngToContainerPoint(baseCenter as [number, number])
      const overlayPx = map.latLngToContainerPoint(layer.center)
      const dx = basePx.x - overlayPx.x + layer.offset.x
      const dy = basePx.y - overlayPx.y + layer.offset.y

      pane.style.transform = `translate(${dx}px, ${dy}px) rotate(${layer.rotation}deg) scale(${layer.scale})`
      pane.style.transformOrigin = `${basePx.x}px ${basePx.y}px`
      pane.style.opacity = String(layer.opacity)
      pane.style.mixBlendMode = layer.blendMode

      if (!layer.visible) {
        pane.style.display = 'none'
      } else {
        pane.style.display = ''
      }
    }

    update()
    map.on('move zoom zoomend viewreset resize', update)
    return () => { map.off('move zoom zoomend viewreset resize', update) }
  }, [map, baseCenter, layer.center, layer.offset, layer.rotation, layer.scale, layer.opacity, layer.blendMode, layer.visible])

  // Fetch boundary
  useEffect(() => {
    if (!layer.showBoundary || layer.boundaryGeoJSON) return
    fetchBoundary(layer.name, layer.bounds, layer.osmId, layer.osmType, layer.searchQuery).then((geojson) => {
      if (geojson) updateLayer(layer.id, { boundaryGeoJSON: geojson })
    })
  }, [layer.showBoundary, layer.boundaryGeoJSON, layer.name, layer.bounds, layer.id, layer.osmId, layer.osmType, layer.searchQuery, updateLayer])

  // Render boundary on the base map (offset to match)
  useEffect(() => {
    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current)
      boundaryLayerRef.current = null
    }

    if (layer.showBoundary && layer.boundaryGeoJSON && layer.visible) {
      const latOffset = (baseCenter as [number, number])[0] - layer.center[0]
      const lngOffset = (baseCenter as [number, number])[1] - layer.center[1]

      const offsetGeojson = offsetGeoJSON(layer.boundaryGeoJSON, latOffset, lngOffset)
      boundaryLayerRef.current = L.geoJSON(offsetGeojson as any, {
        style: { color: '#1565c0', weight: 4, fillOpacity: 0.05, fillColor: '#1565c0' },
      }).addTo(map)
    }

    return () => {
      if (boundaryLayerRef.current) {
        map.removeLayer(boundaryLayerRef.current)
        boundaryLayerRef.current = null
      }
    }
  }, [map, layer.showBoundary, layer.boundaryGeoJSON, layer.visible, baseCenter, layer.center])

  return null
}

function offsetGeoJSON(geojson: any, latOffset: number, lngOffset: number): any {
  if (!geojson) return geojson
  return {
    ...geojson,
    geometry: offsetGeometry(geojson.geometry, latOffset, lngOffset),
  }
}

function offsetGeometry(geom: any, latOffset: number, lngOffset: number): any {
  if (!geom) return geom
  if (geom.type === 'Point') {
    return { ...geom, coordinates: [geom.coordinates[0] + lngOffset, geom.coordinates[1] + latOffset] }
  }
  if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
    return { ...geom, coordinates: geom.coordinates.map((ring: any) => ring.map((c: any) => [c[0] + lngOffset, c[1] + latOffset])) }
  }
  if (geom.type === 'MultiPolygon') {
    return { ...geom, coordinates: geom.coordinates.map((poly: any) => poly.map((ring: any) => ring.map((c: any) => [c[0] + lngOffset, c[1] + latOffset]))) }
  }
  if (geom.type === 'LineString') {
    return { ...geom, coordinates: geom.coordinates.map((c: any) => [c[0] + lngOffset, c[1] + latOffset]) }
  }
  return geom
}
