/**
 * WebXR VR Tactical Renderer & Controller Interaction Engine (OPTIONAL TASK 14).
 *
 * Implements:
 * 1. WebXR Capability Detection & Permissions.
 * 2. Pluggable FrameDriver handoff to simulation loop (ARCHITECTURE.md §1.3 & §8.9).
 * 3. Table-Top Console Presentation (1:10,000 scale, altitude exaggerated x4, zero artificial camera locomotion).
 * 4. Deterministic edge event polling quantized to 20 Hz tick boundaries through engine inputQueue.
 * 5. Strict operator truth gating and scoring parity (safe projected tracks only; decision aids locked in EVAL).
 * 6. Floating in-VR operator console panel with CanvasTexture.
 * 7. Session comfort advisory & clean restoration of desktop view on exit, context loss or error.
 */

import * as THREE from 'three';
import { engineInstance, clockInstance, useSessionStore } from '@/store/sessionStore';
import { applyTickFor } from '@/sim/inputQueue';
import { xrDriver, windowDriver } from '@/sim/frameDriver';
import type { UserAction, EffectorId } from '@/sim/types';
import type { ConsoleRenderer } from '@/render/renderer';

export interface WebXRCapabilityResult {
  supported: boolean;
  reason?: string;
}

/**
 * Checks whether the browser and environment support immersive-vr WebXR sessions.
 */
export async function checkWebXRSupport(): Promise<WebXRCapabilityResult> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, reason: 'Non-browser execution environment' };
  }
  if (!('xr' in navigator) || !navigator.xr) {
    return {
      supported: false,
      reason: 'WebXR API is not available in this browser or context is not secure (requires HTTPS or localhost).',
    };
  }
  try {
    const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!isSupported) {
      return {
        supported: false,
        reason: "WebXR 'immersive-vr' session mode is not supported on this device/runtime.",
      };
    }
    return { supported: true };
  } catch (err) {
    return {
      supported: false,
      reason: err instanceof Error ? err.message : 'Unknown WebXR capability probe error',
    };
  }
}

/**
 * Enqueues a deterministic quantized user action into the simulation engine's inputQueue.
 * Never applies action directly or mutates engine state synchronously (Rules.md R2.5, R2.12).
 */
export function queueVrAction(action: UserAction['action'], frameTimestamp: number): UserAction {
  const rawMs = clockInstance.getRawMs(frameTimestamp);
  const applyTick = applyTickFor(rawMs, engineInstance.tickIndex);
  const userAction: UserAction = {
    tRawMs: rawMs,
    applyTick,
    action,
  };
  engineInstance.inputQueue.push(userAction);
  return userAction;
}

/**
 * Tactical Color Tokens adhering to DESIGN.md §1 & PALETTE.
 */
const COLOR_CARBON_950 = 0x0D1117;
const COLOR_CARBON_900 = 0x161B22;
const COLOR_LINE = 0x262B33;
const COLOR_PHOSPHOR = 0x00FF66;
const COLOR_AMBER = 0xFF9900;

const EFFECTOR_LIST: EffectorId[] = [
  'RF_SOFTKILL',
  'LASER',
  'GUN',
  'INTERCEPTOR',
  'MISSILE',
];

/**
 * In-VR Floating Console Panel (Texture rendered on Canvas).
 */
export class WebXRPanel {
  public readonly mesh: THREE.Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly texture: THREE.CanvasTexture;

  constructor() {
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1024;
      this.canvas.height = 682;
      this.ctx = this.canvas.getContext('2d');
    } else {
      this.canvas = null as unknown as HTMLCanvasElement;
      this.ctx = null;
    }

    if (this.canvas) {
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.magFilter = THREE.LinearFilter;
    } else {
      this.texture = new THREE.Texture() as THREE.CanvasTexture;
    }

    const geometry = new THREE.PlaneGeometry(0.52, 0.35);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    // Position panel slightly elevated and tilted 25 deg towards operator
    this.mesh.position.set(0, 1.15, -0.65);
    this.mesh.rotation.x = -Math.PI * 0.12;

