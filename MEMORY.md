# MEMORY.md: Persistent Context and Architecture Registry

Read this first in every new session (human or LLM). Update sections 2, 4 and the Decision Log at the end of every working session. Never delete a Decision Log row; supersede it.

## 1. Project Metadata

| Field | Value |
|---|---|
| Product | DRISHTI-CUAS, an offline 2D radar-console C-UAS trainer and AAR engine |
| Hackathon | Smart India Hackathon, Problem Statement ID **26247** (listed as SIH26247) |
| Title | AI-Enabled Drone & Counter-Drone Threat Simulation Trainer |
| Organisation / Department | Ministry of Defence (MoD) / Defence Services Staff College |
| Category / Theme | Software / Robotics and Drones |
| Spec versions in force | PRD v1.1 + v1.1 Architecture & Scoring Patch (patch wins on conflict) |
| Stack (final) | React 19, TypeScript (strict), Vite, Tailwind CSS, Zustand, native Canvas 2D, Dexie.js, Chart.js (AAR only), zod (build-time config), Vitest, Playwright |
| Explicitly excluded | PixiJS, Three.js, Unity, VR, FastAPI, SQLite (reserved for after v1), any network call, any CDN |
| Target hardware | Dual-core i3, 4 GB RAM, integrated GPU, 1366x768, Windows 10/11, Ubuntu 20.04+, BOSS Linux; pinned bundled Chromium |
| Session length | 120 s (DEMO-2 is 30 s) at 20 Hz fixed tick |
| Docs in repo | `ARCHITECTURE.md`, `DESIGN.md`, `Rules.md`, `Tasks.md`, `MEMORY.md` |

## 2. Current Implementation Status

_Last updated: 2026-10-17._

**Completed (Phase 0 Complete + Phase 1 Underway):**
- **TASK-P0-01 (Scaffold & Guardrails):** Vite + React 19 + TypeScript (strict) + Tailwind CSS scaffolded. Zero network dependencies. ESLint rules enforce bans on `fetch`, `XMLHttpRequest`, `Math.random`, `Date.now`, and `performance.now` outside designated modules. Production CSP meta tag with `connect-src 'none'`. Bundle size is ~370 KB (well within 8 MB budget).
- **TASK-P0-02 (Config Pipeline):** `public/config.json` with canonical parameters. Inlined at build-time via `scripts/inline-config.mjs` into `src/config/config.generated.ts` and validated with `zod`.
- **TASK-P0-03 (Contracts & Taxonomy):** 7 canonical classes in `src/sim/taxonomy.ts` and comprehensive TypeScript interfaces in `src/sim/types.ts`.
- **TASK-P0-04 (PRNG & Fixed Accumulator Loop):** `mulberry32`, `hash32`, `streamSeed`, `keyedU` in `src/sim/rng.ts`. `SimClock` in `src/sim/clock.ts` maintains exact 200 ticks per 10 s across frame rates. Quantised `InputQueue` in `src/sim/inputQueue.ts`.
- **TASK-P0-05 (Zustand & Dexie):** `sessionStore.ts` facade pushing quantised actions to `InputQueue` with shallow UI snapshot updates. `db/dexie.ts` database schema with batched `EventRecorder` in `db/recorder.ts`.
- **TASK-P0-06 (Tactical C2 UI & PPI):** Full zero-overflow responsive layout in `Console.tsx`, `TopBar.tsx`, `TrackTable.tsx`, `EngagementPanel.tsx`, `EventLog.tsx`. 520x520 native HTML5 Canvas 2D PPI with rotating 30 RPM sweep, range rings, afterglow, and DEMO-1 stub entities.
- **Phase 1 Foundations:**
  - `src/sim/masking.ts`: Mathematical ray-polygon line-of-sight elevation angle masking for URBAN, RIDGE, FOREST zones.
  - `src/sim/sensors.ts`: Radar SNR and $P_d$ 4th-power equation, track quality $q$ fusion, $c_{cls}$ confidence fusion, and coasting decay.
  - `src/sim/behaviours.ts`: Trajectory profiles including `TERRAIN_HUG` (500m descent trigger at 8 m/s).
  - `src/sim/scoring.ts`: Complete D, C (6x7 matrix), E_econ (CER), G, R, and S formulas with boundary clamping.
  - Test suites: 48 passing unit tests and 3 passing Playwright e2e tests (verifying air-gap and 1366x768 zero vertical overflow).

