import { test, expect } from '@playwright/test';

test.describe('TASK 21-PT — Progressive Training UI & End-to-End AAR Feedback', () => {
  test('verifies TopBar difficulty indicator, AAR Red Team Plan debrief, and progression feedback', async ({
    page,
  }) => {
    // 1. Navigate to production root
    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');

    // 2. Verify TopBar displays mode and initial difficulty d=0.30
    const topBarMode = page.locator('header').getByText(/TRAIN|EVAL/i).first();
    await expect(topBarMode).toBeVisible({ timeout: 10000 });

    const diffIndicator = page.locator('header').getByText(/d=0\.\d{2}/i).first();
    await expect(diffIndicator).toBeVisible();

    // 3. Start a session from briefing screen if open
    const briefingStartBtn = page.getByTestId('start-session-btn');
    if (await briefingStartBtn.isVisible()) {
      await briefingStartBtn.click();
      await expect(briefingStartBtn).not.toBeVisible({ timeout: 5000 });
    }

    // Wait for simulation canvas to mount
    const canvas = page.locator('canvas.cursor-crosshair').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 4. Open After-Action Review (AAR) hot-wash modal via TopBar button
    const aarBtn = page.getByRole('button', { name: /AAR SCORECARD/i });
    await expect(aarBtn).toBeVisible({ timeout: 10000 });
    await aarBtn.click();

    // 5. Verify AAR modal is displayed
    const aarModal = page.locator('[data-testid="aar-modal"]');
    await expect(aarModal).toBeVisible({ timeout: 10000 });

    // 6. Verify Adaptive Red Team Director Plan panel is rendered in Scorecard tab
    const redTeamPlan = page.locator('[data-testid="red-team-plan-panel"]');
    await expect(redTeamPlan).toBeVisible({ timeout: 5000 });

    // 7. Verify Red Team Mode Policy Indicator is present
    const policyIndicator = page.locator('[data-testid="mode-policy-indicator"]');
    await expect(policyIndicator).toBeVisible();

    // 8. Verify Difficulty Adaptation strip displays current d and next d
    const diffStrip = page.locator('[data-testid="difficulty-adaptation-strip"]');
    await expect(diffStrip).toBeVisible();
    await expect(page.locator('[data-testid="current-diff-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-diff-display"]')).toBeVisible();

    // 9. Verify EMA 6-dimension metrics grid is rendered
    const emaGrid = page.locator('[data-testid="ema-metrics-grid"]');
    await expect(emaGrid).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-d"]')).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-c"]')).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-econ"]')).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-r"]')).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-sal"]')).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-sat"]')).toBeVisible();

    // 10. Verify Director Rationale text box is visible
    const rationaleBox = page.locator('[data-testid="director-rationale-box"]');
    await expect(rationaleBox).toBeVisible();
    await expect(page.locator('[data-testid="director-rationale-text"]')).toBeVisible();

    // 11. Switch to Trends Tab and verify Red Team Plan is accessible alongside historical trends
    const trendsTab = page.locator('[data-testid="tab-trends"]');
    await trendsTab.click();

    const trendsPanel = page.locator('[data-testid="aar-trends-panel"]');
    await expect(trendsPanel).toBeVisible();
    await expect(trendsPanel.locator('[data-testid="red-team-plan-panel"]')).toBeVisible();

    // 12. Switch to Unit Readiness Tab and verify evaluation leaderboard
    const unitTab = page.locator('[data-testid="tab-unit"]');
    await unitTab.click();

    const unitPanel = page.locator('[data-testid="aar-unit-panel"]');
    await expect(unitPanel).toBeVisible();

    // Save test evidence screenshot strictly inside test-results directory
    await page.screenshot({
      path: 'test-results/screenshots/task21_pt/progressive_training_aar.png',
      fullPage: true,
    });
  });

  test('executes complete multi-session progressive training workflow, adapted drill execution, reload persistence, and EVAL isolation (Fix 10)', async ({
    page,
  }) => {
    // 1. Navigate to application root
    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Start initial TRAIN session from Briefing modal
    const briefingStartBtn = page.getByTestId('start-session-btn');
    await expect(briefingStartBtn).toBeVisible({ timeout: 10000 });
    await briefingStartBtn.click();
    await expect(briefingStartBtn).not.toBeVisible({ timeout: 5000 });

    // Wait for bridge to be ready once simulation is active
    await page.waitForFunction(() => {
      const win = window as any;
      return Boolean(win.__DRISHTI_TEST__?.isReady());
    }, undefined, { timeout: 10000 });

    // Verify initial TopBar state
    const topBarMode = page.locator('header').getByText(/TRAIN/i).first();
    await expect(topBarMode).toBeVisible({ timeout: 10000 });
    await expect(page.locator('header').getByText(/d=0\.30/i).first()).toBeVisible();

    // Step 2: Advance initial session to completion
    await page.evaluate(() => {
      const win = window as any;
      win.__DRISHTI_TEST__?.advanceToSessionEnd();
    });

    // Step 3: Open AAR and verify PERSISTED (IDB)
    const aarModal = page.locator('[data-testid="aar-modal"]');
    if (!(await aarModal.isVisible())) {
      const aarBtn = page.getByRole('button', { name: /AAR SCORECARD/i });
      if (await aarBtn.isVisible()) {
        await aarBtn.click({ force: true });
      }
    }
    await expect(aarModal).toBeVisible({ timeout: 10000 });

    const persistedBadge = page.getByTestId('persistence-status-saved');
    await expect(persistedBadge).toBeVisible({ timeout: 10000 });

    const firstSessionUid = await page.evaluate(() => {
      const win = window as any;
      return win.__DRISHTI_TEST__?.getPersistenceState?.()?.latestSavedUid;
    });
    expect(firstSessionUid).toBeDefined();

    // Step 4: Verify RedTeamPlan difficulty strip (d_start = 0.30 -> d_next), recommendation and EMA cards
    const diffStrip = page.locator('[data-testid="difficulty-adaptation-strip"]');
    await expect(diffStrip).toBeVisible();
    await expect(page.locator('[data-testid="current-diff-display"]')).toHaveText(/0\.30/);

    const nextDiffElem = page.locator('[data-testid="next-diff-display"]');
    await expect(nextDiffElem).toBeVisible();
    const nextDiffText = await nextDiffElem.innerText();
    const match = nextDiffText.match(/([0-9.]+)/);
    const nextDVal = match ? parseFloat(match[1]) : 0.3;
    expect(Number.isFinite(nextDVal)).toBe(true);

    const targetLeverElem = page.locator('[data-testid="target-lever-display"]');
    await expect(targetLeverElem).toBeVisible();
    const displayedTargetLever = (await targetLeverElem.innerText()).trim();
    expect(displayedTargetLever.length).toBeGreaterThan(0);

    const recScenarioElem = page.locator('[data-testid="recommended-scenario-id"]');
    await expect(recScenarioElem).toBeVisible();
    const displayedRecScenarioId = (await recScenarioElem.innerText()).trim();
    expect(displayedRecScenarioId).toContain(displayedTargetLever);

    const emaGrid = page.locator('[data-testid="ema-metrics-grid"]');
    await expect(emaGrid).toBeVisible();
    await expect(page.locator('[data-testid="ema-card-d"]')).toBeVisible();

    // Step 5: Click load-recommended-drill-btn
    const loadDrillBtn = page.getByTestId('load-recommended-drill-btn');
    await expect(loadDrillBtn).toBeVisible();
    await loadDrillBtn.click();

    // Modal closes automatically
    await expect(aarModal).not.toBeVisible({ timeout: 5000 });

    // Step 6: Verify adapted scenario starts: TopBar displays ADAPTIVE-... scenario ID and new difficulty
    const topbarScenario = page.getByTestId('topbar-scenario-id');
    await expect(topbarScenario).toHaveText(displayedRecScenarioId, { timeout: 10000 });
    const topbarScenarioText = (await topbarScenario.innerText()).trim();
    expect(topbarScenarioText).toBe(displayedRecScenarioId);

    // Verify TopBar displays the adapted difficulty
    const expectedDiffPattern = new RegExp(`d=${nextDVal.toFixed(2)}`, 'i');
    await expect(page.locator('header').getByText(expectedDiffPattern).first()).toBeVisible({ timeout: 10000 });

    // Inspect actual active scenario spec levers and difficulty via test bridge (TASK 21-PT-R2-FINAL Section 4)
    const activeSpec = await page.evaluate(() => {
      const win = window as any;
      return win.__DRISHTI_TEST__?.getActiveScenarioSpec?.();
    });
    expect(activeSpec).not.toBeNull();
    expect(activeSpec?.levers?.length).toBeGreaterThan(0);

    // INVARIANT ASSERTION: Visible Recommended Lever === Selected Lever === Generated ScenarioSpec Lever
    expect(activeSpec?.levers[0]?.id).toBe(displayedTargetLever);
    expect(activeSpec?.difficulty).toBeCloseTo(nextDVal, 2);
    expect(activeSpec?.id).toBe(displayedRecScenarioId);
    expect(topbarScenarioText).toBe(activeSpec?.id);

    // Verify seed matching
    const seedMatch = displayedRecScenarioId.match(/ADAPTIVE-[A-Z_]+-(\d+)/);
    if (seedMatch) {
      expect(activeSpec?.seed).toBe(parseInt(seedMatch[1], 10));
    }

    // Step 7: Advance second session to completion
    await page.evaluate(() => {
      const win = window as any;
      win.__DRISHTI_TEST__?.advanceToSessionEnd();
    });

    // Explicit persistence state confirmation: wait for Dexie write of second session
    await page.waitForFunction((prevUid) => {
      const win = window as any;
      const s = win.__DRISHTI_TEST__?.getPersistenceState?.();
      return s?.status === 'SAVED' && s?.latestSavedUid && s.latestSavedUid !== prevUid;
    }, firstSessionUid, { timeout: 10000 });

    // Capture persisted second session state and UID before reload
    const secondSessionUid = await page.evaluate(() => {
      const win = window as any;
      return win.__DRISHTI_TEST__?.getPersistenceState?.()?.latestSavedUid;
    });
    expect(secondSessionUid).toBeDefined();

    const secondSessionBeforeReload = await page.evaluate(async (uid: string) => {
      const win = window as any;
      return await win.__DRISHTI_TEST__?.getDexieSession?.(uid);
    }, secondSessionUid);
    expect(secondSessionBeforeReload).toBeDefined();
    expect(secondSessionBeforeReload?.mode).toBe('TRAIN');
    expect(secondSessionBeforeReload?.progressionApplied).toBe(true);

    const diffBeforeReload = await page.evaluate(async () => {
      const win = window as any;
      return await win.__DRISHTI_TEST__?.getDexieDifficulty?.() ?? 0.3;
    });
    const profileBeforeReload = await page.evaluate(async () => {
      const win = window as any;
      return await win.__DRISHTI_TEST__?.getDexieProfile?.();
    });
    expect(profileBeforeReload).not.toBeNull();

    // Step 8: Reload page (page.reload()) to simulate fresh browser session
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Wait for test bridge to be mounted
    await page.waitForFunction(() => {
      const win = window as any;
      return Boolean(win.__DRISHTI_TEST__);
    }, undefined, { timeout: 10000 });

    // Step 9: Confirm TopBar displays persisted difficulty across reload
    const persistedPattern = new RegExp(`d=${diffBeforeReload.toFixed(2)}`, 'i');
    await expect(page.locator('header').getByText(persistedPattern).first()).toBeVisible({ timeout: 10000 });

    // Verify the same session UID is still persisted in Dexie
    const storedAfterReload = await page.evaluate(async (uid: string) => {
      const win = window as any;
      return await win.__DRISHTI_TEST__?.getDexieSession?.(uid);
    }, secondSessionUid);
    expect(storedAfterReload).toBeDefined();
    expect(storedAfterReload?.progressionApplied).toBe(true);

    // Resubmit identical session UID with progressionApplied intentionally unset (TASK 21-PT-R2-FINAL Section 5)
    const resubmitResult = await page.evaluate(async (uid: string) => {
      const win = window as any;
      return await win.__DRISHTI_TEST__?.resubmitSessionForIdempotencyTest?.(uid);
    }, secondSessionUid);
    expect(resubmitResult).not.toBeNull();

    // Idempotency assertions:
    // 1. Difficulty remains unchanged
    expect(resubmitResult!.difficulty).toBeCloseTo(diffBeforeReload, 4);
    // 2. Every EMA dimension remains identical
    expect(resubmitResult!.profile).toEqual(profileBeforeReload);
    // 3. Durable session marker progressionApplied remains true
    expect(resubmitResult!.storedSession?.progressionApplied).toBe(true);
    // 4. Progression log contains exactly one entry for that session UID
    expect(resubmitResult!.progressionLogCount).toBe(1);
    expect(resubmitResult!.progressionLog?.dAfter).toBeCloseTo(diffBeforeReload, 4);

    // Step 10: Open scenario catalog / briefing modal, select fixed EVAL scenario (e.g. DEMO-1 in EVAL mode), start drill
    // In MissionBriefing modal, click briefing-mode-eval-btn
    const briefingEvalBtn = page.getByTestId('briefing-mode-eval-btn');
    if (await briefingEvalBtn.isVisible()) {
      await briefingEvalBtn.click();
    }
    const evalStartBtn = page.getByTestId('start-session-btn');
    await expect(evalStartBtn).toBeVisible();
    await evalStartBtn.click();
    await expect(evalStartBtn).not.toBeVisible({ timeout: 5000 });

    await page.waitForFunction(() => {
      const win = window as any;
      return Boolean(win.__DRISHTI_TEST__?.isReady());
    }, undefined, { timeout: 10000 });

    // TopBar displays EVAL mode
    await expect(page.locator('header').getByText(/EVAL/i).first()).toBeVisible({ timeout: 10000 });

    // Query difficulty and profile before completing EVAL drill
    const preEvalDifficulty = await page.evaluate(async () => {
      const win = window as any;
      return await win.__DRISHTI_TEST__?.getDexieDifficulty?.() ?? 0.3;
    });
    const preEvalProfile = await page.evaluate(async () => {
      const win = window as any;
      return await win.__DRISHTI_TEST__?.getDexieProfile?.() ?? null;
    });

    // Step 11: Complete EVAL drill, verify adaptive difficulty and EMA remain strictly unchanged
    await page.evaluate(() => {
      const win = window as any;
      win.__DRISHTI_TEST__?.advanceToSessionEnd();
    });

    await page.waitForTimeout(1000);

    const postEvalDifficulty = await page.evaluate(async () => {
      const win = window as any;
      return await win.__DRISHTI_TEST__?.getDexieDifficulty?.() ?? 0.3;
    });
    const postEvalProfile = await page.evaluate(async () => {
      const win = window as any;
      return await win.__DRISHTI_TEST__?.getDexieProfile?.() ?? null;
    });

    // EVAL MUST NOT mutate difficulty or EMA profile
    expect(postEvalDifficulty).toBe(preEvalDifficulty);
    expect(postEvalProfile).toEqual(preEvalProfile);

    // Save test evidence screenshot strictly inside test-results directory
    await page.screenshot({
      path: 'test-results/screenshots/task21_pt/progressive_training_multisession_e2e.png',
      fullPage: true,
    });
  });
});
