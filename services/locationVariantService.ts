/**
 * Location Variant Service
 * Manages location entities and generates location-based topic variants
 * for Local SEO scaling with query templates.
 */

import type {
  LocationEntity,
  QueryTemplate,
  ExpandedTemplateResult,
  EnrichedTopic,
  FreshnessProfile,
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../utils/helpers';

// =============================================================================
// LOCATION STORAGE (In-Memory for now, can be persisted to Supabase)
// =============================================================================

let locationStore: LocationEntity[] = [];

/**
 * Initialize location store with default data
 */
export function initializeLocationStore(locations: LocationEntity[]): void {
  locationStore = [...locations];
}

/**
 * Get all locations
 */
export function getAllLocations(): LocationEntity[] {
  return [...locationStore];
}

/**
 * Get locations by type
 */
export function getLocationsByType(type: LocationEntity['type']): LocationEntity[] {
  return locationStore.filter(l => l.type === type);
}

/**
 * Get locations for a specific region (parent)
 */
export function getLocationsForRegion(regionId: string): LocationEntity[] {
  return locationStore.filter(l => l.parent_location_id === regionId);
}

/**
 * Get location by ID
 */
export function getLocationById(id: string): LocationEntity | undefined {
  return locationStore.find(l => l.id === id);
}

/**
 * Add a new location
 */
export function addLocation(location: Omit<LocationEntity, 'id'>): LocationEntity {
  const newLocation: LocationEntity = {
    ...location,
    id: uuidv4(),
  };
  locationStore.push(newLocation);
  return newLocation;
}

/**
 * Add multiple locations
 */
export function addLocations(locations: Omit<LocationEntity, 'id'>[]): LocationEntity[] {
  return locations.map(addLocation);
}

/**
 * Update a location
 */
export function updateLocation(id: string, updates: Partial<LocationEntity>): LocationEntity | null {
  const index = locationStore.findIndex(l => l.id === id);
  if (index === -1) return null;

  locationStore[index] = { ...locationStore[index], ...updates };
  return locationStore[index];
}

/**
 * Remove a location
 */
export function removeLocation(id: string): boolean {
  const initialLength = locationStore.length;
  locationStore = locationStore.filter(l => l.id !== id);
  return locationStore.length < initialLength;
}

/**
 * Clear all locations
 */
export function clearLocations(): void {
  locationStore = [];
}

// =============================================================================
// LOCATION HIERARCHY
// =============================================================================

/**
 * Build location hierarchy tree
 */
export interface LocationTreeNode {
  location: LocationEntity;
  children: LocationTreeNode[];
}

export function buildLocationTree(locations: LocationEntity[]): LocationTreeNode[] {
  const rootNodes: LocationTreeNode[] = [];
  const nodeMap = new Map<string, LocationTreeNode>();

  // First pass: create nodes
  for (const location of locations) {
    nodeMap.set(location.id, { location, children: [] });
  }

  // Second pass: build hierarchy
  for (const location of locations) {
    const node = nodeMap.get(location.id)!;
    if (location.parent_location_id) {
      const parentNode = nodeMap.get(location.parent_location_id);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  }

  return rootNodes;
}

/**
 * Flatten tree back to array (depth-first)
 */
export function flattenLocationTree(nodes: LocationTreeNode[]): LocationEntity[] {
  const result: LocationEntity[] = [];

  function traverse(node: LocationTreeNode): void {
    result.push(node.location);
    node.children.forEach(traverse);
  }

  nodes.forEach(traverse);
  return result;
}

/**
 * Get ancestors of a location
 */
export function getLocationAncestors(locationId: string): LocationEntity[] {
  const ancestors: LocationEntity[] = [];
  let current = getLocationById(locationId);

  while (current?.parent_location_id) {
    const parent = getLocationById(current.parent_location_id);
    if (parent) {
      ancestors.push(parent);
      current = parent;
    } else {
      break;
    }
  }

  return ancestors;
}

/**
 * Get descendants of a location
 */
export function getLocationDescendants(locationId: string): LocationEntity[] {
  const descendants: LocationEntity[] = [];
  const children = getLocationsForRegion(locationId);

  for (const child of children) {
    descendants.push(child);
    descendants.push(...getLocationDescendants(child.id));
  }

  return descendants;
}

// =============================================================================
// LOCATION PRIORITIZATION
// =============================================================================

/**
 * Prioritize locations by population
 */
export function prioritizeByPopulation(
  locations: LocationEntity[],
  limit?: number
): LocationEntity[] {
  const sorted = [...locations].sort((a, b) => (b.population || 0) - (a.population || 0));
  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Prioritize locations by distance from a center point
 */
export function prioritizeByDistance(
  locations: LocationEntity[],
  center: { lat: number; lng: number },
  limit?: number
): LocationEntity[] {
  const withDistance = locations
    .filter(l => l.coordinates)
    .map(l => ({
      location: l,
      distance: calculateDistance(center, l.coordinates!),
    }))
    .sort((a, b) => a.distance - b.distance);

  const sorted = withDistance.map(w => w.location);
  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Group locations by type
 */
export function groupLocationsByType(
  locations: LocationEntity[]
): Map<LocationEntity['type'], LocationEntity[]> {
  const groups = new Map<LocationEntity['type'], LocationEntity[]>();

  for (const location of locations) {
    const existing = groups.get(location.type) || [];
    existing.push(location);
    groups.set(location.type, existing);
  }

  return groups;
}

// =============================================================================
// LOCATION VARIANT GENERATION
// =============================================================================

/**
 * Generate location variants for a query template
 */
export function generateLocationVariants(
  template: QueryTemplate,
  locations: LocationEntity[],
  mapId: string,
  parentTopicId?: string,
  options?: {
    maxVariants?: number;
    includeParentRegion?: boolean;
    includeNeighborhoods?: boolean;
  }
): ExpandedTemplateResult {
  const { maxVariants = 100, includeParentRegion = false, includeNeighborhoods = true } = options || {};

  // Filter locations by type based on options
  let filteredLocations = locations;
  if (!includeNeighborhoods) {
    filteredLocations = filteredLocations.filter(l => l.type !== 'neighborhood');
  }

  // Find the location placeholder in the template
  const locationPlaceholder = template.placeholders.find(
    p => ['City', 'Region', 'Neighborhood', 'AdministrativeArea'].includes(p.entity_type) ||
         p.name.toLowerCase().includes('city') ||
         p.name.toLowerCase().includes('location')
  );

  if (!locationPlaceholder) {
    return {
      original_template: template,
      variable_combinations: [],
      generated_queries: [],
      generated_topics: [],
    };
  }

  // Generate variants
  const generatedQueries: string[] = [];
  const generatedTopics: Partial<EnrichedTopic>[] = [];
  const variableCombinations: Record<string, string>[] = [];

  const locationsToProcess = filteredLocations.slice(0, maxVariants);

  for (const location of locationsToProcess) {
    const vars: Record<string, string> = { [locationPlaceholder.name]: location.name };
    variableCombinations.push(vars);

    // Expand template
    let query = template.pattern;
    query = query.replace(locationPlaceholder.bracket_syntax, location.name);
    generatedQueries.push(query);

    // Create topic
    const topic: Partial<EnrichedTopic> = {
      id: uuidv4(),
      map_id: mapId,
      parent_topic_id: parentTopicId || null,
      title: query,
      slug: slugify(query),
      description: `Local SEO content for "${query}" targeting ${location.name}`,
      type: 'outer',
      freshness: 'EVERGREEN' as FreshnessProfile,
      topic_class: template.suggested_topic_class || 'informational',
      canonical_query: query,
      metadata: {
        generated_from_template: template.id,
        template_variables: vars,
        search_intent: template.search_intent,
        location_id: location.id,
        location_type: location.type,
        location_population: location.population,
      },
    };

    generatedTopics.push(topic);

    // Optionally include parent region variant
    if (includeParentRegion && location.parent_location_id) {
      const parentLocation = getLocationById(location.parent_location_id);
      if (parentLocation) {
        const parentVars: Record<string, string> = { [locationPlaceholder.name]: parentLocation.name };
        if (!variableCombinations.some(v => v[locationPlaceholder.name] === parentLocation.name)) {
          variableCombinations.push(parentVars);

          let parentQuery = template.pattern;
          parentQuery = parentQuery.replace(locationPlaceholder.bracket_syntax, parentLocation.name);
          generatedQueries.push(parentQuery);

          const parentTopic: Partial<EnrichedTopic> = {
            id: uuidv4(),
            map_id: mapId,
            parent_topic_id: parentTopicId || null,
            title: parentQuery,
            slug: slugify(parentQuery),
            description: `Regional SEO content for "${parentQuery}" targeting ${parentLocation.name}`,
            type: 'outer',
            freshness: 'EVERGREEN' as FreshnessProfile,
            topic_class: template.suggested_topic_class || 'informational',
            canonical_query: parentQuery,
            metadata: {
              generated_from_template: template.id,
              template_variables: parentVars,
              search_intent: template.search_intent,
              location_id: parentLocation.id,
              location_type: parentLocation.type,
            },
          };

          generatedTopics.push(parentTopic);
        }
      }
    }
  }

  return {
    original_template: template,
    variable_combinations: variableCombinations,
    generated_queries: generatedQueries,
    generated_topics: generatedTopics,
    parent_topic_id: parentTopicId,
  };
}

// =============================================================================
// PRESET LOCATION DATA
// =============================================================================

/**
 * Netherlands major cities preset
 */
export const NETHERLANDS_CITIES: Omit<LocationEntity, 'id'>[] = [
  { name: 'Amsterdam', type: 'city', population: 872680, coordinates: { lat: 52.3676, lng: 4.9041 } },
  { name: 'Rotterdam', type: 'city', population: 651446, coordinates: { lat: 51.9244, lng: 4.4777 } },
  { name: 'Den Haag', type: 'city', population: 545163, coordinates: { lat: 52.0705, lng: 4.3007 } },
  { name: 'Utrecht', type: 'city', population: 359376, coordinates: { lat: 52.0907, lng: 5.1214 } },
  { name: 'Eindhoven', type: 'city', population: 234235, coordinates: { lat: 51.4416, lng: 5.4697 } },
  { name: 'Groningen', type: 'city', population: 232675, coordinates: { lat: 53.2194, lng: 6.5665 } },
  { name: 'Tilburg', type: 'city', population: 219632, coordinates: { lat: 51.5555, lng: 5.0913 } },
  { name: 'Almere', type: 'city', population: 215055, coordinates: { lat: 52.3508, lng: 5.2647 } },
  { name: 'Breda', type: 'city', population: 183873, coordinates: { lat: 51.5719, lng: 4.7683 } },
  { name: 'Nijmegen', type: 'city', population: 176731, coordinates: { lat: 51.8126, lng: 5.8372 } },
  { name: 'Arnhem', type: 'city', population: 159265, coordinates: { lat: 51.9851, lng: 5.8987 } },
  { name: 'Haarlem', type: 'city', population: 161265, coordinates: { lat: 52.3874, lng: 4.6462 } },
  { name: 'Enschede', type: 'city', population: 158986, coordinates: { lat: 52.2215, lng: 6.8937 } },
  { name: 'Haarlemmermeer', type: 'city', population: 155423, coordinates: { lat: 52.3027, lng: 4.6920 } },
  { name: 'Zaanstad', type: 'city', population: 154865, coordinates: { lat: 52.4545, lng: 4.8167 } },
  { name: 'Amersfoort', type: 'city', population: 156286, coordinates: { lat: 52.1561, lng: 5.3878 } },
  { name: "'s-Hertogenbosch", type: 'city', population: 154205, coordinates: { lat: 51.6998, lng: 5.3049 } },
  { name: 'Apeldoorn', type: 'city', population: 163396, coordinates: { lat: 52.2112, lng: 5.9699 } },
  { name: 'Zwolle', type: 'city', population: 128271, coordinates: { lat: 52.5168, lng: 6.0830 } },
  { name: 'Leiden', type: 'city', population: 124899, coordinates: { lat: 52.1601, lng: 4.4970 } },
];

/**
 * US major cities preset
 */
export const US_MAJOR_CITIES: Omit<LocationEntity, 'id'>[] = [
  { name: 'New York', type: 'city', population: 8336817, coordinates: { lat: 40.7128, lng: -74.0060 } },
  { name: 'Los Angeles', type: 'city', population: 3979576, coordinates: { lat: 34.0522, lng: -118.2437 } },
  { name: 'Chicago', type: 'city', population: 2693976, coordinates: { lat: 41.8781, lng: -87.6298 } },
  { name: 'Houston', type: 'city', population: 2320268, coordinates: { lat: 29.7604, lng: -95.3698 } },
  { name: 'Phoenix', type: 'city', population: 1680992, coordinates: { lat: 33.4484, lng: -112.0740 } },
  { name: 'Philadelphia', type: 'city', population: 1584064, coordinates: { lat: 39.9526, lng: -75.1652 } },
  { name: 'San Antonio', type: 'city', population: 1547253, coordinates: { lat: 29.4241, lng: -98.4936 } },
  { name: 'San Diego', type: 'city', population: 1423851, coordinates: { lat: 32.7157, lng: -117.1611 } },
  { name: 'Dallas', type: 'city', population: 1343573, coordinates: { lat: 32.7767, lng: -96.7970 } },
  { name: 'San Jose', type: 'city', population: 1021795, coordinates: { lat: 37.3382, lng: -121.8863 } },
];

/**
 * UK major cities preset
 */
export const UK_MAJOR_CITIES: Omit<LocationEntity, 'id'>[] = [
  { name: 'London', type: 'city', population: 8982000, coordinates: { lat: 51.5074, lng: -0.1278 } },
  { name: 'Birmingham', type: 'city', population: 1141816, coordinates: { lat: 52.4862, lng: -1.8904 } },
  { name: 'Manchester', type: 'city', population: 547627, coordinates: { lat: 53.4808, lng: -2.2426 } },
  { name: 'Leeds', type: 'city', population: 793139, coordinates: { lat: 53.8008, lng: -1.5491 } },
  { name: 'Liverpool', type: 'city', population: 498042, coordinates: { lat: 53.4084, lng: -2.9916 } },
  { name: 'Bristol', type: 'city', population: 463400, coordinates: { lat: 51.4545, lng: -2.5879 } },
  { name: 'Sheffield', type: 'city', population: 584853, coordinates: { lat: 53.3811, lng: -1.4701 } },
  { name: 'Edinburgh', type: 'city', population: 540054, coordinates: { lat: 55.9533, lng: -3.1883 } },
  { name: 'Glasgow', type: 'city', population: 633120, coordinates: { lat: 55.8642, lng: -4.2518 } },
  { name: 'Cardiff', type: 'city', population: 366903, coordinates: { lat: 51.4816, lng: -3.1791 } },
];

/**
 * Load preset locations for a country
 */
export function loadPresetLocations(country: 'netherlands' | 'us' | 'uk'): LocationEntity[] {
  let preset: Omit<LocationEntity, 'id'>[];

  switch (country) {
    case 'netherlands':
      preset = NETHERLANDS_CITIES;
      break;
    case 'us':
      preset = US_MAJOR_CITIES;
      break;
    case 'uk':
      preset = UK_MAJOR_CITIES;
      break;
    default:
      preset = [];
  }

  return addLocations(preset);
}

/**
 * Import locations from CSV data
 */
export function importLocationsFromCSV(
  csvData: string,
  hasHeader: boolean = true
): LocationEntity[] {
  const lines = csvData.trim().split('\n');
  const startIndex = hasHeader ? 1 : 0;
  const locations: Omit<LocationEntity, 'id'>[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    if (parts.length >= 2) {
      const [name, type, populationStr, lat, lng, parentId] = parts;
      locations.push({
        name,
        type: (type as LocationEntity['type']) || 'city',
        population: populationStr ? parseInt(populationStr, 10) : undefined,
        coordinates: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined,
        parent_location_id: parentId || undefined,
      });
    }
  }

  return addLocations(locations);
}

/**
 * Export locations to CSV format
 */
export function exportLocationsToCSV(locations: LocationEntity[]): string {
  const header = 'name,type,population,lat,lng,parent_location_id';
  const rows = locations.map(l => {
    const lat = l.coordinates?.lat ?? '';
    const lng = l.coordinates?.lng ?? '';
    return `"${l.name}",${l.type},${l.population ?? ''},${lat},${lng},${l.parent_location_id ?? ''}`;
  });
  return [header, ...rows].join('\n');
}

// =============================================================================
// LOCATION ALIAS SYSTEM
// Google uses alias matching for query templates - "NYC" resolves to "New York"
// This ensures users searching with informal names still match your content
// =============================================================================

/**
 * Common city aliases and their canonical names
 * Organized by canonical name -> array of aliases
 */
export const LOCATION_ALIASES: Record<string, string[]> = {
  // United States
  'New York': ['NYC', 'New York City', 'NY', 'The Big Apple', 'Manhattan', 'Nueva York'],
  'Los Angeles': ['LA', 'L.A.', 'City of Angels', 'Hollywood', 'SoCal'],
  'San Francisco': ['SF', 'San Fran', 'The Bay', 'Bay Area', 'Frisco'],
  'Las Vegas': ['Vegas', 'Sin City', 'LV'],
  'Philadelphia': ['Philly', 'PHL'],
  'Chicago': ['Chi-Town', 'Chi', 'The Windy City', 'CHI'],
  'Houston': ['H-Town', 'HTown', 'HOU', 'Space City'],
  'Dallas': ['DFW', 'Big D', 'D-Town'],
  'Miami': ['MIA', 'The Magic City', 'South Beach', 'SoFla'],
  'Washington D.C.': ['DC', 'D.C.', 'Washington', 'The District', 'Capitol'],
  'Boston': ['Beantown', 'BOS'],
  'Atlanta': ['ATL', 'Hotlanta', 'The A'],
  'Detroit': ['Motor City', 'Motown', 'DET'],
  'Denver': ['Mile High City', 'DEN'],
  'Seattle': ['SEA', 'The Emerald City', 'Rain City'],
  'Phoenix': ['PHX', 'Valley of the Sun'],
  'San Diego': ['SD', 'America\'s Finest City'],
  'San Antonio': ['SA', 'SATX', 'Alamo City'],

  // United Kingdom
  'London': ['LON', 'The Big Smoke', 'The City', 'Greater London'],
  'Manchester': ['Manny', 'MCR', 'Manc'],
  'Birmingham': ['Brum', 'Brummie', 'BHX'],
  'Edinburgh': ['Edi', 'EDI'],
  'Glasgow': ['GLA', 'Glesga'],
  'Liverpool': ['Pool', 'LPL'],

  // Netherlands
  'Amsterdam': ['AMS', 'A\'dam', 'Mokum', 'Dam'],
  'Rotterdam': ['Roffa', 'RTM', 'R\'dam'],
  'Den Haag': ['The Hague', '\'s-Gravenhage', 'DH'],
  'Utrecht': ['U-Town', 'UT'],

  // Germany
  'Munich': ['München', 'MUC'],
  'Frankfurt': ['FFM', 'FRA', 'Mainhattan'],
  'Cologne': ['Köln', 'CGN'],
  'Berlin': ['BER'],
  'Hamburg': ['HAM', 'HH'],

  // Other International
  'Paris': ['Paree', 'PAR', 'City of Light', 'Ville Lumière'],
  'Rome': ['Roma', 'FCO', 'The Eternal City'],
  'Barcelona': ['Barca', 'BCN'],
  'Madrid': ['MAD'],
  'Tokyo': ['TYO', 'Tokio'],
  'Sydney': ['SYD'],
  'Melbourne': ['MEL', 'Melbs'],
  'Toronto': ['T.O.', 'TO', 'The 6ix', 'Six', 'YYZ'],
  'Montreal': ['MTL', 'Montréal'],
  'Vancouver': ['Van', 'YVR', 'Vancity'],
  'Mexico City': ['CDMX', 'DF', 'Ciudad de México'],
  'São Paulo': ['SP', 'Sampa', 'Sao Paulo'],
  'Rio de Janeiro': ['Rio', 'RJ'],
  'Buenos Aires': ['BA', 'Baires'],
  'Dubai': ['DXB'],
  'Singapore': ['SG', 'SIN'],
  'Hong Kong': ['HK', 'HKG'],
  'Seoul': ['SEL'],
  'Bangkok': ['BKK'],
};

// Build reverse lookup: alias -> canonical name
const aliasToCanonical: Map<string, string> = new Map();
Object.entries(LOCATION_ALIASES).forEach(([canonical, aliases]) => {
  aliases.forEach(alias => {
    aliasToCanonical.set(alias.toLowerCase(), canonical);
  });
});

/**
 * Resolve a location alias to its canonical name
 * Returns the input if no alias found
 */
export function resolveLocationAlias(input: string): string {
  const normalized = input.toLowerCase().trim();

  // Direct canonical name match
  const canonicalNames = Object.keys(LOCATION_ALIASES);
  const directMatch = canonicalNames.find(cn => cn.toLowerCase() === normalized);
  if (directMatch) {
    return directMatch;
  }

  // Alias lookup
  const resolved = aliasToCanonical.get(normalized);
  if (resolved) {
    return resolved;
  }

  // No match - return original with proper casing
  return input;
}

/**
 * Get all aliases for a canonical location name
 */
export function getLocationAliases(canonicalName: string): string[] {
  return LOCATION_ALIASES[canonicalName] || [];
}

/**
 * Check if a string is a known alias
 */
export function isLocationAlias(input: string): boolean {
  return aliasToCanonical.has(input.toLowerCase().trim());
}

/**
 * Add custom alias for a location
 */
export function addCustomAlias(canonicalName: string, alias: string): void {
  if (!LOCATION_ALIASES[canonicalName]) {
    LOCATION_ALIASES[canonicalName] = [];
  }
  const normalizedAlias = alias.toLowerCase();
  if (!LOCATION_ALIASES[canonicalName].some(a => a.toLowerCase() === normalizedAlias)) {
    LOCATION_ALIASES[canonicalName].push(alias);
    aliasToCanonical.set(normalizedAlias, canonicalName);
  }
}

/**
 * Find location by name or alias
 * Searches the location store using both canonical names and aliases
 */
export function findLocationByNameOrAlias(nameOrAlias: string): LocationEntity | undefined {
  const resolved = resolveLocationAlias(nameOrAlias);

  // Search in store
  return locationStore.find(l =>
    l.name.toLowerCase() === resolved.toLowerCase() ||
    l.name.toLowerCase() === nameOrAlias.toLowerCase()
  );
}

/**
 * Generate variants with alias expansion
 * Creates topics for both the canonical name AND popular aliases
 */
export function generateVariantsWithAliases(
  template: QueryTemplate,
  locations: LocationEntity[],
  mapId: string,
  parentTopicId?: string,
  options?: {
    maxVariants?: number;
    includeAliases?: boolean;
    aliasLimit?: number; // Max aliases per location
  }
): ExpandedTemplateResult {
  const { maxVariants = 100, includeAliases = true, aliasLimit = 2 } = options || {};

  // First get base result
  const baseResult = generateLocationVariants(template, locations, mapId, parentTopicId, { maxVariants });

  if (!includeAliases) {
    return baseResult;
  }

  // Find the location placeholder
  const locationPlaceholder = template.placeholders.find(
    p => ['City', 'Region', 'Neighborhood', 'AdministrativeArea'].includes(p.entity_type) ||
         p.name.toLowerCase().includes('city') ||
         p.name.toLowerCase().includes('location')
  );

  if (!locationPlaceholder) {
    return baseResult;
  }

  // Add alias variants
  const aliasQueries: string[] = [];
  const aliasTopics: Partial<EnrichedTopic>[] = [];
  const aliasVariables: Record<string, string>[] = [];

  locations.forEach(location => {
    const aliases = getLocationAliases(location.name).slice(0, aliasLimit);

    aliases.forEach(alias => {
      const vars: Record<string, string> = { [locationPlaceholder.name]: alias };
      aliasVariables.push(vars);

      // Expand template with alias
      let query = template.pattern;
      query = query.replace(locationPlaceholder.bracket_syntax, alias);
      aliasQueries.push(query);

      // Create topic
      const topic: Partial<EnrichedTopic> = {
        id: uuidv4(),
        map_id: mapId,
        parent_topic_id: parentTopicId || null,
        title: query,
        slug: slugify(query),
        description: `Local SEO content for "${query}" (alias for ${location.name})`,
        type: 'outer',
        freshness: 'EVERGREEN' as FreshnessProfile,
        topic_class: template.suggested_topic_class || 'informational',
        canonical_query: query,
        metadata: {
          generated_from_template: template.id,
          template_variables: vars,
          search_intent: template.search_intent,
          location_id: location.id,
          location_type: location.type,
          is_alias_variant: true,
          canonical_location: location.name,
        },
      };

      aliasTopics.push(topic);
    });
  });

  // Merge results (respecting max limit)
  const totalQueries = [...baseResult.generated_queries, ...aliasQueries].slice(0, maxVariants);
  const totalTopics = [...baseResult.generated_topics, ...aliasTopics].slice(0, maxVariants);
  const totalVars = [...baseResult.variable_combinations, ...aliasVariables].slice(0, maxVariants);

  return {
    original_template: template,
    variable_combinations: totalVars,
    generated_queries: totalQueries,
    generated_topics: totalTopics,
    parent_topic_id: parentTopicId,
  };
}

/**
 * Suggest aliases for locations in the store that don't have known aliases
 */
export function identifyLocationsWithoutAliases(): LocationEntity[] {
  return locationStore.filter(l => {
    const aliases = getLocationAliases(l.name);
    return aliases.length === 0;
  });
}
