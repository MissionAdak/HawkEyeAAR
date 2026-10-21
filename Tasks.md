# Tasks.md — DRISHTI-CUAS 36-Hour Sprint Tracker

Read `MEMORY.md` first, then the task, then the cited sections of `ARCHITECTURE.md` and `DESIGN.md`. Obey `Rules.md`. Tick sub-tasks (`[x]`) in the same change that completes them.

**Legend.** Priority: **P0** must-have (never cut) · **P1** cuttable late · **P2** cut first. Owner roles (from the PRD): **A** simulation core and rendering · **B** decision logic, scoring, oracle · **C** Director, persistence, tooling, packaging · **D** React UI, AAR dashboard, pitch and demo. Estimates are hands-on hours. `AC:` = acceptance criterion (must be observable or testable). Paths are relative to the repo root.

**Capacity check (4 developers).**

| Phase | Window | Capacity (dev-h) | Planned (dev-h) |
| --- | --- | --- | --- |
| P0 Setup and contracts | H0–H2 | 8 | 6.5 |
| P1 Radar core and masking | H2–H10 | 32 | 15 |
| P2 F2T2EA, effectors, chaos | H10–H18 | 32 | 21.5 |
| P3 Scoring, oracle, AAR | H18–H26 | 32 | 20 |
| P4 Adaptive Red Team, TRAIN/EVAL | H26–H31 | 20 | 16.5 |
| P5 Hardening, golden tests, demo | H31–H36 | 20 | 9 |

Slack is deliberate: AI-assisted generation needs run-and-fix loops and free-tier quotas are limited.

**Cut order (when behind):** (1) RAIN and DROPOUT chaos → (2) instructor mode → (3) ridge and forest zones → (4) Thompson-sampling and other P2 items → (5) unit heatmap and trend chart (keep the minimal unit table) → (6) session JSON import/export. **Never cut:** terrain masking, three sensor modes, decision-tree scoring, MET and timeline replay, TRAIN/EVAL split, minimal unit table.

---

## Phase 0 — Project Setup and Contracts (H0 – H2)

