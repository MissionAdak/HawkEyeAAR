import React, { useState, useMemo } from 'react';
import type { ZoneSpec } from '@/sim/types';
import { calculateCrossSection } from '@/render3d/trainingAidMath';
import { evaluateMasking } from '@/sim/masking';
import { CONFIG } from '@/config';

interface CrossSectionPanelProps {
  onClose: () => void;
  zones?: ZoneSpec[];
  selectedTrack?: {
    trackNo: string;
    pos: { x: number; y: number; z: number } | null;
    masked?: boolean;
  } | null;
}

export const CrossSectionPanel: React.FC<CrossSectionPanelProps> = ({
  onClose,
  zones = [],
  selectedTrack,
}) => {
  // If track is selected, calculate its bearing
  const trackBearing = useMemo(() => {
    if (!selectedTrack?.pos) return null;
    const { x, y } = selectedTrack.pos;
    const rad = Math.atan2(x, y); // 0 = North (+Y), 90 = East (+X)
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  }, [selectedTrack]);

  const [bearingDeg, setBearingDeg] = useState<number>(trackBearing ?? 45);
  const [autoTrack, setAutoTrack] = useState<boolean>(trackBearing !== null);

  const activeBearing = autoTrack && trackBearing !== null ? trackBearing : bearingDeg;

  // Compute profile using the pure canonical math function
  const profile = useMemo(() => {
    return calculateCrossSection(activeBearing, 5000, zones, 50, CONFIG.thresholds.antennaHeightM || 15);
  }, [activeBearing, zones]);

  // Coordinate mapping for SVG plot:
  // SVG size: 620 x 270
  // Plot area: x from 55 to 585 (width 530), y from 30 to 220 (height 190)
  const mapX = (rM: number) => 55 + (Math.max(0, Math.min(5000, rM)) / 5000) * 530;
  const mapY = (zM: number) => 220 - (Math.max(0, Math.min(160, zM)) / 160) * 190;

  // Track status check
  const trackAnalysis = useMemo(() => {
    if (!selectedTrack?.pos) return null;
    const R = Math.hypot(selectedTrack.pos.x, selectedTrack.pos.y);
    const z = selectedTrack.pos.z;
    const mask = evaluateMasking(selectedTrack.pos, zones);
    return {
      R,
      z,
      isMasked: mask.isMasked,
      zoneId: mask.zoneId,
    };
  }, [selectedTrack, zones]);

  return (
    <div className="fixed inset-0 z-50 bg-carbon-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-[660px] bg-carbon-900 border border-amber/60 flex flex-col font-mono text-xs overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-[40px] px-4 border-b border-line bg-carbon-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm tracking-wider text-amber">
              [F5] ELEVATION CROSS-SECTION TRAINING AID
            </span>
            <span className="text-[10px] text-text-dim border border-line px-1.5 py-0.5">
              TRAIN ONLY · NOT EVAL
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-2 py-0.5 text-[11px] font-bold border border-line hover:border-threat hover:text-threat text-text-dim transition-colors"
          >
            ✕ ESC
          </button>
        </div>

        {/* Bearing Selection Toolbar */}
        <div className="p-3 border-b border-line bg-carbon-950 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="text-text-dim">BEARING:</span>
            <span className="font-bold text-amber text-sm font-mono w-[48px]">
              {String(activeBearing).padStart(3, '0')}°
            </span>

            <input
              type="range"
              min="0"
              max="359"
              value={activeBearing}
              onChange={(e) => {
                setAutoTrack(false);
                setBearingDeg(Number(e.target.value));
              }}
              className="w-36 accent-amber cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1">
            {trackBearing !== null && (
              <button
                onClick={() => setAutoTrack(true)}
                className={`px-2 py-0.5 border text-[10px] font-bold transition-colors ${
                  autoTrack
                    ? 'border-amber text-amber bg-amber/20'
                    : 'border-line text-text-dim hover:text-text-main'
                }`}
              >
                TRACK BRG ({trackBearing}°)
              </button>
            )}

            {[0, 90, 180, 270].map((b) => (
              <button
                key={b}
                onClick={() => {
                  setAutoTrack(false);
                  setBearingDeg(b);
                }}
                className={`px-1.5 py-0.5 border text-[10px] transition-colors ${
                  activeBearing === b
                    ? 'border-phosphor text-phosphor bg-phosphorDim/30 font-bold'
                    : 'border-line text-text-dim hover:text-text-main'
                }`}
              >
                {b === 0 ? '000° N' : b === 90 ? '090° E' : b === 180 ? '180° S' : '270° W'}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Side Elevation Chart */}
        <div className="p-3 bg-carbon-950 flex flex-col items-center">
          <svg width="620" height="250" className="border border-line/60 bg-carbon-950 select-none">
            <defs>
              <pattern id="shadowHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.4" />
              </pattern>
            </defs>

            {/* Altitude Bands Background Stripes */}
            {/* LOW band: 0 to 40m */}
            <rect
              x="55"
              y={mapY(40)}
              width="530"
              height={mapY(0) - mapY(40)}
              fill="rgba(16, 185, 129, 0.05)"
            />
            {/* MID band: 40 to 100m */}
            <rect
              x="55"
              y={mapY(100)}
              width="530"
              height={mapY(40) - mapY(100)}
              fill="rgba(6, 182, 212, 0.05)"
            />
            {/* HIGH band: 100 to 160m */}
            <rect
              x="55"
              y={mapY(160)}
              width="530"
              height={mapY(100) - mapY(160)}
              fill="rgba(59, 130, 246, 0.05)"
            />

            {/* Altitude Band Boundary Lines */}
            <line x1="55" y1={mapY(40)} x2="585" y2={mapY(40)} stroke="rgba(16, 185, 129, 0.3)" strokeDasharray="3 3" />
            <line x1="55" y1={mapY(100)} x2="585" y2={mapY(100)} stroke="rgba(6, 182, 212, 0.3)" strokeDasharray="3 3" />
            <line x1="55" y1={mapY(160)} x2="585" y2={mapY(160)} stroke="rgba(59, 130, 246, 0.3)" strokeDasharray="3 3" />

            <text x="580" y={mapY(20)} fill="#10b981" fontSize="9" textAnchor="end" opacity="0.8">LOW (≤40m)</text>
            <text x="580" y={mapY(70)} fill="#06b6d4" fontSize="9" textAnchor="end" opacity="0.8">MID (40-100m)</text>
            <text x="580" y={mapY(130)} fill="#3b82f6" fontSize="9" textAnchor="end" opacity="0.8">HIGH (&gt;100m)</text>

            {/* Range Gridlines */}
            {[500, 1000, 2000, 3000, 5000].map((r) => (
              <g key={r}>
                <line
                  x1={mapX(r)}
                  y1="30"
                  x2={mapX(r)}
                  y2="220"
                  stroke={r === 500 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'}
                  strokeDasharray={r === 500 ? '4 2' : '2 4'}
                />
                <text x={mapX(r)} y="235" fill="#94a3b8" fontSize="9" textAnchor="middle">
                  {r >= 1000 ? `${r / 1000}k` : `${r}m`}
                </text>
              </g>
            ))}

            {/* Altitude Y-axis Labels */}
            {[0, 40, 100, 160].map((z) => (
              <text key={z} x="48" y={mapY(z) + 3} fill="#94a3b8" fontSize="9" textAnchor="end">
                {z}m
              </text>
            ))}

            {/* Baseline Ground Axis */}
            <line x1="55" y1="220" x2="585" y2="220" stroke="#64748b" strokeWidth="1.5" />

            {/* Radar Antenna Mast at x = 0 */}
            <line x1={mapX(0)} y1={mapY(0)} x2={mapX(0)} y2={mapY(profile.antennaHeightM)} stroke="#06b6d4" strokeWidth="3" />
            <circle cx={mapX(0)} cy={mapY(profile.antennaHeightM)} r="4" fill="#06b6d4" />
            <text x={mapX(0) + 6} y={mapY(profile.antennaHeightM) - 2} fill="#06b6d4" fontSize="9" fontWeight="bold">
              RADAR (15m)
            </text>

            {/* Zone Obstacles & Modelled Shadow Envelopes */}
            {profile.blocks.map((block) => {
              const xNear = mapX(block.dNearM);
              const xFar = mapX(block.dFarM);
              const xShadowEnd = mapX(block.shadowEndM);
              const yRoof = mapY(block.heightM);
              const yGround = mapY(0);

              // Top ceiling at shadow end: z_c = h_r + (R / dNear) * (H - h_r)
              const scaleEnd = block.shadowEndM / Math.max(1, block.dNearM);
              const zShadowEnd = Math.min(160, profile.antennaHeightM + scaleEnd * (block.heightM - profile.antennaHeightM));
              const yShadowEnd = mapY(zShadowEnd);

              return (
                <g key={block.zoneId}>
                  {/* Shadow Volume Polygon */}
                  <polygon
                    points={`
                      ${xNear},${yRoof}
                      ${xShadowEnd},${yShadowEnd}
                      ${xShadowEnd},${yGround}
                      ${xNear},${yGround}
                    `}
                    fill="url(#shadowHatch)"
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />

                  {/* Obstacle Box */}
                  <rect
                    x={xNear}
                    y={yRoof}
                    width={Math.max(4, xFar - xNear)}
                    height={yGround - yRoof}
                    fill="#334155"
                    stroke="#f87171"
                    strokeWidth="1.5"
                  />

                  {/* Obstacle Label */}
                  <text
                    x={(xNear + xFar) / 2}
                    y={yRoof - 4}
                    fill="#f87171"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {block.zoneId} ({block.heightM}m)
                  </text>
                </g>
              );
            })}

            {/* Selected Track Marker */}
            {trackAnalysis && (
              <g>
                <circle
                  cx={mapX(trackAnalysis.R)}
                  cy={mapY(trackAnalysis.z)}
                  r="5"
                  fill={trackAnalysis.isMasked ? '#ef4444' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <line
                  x1={mapX(trackAnalysis.R)}
                  y1="30"
                  x2={mapX(trackAnalysis.R)}
                  y2="220"
                  stroke={trackAnalysis.isMasked ? '#ef4444' : '#10b981'}
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
                <text
                  x={mapX(trackAnalysis.R) + 7}
                  y={mapY(trackAnalysis.z) - 6}
                  fill={trackAnalysis.isMasked ? '#fca5a5' : '#6ee7b7'}
                  fontSize="9"
                  fontWeight="bold"
                >
                  {selectedTrack?.trackNo} ({Math.round(trackAnalysis.R)}m, {Math.round(trackAnalysis.z)}m)
                  {trackAnalysis.isMasked ? ' [MASKED]' : ' [CLEAR]'}
                </text>
              </g>
            )}
          </svg>

          {/* Scale and Vertical Exaggeration Disclaimer */}
          <div className="mt-2 text-[10px] text-text-dim flex items-center justify-between w-full px-2">
            <span>SCALE: HORIZONTAL 0–5000m · ALTITUDE 0–160m</span>
            <span className="font-bold text-amber">
              VERTICAL EXAGGERATION: 12.2x (CLEARLY MARKED)
            </span>
          </div>

          <div className="text-[9px] text-text-dim/80 text-center mt-1">
            CANONICAL SIMULATION MASKING MODEL (RAY PROJECTION). NOT DEM-ACCURATE VIEWSHED.
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-line bg-carbon-900 flex items-center justify-between text-[10px]">
          <span className="text-text-dim">
            PRESS <kbd className="px-1 border border-line bg-carbon-800 text-text-main">[X]</kbd> OR ESC TO DISMISS
          </span>

          <button
            onClick={onClose}
            className="px-3 py-1 font-bold border border-line hover:border-amber text-amber transition-colors"
          >
            DISMISS AID
          </button>
        </div>
      </div>
    </div>
  );
};
