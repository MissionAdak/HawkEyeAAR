import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RenderTrackMotionFilter } from '@/render3d/motion/RenderTrackMotionFilter';
import type { SafeTrackView } from '@/render3d/types';

describe('TASK 29 — RenderTrackMotionFilter Unit Test Suite', () => {
  const camera = new THREE.PerspectiveCamera(45, 1366 / 768, 5, 45000);
  camera.position.set(0, 3000, 5000);
  camera.lookAt(1200, 80, 1500);

  function makeTrack(overrides: Partial<SafeTrackView> = {}): SafeTrackView {
    return {
      trackNo: 'T-01',
      pos: { x: 1200, y: 1500, z: 80 },
      vel: { x: 0, y: 0, z: 0 },
      traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
      step: 'TRACK',
      q: 0.85,
      masked: false,
      ghostSigmaM: 10,
      isSelected: false,
      lifecycle: 'ACTIVE',
      ...overrides,
    };
  }

  it('Test 1: achieves >= 70% RMS noise reduction on hovering / stationary targets', () => {
    const filter = new RenderTrackMotionFilter();
    let seed = 42;
    function rand() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }
    function gaussian(sigma: number) {
      const u1 = Math.max(1e-6, rand());
      const u2 = rand();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
    }

    let rawDisplacementSq = 0;
    let renderDisplacementSq = 0;
    let prevRawPos = { x: 1200, y: 1500, z: 80 };
    let prevRenderPos: THREE.Vector3 | null = null;
    let sampleCount = 0;

    let timeMs = 1000;
    for (let tick = 0; tick < 80; tick++) {
      const rawPos = {
        x: 1200 + gaussian(10),
        y: 1500 + gaussian(10),
        z: 80 + gaussian(3),
      };
      const rawVel = {
        x: gaussian(1.2),
        y: gaussian(1.2),
        z: gaussian(0.5),
      };
      const track = makeTrack({ pos: rawPos, vel: rawVel });

      // 3 render frames per 50ms sim tick (60 FPS vs 20 Hz)
      for (let f = 0; f < 3; f++) {
        timeMs += 16.666;
        const xform = filter.updateTrack(track, camera, 520, 48, timeMs);

        if (tick > 5 && prevRenderPos) {
          sampleCount++;
          const rawDelta = Math.hypot(rawPos.x - prevRawPos.x, rawPos.y - prevRawPos.y, rawPos.z - prevRawPos.z);
          const renderDelta = xform.position.distanceTo(prevRenderPos);

          rawDisplacementSq += rawDelta * rawDelta;
          renderDisplacementSq += renderDelta * renderDelta;
        }

        prevRenderPos = xform.position.clone();
        prevRawPos = { ...rawPos };
      }
    }

    const rawRms = Math.sqrt(rawDisplacementSq / sampleCount);
    const renderRms = Math.sqrt(renderDisplacementSq / sampleCount);
    const reductionPercent = ((rawRms - renderRms) / rawRms) * 100;

    expect(reductionPercent).toBeGreaterThanOrEqual(70);
  });

  it('Test 2: tracks genuine straight flight with responsiveness and bounded lag', () => {
    const filter = new RenderTrackMotionFilter();
    let timeMs = 1000;
    const speedMps = 25; // 25 m/s straight flight along +X
    let currentX = 500;

    let lastXform = filter.updateTrack(
      makeTrack({ pos: { x: currentX, y: 1000, z: 100 }, vel: { x: speedMps, y: 0, z: 0 } }),
      camera,
      520,
      48,
      timeMs
    );

    // Run for 3 seconds of flight
    for (let step = 0; step < 180; step++) {
      timeMs += 16.666;
      currentX += speedMps * 0.016666;
      const track = makeTrack({
        pos: { x: currentX, y: 1000, z: 100 },
        vel: { x: speedMps, y: 0, z: 0 },
      });
      lastXform = filter.updateTrack(track, camera, 520, 48, timeMs);
    }

    // Three.js X matches sim X
    const lagM = Math.abs(currentX - lastXform.position.x);
    // At 25 m/s, position lag with tau=0.09s is approx vel * tau = 25 * 0.09 = 2.25m (< 4.0m)
    expect(lagM).toBeLessThan(4.5);
    expect(lastXform.isMoving).toBe(true);
  });

  it('Test 3: enforces dual-threshold heading hysteresis to prevent needle spinning', () => {
    const filter = new RenderTrackMotionFilter();
    let timeMs = 1000;

    // Start with slow target at 1.5 m/s (below enter threshold 3.5 m/s)
    let xform = filter.updateTrack(
      makeTrack({ vel: { x: 1.5, y: 0, z: 0 } }),
      camera,
      520,
      48,
      timeMs
    );
    expect(xform.isMoving).toBe(false);
    const initialHeading = xform.headingRad;

    // Apply random velocity spikes below 3.5 m/s
    timeMs += 50;
    xform = filter.updateTrack(
      makeTrack({ vel: { x: -1.0, y: 2.0, z: 0 } }), // speed = 2.23 m/s < 3.5 m/s
      camera,
      520,
      48,
      timeMs
    );
    // Heading MUST remain completely frozen
    expect(xform.isMoving).toBe(false);
    expect(xform.headingRad).toBe(initialHeading);

    // Accelerate to 4.0 m/s (exceeds enter threshold 3.5 m/s)
    timeMs += 50;
    xform = filter.updateTrack(
      makeTrack({ vel: { x: 0, y: 4.0, z: 0 } }),
      camera,
      520,
      48,
      timeMs
    );
    expect(xform.isMoving).toBe(true);

    // Drop speed to 2.8 m/s (above exit threshold 2.0 m/s -> stays moving)
    timeMs += 50;
    xform = filter.updateTrack(
      makeTrack({ vel: { x: 0, y: 2.8, z: 0 } }),
      camera,
      520,
      48,
      timeMs
    );
    expect(xform.isMoving).toBe(true);

    // Drop speed to 1.2 m/s (below exit threshold 2.0 m/s -> stops moving)
    timeMs += 50;
    xform = filter.updateTrack(
      makeTrack({ vel: { x: 0, y: 1.2, z: 0 } }),
      camera,
      520,
      48,
      timeMs
    );
    expect(xform.isMoving).toBe(false);
  });

  it('Test 4: smoothly handles turn across +/- PI branch cut without full spin', () => {
    const filter = new RenderTrackMotionFilter();
    let timeMs = 1000;

    // Heading pointing near +PI (South-East, vel = {0.1, -20, 0})
    let xform = filter.updateTrack(
      makeTrack({ vel: { x: 0.1, y: -20, z: 0 } }),
      camera,
      520,
      48,
      timeMs
    );

    // Smoothly turn across branch cut to near -PI (South-West, vel = {-0.1, -20, 0})
    for (let i = 0; i < 20; i++) {
      timeMs += 16.666;
      xform = filter.updateTrack(
        makeTrack({ vel: { x: -0.1, y: -20, z: 0 } }),
        camera,
        520,
        48,
        timeMs
      );
    }

    // Heading magnitude must remain near PI without spinning around 0
    expect(Math.abs(xform.headingRad)).toBeGreaterThan(2.5);
  });

  it('Test 5: stabilizes noisy altitude without vertical bouncing', () => {
    const filter = new RenderTrackMotionFilter();
    let timeMs = 1000;

    let maxAltDelta = 0;
    let prevAlt = 100;

    for (let tick = 0; tick < 60; tick++) {
      timeMs += 50;
      // Sensor altitude jumps +/- 5m every tick
      const noisyAlt = 100 + (tick % 2 === 0 ? 5 : -5);
      const xform = filter.updateTrack(
        makeTrack({ pos: { x: 1000, y: 1000, z: noisyAlt } }),
        camera,
        520,
        48,
        timeMs
      );

      if (tick > 5) {
        const altDelta = Math.abs(xform.altitudeM - prevAlt);
        maxAltDelta = Math.max(maxAltDelta, altDelta);
      }
      prevAlt = xform.altitudeM;
    }

    // Rendered frame-to-frame vertical displacement is bounded
    expect(maxAltDelta).toBeLessThan(3.5);
  });

  it('Test 6: decouples screen-space scale and prevents scale pulsation', () => {
    const filter = new RenderTrackMotionFilter();
    let timeMs = 1000;

    let prevScale = 0;
    let scaleChangesCount = 0;

    for (let tick = 0; tick < 50; tick++) {
      timeMs += 50;
      // Position noisy by +/- 10m
      const noisyX = 2000 + (tick % 2 === 0 ? 10 : -10);
      const xform = filter.updateTrack(
        makeTrack({ pos: { x: noisyX, y: 2000, z: 80 } }),
        camera,
        520,
        48,
        timeMs
      );

      if (tick > 2) {
        if (Math.abs(xform.scale - prevScale) > 1e-4) {
          scaleChangesCount++;
        }
      }
      prevScale = xform.scale;
    }

    // With 3% deadband threshold, scale does not flicker every frame
    expect(scaleChangesCount).toBeLessThan(10);
  });

  it('Test 7: preserves transform continuity across sensor transitions', () => {
    const filter = new RenderTrackMotionFilter();
    let timeMs = 1000;

    // Start under RADAR (symbol size 34px)
    const track = makeTrack({ pos: { x: 1500, y: 1500, z: 80 }, vel: { x: 15, y: 15, z: 0 } });
    const radarXform = filter.updateTrack(track, camera, 520, 34, timeMs);

    // Operator switches to EO/IR (model size 48px)
    timeMs += 16.666;
    const eoirXform = filter.updateTrack(track, camera, 520, 48, timeMs);

    // Position must be continuous (no teleport)
    expect(eoirXform.position.distanceTo(radarXform.position)).toBeLessThan(1.0);
    // Heading must be continuous
    expect(Math.abs(eoirXform.headingRad - radarXform.headingRad)).toBeLessThan(0.1);
  });

  it('Test 8: prunes inactive tracks and resets internal state cleanly', () => {
    const filter = new RenderTrackMotionFilter();

    filter.updateTrack(makeTrack({ trackNo: 'T-01' }), camera, 520, 48);
    filter.updateTrack(makeTrack({ trackNo: 'T-02' }), camera, 520, 48);

    expect(filter.getTransform('T-01')).toBeDefined();
    expect(filter.getTransform('T-02')).toBeDefined();

    // Prune T-02
    filter.prune(new Set(['T-01']));
    expect(filter.getTransform('T-01')).toBeDefined();
    expect(filter.getTransform('T-02')).toBeUndefined();

    // Reset all
    filter.reset();
    expect(filter.getTransform('T-01')).toBeUndefined();
  });
});
