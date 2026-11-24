import * as THREE from 'three';
import { toThree } from '../coords';
import { calculateAircraftOrientation, calculateScreenSpaceScale } from '../aircraftModel';
import type { SafeTrackView } from '../types';

export interface FilteredTrackTransform {
  position: THREE.Vector3; // Three.js position (x, y=altitude, z)
  altitudeM: number;       // Altitude in meters (Three.js Y)
  headingRad: number;      // Filtered heading angle in radians
  pitchRad: number;        // Filtered pitch angle in radians (-0.25 to +0.25 rad)
  scale: number;           // Screen-space scale factor
  isMoving: boolean;       // Hysteresis motion state flag
}

export interface RenderTrackMotionFilterOptions {
  posTauSec?: number;       // Position exponential filter time constant (default: 0.09s)
  altTauSec?: number;       // Altitude filter time constant (default: 0.12s)
  headingTauSec?: number;   // Heading filter time constant (default: 0.25s)
  pitchTauSec?: number;     // Pitch filter time constant (default: 0.25s)
  scaleTauSec?: number;     // Scale filter time constant (default: 0.15s)
  enterSpeedMps?: number;   // Speed threshold to enter moving state (default: 3.5 m/s)
  exitSpeedMps?: number;    // Speed threshold to exit moving state (default: 2.0 m/s)
  snapDistanceM?: number;   // Snap teleport threshold (default: 250m)
}

interface TrackMotionState {
  trackNo: string;
  filteredPos: THREE.Vector3;
  stableHeadingRad: number;
  stablePitchRad: number;
  stableScale: number;
  isMoving: boolean;
  lastUpdateMs: number;
  initialized: boolean;
}

/**
 * RenderTrackMotionFilter
 *
 * Dedicated render-only motion stabilization filter for 3D tactical tracks.
 * Eliminates high-frequency Kalman tracker measurement noise and 20 Hz step jitter
 * while preserving genuine aircraft flight trajectories and responsiveness.
 *
 * Key Capabilities:
 * 1. Time-Normalized Filtering: All damping calculations are driven by real elapsed
 *    delta time (dt clamped between 1ms and 100ms), ensuring consistent visual
 *    smoothness across 30, 60, 120, and 144 Hz displays.
 * 2. Dual-Threshold Heading Hysteresis: Eliminates needle spinning on hovering / slow
 *    drones by freezing heading below 2.0 m/s until movement reliably exceeds 3.5 m/s.
 * 3. Branch-Cut Unwrapping: Prevents full 360-degree flip animations when heading crosses
 *    the -PI / +PI boundary.
 * 4. Pitch Corridor Clamping: Clamps pitch to realistic tactical envelope (+/- 14 deg / 0.25 rad)
 *    and decays to level flight during hover.
 * 5. Decoupled Screen-Space Scale: Calculates perspective scale from filtered coordinates
 *    rather than noisy tracker inputs, applying a deadband filter to eliminate scale pulsing.
 * 6. Airgap & Simulation Isolation: Render-only filter with zero ground-truth leakage and
 *    no modification to authoritative tracker or simulation state.
 */
export class RenderTrackMotionFilter {
  private states = new Map<string, TrackMotionState>();
  private options: Required<RenderTrackMotionFilterOptions>;

  constructor(options?: RenderTrackMotionFilterOptions) {
    this.options = {
      posTauSec: options?.posTauSec ?? 0.09,
      altTauSec: options?.altTauSec ?? 0.12,
      headingTauSec: options?.headingTauSec ?? 0.25,
      pitchTauSec: options?.pitchTauSec ?? 0.25,
      scaleTauSec: options?.scaleTauSec ?? 0.15,
      enterSpeedMps: options?.enterSpeedMps ?? 3.5,
      exitSpeedMps: options?.exitSpeedMps ?? 2.0,
      snapDistanceM: options?.snapDistanceM ?? 250,
    };
  }