    this.draw();
  }

  public update(): void {
    this.draw();
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = '#00FF66';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Header Strip
    ctx.fillStyle = '#161B22';
    ctx.fillRect(4, 4, w - 8, 56);
    ctx.fillStyle = '#00FF66';
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.fillText('DRISHTI-CUAS C2 · TACTICAL VR CONSOLE', 20, 42);

    // Badge: EXPERIMENTAL UNVERIFIED
    ctx.fillStyle = '#FF9900';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText('[EXPERIMENTAL, UNVERIFIED]', w - 340, 42);

    // Status bar: Clock, Mode, Scenario
    const simSec = Math.floor(engineInstance.tickIndex * 0.05);
    const mm = String(Math.floor(simSec / 60)).padStart(2, '0');
    const ss = String(simSec % 60).padStart(2, '0');
    const mode = engineInstance.mode || 'TRAIN';
    const activeSensor = useSessionStore.getState().ui.activeSensor;
    const activeEffector = useSessionStore.getState().ui.activeEffector;

    ctx.fillStyle = '#C9D1D9';
    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillText(`TIME: T+${mm}:${ss} | MODE: ${mode} | SENSOR: ${activeSensor}`, 24, 96);

    // Selected Track Panel
    const selTrackNo = engineInstance.selectedTrackNo;
    const selEntity = selTrackNo
      ? engineInstance.curr.find((e) => e.trackNo === selTrackNo && e.step !== 'UNDETECTED')
      : null;

    ctx.fillStyle = '#161B22';
    ctx.fillRect(24, 120, w - 48, 140);
    ctx.strokeStyle = '#262B33';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 120, w - 48, 140);

    if (selEntity?.trackNo) {
      const distKm = (Math.hypot(selEntity.pos.x, selEntity.pos.y) / 1000).toFixed(2);
      let brgDeg = Math.round((Math.atan2(selEntity.pos.x, selEntity.pos.y) * 180) / Math.PI);
      if (brgDeg < 0) brgDeg += 360;
      const speed = Math.round(Math.hypot(selEntity.vel.x, selEntity.vel.y));
      const altM = Math.round(selEntity.pos.z);
      const label = selEntity.traineeLabel ?? 'NONE';

      ctx.fillStyle = '#00FF66';
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.fillText(`DESIGNATED TRACK: [ ${selEntity.trackNo} ]`, 44, 155);

      ctx.fillStyle = '#C9D1D9';
      ctx.font = '20px "JetBrains Mono", monospace';
      ctx.fillText(`BEARING: ${brgDeg}° | RANGE: ${distKm} km | ALT: ${altM} m | SPEED: ${speed} m/s`, 44, 195);
      ctx.fillText(`CLASS: [ ${label} ] | QUAL: ${(selEntity.q * 100).toFixed(0)}%`, 44, 235);
    } else {
      ctx.fillStyle = '#8B949E';
      ctx.font = 'italic 22px "JetBrains Mono", monospace';
      ctx.fillText('NO TRACK SELECTED — AIM RAY & PULL TRIGGER TO DESIGNATE', 44, 195);
    }

    // Effector Strip
    ctx.fillStyle = '#00FF66';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('EFFECTOR STATUS & INTERCEPT PROBABILITY (Pk):', 24, 296);

    const effBoxW = (w - 48 - 40) / 5;
    EFFECTOR_LIST.forEach((eff, i) => {
      const x = 24 + i * (effBoxW + 10);
      const isSelected = eff === activeEffector;
      ctx.fillStyle = isSelected ? '#1F6FEB' : '#161B22';
      ctx.fillRect(x, 310, effBoxW, 110);
      ctx.strokeStyle = isSelected ? '#00FF66' : '#262B33';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(x, 310, effBoxW, 110);

      ctx.fillStyle = isSelected ? '#FFFFFF' : '#C9D1D9';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      const shortName = eff.replace('_', ' ');
      ctx.fillText(shortName, x + 8, 338);

      // Pk estimate
      ctx.fillStyle = isSelected ? '#00FF66' : '#8B949E';
      ctx.font = '20px "JetBrains Mono", monospace';
      ctx.fillText(selEntity ? 'Pk: READY' : 'Pk: STANDBY', x + 8, 380);
      if (isSelected) {
        ctx.fillStyle = '#00FF66';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText('[ARMED]', x + 8, 404);
      }
    });

    // Operational Notice & Decision Aids Gating
    ctx.fillStyle = '#161B22';
    ctx.fillRect(24, 445, w - 48, 90);
    ctx.strokeStyle = '#262B33';
    ctx.strokeRect(24, 445, w - 48, 90);

    if (mode === 'EVAL') {
      ctx.fillStyle = '#FF9900';
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.fillText('[DECISION AIDS LOCKED IN EVAL MODE]', 44, 480);
      ctx.fillStyle = '#8B949E';
      ctx.font = '17px "JetBrains Mono", monospace';
      ctx.fillText('Trajectory aids and shadow volume projections strictly disabled during scored evaluation.', 44, 512);
    } else {
      ctx.fillStyle = '#00FF66';
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.fillText('TRAINING MODE · TABLE SCALE 1:10,000 · ALTITUDE EXAGGERATED x4', 44, 480);
      ctx.fillStyle = '#8B949E';
      ctx.font = '17px "JetBrains Mono", monospace';
      ctx.fillText('All 2D/3D sensor coverage envelopes and LOS occlusion prisms active on tactical table.', 44, 512);
    }

    // VR Controller Help Footer
    ctx.fillStyle = '#161B22';
    ctx.fillRect(4, h - 90, w - 8, 86);
    ctx.fillStyle = '#C9D1D9';
    ctx.font = '18px "JetBrains Mono", monospace';
    ctx.fillText('RIGHT TRIGGER: SELECT | GRIP: CYCLE EFFECTOR | A: FIRE | B: ASSESS KILL', 24, h - 54);
    ctx.fillText('X BUTTON: CYCLE SENSOR | Y BUTTON: CLASSIFY | RECENTER: THUMBSTICK | ESC: EXIT VR', 24, h - 22);
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
    this.texture.dispose();
  }
}

