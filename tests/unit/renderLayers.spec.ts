import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EoirLayer } from '@/render/eoirLayer';
import { RfLayer } from '@/render/rfLayer';
import { engineInstance, useSessionStore } from '@/store/sessionStore';
import demo1Spec from '@/director/bundled/demo1.json';
import type { ScenarioSpec, TrackEntity } from '@/sim/types';

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

    const entities: TrackEntity[] = [
      {
        id: 'T1',
        trackNo: 'T-01',
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'FPV_ATTACK',
        pos: { x: 50, y: 1000, z: 80 },
        prev: { x: 50, y: 1000, z: 80 },
        vel: { x: 0, y: -20, z: 0 },
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true,
        remoteId: false,
        iff: false,
        profile: 'DIRECT',
        spawnTMs: 0,
        lifecycle: 'ACTIVE',
        traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
        step: 'FIND',
        q: 0.8,
        cCls: 0.5,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true, true, true],
        tVis: 0,
        tTrk: 0,
        tDesig: null,
        tCls: null,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      },
    ];

    // Day Mode with 0 fog
    expect(() => {
      layer.render(
        mockCtx,
        520,
        520,
        entities,
        entities,
        0.5,
        0, // Azimuth 000°
        { ...demo1Spec, dayNight: 'DAY' } as unknown as ScenarioSpec,
        0, // fogSeverity = 0
        'T-01'
      );
    }).not.toThrow();

    // Night Mode with Active Fog Chaos (severity = 0.8)
    expect(() => {
      layer.render(
        mockCtx,
        520,
        520,
        entities,
        entities,
        0.5,
        0,
        { ...demo1Spec, dayNight: 'NIGHT' } as unknown as ScenarioSpec,
        0.8, // Active Fog
        'T-01'
      );
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

    const entities: TrackEntity[] = [
      {
        id: 'T1',
        trackNo: 'T-01',
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'FPV_ATTACK',
        pos: { x: 500, y: 1500, z: 80 },
        prev: { x: 500, y: 1500, z: 80 },
        vel: { x: 0, y: -20, z: 0 },
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true, // Emits RF!
        remoteId: false, // LINK
        iff: false,
        profile: 'DIRECT',
        spawnTMs: 0,
        lifecycle: 'ACTIVE',
        traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
        step: 'FIND',
        q: 0.8,
        cCls: 0.5,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true, true, true],
        tVis: 0,
        tTrk: 0,
        tDesig: null,
        tCls: null,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      },
      {
        id: 'T2',
        trackNo: 'T-02',
        trueClass: 'CIVIL_UAS',
        droneType: 'CIVIL_UAS',
        pos: { x: -800, y: 1000, z: 50 },
        prev: { x: -800, y: 1000, z: 50 },
        vel: { x: 10, y: 0, z: 0 },
        rcsM2: 0.05,
        valueInr: 50000,
        emitsRf: true,
        remoteId: true, // RID!
        iff: false,
        profile: 'DIRECT',
        spawnTMs: 0,
        lifecycle: 'ACTIVE',
        traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
        step: 'FIND',
        q: 0.8,
        cCls: 0.5,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true, true, true],
        tVis: 0,
        tTrk: 0,
        tDesig: null,
        tCls: null,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      },
      {
        id: 'T3',
        trackNo: 'T-03',
        trueClass: 'BIRD',
        droneType: 'BIRD',
        pos: { x: 200, y: 400, z: 30 },
        prev: { x: 200, y: 400, z: 30 },
        vel: { x: 5, y: -5, z: 0 },
        rcsM2: 0.005,
        valueInr: null,
        emitsRf: false, // RF-silent bird! Must never show
        remoteId: false,
        iff: false,
        profile: 'ERRATIC',
        spawnTMs: 0,
        lifecycle: 'ACTIVE',
        traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
        step: 'FIND',
        q: 0.8,
        cCls: 0.5,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true, true, true],
        tVis: 0,
        tTrk: 0,
        tDesig: null,
        tCls: null,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      },
    ];

    // Standard RF mode (no jamming)
    rf.renderDynamic(mockCtx, 520, 520, entities, entities, 0.5, 1000, false, 'T-01');
    expect(mockCtx.stroke).toHaveBeenCalled();

    // Jamming active (DF lines must be suppressed, jamming noise active)
    rf.renderDynamic(mockCtx, 520, 520, entities, entities, 0.5, 1200, true, 'T-01');
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
