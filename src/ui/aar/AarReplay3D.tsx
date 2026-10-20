import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { AarScene3D } from '@/render3d/aarScene3d';
import type { AarReplayState } from './aarReplayTypes';
import type { CameraPreset } from '@/render3d/types';

interface AarReplay3DProps {
  replayState: AarReplayState;
  selectedTrackNo?: string | null;
  onSelectTrack?: (trackNo: string | null) => void;
  className?: string;
}

export const AarReplay3D: React.FC<AarReplay3DProps> = ({
  replayState,
  selectedTrackNo,
  onSelectTrack,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<AarScene3D | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [currentPreset, setCurrentPreset] = useState<CameraPreset>('OBLIQUE');
  const sphericalRef = useRef<THREE.Spherical>(new THREE.Spherical(7500, Math.PI / 3.2, Math.PI / 4));
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isDraggingRef = useRef<boolean>(false);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const applyCameraPreset = useCallback((preset: CameraPreset) => {
    setCurrentPreset(preset);
    const camera = cameraRef.current;
    if (!camera) return;

    targetRef.current.set(0, 0, 0);

    if (preset === 'OBLIQUE') {
      sphericalRef.current.set(7500, Math.PI / 3.2, Math.PI / 4);
      camera.up.set(0, 1, 0);
    } else if (preset === 'TOP') {
      sphericalRef.current.set(9500, 0.001, 0);
      camera.up.set(0, 0, -1);
    } else if (preset === 'POST') {
      sphericalRef.current.set(4500, Math.PI / 2.2, 0);
      camera.up.set(0, 1, 0);
    }

    const pos = new THREE.Vector3().setFromSpherical(sphericalRef.current).add(targetRef.current);
    camera.position.copy(pos);
    camera.lookAt(targetRef.current);
  }, []);

  // Initialize WebGL & Three.js 3D AAR Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 360;
    const height = 360;
    canvas.width = width;
    canvas.height = height;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'default',
      });
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      rendererRef.current = renderer;
    } catch (e) {
      console.warn('[AarReplay3D] WebGL initialization failed:', e);
      return;
    }

    const camera = new THREE.PerspectiveCamera(45, width / height, 10, 35000);
    cameraRef.current = camera;
    applyCameraPreset('OBLIQUE');

    const aarScene = new AarScene3D(replayState.zones);
    sceneRef.current = aarScene;

    // Animation render loop
    const render = () => {
      if (renderer && sceneRef.current && cameraRef.current) {
        renderer.render(sceneRef.current.scene, cameraRef.current);
      }
      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, [applyCameraPreset, replayState.zones]);

  // Update dynamic elements when scrubbed replayState changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.update(replayState, selectedTrackNo);
    }
  }, [replayState, selectedTrackNo]);

  // Mouse Orbit controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    mousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !cameraRef.current) return;

    const dx = e.clientX - mousePosRef.current.x;
    const dy = e.clientY - mousePosRef.current.y;
    mousePosRef.current = { x: e.clientX, y: e.clientY };

    const rotateSpeed = 0.006;
    sphericalRef.current.theta -= dx * rotateSpeed;
    sphericalRef.current.phi = Math.max(
      0.05,
      Math.min(Math.PI / 2 - 0.05, sphericalRef.current.phi - dy * rotateSpeed)
    );

    const pos = new THREE.Vector3().setFromSpherical(sphericalRef.current).add(targetRef.current);
    cameraRef.current.position.copy(pos);
    cameraRef.current.lookAt(targetRef.current);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleCanvasClick = () => {
    if (!onSelectTrack || replayState.tracks.length === 0) return;
    const currentIdx = replayState.tracks.findIndex((t) => t.trackNo === selectedTrackNo);
    const nextTrack = replayState.tracks[(currentIdx + 1) % replayState.tracks.length];
    onSelectTrack(nextTrack?.trackNo ?? null);
  };

  const totalSec = Math.floor(replayState.tMs / 1000);
  const ms = replayState.tMs % 1000;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const clockFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

  return (
    <div
      className={`relative inline-block w-[360px] h-[360px] bg-carbon-950 border border-line select-none overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={360}
        height={360}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        className="block cursor-grab active:cursor-grabbing"
      />

      {/* Top Left Title & Indicator */}
      <div className="absolute top-2 left-2 pointer-events-none text-[9px] font-mono leading-tight">
        <span className="text-phosphor font-bold">AAR 3D REPLAY // TRUTH + OP</span>
        <span className="block text-text-dim">FOV: 45° TACTICAL VIEW</span>
      </div>

      {/* Top Right Controls & Clock */}
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
        <div className="text-[10px] font-clock font-bold text-text-main bg-carbon-900/80 px-1.5 py-0.5 border border-line">
          {`T+${clockFormatted}`}
        </div>

        {/* Camera Preset Quick Buttons */}
        <div className="flex gap-1">
          {(['OBLIQUE', 'TOP', 'POST'] as CameraPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => applyCameraPreset(preset)}
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold border transition-colors ${
                currentPreset === preset
                  ? 'bg-phosphor text-carbon-950 border-phosphor'
                  : 'bg-carbon-900 text-text-dim border-line hover:border-text-dim'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Notification Strip for Active Masking/Engagement */}
      {replayState.activeMaskingMarker && (
        <div className="absolute bottom-6 left-2 right-2 pointer-events-none text-[9px] font-mono px-2 py-1 bg-amber/20 border border-amber text-amber font-bold">
          {replayState.activeMaskingMarker.label}
        </div>
      )}

      {replayState.activeEngagement && (
        <div className="absolute bottom-6 left-2 right-2 pointer-events-none text-[9px] font-mono px-2 py-1 bg-threat/20 border border-threat text-threat font-bold">
          {`ENGAGEMENT: ${replayState.activeEngagement.effector} (Pk: ${(replayState.activeEngagement.pk * 100).toFixed(0)}%) -> ${
            replayState.activeEngagement.killed ? 'HIT' : 'MISS'
          }`}
        </div>
      )}

      {/* Bottom Status Legend */}
      <div className="absolute bottom-1.5 left-2 pointer-events-none text-[8px] font-mono text-text-dim">
        <span>RED: THREAT · AMB: CIVIL · CYAN: FRIEND</span>
      </div>
      <div className="absolute bottom-1.5 right-2 pointer-events-none text-[8px] font-mono text-text-dim">
        <span>STEM: ALTITUDE · TRAIL: 10s</span>
      </div>
    </div>
  );
};
