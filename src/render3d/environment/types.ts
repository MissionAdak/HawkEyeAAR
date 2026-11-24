import type { ZoneSpec, WeatherType } from '@/sim/types';

export type { WeatherType };

export type EnvironmentPreset =
  | 'URBAN_DENSE'
  | 'SUBURBAN'
  | 'MOUNTAIN_RIDGE'
  | 'FOREST_VALLEY'
  | 'COASTAL_AIRFIELD'
  | 'OPEN_RURAL';

export type ScenarioFamily =
  | 'DEMO-1'
  | 'DEMO-2'
  | 'SWARM'
  | 'SPECTRUM'
  | 'PROCEDURAL'
  | 'RANDOM'
  | 'FORMATION'
  | 'POPUP'
  | 'CUSTOM';

export type ScenarioVisualProfile =
  | 'DEMO_1_URBAN_METRO'
  | 'DEMO_2_SUBURBAN_LOGISTICS'
  | 'SWARM_MOUNTAIN_VALLEY'
  | 'SPECTRUM_FOREST_RIVER'
  | 'PROCEDURAL_COASTAL_AIRFIELD'
  | 'RANDOM_SEEDED_LANDSCAPE'
  | 'FORMATION_ALPINE_PASS'
  | 'POPUP_URBAN_CORRIDOR'
  | 'RURAL_OPEN_PLAIN';

export type EnvironmentCategory =
  | 'BUILDING'
  | 'TOWER'
  | 'RADAR_INSTALLATION'
  | 'VEGETATION'
  | 'TERRAIN_ZONE'
  | 'RIDGE'
  | 'AIRFIELD'
  | 'PROTECTED_FACILITY'
  | 'WATER_FEATURE';

export interface EnvironmentObjectInfo {
  id: string;
  name: string;
  category: EnvironmentCategory;
  preset: EnvironmentPreset;
  zoneId?: string;
  position: { x: number; y: number; z: number }; // Sim coords: East(X), North(Y), Alt(Z) in meters
  heightM: number;
  elevationM?: number;
  maskingProperties?: {
    heightM: number;
    shadowM: number;
    rho: number;
    zoneType: string;
  };
  isObstructionEnvelope: boolean;
  description?: string;
}

export interface EnvironmentDescriptor {
  preset: EnvironmentPreset;
  name: string;
  description: string;
  terrainType: string;
  dayNight: 'DAY' | 'NIGHT';
  weather: WeatherType;
  fogSeverity?: number;
  zones: ZoneSpec[];
  mapRadiusM: number;
  rMinM: number;
  seed: number;
  visualProfile?: ScenarioVisualProfile;
  scenarioFamily?: ScenarioFamily;
  scenarioId?: string;
}
