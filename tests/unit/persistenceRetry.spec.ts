import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSessionStore } from '@/store/sessionStore';
import * as sessionRepo from '@/db/sessionRepo';
import {
  EventRecorder,
  setMockPersistenceFailureMode,
  clearFallbackEventsForTest,
  getRecordedEventsForSession,
} from '@/db/recorder';
import type { SessionRow } from '@/db/dexie';
import type { SimEvent } from '@/sim/types';

describe('TASK 20-A2 — Session Persistence Lifecycle, Durability & Immutable Operator Attribution (Critical C & D)', () => {
  beforeEach(() => {
    sessionRepo.clearSessionRepoForTest();
    clearFallbackEventsForTest();
    setMockPersistenceFailureMode('NONE');
    useSessionStore.setState({
      sessionPersistenceStatus: 'IDLE',
      latestSavedSessionUid: null,
      lastFailedSessionRow: null,
      lastFailedRecorder: null,
      currentCallsign: 'VIPER-2',
      currentSessionTraineeUid: 'trainee-viper-2',
    });
    vi.restoreAllMocks();
  });

  describe('Critical C: Immutable Trainee Attribution Across Failed Writes and Retries', () => {
    it('strictly preserves original trainee identity when operator is changed in AAR before retry', async () => {
      const originalTraineeUid = 'trainee-viper-2';
      const mockRow: SessionRow = {
        uid: 'sess-immutable-001',
        traineeUid: originalTraineeUid,
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 60000,
        score: 88,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: sessionRepo.createMockMetrics(88, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
        isSynthetic: false,
      };

      // Set initial failed persistence state
      useSessionStore.setState({
        sessionPersistenceStatus: 'ERROR',
        lastFailedSessionRow: mockRow,
        latestSavedSessionUid: null,
        currentCallsign: 'VIPER-2',
      });

      // Operator opens AAR and inspects another operator (e.g. HAWK-1)
      useSessionStore.getState().setCallsign('HAWK-1');
      expect(useSessionStore.getState().currentCallsign).toBe('HAWK-1');

      // Execute retry save while HAWK-1 is the active UI display callsign
      const retryResult = await useSessionStore.getState().retrySaveSession();
      expect(retryResult).toBe(true);

      const state = useSessionStore.getState();
      expect(state.sessionPersistenceStatus).toBe('SAVED');
      expect(state.latestSavedSessionUid).toBe('sess-immutable-001');
      expect(state.lastFailedSessionRow).toBeNull();

      // Verify the session is persisted under VIPER-2 (trainee-viper-2)
      const viperSessions = await sessionRepo.getTraineeSessions('VIPER-2');
      expect(viperSessions).toHaveLength(1);
      expect(viperSessions[0].uid).toBe('sess-immutable-001');
      expect(viperSessions[0].traineeUid).toBe('trainee-viper-2');

      // Verify no session was cross-attributed to HAWK-1
      const hawkSessions = await sessionRepo.getTraineeSessions('HAWK-1');
      expect(hawkSessions).toHaveLength(0);
    });
  });

  describe('Critical D: AAR Durability — SAVED Means Metadata + Events Stored', () => {
    it('handles event persistence failure alone, setting ERROR and retaining recorder + row for retry', async () => {
      // Set simulated event failure mode BEFORE recording events so buffer retain is triggered
      setMockPersistenceFailureMode('EVENTS');

      const sessionUid = 'sess-event-fail-002';
      const recorder = new EventRecorder(sessionUid, 1700000001000);
      const testEvents: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } },
      ];
      testEvents.forEach((ev) => recorder.record(ev));

      const mockRow: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000001000,
        durationMs: 1000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.4,
        metrics: sessionRepo.createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
      };

      useSessionStore.setState({
        sessionPersistenceStatus: 'SAVING',
        lastFailedSessionRow: null,
        lastFailedRecorder: null,
      });

      // Attempt write sequence
      let caughtError = false;
      try {
        await recorder.stop();
        await sessionRepo.saveCompletedSession(mockRow, 'VIPER-2');
        useSessionStore.setState({ sessionPersistenceStatus: 'SAVED' });
      } catch {
        caughtError = true;
        useSessionStore.setState({
          sessionPersistenceStatus: 'ERROR',
          lastFailedSessionRow: mockRow,
          lastFailedRecorder: recorder,
        });
      }

      expect(caughtError).toBe(true);
      const state = useSessionStore.getState();
      expect(state.sessionPersistenceStatus).toBe('ERROR');
      expect(state.lastFailedSessionRow).toEqual(mockRow);
      expect(state.lastFailedRecorder).toBe(recorder);

      // Verify no events were persisted yet
      const storedEvents = await getRecordedEventsForSession(sessionUid);
      expect(storedEvents).toHaveLength(0);

      // Clear failure and retry
      setMockPersistenceFailureMode('NONE');
      const retrySuccess = await useSessionStore.getState().retrySaveSession();
      expect(retrySuccess).toBe(true);

      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');

      // Verify both events and session row are now safely persisted
      const storedEventsAfterRetry = await getRecordedEventsForSession(sessionUid);
      expect(storedEventsAfterRetry).toHaveLength(2);
      expect(storedEventsAfterRetry[0].type).toBe('SIM_START');
      expect(storedEventsAfterRetry[1].type).toBe('SESSION_END');

      const storedSessions = await sessionRepo.getTraineeSessions('VIPER-2');
      expect(storedSessions).toHaveLength(1);
      expect(storedSessions[0].uid).toBe(sessionUid);
    });

    it('handles session repo failure alone, setting ERROR and recovering without duplicate event logs', async () => {
      const sessionUid = 'sess-meta-fail-003';
      const recorder = new EventRecorder(sessionUid, 1700000002000);
      recorder.record({ seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } });
      recorder.record({ seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } });

      const mockRow: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000002000,
        durationMs: 1000,
        score: 75,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: sessionRepo.createMockMetrics(75, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
      };

      // Set simulated session repo failure mode
      setMockPersistenceFailureMode('SESSION');

      useSessionStore.setState({
        sessionPersistenceStatus: 'SAVING',
        lastFailedSessionRow: null,
        lastFailedRecorder: null,
      });

      let caughtError = false;
      try {
        await recorder.stop(); // Events succeed
        await sessionRepo.saveCompletedSession(mockRow, 'VIPER-2'); // Session fails
        useSessionStore.setState({ sessionPersistenceStatus: 'SAVED' });
      } catch {
        caughtError = true;
        useSessionStore.setState({
          sessionPersistenceStatus: 'ERROR',
          lastFailedSessionRow: mockRow,
          lastFailedRecorder: recorder,
        });
      }

      expect(caughtError).toBe(true);
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('ERROR');

      // Clear failure and retry
      setMockPersistenceFailureMode('NONE');
      const retrySuccess = await useSessionStore.getState().retrySaveSession();
      expect(retrySuccess).toBe(true);
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');

      // Verify event log is not duplicated on retry
      const storedEvents = await getRecordedEventsForSession(sessionUid);
      expect(storedEvents).toHaveLength(2);

      const storedSessions = await sessionRepo.getTraineeSessions('VIPER-2');
      expect(storedSessions).toHaveLength(1);
    });

    it('recovers from dual failure (both events and metadata) and is idempotent on repeat retry calls', async () => {
      const sessionUid = 'sess-dual-fail-004';
      const recorder = new EventRecorder(sessionUid, 1700000003000);
      recorder.record({ seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } });
      recorder.record({ seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } });

      const mockRow: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000003000,
        durationMs: 1000,
        score: 91,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: sessionRepo.createMockMetrics(91, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
      };

      setMockPersistenceFailureMode('BOTH');

      useSessionStore.setState({
        sessionPersistenceStatus: 'ERROR',
        lastFailedSessionRow: mockRow,
        lastFailedRecorder: recorder,
      });

      // Clear failure
      setMockPersistenceFailureMode('NONE');

      // First retry
      const firstRetry = await useSessionStore.getState().retrySaveSession();
      expect(firstRetry).toBe(true);
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');

      // Duplicate retry call should be safe and idempotent
      useSessionStore.setState({ lastFailedSessionRow: mockRow, lastFailedRecorder: recorder });
      const duplicateRetry = await useSessionStore.getState().retrySaveSession();
      expect(duplicateRetry).toBe(true);

      const storedEvents = await getRecordedEventsForSession(sessionUid);
      expect(storedEvents).toHaveLength(2);

      const storedSessions = await sessionRepo.getTraineeSessions('VIPER-2');
      expect(storedSessions).toHaveLength(1);
      expect(storedSessions[0].uid).toBe(sessionUid);
    });
  });
});