  /**
   * Updates the filtered transform for a track based on its current estimated state.
   */
  public updateTrack(
    track: SafeTrackView,
    camera?: THREE.Camera,
    viewportHeightPx: number = 520,
    targetPixelSize: number = 48,
    nowMs?: number
  ): FilteredTrackTransform {
    const initialTimeMs = typeof nowMs === 'number' && Number.isFinite(nowMs) ? nowMs : 0;
    let state = this.states.get(track.trackNo);

    if (!state) {
      state = {
        trackNo: track.trackNo,
        filteredPos: new THREE.Vector3(),
        stableHeadingRad: 0,
        stablePitchRad: 0,
        stableScale: 1,
        isMoving: false,
        lastUpdateMs: initialTimeMs,
        initialized: false,
      };
      this.states.set(track.trackNo, state);
    }

    // Three.js target position from authoritative estimated track coordinates
    const targetThreePos = toThree(track.pos.x, track.pos.y, track.pos.z);

    if (!state.initialized) {
      state.filteredPos.copy(targetThreePos);
      const speedH = Math.hypot(track.vel.x, track.vel.y);
      if (speedH >= this.options.enterSpeedMps) {
        state.isMoving = true;
        const orient = calculateAircraftOrientation(track.vel, 0);
        state.stableHeadingRad = orient.headingRad;
        state.stablePitchRad = Math.max(-0.25, Math.min(0.25, orient.pitchRad));
      } else {
        state.isMoving = false;
        state.stableHeadingRad = 0;
        state.stablePitchRad = 0;
      }
      state.stableScale = this.computeScale(state.filteredPos, camera, viewportHeightPx, targetPixelSize);
      state.lastUpdateMs = initialTimeMs;
      state.initialized = true;

      return {
        position: state.filteredPos.clone(),
        altitudeM: state.filteredPos.y,
        headingRad: state.stableHeadingRad,
        pitchRad: state.stablePitchRad,
        scale: state.stableScale,
        isMoving: state.isMoving,
      };
    }

    // Time delta calculation with hitch clamping [1ms, 100ms]
    let dt = 0.016;
    if (typeof nowMs === 'number' && Number.isFinite(nowMs)) {
      if (state.lastUpdateMs > 0) {
        dt = (nowMs - state.lastUpdateMs) / 1000;
      }
      state.lastUpdateMs = nowMs;
    }
    if (dt <= 0 || !Number.isFinite(dt)) {
      dt = 0.016;
    } else if (dt > 0.1) {
      dt = 0.1;
    } else if (dt < 0.001) {
      dt = 0.001;
    }

    // Check for large position jump or teleport
    const dx = targetThreePos.x - state.filteredPos.x;
    const dy = targetThreePos.y - state.filteredPos.y;
    const dz = targetThreePos.z - state.filteredPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq > this.options.snapDistanceM * this.options.snapDistanceM) {
      // Snap immediately on large jumps / relocations
      state.filteredPos.copy(targetThreePos);
    } else {
      // Time-normalized exponential decay filter
      const posAlpha = 1 - Math.exp(-dt / this.options.posTauSec);
      const altAlpha = 1 - Math.exp(-dt / this.options.altTauSec);

      state.filteredPos.x += dx * posAlpha;
      state.filteredPos.y += dy * altAlpha;
      state.filteredPos.z += dz * posAlpha;
    }

    // Dual-threshold heading hysteresis
    const speedH = Math.hypot(track.vel.x, track.vel.y);
    if (state.isMoving) {
      if (speedH < this.options.exitSpeedMps) {
        state.isMoving = false;
      }
    } else {
      if (speedH >= this.options.enterSpeedMps) {
        state.isMoving = true;
      }
    }

    let targetHeading = state.stableHeadingRad;
    let targetPitch = 0;

