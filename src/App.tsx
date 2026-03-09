import { BaseMap } from './components/Map/BaseMap'
import { LayerPanel } from './components/LayerPanel/LayerPanel'
import { Toolbar } from './components/Toolbar/Toolbar'
import { useLayerStore } from './hooks/useLayerStore'
import './App.css'

function App() {
  const unitSystem = useLayerStore((s) => s.unitSystem)
  const toggleUnitSystem = useLayerStore((s) => s.toggleUnitSystem)

  return (
    <div className="app">
      <LayerPanel />
      <div className="main-area">
        <div className="top-bar">
          <Toolbar />
        </div>
        <BaseMap />
        <div className="bottom-bar">
          <button className="unit-toggle" onClick={toggleUnitSystem}>
            {unitSystem === 'metric' ? 'Metric' : 'Imperial'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
