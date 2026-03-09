import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

// Country name → continent mapping
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // Africa
  'Algeria': 'africa', 'Angola': 'africa', 'Benin': 'africa', 'Botswana': 'africa',
  'Burkina Faso': 'africa', 'Burundi': 'africa', 'Cameroon': 'africa',
  'Central African Rep.': 'africa', 'Chad': 'africa', 'Congo': 'africa',
  'Côte d\'Ivoire': 'africa', 'Dem. Rep. Congo': 'africa', 'Djibouti': 'africa',
  'Egypt': 'africa', 'Eq. Guinea': 'africa', 'Eritrea': 'africa', 'eSwatini': 'africa',
  'Ethiopia': 'africa', 'Gabon': 'africa', 'Gambia': 'africa', 'Ghana': 'africa',
  'Guinea': 'africa', 'Guinea-Bissau': 'africa', 'Kenya': 'africa', 'Lesotho': 'africa',
  'Liberia': 'africa', 'Libya': 'africa', 'Mali': 'africa', 'Mauritania': 'africa',
  'Morocco': 'africa', 'Mozambique': 'africa', 'Malawi': 'africa', 'Namibia': 'africa',
  'Niger': 'africa', 'Nigeria': 'africa', 'Rwanda': 'africa', 'Senegal': 'africa',
  'Sierra Leone': 'africa', 'Somalia': 'africa', 'Somaliland': 'africa',
  'South Africa': 'africa', 'S. Sudan': 'africa', 'Sudan': 'africa', 'Tanzania': 'africa',
  'Togo': 'africa', 'Tunisia': 'africa', 'Uganda': 'africa', 'W. Sahara': 'africa',
  'Zambia': 'africa', 'Zimbabwe': 'africa', 'Madagascar': 'africa',

  // Europe
  'Albania': 'europe', 'Austria': 'europe', 'Belarus': 'europe', 'Belgium': 'europe',
  'Bosnia and Herz.': 'europe', 'Bulgaria': 'europe', 'Croatia': 'europe',
  'Czechia': 'europe', 'Denmark': 'europe', 'Estonia': 'europe', 'Finland': 'europe',
  'France': 'europe', 'Germany': 'europe', 'Greece': 'europe', 'Hungary': 'europe',
  'Iceland': 'europe', 'Ireland': 'europe', 'Italy': 'europe', 'Kosovo': 'europe',
  'Latvia': 'europe', 'Lithuania': 'europe', 'Luxembourg': 'europe',
  'Macedonia': 'europe', 'Moldova': 'europe', 'Montenegro': 'europe',
  'Netherlands': 'europe', 'Norway': 'europe', 'Poland': 'europe', 'Portugal': 'europe',
  'Romania': 'europe', 'Serbia': 'europe', 'Slovakia': 'europe', 'Slovenia': 'europe',
  'Spain': 'europe', 'Sweden': 'europe', 'Switzerland': 'europe', 'Ukraine': 'europe',
  'United Kingdom': 'europe', 'N. Cyprus': 'europe', 'Cyprus': 'europe',

  // Asia
  'Afghanistan': 'asia', 'Armenia': 'asia', 'Azerbaijan': 'asia',
  'Bangladesh': 'asia', 'Bhutan': 'asia', 'Brunei': 'asia', 'Cambodia': 'asia',
  'China': 'asia', 'Georgia': 'asia', 'India': 'asia', 'Indonesia': 'asia',
  'Iran': 'asia', 'Iraq': 'asia', 'Israel': 'asia', 'Japan': 'asia',
  'Jordan': 'asia', 'Kazakhstan': 'asia', 'Kuwait': 'asia', 'Kyrgyzstan': 'asia',
  'Laos': 'asia', 'Lebanon': 'asia', 'Malaysia': 'asia', 'Mongolia': 'asia',
  'Myanmar': 'asia', 'Nepal': 'asia', 'North Korea': 'asia', 'Oman': 'asia',
  'Pakistan': 'asia', 'Palestine': 'asia', 'Philippines': 'asia', 'Qatar': 'asia',
  'Russia': 'asia', 'Saudi Arabia': 'asia', 'South Korea': 'asia',
  'Sri Lanka': 'asia', 'Syria': 'asia', 'Taiwan': 'asia', 'Tajikistan': 'asia',
  'Thailand': 'asia', 'Timor-Leste': 'asia', 'Turkey': 'asia',
  'Turkmenistan': 'asia', 'United Arab Emirates': 'asia', 'Uzbekistan': 'asia',
  'Vietnam': 'asia', 'Yemen': 'asia',

  // North America
  'Canada': 'north america', 'United States of America': 'north america',
  'Mexico': 'north america', 'Guatemala': 'north america', 'Belize': 'north america',
  'Honduras': 'north america', 'El Salvador': 'north america',
  'Nicaragua': 'north america', 'Costa Rica': 'north america',
  'Panama': 'north america', 'Cuba': 'north america', 'Jamaica': 'north america',
  'Haiti': 'north america', 'Dominican Rep.': 'north america',
  'Puerto Rico': 'north america', 'Bahamas': 'north america',
  'Trinidad and Tobago': 'north america', 'Greenland': 'north america',

  // South America
  'Argentina': 'south america', 'Bolivia': 'south america', 'Brazil': 'south america',
  'Chile': 'south america', 'Colombia': 'south america', 'Ecuador': 'south america',
  'Guyana': 'south america', 'Paraguay': 'south america', 'Peru': 'south america',
  'Suriname': 'south america', 'Uruguay': 'south america', 'Venezuela': 'south america',
  'Falkland Is.': 'south america',

  // Oceania
  'Australia': 'oceania', 'New Zealand': 'oceania', 'Papua New Guinea': 'oceania',
  'New Caledonia': 'oceania', 'Solomon Is.': 'oceania', 'Vanuatu': 'oceania',
  'Fiji': 'oceania',

  // Antarctica
  'Antarctica': 'antarctica', 'Fr. S. Antarctic Lands': 'antarctica',
}

