import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

describe('Architecture Guardrails (Rules.md: ZS-1, ZS-2, DT-2, DT-5)', () => {
  const eslint = new ESLint();

  it('FATAL (DT-2): deliberate Math.random() in src/sim fails lint', async () => {
    const results = await eslint.lintText('export const x = Math.random();', {
      filePath: 'src/sim/deliberate_leak.ts',
    });

    expect(results[0].errorCount).toBeGreaterThan(0);
    const msg = results[0].messages.find((m: { ruleId: string | null }) => m.ruleId === 'no-restricted-properties');
    expect(msg).toBeDefined();
    expect(msg?.message).toContain('DT-2: Math.random() is FATAL');
  });

  it('FATAL (ZS-1): fetch() in src/ fails lint', async () => {
    const results = await eslint.lintText('fetch("http://127.0.0.1/api");', {
      filePath: 'src/sim/api.ts',
    });

    expect(results[0].errorCount).toBeGreaterThan(0);
    const msg = results[0].messages.find((m: { ruleId: string | null }) => m.ruleId === 'no-restricted-globals');
    expect(msg).toBeDefined();
    expect(msg?.message).toContain('ZS-1: fetch is banned');
  });

  it('FATAL (DT-5): Date.now() in src/sim fails lint, but is permitted in src/db and src/ui', async () => {
    const simResults = await eslint.lintText('export const t = Date.now();', {
      filePath: 'src/sim/bad_date.ts',
    });
    expect(simResults[0].errorCount).toBeGreaterThan(0);

    const dbResults = await eslint.lintText('export const t = Date.now();', {
      filePath: 'src/db/good_date.ts',
    });
    expect(dbResults[0].errorCount).toBe(0);

    const uiResults = await eslint.lintText('export const t = Date.now();', {
      filePath: 'src/ui/good_date.ts',
    });
    expect(uiResults[0].errorCount).toBe(0);
  });

  it('FATAL (DT-5): performance.now() is banned in sim logic except src/sim/clock.ts', async () => {
    const engineResults = await eslint.lintText('export const p = performance.now();', {
      filePath: 'src/sim/engine.ts',
    });
    expect(engineResults[0].errorCount).toBeGreaterThan(0);

    const clockResults = await eslint.lintText('export const p = performance.now();', {
      filePath: 'src/sim/clock.ts',
    });
    expect(clockResults[0].errorCount).toBe(0);
  });
});
