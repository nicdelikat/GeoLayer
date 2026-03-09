import { useState } from 'react'
import { useLayerStore } from '../../hooks/useLayerStore'
import { saveGroup } from '../../utils/storage'
import type { SavedGroup } from '../../types'
import './Modal.css'

interface SaveGroupModalProps {
  onClose: () => void
}

export function SaveGroupModal({ onClose }: SaveGroupModalProps) {
  const [name, setName] = useState('')
  const layers = useLayerStore((s) => s.layers)
  const measurements = useLayerStore((s) => s.measurements)
  const mapCenter = useLayerStore((s) => s.mapCenter)

  const handleSave = () => {
    if (!name.trim()) return
    const group: SavedGroup = {
      id: `group-${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      layers,
      measurements,
      mapView: { center: mapCenter, zoom: 3 },
    }
    saveGroup(group)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Save Group</h3>
        <input
          type="text"
          placeholder="Group name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
          {layers.length} layer(s), {measurements.length} measurement(s)
        </p>
        <div className="modal-actions">
          <button className="modal-btn" onClick={onClose}>Cancel</button>
          <button className="modal-btn modal-btn--primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
