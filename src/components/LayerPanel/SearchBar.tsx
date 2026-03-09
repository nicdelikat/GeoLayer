import { useState, useRef, useCallback } from 'react'
import L from 'leaflet'
import { searchPlaces, type GeocodingResult } from '../../utils/geocoding'
import { useLayerStore } from '../../hooks/useLayerStore'
import './SearchBar.css'

// Simple LRU cache for search results
const searchCache = new Map<string, GeocodingResult[]>()
const CACHE_MAX = 50

function getCached(key: string): GeocodingResult[] | undefined {
  const val = searchCache.get(key)
  if (val) {
    // Move to end (most recent)
    searchCache.delete(key)
    searchCache.set(key, val)
  }
  return val
}

function setCache(key: string, val: GeocodingResult[]) {
  if (searchCache.size >= CACHE_MAX) {
    // Delete oldest entry
    const first = searchCache.keys().next().value
    if (first !== undefined) searchCache.delete(first)
  }
  searchCache.set(key, val)
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const abortRef = useRef<AbortController | null>(null)
  const addLayer = useLayerStore((s) => s.addLayer)

  const doSearch = useCallback(async (value: string) => {
    const trimmed = value.trim().toLowerCase()

    // Check cache first
    const cached = getCached(trimmed)
    if (cached) {
      setResults(cached)
      setIsOpen(cached.length > 0)
      setLoading(false)
      return
    }

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const res = await searchPlaces(value, controller.signal)
      if (controller.signal.aborted) return
      setCache(trimmed, res)
      setResults(res)
      setIsOpen(res.length > 0)
      setLoading(false)
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setLoading(false)
    }
  }, [])

  const handleInput = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      setLoading(false)
      if (abortRef.current) abortRef.current.abort()
      return
    }

    // Debounce all typing — 250ms is fast enough to feel instant
    debounceRef.current = setTimeout(() => doSearch(value), 250)
  }

  const handleSelect = (result: GeocodingResult) => {
    const mapCenter = useLayerStore.getState().mapCenter
    const map = useLayerStore.getState().mapInstance
    const [south, north, west, east] = result.boundingBox
    const bounds: L.LatLngBoundsExpression = [[south, west], [north, east]]

    // Calculate the zoom level that fits this bounding box
    const zoom = map ? map.getBoundsZoom(L.latLngBounds(bounds), false, [50, 50]) : 10

    const isFirstLayer = useLayerStore.getState().layers.length === 0

    addLayer({
      name: result.name,
      center: [result.lat, result.lng],
      bounds: result.boundingBox,
      mapCenterLat: mapCenter[0],
      zoom,
      osmId: result.osmId,
      osmType: result.osmType,
      searchQuery: result.searchQuery,
    })

    // Only move the base map for the first layer
    if (map && isFirstLayer) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }

    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search city or region..."
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
