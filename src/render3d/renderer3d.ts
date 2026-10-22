import * as THREE from 'three';
import { Scene3D } from './scene3d';
import type { SafeTrackView, CameraPreset, Scene3DOptions, SensorCoverageState, EffectorVisualOptions } from './types';
import type { SensorMode } from '@/sim/types';
import { attachContextLossHandler } from './capability';

export interface Renderer3DOptions extends Scene3DOptions {
  onContextLost?: () => void;
  onSelectTrack?: (trackNo: string) => void;
  threeRenderer?: THREE.WebGLRenderer;
}

export const DRAG_THRESHOLD_PX = 5;

export class Renderer3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene3d: Scene3D;
  private animFrameId: number | null = null;
  private cleanupContextLoss: (() => void) | null = null;

  // Camera Orbit State
  private readonly target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private readonly spherical: THREE.Spherical = new THREE.Spherical(7500, Math.PI / 3, Math.PI / 4);
  public currentPreset: CameraPreset = 'OBLIQUE';

  // Interaction & Picking State
  private readonly raycaster: THREE.Raycaster = new THREE.Raycaster();
  private onSelectTrackCallback?: (trackNo: string) => void;
  private isPointerDown: boolean = false;
  private hasDragged: boolean = false;
  private downPosition: { x: number; y: number } = { x: 0, y: 0 };
  private previousPointerPosition: { x: number; y: number } = { x: 0, y: 0 };

  private getTracks?: () => { tracks: SafeTrackView[]; selectedTrackNo: string | null };
  private getCoverage?: () => SensorCoverageState;
  private getEffectorOptions?: () => EffectorVisualOptions;
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

  public get dragging(): boolean {
    return this.hasDragged;
  }

  constructor(canvas: HTMLCanvasElement, options: Renderer3DOptions) {
    this.canvas = canvas;
    this.options = options;
    if (options.onSelectTrack) {
      this.onSelectTrackCallback = options.onSelectTrack;
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

    // 2. Setup Tactical Camera
    const aspect = canvas.width / canvas.height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 10, 35000);
    this.applyCameraPreset('OBLIQUE');

    // 3. Initialize Tactical Scene
    this.scene3d = new Scene3D(options);

    // 4. Attach Context Loss Listener (Rule R10.1)
    if (options.onContextLost) {
      this.cleanupContextLoss = attachContextLossHandler(canvas, () => {
        this.stop();
        options.onContextLost?.();
      });
    }

    // 5. Attach Unified Pointer & Orbit Controls with Hit Testing
    this.attachControls();
  }

  private applyCameraPreset(preset: CameraPreset): void {
    this.currentPreset = preset;
    this.target.set(0, 0, 0);

    if (preset === 'OBLIQUE') {
      // 3/4 perspective looking at asset from distance 7500m
      this.spherical.set(7500, Math.PI / 3.2, Math.PI / 4);
      this.camera.up.set(0, 1, 0);
    } else if (preset === 'TOP') {
      // Direct overhead top-down view looking at ground with North facing up (-Z)
      this.spherical.set(9500, 0.001, 0);
      this.camera.up.set(0, 0, -1);
    } else if (preset === 'POST') {
      // Perimeter low-altitude post looking from South (0, 300, 4500)
      this.spherical.set(4500, Math.PI / 2.2, 0);
      this.camera.up.set(0, 1, 0);
    }

    this.updateCameraFromSpherical();
  }

  public setPreset(preset: CameraPreset): void {
    this.applyCameraPreset(preset);
  }

  private updateCameraFromSpherical(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  private attachControls(): void {
    const onDown = (clientX: number, clientY: number, button: number, pointerType?: string) => {
      if (button === 0 || button === 2 || pointerType === 'touch') {
        this.isPointerDown = true;
        this.hasDragged = false;
        this.downPosition = { x: clientX, y: clientY };
        this.previousPointerPosition = { x: clientX, y: clientY };
      }
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!this.isPointerDown) return;

      const deltaX = clientX - this.previousPointerPosition.x;
      const deltaY = clientY - this.previousPointerPosition.y;
      this.previousPointerPosition = { x: clientX, y: clientY };

      const moveDist = Math.hypot(
        clientX - this.downPosition.x,
        clientY - this.downPosition.y
      );
      if (moveDist >= DRAG_THRESHOLD_PX) {
        this.hasDragged = true;
      }

      if (this.hasDragged) {
        // Orbit azimuth and elevation
        this.spherical.theta -= deltaX * 0.006;
        this.spherical.phi = Math.max(
          0.01,
          Math.min(Math.PI / 2 - 0.02, this.spherical.phi - deltaY * 0.006)
        );
        this.updateCameraFromSpherical();
      }
    };

    const onUp = (clientX: number, clientY: number, button: number, pointerType?: string) => {
      if (!this.isPointerDown) return;

      const wasDragging = this.hasDragged;
      this.isPointerDown = false;
      this.hasDragged = false;

      // Click/tap selection discrimination: only when no drag occurred
      if (!wasDragging && (button === 0 || pointerType === 'touch')) {
        const pickedTrackNo = this.pickTrackAt(clientX, clientY);
        if (pickedTrackNo) {
          this.options.onSelectTrack?.(pickedTrackNo);
          this.onSelectTrackCallback?.(pickedTrackNo);
        }
      }
    };

    const onCancel = () => {
      this.isPointerDown = false;
      this.hasDragged = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      this.spherical.radius = Math.max(800, Math.min(25000, this.spherical.radius * zoomFactor));
      this.updateCameraFromSpherical();
    };

    // Use Pointer Events when supported, fallback to Mouse Events
    const hasWindow = typeof window !== 'undefined';
    const usePointer =
      (hasWindow && 'PointerEvent' in window) ||
      (typeof globalThis !== 'undefined' && 'PointerEvent' in globalThis);
    const targetHub: EventTarget = hasWindow ? window : this.canvas;

    let handlePointerDown: (e: PointerEvent) => void;
    let handlePointerMove: (e: PointerEvent) => void;
    let handlePointerUp: (e: PointerEvent) => void;
    let handlePointerCancel: (e: PointerEvent) => void;

    let handleMouseDown: (e: MouseEvent) => void;
    let handleMouseMove: (e: MouseEvent) => void;
    let handleMouseUp: (e: MouseEvent) => void;

    if (usePointer) {
      handlePointerDown = (e: PointerEvent) => onDown(e.clientX, e.clientY, e.button, e.pointerType);
      handlePointerMove = (e: PointerEvent) => onMove(e.clientX, e.clientY);
      handlePointerUp = (e: PointerEvent) => onUp(e.clientX, e.clientY, e.button, e.pointerType);
      handlePointerCancel = () => onCancel();

      this.canvas.addEventListener('pointerdown', handlePointerDown as EventListener);
      targetHub.addEventListener('pointermove', handlePointerMove as EventListener);
      targetHub.addEventListener('pointerup', handlePointerUp as EventListener);
      targetHub.addEventListener('pointercancel', handlePointerCancel as EventListener);
    } else {
      handleMouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY, e.button);
      handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
      handleMouseUp = (e: MouseEvent) => onUp(e.clientX, e.clientY, e.button);

      this.canvas.addEventListener('mousedown', handleMouseDown as EventListener);
      targetHub.addEventListener('mousemove', handleMouseMove as EventListener);
      targetHub.addEventListener('mouseup', handleMouseUp as EventListener);
    }

    this.canvas.addEventListener('wheel', onWheel, { passive: false });

    this.detachControls = () => {
      if (usePointer) {
        this.canvas.removeEventListener('pointerdown', handlePointerDown as EventListener);
        targetHub.removeEventListener('pointermove', handlePointerMove as EventListener);
        targetHub.removeEventListener('pointerup', handlePointerUp as EventListener);
        targetHub.removeEventListener('pointercancel', handlePointerCancel as EventListener);
      } else {
        this.canvas.removeEventListener('mousedown', handleMouseDown as EventListener);
        targetHub.removeEventListener('mousemove', handleMouseMove as EventListener);
        targetHub.removeEventListener('mouseup', handleMouseUp as EventListener);
      }
      this.canvas.removeEventListener('wheel', onWheel);
    };
  }

  private detachControls: () => void = () => {};

  /**
   * Raycasts from canvas client coordinates into the 3D scene to pick an operator-visible track.
   * Returns the trackNo of the closest intersected track, or null if none was hit.
   */
  public pickTrackAt(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (this.canvas.width || 520);
    const height = rect.height > 0 ? rect.height : (this.canvas.height || 520);
    const left = rect.left || 0;
    const top = rect.top || 0;

    // Normalized Device Coordinates: [-1, +1]
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

    // Intersections are ordered by distance (closest first)
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
   * Updates tracks in the 3D scene from safe operator-facing views.
   */
  public update(tracks: SafeTrackView[], selectedTrackNo: string | null): void {
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
    this.detachControls();

    if (this.cleanupContextLoss) {
      this.cleanupContextLoss();
      this.cleanupContextLoss = null;
    }

    this.scene3d.dispose();
    this.renderer.dispose();
  }
}
