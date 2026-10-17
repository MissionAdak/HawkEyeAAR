import { test, expect } from '@playwright/test';

test.describe('Air-Gap & Zero-Network Compliance (ZS-5, AC-11)', () => {
  test('operates with zero outgoing network requests and zero non-local calls', async ({
    page,
  }) => {
    const illegalRequests: { url: string; method: string; resourceType: string }[] = [];

    // Monitor every request made by the browser
    page.on('request', (request) => {
      const type = request.resourceType();
      const url = request.url();

      // Any external network calls or any API fetches/XHR/WebSockets are illegal
      if (['fetch', 'xhr', 'websocket', 'eventsource'].includes(type) || !url.startsWith('http://127.0.0.1')) {
        illegalRequests.push({ url, method: request.method(), resourceType: type });
      }
    });

    // Load local static build via local loopback
    await page.goto('/');

    // Wait 3 seconds to let simulation tick and render
    await page.waitForTimeout(3000);

    // Verify zero illegal network requests
    expect(illegalRequests).toHaveLength(0);

    // Verify simulation is actively running offline (clock has advanced)
    const clock = page.locator('header .font-clock');
    await expect(clock).toBeVisible();
    const clockText = await clock.textContent();
    expect(clockText).not.toBe('T+00:00.000');
  });
});
