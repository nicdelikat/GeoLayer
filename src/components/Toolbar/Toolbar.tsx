import { useLayerStore } from '../../hooks/useLayerStore'
import './Toolbar.css'

const TOOLS = [
  { id: 'pin' as const, label: 'Pin', icon: '+' },
  { id: 'ruler' as const, label: 'Ruler', icon: '/' },
  { id: 'area' as const, label: 'Area', icon: '[]' },
  { id: 'annotation' as const, label: 'Note', icon: 'A' },
]

export function Toolbar() {
  const activeTool = useLayerStore((s) => s.activeTool)
  const setActiveTool = useLayerStore((s) => s.setActiveTool)

  return (
    <div className="toolbar">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          className={`toolbar-btn ${activeTool === tool.id ? 'toolbar-btn--active' : ''}`}
          onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
          title={tool.label}
        >
          <span className="toolbar-btn-icon">{tool.icon}</span>
          <span className="toolbar-btn-label">{tool.label}</span>
        </button>
      ))}
    </div>
  )
}
