# Tasks.md: 36-Hour Hackathon Sprint Tracker

Priority key: **P0** must-have (never cut), **P1** should-have (cut only per the cut line), **P2** cuttable. Owners: **A** sim core and rendering, **B** decision logic and scoring, **C** Director, persistence, import/export, **D** React UI, AAR, pitch. Tick a task only when every acceptance criterion (AC) passes and `npm run lint && npm run test && npm run build` is green.

Timeboxes: P0 H0-H2 | P1 H2-H10 | P2 H10-H18 | P3 H18-H26 | P4 H26-H31 | P5 H31-H36. Each phase ends with a checkpoint demo on a real low-end laptop.

**Cut line (cut in this order):** 1) RAIN and RADAR_DROPOUT chaos; 2) instructor mode; 3) RIDGE and FOREST zones (keep URBAN); 4) Thompson sampling and all other P2; 5) unit-view heatmap (keep minimal unit table); 6) session JSON import/export. **Never cut:** terrain masking, three sensor modes, decision-tree scoring, MET and timeline replay, TRAIN/EVAL split, minimal unit table.

---

## Phase 0: Project Setup and Contracts (H0 to H2)

### TASK-P0-01 Scaffold and guardrails (A, P0)
Files: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.eslintrc.cjs`, `vitest.config.ts`, `playwright.config.ts`, `index.html`
- [ ] Vite + React 19 + TS strict + Tailwind; deps limited to the approved list. AC: `npm run build` produces `dist/` under 2 MB at this stage.
- [ ] ESLint bans from Rules.md section 1 (`fetch`, `Math.random`, `Date.now`, `performance.now` overrides). AC: a deliberate `Math.random()` in `src/sim` fails lint.
- [ ] Production CSP meta tag. AC: built `index.html` contains `connect-src 'none'`.

### TASK-P0-02 Config pipeline (C, P0)
Files: `public/config.json`, `src/config/schema.ts`, `scripts/inline-config.mjs`, `src/config/index.ts`
- [ ] `config.json` with drone classes (speed, value, RCS), effectors (cost, Pk0, envelope, `w_e`, debris radius), weights, thresholds (`Q_min` 0.6, `R_min` 500 m), matrix 6x7 from Rules.md 3.3, zone defaults, `_meta.notional = true`. AC: every number in PRD sections 3.4, 4.4 to 4.7 appears here.
- [ ] zod schema and prebuild inline. AC: removing a required key fails the build with a readable message; runtime has no config fetch.

### TASK-P0-03 Contracts and taxonomy (B, P0)
Files: `src/sim/types.ts`, `src/sim/taxonomy.ts`
- [ ] Interfaces exactly as ARCHITECTURE.md 3.2; 7-class `CLASSES`. AC: `tsc --noEmit` passes; a type-level test proves a string outside `CLASSES` does not compile.

### TASK-P0-04 PRNG, clock and fixed-step loop (A, P0)
Files: `src/sim/rng.ts`, `src/sim/clock.ts`, `src/sim/inputQueue.ts`, `src/sim/engine.ts` (skeleton)
- [ ] `mulberry32`, `hash32`, `streamSeed`, `keyedU`. AC: known-answer unit tests; same seed gives same sequence; different labels give different sequences.
- [ ] Accumulator loop (`TICK_MS = 50`, `MAX_FRAME_MS = 250`), input quantisation `applyTick = max(ceil(tRaw/50), tick+1)`. AC: with simulated frame times 16.7 ms, 6.9 ms and 33 ms, tick count after 10 s is exactly 200 in all three.

### TASK-P0-05 Zustand store and Dexie (C, P0)
Files: `src/store/sessionStore.ts`, `src/db/dexie.ts`, `src/db/recorder.ts`
- [ ] Store facade with action stubs that push to `inputQueue`; `uiSnapshot` capped at 150 rows. AC: dispatching 1,000 actions leaves sim state untouched until the next tick.
- [ ] Dexie schema from ARCHITECTURE.md 4.1 with batched `bulkAdd` recorder. AC: 5,000 events insert in one transaction in under 300 ms in Chromium; a range query on `[sessionUid+tMs+seq]` returns them ordered.

### TASK-P0-06 First pixels: PPI with DEMO-1 stub (A, D, P0)
Files: `src/render/renderer.ts`, `src/render/radarLayer.ts`, `src/ui/Console.tsx`, `src/director/bundled/demo1.json` (stub)
- [ ] Grid layout from DESIGN.md 2 and the radar frame `--radar`. AC (Playwright, 1366x768): `scrollHeight <= innerHeight`, canvas 520x520, rails 240 and 320 px.
- [ ] Range rings, ticks, sweep with afterglow, DEMO-1 stub entities as dots. AC: 60 fps with 100 dummy entities on the target laptop.

**Checkpoint H2:** app boots offline, sweep turns, a stub drone flies, one event round-trips into Dexie.

---

## Phase 1: 2D Canvas Radar Core and Masking Engine (H2 to H10)

### TASK-P1-01 Entity model and scenario loader (A, P0)
Files: `src/sim/entities.ts`, `src/sim/behaviours.ts`, `src/sim/engine.ts`
- [ ] `engine.load(spec)` spawns from `ScenarioSpec`, handles DIRECT, ERRATIC (bird, per-entity `traj` stream), LOITER. AC: unit test: distance travelled after N ticks equals `v * N * 0.05` within 1e-9, so a 40 m/s drone covers 2,000 m in exactly 1,000 ticks.
- [ ] `prev`/`curr` copy each tick for interpolation. AC: no allocation per tick (checked with a heap-delta test over 2,400 ticks).

### TASK-P1-02 Radar detection and track initiation (A, P0)
Files: `src/sim/sensors.ts`
- [ ] `SNR = (RCS/0.01) * (3000/R)^4 * A_env`, `Pd = 1 - exp(-2.303 SNR)`; evaluate only when the beam crosses the bearing; keyed `sense` draw. AC: reference target at 3 km gives Pd 0.9; at 6 km Pd about 0.14.
- [ ] 2-of-3 sweep `TRACK_INIT`, set `tTrk`, assign `T-nn`. AC: events `DETECT`, `TRACK_INIT` logged with correct `tMs`; `tTrk - tVis` recorded.

### TASK-P1-03 Terrain masking, URBAN (A, P0)
Files: `src/sim/masking.ts`, `tests/unit/masking.spec.ts`
- [ ] Segment-polygon first-intersection `d_n`; `theta_mask = atan2(H - 15, d_n)`, `theta_t = atan2(z - 15, R)`; masked iff `theta_t < theta_mask` and `R - d_n <= L`. AC tests: target inside zone below roofline is masked; same target at z 120 m is not; target beyond shadow length is not; target not crossing the polygon is not.
- [ ] `MASKED` / `REACQUIRE` events with `thetaT`, `thetaMask`. AC: DEMO-1 H-1 masked at T+30 and reacquired near T+51 (+/- 1 s).

### TASK-P1-04 Terrain-hug profile and coasting (A, P0)
Files: `src/sim/behaviours.ts`, `src/sim/sensors.ts`
- [ ] `d_trig = v * (z_cruise - z_hug)/descent_rate` (FPV 500 m); descend 8 m/s to `0.5 H`; climb after exit. AC (AC-3): at configured speeds, `z <= z_hug` before the shadow begins.
- [ ] Ghost coasting: `sigma(t) = sigma0 + 12 * dt`; `q` decays linearly to 0 over 8 s on mask. AC: `q < 0.6` within about 2 s of masking (matches PRD 3.4).

### TASK-P1-05 Symbology and track table (D, P0)
Files: `src/render/symbols.ts`, `src/ui/TrackTable.tsx`
- [ ] Five symbol families from DESIGN.md 1.3 drawn from the **trainee label**. AC: new tracks show the yellow "?" regardless of `trueClass`.
- [ ] Track table: 240 px, 6 columns, status pills, urgency sort, Tab cycling. AC: 12 rows visible without page scroll.

### TASK-P1-06 EO/IR mode (A, D, P0)
Files: `src/render/eoirLayer.ts`, `src/sim/sensors.ts`
- [ ] 30 degree steerable cone (60 deg/s slew), silhouette viewfinder, range scaling, day/night palette. AC: target outside cone or range is not drawn; `q_eo = 0.7` only inside cone and range.

### TASK-P1-07 RF mode (A, D, P0)
Files: `src/render/rfLayer.ts`, `src/sim/sensors.ts`
- [ ] DF lines with +/-5 degree jitter at 4 Hz, waterfall, `RID`/`LINK` tags; RF-silent targets never appear; RF attenuated 0.5 inside zones. AC: RF-silent swarm elements produce no trace; `q_rf = 0.4` bearing-only.

### TASK-P1-08 RIDGE and FOREST zones (A, P1 cuttable)
Files: `src/sim/masking.ts`, `src/render/radarLayer.ts`
- [ ] Defaults ridge H 80 / L 1,200, forest H 25 / L 300, `rho = 0`. AC: masking tests parameterised over all three types pass.

### TASK-P1-09 DEMO-1 authoring (C, A, P0)
Files: `src/director/bundled/demo1.json`, `tests/golden/demo1.spec.ts`
- [ ] Author DEMO-1 from PRD 3.4 (H-1, B-1, C-1, U1, chaos, wave 2 trigger). AC: scripted-ideal-operator run hits first detectable T+5, masked T+30 to T+50 (+/- 1 s).

**Checkpoint H10:** drone descends, vanishes behind U1, reappears; sensors 1/2/3 show different information; 60 fps on the low-end laptop.

---

## Phase 2: F2T2EA Interaction, Effector Engine and Chaos Engine (H10 to H18)

### TASK-P2-01 F2T2EA state machine (B, P0)
Files: `src/sim/engine.ts`, `src/sim/roe.ts`
- [ ] Transitions per ARCHITECTURE.md 3.3 with guards only in `roe.ts`/`engine.ts`. AC: property test over random action sequences never reaches an illegal step; `q < Q_min` always returns a tracked entity to FIX.

### TASK-P2-02 Designate, classify, assess UI (D, P0)
Files: `src/ui/EngagementPanel.tsx`, `src/store/sessionStore.ts`
- [ ] Kill-chain strip with elapsed ms, 7-class classifier with `c_cls` hint, BDA row. AC: hotkeys `Space`, `C`, `A` work; each action produces its event with `tRawMs` and quantised `tMs`.

### TASK-P2-03 Effector catalog, Pk and kill resolution (B, P0)
Files: `src/sim/effectors.ts`
- [ ] `Pk = Pk0 * g(R) * h(chaos)`; `g` = 1 on the middle 60% of the envelope, linear taper to 0 at edges; fog halves laser Pk; jamming zeroes soft-kill; RF-silent target Pk 0.1; swarm gun 0.35 per element. AC: table-driven tests for each effector at range min, plateau edge, plateau centre, max.
- [ ] Seeded `kill` stream draw logged as `ENGAGE_RESULT.u`. AC: same engagement order gives identical results; reordering engagements leaves the `sense` stream untouched.

### TASK-P2-04 ROE gating and live CER (B, D, P0)
Files: `src/sim/roe.ts`, `src/ui/EngagementPanel.tsx`
- [ ] Hard blocks vs soft gates per Rules.md SC-10; `ROE_VIOLATION` events; live CER with the amber/red thresholds and the `UNFAVOURABLE EXCHANGE` text. AC: missile on recon quad shows CER 75 and the flag; gun over U1 (rho 0.8) logs a violation and caps `G <= 40`; firing on UNK logs a violation.

### TASK-P2-05 Sensor Chaos Engine: FOG and JAMMING (A, P0)
Files: `src/sim/chaos.ts`, `src/ui/TopBar.tsx`
- [ ] Spec-driven onset/offset, sensor health pills change within 1 s, `CHAOS_ON/OFF` events, `SENSOR_SWITCH` tracking for SAL. AC (AC-4): validator test proves at least one sensor class is functional at every tick of DEMO-1 and 100 generated schedules.

### TASK-P2-06 RAIN and RADAR_DROPOUT (A, P1, cut line 1)
Files: `src/sim/chaos.ts`, `src/render/radarLayer.ts`
- [ ] `A_env` 0.6 with 1 to 3 transient false plots; dropout `A_env` 0. AC: false plots never become firm tracks (2-of-3 requirement fails by design).

### TASK-P2-07 Event recorder, snapshots, hot-wash (C, D, P0)
Files: `src/db/recorder.ts`, `src/ui/HotWash.tsx`
- [ ] Persist events (flush 1 s and at end), `SNAPSHOT` every 250 ms, `SESSION_END` with final metrics. AC: killing the tab at T+90 leaves a recoverable partial session flagged `INCOMPLETE`.
- [ ] Hot-wash card at session end: score, grade label, MET, MDT, accuracy, CER, collateral, leakers. AC: shown within 500 ms of `SESSION_END`.

### TASK-P2-08 Reactive triggers (A, C, P1)
Files: `src/sim/triggers.ts`
- [ ] Rules: `TRACK_NEUTRALISED` spawn wave, `MDT_EXCEEDS` spawn probe, `KINETIC_ON_BIRD` inject civil drone, `NO_SENSOR_SWITCH` extend chaos by 5 s. AC: each firing logs `TRIGGER` with the full spawned spec; `maxFires = 1` enforced; replay shows the same injection without the Director.

**Checkpoint H18:** full 120 s DEMO-1 from first plot to hot-wash, offline, with fog and jamming firing and a missile penalty visible.

---

## Phase 3: Scoring Math, Oracle Comparison and AAR Dashboard (H18 to H26)

### TASK-P3-01 Scoring engine (B, P0)
Files: `src/sim/scoring.ts`, `tests/unit/scoring.spec.ts`
- [ ] D, C (6x7 matrix), E_econ, E_time (`R_opt` = envelope midpoint), G, R, S, session score, grade (3 labels). AC (SC-15): boundary tests; AC-5 numbers reproduced (CER 75 gives 25; FPV 30 gives about 41); score never leaves [0,100].

### TASK-P3-02 Oracle (B, P0)
Files: `src/sim/oracle.ts`
- [ ] Cheapest admissible effector with `Pk_eff >= 0.6`, ROE-compliant, evaluated at the time of release and stored per track. AC: DEMO-1 H-1 oracle = RF soft-kill; swarm under jamming = gun or interceptor.

### TASK-P3-03 Metrics aggregation (B, P0)
Files: `src/sim/metrics.ts`
- [ ] Build `AARMetrics` from events only: MET, MDT, MCT, S2S, detToTrack, accuracy, coverage, recall, precision, CER, unfavourable count, collateral, ROE, leakers, SAL (event-duration fallback), SAT. AC: metrics computed from a stored session equal metrics computed live (golden).

### TASK-P3-04 AAR shell, scorecard and KPI tiles (D, P0)
Files: `src/ui/aar/Scorecard.tsx`, `src/ui/aar/KpiTiles.tsx`, `src/store/aarStore.ts`
- [ ] Layout per DESIGN.md 4 with grade badges. AC: MET displayed in ms with both quantised and raw input timing; delta vs previous session shown.

### TASK-P3-05 Timeline replay, event-sourced (D, B, P0)
Files: `src/ui/aar/Timeline.tsx`, `src/db/queries.ts`
- [ ] 120 s scrubber, 5 lanes, 1x/4x, step 50 ms, marker drawer with oracle comparison; replay from `events` + `SNAPSHOT` only. AC (DT-8): replay code path imports nothing from `director/` or `rng.ts`; scrubbing to T+57.0 shows the soft-kill marker; jump-to-time under 100 ms.

### TASK-P3-06 Confusion matrix 7x7 (D, P0)
Files: `src/ui/aar/ConfusionMatrix.tsx`
- [ ] Cost-weighted colours, UNKNOWN row hatched and zero. AC: matrix totals equal the number of tracks that existed.

### TASK-P3-07 Profile, EMA, difficulty and trend (C, D, P0)
Files: `src/db/queries.ts`, `src/director/profile.ts`, `src/ui/aar/TrendChart.tsx`
- [ ] EMA per SC-13, `d` update after TRAIN only, Chart.js trend with `d` overlay. AC: cold-start test (first sample seeds EMA; skipped metrics keep EMA); chart shows `d`.

### TASK-P3-08 TRAIN/EVAL modes and bench pack (C, P0)
Files: `src/director/bundled/eval-*.json`, `src/director/director.ts`, `src/ui/Login.tsx`
- [ ] 6 fixed EVAL scenarios (d 0.3, 0.5, 0.7 x 2), speed locked 1x, no adaptation. AC: two trainees receive identical EVAL specs; EVAL does not change `d` or EMA.

### TASK-P3-09 Unit table and JSON export/import (C, D, P0 table, P1 import/export)
Files: `src/ui/aar/UnitView.tsx`, `src/db/io.ts`
- [ ] Minimal unit table: trainee, latest EVAL score, highest TRAIN d (P0). Heatmap (P1, cut line 5). Export/import with checksum and dedupe by `uid` (P1, cut line 6). AC: importing the same file twice adds zero rows; a tampered checksum is rejected with a clear message; unit view uses EVAL only (AC-9).

### TASK-P3-10 Golden tests (B, A, P0)
Files: `tests/golden/replay.spec.ts`, `tests/golden/demo1.spec.ts`
- [ ] Re-simulate DEMO-1 from spec + input log fixture: identical event sequence and score within 1e-6 (AC-2, AC-8). AC: runs on the pinned Chromium in CI.

**Checkpoint H26:** AAR for 3 sessions of one trainee shows trends with `d`; unit table shows EVAL scores; golden tests green.

---

## Phase 4: Adaptive Red Team Generator and TRAIN/EVAL Modes (H26 to H31)

### TASK-P4-01 Generator and grammar (C, P1)
Files: `src/director/generator.ts`, `src/director/director.ts`
- [ ] Phases PROBE, DECOY-FLOOD, MAIN/SWARM via Poisson arrivals; path synthesis (Bezier jitter) for four profiles; decoy injection (birds, civil with Remote-ID probability `1 - 0.3 d`, friendly IFF); difficulty mapping (N = round(2+8d), decoy ratio 0.2+0.5d, RCS x(1-0.5d), T_budget x(1-0.4d), chaos rate x(1+2d)). AC: `generateScenario` is a pure function of `(traineeId, sessionIdx, d, W, history, nonce)`; same inputs give same spec.

### TASK-P4-02 Weakness profiling and lever sampling (C, P1)
Files: `src/director/levers.ts`, `src/director/profile.ts`
- [ ] `w_k = 1 - EMA_k/100`, softmax beta 4, 1 to 2 levers, reasons stored in `spec.levers`. AC: a synthetic profile with D EMA 30 and others 80 selects TERRAIN_HUG/small-RCS levers in more than 60% of 1,000 draws.

### TASK-P4-03 Fairness validator (C, P0 for TRAIN)
Files: `src/director/validate.ts`
- [ ] Three checks per ARCHITECTURE.md 5.1 (T_budget >= 6 s, admissible effector, sensing window W >= 6 s with `q >= Q_min`), ideal-operator simulation. AC (AC-10): 1,000 generated specs all pass; hand-built specs with a hostile masked from spawn to PNR are rejected.

### TASK-P4-04 Novelty filter (C, P1)
Files: `src/director/features.ts`, `src/director/novelty.ts`
- [ ] 33-dim vector, L2-normalised, max cosine against last 10 TRAIN specs < 0.85, 20 attempts, then 20 validated mutations, then bundled fallback flagged in AAR. AC (AC-6): 10 consecutive specs for one trainee are pairwise below 0.85.

### TASK-P4-05 Red Team plan and spider chart (D, P1)
Files: `src/ui/aar/RedTeamPlan.tsx`, `src/ui/aar/SkillSpider.tsx`
- [ ] Panel lists next-session levers with the weakness that triggered each; 6-axis Canvas spider. AC: plan shown on hot-wash and AAR matches the spec the next TRAIN session actually loads.

### TASK-P4-06 Bundled fallbacks (C, P0)
Files: `scripts/build-fallbacks.mjs`, `src/director/bundled/`
- [ ] Build step generates 12 validated fallbacks, plus DEMO-1, DEMO-2 (30 s, single recon quad), EVAL pack. AC: app plays every bundled spec; `validate()` passes all at build time.

### TASK-P4-07 Thompson-sampling levers (C, P2, only after AC-6 passes)
Files: `src/director/levers.ts`
- [ ] Beta posterior per lever for "lowers session score by >= 5 points"; softmax fallback until 3 sessions. AC: posteriors update after each TRAIN session; never run in EVAL.

**Checkpoint H31:** two consecutive TRAIN sessions differ visibly; Red Team plan names the lever; fallback loads when validation is forced to fail.

---

## Phase 5: Hardening, Golden Tests and Demo Rehearsal (H31 to H36)

Feature freeze at H31. Only fixes from here.

### TASK-P5-01 Performance pass (A, P0)
- [ ] Profile on the i3 / 4 GB laptop at 100 tracks. AC (AC-1): frame <= 16 ms p95, heap < 150 MB, cold start < 3 s, bundle < 8 MB; low-fidelity toggle (`L`) verified.

### TASK-P5-02 Air-gap proof (B, P0)
Files: `tests/e2e/airgap.spec.ts`
- [ ] Offline Playwright run of a full scenario. AC (AC-11, ZS-5): zero outgoing requests; CI fails on any.

### TASK-P5-03 Layout and resolution audit (D, P0)
- [ ] Screenshots at 1366x768, 1280x720, 1024x768. AC: no vertical overflow, event log and fire controls always visible.

### TASK-P5-04 Pre-loaded demo data (C, P0)
- [ ] Seed completed sessions (one TRAIN, three EVAL trainees) into Dexie on first run, plus exported JSON backup. AC: clearing browser storage then reloading restores demo data without network.

### TASK-P5-05 Rehearsal and backup (D, all, P0)
- [ ] Run the 3-minute script from MEMORY.md twice end to end; record a backup screen capture. AC: script completes in 3:00 +/- 15 s with no manual fixes.

### TASK-P5-06 Wording and label audit (D, P0)
- [ ] Grep UI and docs for banned strings (`MISSION-READY`, `REMEDIAL`, `certified`); verify footer disclaimer and notional labels; run a contrast check on palette pairs. AC: zero matches; all text pairs meet 4.5:1.

### TASK-P5-07 Judge one-pager (D, P1)
- [ ] One page: architecture diagram, metrics list, hardware profile, PS-26247 traceability. AC: fits A4, printable in monochrome.

**Final checkpoint H36:** clean build from a fresh clone on a second laptop, airplane mode, DEMO-1, DEMO-2, AAR, Red Team plan, unit view all working.
