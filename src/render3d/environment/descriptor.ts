import type { ScenarioSpec, ChaosSpec } from '@/sim/types';
import type { EnvironmentDescriptor, EnvironmentPreset, WeatherType } from './types';

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  'URBAN_DENSE',
  'SUBURBAN',
  'MOUNTAIN_RIDGE',
  'FOREST_VALLEY',
  'COASTAL_AIRFIELD',
  'OPEN_RURAL',
];

/**
 * Deterministically derives the environment descriptor for a scenario.
 * Strictly avoids unseeded random numbers or floating-point instability.
 */
export function getScenarioEnvironmentDescriptor(
  scenarioId: string,
  spec?: ScenarioSpec | null
): EnvironmentDescriptor {
  const seed = spec?.seed ?? 2026;
  const dayNight = spec?.dayNight ?? 'DAY';
  const zones = spec?.zones ?? [];
  const mapRadiusM = 5000;
  const rMinM = spec?.asset?.rMinM ?? 500;

  let preset: EnvironmentPreset;
  let terrainType: string;
  let description: string;

  // Derive preset from scenario ID or seed
  if (scenarioId === 'DEMO-1') {
    preset = 'URBAN_DENSE';
    terrainType = 'High-Density Urban Metropolitan Center';
    description = 'High-value urban core with high-rise residential & commercial concrete buildings.';
  } else if (scenarioId === 'DEMO-2') {
    preset = 'SUBURBAN';
    terrainType = 'Suburban Logistics & Industrial Perimeter';
    description = 'Low-rise warehousing, perimeter roads, and sparse utility structures.';
  } else if (scenarioId === 'SWARM-1') {
    preset = 'MOUNTAIN_RIDGE';
    terrainType = 'Rugged Mountainous Ridge & Valley';
    description = 'Elevated ridgelines creating deep radar masking corridors for saturating swarms.';
  } else if (scenarioId === 'SPECTRUM-1') {
    preset = 'FOREST_VALLEY';
    terrainType = 'Dense Forest Valley & River Basin';
    description = 'Heavy coniferous canopy and undulating terrain offering natural low-altitude masking.';
  } else if (scenarioId === 'PROCEDURAL-1') {
    preset = 'COASTAL_AIRFIELD';
    terrainType = 'Coastal Military Airfield & Naval Shoreline';
    description = 'Active airfield with concrete runway, aircraft hangars, and maritime radar horizon.';
  } else if (scenarioId === 'FORMATION-1') {
    preset = 'MOUNTAIN_RIDGE';
    terrainType = 'Alpine Ridge Sector';
    description = 'Narrow alpine pass forcing cohesive threat formations between elevated peaks.';
  } else if (scenarioId === 'POPUP-1') {
    preset = 'URBAN_DENSE';
    terrainType = 'Urban Ingress Defense Corridor';
    description = 'Dense urban canyon structure with sudden pop-up ingress from behind building shadows.';
  } else if (scenarioId.startsWith('RANDOM-')) {
    // Seeded selection from 6 presets
    const idx = Math.abs(seed) % ENVIRONMENT_PRESETS.length;
    preset = ENVIRONMENT_PRESETS[idx];
    terrainType = `Procedural Sector (${preset.replace('_', ' ')})`;
    description = 'Procedurally synthesized tactical terrain generated deterministically from exercise seed.';
  } else {
    // Default fallback based on zones present in scenario
    if (zones.some((z) => z.type === 'FOREST')) {
      preset = 'FOREST_VALLEY';
      terrainType = 'Forest Valley';
      description = 'Forest environment derived from scenario masking zones.';
    } else if (zones.some((z) => z.type === 'RIDGE')) {
      preset = 'MOUNTAIN_RIDGE';
      terrainType = 'Mountain Ridge';
      description = 'Elevated terrain derived from scenario ridge zones.';
    } else if (zones.some((z) => z.type === 'URBAN')) {
      preset = 'URBAN_DENSE';
      terrainType = 'Urban Center';
      description = 'Urban structures derived from scenario building zones.';
    } else {
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

