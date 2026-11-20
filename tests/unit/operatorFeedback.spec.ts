import { describe, it, expect } from 'vitest';
import {
  createOperatorFeedback,
  shouldThrottleFeedback,
  type OperatorFeedback,
} from '@/sim/operatorFeedback';
import { SimEngine } from '@/sim/engine';
import demo1Json from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('Intelligent Tactical Operator Feedback (Task 17 Phase 6)', () => {
  it('generates structured feedback for Q_MIN_VIOLATION with actual vs required metrics', () => {
    const fb = createOperatorFeedback({
      category: 'RELEASE_BLOCKED',
      reasonCode: 'Q_MIN_VIOLATION',
      timestampMs: 5000,
      trackNo: 'TRK-01',
      effectorId: 'GUN',
      targetQ: 0.45,
    });

    expect(fb.category).toBe('RELEASE_BLOCKED');
    expect(fb.severity).toBe('ERROR');
    expect(fb.reasonCode).toBe('Q_MIN_VIOLATION');
    expect(fb.title).toContain('INSUFFICIENT TRACK QUALITY');
    expect(fb.explanation).toContain('45%');
    expect(fb.measured?.actual).toBe('45%');
    expect(fb.measured?.required).toBe('60%');
    expect(fb.recommendedAction).toBeDefined();
  });

  it('generates structured feedback for PNR_VIOLATION with range metrics', () => {
    const fb = createOperatorFeedback({
      category: 'RELEASE_BLOCKED',
      reasonCode: 'PNR_VIOLATION',
      timestampMs: 6000,
      trackNo: 'TRK-02',
      effectorId: 'MISSILE',
      rangeM: 350,
    });

    expect(fb.category).toBe('RELEASE_BLOCKED');
    expect(fb.severity).toBe('ERROR');
    expect(fb.reasonCode).toBe('PNR_VIOLATION');
    expect(fb.title).toContain('RELEASE WINDOW CLOSED');
    expect(fb.measured?.actual).toBe('~0.35 km');
    expect(fb.measured?.required).toContain('0.50 km');
  });

  it('omits measured range telemetry completely when no estimate exists rather than falling back to ground truth', () => {
    const fbPnr = createOperatorFeedback({
      category: 'RELEASE_BLOCKED',
      reasonCode: 'PNR_VIOLATION',
      timestampMs: 6000,
      trackNo: 'TRK-NO-EST',
      effectorId: 'MISSILE',
      rangeM: undefined,
    });
    expect(fbPnr.measured).toBeUndefined();
    expect(fbPnr.explanation).toContain('no-release boundary');

    const fbEnvelope = createOperatorFeedback({
      category: 'RELEASE_BLOCKED',
      reasonCode: 'OUT_OF_ENVELOPE',
      timestampMs: 7000,
      trackNo: 'TRK-NO-EST',
      effectorId: 'GUN',
      rangeM: undefined,
    });
    expect(fbEnvelope.measured).toBeUndefined();
    expect(fbEnvelope.explanation).toContain('outside effective engagement envelope');
  });

  it('generates structured feedback for OUT_OF_ENVELOPE', () => {
    const fb = createOperatorFeedback({
      category: 'RELEASE_BLOCKED',
      reasonCode: 'OUT_OF_ENVELOPE',
      timestampMs: 7000,
      trackNo: 'TRK-03',
      effectorId: 'GUN',
      rangeM: 4000, // Gun max range is 1.5km
    });

    expect(fb.category).toBe('RELEASE_BLOCKED');
    expect(fb.reasonCode).toBe('OUT_OF_ENVELOPE');
    expect(fb.title).toContain('OUTSIDE EFFECTOR ENVELOPE');
    expect(fb.explanation).toContain('maximum effective range');
  });

  it('generates feedback for RF jamming and RF silent targets', () => {
    const fbJamming = createOperatorFeedback({
      category: 'RELEASE_BLOCKED',
      reasonCode: 'RF_JAMMING_ACTIVE',
      timestampMs: 8000,
      trackNo: 'TRK-04',
      effectorId: 'RF_SOFTKILL',
    });
    expect(fbJamming.title).toContain('RF CHANNEL JAMMED');
    expect(fbJamming.recommendedAction).toContain('kinetic');

    const fbSilent = createOperatorFeedback({
      category: 'RELEASE_BLOCKED',
      reasonCode: 'RF_SILENT_TARGET',
      timestampMs: 8500,
      trackNo: 'TRK-05',
      effectorId: 'RF_SOFTKILL',
    });
    expect(fbSilent.title).toContain('NO USABLE RF CUE');
  });

  it('generates soft ROE warning feedback', () => {
    const fb = createOperatorFeedback({
      category: 'ROE_WARNING',
      reasonCode: 'ROE_CONFIRMATION_REQUIRED',
      timestampMs: 9000,
      trackNo: 'TRK-06',
      effectorId: 'MISSILE',
    });

    expect(fb.category).toBe('ROE_WARNING');
    expect(fb.severity).toBe('WARNING');
    expect(fb.title).toContain('ROE VERIFICATION REQUIRED');
  });

  it('generates neutralization indicated and unsuccessful engagement feedback', () => {
    const fbSuccess = createOperatorFeedback({
      category: 'NEUTRALIZATION_INDICATED',
      reasonCode: 'TARGET_NEUTRALISED',
      timestampMs: 10000,
      trackNo: 'TRK-07',
      effectorId: 'GUN',
    });
    expect(fbSuccess.category).toBe('NEUTRALIZATION_INDICATED');
    expect(fbSuccess.severity).toBe('SUCCESS');
    expect(fbSuccess.title).toContain('NEUTRALIZATION INDICATED');

    const fbFailed = createOperatorFeedback({
      category: 'ENGAGEMENT_UNSUCCESSFUL',
      reasonCode: 'ENGAGEMENT_INEFFECTIVE',
      timestampMs: 10500,
      trackNo: 'TRK-07',
      effectorId: 'GUN',
    });
    expect(fbFailed.category).toBe('ENGAGEMENT_UNSUCCESSFUL');
    expect(fbFailed.severity).toBe('WARNING');
    expect(fbFailed.title).toContain('ENGAGEMENT UNSUCCESSFUL');
  });

  it('throttles repetitive feedback spam within 1.5s window', () => {
    const recent: OperatorFeedback[] = [
      {
        id: 'fb-1',
        timestampMs: 5000,
        category: 'RELEASE_BLOCKED',
        severity: 'ERROR',
        title: 'TEST',
        explanation: 'TEST',
        trackNo: 'TRK-01',
        reasonCode: 'Q_MIN_VIOLATION',
      },
    ];

    // Same track, same reason within 1.0s -> throttle
    const throttled = shouldThrottleFeedback('TRK-01', 'Q_MIN_VIOLATION', 5800, recent);
    expect(throttled).toBe(true);

    // Different track within 1.0s -> do not throttle
    const notThrottledDiffTrack = shouldThrottleFeedback('TRK-02', 'Q_MIN_VIOLATION', 5800, recent);
    expect(notThrottledDiffTrack).toBe(false);

    // Same track, different reason -> do not throttle
    const notThrottledDiffReason = shouldThrottleFeedback('TRK-01', 'PNR_VIOLATION', 5800, recent);
    expect(notThrottledDiffReason).toBe(false);

    // Same track, same reason after 2.0s -> do not throttle
    const notThrottledTimePassed = shouldThrottleFeedback('TRK-01', 'Q_MIN_VIOLATION', 7500, recent);
    expect(notThrottledTimePassed).toBe(false);
  });

  it('engine handleFire uses estimated range rather than exact target range for operator feedback', () => {
    const engine = new SimEngine();
    engine.load(demo1Json as unknown as ScenarioSpec);

    // Step until a track is active
    for (let i = 0; i < 20; i++) {
      engine.step();
    }

    const track = engine.curr.find((e) => e.trackNo && e.lifecycle === 'ACTIVE');
    expect(track).toBeDefined();
    const trackNo = track!.trackNo!;

    // Artificially close the track step to trigger PNR_VIOLATION on fire
    track!.step = 'CLOSED';

    // Set up a distinct estimate: exact ground truth vs estimated position/range
    const trueRange = Math.hypot(track!.pos.x, track!.pos.y);
    const est = engine.tracker.getTrackEstimate(trackNo);
    expect(est).toBeDefined();
    // Offset estimated position so derived range differs from trueRange
    est!.estPos.x += 300;
    est!.estRangeM = Number(Math.hypot(est!.estPos.x, est!.estPos.y).toFixed(1));
    const expectedEstRange = est!.estRangeM;
    const expectedKmStr = (expectedEstRange / 1000).toFixed(2);
    const trueKmStr = (trueRange / 1000).toFixed(2);
    expect(expectedKmStr).not.toBe(trueKmStr);

    let emittedFeedback: OperatorFeedback | null = null;
    engine.onFeedback = (fb) => {
      emittedFeedback = fb;
    };

    // Issue FIRE action directly
    engine.inputQueue.push({
      tRawMs: 1500,
      applyTick: engine.tickIndex,
      action: { type: 'FIRE', trackNo },
    });
    engine.step();

    expect(emittedFeedback).toBeDefined();
    const fb = emittedFeedback as unknown as OperatorFeedback;
    expect(fb.reasonCode).toBe('PNR_VIOLATION');
    expect(fb.explanation).toContain(expectedKmStr);
    expect(fb.explanation).not.toContain(trueKmStr);
    expect(fb.measured?.actual).toContain(expectedKmStr);
    expect(fb.measured?.actual).not.toContain(trueKmStr);
  });
});
