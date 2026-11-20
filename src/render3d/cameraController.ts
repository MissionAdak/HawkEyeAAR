import * as THREE from 'three';
import type { CameraPreset } from './types';

export const DRAG_THRESHOLD_PX = 5;
export const MIN_CAMERA_DISTANCE_M = 80;
export const MAX_CAMERA_DISTANCE_M = 30000;

export interface CameraControllerOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  onSelectTrack?: (clientX: number, clientY: number) => void;
  onDoubleClick?: (clientX: number, clientY: number) => void;
}

export class CameraController {
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly onSelectTrack?: (clientX: number, clientY: number) => void;
  private readonly onDoubleClick?: (clientX: number, clientY: number) => void;

  // Camera State
  public readonly target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public readonly spherical: THREE.Spherical = new THREE.Spherical(7500, Math.PI / 3, Math.PI / 4);
  public currentPreset: CameraPreset = 'OBLIQUE';

  // Interaction State
  private isPointerDown: boolean = false;
  private hasDragged: boolean = false;
  private activePointerButton: number = 0;
  private downPosition: { x: number; y: number } = { x: 0, y: 0 };
  private previousPointerPosition: { x: number; y: number } = { x: 0, y: 0 };
  private activePointers: Map<number, { x: number; y: number }> = new Map();
  private pinchStartDist: number | null = null;
  private pinchStartRadius: number = 7500;

  // Smooth Focus Animation State
  private isAnimatingFocus: boolean = false;
  private readonly animStartTarget: THREE.Vector3 = new THREE.Vector3();
  private readonly animEndTarget: THREE.Vector3 = new THREE.Vector3();
  private animEndRadius: number = 7500;

  private detachListeners: () => void = () => {};

  constructor(options: CameraControllerOptions) {
    this.canvas = options.canvas;
    this.camera = options.camera;
    this.onSelectTrack = options.onSelectTrack;
    this.onDoubleClick = options.onDoubleClick;

    this.applyPreset('OBLIQUE', false);
    this.attachEvents();
  }

  public applyPreset(preset: CameraPreset, animated: boolean = false): void {
    this.currentPreset = preset;

    const newTarget = new THREE.Vector3(0, 0, 0);
    const newSpherical = new THREE.Spherical();

    if (preset === 'OBLIQUE') {
      newSpherical.set(7500, Math.PI / 3.2, Math.PI / 4);
      this.camera.up.set(0, 1, 0);
    } else if (preset === 'TOP') {
      newSpherical.set(9500, 0.001, 0);
      this.camera.up.set(0, 0, -1);
    } else if (preset === 'POST') {
      newSpherical.set(4500, Math.PI / 2.2, 0);
      this.camera.up.set(0, 1, 0);
    }

    if (animated && typeof performance !== 'undefined') {
      this.startFocusTransition(newTarget, newSpherical.radius);
      this.spherical.theta = newSpherical.theta;
      this.spherical.phi = newSpherical.phi;
    } else {
      this.target.copy(newTarget);
      this.spherical.copy(newSpherical);
      this.updateCamera();
    }
  }

