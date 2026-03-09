import { useState, useRef, useCallback } from 'react'
import { searchPlaces, type GeocodingResult } from '../../utils/geocoding'
import { useLayerStore } from '../../hooks/useLayerStore'
import './SearchBar.css'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const addLayer = useLayerStore((s) => s.addLayer)
  const mapCenter = useLayerStore((s) => s.mapCenter)

  const handleInput = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await searchPlaces(value)
      setResults(res)
      setIsOpen(res.length > 0)
      setLoading(false)
    }, 150)
  }, [])

  const handleSelect = (result: GeocodingResult) => {
    addLayer({
      name: result.name,
      center: [result.lat, result.lng],
      bounds: result.boundingBox,
      mapCenterLat: mapCenter[0],
    })

    // Zoom to fit the selected place
    const map = useLayerStore.getState().mapInstance
    if (map) {
      const [south, north, west, east] = result.boundingBox
      map.fitBounds([[south, west], [north, east]], { padding: [50, 50] })
    }

    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Add a place..."
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="search-input"
      />
      {loading && <span className="search-loading">...</span>}
      {isOpen && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.placeId} onClick={() => handleSelect(r)} className="search-result-item">
              <strong>{r.name}</strong>
              <span className="search-result-detail">{r.displayName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