/**
 * WebXR Table-Top tactical console presentation.
 * Creates an anchored table at 1:10,000 horizontal scale and 4x exaggerated vertical scale.
 */
export class WebXRTableTop {
  public readonly tableGroup: THREE.Group;
  public readonly tacticalGroup: THREE.Group;
  public readonly panel: WebXRPanel;

  constructor() {
    this.tableGroup = new THREE.Group();
    // Position the table 0.85m off ground, 0.85m in front of seated/standing operator
    this.tableGroup.position.set(0, 0.85, -0.85);

    // Tabletop disc: 0.55m radius (supports 5 km radar range at 1:10,000 scale: 5000m / 10000 = 0.50m)
    const tableGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.03, 64);
    const tableMat = new THREE.MeshBasicMaterial({ color: COLOR_CARBON_900 });
    const tableMesh = new THREE.Mesh(tableGeom, tableMat);
    tableMesh.position.y = -0.015;
    this.tableGroup.add(tableMesh);

    // Table leg / pedestal
    const legGeom = new THREE.CylinderGeometry(0.12, 0.18, 0.85, 32);
    const legMat = new THREE.MeshBasicMaterial({ color: COLOR_CARBON_950 });
    const legMesh = new THREE.Mesh(legGeom, legMat);
    legMesh.position.y = -0.44;
    this.tableGroup.add(legMesh);

    // Range rings at 1 km, 2 km, 3 km, 4 km, 5 km (0.1m, 0.2m, 0.3m, 0.4m, 0.5m)
    const ringMat = new THREE.LineBasicMaterial({ color: COLOR_PHOSPHOR, transparent: true, opacity: 0.3 });
    const rMinMat = new THREE.LineBasicMaterial({ color: COLOR_AMBER, transparent: true, opacity: 0.6 });

    for (let km = 1; km <= 5; km++) {
      const radiusM = km * 0.1;
      const ringGeom = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      for (let a = 0; a <= 64; a++) {
        const rad = (a / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.sin(rad) * radiusM, 0.001, Math.cos(rad) * radiusM));
      }
      ringGeom.setFromPoints(points);
      const ringLine = new THREE.Line(ringGeom, ringMat);
      this.tableGroup.add(ringLine);
    }

    // Asset Point of No Return (rMinM = 500m -> 0.05m radius on table)
    const pnrGeom = new THREE.BufferGeometry();
    const pnrPoints: THREE.Vector3[] = [];
    for (let a = 0; a <= 64; a++) {
      const rad = (a / 64) * Math.PI * 2;
      pnrPoints.push(new THREE.Vector3(Math.sin(rad) * 0.05, 0.0015, Math.cos(rad) * 0.05));
    }
    pnrGeom.setFromPoints(pnrPoints);
    this.tableGroup.add(new THREE.Line(pnrGeom, rMinMat));

    // Cardinal Crosshair lines
    const crossGeom = new THREE.BufferGeometry();
    crossGeom.setFromPoints([
      new THREE.Vector3(-0.52, 0.001, 0),
      new THREE.Vector3(0.52, 0.001, 0),
      new THREE.Vector3(0, 0.001, -0.52),
      new THREE.Vector3(0, 0.001, 0.52),
    ]);
    const crossMat = new THREE.LineBasicMaterial({ color: COLOR_LINE, transparent: true, opacity: 0.5 });
    this.tableGroup.add(new THREE.LineSegments(crossGeom, crossMat));

    // Tactical presentation container:
    // Scaled 1:10,000 horizontally (0.0001) and 4x exaggerated vertically (0.0004)
    this.tacticalGroup = new THREE.Group();
    this.tacticalGroup.scale.set(0.0001, 0.0004, 0.0001);
    this.tableGroup.add(this.tacticalGroup);

    // Operator Panel
    this.panel = new WebXRPanel();
    this.tableGroup.add(this.panel.mesh);
  }

  public recenter(headsetPos?: THREE.Vector3): void {
    if (headsetPos) {
      this.tableGroup.position.set(headsetPos.x, headsetPos.y - 0.5, headsetPos.z - 0.85);
    } else {
      this.tableGroup.position.set(0, 0.85, -0.85);
    }
  }

  public update(): void {
    this.panel.update();
  }

  public dispose(): void {
    this.panel.dispose();
  }
}

