import { useState, useEffect } from 'react'
import { useLayerStore } from '../../hooks/useLayerStore'
import { loadGroups, deleteGroup } from '../../utils/storage'
import type { SavedGroup } from '../../types'
import './Modal.css'

interface LoadGroupModalProps {
  onClose: () => void
}

export function LoadGroupModal({ onClose }: LoadGroupModalProps) {
  const [groups, setGroups] = useState<SavedGroup[]>([])

  useEffect(() => {
    setGroups(loadGroups())
  }, [])

  const handleLoad = (group: SavedGroup) => {
    useLayerStore.setState({
      layers: group.layers,
      measurements: group.measurements,
      mapCenter: group.mapView.center,
      selectedLayerId: null,
    })
    onClose()
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteGroup(id)
    setGroups(loadGroups())
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Load Group</h3>
        {groups.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>No saved groups</p>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="saved-group-item" onClick={() => handleLoad(g)}>
              <div>
                <strong>{g.name}</strong>
                <div className="saved-group-meta">
                  {g.layers.length} layers — {new Date(g.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                className="modal-btn"
                onClick={(e) => handleDelete(g.id, e)}
                style={{ fontSize: 12, padding: '2px 8px' }}
              >
                Delete
              </button>
            </div>
          ))
        )}
        <div className="modal-actions">
          <button className="modal-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
