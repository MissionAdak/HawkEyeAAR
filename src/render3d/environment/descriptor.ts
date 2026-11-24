import type { ScenarioSpec, ChaosSpec } from '@/sim/types';
import type {
  EnvironmentDescriptor,
  EnvironmentPreset,
  ScenarioFamily,
  ScenarioVisualProfile,
  WeatherType,
} from './types';

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  'URBAN_DENSE',
  'SUBURBAN',
  'MOUNTAIN_RIDGE',
  'FOREST_VALLEY',
  'COASTAL_AIRFIELD',
  'OPEN_RURAL',
];

export interface SeededBiomeResult {
  visualProfile: ScenarioVisualProfile;
  preset: EnvironmentPreset;
  terrainType: string;
  description: string;
}

export const RANDOM_BIOME_CANDIDATES: SeededBiomeResult[] = [
  {
    visualProfile: 'SPECTRUM_FOREST_RIVER',
    preset: 'FOREST_VALLEY',
    terrainType: 'Dense Forest Valley & Winding River',
    description: 'Procedural forest river basin with dense coniferous canopy and tactical bridges.',
  },
  {
    visualProfile: 'SWARM_MOUNTAIN_VALLEY',
    preset: 'MOUNTAIN_RIDGE',
    terrainType: 'Rugged Mountainous Ridge & Valley',
    description: 'Procedural mountain ridgelines and defensive valley flight corridors.',
  },
  {
    visualProfile: 'PROCEDURAL_COASTAL_AIRFIELD',
    preset: 'COASTAL_AIRFIELD',
    terrainType: 'Coastal Military Airfield & Naval Shoreline',
    description: 'Procedural coastal airfield with sandy beach, ocean waters, and breakwater jetty.',
  },
  {
    visualProfile: 'DEMO_2_SUBURBAN_LOGISTICS',
    preset: 'SUBURBAN',
    terrainType: 'Suburban Logistics & Industrial Perimeter',
    description: 'Procedural industrial logistics park with warehousing and retention reservoir.',
  },
  {
    visualProfile: 'POPUP_URBAN_CORRIDOR',
    preset: 'URBAN_DENSE',
    terrainType: 'Urban Ingress Corridor & Retention Canal',
    description: 'Procedural urban street canyons, mid-rise structures, and concrete canal.',
  },
  {
    visualProfile: 'FORMATION_ALPINE_PASS',
    preset: 'MOUNTAIN_RIDGE',
    terrainType: 'Alpine Ridge Pass & Glacial Lake',
    description: 'Procedural alpine pass flanked by high peaks and an elevated glacial tarn.',
  },
];

/**
 * Deterministically binds a seed to a single, coherent biome decision.
 * Shared across descriptor, terrain, water, buildings, vegetation, and elevation sampling.
 */
export function resolveRandomBiome(seed: number): SeededBiomeResult {
  const idx = Math.abs(seed) % RANDOM_BIOME_CANDIDATES.length;
  return RANDOM_BIOME_CANDIDATES[idx];
}

/**
 * Deterministically derives the environment descriptor for a scenario.
 * Supports canonical scenario families and dynamic IDs (e.g. PROCEDURAL-*, FORMATION-*, RANDOM-*).
 * Strictly avoids unseeded random numbers or floating-point instability.
 */