const CONTINENT_ALIASES: Record<string, string> = {
  'africa': 'africa',
  'europe': 'europe',
  'asia': 'asia',
  'north america': 'north america',
  'south america': 'south america',
  'australia': 'oceania',
  'oceania': 'oceania',
  'antarctica': 'antarctica',
}

let worldDataCache: any = null

async function loadWorldData(): Promise<any> {
  if (worldDataCache) return worldDataCache

  const response = await fetch(WORLD_TOPO_URL)
  if (!response.ok) return null

  const topo = await response.json() as Topology
  const countries = feature(topo, topo.objects.countries as any)
  worldDataCache = countries
  return countries
}

function resolveContinent(name: string): string | null {
  const key = name.toLowerCase().replace(/[^a-z ]/g, '').trim()
  return CONTINENT_ALIASES[key] ?? null
}

export async function getContinentBoundaryAsync(name: string): Promise<any | null> {
  const continent = resolveContinent(name)
  if (!continent) return null

  const world = await loadWorldData()
  if (!world) return null

  // Filter countries belonging to this continent
  const countryFeatures = world.features.filter((f: any) => {
    const countryName = f.properties?.name
    return COUNTRY_TO_CONTINENT[countryName] === continent
  })

  if (countryFeatures.length === 0) return null

  // Merge all country polygons into a single MultiPolygon
  const allCoords: any[] = []
  for (const f of countryFeatures) {
    if (f.geometry.type === 'Polygon') {
      allCoords.push(f.geometry.coordinates)
    } else if (f.geometry.type === 'MultiPolygon') {
      allCoords.push(...f.geometry.coordinates)
    }
  }

  return {
    type: 'Feature',
    properties: { name },
    geometry: {
      type: 'MultiPolygon',
      coordinates: allCoords,
    },
  }
}

// Synchronous fallback for backward compatibility (returns null, use async version)
export function getContinentBoundary(name: string): any | null {
  // Trigger async fetch in background for next time
  getContinentBoundaryAsync(name)
  return null
}
