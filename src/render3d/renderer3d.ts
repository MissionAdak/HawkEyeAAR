import * as THREE from 'three';
import { Scene3D } from './scene3d';
import type { SafeTrackView, CameraPreset, Scene3DOptions } from './types';
import { attachContextLossHandler } from './capability';

export interface Renderer3DOptions extends Scene3DOptions {
  onContextLost?: () => void;
}

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
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  public currentPreset: CameraPreset = 'OBLIQUE';

  private getTracks?: () => { tracks: SafeTrackView[]; selectedTrackNo: string | null };

  public setTrackProvider(fn: () => { tracks: SafeTrackView[]; selectedTrackNo: string | null }): void {
    this.getTracks = fn;
  }

  constructor(canvas: HTMLCanvasElement, options: Renderer3DOptions) {
    this.canvas = canvas;

    // 1. Initialize Three.js WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'default',
    });
    this.renderer.setSize(canvas.width, canvas.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

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

    // 5. Attach Lightweight Orbit Controls
    this.attachMouseControls();
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

  private attachMouseControls(): void {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };

      // Orbit azimuth and elevation
      this.spherical.theta -= deltaX * 0.006;
      this.spherical.phi = Math.max(0.01, Math.min(Math.PI / 2 - 0.02, this.spherical.phi - deltaY * 0.006));

      this.updateCameraFromSpherical();
    };

    const onMouseUp = () => {
      this.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      this.spherical.radius = Math.max(800, Math.min(25000, this.spherical.radius * zoomFactor));
      this.updateCameraFromSpherical();
    };

    this.canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    this.canvas.addEventListener('wheel', onWheel, { passive: false });

    // Store unbind function
    this.detachMouseControls = () => {
      this.canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.canvas.removeEventListener('wheel', onWheel);
    };
  }

  private detachMouseControls: () => void = () => {};

  /**
   * Updates tracks in the 3D scene from safe operator-facing views.
   */
  public update(tracks: SafeTrackView[], selectedTrackNo: string | null): void {
    this.scene3d.updateTracks(tracks, selectedTrackNo);
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

  /**
   * Complete renderer and scene teardown.
   */
  public dispose(): void {
    this.stop();
    this.detachMouseControls();

    if (this.cleanupContextLoss) {
      this.cleanupContextLoss();
      this.cleanupContextLoss = null;
    }

    this.scene3d.dispose();
    this.renderer.dispose();
  }
}