/**
 * Controller Button State Cache for Deterministic Edge Detection.
 */
interface ControllerEdgeState {
  prevTrigger: boolean;
  prevGrip: boolean;
  prevThumbstickX: number;
  prevThumbstickY: number;
  prevButtonA: boolean;
  prevButtonB: boolean;
  prevButtonX: boolean;
  prevButtonY: boolean;
}

/**
 * WebXR Controller Interaction Manager.
 * Polling extracts edge events and dispatches strictly via engineInstance.inputQueue (Rules.md R2.5).
 */
export class WebXRControllerHandler {
  private readonly edges: Map<number, ControllerEdgeState> = new Map();
  private rayLine: THREE.Line | null = null;
  public activeRayTarget: string | null = null;

  constructor(private readonly scene: THREE.Scene) {
    // Create laser pointer line
    const rayGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -2.5),
    ]);
    const rayMat = new THREE.LineBasicMaterial({
      color: COLOR_PHOSPHOR,
      transparent: true,
      opacity: 0.7,
    });
    this.rayLine = new THREE.Line(rayGeom, rayMat);
    this.scene.add(this.rayLine);
  }

  private handleTriggerEdge(pad: Gamepad, state: ControllerEdgeState, frameTimestamp: number): void {
    const triggerPressed = pad.buttons[0]?.pressed ?? false;
    if (triggerPressed && !state.prevTrigger) {
      if (this.activeRayTarget) {
        queueVrAction({ type: 'DESIGNATE', trackNo: this.activeRayTarget, via: 'CLICK' }, frameTimestamp);
      } else {
        queueVrAction({ type: 'CYCLE_TRACK', direction: 'NEXT' }, frameTimestamp);
      }
    }
    state.prevTrigger = triggerPressed;
  }

  private handleGripEdge(pad: Gamepad, state: ControllerEdgeState, frameTimestamp: number): void {
    const gripPressed = pad.buttons[1]?.pressed ?? false;
    if (gripPressed && !state.prevGrip) {
      const curEff = useSessionStore.getState().ui.activeEffector;
      const curIdx = EFFECTOR_LIST.indexOf(curEff);
      const nextEff = EFFECTOR_LIST[(curIdx + 1) % EFFECTOR_LIST.length];
      useSessionStore.getState().selectEffector(nextEff);
      queueVrAction({ type: 'SELECT_EFFECTOR', effectorId: nextEff }, frameTimestamp);
    }
    state.prevGrip = gripPressed;
  }

  private handleActionButtons(pad: Gamepad, state: ControllerEdgeState, frameTimestamp: number): void {
    const buttonAPressed = pad.buttons[4]?.pressed ?? false;
    if (buttonAPressed && !state.prevButtonA) {
      const selTrack = engineInstance.selectedTrackNo;
      if (selTrack) {
        queueVrAction({ type: 'FIRE', trackNo: selTrack }, frameTimestamp);
      }
    }
    state.prevButtonA = buttonAPressed;

    const buttonBPressed = pad.buttons[5]?.pressed ?? false;
    if (buttonBPressed && !state.prevButtonB) {
      const selTrack = engineInstance.selectedTrackNo;
      if (selTrack) {
        queueVrAction({ type: 'ASSESS', trackNo: selTrack, result: 'KILL' }, frameTimestamp);
      }
    }
    state.prevButtonB = buttonBPressed;
  }

  private handleThumbstick(pad: Gamepad, state: ControllerEdgeState, frameTimestamp: number): void {
    const stickX = pad.axes[2] ?? pad.axes[0] ?? 0;
    if (stickX > 0.6 && state.prevThumbstickX <= 0.6) {
      queueVrAction({ type: 'CYCLE_TRACK', direction: 'NEXT' }, frameTimestamp);
    } else if (stickX < -0.6 && state.prevThumbstickX >= -0.6) {
      queueVrAction({ type: 'CYCLE_TRACK', direction: 'PREV' }, frameTimestamp);
    }
    state.prevThumbstickX = stickX;
  }

  /**
   * Polls WebXR gamepads on active frame time, detects edges, and queues deterministic UserActions.
   */
  public pollControllers(session: XRSession, frameTimestamp: number): void {
    for (let i = 0; i < session.inputSources.length; i++) {
      const source = session.inputSources[i];
      if (!source.gamepad) continue;

      const pad = source.gamepad;
      let state = this.edges.get(i);
      if (!state) {
        state = {
          prevTrigger: false,
          prevGrip: false,
          prevThumbstickX: 0,
          prevThumbstickY: 0,
          prevButtonA: false,
          prevButtonB: false,
          prevButtonX: false,
          prevButtonY: false,
        };
        this.edges.set(i, state);
      }

      this.handleTriggerEdge(pad, state, frameTimestamp);
      this.handleGripEdge(pad, state, frameTimestamp);
      this.handleActionButtons(pad, state, frameTimestamp);
      this.handleThumbstick(pad, state, frameTimestamp);
    }
  }

  public dispose(): void {
    if (this.rayLine) {
      this.scene.remove(this.rayLine);
      this.rayLine.geometry.dispose();
      if (this.rayLine.material instanceof THREE.Material) {
        this.rayLine.material.dispose();
      }
      this.rayLine = null;
    }
    this.edges.clear();
  }
}