  public updateCamera(): void {
    // Clamp polar angle to avoid flipping / inversion
    this.spherical.phi = Math.max(0.005, Math.min(Math.PI / 2 - 0.015, this.spherical.phi));
    this.spherical.radius = Math.max(
      MIN_CAMERA_DISTANCE_M,
      Math.min(MAX_CAMERA_DISTANCE_M, this.spherical.radius)
    );

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  public get dragging(): boolean {
    return this.hasDragged;
  }

  /**
   * World-space camera panning.
   * Right drag, middle drag, or Shift + left drag moves target & camera in the horizontal plane.
   */
  public pan(deltaX: number, deltaY: number): void {
    // Calculate ground-plane pan displacement proportional to camera distance
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const viewHeightAtTarget = 2 * Math.tan(fovRad / 2) * this.spherical.radius;
    const canvasHeight = this.canvas.clientHeight || this.canvas.height || 520;
    const worldUnitsPerPixel = viewHeightAtTarget / canvasHeight;

    // Camera right vector (horizontal in XZ plane)
    const right = new THREE.Vector3();
    this.camera.getWorldDirection(right);
    right.cross(this.camera.up).normalize();

    // Camera forward vector projected onto ground plane
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const moveRight = right.clone().multiplyScalar(-deltaX * worldUnitsPerPixel);
    const moveForward = forward.clone().multiplyScalar(deltaY * worldUnitsPerPixel);

    const panDelta = moveRight.add(moveForward);
    this.target.add(panDelta);

    // Keep target bounded within tactical theater (-12000m to +12000m)
    this.target.x = Math.max(-12000, Math.min(12000, this.target.x));
    this.target.z = Math.max(-12000, Math.min(12000, this.target.z));
    this.target.y = Math.max(-100, Math.min(3000, this.target.y));

    this.updateCamera();
  }

  /**
   * Cursor-anchored zoom.
   * Identifies world-space point under cursor and zooms towards it instead of fixed center.
   */
  public zoomToCursor(clientX: number, clientY: number, zoomFactor: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : this.canvas.width || 520;
    const height = rect.height > 0 ? rect.height : this.canvas.height || 520;

    const ndcX = ((clientX - (rect.left || 0)) / width) * 2 - 1;
    const ndcY = -((clientY - (rect.top || 0)) / height) * 2 + 1;

    // Raycast from camera through cursor
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    // Intersect horizontal plane at current target altitude (Y = target.y)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.target.y);
    const cursorGroundPos = new THREE.Vector3();
    const hasIntersection = raycaster.ray.intersectPlane(plane, cursorGroundPos);

    if (hasIntersection) {
      // Zoom target towards intersection point proportionally
      const shiftRatio = (1 - zoomFactor) * 0.45;
      const targetDelta = cursorGroundPos.sub(this.target).multiplyScalar(shiftRatio);
      this.target.add(targetDelta);
    }

    this.spherical.radius = Math.max(
      MIN_CAMERA_DISTANCE_M,
      Math.min(MAX_CAMERA_DISTANCE_M, this.spherical.radius * zoomFactor)
    );

    this.updateCamera();
  }

  /**
   * Smoothly transitions the camera to focus on a target point.
   */
  public focusOnPoint(
    point: THREE.Vector3,
    desiredRadius?: number,
    animated: boolean = true
  ): void {
    const targetDist = desiredRadius
      ? Math.max(MIN_CAMERA_DISTANCE_M, Math.min(MAX_CAMERA_DISTANCE_M, desiredRadius))
      : Math.max(300, Math.min(1500, this.spherical.radius * 0.5));

    if (animated && typeof performance !== 'undefined') {
      this.startFocusTransition(point, targetDist);
    } else {
      this.target.copy(point);
      this.spherical.radius = targetDist;
      this.updateCamera();
    }
  }

  public focusOnBoundingBox(box: THREE.Box3, animated: boolean = true): void {
    const center = new THREE.Vector3();
    box.getCenter(center);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const targetDist = Math.max(250, sphere.radius * 2.5);
    this.focusOnPoint(center, targetDist, animated);
  }

  public resetCamera(animated: boolean = true): void {
    this.applyPreset(this.currentPreset, animated);
  }

  private startFocusTransition(endTarget: THREE.Vector3, endRadius: number): void {
    this.isAnimatingFocus = true;
    this.animStartTarget.copy(this.target);
    this.animEndTarget.copy(endTarget);
    this.animEndRadius = endRadius;
  }

  /**
   * Called per-frame to update smooth focus transitions.
   */
  public updateTransition(): void {
    if (!this.isAnimatingFocus) return;

    // Smooth exponential approach
    this.target.lerp(this.animEndTarget, 0.18);
    this.spherical.radius += (this.animEndRadius - this.spherical.radius) * 0.18;
    this.updateCamera();

    const distToTarget = this.target.distanceTo(this.animEndTarget);
    const radiusDiff = Math.abs(this.spherical.radius - this.animEndRadius);

    if (distToTarget < 2.0 && radiusDiff < 2.0) {
      this.target.copy(this.animEndTarget);
      this.spherical.radius = this.animEndRadius;
      this.updateCamera();
      this.isAnimatingFocus = false;
    }
  }

  private attachEvents(): void {
    const onDown = (clientX: number, clientY: number, button: number, _shiftKey: boolean, pointerId?: number) => {
      this.isPointerDown = true;
      this.hasDragged = false;
      this.activePointerButton = button;
      this.downPosition = { x: clientX, y: clientY };
      this.previousPointerPosition = { x: clientX, y: clientY };

      if (pointerId !== undefined) {
        this.activePointers.set(pointerId, { x: clientX, y: clientY });
      }
    };

    const onMove = (clientX: number, clientY: number, shiftKey: boolean, pointerId?: number) => {
      if (pointerId !== undefined && this.activePointers.has(pointerId)) {
        this.activePointers.set(pointerId, { x: clientX, y: clientY });
      }

      // Handle 2-finger pinch & pan for touch
      if (this.activePointers.size === 2) {
        const ptrs = Array.from(this.activePointers.values());
        const dist = Math.hypot(ptrs[0].x - ptrs[1].x, ptrs[0].y - ptrs[1].y);
        const midX = (ptrs[0].x + ptrs[1].x) / 2;
        const midY = (ptrs[0].y + ptrs[1].y) / 2;

        if (this.pinchStartDist === null) {
          this.pinchStartDist = dist;
          this.pinchStartRadius = this.spherical.radius;
          this.previousPointerPosition = { x: midX, y: midY };
        } else if (dist > 10) {
          // Pinch Zoom
          const zoomScale = this.pinchStartDist / dist;
          this.spherical.radius = Math.max(
            MIN_CAMERA_DISTANCE_M,
            Math.min(MAX_CAMERA_DISTANCE_M, this.pinchStartRadius * zoomScale)
          );

          // 2-finger Pan
          const deltaX = midX - this.previousPointerPosition.x;
          const deltaY = midY - this.previousPointerPosition.y;
          this.previousPointerPosition = { x: midX, y: midY };
          this.pan(deltaX, deltaY);
        }
        return;
      }

      if (!this.isPointerDown) return;

      const deltaX = clientX - this.previousPointerPosition.x;
      const deltaY = clientY - this.previousPointerPosition.y;
      this.previousPointerPosition = { x: clientX, y: clientY };

      const moveDist = Math.hypot(clientX - this.downPosition.x, clientY - this.downPosition.y);
      if (moveDist >= DRAG_THRESHOLD_PX) {
        this.hasDragged = true;
      }

      if (!this.hasDragged) return;

      // Pan: Right button (2), Middle button (1), or Shift + Left button (0)
      const isPan = this.activePointerButton === 2 || this.activePointerButton === 1 || (this.activePointerButton === 0 && shiftKey);

      if (isPan) {
        this.pan(deltaX, deltaY);
      } else if (this.activePointerButton === 0) {
        // Orbit: Left button
        if (this.currentPreset === 'TOP') {
          this.camera.up.set(0, 1, 0);
          this.currentPreset = 'OBLIQUE';
        }
        this.spherical.theta -= deltaX * 0.006;
        this.spherical.phi = Math.max(
          0.005,
          Math.min(Math.PI / 2 - 0.015, this.spherical.phi - deltaY * 0.006)
        );
        this.updateCamera();
      }
    };

    const onUp = (clientX: number, clientY: number, button: number, pointerId?: number) => {
      if (pointerId !== undefined) {
        this.activePointers.delete(pointerId);
        if (this.activePointers.size < 2) {
          this.pinchStartDist = null;
        }
      }

      if (!this.isPointerDown) return;

      const wasDragging = this.hasDragged;
      this.isPointerDown = false;
      this.hasDragged = false;

      // Click selection: strictly when no drag occurred
      if (!wasDragging && button === 0) {
        if (this.onSelectTrack) {
          this.onSelectTrack(clientX, clientY);
        }
      }
    };

    const onCancel = (pointerId?: number) => {
      this.isPointerDown = false;
      this.hasDragged = false;
      this.pinchStartDist = null;
      if (pointerId !== undefined) {
        this.activePointers.delete(pointerId);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88;
      this.zoomToCursor(e.clientX, e.clientY, zoomFactor);
    };

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
      if (this.onDoubleClick) {
        this.onDoubleClick(e.clientX, e.clientY);
      }
    };

    // Use Pointer Events where available, fallback to Mouse Events
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

    // Prevent context menu on right-click so right-drag pan works seamlessly
    const handleContextMenu = (e: Event) => e.preventDefault();
    this.canvas.addEventListener('contextmenu', handleContextMenu);

    if (usePointer) {
      handlePointerDown = (e: PointerEvent) => onDown(e.clientX, e.clientY, e.button, e.shiftKey, e.pointerId);
      handlePointerMove = (e: PointerEvent) => onMove(e.clientX, e.clientY, e.shiftKey, e.pointerId);
      handlePointerUp = (e: PointerEvent) => onUp(e.clientX, e.clientY, e.button, e.pointerId);
      handlePointerCancel = (e: PointerEvent) => onCancel(e.pointerId);

      this.canvas.addEventListener('pointerdown', handlePointerDown as EventListener);
      targetHub.addEventListener('pointermove', handlePointerMove as EventListener);
      targetHub.addEventListener('pointerup', handlePointerUp as EventListener);
      targetHub.addEventListener('pointercancel', handlePointerCancel as EventListener);
    } else {
      handleMouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY, e.button, e.shiftKey);
      handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY, e.shiftKey);
      handleMouseUp = (e: MouseEvent) => onUp(e.clientX, e.clientY, e.button);

      this.canvas.addEventListener('mousedown', handleMouseDown as EventListener);
      targetHub.addEventListener('mousemove', handleMouseMove as EventListener);
      targetHub.addEventListener('mouseup', handleMouseUp as EventListener);
    }

    this.canvas.addEventListener('wheel', onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', onDblClick);

    this.detachListeners = () => {
      this.canvas.removeEventListener('contextmenu', handleContextMenu);
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
      this.canvas.removeEventListener('dblclick', onDblClick);
    };
  }

  public dispose(): void {
    this.detachListeners();
    this.activePointers.clear();
  }
}
