import { useState } from 'react'
import { useLayerStore } from '../../hooks/useLayerStore'
import { SearchBar } from './SearchBar'
import { LayerCard } from './LayerCard'
import './LayerPanel.css'

export function LayerPanel() {
  const layers = useLayerStore((s) => s.layers)
  const selectedLayerId = useLayerStore((s) => s.selectedLayerId)
  const reorderLayers = useLayerStore((s) => s.reorderLayers)
  const [collapsed, setCollapsed] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  if (collapsed) {
    return (
      <button className="sidebar-toggle sidebar-toggle--collapsed" onClick={() => setCollapsed(false)}>
        Layers
      </button>
    )
  }

  return (
    <aside className="layer-panel">
      <div className="layer-panel-header">
        <h2>Layers</h2>
        <button className="sidebar-toggle" onClick={() => setCollapsed(true)}>
          &lt;
        </button>
      </div>

      <SearchBar />

      <div className="layer-list">
        {layers.length === 0 && (
          <p className="layer-list-empty">Search for a place to add a layer</p>
        )}
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== index) {
                reorderLayers(dragIndex, index)
              }
              setDragIndex(null)
            }}
          >
            <LayerCard
              layer={layer}
              isSelected={layer.id === selectedLayerId}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
            />
          </div>
        ))}
      </div>
    </aside>
  )
}