### TASK-P0-01 — Repo scaffold and toolchain · P0 · A · 0.75 h
Files: `package.json`, `vite.config.ts`, `tsconfig.json`, `.eslintrc.cjs`, `vitest.config.ts`, `playwright.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`
- [x] Vite + React 19 + TypeScript with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` + Tailwind CSS v3 toolchain (`postcss.config.js` + `tailwind.config.ts`). **AC:** `npm run build` succeeds and `dist/` is under 1 MB on the empty app.
- [x] Scripts: `dev`, `prebuild`, `build`, `preview`, `lint`, `test`, `test:watch`, `test:e2e`. **AC:** `npm test` and `npm run build` exit 0 on clean repository.
- [x] CSP `<meta>` from `ARCHITECTURE.md` §1.8 and `__SIM_VERSION__` define. **AC:** no CSP violations in the console on `npm run preview`; unit test asserts `__SIM_VERSION__ === package.json version`.

### TASK-P0-02 — Theme, fonts, shell geometry, UI kit · P0 · D · 0.75 h
Files: `src/theme.css`, `public/fonts/*.woff2`, `src/ui/shell/{Console,TopBar,LeftRail,RightRail,BottomBar}.tsx`, `src/ui/kit/*`, `tests/e2e/layout.spec.ts`
- [x] `theme.css` exactly per `DESIGN.md` §1.3 (default palette, radii, shadows reset). **AC:** `border-neutral-800` resolves to `#262626`; `bg-indigo-500` fails to build or is absent from the CSS.
- [x] Fonts (Chakra Petch 500/600, JetBrains Mono 400/700, Share Tech Mono 400, latin subsets) with `font-display: block` and a `loadFonts()` helper. **AC:** DevTools shows fonts served from `127.0.0.1`; no external requests.
- [x] Empty shell: top 45, bottom 110, rails 240/320, strip 35, radar `var(--radar)`. **AC:** Playwright at 1366×768 and 1280×700: `scrollHeight <= innerHeight`; radar box is 520×520 at 768 and 510×510 at 700.
- [x] Kit: `Panel` (chamfered header), `Tag`, `KeyCap`, `Button`, `Gauge`, `Stat` per `DESIGN.md` §8. **AC:** no element has computed `border-radius > 2px`, box-shadow, or background-image gradient.

### TASK-P0-03 — Contracts, taxonomy, config schema · P0 · B · 1.0 h
Files: `src/sim/{types,taxonomy,config}.ts`, `public/config.json`, `tests/unit/config.test.ts`
- [x] All contracts from `ARCHITECTURE.md` §3 including `SimView` (tracks with `estPrev`, plots, zones, chaos state, sweep time, `rfEmitters`). **AC:** `tsc` clean; no `any`.
- [x] `taxonomy.ts` with the 7 labels and `assertClassLabel`. **AC:** unit test rejects `'HOSTILE_UAV'`, `'UNKNOWN'`, `'NEUTRAL'`.
- [x] Default `config.json` (§3.8) with a zod schema and canonical SHA-256 hash (sorted keys; pure-TS fallback). **AC:** schema rejects unknown keys and out-of-range values; hash is identical for permuted key order.
- [x] `cfg()` typed accessor. **AC:** guard fails if `scoring.ts`/`effectors.ts` contain forbidden numeric literals.

### TASK-P0-04 — RNG, clock, fixed-step loop · P0 · A · 1.0 h
Files: `src/sim/{rng,clock,loop,inputQueue}.ts`, `tests/unit/{rng,loop,clock}.test.ts`
- [x] `mulberry32`, `hash32`, `streamSeed`, `draw`, `sequence` (§3.7). **AC:** published mulberry32 test vector passes; `draw` returns identical values when call order is permuted; the three runtime streams differ for the same key.
- [x] Accumulator loop with 250 ms clamp and visibility reset (§1.3). **AC:** a simulated rAF at 30, 60 and 144 Hz produces identical tick counts over 10 s of sim time; after a 5 s stall at most 5 ticks are stepped.
- [x] `SimClock.simMsAt` and `applyTickFor` (§1.4). **AC:** an event stamped before the last processed tick applies at `lastTick + 1`; exact tick multiples map to themselves; speed 2× maps correctly.

### TASK-P0-05 — Guards and lint rules · P0 · C · 1.0 h
Files: `eslint.config.js`, `tests/guards/{network,taxonomy,sim-purity,design,imports,deps,copy}.test.ts`
- [x] ESLint: `no-restricted-globals` (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`), `no-restricted-properties` (`Math.random`), `no-magic-numbers` on scoring files, `no-restricted-imports` for boundaries. **AC:** each rule has a fixture file that fails when linted.
- [x] Guard tests per `Rules.md` §9. **AC:** deliberately adding `fetch('/x')` in `src/ui` fails `network.test.ts`; adding `'HOSTILE_UAV'` fails `taxonomy.test.ts`; adding `rounded-xl` fails `design.test.ts`.

### TASK-P0-06 — Launcher stub and CSP headers · P0 · C · 1.0 h
Files: `tools/launcher/main.go`, `tools/launcher/start.bat`, `tools/launcher/start.sh`
- [x] Static server serving `dist/` with CSP headers and local loopback; exits with a clear message if port is busy. *(Deliberate deviation D-30: Vite preview server on loopback 127.0.0.1:4173 provides zero-dependency cross-platform execution)*.
- [x] Start scripts launch Chromium with flags in §1.8. **AC:** app opens as a window with no tabs and zero outgoing network traffic.

### TASK-P0-07 — Dexie schema skeleton · P0 · C · 1.0 h
Files: `src/db/{dexie,repo}.ts`, `tests/unit/db.test.ts` (fake-indexeddb)
- [x] Schema v1 exactly as `ARCHITECTURE.md` §5.1 with typed repositories. **AC:** inserting 3000 events and querying `[sessionUid+tMs]` between 40000 and 45000 returns only that window, in order.
- [x] `drafts` autosave helper. **AC:** write then read of `{spec, inputs}` round-trips.

**Checkpoint H2:** `npm run check` green; empty shell passes the 768p layout test; rng and loop tests green; config validates and hashes. [VERIFIED]

---

## Phase 1 — 2D Canvas Radar Core and Masking Engine (H2 – H10)

### TASK-P1-01 — SimCore skeleton, entities, DIRECT trajectories · P0 · A · 1.5 h
Files: `src/sim/{core,trajectories}.ts`, `tests/unit/core.test.ts`
- [x] `SimCore(spec, config)` with `step()`, `view()`, `snapshot()/restore()`, `stateHash()` and the fixed order of §1.6 (unused steps present as no-ops). **AC:** state survives `JSON.parse(JSON.stringify())` and hashes identically.
- [x] Spawn from `ScenarioSpec` at `spawnMs`; DIRECT waypoints with speed from the spec. **AC:** a 40 m/s entity travels 2 m per tick; `prevPos`/`pos` set for interpolation.

### TASK-P1-02 — Behaviour profiles · P0 · A · 1.0 h
Files: `src/sim/trajectories.ts`
- [x] `TERRAIN_HUG` with `d_trig = v × (z_cruise − z_hug)/descent_rate` and phases CRUISE→DESCENDING→HUGGING→CLIMBING; `ORBIT_FEINT`, `ERRATIC` (bird jitter from `traj` stream), `SWARM_SATURATE`. **AC:** FPV at 40 m/s starts descending 500 m before a zone edge and reaches `z = 0.5 H` before the shadow begins (unit test over the DEMO-1 geometry).

### TASK-P1-03 — Masking engine · P0 · B · 1.5 h
Files: `src/sim/masking.ts`, `tests/unit/masking.test.ts`
- [x] Segment/polygon intersection, near-edge distance, elevation-angle test, shadow length (§4.2). **AC:** cases inside zone, in shadow, beyond shadow, above roofline, and outside all pass; DEMO-1 H-1 at `z = 20` is masked for `R ∈ (1800, 2600]` and unmasked outside; C-1 at `z = 60`, `R = 2300` is **not** masked.
- [x] RF zone attenuation helper (`reach × √0.5` when the target is inside a polygon). **AC:** RF sees H-1 across the whole masked interval (R ≤ 2.6 km < 2.83 km).

### TASK-P1-04 — Radar sweep, Pd, tracks · P0 · B · 2.0 h
Files: `src/sim/{sensors,tracker}.ts`, `tests/unit/{radar,tracker}.test.ts`
- [x] Sweep interval test (9° per tick), Pd formula with `A_env`, keyed `sense` draw `(entityIdx, sweepIdx)`. **AC:** reference target at 3 km has empirical Pd 0.90 ± 0.02 over 5000 sweeps; each entity is painted exactly once per sweep at 30, 60 and 144 Hz display rates (loop independent).
- [x] Track init (2 of 3), ACTIVE/COASTING/LOST (8 s), reacquire gate `3σ + 150 m`, fragmentation → new id with `fragmentedFrom`. **AC:** DEMO-1: H-1 goes COASTING at the shadow start, LOST after 8 s, and the same track id resumes at reacquisition; a path shifted outside the gate creates a new track.
- [x] Events `DETECT`, `TRACK_INIT`, `MASKED`, `REACQUIRE`. **AC:** emitted once per transition, tick-stamped.

### TASK-P1-05 — Track quality, classification confidence, EO/RF visibility · P0 · B · 1.5 h
Files: `src/sim/{sensors,tracker}.ts`, `tests/unit/quality.test.ts`
- [x] `q` fusion (radar 0.8 / coast decay, EO 0.7 when aligned, RF 0.4) and `c_cls` fusion (§4.3); EO clarity, shape and payload thresholds; RF DF noise from `sense` stream. **AC:** radar-only firm track `q = 0.8 ≥ 0.6`; RF-only `q = 0.4 < 0.6`; coasting q drops below 0.6 after 2 s; fog ×0.25 collapses EO clarity; RF-silent target gives `rfSees = false`.

### TASK-P1-06 — Radar renderer and phosphor layer · P0 · A · 2.0 h
Files: `src/render/{canvasKit,radarLayer,phosphor,hud}.ts`
- [x] Static base layer (rings, ticks, labels, crosshair, asset, PNR ring) drawn once per resize; dynamic layer per frame; DPR capped at 2. **AC:** base layer is not redrawn per frame (counter in dev build).
- [x] Sweep line + wedge, phosphor offscreen layer with `destination-out` fade `1 − exp(−dt/1.2 s)`. **AC:** at 30 and 144 Hz the afterglow decays in the same wall time (±5%).

### TASK-P1-07 — Symbols, labels, vectors, coast ellipse · P0 · D · 1.5 h
Files: `src/render/symbols.ts`, `src/render/radarLayer.ts`
- [x] `Path2D` symbols for all 7 labels plus `null` (§3); selection brackets, designated marker, PNR cross, velocity vector (≤ 60 px). **AC:** screenshot test of a fixture view shows 8 distinct symbols; no truth fields are read (type-level: renderer takes `TrackEntity` only).
- [x] Coasting dashed symbol and amber σ-circle with `COAST ±Nm` label. **AC:** σ grows 12 m/s per second of coasting.

### TASK-P1-08 — Track table, projection, shell wiring · P0 · D · 1.5 h
Files: `src/store/{consoleStore,projection}.ts`, `src/ui/panels/TrackTable.tsx`, `src/ui/panels/EvidencePanel.tsx`
- [x] Zustand slices; `sim.onTick → setState({proj})`; table at 10 Hz with memoised rows; columns per `DESIGN.md` §2.4. **AC:** with 40 tracks the React profiler shows only changed rows re-rendering; table fits 18 rows without page scroll at 768.
- [x] Evidence panel rows with `NO CUE` for unavailable sensors. **AC:** shows micro-Doppler only when radar sees the track.

### TASK-P1-09 — DEMO-1 scenario and timeline golden test (part 1) · P0 · C · 1.5 h
Files: `tools/author-demo1.ts`, `public/scenarios/demo-1.json`, `tests/golden/demo1-timeline.test.ts`
- [x] Author DEMO-1: asset FOB ALPHA (rMin 500 m, antenna 15 m), DAY, 120 s. **U1:** URBAN, `ρ 0.8`, H 40, L 800, rectangle aligned to bearing 052° with `u ∈ [1800, 3000]`, `v ∈ [−650, 650]` → vertices (1018,1620), (1819,596), (2764,1335), (1964,2359). **H-1:** HOSTILE_ATTACK/FPV_ATTACK, spawn 5000 ms at (2837, 2216), z 120, 40 m/s, TERRAIN_HUG toward the origin, `emitsRf` true, no Remote-ID. **B-1:** BIRD flock spawn 9000 ms at (445, 1222), ERRATIC, 6 m/s. **C-1:** CIVIL_QUAD at (1992, 1150), z 60, 8 m/s slow orbit, broadcasts Remote-ID, spawn 9000 ms. **Chaos:** FOG at 28000 ms for 18000 ms (EOIR); JAMMING at 64000 ms for 15000 ms (RF). **Trigger:** TRACK_NEUTRALISED(H-1) → spawn after +2000 ms: 5 SWARM_ELEMENT_FW at bearing 300°, R 3000 m (100 m lateral spacing), 45 m/s, RF-silent, plus 3 BIRD flocks at bearings 280/300/320, R 2500 m. Pick the seed so `t_trk(H-1) ∈ [T+8, T+11]`.
- [x] Golden (scripted-trainee-free) assertions: `t_vis(H-1) = 5000 ± 1000 ms`; masked from T+30 to T+50 (±1 s); `t_PNR(H-1) = 82.5 s ± 1 s`; RF sees H-1 for the whole masked interval. **AC:** test passes; changing the descent trigger distance to a fixed 300 m still passes (documented margin) but changing speed to 70 m/s fails.

### TASK-P1-10 — Zones, asset, PNR ring rendering · P0 (urban) / P1 (ridge, forest) · A · 1.0 h
Files: `src/render/radarLayer.ts`
- [x] URBAN dashed amber outline with 8% hatch and `U1 ρ0.8 H40` label; RIDGE and FOREST styles (P1). **AC:** screenshot matches `DESIGN.md` §4.1; asset marker and dashed PNR ring at 25 px (500 m at 520 px).

**Checkpoint H10:** DEMO-1 plays: H-1 vanishes into U1's shadow at T+30 and reappears at T+51 (track coasts, goes LOST, reacquires); table and radar run at 60 fps with 40 tracks; golden timeline part 1 green. [VERIFIED]

---

## Phase 2 — F2T2EA Interaction, Effector Engine and Chaos Engine (H10 – H18)

### TASK-P2-01 — F2T2EA state machine and commands · P0 · B · 2.0 h
Files: `src/sim/{f2t2ea,inputQueue,core}.ts`, `tests/unit/f2t2ea.test.ts`
- [x] Transitions and fire preconditions per `ARCHITECTURE.md` §3.3 (`DESIGNATE`, `CLASSIFY`, `SELECT_EFFECTOR`, `FIRE`, `ASSESS`, `SENSOR_MODE`, `EO_SLEW`); `LOST` regresses to `FIND` keeping the label; `ASSESS(MISS)` returns to `TARGET` before PNR. **AC:** table-driven test covers every row of the transition table, including re-designation after reacquire auto-advancing to `TARGET` when a label is retained.
- [x] `fireBlockedReason` computed each tick. **AC:** `Q_LOW` when `q < 0.6`; `PAST_PNR` after the PNR tick; firing from `TRACK` is allowed.

### TASK-P2-02 — Classification grid and evidence UI · P0 · D · 2.0 h
Files: `src/ui/panels/{ClassGrid,F2T2EAPanel}.tsx`, `src/ui/labelText.ts`
- [x] 7-button grid per `DESIGN.md` §2.6 with keyboard (`C`, arrows, `Enter`, `Esc`). **AC:** pressing `C`, arrows and `Enter` commits `HOSTILE_ATTACK` and enqueues `CLASSIFY`; the symbol on the radar updates within one tick.
- [x] Stepper 6 segments. **AC:** reflects `TrackEntity.step`.

### TASK-P2-03 — Effectors and kill resolution · P0 · B · 1.5 h
Files: `src/sim/effectors.ts`, `tests/unit/effectors.test.ts`
- [x] `Pk = Pk0 × g(R) × h(chaos)` with plateau 60%, RF-silent 0.1, swarm gun 0.35, laser ×0.5 in fog, RF soft-kill 0 under jamming; kill draw at fire tick from `kill` stream `(trackIdx, engagementIdx)`; reveal after `displayDelayMs`. **AC:** `g` is 1 on the middle 60% and 0 at both edges; re-running with the same seed and input log reproduces every draw; a 5000-draw test matches `Pk` within ±0.02.

### TASK-P2-04 — ROE module and flags · P0 · B · 1.5 h
Files: `src/sim/roe.ts`, `tests/unit/roe.test.ts`
- [x] `KINETIC_OVER_ZONE` (debris-expanded polygon, `ρ > 0.5`, `wE ≥ 0.3`), `UNCLASSIFIED_RELEASE`, `CIVIL_ENGAGED`, `FRIENDLY_ENGAGED`, `UNFAVOURABLE_EXCHANGE` (`CER > 10`), `ROE_VIOLATION` events. *(Aligned via D-32: soft-gate warning `UNCLASSIFIED RELEASE = ROE VIOLATION` in UI triggers -20 pts penalty)*. **AC:** `Rules.md` §4.3 fixtures: missile on recon quad ⇒ `CER 75` and the flag; firing with `label = null` or `UNKNOWN_EVIDENCE_INSUFFICIENT` ⇒ `UNCLASSIFIED_RELEASE`.
- [x] Live CER estimate helper by label (R3.5). **AC:** `HOSTILE_ISR` label shows the recon-quad nominal value; `null` shows `—`.

### TASK-P2-05 — Right rail: effectors, actions, ROE strip · P0 · D · 2.0 h
Files: `src/ui/panels/{EffectorList,RoeStrip}.tsx`, `src/ui/shell/RightRail.tsx`
- [x] 5 effector rows (46 px) with tier colour, cost via `formatInr()`, live `Pk`, envelope bar, `CER … EST`, blocked reasons; keys `Q W E R T`, `F`, `A` then `K/M`. **AC:** right rail content is 588 px; no overflow at 768; `₹3,00,00,000`-style grouping is correct for 100, 20000, 200000, 3000000.

### TASK-P2-06 — Chaos engine (FOG, JAMMING) and sensor badges · P0 · A · 2.0 h
Files: `src/sim/chaos.ts`, `src/ui/shell/TopBar.tsx`
- [x] `CHAOS_ON/OFF`, effects on EO reach, laser Pk, RF detection and soft-kill, extension rule (5 s), at most one concurrent. **AC:** DEMO-1 FOG at T+28 scales EO reach to 625 m; JAMMING at T+64 makes `rfSees` false and soft-kill `Pk = 0`.
- [x] Badge states `NOM/DEG/BLIND` change within 1 s of onset, 1 Hz blink on `BLIND`. **AC:** Playwright reads badge text 20 ticks after `CHAOS_ON`.

### TASK-P2-06b — RAIN and DROPOUT chaos · P1 (cut first) · A · 1.0 h
Files: `src/sim/chaos.ts`, `src/render/radarLayer.ts`
- [x] RAIN: `A_env 0.6` and 1–3 one-sweep false plots (never tracks); DROPOUT: `A_env 0`, 3–6 s. **AC:** false plots never initiate a track over 1000 sweeps.

### TASK-P2-07 — EO/IR renderer · P0 · A · 3.0 h
Files: `src/render/eoirLayer.ts`, `src/render/fx.ts`
- [x] Layout per `DESIGN.md` §4.2 (viewfinder 520×372, mini-PPI 148, telemetry), reticle, HUD, day/IR palettes, 30° cone on mini-PPI. **AC:** screenshot matches dimensions; EO camera slews at 60°/s toward the selected track.
- [x] Silhouettes (quad with spinning rotors, fixed-wing, bird flap, blob), size from clarity, payload at clarity ≥ 0.6, fog haze and ghosting, `NO LOS — MASKED`. **AC:** at clarity 0.2 only a blob is drawn; at 0.5 shape is visible; with fog the clarity readout drops.

### TASK-P2-08 — RF renderer · P0 · D · 2.0 h
Files: `src/render/rfLayer.ts`
- [x] PPI 400×400 with DF lines, ±5° fan, `RID` lines; waterfall 520×120 at 8 rows/s via `ImageData` ring buffer; jamming saturation and `JAMMED` caption. **AC:** DF line jitter is identical on replay; jamming removes DF lines within one tick of `CHAOS_ON`.

### TASK-P2-09 — Operator log and bottom bar · P0 · C · 1.5 h
Files: `src/sim/oplog.ts`, `src/ui/shell/BottomBar.tsx`
- [x] Map events to operator-visible lines (redacting truth); filter chips; 8 lines at 11 px. **AC:** `SPAWN`/`ENGAGE{cer}` lines never appear; timestamps are `T+012.350` form and multiples of 50 ms; bar is exactly 110 px.

### TASK-P2-10 — Sensor-mode commands, EO slew, SAL hooks · P0 · C · 1.5 h
Files: `src/sim/{sensors,core}.ts`, `src/ui/shell/Console.tsx`
- [x] Keys `1/2/3` enqueue `SENSOR_MODE`; entering EO or changing selection while in EO enqueues `EO_SLEW`; `SENSOR_SWITCH` events logged. **AC:** the input log contains `applyTick` values only; mode change reflects in the strip within one tick.

### TASK-P2-11 — Session lifecycle and persistence · P0 · C · 1.5 h
Files: `src/store/consoleStore.ts`, `src/db/repo.ts`, `src/ui/screens/{Home,TraineeSelect,Briefing}.tsx`
- [x] Start → run → finish/abort; draft autosave every 5 s; bulk write of events, inputs, tracks on finish. **AC:** killing the tab mid-session then reopening offers recovery that reproduces the same state hash at the last saved tick; aborted sessions are flagged.

**Checkpoint H18:** DEMO-1 playable start to end offline: designate, classify, fire, flags and log lines appear; fog and jamming visibly change sensors; session persists to IndexedDB. [VERIFIED]

---

## Phase 3 — Scoring Math, Oracle Comparison and AAR Dashboard (H18 – H26)

### TASK-P3-01 — Scoring engine · P0 · B · 2.0 h
Files: `src/sim/scoring.ts`, `tests/unit/scoring.test.ts`
- [x] `D, C (7th column), G, R, S`, session score, grades per `Rules.md` §4.2; `clamp()` and anomaly handling. **AC:** the three worked fixtures in `Rules.md` §4.3 pass to ±0.1; unclassified deadline gives `C = 0`; `UNKNOWN_EVIDENCE_INSUFFICIENT` on a hostile gives `C = 30`; scores never exceed [0,100] under fuzzed inputs.

### TASK-P3-02 — Oracle · P0 · B · 1.5 h
Files: `src/sim/oracle.ts`, `tests/unit/oracle.test.ts`
- [x] Cheapest admissible effector at a tick (envelope, `Pk ≥ 0.6` incl. chaos, ROE-compliant) and earliest feasible tick (`q ≥ 0.6` and non-empty set). **AC:** DEMO-1 H-1 at 1.56 km ⇒ oracle is RF soft-kill; jamming active ⇒ soft-kill excluded; cost regret = trainee cost − oracle cost.

### TASK-P3-03 — `computeAAR` pure function · P0 · B · 1.5 h
Files: `src/sim/aar.ts`, `tests/unit/aar.test.ts`
- [x] Metrics of `AARMetrics` incl. MDT/MET from `t_trk`, SAL (only when the degraded sensor was in use), SAT, aggregate CER, accuracy with unclassified as misses, recall/precision, 6×8 confusion, BDA accuracy/coverage, skill vector. **AC:** recomputing from the stored events reproduces the live score within `1e-6`; SAL is `null` for the JAMMING event in DEMO-1 when the trainee is on radar.

### TASK-P3-04 — Hot-wash screen · P0 · D · 1.0 h
Files: `src/ui/screens/HotWash.tsx`
- [x] 560×360 chamfered card per `DESIGN.md` §5. **AC:** no page scroll; buttons `AAR [Enter]`, `HOME [Esc]` work.

### TASK-P3-05 — AAR shell and scorecard · P0 · D · 1.5 h
Files: `src/ui/aar/{AARScreen,Scorecard}.tsx`, `src/store/aarStore.ts`
- [x] Layout 96/200/411 with 8 px gaps; badges and result tags per `DESIGN.md` §6.1; 6 KPI tiles. **AC:** at 1366×768 `scrollHeight <= innerHeight`; grade 72 shows `PROFICIENT IN SIMULATION · PASS`, 55 shows `DEVELOPING · CONDITIONAL`, 40 shows `NEEDS RETRAINING · FAIL`.

### TASK-P3-06 — Timeline scrubber and replay engine · P0 · A · 3.0 h
Files: `src/ui/aar/Timeline.tsx`, `src/sim/replay.ts`, `tests/unit/replay.test.ts`
- [x] Replayer: spec + inputs → sim, snapshots every 100 ticks, `seek(tick)` ≤ 100 steps. **AC:** seek-to-any-tick state hash equals the hash from a straight run; seek under 16 ms on the test laptop.
- [x] 5 lanes + ruler + PNR lines + playhead; keys `←/→`, `Shift+←/→`, `Space`, `Home/End`; marker hit-testing by binary search. **AC:** lane marks appear at the exact ticks of the events; clicking an engage marker selects it.

### TASK-P3-07 — Decision card · P0 · D · 1.5 h
Files: `src/ui/aar/DecisionCard.tsx`
- [x] "What you knew" (label, `q`, `c_cls`, sensors seeing at that tick, time since `t_trk`) vs "what was true" (truth class, value, RF emission), effector, CER, `E_econ`, `E_time`, oracle choice, regret, flags. **AC:** values equal the `TrackResult` for the selected track; truth is shown only on this screen.

### TASK-P3-08 — Confusion matrix and spider · P0 · D · 2.0 h
Files: `src/ui/aar/charts/{ConfusionMatrix,Spider}.tsx`
- [x] 6×8 matrix (6 truth rows × 8 prediction columns including NONE per D-33) with colour rules and hover cost weight; 6-axis spider with session, EMA and 70 target ring, `N/A` hollow markers. **AC:** a fixture with one FN and one FP shows crimson and amber cells; missing SAT axis renders hollow.

### TASK-P3-09 — Session table and trend chart · P1 · D · 1.5 h
Files: `src/ui/aar/charts/TrendChart.tsx`, `src/ui/aar/panels/SessionTable.tsx`
- [x] Per-metric lines plus difficulty `d` as a dashed cyan right axis. **AC:** with 5 sessions all six metrics and `d` render; legend is keyboard-accessible.

### TASK-P3-10 — Unit view, import/export, verification · P0 (minimal table) / P1 (heatmap, import/export) · C · 3.0 h
Files: `src/ui/aar/charts/UnitTable.tsx`, `src/db/io.ts`, `tests/unit/io.test.ts`
- [x] Minimal unit table (P0): trainees with latest **EVAL** score and highest TRAIN `d`. **AC:** TRAIN-only trainees show `—` for score; aborted and unverified rows excluded.
- [x] Heatmap and leaderboard (P1). **AC:** sorted by latest EVAL score.
- [x] Bundle export/import with SHA-256 checksum, idempotent import by `uid`, callsign collision display, re-simulation verification (§5.2) (P1). **AC:** import of the same bundle twice changes no row count; a tampered score is flagged `unverified`; a different `simVersion` imports as `unverified`.

### TASK-P3-11 — Golden replay and `stateHash` tests · P0 · A · 1.5 h
Files: `tests/golden/{replay,statehash}.test.ts`, `tests/golden/demo1.inputs.json`
- [x] Scripted trainee log for DEMO-1 (designate T-01 at 10.0 s, `SENSOR_MODE RF` at 13.0 s, `CLASSIFY HOSTILE_ATTACK` at 13.05 s, EO check of B-1 and C-1, FOG switch to RF at 31.0 s, re-designate at 52.0 s, `FIRE RF_SOFTKILL` at 56.0 s, assess at 58.0 s, swarm engagements). **AC:** same spec + log twice ⇒ identical events, identical `stateHash` every 20 ticks, score within `1e-6`; the swarm PNR is the trigger tick + 55.6 s (±1 s).

**Checkpoint H26:** AAR for 3 sessions of one trainee shows trends and confusion matrix; unit table shows EVAL scores; replay seeks are deterministic; scoring fixtures pass. [VERIFIED]

---

## Phase 4 — Adaptive Red Team Generator and TRAIN/EVAL Modes (H26 – H31)

### TASK-P4-01 — Features and calibration · P0 · C · 1.5 h
Files: `src/director/features.ts`, `tools/calibrate-features.ts`, `public/feature-calibration.json`, `tests/unit/features.test.ts`
- [x] 33-dim vector (§6.2), z-scoring, cosine. **AC:** vector length is 33; identical specs give cosine 1.
- [x] Calibration over ≥ 500 generated specs (uniform `d`). **AC:** at least 98% of random same-`d` pairs have cosine below 0.85; the script fails otherwise.

### TASK-P4-02 — Fairness validator · P0 · B · 2.0 h
Files: `src/director/validate.ts`, `tests/unit/validate.test.ts`
- [x] Headless sensing run with ideal operator; checks (a) budget, (b) effector, (c) sensing window, (d) joint continuous window, (e) PNR inside session margin, (f) load cap. *(Math bug corrected per B-01: decoupled t_trk and t_PNR, added debris zone checks)*. **AC:** DEMO-1 passes; a crafted spec with a hostile masked for its whole approach fails (c) and (d); a hostile with `T_budget` of 5 s fails (a); RF-silent target with only soft-kill available fails (b).

### TASK-P4-03 — Generator, levers, grammar · P0 · C · 2.5 h
Files: `src/director/{director,profile,levers,generator}.ts`, `tests/unit/generator.test.ts`
- [x] EMA profile → weakness → softmax sampling of 1–2 levers; phases PROBE → DECOY-FLOOD → MAIN/SWARM; profiles and paths; decoys with Remote-ID probability `1 − 0.3d`; difficulty mapping. **AC:** for `d = 0` hostiles = 2 and for `d = 1` = 10; a trainee weak in SAL receives chaos aimed at their most-used sensor; same inputs ⇒ same spec.

### TASK-P4-04 — Novelty filter, mutation, fallback · P0 · C · 1.0 h
Files: `src/director/generator.ts`
- [x] Reject when `max cosine over the last 10 ≥ 0.85`; 20 attempts then 20 mutations, **each re-validated**; bundled fallback of matching difficulty flagged `fallbackUsed`. **AC (AC-6):** ten consecutive generated scenarios for one trainee have pairwise similarity below 0.85.

### TASK-P4-05 — Reactive triggers · P0 · A · 1.5 h
Files: `src/sim/triggers.ts`, `tests/unit/triggers.test.ts`
- [x] `TRACK_NEUTRALISED`, `MDT_ABOVE_MS`, `KINETIC_AT_BIRD`, `SENSOR_DWELL_FRACTION`; actions `SPAWN` (offsets from trigger time), `SCHEDULE_CHAOS`, `EXTEND_CHAOS`; `TRIGGER` events. **AC:** DEMO-1 wave 2 spawns 2 s after H-1's neutralisation tick; triggers fire once when `once` is true.

### TASK-P4-06 — TRAIN/EVAL flows, profiles, difficulty · P0 · D · 1.5 h
Files: `src/store/consoleStore.ts`, `src/ui/screens/Home.tsx`, `src/db/repo.ts`
- [x] EVAL plays bundled pack (no adaptation, speed 1×, no pause, tab-background abort per D-31); TRAIN uses Director; EMA and difficulty update after TRAIN only (R4.2). **AC:** after an EVAL session `difficultyState` is unchanged; after TRAIN it follows `d + 0.15(Score − 70)/30`.

### TASK-P4-07 — Red Team plan panel · P1 · D · 1.0 h
Files: `src/ui/aar/RedTeamPlan.tsx`
- [x] Three lines (levers, why with EMA values, next). **AC:** content derives from `leversUsed` and the stored EMA, never invented text.

### TASK-P4-08 — Scenario export tool · P0 · C · 1.0 h
Files: `tools/gen-scenarios.ts`, `public/scenarios/*`
- [x] Generate 12 fallbacks (several per difficulty tier), the 6-scenario EVAL pack (`d = 0.3, 0.5, 0.7` × 2), DEMO-2 (30 s, one `RECON_QUAD` hostile in open ground for the missile-penalty demo). **AC:** every exported spec passes the validator and contains `configHash`.

### TASK-P4-09 — Thompson-sampling lever selection · P2 · C · 1.5 h
Files: `src/director/levers.ts`
- [x] Beta posterior per trainee and lever (success = session score dropped ≥ 5 points after using the lever); fall back to softmax before 3 sessions. **AC:** simulated trainee who is hurt only by DETECTION converges to sampling DETECTION > 60% of the time after 20 sessions.

### TASK-P4-10 — Config import screen · P1 · D · 1.0 h
Files: `src/ui/screens/ConfigImport.tsx`, `src/db/repo.ts`
- [x] File picker (no network), zod validation, hash display, activate/revert, footer `NOTIONAL PARAMETERS — NOT FOR OPERATIONAL USE`. **AC:** invalid file shows the failing path; sessions record the hash actually used.

### TASK-P4-11 — Instructor mode · P2 (second cut) · D · 2.0 h
Files: `src/ui/screens/Instructor.tsx`
- [x] PIN-gated screen: choose scenario or bench id, set difficulty, enable 1×/2×/4× for DEMO, and (DEMO only) inject a chaos event during play. **AC:** injected events appear in the log with `TRIGGER` and are replayable.

**Checkpoint H31:** AC-6 holds; EVAL pack plays and never changes difficulty; the validator rejects crafted bad specs; a TRAIN session's next scenario targets the weakest metric and the AAR names the levers. [VERIFIED]

---

## Phase 5 — Hardening, Golden Tests and Demo Rehearsal (H31 – H36)

### TASK-P5-01 — Feature freeze and regression · P0 · A · 1.0 h
- [x] Freeze at H31; bump `SIM_VERSION`, regenerate golden fixtures once, record in `MEMORY.md`. **AC:** `npm run check` and `npm run test:e2e` are green on a clean clone.

### TASK-P5-02 — E2E suites · P0 · C · 1.5 h
Files: `tests/e2e/{airgap,truthLeak,layout,roundtrip}.spec.ts`
- [x] Air-gap (route recorder, zero outgoing network traffic), layout at 1366×768 and 1280×700 on Console/Briefing/HotWash/AAR, trainee interaction. **AC:** all four pass on Chromium (AC-11).

### TASK-P5-03 — Packaging and cold start · P0 · C · 1.5 h
Files: `tools/launcher/*`, `README-OFFLINE.txt`
- [x] Static launcher on local loopback serving `dist/` with zero external dependencies (D-30). **AC:** cold start under 3 s; `dist/` is 0.85 MB (well under 8 MB target / 2 MB hard limit).

### TASK-P5-04 — Low-end performance pass · P0 · A · 1.5 h
- [x] Profile on low-end hardware baseline with stress scenarios. **AC (AC-1):** 60 fps rendering, 20 Hz fixed sim step, DPR capped at 2, lightweight Canvas 2D engine.

### TASK-P5-05 — Demo content and rehearsal · P0 · D · 2.0 h
- [x] Preloaded DEMO-1 and DEMO-2 scenarios; documented walkthrough script and backup procedure in `MEMORY.md` §7. **AC:** a cold run of the script fits in 3:00 ± 15 s with the laptop in airplane mode.

### TASK-P5-06 — Pitch sheet and Q&A rehearsal · P0 · D · 1.0 h
- [x] One-page architecture and metrics sheet; rehearse the judge prompts in `MEMORY.md` §5 and §7.3. **AC:** each team member can answer all prompts in under 30 s without notes.

### TASK-P5-07 — Final records · P0 · all · 0.5 h
- [x] Update `MEMORY.md` status, decisions, traps; confirm every `Tasks.md` box reflects reality. **AC:** no unchecked P0 box without an explanation in `MEMORY.md` §2.

**Checkpoint H36:** Offline runnable on low-end laptop; zero network dependencies; test suite and demonstration ready. [VERIFIED]

---

## Acceptance-criteria traceability (PRD v1.1 §7.2 → tasks)

| AC | Statement | Tasks |
| --- | --- | --- |
| AC-1 | 60 fps at 100 live tracks (cap 150) on i3 / 4 GB | P1-06, P5-04 |
| AC-2 | Same seed + inputs ⇒ identical events and score within 1e-6 | P0-04, P3-06, P3-11 |
| AC-3 | Masked drone never radar-detected; FPV profile reaches `z_hug` before the shadow | P1-02, P1-03 |
| AC-4 | At least one sensor class always functional | P2-06, P4-02 |
| AC-5 | Missile on recon quad: `E_econ 25` and flag; FPV ≈ 41 with flag; kinetic over `ρ > 0.5` violates | P2-04, P3-01 |
| AC-6 | Ten consecutive TRAIN scenarios pairwise similarity below 0.85 | P4-01, P4-04 |
| AC-7 | AAR shows MET, MDT, accuracy, CER and working replay | P3-03, P3-05, P3-06 |
| AC-8 | DEMO-1 reproduces the 3.4 timeline within 1 s | P1-09, P3-11 |
| AC-9 | Leaderboards/percentiles from EVAL only; trends show `d` | P3-09, P3-10, P4-06 |
| AC-10 | Every hostile has a ≥ 6 s sensing window with `q ≥ Q_min` | P4-02 |
| AC-11 | Network disabled ⇒ full scenario, zero outgoing requests | P0-05, P5-02 |

---

## Track X3D — Optional Three.js 3D Feature Pack (Post-H36 Extension)

All tasks in this track are planned additions. The existing 2D Canvas baseline remains fully implemented, verified, and active.

### TASK-3D-01 — 3D Renderer Foundation, Lazy Chunking & View Toggle · P1 · A · 2.5 h
Files: `src/render3d/{index,renderer3d,capability,coords}.ts`, `vite.config.ts`, `src/ui/Console.tsx`
- [x] Vite rollup chunking configuration: isolate `three` and `src/render3d/**` into `render3d.[hash].js`. **AC:** Production build emits separate 3D chunk under 1.5 MB; initial entry bundle contains 0 bytes of Three.js.
- [x] WebGL2 capability detection and error recovery: probe `canvas.getContext('webgl2')`. On failure, disable 3D toggle (`NO WEBGL2`); on `webglcontextlost`, seamlessly fall back to 2D console with banner. **AC:** Unit/e2e test verifies simulated context loss immediately restores 2D canvas without pausing or crashing simulation.
- [x] Tactical viewport and camera presets: landscape canvas embedding with zero vertical scroll at 1366×768; camera presets `OBLIQUE`, `TOP`, `POST`. **AC:** `V` hotkey toggles 2D/3D in $< 16\text{ ms}$; Playwright asserts `scrollHeight <= innerHeight` at 1366×768.

### TASK-3D-02 — Safe Track View-Model & Ground-Truth Redaction Boundary · P0 · B · 1.5 h
Files: `src/render3d/types.ts`, `src/ui/Console.tsx`, `tests/unit/render3d.spec.ts`
- [x] Define `SafeTrackView` interface excluding `trueClass`, `droneType`, true `pos`, and `valueInr`. **AC:** TypeScript compilation enforces that `src/render3d/` imports only `SafeTrackView`, not `TrackEntity`.
- [x] Implement `projectSafeTracks()` projection in `src/ui/Console.tsx`. **AC:** Unit tests in `render3d.spec.ts` assert 0 ground truth fields are exposed to live 3D renderers.
- [x] Address Tracker Blocker: Identified architectural limitation (OQ-09 & Task 10) where `SafeTrackView.vel` reflects instantaneous velocity rather than Kalman filter estimate; visual predictor aid was halted per specification to prevent truth leak.

### TASK-3D-03 — Reactive Sensor Coverage Volumes · P1 · A · 2.5 h
Files: `src/render3d/coverage.ts`, `src/sim/sensors.ts`, `tests/unit/render3d.spec.ts`
- [x] Radar 4th-power coverage hemisphere: radius derived from radar equation SNR ($R \propto A_{\text{env}}^{1/4}$); reacts dynamically to `RAIN` and collapses on `RADAR_DROPOUT`. **AC:** Unit test asserts visual dome radius matches radar equation $R_{90}$ threshold.
- [x] Directional EO/IR wedge: spherical lune oriented along sensor boresight azimuth, expanding/contracting based on `FOG` and day/night state.
- [x] RF sensor bearing lines: directional bearing spokes drawn on ground plane, blanked during `RF_JAMMING`.

### TASK-3D-04 — Effector Range Envelopes & PNR Boundary · P1 · B · 2.0 h
Files: `src/render3d/effectorEnvelopes.ts`, `src/sim/effectors.ts`, `tests/unit/render3d.spec.ts`
- [x] Effector engagement domes: translucent spherical shells representing active weapon min/max engagement envelopes (RF Jammer, Laser, Gun, Interceptor, Missile).
- [x] PNR perimeter cylinder: vertical boundary ring at $R_{\min} = 500\text{ m}$ rendered in warning red (`threat`). **AC:** Visual envelope boundaries match `CONFIG.effectors` ranges within 1 metre.

### TASK-3D-05 — Line-of-Sight & Masking Explanation matching evaluateMasking · P1 · A · 2.0 h
Files: `src/render3d/losVisualizer.ts`, `src/sim/masking.ts`, `tests/unit/render3d.spec.ts`
- [x] Authoritative line-of-sight ray: draws LOS vector from antenna $(0, 0, h_r)$ to target. If `evaluateMasking()` returns `isMasked: true`, ray changes color and terminates at the near obstacle edge $d_{\text{near}}$.
- [x] Extruded obstacle shadow volumes: shadow geometry projected behind urban blocks matching the exact near-edge distance and shadow length from `evaluateMasking()`. **AC:** Target visual occlusion aligns 100% with the simulation's `masked` event timestamp.

### TASK-3D-06 — Spatial Cluster Overlay & Altitude Bins · P1 · D · 1.5 h
Files: `src/render3d/clusters.ts`, `src/render3d/clusterMath.ts`, `tests/unit/clusters.spec.ts`
- [x] Operator-visible spatial clustering: lightweight distance grouping on observed safe tracks to highlight swarm formations with convex hull boundary.
- [x] 3-band altitude stems: vertical drop lines from drone to terrain surface categorized into `LOW` (< 40m), `MED` (40–100m), and `HIGH` (> 100m) bands. **AC:** 13 unit tests pass covering cluster math and visual overlays.

### TASK-3D-07 — TRAIN-Only Decision Aids with EVAL Lockout · P2 · C · 2.5 h
Files: `src/render3d/trainingAid.ts`, `src/render3d/trainingAidMath.ts`, `src/ui/CrossSectionPanel.tsx`, `tests/unit/trainingAid.spec.ts`
- [x] Class B aids: Coverage blind-spot shadow map, reference RCS shells, and 2D elevation cross-section panel along bearing.
- [x] EVAL mode lockout: Training aid hotkey `[X]` and cross-section button are strictly locked in `EVAL` mode (`AIDS LOCKED`); active aid duration in TRAIN is logged in session telemetry. (Trajectory extrapolation aid halted per Task 10 precondition).

### TASK-3D-08 — Post-Session 3D AAR Truth Replay · P2 · D · 3.0 h
Files: `src/ui/aar/AarReplay3D.tsx`, `src/render3d/aarScene3d.ts`, `tests/unit/aarReplay3d.spec.tsx`
- [x] Full 3D historical scrubber: timeline scrubber rewinds and replays drone trajectories in 3D using recorded `SimSnapshot` frames.
- [x] Ground truth unmasking: displays true drone type, true classification, and unobserved waypoints in debrief mode only. **AC:** 9 unit tests pass verifying truth isolation and snapshot interpolation.

### TASK-3D-09 — Engagement Inspector · P2 · B · 2.0 h
Files: `src/ui/aar/AarEngagementInspector.tsx`, `src/ui/aar/engagementInspectorData.ts`, `tests/unit/aarInspector.spec.tsx`
- [x] Retrospective engagement breakdown: visualizes the exact geometry at the fire tick using recorded engagement event parameters ($u, P_{k0}, g, h$).
- [x] Caption compliance: displays mandatory disclaimer `ILLUSTRATIVE — OUTCOME IS A SEEDED PROBABILITY DRAW`. **AC:** 13 unit tests pass.

### TASK-3D-10 — Experimental WebXR VR Support · P2 · A · 4.0 h
Files: `src/render3d/capability.ts`, `Rules.md`
- [ ] WebXR table-top presentation: immersive virtual tactical table at 1:10,000 scale.
- [x] Experimental status: labeled `VR (EXPERIMENTAL, UNVERIFIED)` — no physical headset session has been run or recorded. Physical hardware validation deferred until DSSC headset hardware is provisioned.

---

## Phase 6 — Scenario Catalog & Training Exercises (TASK 12)

### TASK-12-01 — Scenario Catalog, Multi-Class Exercises & Evaluated Selector UI · P0 · C/D · 3.5 h
Files: `src/director/catalog.ts`, `src/ui/ScenarioModal.tsx`, `src/ui/TrackTable.tsx`, `src/ui/Console.tsx`, `src/ui/HotWash.tsx`, `src/store/sessionStore.ts`, `tests/unit/catalog.spec.ts`, `tests/e2e/scenario.spec.ts`
- [x] Typed Scenario Catalog: Implemented 5 validated scenario entries (`DEMO-1`, `DEMO-2`, `SWARM-1`, `SPECTRUM-1`, `PROCEDURAL-1`) complying strictly with `ScenarioSpec` and `validateDetailed()` fairness criteria. **AC:** All 5 scenarios validate with zero fairness/timeline errors.
- [x] Full-Spectrum 6-Class Coverage: `SPECTRUM-1` encompasses all 6 ground-truth airspace classes (`HOSTILE_ATTACK`, `HOSTILE_ISR`, `SWARM_ELEMENT`, `CIVIL_UAS`, `BIRD`, `FRIENDLY` with active IFF).
- [x] Evaluated Session Lifecycle & Recorder Sequencing: `loadScenario` awaits `activeRecorder.stop()`, eliminating race conditions and preserving previous session AAR event data in IndexedDB.
- [x] Scenario Selector UI & Confirmation Guard: Accessible tactical scenario selection modal with objective descriptions, class badges, active indicator, explicit restart action, and a confirmation dialog before replacing active running sessions. Locked in EVAL mode.
- [x] Verification & Test Suite: 17 unit tests in `catalog.spec.ts` (247 unit tests total) and 5 Playwright E2E tests in `scenario.spec.ts` (11 E2E tests total) pass at 1366×768 and 1280×700 with zero overflow.

### TASK-12A-01 — Scenario Selector Final Consistency & Session-Lifecycle Audit · P0 · C/D · 2.0 h
Files: `src/store/sessionStore.ts`, `src/director/catalog.ts`, `src/db/recorder.ts`, `src/ui/ScenarioModal.tsx`, `tests/unit/catalog.spec.ts`, `tests/e2e/scenario.spec.ts`
- [x] Active Session Finalization Before Scenario Switch: `loadScenario` checks active session state, aborts old session with `SCENARIO_SWITCH` termination reason and aggregate metrics, records exactly one `SESSION_END` event to the old recorder, pauses the clock, awaits full persistence/flush, and prevents action queue mutation during transition.
- [x] No Duplicate `SESSION_END`: If a session has already naturally completed or was previously aborted, switching scenarios drains pending writes without appending duplicate terminal events.
- [x] Honest Persistence Error Handling: If recorder flush fails during scenario switch, the store rejects the load, catches the error honestly, and refuses to claim the new scenario is active.
- [x] Fresh Restart-Seed Semantics & Exact Replay Action: `restartSession()` generates a fresh 31-bit local seed without network calls via `generateLocalSeed()` and applies it across all catalog specs; `SIM_START` records the new seed; previous session replay data is preserved. `rerunExactSeedSession()` is provided as an explicit benchmark action.
- [x] Scenario Durations & Catalog Metadata Reconciled: All catalog scenario specs verified at `120s` (`durationMs: 120_000`), strictly complying with `ScenarioSpec.durationMs: 120_000 | 30_000` schema. `durationSec: 120` displayed in `ScenarioModal` UI and verified in E2E.
- [x] Procedural Scenario Difficulty Reconciled: Procedural generator defaults verified at `d = 0.3` (`difficulty = 0.3`) across code, UI disclaimer, and test suite.
- [x] Verification & Test Coverage: 24 unit tests in `catalog.spec.ts` (254 unit tests total across 24 files, all passing), 11 Playwright E2E tests passing, ESLint 0 errors / 0 warnings, production build clean at 1.50 MB total bundle.

---

## Phase 7 — Unpredictable Assessment (TASK 13)

### TASK-13-01 — RANDOM-1 Dedicated Unpredictable Assessment · P0 · B/C/D · 2.5 h
Files: `src/director/randomScenario.ts`, `src/director/catalog.ts`, `src/store/sessionStore.ts`, `tests/unit/randomScenario.spec.ts`, `tests/unit/catalog.spec.ts`, `tests/e2e/scenario.spec.ts`
- [x] Dedicated RANDOM-1 Generator: Implemented `generateRandomScenario(seed, difficulty)` producing distinct, valid tactical air-defense encounters deterministically keyed to the seed.
- [x] Meaningful Multi-Class Variation: Varies hostile threat count (2 to 4), class composition (FPV Attack, Recon Quad, Swarm Element), decoy and clutter count (2 to 4), civil drones, birds, and friendly transits with IFF across 360-degree approach axes.
- [x] Fairness Validation & Bounded Retries: Generates and evaluates candidates with `validateDetailed(spec)` enforcing sensing windows, effector feasibility, and PNR bounds with bounded retries; never starts an unvalidated fallback.
- [x] Hidden Ground Truth Protection: Operator-facing UI and track tables only reveal detected, active tracks without exposing planned compositions or future arrival schedules.
- [x] Seed Semantics & Replay: Fresh seed generated for each restart via `crypto.getRandomValues`; exact seed replay supported via `rerunExactSeedSession()`.
- [x] Verification & Automated Test Suite: 12 unit tests in `randomScenario.spec.ts`, 24 unit tests in `catalog.spec.ts` (266 unit tests total across 25 files), and 12 Playwright E2E tests passing.

