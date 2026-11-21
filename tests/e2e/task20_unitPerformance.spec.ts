import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import type { DrishtiTestBridge } from '@/testBridge/drishtiTestBridge';

type WindowWithDrishti = Window & {
  __DRISHTI_TEST__?: DrishtiTestBridge | null;
};

test.describe('TASK 20 — Unit Performance View, Longitudinal Session History & Trend Dashboard', () => {
  const outDir20 = path.resolve(process.cwd(), 'reports/screenshots/task20');
  const artifactDir = 'C:\\Users\\Missi\\.gemini\\antigravity\\brain\\dcbbc993-bf1f-433e-850f-d7e049737f29';

  test.beforeAll(() => {
    if (!fs.existsSync(outDir20)) {
      fs.mkdirSync(outDir20, { recursive: true });
    }
  });

  const saveShot = async (page: Page, filename: string) => {
    const filePath = path.join(outDir20, filename);
    await page.screenshot({ path: filePath, fullPage: true });

    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(filePath, path.join(artifactDir, filename));
    }
  };

  test('01. Multi-Session Longitudinal Trend Chart, Session History Table & Rules.md R4.4 EVAL Leaderboard', async ({ page }) => {
    // 1. Navigate to application
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    // 2. Start session from briefing screen
    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();
    await expect(startBtn).not.toBeVisible({ timeout: 5000 });

    // 3. Wait for test bridge to be initialized
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return Boolean(win.__DRISHTI_TEST__?.isReady());
    }, undefined, { timeout: 10000 });

    // 4. Advance session to completion to trigger AAR
    await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.advanceToSessionEnd();
    });

    const aarModal = page.getByTestId('aar-modal');
    if (!(await aarModal.isVisible())) {
      const aarBtn = page.getByRole('button', { name: /\[AAR SCORECARD\]|AAR SCORECARD/i });
      if (await aarBtn.isVisible()) {
        await aarBtn.click({ force: true });
      }
    }
    await expect(aarModal).toBeVisible({ timeout: 5000 });

    // 5. Verify default tab is SCORECARD
    const tabScorecard = page.getByTestId('tab-scorecard');
    await expect(tabScorecard).toBeVisible();
    await expect(page.getByText('GLOBAL MISSION SCORE')).toBeVisible();

    // 6. Switch to TRENDS & HISTORY tab
    const tabTrends = page.getByTestId('tab-trends');
    await expect(tabTrends).toBeVisible();
    await tabTrends.click();

    // Assert TrendChart Canvas and Legend controls are visible
    const trendContainer = page.getByTestId('trend-chart-container');
    await expect(trendContainer).toBeVisible({ timeout: 5000 });
    const trendCanvas = page.getByTestId('trend-chart-canvas');
    await expect(trendCanvas).toBeVisible();
    await expect(page.getByText('LONGITUDINAL PERFORMANCE TREND')).toBeVisible();
    await expect(page.getByRole('button', { name: /Score \[S\]/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Difficulty \[d\]/i })).toBeVisible();

    // Assert Session Drill Log Table is visible
    const sessionTableContainer = page.getByTestId('session-table-container');
    await expect(sessionTableContainer).toBeVisible();
    const sessionHistoryTable = page.getByTestId('session-history-table');
    await expect(sessionHistoryTable).toBeVisible();
    await expect(page.getByText('SESSION DRILL LOG')).toBeVisible();

    // Capture screenshot of Trends & Session History
    await saveShot(page, 'task20_01_unit_performance_and_trends.png');

    // 7. Switch to UNIT READINESS tab
    const tabUnit = page.getByTestId('tab-unit');
    await expect(tabUnit).toBeVisible();
    await tabUnit.click();

    // Assert Unit Readiness Overview Cards
    const unitContainer = page.getByTestId('unit-view-container');
    await expect(unitContainer).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('COHORT MEAN EVAL SCORE')).toBeVisible();
    await expect(page.getByText(/EVAL PASS RATE/i)).toBeVisible();
    await expect(page.getByText('TOTAL EVAL DRILLS')).toBeVisible();
    await expect(page.getByText('UNIT OPERATOR ROSTER')).toBeVisible();
    await expect(page.getByText('RULES.MD R4.4: EVAL BENCHMARKS ONLY')).toBeVisible();

    // Assert Unit Leaderboard Table
    const unitLeaderboard = page.getByTestId('unit-leaderboard-table');
    await expect(unitLeaderboard).toBeVisible();

    // In operational roster, only real session (VIPER-2) exists
    await expect(unitLeaderboard.getByText('VIPER-2')).toBeVisible();

    // Switch to DEMO BENCHMARK dataset to inspect multi-operator cohort
    const scopeDemoBtn = page.getByTestId('scope-demo-btn');
    await expect(scopeDemoBtn).toBeVisible();
    await scopeDemoBtn.click();

    // Assert demo benchmark operators are displayed in leaderboard
    await expect(unitLeaderboard.getByText('HAWK-1')).toBeVisible();
    await expect(unitLeaderboard.getByText('VIPER-2')).toBeVisible();
    await expect(unitLeaderboard.getByText('GHOST-4')).toBeVisible();

    // Assert Rules.md R4.4: GHOST-4 (TRAIN only) displays IN TRAINING badge
    const ghostRow = page.getByTestId('unit-trainee-row-GHOST-4');
    await expect(ghostRow).toBeVisible();
    await expect(ghostRow.getByText('IN TRAINING')).toBeVisible();

    // Capture screenshot of Unit Readiness & Cohort Leaderboard
    await saveShot(page, 'task20_02_unit_readiness_leaderboard.png');

    // 8. Test Operator Inspection from Leaderboard: Click INSPECT on HAWK-1
    const hawkRow = page.getByTestId('unit-trainee-row-HAWK-1');
    await expect(hawkRow).toBeVisible();
    const inspectHawkBtn = hawkRow.getByRole('button', { name: /INSPECT/i });
    await expect(inspectHawkBtn).toBeVisible();
    await inspectHawkBtn.click();

    // Verify navigating to HAWK-1 automatically switches to TRENDS tab and updates operator select
    await expect(trendContainer).toBeVisible({ timeout: 5000 });
    const operatorSelect = page.getByTestId('operator-callsign-select');
    await expect(operatorSelect).toBeVisible();
    await expect(operatorSelect).toHaveValue('HAWK-1');

    // 9. Close AAR modal and verify clean return to C2 Console
    const closeBtn = page.getByText(/✕ ESC \/ CLOSE/i);
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(aarModal).not.toBeVisible({ timeout: 5000 });
  });

  test('02. Real Browser IndexedDB Persistence, Reload Durability & EVAL Isolation Verification (Critical F)', async ({ page }) => {
    // 1. Navigate to application
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    // 2. In Mission Briefing, assert initial state and explicitly select EVAL mode
    const briefingDialog = page.getByRole('dialog', { name: /Mission Briefing/i });
    await expect(briefingDialog).toBeVisible({ timeout: 10000 });

    const evalModeBtn = page.getByTestId('briefing-mode-eval-btn');
    await expect(evalModeBtn).toBeVisible();
    await evalModeBtn.click();
    await expect(evalModeBtn).toHaveClass(/border-phosphor/);

    // 3. Start session in EVAL mode
    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();
    await expect(startBtn).not.toBeVisible({ timeout: 5000 });

    // 4. Wait for test bridge and assert simulation mode is strictly EVAL
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return Boolean(win.__DRISHTI_TEST__?.isReady());
    }, undefined, { timeout: 10000 });

    // Assert TopBar displays EVAL mode
    await expect(page.getByText('EVAL', { exact: true })).toBeVisible();

    // 5. Advance session to completion to trigger persistence to IndexedDB
    await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.advanceToSessionEnd();
    });

    const aarModal = page.getByTestId('aar-modal');
    if (!(await aarModal.isVisible())) {
      const aarBtn = page.getByRole('button', { name: /\[AAR SCORECARD\]|AAR SCORECARD/i });
      if (await aarBtn.isVisible()) {
        await aarBtn.click({ force: true });
      }
    }
    await expect(aarModal).toBeVisible({ timeout: 5000 });

    // 6. Wait for persistence status to reach SAVED (no arbitrary delays!)
    const savedBadge = page.getByTestId('persistence-status-saved');
    await expect(savedBadge).toBeVisible({ timeout: 10000 });

    // 7. Query real Dexie IndexedDB sessions table directly via test bridge
    const dbSessions = await page.evaluate(async () => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__?.getDexieSessions?.() ?? [];
    });

    expect(dbSessions.length).toBeGreaterThanOrEqual(1);

    // Locate the operational session recorded
    const realSessions = dbSessions.filter((s) => !s.isSynthetic);
    expect(realSessions.length).toBeGreaterThanOrEqual(1);

    const latestReal = realSessions[realSessions.length - 1];
    expect(latestReal.uid).toBeTruthy();
    expect(latestReal.mode).toBe('EVAL');
    expect(latestReal.traineeUid).toBe('trainee-viper-2');
    expect(latestReal.startedAt).toBeGreaterThan(0);
    expect(latestReal.durationMs).toBeGreaterThan(0);
    expect(typeof latestReal.score).toBe('number');
    expect(latestReal.grade).toBeTruthy();
    expect(typeof latestReal.dStart).toBe('number');
    expect(typeof latestReal.metrics?.gScore).toBe('number');
    expect(latestReal.metrics?.gScore).toBeGreaterThanOrEqual(0);
    expect(latestReal.metrics?.gScore).toBeLessThanOrEqual(100);
    expect(latestReal.aborted).toBe(false);
    expect(latestReal.unverified).toBe(false);
    expect(latestReal.isSynthetic).toBe(false);

    const targetUid = latestReal.uid;

    // 8. Verify the complete event sequence in db.events
    const persistedEvents = await page.evaluate(async (uid) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__?.getDexieEvents?.(uid) ?? [];
    }, targetUid);

    expect(persistedEvents.length).toBeGreaterThanOrEqual(2);
    expect(persistedEvents[0].type).toBe('SIM_START');
    expect(persistedEvents[persistedEvents.length - 1].type).toBe('SESSION_END');
    for (let i = 0; i < persistedEvents.length; i++) {
      expect(persistedEvents[i].seq).toBe(i + 1);
      expect(persistedEvents[i].sessionUid).toBe(targetUid);
    }

    // 9. Reload the page to test IndexedDB durability across full browser reloads
    await page.reload({ waitUntil: 'networkidle' });

    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return Boolean(win.__DRISHTI_TEST__);
    }, undefined, { timeout: 10000 });

    // 10. Verify exact record remains in IndexedDB after reload
    const reloadedSession = await page.evaluate(async (uid) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__?.getDexieSession?.(uid);
    }, targetUid);

    expect(reloadedSession).toBeDefined();
    expect(reloadedSession?.uid).toBe(targetUid);
    expect(reloadedSession?.mode).toBe('EVAL');
    expect(reloadedSession?.startedAt).toBe(latestReal.startedAt);
    expect(reloadedSession?.durationMs).toBe(latestReal.durationMs);
    expect(reloadedSession?.score).toBe(latestReal.score);
    expect(reloadedSession?.grade).toBe(latestReal.grade);
    expect(reloadedSession?.dStart).toBe(latestReal.dStart);
    expect(reloadedSession?.metrics?.gScore).toBe(latestReal.metrics?.gScore);
    expect(reloadedSession?.traineeUid).toBe('trainee-viper-2');
    expect(reloadedSession?.isSynthetic).toBe(false);

    // Verify events also persisted across reload
    const reloadedEvents = await page.evaluate(async (uid) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__?.getDexieEvents?.(uid) ?? [];
    }, targetUid);
    expect(reloadedEvents.length).toBe(persistedEvents.length);

    // 11. Reopen AAR modal and navigate to Unit Readiness
    const standbyBtn = page.getByTestId('standby-view-btn');
    if (await standbyBtn.isVisible()) {
      await standbyBtn.click();
    }
    const standbyAarBtn = page.getByRole('button', { name: /\[AAR SCORECARD\]|AAR SCORECARD/i });
    await expect(standbyAarBtn).toBeVisible({ timeout: 5000 });
    await standbyAarBtn.click({ force: true });

    const reloadedAarModal = page.getByTestId('aar-modal');
    await expect(reloadedAarModal).toBeVisible({ timeout: 5000 });

    const tabUnit = page.getByTestId('tab-unit');
    await expect(tabUnit).toBeVisible();
    await tabUnit.click();

    // 12. Verify REAL operational roster contains expected operator and no synthetic-only operators
    const unitLeaderboard = page.getByTestId('unit-leaderboard-table');
    await expect(unitLeaderboard).toBeVisible();
    await expect(unitLeaderboard.getByText('VIPER-2')).toBeVisible();
    await expect(unitLeaderboard.getByText('HAWK-1')).not.toBeVisible();
    await expect(unitLeaderboard.getByText('COBRA-3')).not.toBeVisible();
    await expect(unitLeaderboard.getByText('GHOST-4')).not.toBeVisible();

    // 13. Verify cohort EVAL KPI calculations from persisted real data
    await expect(page.getByText('TOTAL EVAL DRILLS')).toBeVisible();
    await expect(page.getByText('COHORT MEAN EVAL SCORE')).toBeVisible();

    // 14. Switch to DEMO benchmark view and verify synthetic operators remain separately accessible
    const scopeDemoBtn = page.getByTestId('scope-demo-btn');
    await expect(scopeDemoBtn).toBeVisible();
    await scopeDemoBtn.click();

    await expect(unitLeaderboard.getByText('HAWK-1')).toBeVisible();
    await expect(unitLeaderboard.getByText('COBRA-3')).toBeVisible();
    await expect(unitLeaderboard.getByText('GHOST-4')).toBeVisible();

    // 15. Capture screenshot of verified post-reload dashboard
    await saveShot(page, 'task20_03_indexeddb_persistence_durability.png');
  });

  test('03. Actual Old Database v1-to-v2 Migration, Record Classification & Idempotence', async ({ page }) => {
    // 1. Navigate to application origin first so IndexedDB is fully permitted
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      const win = window as unknown as WindowWithDrishti;
      await win.__DRISHTI_TEST__?.closeDb?.();

      // Delete existing DB if present to start completely clean
      await new Promise<void>((resolve) => {
        const delReq = indexedDB.deleteDatabase('DrishtiCuasDb');
        delReq.onsuccess = () => resolve();
        delReq.onerror = () => resolve();
        delReq.onblocked = () => resolve();
      });

      // Create v1 schema
      await new Promise<void>((resolve, reject) => {
        const openReq = indexedDB.open('DrishtiCuasDb', 1);
        openReq.onupgradeneeded = () => {
          const db = openReq.result;
          db.createObjectStore('units', { keyPath: 'uid' });
          const trainees = db.createObjectStore('trainees', { keyPath: 'uid' });
          trainees.createIndex('callsign', 'callsign', { unique: true });
          db.createObjectStore('scenarios', { keyPath: 'uid' });
          const sessions = db.createObjectStore('sessions', { keyPath: 'uid' });
          sessions.createIndex('traineeUid', 'traineeUid');
          sessions.createIndex('mode', 'mode');
          sessions.createIndex('startedAt', 'startedAt');
          sessions.createIndex('[traineeUid+mode+startedAt]', ['traineeUid', 'mode', 'startedAt']);
          sessions.createIndex('[mode+traineeUid+startedAt]', ['mode', 'traineeUid', 'startedAt']);
          db.createObjectStore('trackResults', { keyPath: 'id', autoIncrement: true });
          const events = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
          events.createIndex('sessionUid', 'sessionUid');
          events.createIndex('[sessionUid+tMs+seq]', ['sessionUid', 'tMs', 'seq']);
          events.createIndex('[sessionUid+type+tMs]', ['sessionUid', 'type', 'tMs']);
          db.createObjectStore('chaosLog', { keyPath: 'id', autoIncrement: true });
          db.createObjectStore('traineeProfile', { keyPath: ['traineeUid', 'metric'] });
          db.createObjectStore('difficulty', { keyPath: 'traineeUid' });
          db.createObjectStore('settings', { keyPath: 'key' });
        };
        openReq.onsuccess = () => {
          const db = openReq.result;
          const tx = db.transaction(['sessions', 'events', 'trainees', 'units'], 'readwrite');
          const sessions = tx.objectStore('sessions');
          const events = tx.objectStore('events');
          const trainees = tx.objectStore('trainees');
          const units = tx.objectStore('units');

          units.put({ uid: 'unit-alpha-coy', name: 'ALPHA COY' });
          trainees.put({ uid: 'trainee-viper-2', unitUid: 'unit-alpha-coy', callsign: 'VIPER-2' });
          trainees.put({ uid: 'trainee-ghost-4', unitUid: 'unit-alpha-coy', callsign: 'GHOST-4' });

          // 1. Legacy synthetic EVAL session (starts with demo-)
          sessions.put({
            uid: 'demo-viper2-1700000000000',
            traineeUid: 'trainee-viper-2',
            mode: 'EVAL',
            startedAt: 1700000000000,
            durationMs: 120000,
            score: 86,
            grade: 'PROFICIENT_IN_SIMULATION',
            dStart: 0.5,
            metrics: { score: 86, grade: 'PROFICIENT_IN_SIMULATION' },
            scenarioId: 'DEMO-1',
          });

          // 2. Genuine real EVAL session (with complete events)
          const realUid = 'session-legacy-real-eval-001';
          sessions.put({
            uid: realUid,
            traineeUid: 'trainee-viper-2',
            mode: 'EVAL',
            startedAt: 1700000005000,
            durationMs: 7000,
            score: 95,
            grade: 'PROFICIENT_IN_SIMULATION',
            dStart: 0.3,
            metrics: { score: 95, grade: 'PROFICIENT_IN_SIMULATION' },
            scenarioId: 'SINGLE-TARGET-EVAL',
          });

          // Associated complete events for real session:
          events.put({ sessionUid: realUid, seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'SINGLE-TARGET-EVAL' } });
          events.put({ sessionUid: realUid, seq: 2, tMs: 2000, type: 'TRACK_INIT', trackNo: 'T-01', payload: { trueClass: 'HOSTILE_ATTACK', droneType: 'FPV_ATTACK', valueInr: 100000 } });
          events.put({ sessionUid: realUid, seq: 3, tMs: 3000, type: 'DESIGNATE', trackNo: 'T-01', payload: {} });
          events.put({ sessionUid: realUid, seq: 4, tMs: 4000, type: 'CLASSIFY', trackNo: 'T-01', payload: { label: 'HOSTILE_ATTACK' } });
          events.put({ sessionUid: realUid, seq: 5, tMs: 5000, type: 'ENGAGE', trackNo: 'T-01', payload: { effector: 'RF_SOFTKILL', rangeM: 1100, cer: 0.001 } });
          events.put({ sessionUid: realUid, seq: 6, tMs: 6000, type: 'ENGAGE_RESULT', trackNo: 'T-01', payload: { killed: true, effector: 'RF_SOFTKILL' } });
          events.put({ sessionUid: realUid, seq: 7, tMs: 7000, type: 'SESSION_END', payload: { aborted: false } });

          // 3. Genuine real TRAIN session
          sessions.put({
            uid: 'session-legacy-real-train-002',
            traineeUid: 'trainee-ghost-4',
            mode: 'TRAIN',
            startedAt: 1700000010000,
            durationMs: 90000,
            score: 64,
            grade: 'DEVELOPING',
            dStart: 0.35,
            metrics: { score: 64, grade: 'DEVELOPING' },
            scenarioId: 'PROCEDURAL-1',
          });

          // 4. Legacy session whose historical G cannot be reconstructed (no events)
          sessions.put({
            uid: 'session-legacy-no-events-003',
            traineeUid: 'trainee-viper-2',
            mode: 'EVAL',
            startedAt: 1700000015000,
            durationMs: 120000,
            score: 75,
            grade: 'PROFICIENT_IN_SIMULATION',
            dStart: 0.4,
            metrics: { score: 75, grade: 'PROFICIENT_IN_SIMULATION' },
            scenarioId: 'DEMO-1',
          });

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        openReq.onerror = () => reject(openReq.error);
      });
    });

    // Verify database is created at version 1
    const v1Check = await page.evaluate(async () => {
      return await new Promise<number>((resolve) => {
        const req = indexedDB.open('DrishtiCuasDb');
        req.onsuccess = () => {
          const verno = req.result.version;
          req.result.close();
          resolve(verno);
        };
      });
    });
    expect(v1Check).toBe(1);

    // 2. Load the application — Dexie version(2).upgrade callback executes
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return Boolean(win.__DRISHTI_TEST__);
    }, undefined, { timeout: 10000 });

    // 3. Query resulting IndexedDB records via test bridge (opens database and triggers version 2 upgrade)
    const sessions = await page.evaluate(async () => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__?.getDexieSessions?.() ?? [];
    });

    // 4. Verify database version has advanced from 1 to 2
    const { v2Check, verno } = await page.evaluate(async () => {
      const win = window as unknown as WindowWithDrishti;
      const verno = win.__DRISHTI_TEST__?.getDexieVersion?.() ?? 2;
      const v2Check = await new Promise<number>((resolve) => {
        const req = indexedDB.open('DrishtiCuasDb');
        req.onsuccess = () => {
          const v = req.result.version;
          req.result.close();
          resolve(v);
        };
      });
      return { v2Check, verno };
    });
    expect(verno).toBe(2);
    expect(v2Check).toBe(20); // Dexie internal native IDB version for schema v2

    const demoSession = sessions.find((s) => s.uid === 'demo-viper2-1700000000000');
    const realSession = sessions.find((s) => s.uid === 'session-legacy-real-eval-001');
    const trainSession = sessions.find((s) => s.uid === 'session-legacy-real-train-002');
    const noEventsSession = sessions.find((s) => s.uid === 'session-legacy-no-events-003');

    // Verify synthetic vs real classification
    expect(demoSession?.isSynthetic).toBe(true);
    expect(demoSession?.score).toBe(86);
    expect(demoSession?.startedAt).toBe(1700000000000);

    expect(realSession?.isSynthetic).toBe(false);
    expect(realSession?.score).toBe(95);
    expect(realSession?.startedAt).toBe(1700000005000);

    expect(trainSession?.isSynthetic).toBe(false);
    expect(trainSession?.traineeUid).toBe('trainee-ghost-4');
    expect(trainSession?.score).toBe(64);

    // Verify historical G reconstruction
    expect(realSession?.metrics?.gScore).toBe(100);

    // Legacy record without events remains without fabricated G
    expect(noEventsSession?.isSynthetic).toBe(false);
    expect(noEventsSession?.metrics?.gScore).toBeUndefined();

    // Verify event records are preserved
    const realEvents = await page.evaluate(async (uid) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__?.getDexieEvents?.(uid) ?? [];
    }, 'session-legacy-real-eval-001');
    expect(realEvents.length).toBe(7);

    // 5. Reload and verify migration idempotence
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return Boolean(win.__DRISHTI_TEST__);
    }, undefined, { timeout: 10000 });

    const reloadedSessions = await page.evaluate(async () => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__?.getDexieSessions?.() ?? [];
    });
    expect(reloadedSessions.length).toBe(sessions.length);
    const reloadedReal = reloadedSessions.find((s) => s.uid === 'session-legacy-real-eval-001');
    expect(reloadedReal?.metrics?.gScore).toBe(100);
  });

  test('04. Retry Attribution After Operator Switching in AAR', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    // 1. In Mission Briefing, start session as VIPER-2 in EVAL mode
    const evalModeBtn = page.getByTestId('briefing-mode-eval-btn');
    if (await evalModeBtn.isVisible()) {
      await evalModeBtn.click();
    }
    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return Boolean(win.__DRISHTI_TEST__?.isReady());
    }, undefined, { timeout: 10000 });

    // 2. Set mock persistence failure mode to 'SESSION' so metadata write fails
    await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.setMockPersistenceFailureMode('SESSION');
    });

    // 3. Advance to session end and open AAR
    await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.advanceToSessionEnd();
      win.__DRISHTI_TEST__?.openAar();
    });

    const aarModal = page.getByTestId('aar-modal');
    await expect(aarModal).toBeVisible({ timeout: 5000 });

    // 4. Assert persistence status displays ERROR and RETRY SAVE button
    const errorBadge = page.getByTestId('persistence-status-error');
    await expect(errorBadge).toBeVisible({ timeout: 10000 });
    const retryBtn = page.getByTestId('persistence-retry-btn');
    await expect(retryBtn).toBeVisible();

    // 5. In AAR, switch displayed operator to HAWK-1
    await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.setCallsign('HAWK-1');
    });

    const operatorSelect = page.getByTestId('operator-callsign-select');
    await expect(operatorSelect).toBeVisible();
    await expect(operatorSelect).toHaveValue('HAWK-1');

    // 6. Clear simulated failure mode
    await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.setMockPersistenceFailureMode('NONE');
    });

    // 7. Click RETRY SAVE button in AAR scorecard
    const tabScorecard = page.getByTestId('tab-scorecard');
    await tabScorecard.click();
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    // 8. Assert status transitions to SAVED
    const savedBadge = page.getByTestId('persistence-status-saved');
    await expect(savedBadge).toBeVisible({ timeout: 10000 });

    // 9. Verify the persisted session belongs to VIPER-2, NOT HAWK-1
    const savedSession = await page.evaluate(async () => {
      const win = window as unknown as WindowWithDrishti;
      const sessions = await win.__DRISHTI_TEST__?.getDexieSessions?.() ?? [];
      return sessions[sessions.length - 1];
    });
    expect(savedSession.traineeUid).toBe('trainee-viper-2');
    expect(savedSession.traineeUid).not.toBe('trainee-hawk-1');
  });

  test('05. Partial Persistence Recovery (Event vs Metadata Failure Separation)', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    const evalModeBtn = page.getByTestId('briefing-mode-eval-btn');
    if (await evalModeBtn.isVisible()) {
      await evalModeBtn.click();
    }
    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return Boolean(win.__DRISHTI_TEST__?.isReady());
    }, undefined, { timeout: 10000 });

    // Exercise EVENTS failure mode: EventRecorder fails to flush
    await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.setMockPersistenceFailureMode('EVENTS');
      win.__DRISHTI_TEST__?.advanceToSessionEnd();
      win.__DRISHTI_TEST__?.openAar();
    });

    const aarModal = page.getByTestId('aar-modal');
    await expect(aarModal).toBeVisible({ timeout: 5000 });

    // Assert persistence status reaches ERROR, never false SAVED
    const errorBadge = page.getByTestId('persistence-status-error');
    await expect(errorBadge).toBeVisible({ timeout: 10000 });
    const savedBadge = page.getByTestId('persistence-status-saved');
    await expect(savedBadge).not.toBeVisible();

    // Clear failure and retry
    await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      win.__DRISHTI_TEST__?.setMockPersistenceFailureMode('NONE');
    });

    const retryBtn = page.getByTestId('persistence-retry-btn');
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    await expect(savedBadge).toBeVisible({ timeout: 10000 });
  });
});
