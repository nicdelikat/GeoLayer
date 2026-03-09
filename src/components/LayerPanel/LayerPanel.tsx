import { useState } from 'react'
import { useLayerStore } from '../../hooks/useLayerStore'
import { SearchBar } from './SearchBar'
import { LayerCard } from './LayerCard'
import './LayerPanel.css'

export function LayerPanel() {
  const layers = useLayerStore((s) => s.layers)
  const selectedLayerId = useLayerStore((s) => s.selectedLayerId)
  const [collapsed, setCollapsed] = useState(false)

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
        {layers.map((layer) => (
          <LayerCard
            key={layer.id}
            layer={layer}
            isSelected={layer.id === selectedLayerId}
          />
        ))}
      </div>
    </aside>
  )
}
