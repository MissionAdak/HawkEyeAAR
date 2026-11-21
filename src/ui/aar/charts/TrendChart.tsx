import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { SessionRow } from '@/db/dexie';

interface TrendChartProps {
  sessions: SessionRow[];
  width?: number;
  height?: number;
  selectedSessionUid?: string | null;
  onSelectSession?: (session: SessionRow) => void;
}

interface MetricConfig {
  key: 'score' | 'd' | 'c' | 'g' | 'r' | 'diff';
  label: string;
  color: string;
  dash?: number[];
  isRightAxis?: boolean;
}

const METRICS: MetricConfig[] = [
  { key: 'score', label: 'Score [S]', color: '#00FF66' },
  { key: 'd', label: 'Detection [D]', color: '#FF9900' },
  { key: 'c', label: 'Classify [C]', color: '#00CCFF' },
  { key: 'g', label: 'Engage [G]', color: '#FFCC00' },
  { key: 'r', label: 'ROE [R]', color: '#FF3333' },
  { key: 'diff', label: 'Difficulty [d]', color: '#8B949E', dash: [4, 4], isRightAxis: true },
];

export const TrendChart: React.FC<TrendChartProps> = ({
  sessions,
  height = 280,
  selectedSessionUid,
  onSelectSession,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Active visibility toggles for lines
  const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({
    score: true,
    d: true,
    c: true,
    g: true,
    r: true,
    diff: true,
  });

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const toggleMetric = (key: string) => {
    setVisibleMetrics((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Sort sessions chronologically ascending for trend line
  const chronologicalSessions = useMemo(() => {
    return [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  }, [sessions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle container dimensions and DPR (capped at 2 for performance)
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const width = rect.width || 800;
    const canvasHeight = height;

    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // Layout Margins
    const padLeft = 45;
    const padRight = 50;
    const padTop = 25;
    const padBottom = 35;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = canvasHeight - padTop - padBottom;

    // Clear background
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, width, canvasHeight);

    // Draw Plot Area Background
    ctx.fillStyle = '#161B22';
    ctx.fillRect(padLeft, padTop, plotWidth, plotHeight);

    // Draw Horizontal Grid Lines (0 to 100 on left, 0.0 to 1.0 on right)
    const gridSteps = 5;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '10px "JetBrains Mono", monospace';

    for (let i = 0; i <= gridSteps; i++) {
      const pct = i / gridSteps;
      const y = padTop + plotHeight - pct * plotHeight;
      const scoreVal = Math.round(pct * 100);
      const diffVal = (pct * 1.0).toFixed(1);

      // Grid line
      ctx.beginPath();
      ctx.strokeStyle = i === 0 ? '#262B33' : '#1F2630';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotWidth, y);
      ctx.stroke();

      // Left Axis Label (Score / Percentage)
      ctx.fillStyle = '#7D8590';
      ctx.textAlign = 'right';
      ctx.fillText(`${scoreVal}`, padLeft - 6, y);

      // Right Axis Label (Difficulty d in cyan)
      ctx.fillStyle = '#00CCFF';
      ctx.textAlign = 'left';
      ctx.fillText(`d=${diffVal}`, padLeft + plotWidth + 6, y);
    }

    // If no sessions, draw empty state
    if (chronologicalSessions.length === 0) {
      ctx.fillStyle = '#7D8590';
      ctx.textAlign = 'center';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('NO SESSION HISTORY RECORDED YET', width / 2, canvasHeight / 2);
      return;
    }

    const n = chronologicalSessions.length;
    const getX = (index: number) => {
      if (n === 1) return padLeft + plotWidth / 2;
      return padLeft + (index / (n - 1)) * plotWidth;
    };

    const getYLeft = (val: number) => {
      const clamped = Math.max(0, Math.min(100, val));
      return padTop + plotHeight - (clamped / 100) * plotHeight;
    };

    const getYRight = (val: number) => {
      const clamped = Math.max(0, Math.min(1.0, val));
      return padTop + plotHeight - clamped * plotHeight;
    };

    // Draw Vertical session ticks on X axis
    for (let i = 0; i < n; i++) {
      const x = getX(i);
      const s = chronologicalSessions[i];

      // Tick line
      ctx.beginPath();
      ctx.strokeStyle = '#1F2630';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotHeight);
      ctx.stroke();

      // Label (e.g. S1, S2...)
      ctx.fillStyle = s.uid === selectedSessionUid ? '#00FF66' : '#7D8590';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`S${i + 1}`, x, padTop + plotHeight + 6);
    }

    // Function to extract metric value for a session
    const getMetricValue = (s: SessionRow, key: MetricConfig['key']) => {
      switch (key) {
        case 'score':
          return s.score;
        case 'd':
          return s.metrics?.dScore ?? 0;
        case 'c':
          return s.metrics?.cScore ?? 0;
        case 'g':
          return s.metrics?.gScore ?? 0;
        case 'r':
          return s.metrics?.rScore ?? 0;
        case 'diff':
          return s.dStart ?? 0.3;
      }
    };

    // Draw Metric Lines
    for (const metric of METRICS) {
      if (!visibleMetrics[metric.key]) continue;

      ctx.beginPath();
      ctx.strokeStyle = metric.color;
      ctx.lineWidth = metric.key === 'score' ? 2.5 : 1.5;
      ctx.setLineDash(metric.dash || []);

      for (let i = 0; i < n; i++) {
        const val = getMetricValue(chronologicalSessions[i], metric.key);
        const x = getX(i);
        const y = metric.isRightAxis ? getYRight(val) : getYLeft(val);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw point markers
      ctx.setLineDash([]);
      for (let i = 0; i < n; i++) {
        const val = getMetricValue(chronologicalSessions[i], metric.key);
        const x = getX(i);
        const y = metric.isRightAxis ? getYRight(val) : getYLeft(val);

        ctx.beginPath();
        ctx.fillStyle = metric.color;
        ctx.arc(x, y, metric.key === 'score' ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0D1117';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Highlight Hovered Session or Selected Session
    const activeIdx = hoveredIndex !== null ? hoveredIndex : chronologicalSessions.findIndex((s) => s.uid === selectedSessionUid);
    if (activeIdx >= 0 && activeIdx < n) {
      const activeX = getX(activeIdx);
      const activeSession = chronologicalSessions[activeIdx];

      // Hairline crosshair
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(activeX, padTop);
      ctx.lineTo(activeX, padTop + plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight circles for active session
      for (const metric of METRICS) {
        if (!visibleMetrics[metric.key]) continue;
        const val = getMetricValue(activeSession, metric.key);
        const y = metric.isRightAxis ? getYRight(val) : getYLeft(val);

        ctx.beginPath();
        ctx.fillStyle = '#FFFFFF';
        ctx.arc(activeX, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = metric.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Outer border of plot
    ctx.strokeStyle = '#262B33';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotWidth, plotHeight);
  }, [chronologicalSessions, visibleMetrics, hoveredIndex, selectedSessionUid, height]);

  // Handle Mouse Hover / Click
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || chronologicalSessions.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const padLeft = 45;
    const padRight = 50;
    const plotWidth = rect.width - padLeft - padRight;

    const n = chronologicalSessions.length;
    if (n === 1) {
      setHoveredIndex(0);
      return;
    }

    const relX = mouseX - padLeft;
    const rawIndex = Math.round((relX / plotWidth) * (n - 1));
    const clampedIndex = Math.max(0, Math.min(n - 1, rawIndex));

    setHoveredIndex(clampedIndex);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const handleClick = () => {
    if (hoveredIndex !== null && onSelectSession && chronologicalSessions[hoveredIndex]) {
      onSelectSession(chronologicalSessions[hoveredIndex]);
    }
  };

  const activeSessionForTooltip = hoveredIndex !== null ? chronologicalSessions[hoveredIndex] : null;

  return (
    <div
      ref={containerRef}
      className="bg-carbon-950 border border-line p-3 flex flex-col font-mono text-xs select-none"
      data-testid="trend-chart-container"
    >
      {/* Chart Header & Legend Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-text-main tracking-wider text-xs">
            LONGITUDINAL PERFORMANCE TREND
          </span>
          <span className="text-[10px] text-text-dim border border-line px-1.5 py-0.5">
            {chronologicalSessions.length} DRILL{chronologicalSessions.length === 1 ? '' : 'S'}
          </span>
        </div>

        {/* Keyboard-accessible Legend Buttons */}
        <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Metric line toggles">
          {METRICS.map((m) => {
            const isVisible = visibleMetrics[m.key];
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleMetric(m.key)}
                aria-pressed={isVisible}
                className={`px-2 py-0.5 text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                  isVisible
                    ? 'bg-carbon-900 border-line text-text-main shadow-sm'
                    : 'bg-carbon-950 border-line/40 text-text-dim opacity-50 line-through'
                }`}
                style={{
                  borderLeftColor: isVisible ? m.color : '#262B33',
                  borderLeftWidth: '3px',
                }}
              >
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="w-full h-full cursor-crosshair block"
          style={{ width: '100%', height: `${height}px` }}
          aria-label="Longitudinal Performance Trend Chart"
          data-testid="trend-chart-canvas"
        />

        {/* Interactive Hover Readout Overlay */}
        {activeSessionForTooltip && (
          <div
            className="absolute top-2 right-14 bg-carbon-900 border border-line p-2 shadow-xl pointer-events-none text-[11px] space-y-1 z-10"
            data-testid="trend-chart-tooltip"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line pb-1">
              <span className="font-bold text-phosphor">
                DRILL S{hoveredIndex! + 1} ({activeSessionForTooltip.mode})
              </span>
              <span className="text-text-dim text-[10px]">
                {activeSessionForTooltip.scenarioId ?? 'SCENARIO'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
              <div>
                Score: <span className="font-bold text-phosphor">{activeSessionForTooltip.score}</span>/100
              </div>
              <div>
                Difficulty: <span className="font-bold text-friend">d={activeSessionForTooltip.dStart.toFixed(2)}</span>
              </div>
              <div>
                Detection [D]: <span className="font-bold text-amber">{activeSessionForTooltip.metrics?.dScore ?? '—'}</span>
              </div>
              <div>
                Classify [C]: <span className="font-bold text-friend">{activeSessionForTooltip.metrics?.cScore ?? '—'}</span>
              </div>
              <div>
                Engage [G]: <span className="font-bold text-amber">{activeSessionForTooltip.metrics?.gScore ?? '—'}</span>
              </div>
              <div>
                ROE [R]: <span className="font-bold text-threat">{activeSessionForTooltip.metrics?.rScore ?? '—'}</span>
              </div>
            </div>
            <div className="text-[9px] text-text-dim pt-0.5">
              MET: {activeSessionForTooltip.metrics?.metMs ? `${(activeSessionForTooltip.metrics.metMs / 1000).toFixed(1)}s` : '—'} | Grade: {activeSessionForTooltip.grade}
            </div>
          </div>
        )}
      </div>

      {/* Screen-reader accessible summary */}
      <div className="sr-only">
        Trend chart shows performance across {chronologicalSessions.length} sessions.
        Latest score is {chronologicalSessions[chronologicalSessions.length - 1]?.score ?? 0} with grade {chronologicalSessions[chronologicalSessions.length - 1]?.grade ?? 'N/A'}.
      </div>
    </div>
  );
};
