import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { getProviderById, getDefaultProvider } from '../../utils/tiles'
import { useLayerStore } from '../../hooks/useLayerStore'
import type { Layer } from '../../types'
import { LayerHandles } from './LayerHandles'
import './OverlayLayer.css'

interface OverlayLayerProps {
  layer: Layer
  map: L.Map
}

export function OverlayLayer({ layer, map }: OverlayLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const miniMapRef = useRef<L.Map | null>(null)
  const selectLayer = useLayerStore((s) => s.selectLayer)
  const selectedLayerId = useLayerStore((s) => s.selectedLayerId)
  const isSelected = selectedLayerId === layer.id

  useEffect(() => {
    if (!containerRef.current || miniMapRef.current) return

    const miniMap = L.map(containerRef.current, {
      center: layer.center,
      zoom: map.getZoom(),
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    })

    const provider = getProviderById(layer.tileSourceId) ?? getDefaultProvider()
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom ?? 19,
    }).addTo(miniMap)

    miniMapRef.current = miniMap
    tileLayerRef.current = tileLayer

    const onZoom = () => {
      miniMap.setZoom(map.getZoom(), { animate: false })
    }
    map.on('zoom', onZoom)

    return () => {
      map.off('zoom', onZoom)
      miniMap.remove()
      miniMapRef.current = null
      tileLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!miniMapRef.current || !tileLayerRef.current) return
    const provider = getProviderById(layer.tileSourceId) ?? getDefaultProvider()
    tileLayerRef.current.setUrl(provider.url)
  }, [layer.tileSourceId])

  useEffect(() => {
    miniMapRef.current?.setView(layer.center, map.getZoom(), { animate: false })
  }, [layer.center])

  if (!layer.visible) return null

  const transform = `translate(${layer.offset.x}px, ${layer.offset.y}px) rotate(${layer.rotation}deg) scale(${layer.scale})`

  return (
    <div
      ref={containerRef}
      className={`overlay-layer ${isSelected ? 'overlay-layer--selected' : ''}`}
      style={{
        opacity: layer.opacity,
        mixBlendMode: layer.blendMode as any,
        transform,
        pointerEvents: layer.visible ? 'auto' : 'none',
      }}
      onClick={(e) => {
        e.stopPropagation()
        selectLayer(layer.id)
      }}
    >
      {isSelected && <LayerHandles layer={layer} />}
    </div>
  )
}
