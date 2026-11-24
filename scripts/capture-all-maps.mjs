import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:/Users/Missi/.gemini/antigravity/brain/dcbbc993-bf1f-433e-850f-d7e049737f29';
const E2E_DIR = path.resolve('tests/e2e/screenshots/task30r');

fs.mkdirSync(E2E_DIR, { recursive: true });

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveScreenshot(page, filename) {
  const artPath = path.join(ARTIFACTS_DIR, filename);
  const e2ePath = path.join(E2E_DIR, filename);
  await page.screenshot({ path: artPath });
  fs.copyFileSync(artPath, e2ePath);
  console.log(`[Capture] Saved ${filename} -> ${artPath} and ${e2ePath}`);
}

async function main() {
  console.log('[Capture] Starting preview server...');
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    shell: true,
    stdio: 'pipe',
  });

  // Wait for preview server to accept HTTP connections
  for (let retry = 0; retry < 20; retry++) {
    try {
      const res = await fetch('http://localhost:4173/HawkEyeAAR/');
      if (res.status < 500) {
        console.log('[Capture] Preview server ready at http://localhost:4173/HawkEyeAAR/');
        break;
      }
    } catch {
      await wait(1000);
    }
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  console.log('[Capture] Navigating to http://localhost:4173/HawkEyeAAR/?view=3D ...');
  await page.goto('http://localhost:4173/HawkEyeAAR/?view=3D');
  await wait(3000);

  // Close briefing modal if open by clicking START SESSION
  const startBtn = page.locator('[data-testid="start-session-btn"]');
  if (await startBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('[Capture] Dismissing briefing modal via START SESSION...');
    await startBtn.click();
    await wait(2000);
  } else {
    await page.keyboard.press('Escape');
    await wait(1000);
  }

  // List of scenarios to capture
  const scenarios = [
    { id: 'DEMO-1', file: 'map_demo1_urban.png', title: 'DEMO-1 Urban Metro Center' },
    { id: 'DEMO-2', file: 'map_demo2_industrial.png', title: 'DEMO-2 Suburban Logistics & Reservoir' },
    { id: 'SWARM-1', file: 'map_swarm_mountain.png', title: 'SWARM-1 Mountain Swarm Battlefield' },
    { id: 'SPECTRUM-1', file: 'map_spectrum_forest_river.png', title: 'SPECTRUM-1 Forest Valley & River' },
    { id: 'PROCEDURAL-1', file: 'map_procedural_coastal.png', title: 'PROCEDURAL Coastal Airfield & Ocean' },
    { id: 'FORMATION-1', file: 'map_formation_alpine.png', title: 'FORMATION Alpine Pass & Lake' },
    { id: 'POPUP-1', file: 'map_popup_urban_corridor.png', title: 'POPUP Urban Ingress Corridor & Canal' },
  ];

  for (const scen of scenarios) {
    console.log(`[Capture] Switching to ${scen.id}...`);

    if (scen.id !== 'DEMO-1') {
      // Open scenario selector via 's'
      await page.keyboard.press('KeyS');
      await wait(1000);

      // Click scenario card
      const card = page.locator(`[data-testid="scenario-card-${scen.id}"]`);
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        const actionBtn = card.locator('button').first();
        await actionBtn.click();
        await wait(800);

        // Check for confirmation dialog (CONFIRM & LOAD SCENARIO)
        const confirmBtn = page.getByRole('button', { name: /CONFIRM & LOAD SCENARIO/i });
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('[Capture] Confirming scenario switch...');
          await confirmBtn.click();
          await wait(1200);
        }

        // Launch if briefing modal opens
        const briefingStart = page.locator('[data-testid="start-session-btn"]');
        if (await briefingStart.isVisible({ timeout: 2000 }).catch(() => false)) {
          await briefingStart.click();
          await wait(1500);
        }
      } else {
        await page.keyboard.press('Escape');
        await wait(500);
      }
    }

    // Set camera to wide OBLIQUE to show entire terrain map
    const obliqueBtn = page.locator('button:has-text("[O] OBLIQUE"), button:has-text("OBLIQUE")').first();
    if (await obliqueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await obliqueBtn.click();
      await wait(500);
    }

    // Wait for 3D terrain and objects to render
    await wait(2500);

    await saveScreenshot(page, scen.file);

    // Detailed feature screenshots
    if (scen.id === 'SWARM-1') {
      // Top down map view of swarm corridors
      const topBtn = page.locator('button:has-text("[T] TOP"), button:has-text("TOP")').first();
      if (await topBtn.isVisible().catch(() => false)) {
        await topBtn.click();
        await wait(1500);
      }
      await saveScreenshot(page, 'swarm_terrain_clearance_overview.png');

      // Switch back to oblique
      if (await obliqueBtn.isVisible().catch(() => false)) await obliqueBtn.click();
    }

    if (scen.id === 'SPECTRUM-1') {
      const topBtn = page.locator('button:has-text("[T] TOP"), button:has-text("TOP")').first();
      if (await topBtn.isVisible().catch(() => false)) {
        await topBtn.click();
        await wait(1500);
      }
      await saveScreenshot(page, 'spectrum_river_detail.png');

      if (await obliqueBtn.isVisible().catch(() => false)) await obliqueBtn.click();
    }

    if (scen.id === 'PROCEDURAL-1') {
      const topBtn = page.locator('button:has-text("[T] TOP"), button:has-text("TOP")').first();
      if (await topBtn.isVisible().catch(() => false)) {
        await topBtn.click();
        await wait(1500);
      }
      await saveScreenshot(page, 'coastal_beach_and_runway.png');

      if (await obliqueBtn.isVisible().catch(() => false)) {
        await obliqueBtn.click();
        await wait(1500);
      }

      // Pan camera directly toward the western beach and coconut palms
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();
      if (box) {
        await page.keyboard.down('Shift');
        await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
        await page.mouse.down({ button: 'left' });
        await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5, { steps: 15 });
        await page.mouse.up({ button: 'left' });
        await page.keyboard.up('Shift');
        await wait(500);
        // Zoom in to clearly resolve the yellow sand beach and coconut palms
        await page.mouse.wheel(0, -1800);
        await wait(2000);
      }
      await saveScreenshot(page, 'coastal_beach_and_ocean_detail.png');
    }

    if (scen.id === 'FORMATION-1') {
      const topBtn = page.locator('button:has-text("[T] TOP"), button:has-text("TOP")').first();
      if (await topBtn.isVisible().catch(() => false)) {
        await topBtn.click();
        await wait(1500);
      }
      await saveScreenshot(page, 'formation_alpine_lake.png');

      if (await obliqueBtn.isVisible().catch(() => false)) await obliqueBtn.click();
    }
  }

  await browser.close();
  preview.kill();
  console.log('[Capture] All scenario screenshots captured successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Capture Error]', err);
  process.exit(1);
});