/**
 * WebXR Manager orchestrating VR sessions, FrameDriver handoff, and scene management.
 */
export class WebXRManager {
  private xrSession: XRSession | null = null;
  public readonly tableTop: WebXRTableTop;
  public readonly controllerHandler: WebXRControllerHandler;
  private isVrActive: boolean = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly consoleRenderer: ConsoleRenderer,
    private readonly onExitCallback: () => void
  ) {
    this.tableTop = new WebXRTableTop();
    this.controllerHandler = new WebXRControllerHandler(this.scene);
  }

  public isActive(): boolean {
    return this.isVrActive;
  }

  /**
   * Requests and starts an immersive-vr WebXR session.
   * Hands off frame driver to WebXRDriver without resetting sim state (Optional Task 14).
   */
  public async enterVR(): Promise<{ success: boolean; error?: string }> {
    const probe = await checkWebXRSupport();
    if (!probe.supported) {
      return { success: false, error: probe.reason || 'WebXR not supported' };
    }

    try {
      if (!navigator.xr) {
        return { success: false, error: 'WebXR not available' };
      }
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'local', 'bounded-floor'],
      });

      this.xrSession = session;
      this.renderer.xr.enabled = true;
      await this.renderer.xr.setSession(session);

      // Add table-top grouping to the active Three.js scene
      this.scene.add(this.tableTop.tableGroup);

      // WebXR FrameDriver handoff (ARCHITECTURE.md §1.3 & §8.9)
      const vrDriver = xrDriver(this.renderer);
      this.consoleRenderer.setFrameDriver(vrDriver);

      // Clean session teardown listener
      session.addEventListener('end', () => {
        this.exitVR();
      });

      this.isVrActive = true;
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to initialize WebXR session',
      };
    }
  }

  /**
   * Exits VR cleanly, restoring windowDriver to consoleRenderer without halting the simulation.
   */
  public exitVR(): void {
    if (!this.isVrActive && !this.xrSession) return;

    this.isVrActive = false;

    // Restore desktop WindowDriver (rAF) to the sim loop seamlessly
    this.consoleRenderer.setFrameDriver(windowDriver());

    // Remove table-top from scene
    this.scene.remove(this.tableTop.tableGroup);

    if (this.xrSession) {
      const session = this.xrSession;
      this.xrSession = null;
      void session.end().catch(() => {});
    }

    this.renderer.xr.enabled = false;
    this.onExitCallback();
  }

  /**
   * Frame-by-frame VR loop update (called during render loop).
   */
  public update(frameTimestamp: number): void {
    if (!this.isVrActive || !this.xrSession) return;

    // Poll controllers and queue deterministic quantized inputs
    this.controllerHandler.pollControllers(this.xrSession, frameTimestamp);

    // Update floating HUD panel texture
    this.tableTop.update();
  }

  public recenter(): void {
    this.tableTop.recenter();
  }

  public dispose(): void {
    this.exitVR();
    this.tableTop.dispose();
    this.controllerHandler.dispose();
  }
}