export function getScenarioEnvironmentDescriptor(
  scenarioIdOrSpec: string | ScenarioSpec,
  maybeSpec?: ScenarioSpec | null
): EnvironmentDescriptor {
  const scenarioId = typeof scenarioIdOrSpec === 'string' ? scenarioIdOrSpec : (scenarioIdOrSpec as ScenarioSpec)?.id;
  const spec = typeof scenarioIdOrSpec === 'string' ? maybeSpec : (scenarioIdOrSpec as ScenarioSpec);

  const seed = spec?.seed ?? 2026;
  const dayNight = spec?.dayNight ?? 'DAY';
  const zones = spec?.zones ?? [];
  const mapRadiusM = 5000;
  const rMinM = spec?.asset?.rMinM ?? 500;

  const upperId = (scenarioId || '').toUpperCase();
  let scenarioFamily: ScenarioFamily = 'CUSTOM';
  let visualProfile: ScenarioVisualProfile = 'RURAL_OPEN_PLAIN';
  let preset: EnvironmentPreset = 'OPEN_RURAL';
  let terrainType: string;
  let description: string;

  // 1. Map 1: DEMO-1 — High-Density Urban Metropolitan Center
  if (upperId === 'DEMO-1') {
    scenarioFamily = 'DEMO-1';
    visualProfile = 'DEMO_1_URBAN_METRO';
    preset = 'URBAN_DENSE';
    terrainType = 'High-Density Urban Metropolitan Center';
    description = 'High-value urban core with high-rise residential & commercial concrete buildings, expressways, and outer hills.';
  }
  // 2. Map 2: DEMO-2 — Suburban Logistics & Industrial Park
  else if (upperId === 'DEMO-2') {
    scenarioFamily = 'DEMO-2';
    visualProfile = 'DEMO_2_SUBURBAN_LOGISTICS';
    preset = 'SUBURBAN';
    terrainType = 'Suburban Logistics & Industrial Perimeter';
    description = 'Low-rise warehousing, vehicle access roads, security fences, and industrial drainage reservoir.';
  }
  // 3. Map 3: SWARM-1 — Rugged Mountain Swarm Battlefield
  else if (upperId === 'SWARM-1' || upperId.startsWith('SWARM-')) {
    scenarioFamily = 'SWARM';
    visualProfile = 'SWARM_MOUNTAIN_VALLEY';
    preset = 'MOUNTAIN_RIDGE';
    terrainType = 'Rugged Mountainous Ridge & Valley';
    description = 'Elevated ridgelines flanking open lower-altitude flight corridors and northern arroyo wash.';
  }
  // 4. Map 4: SPECTRUM-1 — Dense Forest Valley & Winding River
  else if (upperId === 'SPECTRUM-1' || upperId.startsWith('SPECTRUM-')) {
    scenarioFamily = 'SPECTRUM';
    visualProfile = 'SPECTRUM_FOREST_RIVER';
    preset = 'FOREST_VALLEY';
    terrainType = 'Dense Forest Valley & Winding River';
    description = 'Continuous winding blue river with bridges, heavy coniferous canopy, and rolling undulating terrain.';
  }
  // 5. Map 5: PROCEDURAL-* — Coastal Military Airfield
  else if (upperId === 'PROCEDURAL-1' || upperId.startsWith('PROCEDURAL-')) {
    scenarioFamily = 'PROCEDURAL';
    visualProfile = 'PROCEDURAL_COASTAL_AIRFIELD';
    preset = 'COASTAL_AIRFIELD';
    terrainType = 'Coastal Military Airfield & Naval Shoreline';
    description = 'Active airfield with concrete runway, aircraft hangars, control tower, and coastal ocean with sandy beach.';
  }
  // 6. Map 7: FORMATION-* — Alpine Pass & Glacial Tarn
  else if (upperId === 'FORMATION-1' || upperId.startsWith('FORMATION-')) {
    scenarioFamily = 'FORMATION';
    visualProfile = 'FORMATION_ALPINE_PASS';
    preset = 'MOUNTAIN_RIDGE';
    terrainType = 'Alpine Ridge Pass & Glacial Lake';
    description = 'Twin dominant mountain peaks with high alpine pass corridor and pristine glacial mountain lake.';
  }
  // 7. Map 8: POPUP-* — Urban Ingress Corridor & Retention Canal
  else if (upperId === 'POPUP-1' || upperId.startsWith('POPUP-')) {
    scenarioFamily = 'POPUP';
    visualProfile = 'POPUP_URBAN_CORRIDOR';
    preset = 'URBAN_DENSE';
    terrainType = 'Urban Ingress Corridor & Retention Canal';
    description = 'Mid-rise urban street canyons, open urban parcels, and central concrete drainage canal.';
  }
  // 8. Map 6: RANDOM-* — Seeded Procedural Tactical Environment
  else if (upperId.startsWith('RANDOM-')) {
    scenarioFamily = 'RANDOM';
    visualProfile = 'RANDOM_SEEDED_LANDSCAPE';
    const biome = resolveRandomBiome(seed);
    preset = biome.preset;
    terrainType = biome.terrainType;
    description = biome.description;
  } else {
    // Default fallback based on zones present in scenario
    if (zones.some((z) => z.type === 'FOREST')) {
      scenarioFamily = 'CUSTOM';
      visualProfile = 'SPECTRUM_FOREST_RIVER';
      preset = 'FOREST_VALLEY';
      terrainType = 'Forest Valley';
      description = 'Forest environment derived from scenario masking zones.';
    } else if (zones.some((z) => z.type === 'RIDGE')) {
      scenarioFamily = 'CUSTOM';
      visualProfile = 'SWARM_MOUNTAIN_VALLEY';
      preset = 'MOUNTAIN_RIDGE';
      terrainType = 'Mountain Ridge';
      description = 'Elevated terrain derived from scenario ridge zones.';
    } else if (zones.some((z) => z.type === 'URBAN')) {
      scenarioFamily = 'CUSTOM';
      visualProfile = 'DEMO_1_URBAN_METRO';
      preset = 'URBAN_DENSE';
      terrainType = 'Urban Center';
      description = 'Urban structures derived from scenario building zones.';
    } else {
      scenarioFamily = 'CUSTOM';
      visualProfile = 'RURAL_OPEN_PLAIN';
      preset = 'OPEN_RURAL';
      terrainType = 'Open Rural Farmland';
      description = 'Open agricultural plain with clear lines of sight to all horizons.';
    }
  }

  // Weather determination from scenario chaos schedule
  const chaos = spec?.chaos ?? [];
  let weather: WeatherType = 'CLEAR';
  let fogSeverity: number | undefined;

  const fogChaos = chaos.find((c: ChaosSpec) => c.type === 'FOG');
  const rainChaos = chaos.find((c: ChaosSpec) => c.type === 'RAIN');

  if (fogChaos) {
    weather = 'FOG';
    fogSeverity = fogChaos.severity;
  } else if (rainChaos) {
    weather = 'RAIN';
  } else if (dayNight === 'NIGHT') {
    weather = 'CLEAR';
  }

  return {
    preset,
    visualProfile,
    scenarioFamily,
    scenarioId,
    name: preset.replace('_', ' '),
    description,
    terrainType,
    dayNight,
    weather,
    fogSeverity,
    zones,
    mapRadiusM,
    rMinM,
    seed,
  };
}

export const buildEnvironmentDescriptor = getScenarioEnvironmentDescriptor;
