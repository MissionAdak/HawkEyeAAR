import { CONFIG } from '@/config';

export interface RadarSweepState {
  /** 2D Canvas radar angle in radians (-PI/2 at 12 o'clock / North, increasing clockwise towards +X East) */
  sweepAngleRad: number;
  /** Alias for 2D Canvas radar angle */
  angleRad2D: number;
  /** Compass heading in degrees [0, 360) where 0 = North, 90 = East, 180 = South, 270 = West */
  headingDeg: number;
  /** Three.js Y-rotation in radians for antenna/beam where 0 = North (-Z), rotated clockwise towards +X East */
  rotationYRad: number;
  /** Normalized rotation progress in [0, 1) */
  progress: number;
  /** Effective sweep period in milliseconds */
  sweepPeriodMs: number;
}

/**
 * Authoritative shared radar sweep calculation for 2D tactical console and 3D environment.
 * Ensures the 2D phosphor sweep line and 3D radar dish/beam maintain 100% rotational synchronization.
 *
 * Rotation Rate: Standard 30 RPM (1 revolution every 2000 ms).
 * Orientation Mapping:
 * - Simulation: +x = East, +y = North
 * - Canvas 2D:  12 o'clock = North (-PI/2), 3 o'clock = East (0)
 * - Three.js:   -Z = North, +X = East, +Y = Altitude / Up
 */
export function calculateRadarSweepAngle(simMs: number, sweepPeriodOverrideMs?: number): RadarSweepState {
  const sweepPeriodMs = sweepPeriodOverrideMs ?? CONFIG.thresholds.radarSweepPeriodMs ?? 2000;
  const safePeriod = Math.max(100, sweepPeriodMs);
  const normalizedMs = ((simMs % safePeriod) + safePeriod) % safePeriod;
  const progress = normalizedMs / safePeriod;

  // Canvas 2D angle: -PI/2 at 12 o'clock (North), rotates clockwise
  const sweepAngleRad = -Math.PI / 2 + progress * Math.PI * 2;

  // Compass heading: 0 deg at North, 90 deg at East
  const headingDeg = (progress * 360) % 360;

  // Three.js angle: In Three.js, default forward is -Z (North).
  // Clockwise rotation looking down (+Y towards ground) is negative rotation around +Y axis.
  const rotationYRad = -progress * Math.PI * 2;

  return {
    sweepAngleRad,
    angleRad2D: sweepAngleRad,
    headingDeg,
    rotationYRad,
    progress,
    sweepPeriodMs: safePeriod,
  };
}
