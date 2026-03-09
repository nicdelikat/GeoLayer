import { useCallback, useRef } from 'react'
import L from 'leaflet'
import { useLayerStore } from './useLayerStore'
import { haversineDistance, geodesicArea } from './useProjection'

export function useMeasure(map: L.Map | null) {
  const activeTool = useLayerStore((s) => s.activeTool)
  const addMeasurement = useLayerStore((s) => s.addMeasurement)
  const unitSystem = useLayerStore((s) => s.unitSystem)
  const pendingPoints = useRef<[number, number][]>([])
  const tempLayerGroup = useRef<L.LayerGroup>(L.layerGroup())
  const measureLayerGroup = useRef<L.LayerGroup>(L.layerGroup())

  const init = useCallback((leafletMap: L.Map) => {
    measureLayerGroup.current.addTo(leafletMap)
    tempLayerGroup.current.addTo(leafletMap)
  }, [])

  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!activeTool || !map) return

    const point: [number, number] = [e.latlng.lat, e.latlng.lng]

    if (activeTool === 'pin') {
      addMeasurement({ type: 'pin', points: [point] })
      L.marker(point).addTo(measureLayerGroup.current)
        .bindPopup(`${point[0].toFixed(5)}, ${point[1].toFixed(5)}`)
        .openPopup()
      return
    }

    if (activeTool === 'annotation') {
      const text = prompt('Enter annotation text:')
      if (text) {
        addMeasurement({ type: 'annotation', points: [point], label: text })
        L.marker(point, {
          icon: L.divIcon({
            className: 'annotation-marker',
            html: `<div class="annotation-label">${text}</div>`,
          }),
        }).addTo(measureLayerGroup.current)
      }
      return
    }

    pendingPoints.current.push(point)

    L.circleMarker(point, { radius: 4, color: '#e44', fillOpacity: 1 })
      .addTo(tempLayerGroup.current)

    if (activeTool === 'ruler' && pendingPoints.current.length > 1) {
      const pts = pendingPoints.current
      L.polyline(
        [pts[pts.length - 2], pts[pts.length - 1]].map(([lat, lng]) => [lat, lng] as L.LatLngExpression),
        { color: '#e44', dashArray: '5,5' },
      ).addTo(tempLayerGroup.current)
    }

    if (activeTool === 'area' && pendingPoints.current.length > 2) {
      tempLayerGroup.current.clearLayers()
      pendingPoints.current.forEach((p) => {
        L.circleMarker(p, { radius: 4, color: '#e44', fillOpacity: 1 })
          .addTo(tempLayerGroup.current)
      })
      L.polygon(
        pendingPoints.current.map(([lat, lng]) => [lat, lng] as L.LatLngExpression),
        { color: '#e44', dashArray: '5,5', fillOpacity: 0.1 },
      ).addTo(tempLayerGroup.current)
    }
  }, [activeTool, map, addMeasurement])

  const handleMapDblClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!activeTool || !map) return
    if (activeTool !== 'ruler' && activeTool !== 'area') return

    e.originalEvent.preventDefault()
    const points = [...pendingPoints.current]
    tempLayerGroup.current.clearLayers()
    pendingPoints.current = []

    if (points.length < 2) return

    if (activeTool === 'ruler') {
      let totalDist = 0
      for (let i = 0; i < points.length - 1; i++) {
        totalDist += haversineDistance(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
      }
      addMeasurement({ type: 'ruler', points, value: totalDist })

      const line = L.polyline(
        points.map(([lat, lng]) => [lat, lng] as L.LatLngExpression),
        { color: '#e44', weight: 2 },
      ).addTo(measureLayerGroup.current)

      const label = unitSystem === 'metric'
        ? `${(totalDist / 1000).toFixed(1)} km`
        : `${(totalDist / 1609.344).toFixed(1)} mi`
      line.bindPopup(label).openPopup()
    }

    if (activeTool === 'area') {
      if (points.length < 3) return
      const area = geodesicArea(points)
      addMeasurement({ type: 'area', points, value: area })

      const polygon = L.polygon(
        points.map(([lat, lng]) => [lat, lng] as L.LatLngExpression),
        { color: '#e44', weight: 2, fillOpacity: 0.15 },
      ).addTo(measureLayerGroup.current)

      const label = unitSystem === 'metric'
        ? `${(area / 1e6).toFixed(1)} km\u00B2`
        : `${(area / 2.59e6).toFixed(1)} mi\u00B2`
      polygon.bindPopup(label).openPopup()
    }
  }, [activeTool, map, addMeasurement, unitSystem])

  return { init, handleMapClick, handleMapDblClick, measureLayerGroup }
}
