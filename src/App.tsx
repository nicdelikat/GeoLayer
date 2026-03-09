import { useState } from 'react'
import { BaseMap } from './components/Map/BaseMap'
import { LayerPanel } from './components/LayerPanel/LayerPanel'
import { Toolbar } from './components/Toolbar/Toolbar'
import { SaveGroupModal } from './components/Modals/SaveGroupModal'
import { LoadGroupModal } from './components/Modals/LoadGroupModal'
import { useLayerStore } from './hooks/useLayerStore'
import './App.css'

function App() {
  const unitSystem = useLayerStore((s) => s.unitSystem)
  const toggleUnitSystem = useLayerStore((s) => s.toggleUnitSystem)
  const [showSave, setShowSave] = useState(false)
  const [showLoad, setShowLoad] = useState(false)

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
          <button className="unit-toggle" onClick={() => setShowSave(true)}>Save Group</button>
          <button className="unit-toggle" onClick={() => setShowLoad(true)}>Load Group</button>
        </div>
      </div>
      {showSave && <SaveGroupModal onClose={() => setShowSave(false)} />}
      {showLoad && <LoadGroupModal onClose={() => setShowLoad(false)} />}
    </div>
  )
}

export default App
