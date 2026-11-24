import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { calculateRadarSweepAngle } from '@/sim/radarMath';
import { RadarSweep3D } from '@/render3d/radarSweep3d';

describe('3D Tactical Radar Sweep Visualization (Task 17 Phase 5)', () => {
  describe('calculateRadarSweepAngle mathematical synchronization', () => {
    it('synchronizes 100% with 30 RPM (2.0s per revolution)', () => {
      // At t=0s
      const a0 = calculateRadarSweepAngle(0);
      expect(a0.progress).toBeCloseTo(0, 4);
      expect(a0.angleRad2D).toBeCloseTo(-Math.PI / 2, 4); // Starts at 12 o'clock

      // At t=0.5s (90 deg clockwise)
      const a500 = calculateRadarSweepAngle(500);
      expect(a500.progress).toBeCloseTo(0.25, 4);
      expect(a500.angleRad2D).toBeCloseTo(0, 4); // 3 o'clock

      // At t=1.0s (180 deg clockwise)
      const a1000 = calculateRadarSweepAngle(1000);
      expect(a1000.progress).toBeCloseTo(0.5, 4);
      expect(a1000.angleRad2D).toBeCloseTo(Math.PI / 2, 4); // 6 o'clock

      // At t=2.0s (Full 360 deg cycle complete)
      const a2000 = calculateRadarSweepAngle(2000);
      expect(a2000.progress).toBeCloseTo(0, 4);
    });

    it('produces identical rotational phase across 2D and 3D viewports', () => {
      for (let t = 0; t <= 4000; t += 250) {
        const sweep = calculateRadarSweepAngle(t);
        // rotationYRad in Three.js is -progress * 2 * PI
        expect(sweep.rotationYRad).toBeCloseTo(-sweep.progress * 2 * Math.PI, 4);
      }
    });
  });

  describe('RadarSweep3D component & sensor health response', () => {
    it('initializes antenna assembly and ground scan wedge', () => {
      const radar = new RadarSweep3D({ radiusM: 5000 });
      expect(radar.group).toBeDefined();
      expect(radar.antennaPivot).toBeDefined();
      expect(radar.group.children.length).toBeGreaterThanOrEqual(2);
      radar.dispose();
    });

    it('rotates antenna assembly strictly according to simMs clock', () => {
      const radar = new RadarSweep3D({ radiusM: 5000 });

      radar.update(0);
      const rot0 = radar.antennaPivot.rotation.y;

      radar.update(500);
      const rot500 = radar.antennaPivot.rotation.y;
      expect(rot500).not.toBe(rot0);

      radar.dispose();
    });

    it('adapts visuals dynamically across NOMINAL, DEGRADED, and OUT health states', () => {
      const radar = new RadarSweep3D({ radiusM: 5000 });
      const beamGroup = (radar as unknown as { beamGroup: THREE.Group }).beamGroup ?? (radar.group.children[1] as THREE.Group);
      const wedgeMat = (radar as unknown as { wedgeMaterial: THREE.MeshBasicMaterial }).wedgeMaterial ??
        ((beamGroup.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial);

      // Nominal: green (0x00ff66)
      radar.setSensorHealth('NOMINAL', 'RADAR');
      radar.update(100);
      expect(beamGroup.visible).toBe(true);
      expect(wedgeMat.color.getHex()).toBe(0x00ff66);

      // Degraded: amber (0xffaa00)
      radar.setSensorHealth('DEGRADED', 'RADAR');
      radar.update(200);
      expect(beamGroup.visible).toBe(true);
      expect(wedgeMat.color.getHex()).toBe(0xffaa00);

      // Out (Radar Dropout or Jamming): disabled / hidden
      radar.setSensorHealth('OUT', 'RADAR');
      radar.update(300);
      expect(beamGroup.visible).toBe(false);

      // Before testing EOIR, restore NOMINAL/RADAR and update so the EOIR assertion verifies sensor selection
      radar.setSensorHealth('NOMINAL', 'RADAR');
      radar.update(350);
      expect(beamGroup.visible).toBe(true);
      expect(wedgeMat.color.getHex()).toBe(0x00ff66);

      // If activeSensor is not RADAR (e.g. EOIR), hides beam
      radar.setSensorHealth('NOMINAL', 'EOIR');
      radar.update(400);
      expect(beamGroup.visible).toBe(false);

      radar.dispose();
    });
  });
});
