import type { ZoneSpec } from '@/sim/types';

export type EnvironmentPreset =
  | 'URBAN_DENSE'
  | 'SUBURBAN'
  | 'MOUNTAIN_RIDGE'
  | 'FOREST_VALLEY'
  | 'COASTAL_AIRFIELD'
  | 'OPEN_RURAL';

export type WeatherType = 'CLEAR' | 'FOG' | 'RAIN' | 'OVERCAST';

export type EnvironmentCategory =
  | 'BUILDING'
  | 'TOWER'
  | 'RADAR_INSTALLATION'
  | 'VEGETATION'
  | 'TERRAIN_ZONE'
  | 'RIDGE'
  | 'AIRFIELD'
  | 'PROTECTED_FACILITY';

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
}
