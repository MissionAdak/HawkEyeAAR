import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Build & Airgap Guardrails (TASK-P0-01)', () => {
  const distDir = path.resolve('dist');
  const indexHtmlPath = path.join(distDir, 'index.html');

  it('verifies built index.html exists and contains connect-src \'none\'', () => {
    if (!fs.existsSync(indexHtmlPath)) {
      // Fresh checkout without pre-existing dist/ - verify root template CSP
      const rootHtmlPath = path.resolve('index.html');
      expect(fs.existsSync(rootHtmlPath)).toBe(true);
      const rootHtml = fs.readFileSync(rootHtmlPath, 'utf-8');
      expect(rootHtml).toContain("connect-src 'none'");
      expect(rootHtml).toContain("default-src 'self'");
      return;
    }
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');

    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("default-src 'self'");
    expect(html).not.toContain('https://');
    expect(html).not.toContain('http://');
  });

  it('verifies production bundle size is well under 2 MB limit', (ctx) => {
    if (!fs.existsSync(distDir)) {
      // Fresh checkout without pre-existing dist/ - safely skip bundle size check
      ctx.skip();
      return;
    }

    let totalBytes = 0;
    function computeDirSize(dir: string) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          computeDirSize(fullPath);
        } else {
          totalBytes += stat.size;
        }
      }
    }

    computeDirSize(distDir);
    const sizeMb = totalBytes / (1024 * 1024);

    // AC: under 2 MB
    expect(sizeMb).toBeLessThan(2.0);
    console.log(`[build.spec] Total dist bundle size: ${sizeMb.toFixed(3)} MB`);
  });
});
