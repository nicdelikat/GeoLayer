import { useCallback, useRef } from 'react'
import { useLayerStore } from '../../hooks/useLayerStore'
import type { Layer } from '../../types'
import './LayerHandles.css'

interface LayerHandlesProps {
  layer: Layer
}

export function LayerHandles({ layer }: LayerHandlesProps) {
  const updateLayer = useLayerStore((s) => s.updateLayer)
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const rotateStart = useRef<{ angle: number; startRotation: number } | null>(null)
  const scaleStart = useRef<{ dist: number; startScale: number } | null>(null)

  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: layer.offset.x,
      oy: layer.offset.y,
    }
  }, [layer.offset])

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    updateLayer(layer.id, {
      offset: {
        x: dragStart.current.ox + dx,
        y: dragStart.current.oy + dy,
      },
    })
  }, [layer.id, updateLayer])

  const onDragEnd = useCallback(() => {
    dragStart.current = null
  }, [])

  const onRotateStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const rect = el.closest('.overlay-layer')?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI)
    rotateStart.current = { angle, startRotation: layer.rotation }
  }, [layer.rotation])

  const onRotateMove = useCallback((e: React.PointerEvent) => {
    if (!rotateStart.current) return
    const rect = (e.currentTarget as HTMLElement).closest('.overlay-layer')?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI)
    const delta = angle - rotateStart.current.angle
    updateLayer(layer.id, { rotation: rotateStart.current.startRotation + delta })
  }, [layer.id, updateLayer])

  const onRotateEnd = useCallback(() => {
    rotateStart.current = null
  }, [])

  const onScaleStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const rect = el.closest('.overlay-layer')?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2)
    scaleStart.current = { dist, startScale: layer.scale }
  }, [layer.scale])

  const onScaleMove = useCallback((e: React.PointerEvent) => {
    if (!scaleStart.current) return
    const rect = (e.currentTarget as HTMLElement).closest('.overlay-layer')?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2)
    const ratio = dist / scaleStart.current.dist
    updateLayer(layer.id, { scale: scaleStart.current.startScale * ratio })
  }, [layer.id, updateLayer])

  const onScaleEnd = useCallback(() => {
    scaleStart.current = null
  }, [])

  return (
    <div className="layer-handles">
      <div
        className="handle handle-drag"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
      />
      <div
        className="handle handle-rotate"
        onPointerDown={onRotateStart}
        onPointerMove={onRotateMove}
        onPointerUp={onRotateEnd}
      />
      {['nw', 'ne', 'sw', 'se'].map((corner) => (
        <div
          key={corner}
          className={`handle handle-scale handle-scale--${corner}`}
          onPointerDown={onScaleStart}
          onPointerMove={onScaleMove}
          onPointerUp={onScaleEnd}
        />
      ))}
    </div>
  )
}
