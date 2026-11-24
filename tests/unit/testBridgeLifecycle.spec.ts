import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimEngine } from '@/sim/engine';
import { TrackEstimator } from '@/sim/tracker';
import { installDrishtiTestBridge } from '@/testBridge/drishtiTestBridge';
import demo1Spec from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('DrishtiTestBridge Lifecycle & State Restoration', () => {
  let engine: SimEngine;
  let uninstall: (() => void) | null = null;
  let priorE2eBuild: unknown;
  let priorWindow: unknown;

  beforeEach(() => {
    priorE2eBuild = (globalThis as unknown as Record<string, unknown>).__DRISHTI_E2E_BUILD__;
    priorWindow = (globalThis as unknown as Record<string, unknown>).window;

    (globalThis as unknown as { __DRISHTI_E2E_BUILD__: boolean }).__DRISHTI_E2E_BUILD__ = true;
    (globalThis as unknown as { window: unknown }).window = globalThis;

    engine = new SimEngine();
    engine.load(demo1Spec as unknown as ScenarioSpec);
    // Step once to spawn initial active entities and produce sensor measurements / track estimates
    engine.step();
  });

  afterEach(() => {
    try {
      if (uninstall) {
        uninstall();
      }
    } finally {
      uninstall = null;
      if (priorE2eBuild === undefined) {
        delete (globalThis as unknown as Record<string, unknown>).__DRISHTI_E2E_BUILD__;
      } else {
        (globalThis as unknown as Record<string, unknown>).__DRISHTI_E2E_BUILD__ = priorE2eBuild;
      }
      if (priorWindow === undefined) {
        delete (globalThis as unknown as Record<string, unknown>).window;
      } else {
        (globalThis as unknown as Record<string, unknown>).window = priorWindow;
      }
      delete (globalThis as unknown as Record<string, unknown>).__DRISHTI_TEST__;
    }
  });

  it('guarantees pure overlay semantics, unmutated underlying estimator, clean clearOverrides restoration, prototype recovery upon uninstallation, and rejection of malformed inputs', () => {
    // 1. Initial State: Track estimate exists
    const estimates = engine.tracker.getAllEstimates();
    expect(estimates.length).toBeGreaterThan(0);
    const targetTrackNo = estimates[0].trackNo;

    const initialEstimate = engine.tracker.getTrackEstimate(targetTrackNo);
    expect(initialEstimate).toBeDefined();
    const origRange = initialEstimate!.estRangeM;
    const origPos = { ...initialEstimate!.estPos };
    const origSpeed = initialEstimate!.estSpeedMps;

    // 2. Install bridge
    uninstall = installDrishtiTestBridge(engine, () => null);
    const bridge = (globalThis as unknown as { __DRISHTI_TEST__: import('@/testBridge/drishtiTestBridge').DrishtiTestBridge }).__DRISHTI_TEST__;
    expect(bridge).toBeDefined();

    // Verify unmodified estimate returned immediately after bridge installation
    const preOvrEst = engine.tracker.getTrackEstimate(targetTrackNo);
    expect(preOvrEst).toBeDefined();
    expect(preOvrEst!.estRangeM).toBe(origRange);
    expect(preOvrEst!.estPos.x).toBe(origPos.x);

    // 3. Override track estimate with valid telemetry
    const ovrOk = bridge.overrideTrackEstimate(targetTrackNo, {
      estPos: { x: 332.34, y: 332.34, z: 50 },
      estVel: { x: 8.49, y: 8.49, z: 0 },
      estRangeM: 470.0,
      estBearingDeg: 45,
      estSpeedMps: 12,
      uncertaintyM: 20,
      isCoasting: false,
    });
    expect(ovrOk).toBe(true);

    // 4. Verify that:
    // - bridge.getOperatorTracks() reflects overridden values
    const opTracks = bridge.getOperatorTracks();
    const opTrack = opTracks.find((t) => t.trackNo === targetTrackNo);
    expect(opTrack).toBeDefined();
    expect(opTrack!.estRangeM).toBe(470.0);
    expect(opTrack!.estSpeedMps).toBe(12);
    expect(opTrack!.estBearingDeg).toBe(45);
    expect(opTrack!.estPos.x).toBe(332.34);

    // - engine.tracker.getTrackEstimate(trackNo) reflects overridden values
    const overlaidEst = engine.tracker.getTrackEstimate(targetTrackNo);
    expect(overlaidEst).toBeDefined();
    expect(overlaidEst!.estRangeM).toBe(470.0);
    expect(overlaidEst!.estSpeedMps).toBe(12);

    // - The underlying estimator's internal state (accessed directly via TrackEstimator.prototype) is NOT mutated
    const underlyingEst = TrackEstimator.prototype.getTrackEstimate.call(engine.tracker, targetTrackNo);
    expect(underlyingEst).toBeDefined();
    expect(underlyingEst!.estRangeM).toBe(origRange);
    expect(underlyingEst!.estPos.x).toBe(origPos.x);
    expect(underlyingEst!.estSpeedMps).toBe(origSpeed);
    expect(underlyingEst!.estRangeM).not.toBe(470.0);

    // 5. Call clearOverrides()
    bridge.clearOverrides();

    // 6. Verify that:
    // - engine.tracker.getTrackEstimate(trackNo) immediately returns original, unmodified track estimate
    const restoredEst = engine.tracker.getTrackEstimate(targetTrackNo);
    expect(restoredEst).toBeDefined();
    expect(restoredEst!.estRangeM).toBe(origRange);
    expect(restoredEst!.estPos.x).toBe(origPos.x);
    expect(restoredEst!.estSpeedMps).toBe(origSpeed);
    expect(restoredEst!.estRangeM).not.toBe(470.0);

    // - bridge.getOperatorTracks() immediately returns original, unmodified track view
    const restoredOpTracks = bridge.getOperatorTracks();
    const restoredOpTrack = restoredOpTracks.find((t) => t.trackNo === targetTrackNo);
    expect(restoredOpTrack).toBeDefined();
    expect(restoredOpTrack!.estRangeM).toBe(origRange);
    expect(restoredOpTrack!.estRangeM).not.toBe(470.0);

    // Apply fresh override to verify uninstallation clears it
    bridge.overrideTrackEstimate(targetTrackNo, { estRangeM: 888.0 });
    expect(engine.tracker.getTrackEstimate(targetTrackNo)?.estRangeM).toBe(888.0);

    // 7. Uninstall the bridge
    uninstall();
    uninstall = null;

    // 8. Verify that:
    // - engine.tracker own properties deleted and restored to TrackEstimator.prototype
    expect(Object.prototype.hasOwnProperty.call(engine.tracker, 'getTrackEstimate')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(engine.tracker, 'getOperatorTracks')).toBe(false);
    expect(engine.tracker.getTrackEstimate).toBe(TrackEstimator.prototype.getTrackEstimate);
    expect(engine.tracker.getOperatorTracks).toBe(TrackEstimator.prototype.getOperatorTracks);

    // - window.__DRISHTI_TEST__ is reset to null
    expect((globalThis as unknown as { __DRISHTI_TEST__?: unknown }).__DRISHTI_TEST__).toBeNull();

    // - Subsequent re-installation works cleanly without error or state bleed
    uninstall = installDrishtiTestBridge(engine, () => null);
    const bridge2 = (globalThis as unknown as { __DRISHTI_TEST__: import('@/testBridge/drishtiTestBridge').DrishtiTestBridge }).__DRISHTI_TEST__;
    expect(bridge2).toBeDefined();
    expect(bridge2.getOperatorTracks().find((t) => t.trackNo === targetTrackNo)?.estRangeM).toBe(origRange);
    uninstall();
    uninstall = null;
    expect(Object.prototype.hasOwnProperty.call(engine.tracker, 'getTrackEstimate')).toBe(false);

    // 9. Malformed input rejection tests
    uninstall = installDrishtiTestBridge(engine, () => null);
    const bridge3 = (globalThis as unknown as { __DRISHTI_TEST__: import('@/testBridge/drishtiTestBridge').DrishtiTestBridge }).__DRISHTI_TEST__;

    // Non-string or empty trackNo
    expect(bridge3.overrideTrackEstimate('', { estRangeM: 100 })).toBe(false);
    expect((bridge3.overrideTrackEstimate as (t: unknown, o: unknown) => boolean)(null, { estRangeM: 100 })).toBe(false);

    // Negative range
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { estRangeM: -10 })).toBe(false);
    // Non-finite range
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { estRangeM: NaN })).toBe(false);
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { estRangeM: Infinity })).toBe(false);

    // Negative speed
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { estSpeedMps: -5 })).toBe(false);
    // Non-finite speed
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { estSpeedMps: NaN })).toBe(false);

    // Negative uncertainty
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { uncertaintyM: -1 })).toBe(false);
    // Non-finite uncertainty
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { uncertaintyM: Infinity })).toBe(false);

    // Non-finite coordinates
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { estPos: { x: NaN, y: 10, z: 10 } })).toBe(false);
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { estPos: { x: 10, y: Infinity, z: 10 } })).toBe(false);
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { estPos: { x: 10, y: 10, z: NaN } })).toBe(false);

    // Non-finite velocities
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { estVel: { x: NaN, y: 0, z: 0 } })).toBe(false);

    // Non-finite bearing
    expect(bridge3.overrideTrackEstimate(targetTrackNo, { estBearingDeg: NaN })).toBe(false);

    // Non-boolean isCoasting
    expect((bridge3.overrideTrackEstimate as (t: string, o: unknown) => boolean)(targetTrackNo, { isCoasting: 'true' })).toBe(false);

    // Non-object override
    expect((bridge3.overrideTrackEstimate as (t: string, o: unknown) => boolean)(targetTrackNo, 'invalid')).toBe(false);

    uninstall();
    uninstall = null;
  });
});
