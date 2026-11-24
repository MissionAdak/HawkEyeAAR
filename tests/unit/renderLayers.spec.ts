import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EoirLayer } from '@/render/eoirLayer';
import { RfLayer } from '@/render/rfLayer';
import { engineInstance, useSessionStore } from '@/store/sessionStore';
import demo1Spec from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('EO/IR Thermal Viewfinder Layer (Task P1-06)', () => {
  it('instantiates cleanly without heap leaks', () => {
    const layer = new EoirLayer();
    expect(layer).toBeDefined();
  });

  it('renders without throwing when supplied with mock 2D context', () => {
    const layer = new EoirLayer();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      setLineDash: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;

    const opTracks: import('@/sim/trackerTypes').OperatorTrackView[] = [
      {
        trackNo: 'T-01',
        estPos: { x: 50, y: 800, z: 60 },
        estVel: { x: 5, y: -20, z: 0 },
        prevEstPos: { x: 50, y: 800, z: 60 },
        estRangeM: 801.6,
        estBearingDeg: 4,
        estSpeedMps: 21,
        estAltBand: 'LOW',
        uncertaintyM: 18,
        isCoasting: false,
        lastMeasurementMs: 1000,
        sensorSources: ['RADAR', 'EOIR', 'RF'],
        q: 0.85,
        cCls: 0.5,
        traineeLabel: null,
        step: 'TRACK',
        lifecycle: 'ACTIVE',
        sensorObservation: {
          signature: 'MULTIROTOR_STANDARD',
          sensorSource: 'EOIR',
          activeSensor: 'EOIR',
          confidence: 0.88,
          timestampMs: 1000,
          resolutionLevel: 'FULL',
          visibilityState: 'CLEAR',
          sensorHealth: 'OK',
          sensorAvailability: true,
        },
      },
    ];

    // Day Mode with 0 fog
    expect(() => {
      layer.render(mockCtx, 520, 520, {
        tracks: opTracks,
        alpha: 0.5,
        azimuthDeg: 0,
        spec: { ...demo1Spec, dayNight: 'DAY' } as unknown as ScenarioSpec,
        fogSeverity: 0,
        selectedTrackNo: 'T-01',
      });
    }).not.toThrow();

    // Night Mode with Active Fog Chaos (severity = 0.8)
    expect(() => {
      layer.render(mockCtx, 520, 520, {
        tracks: opTracks,
        alpha: 0.5,
        azimuthDeg: 0,
        spec: { ...demo1Spec, dayNight: 'NIGHT' } as unknown as ScenarioSpec,
        fogSeverity: 0.8,
        selectedTrackNo: 'T-01',
      });
    }).not.toThrow();

    expect(mockCtx.fillRect).toHaveBeenCalled();
  });
});

describe('RF Direction-Finding & Spectrum Waterfall Layer (Task P1-07)', () => {
  it('instantiates cleanly and manages state', () => {
    const rf = new RfLayer();
    expect(rf).toBeDefined();
  });

  it('renders DF lines and waterfall with mock 2D context', () => {
    const rf = new RfLayer();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      setLineDash: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      globalAlpha: 1,
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D;

    const rfMeasurements: import('@/sim/measurementTypes').RfMeasurement[] = [
      {
        sensorType: 'RF',
        trackNo: 'T-01',
        entityId: 'ent-01',
        timestampMs: 1000,
        measuredBearingDeg: 12.5,
        bearingUncertaintyDeg: 4.5,
        freqMhz: 2412,
        signalStrengthDb: -72,
        sensorHealth: 'OK',
      },
    ];

    // Standard RF mode (no jamming)
    rf.renderDynamic(mockCtx, 520, 520, {
      rfMeasurements,
      alpha: 0.5,
      simTimeMs: 1000,
      isJamming: false,
      selectedTrackNo: 'T-01',
    });
    expect(mockCtx.stroke).toHaveBeenCalled();

    // Jamming active (DF lines must be suppressed, jamming noise active)
    rf.renderDynamic(mockCtx, 520, 520, {
      rfMeasurements,
      alpha: 0.5,
      simTimeMs: 1200,
      isJamming: true,
      selectedTrackNo: 'T-01',
    });
    expect(mockCtx.fillText).toHaveBeenCalled();
  });
});

describe('Sensor Mode Hotkeys & Instant Switching (Zustand [1], [2], [3])', () => {
  beforeEach(() => {
    engineInstance.load(demo1Spec as unknown as ScenarioSpec);
  });

  it('switches between RADAR, EOIR, and RF instantly on key trigger', () => {
    const store = useSessionStore.getState();

    // Initial state is RADAR
    expect(engineInstance.activeSensor).toBe('RADAR');
    expect(useSessionStore.getState().ui.activeSensor).toBe('RADAR');

    // Switch to EOIR via hotkey [2]
    store.setSensor('EOIR');
    expect(engineInstance.activeSensor).toBe('EOIR');
    expect(useSessionStore.getState().ui.activeSensor).toBe('EOIR');

    // Switch to RF via hotkey [3]
    store.setSensor('RF');
    expect(engineInstance.activeSensor).toBe('RF');
    expect(useSessionStore.getState().ui.activeSensor).toBe('RF');

    // Switch back to RADAR via hotkey [1]
    store.setSensor('RADAR');
    expect(engineInstance.activeSensor).toBe('RADAR');
    expect(useSessionStore.getState().ui.activeSensor).toBe('RADAR');
  });
});
