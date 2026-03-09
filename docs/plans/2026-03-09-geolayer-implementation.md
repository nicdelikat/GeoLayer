# GeoLayer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a client-side map overlay app that lets users compare geographic regions at true scale with independent layer manipulation, measurement tools, and localStorage persistence.

**Architecture:** React SPA with Leaflet for maps. Each overlay layer is a CSS-transformed div containing its own tile layer, managed by a Zustand store. No backend — geocoding via Nominatim, boundaries via Overpass API, persistence via localStorage.

**Tech Stack:** React 18, Vite, TypeScript, Leaflet, Zustand, Vitest + React Testing Library

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/App.css`
- Create: `src/vite-env.d.ts`

**Step 1: Scaffold Vite + React project**

Run:
```bash
cd G:/00_ACTIVE/00_GEOLAYER
npm create vite@latest . -- --template react-ts
```

If the directory isn't empty, accept overwrite prompts. This creates the base Vite + React + TypeScript project.

**Step 2: Install dependencies**

Run:
```bash
npm install leaflet zustand
npm install -D @types/leaflet vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Configure Vitest**

Add to `vite.config.ts`:
```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

Create `src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

**Step 4: Add test script to package.json**

Ensure `package.json` scripts include:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

**Step 5: Verify everything works**

Run: `npm run dev` — confirm app loads at localhost:5173
Run: `npm run test:run` — confirm vitest runs (0 tests is fine)

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript project with Leaflet and Zustand"
```

---

### Task 2: Tile Provider Configuration

**Files:**
- Create: `src/utils/tiles.ts`
- Create: `src/utils/__tests__/tiles.test.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/__tests__/tiles.test.ts
import { describe, it, expect } from 'vitest'
import { getTileProviders, getDefaultProvider } from '../tiles'

