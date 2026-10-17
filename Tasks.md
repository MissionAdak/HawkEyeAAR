# Tasks.md: 36-Hour Hackathon Sprint Tracker

Priority key: **P0** must-have (never cut), **P1** should-have (cut only per the cut line), **P2** cuttable. Owners: **A** sim core and rendering, **B** decision logic and scoring, **C** Director, persistence, import/export, **D** React UI, AAR, pitch. Tick a task only when every acceptance criterion (AC) passes and `npm run lint && npm run test && npm run build` is green.

Timeboxes: P0 H0-H2 | P1 H2-H10 | P2 H10-H18 | P3 H18-H26 | P4 H26-H31 | P5 H31-H36. Each phase ends with a checkpoint demo on a real low-end laptop.

**Cut line (cut in this order):** 1) RAIN and RADAR_DROPOUT chaos; 2) instructor mode; 3) RIDGE and FOREST zones (keep URBAN); 4) Thompson sampling and all other P2; 5) unit-view heatmap (keep minimal unit table); 6) session JSON import/export. **Never cut:** terrain masking, three sensor modes, decision-tree scoring, MET and timeline replay, TRAIN/EVAL split, minimal unit table.

---

## Phase 0: Project Setup and Contracts (H0 to H2)

### TASK-P0-01 Scaffold and guardrails (A, P0)
Files: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.eslintrc.cjs`, `vitest.config.ts`, `playwright.config.ts`, `index.html`
- [x] Vite + React 19 + TS strict + Tailwind; deps limited to the approved list. AC: `npm run build` produces `dist/` under 2 MB at this stage. (Completed: dist is ~370 KB)
- [x] ESLint bans from Rules.md section 1 (`fetch`, `Math.random`, `Date.now`, `performance.now` overrides). AC: deliberate violations fail lint.
- [x] Production CSP meta tag. AC: built `index.html` contains `connect-src 'none'`.

### TASK-P0-02 Config pipeline (C, P0)
Files: `public/config.json`, `src/config/schema.ts`, `scripts/inline-config.mjs`, `src/config/index.ts`
- [x] `config.json` with drone classes, effectors, weights, thresholds (`Q_min` 0.6, `R_min` 500 m), matrix 6x7, zone defaults, `_meta.notional = true`.
- [x] zod schema and prebuild inline. AC: removing a required key fails the build with a readable message; runtime has no config fetch.

### TASK-P0-03 Contracts and taxonomy (B, P0)
Files: `src/sim/types.ts`, `src/sim/taxonomy.ts`
- [x] Interfaces exactly as ARCHITECTURE.md 3.2; 7-class `CLASSES`. AC: `tsc --noEmit` passes; a type-level test proves a string outside `CLASSES` does not compile.

### TASK-P0-04 PRNG, clock and fixed-step loop (A, P0)
Files: `src/sim/rng.ts`, `src/sim/clock.ts`, `src/sim/inputQueue.ts`, `src/sim/engine.ts`
- [x] `mulberry32`, `hash32`, `streamSeed`, `keyedU`. AC: known-answer unit tests; same seed gives same sequence; different labels give different sequences.
- [x] Accumulator loop (`TICK_MS = 50`, `MAX_FRAME_MS = 250`), input quantisation `applyTick = max(ceil(tRaw/50), tick+1)`. AC: with simulated frame times 16.7 ms, 6.9 ms and 33 ms, tick count after 10 s is exactly 200 in all three.

### TASK-P0-05 Zustand store and Dexie (C, P0)
Files: `src/store/sessionStore.ts`, `src/db/dexie.ts`, `src/db/recorder.ts`
- [x] Store facade with action stubs that push to `inputQueue`; `uiSnapshot` capped at 150 rows. AC: dispatching 1,000 actions leaves sim state untouched until the next tick.
- [x] Dexie schema from ARCHITECTURE.md 4.1 with batched `bulkAdd` recorder.

### TASK-P0-06 First pixels: PPI with DEMO-1 stub (A, D, P0)
Files: `src/render/renderer.ts`, `src/render/radarLayer.ts`, `src/ui/Console.tsx`, `src/director/bundled/demo1.json`
- [x] Grid layout from DESIGN.md 2 and the radar frame `--radar`. AC (Playwright, 1366x768): `scrollHeight <= innerHeight`, canvas 520x520, rails 240 and 320 px.
- [x] Range rings, ticks, sweep with afterglow, DEMO-1 stub entities as dots.

**Checkpoint H2 Passed:** app boots offline, sweep turns, stub drone flies, responsive C2 shell active.
