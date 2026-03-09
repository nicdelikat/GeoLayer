# GeoLayer Design Document

## Overview

A web-based map overlay app for comparing geographic regions at true scale. Users add places as independent map layers, then drag, rotate, scale, and overlay them to visually compare cities, states, and continents. Solves the "true size" problem by auto-correcting Mercator distortion.

## Tech Stack

- **React + Vite** (TypeScript)
- **Leaflet** for map rendering
- **Zustand** for state management
- **Nominatim** (OSM) for geocoding
- **Overpass API** for boundary polygons
- No backend — fully client-side

## Architecture

```
src/
  components/
    Map/           — main Leaflet map canvas
    LayerPanel/    — sidebar: layer list, controls, search
    Toolbar/       — measurement tools, blend modes
    Modals/        — save/load dialogs
  hooks/
    useLayerStore  — Zustand store for all layer state
    useMeasure     — measurement tool logic
    useProjection  — Mercator distortion correction math
  utils/
    geocoding.ts   — Nominatim API wrapper
    boundaries.ts  — boundary polygon fetching (Overpass)
    tiles.ts       — tile provider configs
    storage.ts     — localStorage save/load
```

## Layer System

Each layer is an independent map region:

```typescript
interface Layer {
  id: string
  name: string
  center: [number, number]     // original geocoded center [lat, lng]
  bounds: LatLngBounds
  tileSource: TileProvider

  // Transform state
  offset: { x: number, y: number }
  rotation: number             // degrees
  scale: number                // 1.0 = true-size corrected
  opacity: number              // 0-1
  visible: boolean
  blendMode: string            // 'normal', 'multiply', 'screen', etc.

  // Optional
  showBoundary: boolean
  boundaryGeoJSON?: GeoJSON
}
```

**Rendering:** Each layer is a `<div>` with its own Leaflet tile layer, positioned absolutely over the main map canvas. CSS `transform: translate() rotate() scale()` handles manipulation. Blend modes via CSS `mix-blend-mode`.

**True-size correction:** `scale = cos(mainMapCenterLat) / cos(layerOriginLat)` compensates for Mercator distortion. User scaling multiplies on top.

**Interaction:** Panel selection (click sidebar) + direct manipulation (click on map, hit-test layers top-down). Selected layer gets corner scale handles and a top-center rotation grip.

## Tile Sources

Default to OpenStreetMap (no API key). Additional free providers:
- CartoDB (light/dark)
- Stadia Maps (Stamen styles)

User can switch tile source per layer.

## Measurement Tools

Toolbar with four tools:

- **Pin** — drop a pin, shows lat/lng tooltip
- **Ruler** — click points for distance (great-circle/haversine), chainable segments, double-click to finish
- **Area** — draw polygon, double-click to close, geodesic area calculation
- **Annotation** — place draggable text labels, attach to pins or standalone

```typescript
interface Measurement {
  id: string
  type: 'pin' | 'ruler' | 'area' | 'annotation'
  points: [number, number][]
  label?: string
  value?: number
  unit: 'metric' | 'imperial'
}
```

Global metric/imperial toggle affects all measurements.

## UI Layout

```
┌─────────────────────────────────────────────────┐
│  [Search: Add a place...]    [Toolbar: pin ruler area annotation] │
├──────────┬──────────────────────────────────────┤
│ LAYERS   │                                      │
│          │                                      │
│ ☑ LA     │         MAP CANVAS                   │
│   opacity│                                      │
│   blend  │    (layers with CSS transforms)      │
│          │                                      │
│ ☑ Paris  │                                      │
│   opacity│                                      │
│   blend  │                                      │
│          │                                      │
│ [+ Add]  │                                      │
│──────────│                                      │
│ SAVED    │                                      │
│ Group 1  │                                      │
├──────────┴──────────────────────────────────────┤
│  [Metric/Imperial]  [Save Group]  [Load Group]  │
└─────────────────────────────────────────────────┘
```

- **Left sidebar:** layer list (drag to reorder, visibility toggle, opacity slider, blend mode, rename, tile source, boundary toggle, delete). Collapsible saved groups section. Collapses on narrow screens.
- **Top bar:** search input with Nominatim autocomplete (debounced 300ms), measurement tool buttons.
- **Bottom bar:** metric/imperial toggle, save/load group buttons.

## Data Flow

1. User searches place → Nominatim autocomplete → select result
2. Geocoder returns lat/lng + bounding box
3. Optionally fetch boundary from Overpass API
4. Create Layer with true-size scale correction
5. Render tile layer in positioned div

Layer transforms are CSS-only during interaction; committed to Zustand store on end.

## Storage

```typescript
interface SavedGroup {
  id: string
  name: string
  createdAt: string
  layers: Layer[]
  measurements: Measurement[]
  mapView: { center: [number, number], zoom: number }
}
```

- Saved under `geolayer:groups` in localStorage
- Boundary GeoJSON cached under `geolayer:boundaries:{placeId}`
- No auto-load on startup; user picks or starts fresh

## v1 Scope

- Search and add places as layers
- Toggle visibility, adjust opacity per layer
- Drag, rotate, scale layers independently
- True-size auto-correction (Mercator compensation)
- Multiple tile sources (OSM default + free alternatives)
- Layer blend modes (normal, multiply, screen, etc.)
- Measurement tools (pins, rulers, area, annotations)
- Toggleable boundary outlines per layer
- Save/load groups to localStorage

## v2 (Future)

- Screenshot/export as image
- Keyboard shortcuts for layer manipulation
- Undo/redo
- Cloud accounts and URL sharing
- Mobile app (React Native)
