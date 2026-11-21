import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSessionStore, persistCompletedSession } from '@/store/sessionStore';
import * as sessionRepo from '@/db/sessionRepo';
import {
  EventRecorder,
  setMockPersistenceFailureMode,
  clearFallbackEventsForTest,
  getRecordedEventsForSession,
} from '@/db/recorder';
import type { SessionRow } from '@/db/dexie';
import type { SimEvent } from '@/sim/types';

describe('TASK 20-A3 — Session Persistence Lifecycle, Durability & Immutable Operator Attribution (Critical C, D & F)', () => {
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

  describe('Critical D & High-Priority F: Complete Retry-Path Persistence Proof', () => {
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

      // Execute actual production persistence coordinator
      const success = await persistCompletedSession(mockRow, recorder, 'VIPER-2');
      expect(success).toBe(false);

      const state = useSessionStore.getState();
      expect(state.sessionPersistenceStatus).toBe('ERROR');
      expect(state.lastFailedSessionRow).toEqual(mockRow);
      expect(state.lastFailedRecorder).toBe(recorder);

      // Verify no events were persisted yet
      const storedEvents = await getRecordedEventsForSession(sessionUid);
      expect(storedEvents).toHaveLength(0);

      // Clear failure and execute production retry action
      setMockPersistenceFailureMode('NONE');
      const retrySuccess = await useSessionStore.getState().retrySaveSession();
      expect(retrySuccess).toBe(true);

      const postRetryState = useSessionStore.getState();
      expect(postRetryState.sessionPersistenceStatus).toBe('SAVED');
      expect(postRetryState.latestSavedSessionUid).toBe(sessionUid);
      expect(postRetryState.lastFailedSessionRow).toBeNull();
      expect(postRetryState.lastFailedRecorder).toBeNull();

      // Verify all events and session row are now durably persisted
      const persistedEvents = await getRecordedEventsForSession(sessionUid);
      expect(persistedEvents).toHaveLength(2);
      expect(persistedEvents[0].seq).toBe(1);
      expect(persistedEvents[1].seq).toBe(2);

      const persistedSessions = await sessionRepo.getTraineeSessions('VIPER-2');
      expect(persistedSessions).toHaveLength(1);
      expect(persistedSessions[0].uid).toBe(sessionUid);
    });

    it('handles session metadata persistence failure alone, setting ERROR and permitting retry without event duplication', async () => {
      // Set simulated session repo failure mode BEFORE attempting persistence
      setMockPersistenceFailureMode('SESSION');

      const sessionUid = 'sess-meta-fail-003';
      const recorder = new EventRecorder(sessionUid, 1700000002000);
      const testEvents: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } },
      ];
      testEvents.forEach((ev) => recorder.record(ev));

      const mockRow: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000002000,
        durationMs: 1000,
        score: 75,
        grade: 'DEVELOPING',
        dStart: 0.3,
        metrics: sessionRepo.createMockMetrics(75, 'DEVELOPING', 'EVAL'),
        scenarioId: 'DEMO-1',
      };

      // Execute actual production persistence coordinator
      const success = await persistCompletedSession(mockRow, recorder, 'VIPER-2');
      expect(success).toBe(false);

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
      expect(storedSessions[0].uid).toBe(sessionUid);
    });

    it('recovers from dual failure (both events and metadata) and is idempotent on repeat retry calls', async () => {
      const sessionUid = 'sess-dual-fail-004';
      const originalStartedAt = 1700000003000;
      const originalTraineeUid = 'trainee-viper-2';

      // Set failure mode BOTH BEFORE recording events so the initial flush attempt fails
      setMockPersistenceFailureMode('BOTH');

      const recorder = new EventRecorder(sessionUid, originalStartedAt);
      recorder.record({ seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } });
      recorder.record({ seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } });

      const mockRow: SessionRow = {
        uid: sessionUid,
        traineeUid: originalTraineeUid,
        mode: 'EVAL',
        startedAt: originalStartedAt,
        durationMs: 1000,
        score: 91,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: sessionRepo.createMockMetrics(91, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
      };

      // Actually execute the initial production persistence attempt and prove that failure is observed!
      const initialSuccess = await persistCompletedSession(mockRow, recorder, 'VIPER-2');
      expect(initialSuccess).toBe(false);

      const stateAfterFailure = useSessionStore.getState();
      expect(stateAfterFailure.sessionPersistenceStatus).toBe('ERROR');
      expect(stateAfterFailure.lastFailedSessionRow).toEqual(mockRow);
      expect(stateAfterFailure.lastFailedRecorder).toBe(recorder);

      // Verify 0 events and 0 sessions were persisted during failure
      expect(await getRecordedEventsForSession(sessionUid)).toHaveLength(0);
      expect(await sessionRepo.getTraineeSessions('VIPER-2')).toHaveLength(0);

      // Clear failure mode
      setMockPersistenceFailureMode('NONE');

      // First retry execution
      const firstRetry = await useSessionStore.getState().retrySaveSession();
      expect(firstRetry).toBe(true);
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');

      // Verify original session UID, trainee UID, and startedAt are strictly preserved
      const storedSessions = await sessionRepo.getTraineeSessions('VIPER-2');
      expect(storedSessions).toHaveLength(1);
      expect(storedSessions[0].uid).toBe(sessionUid);
      expect(storedSessions[0].traineeUid).toBe(originalTraineeUid);
      expect(storedSessions[0].startedAt).toBe(originalStartedAt);

      // Verify event log is contiguous with no duplicates
      const storedEvents = await getRecordedEventsForSession(sessionUid);
      expect(storedEvents).toHaveLength(2);
      expect(storedEvents[0].seq).toBe(1);
      expect(storedEvents[1].seq).toBe(2);

      // Repeated retry call is safe, idempotent, and produces zero duplicates
      await useSessionStore.getState().retrySaveSession();
      // Should cleanly return false or true because row was already successfully saved
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');

      // Final assertions: no duplicate rows, no duplicate sequence numbers
      const finalSessions = await sessionRepo.getTraineeSessions('VIPER-2');
      expect(finalSessions).toHaveLength(1);
      const finalEvents = await getRecordedEventsForSession(sessionUid);
      expect(finalEvents).toHaveLength(2);
    });
  });
});
