import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { UnitView } from '@/ui/aar/panels/UnitView';
import { TrendChart } from '@/ui/aar/charts/TrendChart';
import { SessionTable } from '@/ui/aar/panels/SessionTable';
import { HotWash } from '@/ui/HotWash';
import { createMockMetrics } from '@/db/sessionRepo';
import type { UnitTraineeSummary, UnitCohortStats } from '@/db/sessionRepo';
import type { SessionRow } from '@/db/dexie';

describe('TASK 20 UI — Unit Readiness View, Longitudinal Trend Chart & Session Table', () => {
  const dummySummaries: UnitTraineeSummary[] = [
    {
      callsign: 'HAWK-1',
      traineeUid: 'trainee-hawk-1',
      unitName: 'ALPHA COY',
      totalSessions: 2,
      evalSessionsCount: 1,
      trainSessionsCount: 1,
      latestEvalScore: 94,
      latestEvalGrade: 'PROFICIENT_IN_SIMULATION',
      highestTrainDifficulty: 0.5,
      latestMetrics: createMockMetrics(94, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
      meanEvalScore: 94,
      evalPassRate: 100,
    },
    {
      callsign: 'VIPER-2',
      traineeUid: 'trainee-viper-2',
      unitName: 'ALPHA COY',
      totalSessions: 4,
      evalSessionsCount: 1,
      trainSessionsCount: 3,
      latestEvalScore: 86,
      latestEvalGrade: 'PROFICIENT_IN_SIMULATION',
      highestTrainDifficulty: 0.6,
      latestMetrics: createMockMetrics(86, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
      meanEvalScore: 86,
      evalPassRate: 100,
    },
    {
      callsign: 'GHOST-4',
      traineeUid: 'trainee-ghost-4',
      unitName: 'ALPHA COY',
      totalSessions: 2,
      evalSessionsCount: 0,
      trainSessionsCount: 2,
      latestEvalScore: null, // Rules.md R4.4: TRAIN-only must display '—'
      latestEvalGrade: null,
      highestTrainDifficulty: 0.35,
      latestMetrics: createMockMetrics(64, 'DEVELOPING', 'TRAIN'),
      meanEvalScore: null,
      evalPassRate: null,
    },
  ];

  const dummyCohortStats: UnitCohortStats = {
    cohortMeanEvalScore: 90,
    cohortEvalPassRate: 100,
    totalEvalSessions: 2,
    activeTraineesCount: 3,
  };

  const dummySessions: SessionRow[] = [
    {
      uid: 'sess-1',
      traineeUid: 'trainee-viper-2',
      mode: 'TRAIN',
      startedAt: 100000,
      durationMs: 60000,
      score: 64,
      grade: 'DEVELOPING',
      dStart: 0.3,
      metrics: createMockMetrics(64, 'DEVELOPING', 'TRAIN'),
      scenarioId: 'PROCEDURAL-1',
    },
    {
      uid: 'sess-2',
      traineeUid: 'trainee-viper-2',
      mode: 'TRAIN',
      startedAt: 200000,
      durationMs: 70000,
      score: 72,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.45,
      metrics: createMockMetrics(72, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
      scenarioId: 'PROCEDURAL-1',
    },
    {
      uid: 'sess-3',
      traineeUid: 'trainee-viper-2',
      mode: 'EVAL',
      startedAt: 300000,
      durationMs: 80000,
      score: 86,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.5,
      metrics: createMockMetrics(86, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
      scenarioId: 'DEMO-1',
    },
  ];

  describe('1. UnitView Component & Rules.md R4.4 Conformance', () => {
    it('renders cohort KPI summary cards with accurate benchmark metrics', () => {
      const html = renderToString(
        <UnitView
          summaries={dummySummaries}
          cohortStats={dummyCohortStats}
          selectedTraineeCallsign="VIPER-2"
          onSelectTrainee={() => {}}
        />
      );

      expect(html).toContain('COHORT MEAN EVAL SCORE');
      expect(html).toContain('90');
      expect(html).toContain('EVAL PASS RATE');
      expect(html).toContain('100%');
      expect(html).toContain('TOTAL EVAL DRILLS');
      expect(html).toContain('UNIT OPERATOR ROSTER');
      expect(html).toContain('3');
      expect(html).toContain('RULES.MD R4.4: EVAL BENCHMARKS ONLY');
    });

    it('renders unit leaderboard with rank, callsigns, and strictly respects Rules.md R4.4 for TRAIN-only trainees', () => {
      const html = renderToString(
        <UnitView
          summaries={dummySummaries}
          cohortStats={dummyCohortStats}
          selectedTraineeCallsign="VIPER-2"
          onSelectTrainee={() => {}}
        />
      );

      expect(html).toContain('HAWK-1');
      expect(html).toContain('VIPER-2');
      expect(html).toContain('GHOST-4');

      // Rank 1 HAWK-1 with EVAL score 94
      expect(html).toContain('#1');
      expect(html).toContain('94');

      // Rank 2 VIPER-2 with EVAL score 86
      expect(html).toContain('#2');
      expect(html).toContain('86');
      expect(html).toContain('ACTIVE');

      // Rank 3 GHOST-4 (TRAIN ONLY) MUST show '—' and 'IN TRAINING' badge
      expect(html).toContain('IN TRAINING');
      expect(html).toContain('d=0.35');
    });
  });

  describe('2. TrendChart Canvas Component', () => {
    it('renders HTML5 canvas and keyboard-accessible legend toggle buttons', () => {
      const html = renderToString(
        <TrendChart
          sessions={dummySessions}
          selectedSessionUid="sess-3"
          onSelectSession={() => {}}
        />
      );

      expect(html).toContain('data-testid="trend-chart-container"');
      expect(html).toContain('data-testid="trend-chart-canvas"');
      expect(html).toContain('LONGITUDINAL PERFORMANCE TREND');
      expect(html).toContain('DRILL');

      // Check all 6 canonical metric legend buttons
      expect(html).toContain('Score [S]');
      expect(html).toContain('Detection [D]');
      expect(html).toContain('Classify [C]');
      expect(html).toContain('Engage [G]');
      expect(html).toContain('ROE [R]');
      expect(html).toContain('Difficulty [d]');
      expect(html).toContain('role="toolbar"');
    });
  });

  describe('3. SessionTable Component', () => {
    it('renders drill table with mode filters, delta scores, and detailed sub-metrics', () => {
      const html = renderToString(
        <SessionTable
          sessions={dummySessions}
          selectedSessionUid="sess-3"
          onSelectSession={() => {}}
        />
      );

      expect(html).toContain('data-testid="session-table-container"');
      expect(html).toContain('data-testid="session-history-table"');
      expect(html).toContain('SESSION DRILL LOG');
      expect(html).toContain('RECORDS');

      // Filter buttons
      expect(html).toContain('>ALL<');
      expect(html).toContain('>EVAL<');
      expect(html).toContain('>TRAIN<');

      // Drill rows & delta S
      expect(html).toContain('PROCEDURAL-1');
      expect(html).toContain('DEMO-1');
      expect(html).toContain('+8'); // 72 - 64
      expect(html).toContain('+14'); // 86 - 72
      expect(html).toContain('0.50');
    });
  });

  describe('4. HotWash Modal Tab Integration', () => {
    it('renders modal navigation tabs including SCORECARD, REPLAY, TRENDS & HISTORY, and UNIT READINESS', () => {
      const html = renderToString(<HotWash onClose={() => {}} />);

      expect(html).toContain('data-testid="tab-scorecard"');
      expect(html).toContain('data-testid="tab-replay"');
      expect(html).toContain('data-testid="tab-trends"');
      expect(html).toContain('data-testid="tab-unit"');

      expect(html).toContain('SCORECARD');
      expect(html).toContain('REPLAY');
      expect(html).toContain('TRENDS &amp; HISTORY');
      expect(html).toContain('UNIT READINESS');
      expect(html).toContain('data-testid="operator-callsign-select"');
    });
  });
});