**In progress:** Phase 1 complete sensor cross-cueing (EO/IR viewfinder, RF waterfall) and DEMO-1 automated golden re-simulation.

## 3. Established Architectural Patterns

**Zustand actions and the Canvas loop.** The `SimEngine` instance is the single owner of mutable sim state. UI components call Zustand *actions*, which only push onto `inputQueue` with `applyTick = max(ceil(tRaw/50), tick+1)`. `engine.step()` drains the queue, mutates state, appends `SimEvent`s, then publishes a capped `uiSnapshot` to Zustand once per tick. React renders from the snapshot. The Canvas renderer reads `engine.prev`, `engine.curr` and `alpha = acc/50` directly each `requestAnimationFrame`; it never subscribes to the store and never writes sim state.

**How Dexie logs events.** `recorder.ts` buffers `SimEvent`s, flushes every 1 s and at `SESSION_END` via `bulkAdd` in one transaction. Events carry `sessionUid`, `seq`, `tMs`, `type`, `payload`. Indexes `[sessionUid+tMs+seq]` and `[sessionUid+type+tMs]` serve range replay and per-type queries. `SNAPSHOT` events every 250 ms allow instant scrubbing. Payloads are self-describing (reactive-trigger injections carry the full spawned spec; kill draws carry `u`).

**How seeds are passed.** `ScenarioSpec.seed` is a 32-bit int. Everything derives from it through `streamSeed(seed, label, key)`: `traj` (per entity, at spawn), `sense` (stateless keyed draw per entity per sweep), `kill` (sequential, logged), `gen` (Director only). Trainee actions can change only the `kill` stream order, and every `kill` result is logged.

**Replay.** Two contracts. AAR replay is event-sourced and must never call the Director, the engine or a PRNG. The CI golden test re-simulates spec + input log and compares event sequences and scores. Do not merge the two.

**Config.** `public/config.json` is validated and inlined at build time by `scripts/inline-config.mjs`. There is no runtime fetch.

**Classification and symbology.** Seven canonical classes; the scope draws the trainee's label only; ground truth appears only in AAR (and the `[G]` toggle there).

**ROE and gating.** Hard blocks (no `q`, past PNR, out of envelope, jam) disable the button. Soft gates (unclassified or UNK label, kinetic over rho > 0.5 zone) are allowed and scored as violations.

## 4. Fixed Bugs and Regression Warnings (traps to avoid)

| # | Trap | Rule of thumb |
|---|---|---|
| R-1 | **Canvas height overflow on 768p.** The v1.0 700x700 canvas plus 45 px top bar and 110 px log needs about 855 px. | Use `--radar: min(520px, calc(100vh - 190px))` and the grid in DESIGN.md 2. Overlay tabs and readouts inside the canvas frame. Playwright asserts `scrollHeight <= innerHeight` |
| R-2 | **PixiJS vs native Canvas.** AI agents mix PixiJS v7 and v8 APIs. | PixiJS is banned. Use `ctx.arc`, `ctx.stroke`, `ctx.drawImage`; 150 entities hold 60 fps on integrated graphics |
| R-3 | **`t_trk` vs `t_vis`.** Starting detection time at `t_vis` capped D because of the 2 to 6 s track-initiation delay. | Trainee-time metrics start at `t_trk` (track appears). `t_trk - t_vis` is a diagnostic only |
| R-4 | **Six classes vs seven.** The PRD matrix was 6x6 and symbology had 4 shapes. | Seven classes everywhere; matrix is 6 true rows x 7 label columns (UNKNOWN row rendered as zero); symbols drawn from trainee label |
| R-5 | **Zustand render storm.** Pushing 150 tracks into React state at 20 Hz stalls low-end laptops. | Canvas reads the engine directly; React gets a capped `uiSnapshot` once per tick with shallow selectors |
| R-6 | **`Math.random()` / `Date.now()` in sim.** Breaks golden replay. | ESLint bans; use keyed streams |
| R-7 | **Shared PRNG cursor.** Looking at more tracks changed other tracks' detection draws. | `sense` is a stateless keyed draw per (entity, sweep) |
| R-8 | **Replay re-running the Director.** Reactive triggers made the replay diverge from the live run. | Triggers log their full spawned spec; replay reads events only |
| R-9 | **Config fetch.** `fetch('/config.json')` violates the zero-network rule. | Inline at build time |
| R-10 | **Air-gap test by grepping URLs.** React and SVG bundles contain URL strings that are never requested. | Network-blocked Playwright run, assert zero outgoing requests |
| R-11 | **Unbounded penalty stacking.** v1.0 could drive a track score negative. | Clamp every component and every track score to [0,100] before weighting; no single penalty may go below 0 |
| R-12 | **Grade labels.** MISSION-READY and REMEDIAL imply real-world certification. | Use `PROFICIENT_IN_SIMULATION`, `DEVELOPING`, `NEEDS_RETRAINING` |
| R-13 | **Adaptive scores compared between trainees.** TRAIN steers difficulty to about 70 for everyone. | Leaderboards and percentiles use EVAL sessions only; trends always show `d` |
| R-14 | **Ghost engagement.** Firing at a coasting masked track. | `q` decays to 0 over 8 s; below `Q_min` weapons release is hard-blocked |
| R-15 | **IndexedDB / modules on `file://`.** Unreliable origins. | Use the local static launcher on 127.0.0.1 |
| R-16 | **Cross-engine float drift.** `exp` and `atan2` differ between engines. | Golden tests run on the pinned Chromium only |
| R-17 | **`event.timeStamp` origin.** It is relative to `performance.timeOrigin`, not session start. | Convert using the last frame's timestamps and sim clock; never compare to sim ms directly |
| R-18 | **Unclassified release.** PRD F-03 said release "needs" a classification; Section 4.6 said release on unclassified is a violation. | Resolved: it is allowed but is an automatic ROE violation (SC-9, SC-10) |
| R-19 | **SimClock t=0 initialization frame.** Calling `advance(0)` when `lastFrameTs` initialized to 0 caused the first real frame delta to be skipped as a baseline. | Use explicit `isInitialized` boolean flag in `SimClock`. |