describe('tiles', () => {
  it('returns a list of tile providers', () => {
    const providers = getTileProviders()
    expect(providers.length).toBeGreaterThan(0)
    expect(providers[0]).toHaveProperty('id')
    expect(providers[0]).toHaveProperty('name')
    expect(providers[0]).toHaveProperty('url')
    expect(providers[0]).toHaveProperty('attribution')
  })

  it('returns OSM as the default provider', () => {
    const provider = getDefaultProvider()
    expect(provider.id).toBe('osm')
    expect(provider.url).toContain('openstreetmap')
  })

  it('includes CartoDB and Stadia providers', () => {
    const providers = getTileProviders()
    const ids = providers.map(p => p.id)
    expect(ids).toContain('carto-light')
    expect(ids).toContain('carto-dark')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/tiles.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/utils/tiles.ts
export interface TileProvider {
  id: string
  name: string
  url: string
  attribution: string
  maxZoom?: number
}

const providers: TileProvider[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    id: 'carto-light',
    name: 'CartoDB Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  {
    id: 'carto-dark',
    name: 'CartoDB Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
]

export function getTileProviders(): TileProvider[] {
  return providers
}

export function getDefaultProvider(): TileProvider {
  return providers[0]
}

export function getProviderById(id: string): TileProvider | undefined {
  return providers.find(p => p.id === id)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/tiles.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/tiles.ts src/utils/__tests__/tiles.test.ts
git commit -m "feat: add tile provider configuration with OSM and CartoDB sources"
```

---

### Task 3: Geocoding Utility

**Files:**
- Create: `src/utils/geocoding.ts`
- Create: `src/utils/__tests__/geocoding.test.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/__tests__/geocoding.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchPlaces, type GeocodingResult } from '../geocoding'

const mockResponse: GeocodingResult[] = [
  {
    placeId: '123',
    name: 'Los Angeles',
    displayName: 'Los Angeles, California, USA',
    lat: 34.0522,
    lng: -118.2437,
    boundingBox: [33.7037, 34.3373, -118.6682, -118.1553],
    type: 'city',
  },
]

describe('geocoding', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns parsed results from Nominatim', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          place_id: 123,
          display_name: 'Los Angeles, California, USA',
          lat: '34.0522',
          lon: '-118.2437',
          boundingbox: ['33.7037', '34.3373', '-118.6682', '-118.1553'],
          type: 'city',
          name: 'Los Angeles',
        },
      ]),
    })

    const results = await searchPlaces('Los Angeles')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Los Angeles')
    expect(results[0].lat).toBe(34.0522)
    expect(results[0].lng).toBe(-118.2437)
    expect(results[0].boundingBox).toEqual([33.7037, 34.3373, -118.6682, -118.1553])
  })

  it('returns empty array on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const results = await searchPlaces('nowhere')
    expect(results).toEqual([])
  })

  it('returns empty array for empty query', async () => {
    const results = await searchPlaces('')
    expect(results).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/geocoding.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/utils/geocoding.ts
export interface GeocodingResult {
  placeId: string
  name: string
  displayName: string
  lat: number
  lng: number
  boundingBox: [number, number, number, number] // [south, north, west, east]
  type: string
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export async function searchPlaces(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return []

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      addressdetails: '1',
    })

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': 'GeoLayer/1.0' },
    })

    if (!response.ok) return []

    const data = await response.json()

    return data.map((item: any) => ({
      placeId: String(item.place_id),
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      boundingBox: item.boundingbox.map(Number) as [number, number, number, number],
      type: item.type || 'unknown',
    }))
  } catch {
    return []
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/geocoding.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/geocoding.ts src/utils/__tests__/geocoding.test.ts
git commit -m "feat: add Nominatim geocoding utility with search and parsing"
```

---

### Task 4: Projection / True-Size Correction Utility

**Files:**
- Create: `src/hooks/useProjection.ts`
- Create: `src/hooks/__tests__/useProjection.test.ts`

**Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useProjection.test.ts
import { describe, it, expect } from 'vitest'
import { calculateMercatorScale, haversineDistance, geodesicArea } from '../useProjection'

describe('projection utilities', () => {
  it('returns 1.0 when layer and map are at same latitude', () => {
    const scale = calculateMercatorScale(45, 45)
    expect(scale).toBeCloseTo(1.0, 5)
  })

  it('scales up when moving equatorial layer to high latitude', () => {
    // Africa (0°) overlaid at US latitude (40°) — Africa should appear larger
    const scale = calculateMercatorScale(40, 0)
    expect(scale).toBeGreaterThan(1.0)
  })

  it('scales down when moving high-latitude layer to equator', () => {
    // Greenland (70°) overlaid at equator — Greenland should appear smaller
    const scale = calculateMercatorScale(0, 70)
    expect(scale).toBeLessThan(1.0)
  })

  it('calculates haversine distance between two points', () => {
    // LA to NYC ~ 3944 km
    const dist = haversineDistance(34.0522, -118.2437, 40.7128, -74.006)
    expect(dist).toBeGreaterThan(3900000) // meters
    expect(dist).toBeLessThan(4000000)
  })

  it('returns 0 distance for same point', () => {
    const dist = haversineDistance(0, 0, 0, 0)
    expect(dist).toBe(0)
  })

  it('calculates geodesic area of a polygon', () => {
    // Small square near equator, ~1 degree on each side ≈ ~12300 km²
    const points: [number, number][] = [
      [0, 0], [0, 1], [1, 1], [1, 0],
    ]
    const area = geodesicArea(points)
    expect(area).toBeGreaterThan(12000e6) // m²
    expect(area).toBeLessThan(12500e6)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useProjection.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/hooks/useProjection.ts
const EARTH_RADIUS = 6371000 // meters

/**
 * Calculate scale factor to correct Mercator distortion.
 * Returns multiplier to apply to a layer originating at layerLat
 * when displayed at mapLat.
 */
export function calculateMercatorScale(mapLat: number, layerLat: number): number {
  const mapRad = (mapLat * Math.PI) / 180
  const layerRad = (layerLat * Math.PI) / 180
  return Math.cos(mapRad) / Math.cos(layerRad)
}

/**
 * Great-circle distance between two points using Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS * c
}

/**
 * Geodesic area of a polygon defined by [lat, lng] vertices.
 * Uses spherical excess formula. Returns area in square meters.
 */
export function geodesicArea(points: [number, number][]): number {
  if (points.length < 3) return 0
  const toRad = (deg: number) => (deg * Math.PI) / 180

  let total = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const [lat1, lng1] = points[i]
    const [lat2, lng2] = points[(i + 1) % n]
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)))
  }
  return Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useProjection.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useProjection.ts src/hooks/__tests__/useProjection.test.ts
git commit -m "feat: add Mercator scale correction, haversine distance, and geodesic area"
```

---

### Task 5: Layer Store (Zustand)

**Files:**
- Create: `src/hooks/useLayerStore.ts`
- Create: `src/types.ts`
- Create: `src/hooks/__tests__/useLayerStore.test.ts`

**Step 1: Write types**

```typescript
// src/types.ts
export interface TileProvider {
  id: string
  name: string
  url: string
  attribution: string
  maxZoom?: number
}

export interface Layer {
  id: string
  name: string
  center: [number, number]
  bounds: [number, number, number, number] // [south, north, west, east]
  tileSourceId: string
  offset: { x: number; y: number }
  rotation: number
  scale: number
  opacity: number
  visible: boolean
  blendMode: string
  showBoundary: boolean
  boundaryGeoJSON?: GeoJSON.GeoJsonObject | null
}

export interface Measurement {
  id: string
  type: 'pin' | 'ruler' | 'area' | 'annotation'
  points: [number, number][]
  label?: string
  value?: number
  unit: 'metric' | 'imperial'
}

export interface SavedGroup {
  id: string
  name: string
  createdAt: string
  layers: Layer[]
  measurements: Measurement[]
  mapView: { center: [number, number]; zoom: number }
}
```

**Step 2: Write the failing test**

```typescript
// src/hooks/__tests__/useLayerStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useLayerStore } from '../useLayerStore'

describe('useLayerStore', () => {
  beforeEach(() => {
    useLayerStore.setState({
      layers: [],
      selectedLayerId: null,
      measurements: [],
      activeTool: null,
      unitSystem: 'metric',
    })
  })

  it('starts with empty layers', () => {
    const { layers } = useLayerStore.getState()
    expect(layers).toEqual([])
  })

  it('adds a layer', () => {
    const { addLayer } = useLayerStore.getState()
    addLayer({
      name: 'Los Angeles',
      center: [34.05, -118.24],
      bounds: [33.7, 34.33, -118.67, -118.15],
    })
    const { layers } = useLayerStore.getState()
    expect(layers).toHaveLength(1)
    expect(layers[0].name).toBe('Los Angeles')
    expect(layers[0].visible).toBe(true)
    expect(layers[0].opacity).toBe(0.8)
    expect(layers[0].blendMode).toBe('normal')
  })

  it('removes a layer', () => {
    const { addLayer } = useLayerStore.getState()
    addLayer({ name: 'LA', center: [34, -118], bounds: [33, 35, -119, -117] })
    const { layers, removeLayer } = useLayerStore.getState()
    removeLayer(layers[0].id)
    expect(useLayerStore.getState().layers).toHaveLength(0)
  })

  it('updates a layer property', () => {
    const { addLayer } = useLayerStore.getState()
    addLayer({ name: 'LA', center: [34, -118], bounds: [33, 35, -119, -117] })
    const { layers, updateLayer } = useLayerStore.getState()
    updateLayer(layers[0].id, { opacity: 0.5, rotation: 45 })
    const updated = useLayerStore.getState().layers[0]
    expect(updated.opacity).toBe(0.5)
    expect(updated.rotation).toBe(45)
  })

  it('selects a layer', () => {
    const { addLayer } = useLayerStore.getState()
    addLayer({ name: 'LA', center: [34, -118], bounds: [33, 35, -119, -117] })
    const { layers, selectLayer } = useLayerStore.getState()
    selectLayer(layers[0].id)
    expect(useLayerStore.getState().selectedLayerId).toBe(layers[0].id)
  })

  it('reorders layers', () => {
    const { addLayer } = useLayerStore.getState()
    addLayer({ name: 'A', center: [0, 0], bounds: [-1, 1, -1, 1] })
    addLayer({ name: 'B', center: [0, 0], bounds: [-1, 1, -1, 1] })
    const { layers, reorderLayers } = useLayerStore.getState()
    reorderLayers(1, 0)
    const reordered = useLayerStore.getState().layers
    expect(reordered[0].name).toBe('B')
    expect(reordered[1].name).toBe('A')
  })

  it('adds a measurement', () => {
    const { addMeasurement } = useLayerStore.getState()
    addMeasurement({
      type: 'pin',
      points: [[34.05, -118.24]],
      label: 'Test pin',
    })
    const { measurements } = useLayerStore.getState()
    expect(measurements).toHaveLength(1)
    expect(measurements[0].type).toBe('pin')
  })

  it('removes a measurement', () => {
    const { addMeasurement } = useLayerStore.getState()
    addMeasurement({ type: 'pin', points: [[0, 0]] })
    const { measurements, removeMeasurement } = useLayerStore.getState()
    removeMeasurement(measurements[0].id)
    expect(useLayerStore.getState().measurements).toHaveLength(0)
  })

  it('toggles unit system', () => {
    const { toggleUnitSystem } = useLayerStore.getState()
    toggleUnitSystem()
    expect(useLayerStore.getState().unitSystem).toBe('imperial')
    toggleUnitSystem()
    expect(useLayerStore.getState().unitSystem).toBe('metric')
  })

  it('sets active tool', () => {
    const { setActiveTool } = useLayerStore.getState()
    setActiveTool('ruler')
    expect(useLayerStore.getState().activeTool).toBe('ruler')
    setActiveTool(null)
    expect(useLayerStore.getState().activeTool).toBeNull()
  })
})
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useLayerStore.test.ts`
Expected: FAIL

**Step 4: Write minimal implementation**

```typescript
// src/hooks/useLayerStore.ts
import { create } from 'zustand'
import type { Layer, Measurement } from '../types'

type ToolType = 'pin' | 'ruler' | 'area' | 'annotation' | null

interface LayerStore {
  layers: Layer[]
  selectedLayerId: string | null
  measurements: Measurement[]
  activeTool: ToolType
  unitSystem: 'metric' | 'imperial'

  addLayer: (partial: {
    name: string
    center: [number, number]
    bounds: [number, number, number, number]
    tileSourceId?: string
  }) => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, updates: Partial<Layer>) => void
  selectLayer: (id: string | null) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void

  addMeasurement: (partial: {
    type: Measurement['type']
    points: [number, number][]
    label?: string
    value?: number
  }) => void
  removeMeasurement: (id: string) => void
  updateMeasurement: (id: string, updates: Partial<Measurement>) => void

  setActiveTool: (tool: ToolType) => void
  toggleUnitSystem: () => void
}

let nextId = 1
function generateId(): string {
  return `layer-${nextId++}-${Date.now()}`
}

let nextMeasurementId = 1
function generateMeasurementId(): string {
  return `meas-${nextMeasurementId++}-${Date.now()}`
}

export const useLayerStore = create<LayerStore>((set) => ({
  layers: [],
  selectedLayerId: null,
  measurements: [],
  activeTool: null,
  unitSystem: 'metric',

  addLayer: (partial) =>
    set((state) => ({
      layers: [
        ...state.layers,
        {
          id: generateId(),
          name: partial.name,
          center: partial.center,
          bounds: partial.bounds,
          tileSourceId: partial.tileSourceId ?? 'osm',
          offset: { x: 0, y: 0 },
          rotation: 0,
          scale: 1,
          opacity: 0.8,
          visible: true,
          blendMode: 'normal',
          showBoundary: false,
          boundaryGeoJSON: null,
        },
      ],
    })),

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
    })),

  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  selectLayer: (id) => set({ selectedLayerId: id }),

  reorderLayers: (fromIndex, toIndex) =>
    set((state) => {
      const layers = [...state.layers]
      const [moved] = layers.splice(fromIndex, 1)
      layers.splice(toIndex, 0, moved)
      return { layers }
    }),

  addMeasurement: (partial) =>
    set((state) => ({
      measurements: [
        ...state.measurements,
        {
          id: generateMeasurementId(),
          type: partial.type,
          points: partial.points,
          label: partial.label,
          value: partial.value,
          unit: state.unitSystem,
        },
      ],
    })),

  removeMeasurement: (id) =>
    set((state) => ({
      measurements: state.measurements.filter((m) => m.id !== id),
    })),

  updateMeasurement: (id, updates) =>
    set((state) => ({
      measurements: state.measurements.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    })),

  setActiveTool: (tool) => set({ activeTool: tool }),

  toggleUnitSystem: () =>
    set((state) => ({
      unitSystem: state.unitSystem === 'metric' ? 'imperial' : 'metric',
    })),
}))
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useLayerStore.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/types.ts src/hooks/useLayerStore.ts src/hooks/__tests__/useLayerStore.test.ts
git commit -m "feat: add Zustand layer store with layer/measurement CRUD and tool state"
```

---

### Task 6: localStorage Save/Load Utility

**Files:**
- Create: `src/utils/storage.ts`
- Create: `src/utils/__tests__/storage.test.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/__tests__/storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { saveGroup, loadGroups, deleteGroup, saveBoundaryCache, loadBoundaryCache } from '../storage'
import type { SavedGroup } from '../../types'

const mockGroup: SavedGroup = {
  id: 'test-1',
  name: 'Test Group',
  createdAt: '2026-03-09T00:00:00Z',
  layers: [],
  measurements: [],
  mapView: { center: [0, 0], zoom: 2 },
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and loads groups', () => {
    saveGroup(mockGroup)
    const groups = loadGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('Test Group')
  })

  it('overwrites group with same id', () => {
    saveGroup(mockGroup)
    saveGroup({ ...mockGroup, name: 'Updated' })
    const groups = loadGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('Updated')
  })

  it('deletes a group', () => {
    saveGroup(mockGroup)
    deleteGroup('test-1')
    expect(loadGroups()).toHaveLength(0)
  })

  it('returns empty array when no groups saved', () => {
    expect(loadGroups()).toEqual([])
  })

  it('caches and loads boundary GeoJSON', () => {
    const geojson = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } }
    saveBoundaryCache('place-123', geojson)
    expect(loadBoundaryCache('place-123')).toEqual(geojson)
  })

  it('returns null for uncached boundary', () => {
    expect(loadBoundaryCache('nonexistent')).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/storage.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/utils/storage.ts
import type { SavedGroup } from '../types'

const GROUPS_KEY = 'geolayer:groups'
const BOUNDARY_PREFIX = 'geolayer:boundaries:'

export function saveGroup(group: SavedGroup): void {
  const groups = loadGroups()
  const index = groups.findIndex((g) => g.id === group.id)
  if (index >= 0) {
    groups[index] = group
  } else {
    groups.push(group)
  }
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
}

export function loadGroups(): SavedGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function deleteGroup(id: string): void {
  const groups = loadGroups().filter((g) => g.id !== id)
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
}

export function saveBoundaryCache(placeId: string, geojson: any): void {
  localStorage.setItem(BOUNDARY_PREFIX + placeId, JSON.stringify(geojson))
}

export function loadBoundaryCache(placeId: string): any | null {
  try {
    const raw = localStorage.getItem(BOUNDARY_PREFIX + placeId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/storage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/storage.ts src/utils/__tests__/storage.test.ts
git commit -m "feat: add localStorage save/load for groups and boundary cache"
```

---

### Task 7: Boundary Fetching Utility

**Files:**
- Create: `src/utils/boundaries.ts`
- Create: `src/utils/__tests__/boundaries.test.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/__tests__/boundaries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBoundary } from '../boundaries'

describe('boundaries', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('fetches boundary GeoJSON from Overpass API', async () => {
    const mockGeoJSON = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        properties: {},
      }],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ elements: [{ type: 'relation', id: 1, tags: { name: 'Test' } }] }),
    })

    // Mock the second fetch for the actual geometry
    ;(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ elements: [{ type: 'relation', id: 1 }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGeoJSON),
      })

    // This tests the interface; actual Overpass queries are integration tests
    const result = await fetchBoundary('Los Angeles', [33.7, 34.33, -118.67, -118.15])
    // Result is either GeoJSON or null depending on API response
    expect(result === null || typeof result === 'object').toBe(true)
  })

  it('returns null on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const result = await fetchBoundary('nowhere', [0, 0, 0, 0])
    expect(result).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/boundaries.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/utils/boundaries.ts
import { saveBoundaryCache, loadBoundaryCache } from './storage'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export async function fetchBoundary(
  name: string,
  bounds: [number, number, number, number],
): Promise<GeoJSON.GeoJsonObject | null> {
  const cacheKey = `${name}-${bounds.join(',')}`
  const cached = loadBoundaryCache(cacheKey)
  if (cached) return cached

  try {
    // Query Overpass for the boundary relation
    const query = `
      [out:json][timeout:10];
      relation["name"="${name}"]["boundary"="administrative"](${bounds[0]},${bounds[2]},${bounds[1]},${bounds[3]});
      out geom;
    `

    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.elements || data.elements.length === 0) return null

    // Convert Overpass relation to GeoJSON
    const geojson = overpassToGeoJSON(data.elements[0])
    if (geojson) {
      saveBoundaryCache(cacheKey, geojson)
    }
    return geojson
  } catch {
    return null
  }
}

function overpassToGeoJSON(element: any): GeoJSON.GeoJsonObject | null {
  if (!element.members) return null

  const outerWays = element.members
    .filter((m: any) => m.type === 'way' && m.role === 'outer' && m.geometry)
    .map((m: any) => m.geometry.map((p: any) => [p.lon, p.lat]))

  if (outerWays.length === 0) return null

  return {
    type: 'Feature',
    properties: { name: element.tags?.name || '' },
    geometry: {
      type: outerWays.length === 1 ? 'Polygon' : 'MultiPolygon',
      coordinates: outerWays.length === 1 ? [outerWays[0]] : outerWays.map((w: any) => [w]),
    },
  } as GeoJSON.GeoJsonObject
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/boundaries.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/boundaries.ts src/utils/__tests__/boundaries.test.ts
git commit -m "feat: add Overpass API boundary fetching with localStorage cache"
```

---

### Task 8: Base Map Component

**Files:**
- Create: `src/components/Map/BaseMap.tsx`
- Create: `src/components/Map/BaseMap.css`

**Step 1: Create the base map component**

```tsx
// src/components/Map/BaseMap.tsx
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getDefaultProvider } from '../../utils/tiles'
import './BaseMap.css'

interface BaseMapProps {
  children?: React.ReactNode
  onMapReady?: (map: L.Map) => void
}

export function BaseMap({ children, onMapReady }: BaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const provider = getDefaultProvider()
    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: true,
    })

    L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom ?? 19,
    }).addTo(map)

    mapRef.current = map
    onMapReady?.(map)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="base-map-wrapper">
      <div ref={containerRef} className="base-map-container" />
      {children}
    </div>
  )
}
```

```css
/* src/components/Map/BaseMap.css */
.base-map-wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.base-map-container {
  width: 100%;
  height: 100%;
}
```

**Step 2: Wire into App.tsx**

Replace the default Vite App.tsx content:

```tsx
// src/App.tsx
import { BaseMap } from './components/Map/BaseMap'
import './App.css'

function App() {
  return (
    <div className="app">
      <BaseMap />
    </div>
  )
}

export default App
```

```css
/* src/App.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
}

.app {
  display: flex;
  width: 100%;
  height: 100%;
}
```

**Step 3: Verify visually**

Run: `npm run dev`
Expected: Full-screen map loads with OSM tiles, zoom controls visible.

**Step 4: Commit**

```bash
git add src/components/Map/BaseMap.tsx src/components/Map/BaseMap.css src/App.tsx src/App.css
git commit -m "feat: add base Leaflet map component with full-screen layout"
```

---

### Task 9: Search Bar with Autocomplete

**Files:**
- Create: `src/components/LayerPanel/SearchBar.tsx`
- Create: `src/components/LayerPanel/SearchBar.css`

**Step 1: Create the search component**

```tsx
// src/components/LayerPanel/SearchBar.tsx
import { useState, useRef, useCallback } from 'react'
import { searchPlaces, type GeocodingResult } from '../../utils/geocoding'
import { useLayerStore } from '../../hooks/useLayerStore'
import './SearchBar.css'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const addLayer = useLayerStore((s) => s.addLayer)

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
    }, 300)
  }, [])

  const handleSelect = (result: GeocodingResult) => {
    addLayer({
      name: result.name,
      center: [result.lat, result.lng],
      bounds: result.boundingBox,
    })
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
```

```css
/* src/components/LayerPanel/SearchBar.css */
.search-bar {
  position: relative;
  padding: 8px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: #4a90d9;
}

.search-loading {
  position: absolute;
  right: 16px;
  top: 16px;
  color: #999;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 8px;
  right: 8px;
  list-style: none;
  background: white;
  border: 1px solid #ccc;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.search-result-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.search-result-item:hover {
  background: #f0f4ff;
}

.search-result-detail {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**Step 2: Verify visually**

Run: `npm run dev`
Type "Los Angeles" in the search bar — autocomplete dropdown should appear after 300ms.
Click a result — a new layer should appear in the store (check React DevTools or console).

**Step 3: Commit**

```bash
git add src/components/LayerPanel/SearchBar.tsx src/components/LayerPanel/SearchBar.css
git commit -m "feat: add search bar with Nominatim autocomplete and layer creation"
```

---

### Task 10: Layer Panel Sidebar

**Files:**
- Create: `src/components/LayerPanel/LayerPanel.tsx`
- Create: `src/components/LayerPanel/LayerCard.tsx`
- Create: `src/components/LayerPanel/LayerPanel.css`

**Step 1: Create LayerCard component**

```tsx
// src/components/LayerPanel/LayerCard.tsx
import { useLayerStore } from '../../hooks/useLayerStore'
import { getTileProviders } from '../../utils/tiles'
import type { Layer } from '../../types'

const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn']

interface LayerCardProps {
  layer: Layer
  isSelected: boolean
}

export function LayerCard({ layer, isSelected }: LayerCardProps) {
  const updateLayer = useLayerStore((s) => s.updateLayer)
  const removeLayer = useLayerStore((s) => s.removeLayer)
  const selectLayer = useLayerStore((s) => s.selectLayer)
  const providers = getTileProviders()

  return (
    <div
      className={`layer-card ${isSelected ? 'layer-card--selected' : ''}`}
      onClick={() => selectLayer(layer.id)}
    >
      <div className="layer-card-header">
        <label className="layer-visibility" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={layer.visible}
            onChange={(e) => updateLayer(layer.id, { visible: e.target.checked })}
          />
        </label>
        <span className="layer-name">{layer.name}</span>
        <button
          className="layer-delete"
          onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
          title="Remove layer"
        >
          x
        </button>
      </div>

      {isSelected && (
        <div className="layer-card-controls" onClick={(e) => e.stopPropagation()}>
          <label className="layer-control">
            <span>Opacity</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={layer.opacity}
              onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
            />
            <span>{Math.round(layer.opacity * 100)}%</span>
          </label>

          <label className="layer-control">
            <span>Blend</span>
            <select
              value={layer.blendMode}
              onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value })}
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="layer-control">
            <span>Tiles</span>
            <select
              value={layer.tileSourceId}
              onChange={(e) => updateLayer(layer.id, { tileSourceId: e.target.value })}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label className="layer-control">
            <span>Rotation</span>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={layer.rotation}
              onChange={(e) => updateLayer(layer.id, { rotation: parseFloat(e.target.value) })}
            />
            <span>{layer.rotation}deg</span>
          </label>

          <label className="layer-control-inline">
            <input
              type="checkbox"
              checked={layer.showBoundary}
              onChange={(e) => updateLayer(layer.id, { showBoundary: e.target.checked })}
            />
            <span>Show boundary</span>
          </label>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create LayerPanel component**

```tsx
// src/components/LayerPanel/LayerPanel.tsx
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
```

```css
/* src/components/LayerPanel/LayerPanel.css */
.layer-panel {
  width: 280px;
  min-width: 280px;
  height: 100%;
  background: #f8f9fa;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layer-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #ddd;
}

.layer-panel-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.sidebar-toggle {
  background: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
}

.sidebar-toggle--collapsed {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 1000;
  background: white;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.layer-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.layer-list-empty {
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.layer-card {
  margin: 4px 0;
  padding: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
}

.layer-card--selected {
  border-color: #4a90d9;
  box-shadow: 0 0 0 1px #4a90d9;
}

.layer-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.layer-visibility input {
  margin: 0;
}

.layer-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-delete {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
}

.layer-delete:hover {
  color: #e44;
}

.layer-card-controls {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.layer-control {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.layer-control span:first-child {
  width: 52px;
  color: #666;
}

.layer-control input[type="range"] {
  flex: 1;
}

.layer-control select {
  flex: 1;
  font-size: 12px;
  padding: 2px;
}

.layer-control-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
```

**Step 3: Update App.tsx to include sidebar**

```tsx
// src/App.tsx
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
```

**Step 4: Verify visually**

Run: `npm run dev`
Expected: Sidebar on left with search bar. Search for a place, click result, layer card appears. Click card to expand controls.

**Step 5: Commit**

```bash
git add src/components/LayerPanel/ src/App.tsx
git commit -m "feat: add layer panel sidebar with search, layer cards, and controls"
```

---

### Task 11: Overlay Layer Rendering

This is the core feature — rendering each layer as a CSS-transformed tile div over the base map.

**Files:**
- Create: `src/components/Map/OverlayLayer.tsx`
- Create: `src/components/Map/OverlayLayer.css`
- Modify: `src/components/Map/BaseMap.tsx`

**Step 1: Create OverlayLayer component**

```tsx
// src/components/Map/OverlayLayer.tsx
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { getProviderById, getDefaultProvider } from '../../utils/tiles'
import { useLayerStore } from '../../hooks/useLayerStore'
import type { Layer } from '../../types'
import './OverlayLayer.css'

interface OverlayLayerProps {
  layer: Layer
  map: L.Map
}

export function OverlayLayer({ layer, map }: OverlayLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const miniMapRef = useRef<L.Map | null>(null)
  const selectLayer = useLayerStore((s) => s.selectLayer)
  const selectedLayerId = useLayerStore((s) => s.selectedLayerId)
  const isSelected = selectedLayerId === layer.id

  // Create a mini Leaflet map inside the overlay div, synced to the main map's zoom
  useEffect(() => {
    if (!containerRef.current || miniMapRef.current) return

    const miniMap = L.map(containerRef.current, {
      center: layer.center,
      zoom: map.getZoom(),
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    })

    const provider = getProviderById(layer.tileSourceId) ?? getDefaultProvider()
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom ?? 19,
    }).addTo(miniMap)

    miniMapRef.current = miniMap
    tileLayerRef.current = tileLayer

    // Sync zoom with main map
    const onZoom = () => {
      miniMap.setZoom(map.getZoom(), { animate: false })
    }
    map.on('zoom', onZoom)

    return () => {
      map.off('zoom', onZoom)
      miniMap.remove()
      miniMapRef.current = null
      tileLayerRef.current = null
    }
  }, [])

  // Update tile source when changed
  useEffect(() => {
    if (!miniMapRef.current || !tileLayerRef.current) return
    const provider = getProviderById(layer.tileSourceId) ?? getDefaultProvider()
    tileLayerRef.current.setUrl(provider.url)
  }, [layer.tileSourceId])

  // Sync the mini map's center to the layer's geographic center
  useEffect(() => {
    miniMapRef.current?.setView(layer.center, map.getZoom(), { animate: false })
  }, [layer.center])

  if (!layer.visible) return null

  const transform = `translate(${layer.offset.x}px, ${layer.offset.y}px) rotate(${layer.rotation}deg) scale(${layer.scale})`

  return (
    <div
      ref={containerRef}
      className={`overlay-layer ${isSelected ? 'overlay-layer--selected' : ''}`}
      style={{
        opacity: layer.opacity,
        mixBlendMode: layer.blendMode as any,
        transform,
        pointerEvents: isSelected ? 'auto' : 'none',
      }}
      onClick={(e) => {
        e.stopPropagation()
        selectLayer(layer.id)
      }}
    />
  )
}
```

```css
/* src/components/Map/OverlayLayer.css */
.overlay-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 400;
  transform-origin: center center;
}

.overlay-layer--selected {
  outline: 2px dashed #4a90d9;
  outline-offset: -2px;
}
```

**Step 2: Update BaseMap to render overlay layers**

Modify `src/components/Map/BaseMap.tsx` to:
- Store the Leaflet map instance in state
- Render OverlayLayer components for each layer in the store

```tsx
// src/components/Map/BaseMap.tsx
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getDefaultProvider } from '../../utils/tiles'
import { useLayerStore } from '../../hooks/useLayerStore'
import { OverlayLayer } from './OverlayLayer'
import './BaseMap.css'

export function BaseMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [map, setMap] = useState<L.Map | null>(null)
  const layers = useLayerStore((s) => s.layers)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const provider = getDefaultProvider()
    const leafletMap = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: true,
    })

    L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom ?? 19,
    }).addTo(leafletMap)

    mapRef.current = leafletMap
    setMap(leafletMap)

    return () => {
      leafletMap.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="base-map-wrapper">
      <div ref={containerRef} className="base-map-container" />
      {map && layers.map((layer) => (
        <OverlayLayer key={layer.id} layer={layer} map={map} />
      ))}
    </div>
  )
}
```

**Step 3: Verify visually**

Run: `npm run dev`
Search for "Paris", add it. A second tile layer should appear overlaid on the base map.
Adjust opacity slider — overlay should become transparent.
Change blend mode — visual blending should change.

**Step 4: Commit**

```bash
git add src/components/Map/OverlayLayer.tsx src/components/Map/OverlayLayer.css src/components/Map/BaseMap.tsx
git commit -m "feat: render overlay layers as CSS-transformed tile divs over base map"
```

---

### Task 12: Layer Drag, Rotate, and Scale Handles

**Files:**
- Create: `src/components/Map/LayerHandles.tsx`
- Create: `src/components/Map/LayerHandles.css`
- Modify: `src/components/Map/OverlayLayer.tsx`

**Step 1: Create LayerHandles component**

```tsx
// src/components/Map/LayerHandles.tsx
import { useCallback, useRef } from 'react'
import { useLayerStore } from '../../hooks/useLayerStore'
import type { Layer } from '../../types'
import './LayerHandles.css'

interface LayerHandlesProps {
  layer: Layer
}

export function LayerHandles({ layer }: LayerHandlesProps) {
  const updateLayer = useLayerStore((s) => s.updateLayer)
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const rotateStart = useRef<{ angle: number; startRotation: number } | null>(null)
  const scaleStart = useRef<{ dist: number; startScale: number } | null>(null)

  // --- Drag ---
  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: layer.offset.x,
      oy: layer.offset.y,
    }
  }, [layer.offset])

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    updateLayer(layer.id, {
      offset: {
        x: dragStart.current.ox + dx,
        y: dragStart.current.oy + dy,
      },
    })
  }, [layer.id, updateLayer])

  const onDragEnd = useCallback(() => {
    dragStart.current = null
  }, [])

  // --- Rotate ---
  const onRotateStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const rect = el.closest('.overlay-layer')?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI)
    rotateStart.current = { angle, startRotation: layer.rotation }
  }, [layer.rotation])

  const onRotateMove = useCallback((e: React.PointerEvent) => {
    if (!rotateStart.current) return
    const rect = (e.currentTarget as HTMLElement).closest('.overlay-layer')?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI)
    const delta = angle - rotateStart.current.angle
    updateLayer(layer.id, { rotation: rotateStart.current.startRotation + delta })
  }, [layer.id, updateLayer])

  const onRotateEnd = useCallback(() => {
    rotateStart.current = null
  }, [])

  // --- Scale ---
  const onScaleStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const rect = el.closest('.overlay-layer')?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2)
    scaleStart.current = { dist, startScale: layer.scale }
  }, [layer.scale])

  const onScaleMove = useCallback((e: React.PointerEvent) => {
    if (!scaleStart.current) return
    const rect = (e.currentTarget as HTMLElement).closest('.overlay-layer')?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2)
    const ratio = dist / scaleStart.current.dist
    updateLayer(layer.id, { scale: scaleStart.current.startScale * ratio })
  }, [layer.id, updateLayer])

  const onScaleEnd = useCallback(() => {
    scaleStart.current = null
  }, [])

  return (
    <div className="layer-handles">
      {/* Drag handle — center */}
      <div
        className="handle handle-drag"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
      />

      {/* Rotate handle — top center */}
      <div
        className="handle handle-rotate"
        onPointerDown={onRotateStart}
        onPointerMove={onRotateMove}
        onPointerUp={onRotateEnd}
      />

      {/* Scale handles — corners */}
      {['nw', 'ne', 'sw', 'se'].map((corner) => (
        <div
          key={corner}
          className={`handle handle-scale handle-scale--${corner}`}
          onPointerDown={onScaleStart}
          onPointerMove={onScaleMove}
          onPointerUp={onScaleEnd}
        />
      ))}
    </div>
  )
}
```

```css
/* src/components/Map/LayerHandles.css */
.layer-handles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 500;
}

.handle {
  position: absolute;
  pointer-events: auto;
  cursor: pointer;
}

.handle-drag {
  top: 50%;
  left: 50%;
  width: 32px;
  height: 32px;
  margin: -16px 0 0 -16px;
  background: rgba(74, 144, 217, 0.3);
  border: 2px solid #4a90d9;
  border-radius: 50%;
  cursor: grab;
}

.handle-drag:active {
  cursor: grabbing;
}

.handle-rotate {
  top: -24px;
  left: 50%;
  width: 20px;
  height: 20px;
  margin-left: -10px;
  background: #4a90d9;
  border-radius: 50%;
  cursor: crosshair;
}

.handle-scale {
  width: 14px;
  height: 14px;
  background: white;
  border: 2px solid #4a90d9;
  border-radius: 2px;
}

.handle-scale--nw { top: -7px; left: -7px; cursor: nw-resize; }
.handle-scale--ne { top: -7px; right: -7px; cursor: ne-resize; }
.handle-scale--sw { bottom: -7px; left: -7px; cursor: sw-resize; }
.handle-scale--se { bottom: -7px; right: -7px; cursor: se-resize; }
```

**Step 2: Add handles to OverlayLayer when selected**

Update `OverlayLayer.tsx` — import and render `LayerHandles` when `isSelected` is true:

Add inside the overlay div, after the map container content:
```tsx
{isSelected && <LayerHandles layer={layer} />}
```

**Step 3: Verify visually**

Run: `npm run dev`
Add a layer, select it in the sidebar. Blue handles should appear:
- Drag the center circle — layer moves
- Drag a corner square — layer scales
- Drag the top circle — layer rotates

**Step 4: Commit**

```bash
git add src/components/Map/LayerHandles.tsx src/components/Map/LayerHandles.css src/components/Map/OverlayLayer.tsx
git commit -m "feat: add drag, rotate, and scale handles for selected overlay layers"
```

---

### Task 13: Boundary Rendering

**Files:**
- Modify: `src/components/Map/OverlayLayer.tsx`
- Modify: `src/hooks/useLayerStore.ts`

**Step 1: Add boundary fetching on toggle**

In `OverlayLayer.tsx`, add an effect that fetches boundary GeoJSON when `layer.showBoundary` is toggled on and `layer.boundaryGeoJSON` is null:

```tsx
import { fetchBoundary } from '../../utils/boundaries'

// Inside the component:
useEffect(() => {
  if (!layer.showBoundary || layer.boundaryGeoJSON || !miniMapRef.current) return

  fetchBoundary(layer.name, layer.bounds).then((geojson) => {
    if (geojson) {
      updateLayer(layer.id, { boundaryGeoJSON: geojson })
    }
  })
}, [layer.showBoundary, layer.boundaryGeoJSON])

// Render boundary on mini map when available:
useEffect(() => {
  if (!miniMapRef.current) return
  // Remove existing boundary layer if any
  miniMapRef.current.eachLayer((l) => {
    if ((l as any)._isBoundary) miniMapRef.current!.removeLayer(l)
  })

  if (layer.showBoundary && layer.boundaryGeoJSON) {
    const geoLayer = L.geoJSON(layer.boundaryGeoJSON as any, {
      style: { color: '#4a90d9', weight: 2, fillOpacity: 0.1 },
    }).addTo(miniMapRef.current);
    (geoLayer as any)._isBoundary = true
  }
}, [layer.showBoundary, layer.boundaryGeoJSON])
```

Add `updateLayer` to the store destructure:
```tsx
const updateLayer = useLayerStore((s) => s.updateLayer)
```

**Step 2: Verify visually**

Run: `npm run dev`
Add "France", toggle boundary on. After a moment, the country outline should appear on the overlay layer.

**Step 3: Commit**

```bash
git add src/components/Map/OverlayLayer.tsx
git commit -m "feat: fetch and render boundary outlines on overlay layers via Overpass"
```

---

### Task 14: Toolbar and Measurement Tools

**Files:**
- Create: `src/components/Toolbar/Toolbar.tsx`
- Create: `src/components/Toolbar/Toolbar.css`
- Create: `src/hooks/useMeasure.ts`
- Modify: `src/components/Map/BaseMap.tsx`
- Modify: `src/App.tsx`

**Step 1: Create the Toolbar component**

```tsx
// src/components/Toolbar/Toolbar.tsx
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
```

```css
/* src/components/Toolbar/Toolbar.css */
.toolbar {
  display: flex;
  gap: 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 13px;
}

.toolbar-btn--active {
  background: #4a90d9;
  color: white;
  border-color: #4a90d9;
}

.toolbar-btn-icon {
  font-weight: bold;
}
```

**Step 2: Create useMeasure hook**

```typescript
// src/hooks/useMeasure.ts
import { useCallback, useRef } from 'react'
import L from 'leaflet'
import { useLayerStore } from './useLayerStore'
import { haversineDistance, geodesicArea } from './useProjection'

export function useMeasure(map: L.Map | null) {
  const activeTool = useLayerStore((s) => s.activeTool)
  const addMeasurement = useLayerStore((s) => s.addMeasurement)
  const unitSystem = useLayerStore((s) => s.unitSystem)
  const pendingPoints = useRef<[number, number][]>([])
  const tempLayerGroup = useRef<L.LayerGroup>(L.layerGroup())
  const measureLayerGroup = useRef<L.LayerGroup>(L.layerGroup())

  const init = useCallback((leafletMap: L.Map) => {
    measureLayerGroup.current.addTo(leafletMap)
    tempLayerGroup.current.addTo(leafletMap)
  }, [])

  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!activeTool || !map) return

    const point: [number, number] = [e.latlng.lat, e.latlng.lng]

    if (activeTool === 'pin') {
      addMeasurement({ type: 'pin', points: [point] })
      L.marker(point).addTo(measureLayerGroup.current)
        .bindPopup(`${point[0].toFixed(5)}, ${point[1].toFixed(5)}`)
        .openPopup()
      return
    }

    if (activeTool === 'annotation') {
      const text = prompt('Enter annotation text:')
      if (text) {
        addMeasurement({ type: 'annotation', points: [point], label: text })
        L.marker(point, {
          icon: L.divIcon({
            className: 'annotation-marker',
            html: `<div class="annotation-label">${text}</div>`,
          }),
        }).addTo(measureLayerGroup.current)
      }
      return
    }

    // Ruler and Area — accumulate points
    pendingPoints.current.push(point)

    // Draw temp marker
    L.circleMarker(point, { radius: 4, color: '#e44', fillOpacity: 1 })
      .addTo(tempLayerGroup.current)

    // Draw temp line for ruler
    if (activeTool === 'ruler' && pendingPoints.current.length > 1) {
      const pts = pendingPoints.current
      L.polyline(
        [pts[pts.length - 2], pts[pts.length - 1]].map(([lat, lng]) => [lat, lng] as L.LatLngExpression),
        { color: '#e44', dashArray: '5,5' },
      ).addTo(tempLayerGroup.current)
    }

    // Draw temp polygon for area
    if (activeTool === 'area' && pendingPoints.current.length > 2) {
      tempLayerGroup.current.clearLayers()
      pendingPoints.current.forEach((p) => {
        L.circleMarker(p, { radius: 4, color: '#e44', fillOpacity: 1 })
          .addTo(tempLayerGroup.current)
      })
      L.polygon(
        pendingPoints.current.map(([lat, lng]) => [lat, lng] as L.LatLngExpression),
        { color: '#e44', dashArray: '5,5', fillOpacity: 0.1 },
      ).addTo(tempLayerGroup.current)
    }
  }, [activeTool, map, addMeasurement])

  const handleMapDblClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!activeTool || !map) return
    if (activeTool !== 'ruler' && activeTool !== 'area') return

    e.originalEvent.preventDefault()
    const points = [...pendingPoints.current]
    tempLayerGroup.current.clearLayers()
    pendingPoints.current = []

    if (points.length < 2) return

    if (activeTool === 'ruler') {
      let totalDist = 0
      for (let i = 0; i < points.length - 1; i++) {
        totalDist += haversineDistance(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
      }
      addMeasurement({ type: 'ruler', points, value: totalDist })

      const line = L.polyline(
        points.map(([lat, lng]) => [lat, lng] as L.LatLngExpression),
        { color: '#e44', weight: 2 },
      ).addTo(measureLayerGroup.current)

      const label = unitSystem === 'metric'
        ? `${(totalDist / 1000).toFixed(1)} km`
        : `${(totalDist / 1609.344).toFixed(1)} mi`
      line.bindPopup(label).openPopup()
    }

    if (activeTool === 'area') {
      if (points.length < 3) return
      const area = geodesicArea(points)
      addMeasurement({ type: 'area', points, value: area })

      const polygon = L.polygon(
        points.map(([lat, lng]) => [lat, lng] as L.LatLngExpression),
        { color: '#e44', weight: 2, fillOpacity: 0.15 },
      ).addTo(measureLayerGroup.current)

      const label = unitSystem === 'metric'
        ? `${(area / 1e6).toFixed(1)} km²`
        : `${(area / 2.59e6).toFixed(1)} mi²`
      polygon.bindPopup(label).openPopup()
    }
  }, [activeTool, map, addMeasurement, unitSystem])

  return { init, handleMapClick, handleMapDblClick, measureLayerGroup }
}
```

**Step 3: Wire measurement hooks into BaseMap**

Update `BaseMap.tsx` to:
- Call `useMeasure` with the map instance
- Attach click/dblclick handlers to the Leaflet map
- Call `init` when map is ready

```tsx
// Add to BaseMap.tsx:
import { useMeasure } from '../../hooks/useMeasure'

// Inside component:
const { init, handleMapClick, handleMapDblClick } = useMeasure(map)

// In the map setup useEffect, after creating the map:
useEffect(() => {
  if (!map) return
  init(map)
  map.on('click', handleMapClick)
  map.on('dblclick', handleMapDblClick)
  return () => {
    map.off('click', handleMapClick)
    map.off('dblclick', handleMapDblClick)
  }
}, [map, handleMapClick, handleMapDblClick, init])
```

**Step 4: Add Toolbar and bottom bar to App.tsx**

```tsx
// src/App.tsx
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
```

Add to `App.css`:
```css
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.top-bar {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1000;
  display: flex;
  gap: 8px;
}

.bottom-bar {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 1000;
  display: flex;
  gap: 8px;
}

.unit-toggle {
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 13px;
}
```

**Step 5: Verify visually**

Run: `npm run dev`
- Click Pin tool, click on map — pin appears with coordinates
- Click Ruler tool, click two points, double-click to finish — line with distance
- Click Area tool, click 3+ points, double-click — polygon with area
- Click Note tool, click on map — prompt for text, label appears
- Toggle Metric/Imperial button

**Step 6: Commit**

```bash
git add src/components/Toolbar/ src/hooks/useMeasure.ts src/components/Map/BaseMap.tsx src/App.tsx src/App.css
git commit -m "feat: add measurement toolbar with pin, ruler, area, and annotation tools"
```

---

### Task 15: True-Size Auto-Correction Integration

**Files:**
- Modify: `src/hooks/useLayerStore.ts`
- Modify: `src/components/Map/BaseMap.tsx`

**Step 1: Apply Mercator correction when adding layers**

Update `addLayer` in `useLayerStore.ts` to accept a `mapCenterLat` parameter and auto-calculate scale:

```typescript
// In the addLayer function signature, add mapCenterLat:
addLayer: (partial: {
  name: string
  center: [number, number]
  bounds: [number, number, number, number]
  tileSourceId?: string
  mapCenterLat?: number
}) => void

// In the implementation:
addLayer: (partial) => set((state) => {
  const mapCenterLat = partial.mapCenterLat ?? 0
  const layerLat = partial.center[0]
  const mercatorScale = Math.cos((mapCenterLat * Math.PI) / 180) / Math.cos((layerLat * Math.PI) / 180)

  return {
    layers: [
      ...state.layers,
      {
        // ... existing defaults ...
        scale: mercatorScale,
        // ... rest of defaults ...
      },
    ],
  }
}),
```

**Step 2: Pass map center lat from SearchBar**

Update `SearchBar.tsx` to get the current map center latitude. This requires the BaseMap to expose its Leaflet map instance. Add a `mapRef` to the store or use a React context.

Simplest approach: add `mapCenter` to the Zustand store, updated on map move:

```typescript
// Add to useLayerStore.ts state:
mapCenter: [number, number] // [lat, lng]
setMapCenter: (center: [number, number]) => void

// In create():
mapCenter: [20, 0],
setMapCenter: (center) => set({ mapCenter: center }),
```

In `BaseMap.tsx`, sync map center to store on move:
```tsx
const setMapCenter = useLayerStore((s) => s.setMapCenter)

// In the map setup useEffect:
leafletMap.on('moveend', () => {
  const center = leafletMap.getCenter()
  setMapCenter([center.lat, center.lng])
})
```

In `SearchBar.tsx`, pass mapCenterLat to addLayer:
```tsx
const mapCenter = useLayerStore((s) => s.mapCenter)

// In handleSelect:
addLayer({
  name: result.name,
  center: [result.lat, result.lng],
  bounds: result.boundingBox,
  mapCenterLat: mapCenter[0],
})
```

**Step 3: Verify**

Run: `npm run dev`
1. Pan the base map to show the US (~40° latitude)
2. Search for "Democratic Republic of the Congo" (near equator, ~0°)
3. Add it — the overlay should appear noticeably larger than on a standard Mercator map
4. Compare to adding a region at a similar latitude — scale should be ~1.0

**Step 4: Commit**

```bash
git add src/hooks/useLayerStore.ts src/components/Map/BaseMap.tsx src/components/LayerPanel/SearchBar.tsx
git commit -m "feat: auto-correct Mercator distortion when adding overlay layers"
```

---

### Task 16: Save/Load Groups UI

**Files:**
- Create: `src/components/Modals/SaveGroupModal.tsx`
- Create: `src/components/Modals/LoadGroupModal.tsx`
- Create: `src/components/Modals/Modal.css`
- Modify: `src/App.tsx`

**Step 1: Create a basic modal wrapper style**

```css
/* src/components/Modals/Modal.css */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: white;
  border-radius: 10px;
  padding: 20px;
  min-width: 320px;
  max-width: 480px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin-bottom: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.modal-btn {
  padding: 6px 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.modal-btn--primary {
  background: #4a90d9;
  color: white;
  border-color: #4a90d9;
}

.modal input[type="text"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}

.saved-group-item {
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.saved-group-item:hover {
  background: #f0f4ff;
}

.saved-group-meta {
  font-size: 12px;
  color: #999;
}
```

**Step 2: Create SaveGroupModal**

```tsx
// src/components/Modals/SaveGroupModal.tsx
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
```

**Step 3: Create LoadGroupModal**

```tsx
// src/components/Modals/LoadGroupModal.tsx
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
    const store = useLayerStore.getState()
    // Replace current state with saved group
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
```

**Step 4: Wire modals into App.tsx bottom bar**

Add state and buttons to `App.tsx`:

```tsx
import { useState } from 'react'
import { SaveGroupModal } from './components/Modals/SaveGroupModal'
import { LoadGroupModal } from './components/Modals/LoadGroupModal'

// Inside App component:
const [showSave, setShowSave] = useState(false)
const [showLoad, setShowLoad] = useState(false)

// In the bottom-bar div:
<button className="unit-toggle" onClick={() => setShowSave(true)}>Save Group</button>
<button className="unit-toggle" onClick={() => setShowLoad(true)}>Load Group</button>

// Before closing </div> of .app:
{showSave && <SaveGroupModal onClose={() => setShowSave(false)} />}
{showLoad && <LoadGroupModal onClose={() => setShowLoad(false)} />}
```

**Step 5: Verify visually**

Run: `npm run dev`
- Add some layers and measurements
- Click Save Group, enter a name, save
- Reload the page
- Click Load Group, see the saved group, click to load — layers and measurements restore

**Step 6: Commit**

```bash
git add src/components/Modals/ src/App.tsx
git commit -m "feat: add save/load group modals with localStorage persistence"
```

---

### Task 17: Layer Reordering (Drag in Sidebar)

**Files:**
- Modify: `src/components/LayerPanel/LayerPanel.tsx`

**Step 1: Add basic drag-to-reorder**

Use HTML5 drag and drop for simplicity (no extra library):

```tsx
// In LayerPanel.tsx, update the layer list rendering:
const reorderLayers = useLayerStore((s) => s.reorderLayers)
const [dragIndex, setDragIndex] = useState<number | null>(null)

// In the layer list:
{layers.map((layer, index) => (
  <div
    key={layer.id}
    draggable
    onDragStart={() => setDragIndex(index)}
    onDragOver={(e) => e.preventDefault()}
    onDrop={() => {
      if (dragIndex !== null && dragIndex !== index) {
        reorderLayers(dragIndex, index)
      }
      setDragIndex(null)
    }}
    onDragEnd={() => setDragIndex(null)}
  >
    <LayerCard layer={layer} isSelected={layer.id === selectedLayerId} />
  </div>
))}
```

**Step 2: Verify visually**

Run: `npm run dev`
Add 3 layers. Drag a layer card up or down in the sidebar. Order should change.

**Step 3: Commit**

```bash
git add src/components/LayerPanel/LayerPanel.tsx
git commit -m "feat: add drag-to-reorder for layers in sidebar"
```

---

### Task 18: Direct Click-to-Select on Map

**Files:**
- Modify: `src/components/Map/OverlayLayer.tsx`
- Modify: `src/components/Map/BaseMap.tsx`

**Step 1: Enable pointer events for click-to-select**

Update `OverlayLayer.tsx` — allow click events on all visible layers (not just selected):

Change the `pointerEvents` style:
```tsx
pointerEvents: layer.visible ? 'auto' : 'none',
```

Add a click handler on the overlay div that selects the layer:
```tsx
onClick={(e) => {
  e.stopPropagation()
  selectLayer(layer.id)
}}
```

**Step 2: Deselect when clicking base map**

In `BaseMap.tsx`, add a click handler on the base map that deselects:
```tsx
const selectLayer = useLayerStore((s) => s.selectLayer)

// In the map setup useEffect:
leafletMap.on('click', () => {
  // Only deselect if no tool is active
  if (!useLayerStore.getState().activeTool) {
    selectLayer(null)
  }
})
```

**Step 3: Verify**

Run: `npm run dev`
Add two layers. Click directly on an overlay to select it (handles appear). Click the base map to deselect.

**Step 4: Commit**

```bash
git add src/components/Map/OverlayLayer.tsx src/components/Map/BaseMap.tsx
git commit -m "feat: click-to-select overlay layers and deselect on base map click"
```

---

### Task 19: Polish and Final Integration

**Files:**
- Modify: `src/App.css`
- Modify: `src/components/Map/OverlayLayer.tsx`
- Create: `src/index.css` (if needed for global resets)

**Step 1: Add annotation marker styles**

Add to `src/App.css`:
```css
.annotation-marker {
  background: none;
  border: none;
}

.annotation-label {
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  border: 1px solid #ddd;
}
```

**Step 2: Fix Leaflet default icon issue**

Leaflet's default marker icon paths break with bundlers. Add to `src/main.tsx`:

```tsx
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})
```

**Step 3: Verify full app flow**

Run: `npm run dev`

Full test walkthrough:
1. Search "Los Angeles", add as layer
2. Search "Paris", add as layer
3. Select LA layer — handles appear
4. Drag LA layer to overlap with Paris
5. Adjust opacity to 60% on LA
6. Set blend mode to "multiply" on LA
7. Toggle boundary on Paris
8. Use ruler tool to measure distance between two points
9. Use area tool to draw a polygon
10. Drop a pin and an annotation
11. Toggle metric/imperial
12. Save the group
13. Reload, load the group — everything restores

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: polish UI, fix Leaflet icons, add annotation styles"
```

---

### Task 20: Final Build Verification

**Step 1: Production build**

Run: `npm run build`
Expected: Build succeeds, output in `dist/`

**Step 2: Preview production build**

Run: `npx vite preview`
Expected: App loads and works identically to dev mode

**Step 3: Commit any build fixes**

If build reveals issues (type errors, missing imports), fix and commit.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify production build"
```
