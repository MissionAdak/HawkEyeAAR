import * as THREE from 'three';
import { Scene3D } from './scene3d';
import { CameraController } from './cameraController';
import type {
  SafeTrackView,
  CameraPreset,
  Scene3DOptions,
  SensorCoverageState,
  EffectorVisualOptions,
  EnvironmentObjectInfo,
} from './types';
import type { SensorMode, ChaosSpec, ScenarioSpec, ZoneSpec } from '@/sim/types';
import { attachContextLossHandler } from './capability';
import { toThree } from './coords';
import { getScenarioEnvironmentDescriptor } from './environment';

export interface Renderer3DOptions extends Scene3DOptions {
  onContextLost?: () => void;
  onSelectTrack?: (trackNo: string) => void;
  onSelectEnvironment?: (info: EnvironmentObjectInfo | null) => void;
  threeRenderer?: THREE.WebGLRenderer;
}

export const DRAG_THRESHOLD_PX = 5;

export class Renderer3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene3d: Scene3D;
  private readonly cameraController: CameraController;
  private animFrameId: number | null = null;
  private cleanupContextLoss: (() => void) | null = null;
  private cleanupKeydown: (() => void) | null = null;

  // Interaction & Picking State
  private readonly raycaster: THREE.Raycaster = new THREE.Raycaster();
  private onSelectTrackCallback?: (trackNo: string) => void;
  private onSelectEnvironmentCallback?: (info: EnvironmentObjectInfo | null) => void;
  private selectedTrackNo: string | null = null;
  private selectedEnvironmentObject: EnvironmentObjectInfo | null = null;

  private getTracks?: () => { tracks: SafeTrackView[]; selectedTrackNo: string | null };
  private getCoverage?: () => SensorCoverageState;
  private getEffectorOptions?: () => EffectorVisualOptions;
  private getSimTime?: () => { simMs: number; chaosList?: ChaosSpec[] };

  private showLos: boolean = true;
  private showClusters: boolean = true;
  private showTrainingAid: boolean = false;
  private readonly options: Renderer3DOptions;

  public setTrackProvider(fn: () => { tracks: SafeTrackView[]; selectedTrackNo: string | null }): void {
    this.getTracks = fn;
  }

  public setCoverageProvider(fn: () => SensorCoverageState): void {
    this.getCoverage = fn;
  }

  public setEffectorProvider(fn: () => EffectorVisualOptions): void {
    this.getEffectorOptions = fn;
  }

  public setSimTimeProvider(fn: () => { simMs: number; chaosList?: ChaosSpec[] }): void {
    this.getSimTime = fn;
  }

  public setShowLos(show: boolean): void {
    this.showLos = show;
  }

  public setShowClusters(show: boolean): void {
    this.showClusters = show;
  }

  public setShowTrainingAid(show: boolean): void {
    // Strictly forbid in EVAL mode (Rule F5)
    if (this.options.mode === 'EVAL') {
      this.showTrainingAid = false;
      this.scene3d.updateTrainingAid(false);
      return;
    }
    this.showTrainingAid = show;
    this.scene3d.updateTrainingAid(show);
  }

  public get isTrainingAidVisible(): boolean {
    return this.showTrainingAid;
  }

  public setOnSelectTrack(fn: (trackNo: string) => void): void {
    this.onSelectTrackCallback = fn;
  }

  public setOnSelectEnvironment(fn: (info: EnvironmentObjectInfo | null) => void): void {
    this.onSelectEnvironmentCallback = fn;
  }

  public get dragging(): boolean {
    return this.cameraController.dragging;
  }

  public get currentPreset(): CameraPreset {
    return this.cameraController.currentPreset;
  }

  public get target(): THREE.Vector3 {
    return this.cameraController.target;
  }

  public get spherical(): THREE.Spherical {
    return this.cameraController.spherical;
  }

  public getCameraController(): CameraController {
    return this.cameraController;
  }

  constructor(canvas: HTMLCanvasElement, options: Renderer3DOptions) {
    this.canvas = canvas;
    this.options = options;
    if (options.onSelectTrack) {
      this.onSelectTrackCallback = options.onSelectTrack;
    }
    if (options.onSelectEnvironment) {
      this.onSelectEnvironmentCallback = options.onSelectEnvironment;
    }
    if (options.showTrainingAid && options.mode !== 'EVAL') {
      this.showTrainingAid = true;
    }

    // 1. Initialize Three.js WebGLRenderer
    this.renderer =
      options.threeRenderer ??
      new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'default',
      });
    this.renderer.setSize(canvas.width, canvas.height, false);
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.renderer.setPixelRatio(dpr);

    // 2. Setup Tactical Camera (near plane 5m, far plane 45000m)
    const aspect = canvas.width / canvas.height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 5, 45000);

    // 3. Initialize Camera Controller (Navigation, Pan, Orbit, Zoom to Cursor, Focus)
    this.cameraController = new CameraController({
      canvas,
      camera: this.camera,
      onSelectTrack: (clientX, clientY) => this.handlePointerClick(clientX, clientY),
      onDoubleClick: (clientX, clientY) => this.handleDoubleClick(clientX, clientY),
    });

    // 4. Initialize Tactical Scene with Procedural Environment
    this.scene3d = new Scene3D(options);

    // 5. Attach Context Loss Listener (Rule R10.1)
    if (options.onContextLost) {
      this.cleanupContextLoss = attachContextLossHandler(canvas, () => {
        this.stop();
        options.onContextLost?.();
      });
    }

    // 6. Global Navigation Keyboard Handler (F to focus, Home to reset)
    if (typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target instanceof HTMLElement && e.target.isContentEditable)
        ) {
          return;
        }
        if (e.key === 'Home') {
          this.resetCamera();
        } else if (e.key === 'f' || e.key === 'F') {
          this.focusSelection();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      this.cleanupKeydown = () => window.removeEventListener('keydown', handleKeyDown);
    }
  }

  public setPreset(preset: CameraPreset): void {
    this.cameraController.applyPreset(preset, false);
  }

  public applyCameraPreset(preset: CameraPreset): void {
    this.cameraController.applyPreset(preset, false);
  }

  /**
   * Focuses camera on the currently selected entity (environment object or aircraft).
   */
  public focusSelection(): void {
    if (this.selectedEnvironmentObject) {
      const env = this.selectedEnvironmentObject;
      const threePos = toThree(env.position.x, env.position.y, env.elevationM ?? 0);
      const targetDist = Math.max(200, env.heightM * 2.5);
      this.cameraController.focusOnPoint(threePos, targetDist, true);
      return;
    }

    if (this.selectedTrackNo) {
      const record = this.scene3d.getTrackRecord(this.selectedTrackNo);
      if (record) {
        const worldPos = new THREE.Vector3();
        record.aircraftGroup.getWorldPosition(worldPos);
        this.cameraController.focusOnPoint(worldPos, 350, true);
      }
    }
  }

  public resetCamera(): void {
    this.cameraController.resetCamera(true);
  }

  public pan(deltaX: number, deltaY: number): void {
    this.cameraController.pan(deltaX, deltaY);
  }

  public zoomToCursor(clientX: number, clientY: number, zoomFactor: number): void {
    this.cameraController.zoomToCursor(clientX, clientY, zoomFactor);
  }

  /**
   * Pointer Click handler with priority discrimination:
   * 1. Aircraft track (operator target selection)
   * 2. Environment scene object (inspection panel)
   * 3. Ground / empty space (clears environment inspector)
   */
  private handlePointerClick(clientX: number, clientY: number): void {
    // 1. Try picking an operator-visible aircraft
    const pickedTrackNo = this.pickTrackAt(clientX, clientY);
    if (pickedTrackNo) {
      this.selectedTrackNo = pickedTrackNo;
      this.selectedEnvironmentObject = null;
      this.options.onSelectTrack?.(pickedTrackNo);
      this.onSelectTrackCallback?.(pickedTrackNo);
      this.options.onSelectEnvironment?.(null);
      this.onSelectEnvironmentCallback?.(null);
      return;
    }

    // 2. Try picking an environmental scene object
    const pickedEnv = this.pickEnvironmentObjectAt(clientX, clientY);
    if (pickedEnv) {
      this.selectedEnvironmentObject = pickedEnv;
      this.options.onSelectEnvironment?.(pickedEnv);
      this.onSelectEnvironmentCallback?.(pickedEnv);
      return;
    }

    // 3. Clicked empty terrain/space: dismiss environment inspector
    this.selectedEnvironmentObject = null;
    this.options.onSelectEnvironment?.(null);
    this.onSelectEnvironmentCallback?.(null);
  }

  /**
   * Double-click handler: smoothly focuses camera on hit target.
   * INVARIANT: Does NOT generate duplicate designation or firing actions.
   */
  private handleDoubleClick(clientX: number, clientY: number): void {
    // 1. Check aircraft double-click
    const pickedTrackNo = this.pickTrackAt(clientX, clientY);
    if (pickedTrackNo) {
      this.selectedTrackNo = pickedTrackNo;
      this.options.onSelectTrack?.(pickedTrackNo);
      this.onSelectTrackCallback?.(pickedTrackNo);

      const record = this.scene3d.getTrackRecord(pickedTrackNo);
      if (record) {
        const worldPos = new THREE.Vector3();
        record.aircraftGroup.getWorldPosition(worldPos);
        this.cameraController.focusOnPoint(worldPos, 350, true);
      }
      return;
    }

    // 2. Check environmental object double-click
    const pickedEnv = this.pickEnvironmentObjectAt(clientX, clientY);
    if (pickedEnv) {
      this.selectedEnvironmentObject = pickedEnv;
      this.options.onSelectEnvironment?.(pickedEnv);
      this.onSelectEnvironmentCallback?.(pickedEnv);

      const threePos = toThree(pickedEnv.position.x, pickedEnv.position.y, pickedEnv.elevationM ?? 0);
      const targetDist = Math.max(200, pickedEnv.heightM * 2.5);
      this.cameraController.focusOnPoint(threePos, targetDist, true);
      return;
    }

    // 3. Ground plane double click
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (this.canvas.width || 520);
    const height = rect.height > 0 ? rect.height : (this.canvas.height || 520);
    const x = ((clientX - (rect.left || 0)) / width) * 2 - 1;
    const y = -((clientY - (rect.top || 0)) / height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, groundPoint)) {
      this.cameraController.focusOnPoint(groundPoint, undefined, true);
    }
  }

  /**
   * Raycasts from canvas client coordinates into 3D scene to pick an operator-visible track.
   */
  public pickTrackAt(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (this.canvas.width || 520);
    const height = rect.height > 0 ? rect.height : (this.canvas.height || 520);
    const left = rect.left || 0;
    const top = rect.top || 0;

    const x = ((clientX - left) / width) * 2 - 1;
    const y = -((clientY - top) / height) * 2 + 1;

    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.scene3d.scene.updateMatrixWorld(true);

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const selectable = this.scene3d.getSelectableObjects();
    if (selectable.length === 0) return null;

    const intersects = this.raycaster.intersectObjects(selectable, true);
    if (intersects.length === 0) return null;

    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr) {
        if (curr.userData && typeof curr.userData.trackNo === 'string') {
          return curr.userData.trackNo;
        }
        curr = curr.parent;
      }
    }

    return null;
  }

  /**
   * Raycasts from canvas client coordinates into 3D scene to pick an environmental object.
   */
  public pickEnvironmentObjectAt(clientX: number, clientY: number): EnvironmentObjectInfo | null {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (this.canvas.width || 520);
    const height = rect.height > 0 ? rect.height : (this.canvas.height || 520);
    const left = rect.left || 0;
    const top = rect.top || 0;

    const x = ((clientX - left) / width) * 2 - 1;
    const y = -((clientY - top) / height) * 2 + 1;

    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.scene3d.scene.updateMatrixWorld(true);

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    return this.scene3d.pickEnvironmentObject(this.raycaster);
  }

  public getSelectedEnvironmentObject(): EnvironmentObjectInfo | null {
    return this.selectedEnvironmentObject;
  }

  /**
   * Updates scenario environment descriptor for seamless scenario switching.
   */
  public setScenarioEnvironment(scenarioId: string, spec?: ScenarioSpec | null): void {
    const descriptor = getScenarioEnvironmentDescriptor(scenarioId, spec);
    this.scene3d.setEnvironment(descriptor);
    if (spec?.zones) {
      this.scene3d.buildZones(spec.zones);
    }
  }

  /**
   * Dynamically rebuilds zone extrusion meshes.
   */
  public setZones(zones: ZoneSpec[]): void {
    this.scene3d.buildZones(zones);
  }

  /**
   * Updates tracks in the 3D scene from safe operator-facing views.
   */
  public update(tracks: SafeTrackView[], selectedTrackNo: string | null): void {
    this.selectedTrackNo = selectedTrackNo;
    this.scene3d.updateTracks(tracks, selectedTrackNo, this.camera, this.canvas.height);
  }

  /**
   * Updates sensor coverage volumes.
   */
  public updateCoverage(coverage: SensorCoverageState): void {
    this.scene3d.updateCoverage(coverage);
  }

  /**
   * Filter sensor coverage display.
   */
  public setSensorFilter(sensor: SensorMode | 'ALL'): void {
    this.scene3d.setSensorFilter(sensor);
  }

  public getScene3D(): Scene3D {
    return this.scene3d;
  }

  /**
   * Updates effector envelopes and target cue.
   */
  public updateEffectorEnvelopes(options: EffectorVisualOptions): void {
    this.scene3d.updateEffectorEnvelopes(options);
  }

  /**
   * Updates model-faithful Line-of-Sight (LOS) explanation ray for the selected track.
   */
  public updateLos(selectedTrack: SafeTrackView | null): void {
    this.scene3d.updateLos(selectedTrack, this.showLos);
  }

  /**
   * Starts Three.js rendering animation loop.
   * INVARIANT: This loop renders visuals ONLY and MUST NOT advance simulation ticks.
   */
  public start(): void {
    if (this.animFrameId !== null) return;

    const renderLoop = () => {
      if (this.getTracks) {
        const { tracks, selectedTrackNo } = this.getTracks();
        this.update(tracks, selectedTrackNo);

        const selectedTrack = selectedTrackNo
          ? tracks.find((t) => t.trackNo === selectedTrackNo) ?? null
          : null;
        this.scene3d.updateLos(selectedTrack, this.showLos);
        this.scene3d.updateClusters(tracks, this.showClusters);
      }
      if (this.getCoverage) {
        const coverage = this.getCoverage();
        this.updateCoverage(coverage);
      }
      if (this.getEffectorOptions) {
        const effOpts = this.getEffectorOptions();
        this.updateEffectorEnvelopes(effOpts);
      }
      if (this.getSimTime) {
        const { simMs, chaosList } = this.getSimTime();
        this.scene3d.updateEnvironment(simMs, chaosList);
      }

      // Update camera smooth focus transition
      this.cameraController.updateTransition();

      this.renderer.render(this.scene3d.scene, this.camera);
      this.animFrameId = requestAnimationFrame(renderLoop);
    };

    this.animFrameId = requestAnimationFrame(renderLoop);
  }

  public stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public setLowFidelity(lowFi: boolean): void {
    let dpr = 1;
    if (typeof window !== 'undefined' && !lowFi) {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    }
    this.renderer.setPixelRatio(dpr);
    this.scene3d.setLowFidelity(lowFi);
  }

  public getThreeRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Complete renderer and scene teardown.
   */
  public dispose(): void {
    this.stop();
    this.cameraController.dispose();

    if (this.cleanupKeydown) {
      this.cleanupKeydown();
      this.cleanupKeydown = null;
    }

    if (this.cleanupContextLoss) {
      this.cleanupContextLoss();
      this.cleanupContextLoss = null;
    }

    this.scene3d.dispose();
    this.renderer.dispose();
  }
}
