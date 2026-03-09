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
      <div className="main-area">
        <div className="top-bar">
          <div>
            <div className="wordmark">GeoLayer</div>
            <div className="wordmark-sub">Map Overlay Studio</div>
          </div>
          <div className="toolbar-spacer" />
          <Toolbar />
        </div>
        <div className="map-area">
          <div className="map-frame">
            <BaseMap />
          </div>
          <div className="bottom-bar">
            <button className="bottom-btn" onClick={toggleUnitSystem}>
              {unitSystem === 'metric' ? 'METRIC' : 'IMPERIAL'}
            </button>
            <button className="bottom-btn" onClick={() => setShowSave(true)}>SAVE</button>
            <button className="bottom-btn" onClick={() => setShowLoad(true)}>LOAD</button>
          </div>
        </div>
      </div>
      <LayerPanel />
      {showSave && <SaveGroupModal onClose={() => setShowSave(false)} />}
      {showLoad && <LoadGroupModal onClose={() => setShowLoad(false)} />}
    </div>
  )
}

export default App
