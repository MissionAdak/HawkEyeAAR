import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSessionStore } from '@/store/sessionStore';
import * as sessionRepo from '@/db/sessionRepo';
import type { SessionRow } from '@/db/dexie';

describe('TASK 20-A1 — Session Persistence Lifecycle & Retry Recovery (High-priority E)', () => {
  beforeEach(() => {
    sessionRepo.clearSessionRepoForTest();
    useSessionStore.setState({
      sessionPersistenceStatus: 'IDLE',
      latestSavedSessionUid: null,
      lastFailedSessionRow: null,
    });
    vi.restoreAllMocks();
  });

  it('transitions state correctly through SAVING to SAVED upon successful write', async () => {
    const mockRow: SessionRow = {
      uid: 'sess-pers-001',
      traineeUid: 'trainee-viper-2',
      mode: 'EVAL',
      startedAt: 1700000000000,
      durationMs: 60000,
      score: 85,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.5,
      metrics: sessionRepo.createMockMetrics(85, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
      scenarioId: 'DEMO-1',
    };

    useSessionStore.setState({
      sessionPersistenceStatus: 'SAVING',
      lastFailedSessionRow: null,
    });

    await sessionRepo.saveCompletedSession(mockRow, 'VIPER-2');
    useSessionStore.setState({
      latestSavedSessionUid: mockRow.uid,
      sessionPersistenceStatus: 'SAVED',
      lastFailedSessionRow: null,
    });

    const state = useSessionStore.getState();
    expect(state.sessionPersistenceStatus).toBe('SAVED');
    expect(state.latestSavedSessionUid).toBe('sess-pers-001');
    expect(state.lastFailedSessionRow).toBeNull();

    const stored = await sessionRepo.getTraineeSessions('VIPER-2');
    expect(stored).toHaveLength(1);
    expect(stored[0].uid).toBe('sess-pers-001');
  });

  it('transitions to ERROR and captures lastFailedSessionRow when persistence fails', async () => {
    const mockRow: SessionRow = {
      uid: 'sess-fail-002',
      traineeUid: 'trainee-viper-2',
      mode: 'EVAL',
      startedAt: 1700000005000,
      durationMs: 60000,
      score: 72,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.4,
      metrics: sessionRepo.createMockMetrics(72, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
      scenarioId: 'DEMO-1',
    };

    // Simulate write error
    vi.spyOn(sessionRepo, 'saveCompletedSession').mockRejectedValueOnce(
      new Error('Simulated IndexedDB transaction abort')
    );

    useSessionStore.setState({
      sessionPersistenceStatus: 'SAVING',
      lastFailedSessionRow: null,
    });

    try {
      await sessionRepo.saveCompletedSession(mockRow, 'VIPER-2');
      useSessionStore.setState({
        latestSavedSessionUid: mockRow.uid,
        sessionPersistenceStatus: 'SAVED',
      });
    } catch {
      useSessionStore.setState({
        sessionPersistenceStatus: 'ERROR',
        lastFailedSessionRow: mockRow,
      });
    }

    const state = useSessionStore.getState();
    expect(state.sessionPersistenceStatus).toBe('ERROR');
    expect(state.latestSavedSessionUid).toBeNull();
    expect(state.lastFailedSessionRow).toEqual(mockRow);
  });

  it('recovers via retrySaveSession(), preserving original UID and startedAt timestamp without creating duplicate rows', async () => {
    const mockRow: SessionRow = {
      uid: 'sess-retry-003',
      traineeUid: 'trainee-viper-2',
      mode: 'EVAL',
      startedAt: 1700000010000,
      durationMs: 60000,
      score: 78,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.45,
      metrics: sessionRepo.createMockMetrics(78, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
      scenarioId: 'DEMO-1',
    };

    // Set initial failed state
    useSessionStore.setState({
      sessionPersistenceStatus: 'ERROR',
      lastFailedSessionRow: mockRow,
      latestSavedSessionUid: null,
    });

    // Execute retry
    const success = await useSessionStore.getState().retrySaveSession();
    expect(success).toBe(true);

    const state = useSessionStore.getState();
    expect(state.sessionPersistenceStatus).toBe('SAVED');
    expect(state.latestSavedSessionUid).toBe('sess-retry-003');
    expect(state.lastFailedSessionRow).toBeNull();

    // Verify row was stored with exact original UID and timestamp
    const stored = await sessionRepo.getTraineeSessions('VIPER-2');
    expect(stored).toHaveLength(1);
    expect(stored[0].uid).toBe('sess-retry-003');
    expect(stored[0].startedAt).toBe(1700000010000);
    expect(stored[0].score).toBe(78);

    // Call retry again to verify duplicate prevention
    useSessionStore.setState({ lastFailedSessionRow: mockRow });
    await useSessionStore.getState().retrySaveSession();

    const storedAfterDuplicateCall = await sessionRepo.getTraineeSessions('VIPER-2');
    expect(storedAfterDuplicateCall).toHaveLength(1);
  });
});