    if (state.isMoving) {
      const orient = calculateAircraftOrientation(track.vel, state.stableHeadingRad);
      targetHeading = orient.headingRad;
      targetPitch = Math.max(-0.25, Math.min(0.25, orient.pitchRad));

      // Branch-cut unwrapping [-PI, +PI]
      let dHeading = targetHeading - state.stableHeadingRad;
      while (dHeading > Math.PI) dHeading -= 2 * Math.PI;
      while (dHeading < -Math.PI) dHeading += 2 * Math.PI;

      // Angular deadband: filter out high-frequency Kalman velocity innovation noise below 0.035 rad (~2.0 deg)
      if (Math.abs(dHeading) < 0.035) {
        dHeading = 0;
      }

      const headingAlpha = 1 - Math.exp(-dt / this.options.headingTauSec);
      state.stableHeadingRad += dHeading * headingAlpha;

      let dPitch = targetPitch - state.stablePitchRad;
      if (Math.abs(dPitch) < 0.02) {
        dPitch = 0;
      }
      const pitchAlpha = 1 - Math.exp(-dt / this.options.pitchTauSec);
      state.stablePitchRad += dPitch * pitchAlpha;
    } else {
      // Hovering: heading is completely frozen; pitch smoothly relaxes to 0 (level)
      const pitchAlpha = 1 - Math.exp(-dt / this.options.pitchTauSec);
      state.stablePitchRad += (0 - state.stablePitchRad) * pitchAlpha;
    }

    // Screen-space scale from stabilized position with smooth continuous damping
    const rawScale = this.computeScale(state.filteredPos, camera, viewportHeightPx, targetPixelSize);
    const scaleDiff = Math.abs(rawScale - state.stableScale) / Math.max(1, state.stableScale);
    if (scaleDiff > 0.015) {
      const scaleAlpha = 1 - Math.exp(-dt / this.options.scaleTauSec);
      state.stableScale += (rawScale - state.stableScale) * scaleAlpha;
    }

    return {
      position: state.filteredPos.clone(),
      altitudeM: state.filteredPos.y,
      headingRad: state.stableHeadingRad,
      pitchRad: state.stablePitchRad,
      scale: state.stableScale,
      isMoving: state.isMoving,
    };
  }

  /**
   * Helper to compute screen-space scale based on distance from camera to stabilized position.
   */
  private computeScale(
    filteredPos: THREE.Vector3,
    camera?: THREE.Camera,
    viewportHeightPx: number = 520,
    targetPixelSize: number = 48
  ): number {
    let distanceM = 7500;
    let fovDeg = 45;

    if (camera instanceof THREE.PerspectiveCamera) {
      fovDeg = camera.fov;
      distanceM = camera.position.distanceTo(filteredPos);
    } else if (camera) {
      distanceM = camera.position.distanceTo(filteredPos);
    }

    // Call with tiered = false so screen-space scale continuously maintains apparent pixel size across all zoom levels
    return calculateScreenSpaceScale(fovDeg, distanceM, viewportHeightPx, targetPixelSize, false);
  }

  /**
   * Prunes motion filter states for tracks that are no longer active.
   */
  public prune(activeTrackNos: Set<string>): void {
    for (const trackNo of this.states.keys()) {
      if (!activeTrackNos.has(trackNo)) {
        this.states.delete(trackNo);
      }
    }
  }

  /**
   * Resets all internal filter states.
   */
  public reset(): void {
    this.states.clear();
  }

  /**
   * Returns current transform for a track if tracked.
   */
  public getTransform(trackNo: string): FilteredTrackTransform | undefined {
    const s = this.states.get(trackNo);
    if (!s || !s.initialized) return undefined;
    return {
      position: s.filteredPos.clone(),
      altitudeM: s.filteredPos.y,
      headingRad: s.stableHeadingRad,
      pitchRad: s.stablePitchRad,
      scale: s.stableScale,
      isMoving: s.isMoving,
    };
  }
}
