import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import type { DrishtiTestBridge } from '@/testBridge/drishtiTestBridge';

type WindowWithDrishti = Window & {
  __DRISHTI_TEST__?: DrishtiTestBridge | null;
  __ENGINE__?: unknown;
  __RENDERER_3D__?: unknown;
  SimEngine?: unknown;
};

test.describe('TASK 19 — End-to-End Scenario Integrity & Complete Training Workflow', () => {
  const outDir19 = path.resolve(process.cwd(), 'test-results/screenshots/task19');
  const artifactDir = 'C:\\Users\\Missi\\.gemini\\antigravity\\brain\\dcbbc993-bf1f-433e-850f-d7e049737f29';

  test.beforeAll(() => {
    if (!fs.existsSync(outDir19)) {
      fs.mkdirSync(outDir19, { recursive: true });
    }
  });

  const saveShot = async (page: Page, filename: string) => {
    const filePath = path.join(outDir19, filename);
    await page.screenshot({ path: filePath, fullPage: true });

    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(filePath, path.join(artifactDir, filename));
    }
  };

  test('01. Complete Trainee Lifecycle: Briefing -> Execution -> Engagement -> AAR -> Replay -> Clean Return', async ({ page }) => {
    // 1. Initial Mission Briefing & Scenario Selection (DEMO-2)
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    const changeScenarioBtn = page.getByTestId('change-scenario-btn');
    await expect(changeScenarioBtn).toBeVisible({ timeout: 10000 });
    await changeScenarioBtn.click();

    // Select DEMO-2 from catalog modal
    const demo2Card = page.getByTestId('scenario-card-DEMO-2');
    await expect(demo2Card).toBeVisible({ timeout: 5000 });
    const demo2SelectBtn = demo2Card.getByRole('button');
    await demo2SelectBtn.click();

    // Verify briefing screen updates with DEMO-2 parameters
    await expect(page.getByText(/DEMO-2/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Proportionality Drill/i).first()).toBeVisible();

    const startBtn = page.getByTestId('start-session-btn');
    await expect(startBtn).toBeVisible();

    // 2. Start Session
    await startBtn.click();
    await expect(startBtn).not.toBeVisible({ timeout: 5000 });

    // 3. Wait for Test Bridge and active tracks
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      if (!win.__DRISHTI_TEST__) return false;
      return win.__DRISHTI_TEST__.isReady() && win.__DRISHTI_TEST__.getTrackList().length > 0;
    }, undefined, { timeout: 10000 });

    // 4. Verify Track Table displays estimated telemetry (~RNG, ~SPD, ~BRG)
    const trackTable = page.getByTestId('track-table');
    await expect(trackTable).toBeVisible({ timeout: 5000 });
    const tableText = await trackTable.innerText();
    expect(tableText).toMatch(/~RNG/i);
    expect(tableText).toMatch(/~SPD/i);

    // 5. Select first track row directly from UI and extract its displayed track number
    const trackButton = trackTable.locator('button').filter({ hasText: /T-\d+/ }).first();
    await expect(trackButton).toBeVisible({ timeout: 5000 });
    const trackText = await trackButton.innerText();
    const trackMatch = trackText.match(/T-\d+/);
    expect(trackMatch).not.toBeNull();
    const selectedTrackNo = trackMatch![0];
    await trackButton.click();

    // 6. Execute Operator Lifecycle: Designate -> Classify -> Arm Effector -> Fire
    // Designate via Spacebar and assert actual emitted DESIGNATE event for the selected track
    await page.keyboard.press('Space');
    await expect.poll(async () => {
      const events = await page.evaluate(() => {
        const win = window as unknown as WindowWithDrishti;
        return win.__DRISHTI_TEST__?.getRecordedEvents() ?? [];
      });
      return events.some((e) => e.type === 'DESIGNATE' && e.trackNo === selectedTrackNo);
    }, { timeout: 5000 }).toBe(true);

    // Classify via button or key and assert actual emitted CLASSIFY event contains label: HOSTILE_ATTACK
    const classifyBtn = page.getByRole('button', { name: /⚡ CLASSIFY HOSTILE|\[HA\]/i }).first();
    if (await classifyBtn.isVisible()) {
      await classifyBtn.click();
    } else {
      await page.keyboard.press('c');
    }
    await expect.poll(async () => {
      const events = await page.evaluate(() => {
        const win = window as unknown as WindowWithDrishti;
        return win.__DRISHTI_TEST__?.getRecordedEvents() ?? [];
      });
      const clsEv = events.find((e) => e.type === 'CLASSIFY' && e.trackNo === selectedTrackNo);
      return clsEv?.payload?.label;
    }, { timeout: 5000 }).toBe('HOSTILE_ATTACK');

    // Arm Effector (RF Soft-Kill): Require visible and click through the real UI
    const rfSoftkillBtn = page.locator('button').filter({ hasText: /RF Soft-Kill/i }).first();
    await expect(rfSoftkillBtn).toBeVisible({ timeout: 5000 });
    await rfSoftkillBtn.click();
    await rfSoftkillBtn.blur();

    // Fire via 'f' key and assert actual emitted ENGAGE or RELEASE_BLOCKED event
    await page.keyboard.press('f');
    await expect.poll(async () => {
      const events = await page.evaluate(() => {
        const win = window as unknown as WindowWithDrishti;
        return win.__DRISHTI_TEST__?.getRecordedEvents() ?? [];
      });
      const fireEvent = events.find(
        (e) => (e.type === 'ENGAGE' || e.type === 'RELEASE_BLOCKED') && e.trackNo === selectedTrackNo
      );
      if (!fireEvent) return false;

      // Assert that the selected effector is actually RF_SOFTKILL using the resulting operator event payload
      if (fireEvent.payload?.effector !== 'RF_SOFTKILL') return false;

      // Where the result is RELEASE_BLOCKED, verify its actual documented rejection reason
      if (fireEvent.type === 'RELEASE_BLOCKED') {
        const documentedReasons = [
          'OUT_OF_ENVELOPE',
          'Q_MIN_VIOLATION',
          'PNR_VIOLATION',
          'INACTIVE_TARGET',
          'RF_JAMMING_ACTIVE',
          'RF_SILENT_TARGET',
          'TRACK_NOT_FOUND',
          'DUPLICATE_PENDING_FIRE',
        ];
        return documentedReasons.includes(String(fireEvent.payload?.reason));
      }

      // If ENGAGE, verified effector is RF_SOFTKILL and trackNo is selectedTrackNo
      return true;
    }, { timeout: 10000 }).toBe(true);

    // 7. Fast-forward to session completion via test bridge
    const advanceResult = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.advanceToSessionEnd();
    });
    expect(advanceResult).toBe(true);

    const isEnded = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return win.__DRISHTI_TEST__?.isSessionEnded();
    });
    expect(isEnded).toBe(true);

    // 8. Verify AAR Modal opens and displays SCORECARD tab
    const aarModal = page.getByTestId('aar-modal');
    if (!(await aarModal.isVisible())) {
      const aarBtn = page.getByRole('button', { name: /\[AAR SCORECARD\]|AAR SCORECARD/i });
      if (await aarBtn.isVisible()) {
        await aarBtn.click({ force: true });
      }
    }
    await expect(aarModal).toBeVisible({ timeout: 5000 });

    // Assert AAR Scorecard components
    await expect(aarModal.getByText(/GLOBAL MISSION SCORE/i)).toBeVisible();
    await expect(aarModal.getByText(/DOCTRINAL GRADE EVALUATION/i)).toBeVisible();

    // 9. Switch to REPLAY tab and interact with timeline scrubber
    const replayTab = aarModal.getByRole('button', { name: /^REPLAY$/i });
    await expect(replayTab).toBeVisible();
    await replayTab.click();
    await expect(aarModal.getByText(/SYNCHRONIZED AAR TIMELINE REPLAY/i)).toBeVisible();

    // Verify slider element is present and visible
    const slider = aarModal.locator('input[type="range"]');
    await expect(slider).toBeVisible({ timeout: 5000 });

    // 9a. Seek forward to 20,000 ms and assert clock and active tracks update
    await slider.fill('20000');
    await expect(aarModal.getByText(/ACTIVE TRACKS AT T\+00:20\.000/i)).toBeVisible({ timeout: 5000 });
    await expect(aarModal.locator('.font-clock').last()).toContainText('00:20.000');

    // 9b. Seek backward to 5,000 ms and assert clock and active tracks update
    await slider.fill('5000');
    await expect(aarModal.getByText(/ACTIVE TRACKS AT T\+00:05\.000/i)).toBeVisible({ timeout: 5000 });
    await expect(aarModal.locator('.font-clock').last()).toContainText('00:05.000');

    // Capture screenshot of AAR modal in Replay view
    await saveShot(page, 'task19_01_training_workflow_aar.png');

    // 10. Verify JSON Export file download with hardened assertions
    const exportJsonBtn = aarModal.getByTestId('aar-export-json-btn');
    await expect(exportJsonBtn).toBeVisible();
    const [jsonDownload] = await Promise.all([
      page.waitForEvent('download'),
      exportJsonBtn.click(),
    ]);
    expect(jsonDownload.suggestedFilename()).toMatch(/^aar-.*\.json$/);
    const jsonStream = await jsonDownload.createReadStream();
    expect(jsonStream).not.toBeNull();
    const jsonChunks: Buffer[] = [];
    for await (const chunk of jsonStream!) {
      jsonChunks.push(Buffer.from(chunk));
    }
    const jsonContent = Buffer.concat(jsonChunks).toString('utf-8');
    const parsed = JSON.parse(jsonContent);
    expect(parsed.sessionUid).toBeTruthy();
    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.events.length).toBeGreaterThan(0);
    expect(parsed.eventCount).toBe(parsed.events.length);
    expect(parsed.sha256).toMatch(/^[a-f0-9]{64}$/);

    // Validate sequential sequence numbers, valid timestamps, and known event types
    let expectedSeq = 1;
    let lastTMs = -1;
    for (const ev of parsed.events) {
      expect(typeof ev.seq).toBe('number');
      expect(ev.seq).toBe(expectedSeq++);
      expect(typeof ev.tMs).toBe('number');
      expect(ev.tMs).toBeGreaterThanOrEqual(lastTMs);
      lastTMs = ev.tMs;
      expect(typeof ev.type).toBe('string');
      expect(ev.type.length).toBeGreaterThan(0);
    }

    // 11. Verify CSV Export file download with hardened assertions
    const exportCsvBtn = aarModal.getByTestId('aar-export-csv-btn');
    await expect(exportCsvBtn).toBeVisible();
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      exportCsvBtn.click(),
    ]);
    expect(csvDownload.suggestedFilename()).toMatch(/^aar-.*\.csv$/);
    const csvStream = await csvDownload.createReadStream();
    expect(csvStream).not.toBeNull();
    const csvChunks: Buffer[] = [];
    for await (const chunk of csvStream!) {
      csvChunks.push(Buffer.from(chunk));
    }
    const csvContent = Buffer.concat(csvChunks).toString('utf-8');
    const lines = csvContent.trim().split('\n').filter((l: string) => l.trim().length > 0);
    expect(lines[0]).toMatch(/sessionUid.*seq.*tMs.*type/i);
    const dataLines = lines.slice(1);
    expect(dataLines.length).toBe(parsed.eventCount);
    for (const row of dataLines) {
      expect(row).toContain(parsed.sessionUid);
    }

    // 12. Return to Mission Briefing via [B] MISSION BRIEFING button
    const returnBriefingBtn = aarModal.getByTestId('aar-return-briefing-btn');
    await expect(returnBriefingBtn).toBeVisible();
    await returnBriefingBtn.click();

    // 13. Verify clean state after returning to briefing
    await expect(aarModal).not.toBeVisible({ timeout: 5000 });
    const briefingStartBtn = page.getByTestId('start-session-btn');
    await expect(briefingStartBtn).toBeVisible({ timeout: 5000 });

    // Assert that session state and tracker have been wiped clean
    const postCleanup = await page.evaluate(() => {
      const win = window as unknown as WindowWithDrishti;
      return {
        trackCount: win.__DRISHTI_TEST__?.getTrackList().length ?? 0,
        sessionStatus: win.__DRISHTI_TEST__?.getSessionStatus() ?? 'UNKNOWN',
      };
    });

    expect(postCleanup.trackCount).toBe(0);
    expect(postCleanup.sessionStatus).toBe('READY');
  });

  test('02. Scenario Switching and Parameter Re-Initialization', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    // Open Scenario Modal
    const changeScenarioBtn = page.getByTestId('change-scenario-btn');
    await expect(changeScenarioBtn).toBeVisible({ timeout: 5000 });
    await changeScenarioBtn.click();

    // Select SWARM-1 from catalog
    const swarmCard = page.getByTestId('scenario-card-SWARM-1');
    await expect(swarmCard).toBeVisible({ timeout: 5000 });
    const swarmSelectBtn = swarmCard.getByRole('button');
    await swarmSelectBtn.click();

    // Verify briefing screen reflects SWARM-1
    await expect(page.getByText(/SWARM-1/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/SWARM INVASION/i).first()).toBeVisible();
    await expect(page.getByText(/SWARM ELEMENT/i).first()).toBeVisible();

    // Start session and confirm it starts cleanly
    const startBtn = page.getByTestId('start-session-btn');
    await startBtn.click();
    await expect(startBtn).not.toBeVisible({ timeout: 5000 });

    // Verify running session
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const win = window as unknown as WindowWithDrishti;
        return win.__DRISHTI_TEST__?.getSessionStatus();
      });
    }, { timeout: 10000 }).toBe('RUNNING');

    // Wait for SWARM tracks to initiate
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return (win.__DRISHTI_TEST__?.getTrackList().length ?? 0) > 0;
    }, undefined, { timeout: 10000 });
  });

  test('03. Real Dexie IndexedDB Import Path Validation', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/HawkEyeAAR/', { waitUntil: 'networkidle' });

    // Wait for test bridge
    await page.waitForFunction(() => {
      const win = window as unknown as WindowWithDrishti;
      return !!win.__DRISHTI_TEST__;
    }, undefined, { timeout: 10000 });

    const testUid = `dexie-e2e-import-${Date.now()}`;
    const validEvents = [
      { seq: 1, tMs: 0, type: 'SIM_START', payload: { scenarioId: 'DEMO-1', seed: 42, mode: 'TRAIN' } },
      { seq: 2, tMs: 2000, type: 'DETECT', trackNo: 'T-01', payload: { rangeM: 2500 } },
      { seq: 3, tMs: 4000, type: 'DESIGNATE', trackNo: 'T-01', payload: { via: 'KEY' } },
      { seq: 4, tMs: 5000, type: 'CLASSIFY', trackNo: 'T-01', payload: { label: 'HOSTILE_ATTACK' } },
      { seq: 5, tMs: 10000, type: 'SESSION_END', payload: { durationMs: 10000 } },
    ];

    // 1. Create export payload with unkeyed SHA-256 integrity checksum
    const validPayloadJson = await page.evaluate(async ({ uid, evs }) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__!.createSignedAarPayload(uid, evs as any);
    }, { uid: testUid, evs: validEvents });

    // Ensure clean start in Dexie
    await page.evaluate(async (uid) => {
      const win = window as unknown as WindowWithDrishti;
      await win.__DRISHTI_TEST__!.clearDexieEvents(uid);
    }, testUid);

    // 2. Initial valid import into Dexie
    const importRes1 = await page.evaluate(async (json) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__!.testDexieImport(json);
    }, validPayloadJson);

    expect(importRes1.imported).toBe(validEvents.length);
    expect(importRes1.duplicates).toBe(0);

    const dexieCount1 = await page.evaluate(async (uid) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__!.getDexieEventsCount(uid);
    }, testUid);
    expect(dexieCount1).toBe(validEvents.length);

    // 3. Re-import identical payload -> clean duplicate detection
    const importRes2 = await page.evaluate(async (json) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__!.testDexieImport(json);
    }, validPayloadJson);

    expect(importRes2.imported).toBe(0);
    expect(importRes2.duplicates).toBe(validEvents.length);

    // 4. Conflicting sequence rejection
    const conflictEvents = [
      { seq: 1, tMs: 0, type: 'SIM_START', payload: { scenarioId: 'CONFLICTING-SCENARIO', seed: 999, mode: 'TRAIN' } },
    ];
    const conflictPayloadJson = await page.evaluate(async ({ uid, evs }) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__!.createSignedAarPayload(uid, evs as any);
    }, { uid: testUid, evs: conflictEvents });

    const conflictError = await page.evaluate(async (json) => {
      const win = window as unknown as WindowWithDrishti;
      try {
        await win.__DRISHTI_TEST__!.testDexieImport(json);
        return null;
      } catch (err: any) {
        return err.message;
      }
    }, conflictPayloadJson);

    expect(conflictError).toMatch(/Conflicting data for event sequence 1/i);

    // 5. Tampered checksum rejection
    const parsedObj = JSON.parse(validPayloadJson);
    parsedObj.sha256 = '0000000000000000000000000000000000000000000000000000000000000000';
    const tamperedPayloadJson = JSON.stringify(parsedObj);

    const tamperError = await page.evaluate(async (json) => {
      const win = window as unknown as WindowWithDrishti;
      try {
        await win.__DRISHTI_TEST__!.testDexieImport(json);
        return null;
      } catch (err: any) {
        return err.message;
      }
    }, tamperedPayloadJson);

    expect(tamperError).toMatch(/SHA-256 verification failed/i);

    // 6. Duplicate sequence in file rejection
    const dupSeqEvents = [
      { seq: 1, tMs: 0, type: 'SIM_START', payload: { scenarioId: 'DEMO-1', seed: 42, mode: 'TRAIN' } },
      { seq: 1, tMs: 100, type: 'DETECT', trackNo: 'T-01', payload: { rangeM: 2500 } },
    ];
    const dupSeqUid = `${testUid}-dup-seq`;
    const dupSeqPayloadJson = await page.evaluate(async ({ uid, evs }) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__!.createSignedAarPayload(uid, evs as any);
    }, { uid: dupSeqUid, evs: dupSeqEvents });

    const dupSeqError = await page.evaluate(async (json) => {
      const win = window as unknown as WindowWithDrishti;
      try {
        await win.__DRISHTI_TEST__!.testDexieImport(json);
        return null;
      } catch (err: any) {
        return err.message;
      }
    }, dupSeqPayloadJson);

    expect(dupSeqError).toMatch(/duplicate event sequence numbers/i);

    // 7. Verify invalid-import rejection without partial writes (failed import wrote 0 records for dupSeqUid)
    const dupSeqDexieCount = await page.evaluate(async (uid) => {
      const win = window as unknown as WindowWithDrishti;
      return await win.__DRISHTI_TEST__!.getDexieEventsCount(uid);
    }, dupSeqUid);
    expect(dupSeqDexieCount).toBe(0);

    // 8. Cleanup test sessions from Dexie
    await page.evaluate(async ({ uid1, uid2 }) => {
      const win = window as unknown as WindowWithDrishti;
      await win.__DRISHTI_TEST__!.clearDexieEvents(uid1);
      await win.__DRISHTI_TEST__!.clearDexieEvents(uid2);
    }, { uid1: testUid, uid2: dupSeqUid });
  });
});
