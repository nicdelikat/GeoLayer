import { useLayerStore } from '../../hooks/useLayerStore'
import { getTileProviders } from '../../utils/tiles'
import type { Layer } from '../../types'

const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn']

interface LayerCardProps {
  layer: Layer
  isSelected: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function LayerCard({ layer, isSelected, onDragStart, onDragEnd }: LayerCardProps) {
  const updateLayer = useLayerStore((s) => s.updateLayer)
  const removeLayer = useLayerStore((s) => s.removeLayer)
  const selectLayer = useLayerStore((s) => s.selectLayer)
  const providers = getTileProviders()
  const isFirstLayer = useLayerStore((s) => s.layers[0]?.id === layer.id)

  const handleRotation = (value: number) => {
    if (Math.abs(value) <= 3) value = 0
    updateLayer(layer.id, { rotation: value })
  }

  return (
    <div
      className={`layer-card ${isSelected ? 'layer-card--selected' : ''}`}
      onClick={() => selectLayer(layer.id)}
    >
      <div
        className="layer-card-header"
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart?.() }}
        onDragEnd={onDragEnd}
      >
        <label className="layer-visibility" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={layer.visible}
            onChange={(e) => updateLayer(layer.id, { visible: e.target.checked })}
          />
        </label>
        <span className="layer-name">{layer.name}</span>
        <button
          className="layer-delete"
          onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
          title="Remove layer"
        >
          x
        </button>
      </div>

      <div className="layer-card-controls" onClick={(e) => e.stopPropagation()}>
        <label className="layer-control">
          <span>Opacity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={layer.opacity}
            onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
          />
          <span>{Math.round(layer.opacity * 100)}%</span>
        </label>

        <label className="layer-control">
          <span>Zoom</span>
          <input
            type="range"
            min="1"
            max="18"
            step="1"
            value={layer.zoom}
            onChange={(e) => {
              const zoom = parseInt(e.target.value)
              updateLayer(layer.id, { zoom })
              if (isFirstLayer) {
                const map = useLayerStore.getState().mapInstance
                map?.setZoom(zoom)
              }
            }}
          />
          <span>{layer.zoom}</span>
        </label>

        {!isFirstLayer && (
          <label className="layer-control">
            <span>Scale</span>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.05"
              value={layer.scale}
              onChange={(e) => updateLayer(layer.id, { scale: parseFloat(e.target.value) })}
              onDoubleClick={() => {
                // Reset to Mercator-corrected scale
                const baseLat = useLayerStore.getState().layers[0]?.center[0] ?? 0
                const overlayLat = layer.center[0]
                const corrected = Math.cos((overlayLat * Math.PI) / 180) / Math.cos((baseLat * Math.PI) / 180)
                updateLayer(layer.id, { scale: corrected })
              }}
            />
            <span>{layer.scale.toFixed(2)}x</span>
          </label>
        )}

        <label className="layer-control">
          <span>Tiles</span>
          <select
            value={layer.tileSourceId}
            onChange={(e) => updateLayer(layer.id, { tileSourceId: e.target.value })}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="layer-control">
          <span>Rotation</span>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={layer.rotation}
            onChange={(e) => handleRotation(parseFloat(e.target.value))}
            onDoubleClick={() => updateLayer(layer.id, { rotation: 0 })}
          />
          <span>{layer.rotation}°</span>
        </label>

        <label className="layer-control">
          <span>Blend</span>
          <select
            value={layer.blendMode}
            onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value })}
          >
            {BLEND_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className="layer-control-inline">
          <input
            type="checkbox"
            checked={layer.showBoundary}
            onChange={(e) => updateLayer(layer.id, { showBoundary: e.target.checked })}
          />
          <span>Show boundary</span>
        </label>
      </div>
    </div>
  )
}
