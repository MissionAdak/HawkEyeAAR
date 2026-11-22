import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';

/**
 * TASK 25-B: Production Bundle & Lazy-Loading Acceptance
 *
 * Measures actual production build artifacts, validating that:
 * 1. Initial 2D entry path loads only the core application bundle without Three.js.
 * 2. Three.js and 3D rendering modules are cleanly partitioned into lazy-loaded chunks.
 * 3. Total dist bundle respects the <= 2.0 MB budget.
 * 4. Raw and compressed (gzip/brotli) transfer sizes are empirically accounted for.
 */
describe('TASK 25-B: Production Bundle & Lazy-Loading Acceptance', () => {
  const distDir = path.resolve(process.cwd(), 'dist');
  const assetsDir = path.join(distDir, 'assets');

  beforeAll(() => {
    const indexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(distDir) || !fs.existsSync(indexPath)) {
      console.log('[TASK 25-B] Production dist artifacts missing. Executing build before acceptance assertion...');
      execSync('npm run build', { stdio: 'inherit' });
    }
  }, 60000);

  it('validates production dist directory and index.html entry structure', () => {
    expect(fs.existsSync(distDir), 'Production dist directory must exist. Run npm run build first.').toBe(true);
    expect(fs.existsSync(assetsDir)).toBe(true);

    const indexPath = path.join(distDir, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);

    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    // 1. Initial HTML must load the primary entry JS and CSS
    expect(indexHtml).toMatch(/<script\s+type="module"\s+crossorigin\s+src="\/HawkEyeAAR\/assets\/index-[a-zA-Z0-9_-]+\.js"><\/script>/);
    expect(indexHtml).toMatch(/<link\s+rel="stylesheet"\s+crossorigin\s+href="\/HawkEyeAAR\/assets\/index-[a-zA-Z0-9_-]+\.css">/);

    // 2. Initial HTML must NOT preload or eagerly import optional 3D chunks
    expect(indexHtml).not.toContain('render3d');
    expect(indexHtml).not.toContain('three');

    // 3. Strict Content-Security-Policy verification in index.html
    expect(indexHtml).toContain("connect-src 'none'");
    expect(indexHtml).toContain("default-src 'self'");
  });

  it('measures chunk sizes and verifies Three.js isolation from initial entry chunk', () => {
    const files = fs.readdirSync(assetsDir);

    // Identify entry JS chunk: index-*.js (excluding .css)
    const entryJsFile = files.find((f) => /^index-[a-zA-Z0-9_-]+\.js$/.test(f));
    expect(entryJsFile, 'Main entry JavaScript chunk must exist').toBeDefined();

    // Identify lazy 3D vendor chunk (three.js): render3d-[hash].js
    const render3dVendorChunk = files.find((f) => /^render3d-[a-zA-Z0-9_-]+\.js$/.test(f));
    expect(render3dVendorChunk, 'Three.js vendor chunk must exist').toBeDefined();

    // Identify lazy 3D application chunk: render3d-index-[hash].js
    const render3dAppChunk = files.find((f) => /^render3d-index-[a-zA-Z0-9_-]+\.js$/.test(f));
    expect(render3dAppChunk, 'Render3D application chunk must exist').toBeDefined();

    // Measure raw and compressed sizes
    const entryJsPath = path.join(assetsDir, entryJsFile!);
    const entryJsRaw = fs.readFileSync(entryJsPath);
    const entryJsGzip = zlib.gzipSync(entryJsRaw);
    const entryJsBrotli = zlib.brotliCompressSync(entryJsRaw);

    const vendor3dPath = path.join(assetsDir, render3dVendorChunk!);
    const vendor3dRaw = fs.readFileSync(vendor3dPath);
    const vendor3dGzip = zlib.gzipSync(vendor3dRaw);
    const vendor3dBrotli = zlib.brotliCompressSync(vendor3dRaw);

    const app3dPath = path.join(assetsDir, render3dAppChunk!);
    const app3dRaw = fs.readFileSync(app3dPath);
    const app3dGzip = zlib.gzipSync(app3dRaw);

    // Verification 1: Three.js vendor code is partitioned into the render3d chunk
    // and NOT bundled into the initial 2D entry chunk
    const entryJsContent = entryJsRaw.toString('utf-8');
    const vendor3dContent = vendor3dRaw.toString('utf-8');

    expect(vendor3dContent).toContain('WebGLRenderer');
    expect(vendor3dContent).toContain('PerspectiveCamera');
    expect(entryJsContent).not.toContain('WebGLRenderer');

    // Verification 2: Chunk sizes adhere to established limits
    // Initial entry JS should be under 800 kB raw, ~220 kB gzip
    expect(entryJsRaw.length).toBeLessThan(800 * 1024);
    expect(entryJsGzip.length).toBeLessThan(250 * 1024);

    // Three.js vendor chunk should be ~525 kB raw, ~140 kB gzip
    expect(vendor3dRaw.length).toBeLessThan(600 * 1024);
    expect(vendor3dGzip.length).toBeLessThan(160 * 1024);

    // Total dist directory size must be strictly under 2.0 MB (2,097,152 bytes)
    let totalDistBytes = 0;
    function walkDir(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(full);
        } else {
          totalDistBytes += fs.statSync(full).size;
        }
      }
    }
    walkDir(distDir);

    const budgetBytes = 2 * 1024 * 1024; // 2,097,152 bytes
    expect(totalDistBytes).toBeLessThan(budgetBytes);

    // Log audited metrics for report generation
    console.log('[TASK 25-B Bundle Report]', {
      totalDistBytes,
      totalDistMB: (totalDistBytes / (1024 * 1024)).toFixed(3) + ' MB',
      budgetRemaining: ((budgetBytes - totalDistBytes) / 1024).toFixed(1) + ' kB',
      initialEntryJs: {
        file: entryJsFile,
        rawKB: (entryJsRaw.length / 1024).toFixed(2) + ' kB',
        gzipKB: (entryJsGzip.length / 1024).toFixed(2) + ' kB',
        brotliKB: (entryJsBrotli.length / 1024).toFixed(2) + ' kB',
      },
      optionalThreeVendorChunk: {
        file: render3dVendorChunk,
        rawKB: (vendor3dRaw.length / 1024).toFixed(2) + ' kB',
        gzipKB: (vendor3dGzip.length / 1024).toFixed(2) + ' kB',
        brotliKB: (vendor3dBrotli.length / 1024).toFixed(2) + ' kB',
      },
      optional3DAppChunk: {
        file: render3dAppChunk,
        rawKB: (app3dRaw.length / 1024).toFixed(2) + ' kB',
        gzipKB: (app3dGzip.length / 1024).toFixed(2) + ' kB',
      },
    });
  });
});
