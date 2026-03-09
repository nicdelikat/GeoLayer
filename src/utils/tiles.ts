export interface TileProvider {
  id: string
  name: string
  url: string
  attribution: string
  maxZoom?: number
}

const providers: TileProvider[] = [
  {
    id: 'carto-light',
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  {
    id: 'carto-dark',
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  {
    id: 'osm',
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
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