## 5. Decision Log (append only)

| ID | Date | Decision | Reason | Supersedes |
|---|---|---|---|---|
| D-01 | 2026-10-17 | Browser-only single tier; FastAPI and SQLite deferred | Avoid loopback CSP and port-binding failures on the evaluation laptop (patch s2) | PRD v1.0 5.1 dual tier |
| D-02 | 2026-10-17 | Seven canonical classes incl. `UNKNOWN_EVIDENCE_INSUFFICIENT` | Single taxonomy for UI, engine, DB and AAR (patch s1) | PRD 6-class matrix |
| D-03 | 2026-10-17 | Matrix is 6 true rows x 7 label columns; UNK column 25 (hostile) / 40 (non-hostile); never-classified scores 0 | Needed to score the new class; notional values | PRD 4.4 |
| D-04 | 2026-10-17 | AAR replay is event-sourced; CI uses golden re-simulation | Guarantees bit-identical replays despite reactive triggers (patch s4) | PRD 4.8 "re-run the sim" |
| D-05 | 2026-10-17 | Grades reduced to three: Proficient in Simulation (>=70), Developing (50 to 69), Needs Retraining (<50) | Patch renames top and bottom labels; DESIGN needs three badges; the old 70-84 PROFICIENT band would collide with the renamed top band | PRD 4.7 four grades |
| D-06 | 2026-10-17 | Config inlined at build time instead of fetched | Zero-network rule is absolute | none |
| D-07 | 2026-10-17 | Radar viewport `min(520px, calc(100vh - 190px))`, tabs overlaid inside canvas | Prevent overflow at 768 px (patch s3) | PRD 3.3 700x700 |
| D-08 | 2026-10-17 | Native Canvas 2D only | Avoid PixiJS version confusion | PRD "PixiJS optional" |
| D-09 | 2026-10-17 | Unclassified release allowed but an automatic ROE violation; physical blocks disable the button | Reconciles F-03 with section 4.6 and teaches the consequence | PRD F-03 wording |
| D-10 | 2026-10-17 | Scored times use tick-quantised `tMs`; raw `tRawMs` displayed beside it | Determinism with honest millisecond reporting | none |
| D-11 | 2026-10-17 | `R_opt = (envelope_min + envelope_max)/2` | Equals the centre of the 60% plateau; patch s5 | PRD "middle of plateau" (same value, now explicit) |
| D-12 | 2026-10-17 | Radar frame border offset handling | Radar frame width is 520px; internal canvas width 520px maintains exact 1:1 pixel grid without page scroll | none |
