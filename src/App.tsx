import { BaseMap } from './components/Map/BaseMap'
import { LayerPanel } from './components/LayerPanel/LayerPanel'
import './App.css'

function App() {
  return (
    <div className="app">
      <LayerPanel />
      <BaseMap />
    </div>
  )
}

export default App
