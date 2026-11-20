# Tasks.md — DRISHTI-CUAS 36-Hour Sprint Tracker

Read `MEMORY.md` first, then the task, then the cited sections of `ARCHITECTURE.md` and `DESIGN.md`. Obey `Rules.md`. Tick sub-tasks (`[x]`) in the same change that completes them.

**Legend.** Priority: **P0** must-have (never cut) · **P1** cuttable late · **P2** cut first. Owner roles (from the PRD): **A** simulation core and rendering · **B** decision logic, scoring, oracle · **C** Director, persistence, tooling, packaging · **D** React UI, AAR dashboard, pitch and demo. Estimates are hands-on hours. `AC:` = acceptance criterion (must be observable or testable). Paths are relative to the repo root.

**Capacity check (4 developers).**

| Phase | Window | Capacity (dev-h) | Planned (dev-h) |
| --- | --- | --- | --- |
| P0 Setup and contracts | H0–H2 | 8 | 6.5 |
| P1 Radar core and masking | H2–H10 | 32 | 15 |
| P2 F2T2EA, effectors, chaos | H10–H18 | 32 | 22.5 |
| P3 Scoring, oracle, AAR | H18–H26 | 32 | 28 |
| P4 Adaptive Red Team, TRAIN/EVAL | H26–H31 | 20 | 19.5 |
| P5 Hardening, golden tests, demo | H31–H36 | 20 | 20 |

The optional 3D/VR work (Three.js) adds about 14 dev-hours of core 3D (P1) plus 9 hours of VR and 3D replay (P2); Phase 5 is full only if VR and 3D replay are attempted, and both are the first things to cut. Capacity is aggregate: owners are defaults, and the leads rebalance between roles at every checkpoint. Slack is otherwise deliberate: AI-assisted generation needs run-and-fix loops and free-tier quotas are limited.

**Cut order (when behind):** (1) VR mode → (2) 3D AAR replay → (3) RAIN and DROPOUT chaos → (4) instructor mode → (5) ridge and forest zones → (6) Thompson-sampling and other P2 items → (7) 3D EO/IR view → (8) 3D tactical view (the 2D console alone satisfies the statement) → (9) unit heatmap and trend chart (keep the minimal unit table) → (10) session JSON import/export. **Never cut:** terrain masking, three sensor modes, decision-tree scoring, MET and timeline replay, TRAIN/EVAL split, minimal unit table.

---

## Phase 0 — Project Setup and Contracts (H0 – H2)

### TASK-P0-01 — Repo scaffold and toolchain · P0 · A · 0.75 h
Files: `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`
- [ ] Vite + React 19 + TypeScript with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` + Tailwind v4 plugin. **AC:** `npm run build` succeeds and `dist/` is under 1 MB on the empty app.
- [ ] Scripts: `dev build preview typecheck lint test test:golden test:guards check test:e2e calibrate gen:scenarios`. **AC:** `npm run check` (typecheck + lint + unit + golden + guards) exits 0 on the empty repo.
- [ ] CSP `<meta>` from `ARCHITECTURE.md` §1.8 and `__SIM_VERSION__` define. **AC:** no CSP violations in the console on `npm run preview`; unit test asserts `__SIM_VERSION__ === package.json version`.

### TASK-P0-02 — Theme, fonts, shell geometry, UI kit · P0 · D · 0.75 h
Files: `src/theme.css`, `public/fonts/*.woff2`, `src/ui/shell/{Console,TopBar,LeftRail,RightRail,BottomBar}.tsx`, `src/ui/kit/*`, `tests/e2e/layout.spec.ts`
- [ ] `theme.css` exactly per `DESIGN.md` §1.3 (default palette, radii, shadows reset). **AC:** `border-neutral-800` resolves to `#262626`; `bg-indigo-500` fails to build or is absent from the CSS.
- [ ] Fonts (Chakra Petch 500/600, JetBrains Mono 400/700, Share Tech Mono 400, latin subsets) with `font-display: block` and a `loadFonts()` helper. **AC:** DevTools shows fonts served from `127.0.0.1`; no external requests.
- [ ] Empty shell: top 45, bottom 110, rails 240/320, strip 35, radar `var(--radar)`. **AC:** Playwright at 1366×768 and 1280×700: `scrollHeight <= innerHeight`; radar box is 520×520 at 768 and 510×510 at 700.
- [ ] Kit: `Panel` (chamfered header), `Tag`, `KeyCap`, `Button`, `Gauge`, `Stat` per `DESIGN.md` §8. **AC:** no element has computed `border-radius > 2px`, box-shadow, or background-image gradient.

### TASK-P0-03 — Contracts, taxonomy, config schema · P0 · B · 1.0 h
Files: `src/sim/{types,taxonomy,config}.ts`, `public/config.json`, `tests/unit/config.test.ts`
- [ ] All contracts from `ARCHITECTURE.md` §3 including `SimView` (tracks with `estPrev`, plots, zones, chaos state, sweep time, `rfEmitters`). **AC:** `tsc` clean; no `any`.
- [ ] `taxonomy.ts` with the 7 labels and `assertClassLabel`. **AC:** unit test rejects `'HOSTILE_UAV'`, `'UNKNOWN'`, `'NEUTRAL'`.
- [ ] Default `config.json` (§3.8) with a zod schema and canonical SHA-256 hash (sorted keys; pure-TS fallback). **AC:** schema rejects unknown keys and out-of-range values; hash is identical for permuted key order.
- [ ] `cfg()` typed accessor. **AC:** guard fails if `scoring.ts`/`effectors.ts` contain forbidden numeric literals.

### TASK-P0-04 — RNG, clock, fixed-step loop · P0 · A · 1.0 h
Files: `src/sim/{rng,clock,loop,inputQueue}.ts`, `tests/unit/{rng,loop,clock}.test.ts`
- [ ] `mulberry32`, `hash32`, `streamSeed`, `draw`, `sequence` (§3.7). **AC:** published mulberry32 test vector passes; `draw` returns identical values when call order is permuted; the three runtime streams differ for the same key.
- [ ] Accumulator loop with 250 ms clamp and visibility reset (§1.3). **AC:** a simulated rAF at 30, 60 and 144 Hz produces identical tick counts over 10 s of sim time; after a 5 s stall at most 5 ticks are stepped.
- [ ] `SimClock.simMsAt` and `applyTickFor` (§1.4). **AC:** an event stamped before the last processed tick applies at `lastTick + 1`; exact tick multiples map to themselves; speed 2× maps correctly.

### TASK-P0-05 — Guards and lint rules · P0 · C · 1.0 h
Files: `eslint.config.js`, `tests/guards/{network,taxonomy,sim-purity,design,imports,deps,copy,three}.test.ts`
- [ ] ESLint: `no-restricted-globals` (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`), `no-restricted-properties` (`Math.random`), `no-magic-numbers` on scoring files, `no-restricted-imports` for boundaries. **AC:** each rule has a fixture file that fails when linted.
- [ ] Guard tests per `Rules.md` §9. **AC:** deliberately adding `fetch('/x')` in `src/ui` fails `network.test.ts`; adding `'HOSTILE_UAV'` fails `taxonomy.test.ts`; adding `rounded-xl` fails `design.test.ts`; importing `three` outside `src/render3d/` or constructing a `TextureLoader` fails `three.test.ts`.

### TASK-P0-06 — Launcher stub and CSP headers · P0 · C · 1.0 h
Files: `tools/launcher/main.go`, `tools/launcher/start.bat`, `tools/launcher/start.sh`
- [ ] Static server on `127.0.0.1:47260` serving `dist/` with the CSP and cache headers; exits with a clear message if the port is busy. **AC:** `curl -I` shows the CSP header; a second instance fails with a message and non-zero exit.
- [ ] Start scripts launch the pinned Chromium with the flags in §1.8 (path configurable). **AC:** app opens as a window with no tabs and no network traffic other than loopback.

### TASK-P0-07 — Dexie schema skeleton · P0 · C · 1.0 h
Files: `src/db/{dexie,repo}.ts`, `tests/unit/db.test.ts` (fake-indexeddb)
- [ ] Schema v1 exactly as `ARCHITECTURE.md` §5.1 with typed repositories. **AC:** inserting 3000 events and querying `[sessionUid+tMs]` between 40000 and 45000 returns only that window, in order.
- [ ] `drafts` autosave helper. **AC:** write then read of `{spec, inputs}` round-trips.

**Checkpoint H2:** `npm run check` green; empty shell passes the 768p layout test; rng and loop tests green; config validates and hashes.

---

## Phase 1 — 2D Canvas Radar Core and Masking Engine (H2 – H10)

### TASK-P1-01 — SimCore skeleton, entities, DIRECT trajectories · P0 · A · 1.5 h
Files: `src/sim/{core,trajectories}.ts`, `tests/unit/core.test.ts`
- [ ] `SimCore(spec, config)` with `step()`, `view()`, `snapshot()/restore()`, `stateHash()` and the fixed order of §1.6 (unused steps present as no-ops). **AC:** state survives `JSON.parse(JSON.stringify())` and hashes identically.
- [ ] Spawn from `ScenarioSpec` at `spawnMs`; DIRECT waypoints with speed from the spec. **AC:** a 40 m/s entity travels 2 m per tick; `prevPos`/`pos` set for interpolation.

### TASK-P1-02 — Behaviour profiles · P0 · A · 1.0 h
Files: `src/sim/trajectories.ts`
- [ ] `TERRAIN_HUG` with `d_trig = v × (z_cruise − z_hug)/descent_rate` and phases CRUISE→DESCENDING→HUGGING→CLIMBING; `ORBIT_FEINT`, `ERRATIC` (bird jitter from `traj` stream), `SWARM_SATURATE`. **AC:** FPV at 40 m/s starts descending 500 m before a zone edge and reaches `z = 0.5 H` before the shadow begins (unit test over the DEMO-1 geometry).

### TASK-P1-03 — Masking engine · P0 · B · 1.5 h
Files: `src/sim/masking.ts`, `tests/unit/masking.test.ts`
- [ ] Segment/polygon intersection, near-edge distance, elevation-angle test, shadow length (§4.2). **AC:** cases inside zone, in shadow, beyond shadow, above roofline, and outside all pass; DEMO-1 H-1 at `z = 20` is masked for `R ∈ (1800, 2600]` and unmasked outside; C-1 at `z = 60`, `R = 2300` is **not** masked.
- [ ] RF zone attenuation helper (`reach × √0.5` when the target is inside a polygon). **AC:** RF sees H-1 across the whole masked interval (R ≤ 2.6 km < 2.83 km).

### TASK-P1-04 — Radar sweep, Pd, tracks · P0 · B · 2.0 h
Files: `src/sim/{sensors,tracker}.ts`, `tests/unit/{radar,tracker}.test.ts`
- [ ] Sweep interval test (9° per tick), Pd formula with `A_env`, keyed `sense` draw `(entityIdx, sweepIdx)`. **AC:** reference target at 3 km has empirical Pd 0.90 ± 0.02 over 5000 sweeps; each entity is painted exactly once per sweep at 30, 60 and 144 Hz display rates (loop independent).
- [ ] Track init (2 of 3), ACTIVE/COASTING/LOST (8 s), reacquire gate `3σ + 150 m`, fragmentation → new id with `fragmentedFrom`. **AC:** DEMO-1: H-1 goes COASTING at the shadow start, LOST after 8 s, and the same track id resumes at reacquisition; a path shifted outside the gate creates a new track.
- [ ] Events `DETECT`, `TRACK_INIT`, `MASKED`, `REACQUIRE`. **AC:** emitted once per transition, tick-stamped.

### TASK-P1-05 — Track quality, classification confidence, EO/RF visibility · P0 · B · 1.5 h
Files: `src/sim/{sensors,tracker}.ts`, `tests/unit/quality.test.ts`
- [ ] `q` fusion (radar 0.8 / coast decay, EO 0.7 when aligned, RF 0.4) and `c_cls` fusion (§4.3); EO clarity, shape and payload thresholds; RF DF noise from `sense` stream. **AC:** radar-only firm track `q = 0.8 ≥ 0.6`; RF-only `q = 0.4 < 0.6`; coasting q drops below 0.6 after 2 s; fog ×0.25 collapses EO clarity; RF-silent target gives `rfSees = false`.

### TASK-P1-06 — Radar renderer and phosphor layer · P0 · A · 2.0 h
Files: `src/render/{canvasKit,radarLayer,phosphor,hud}.ts`
- [ ] Static base layer (rings, ticks, labels, crosshair, asset, PNR ring) drawn once per resize; dynamic layer per frame; DPR capped at 2. **AC:** base layer is not redrawn per frame (counter in dev build).
- [ ] Sweep line + wedge, phosphor offscreen layer with `destination-out` fade `1 − exp(−dt/1.2 s)`. **AC:** at 30 and 144 Hz the afterglow decays in the same wall time (±5%).

### TASK-P1-07 — Symbols, labels, vectors, coast ellipse · P0 · D · 1.5 h
Files: `src/render/symbols.ts`, `src/render/radarLayer.ts`
- [ ] `Path2D` symbols for all 7 labels plus `null` (§3); selection brackets, designated marker, PNR cross, velocity vector (≤ 60 px). **AC:** screenshot test of a fixture view shows 8 distinct symbols; no truth fields are read (type-level: renderer takes `TrackEntity` only).
- [ ] Coasting dashed symbol and amber σ-circle with `COAST ±Nm` label. **AC:** σ grows 12 m/s per second of coasting.

### TASK-P1-08 — Track table, projection, shell wiring · P0 · D · 1.5 h
Files: `src/store/{consoleStore,projection}.ts`, `src/ui/panels/TrackTable.tsx`, `src/ui/panels/EvidencePanel.tsx`
- [ ] Zustand slices; `sim.onTick → setState({proj})`; table at 10 Hz with memoised rows; columns per `DESIGN.md` §2.4. **AC:** with 40 tracks the React profiler shows only changed rows re-rendering; table fits 18 rows without page scroll at 768.
- [ ] Evidence panel rows with `NO CUE` for unavailable sensors. **AC:** shows micro-Doppler only when radar sees the track.

### TASK-P1-09 — DEMO-1 scenario and timeline golden test (part 1) · P0 · C · 1.5 h
Files: `tools/author-demo1.ts`, `public/scenarios/demo-1.json`, `tests/golden/demo1-timeline.test.ts`
- [ ] Author DEMO-1: asset FOB ALPHA (rMin 500 m, antenna 15 m), DAY, 120 s. **U1:** URBAN, `ρ 0.8`, H 40, L 800, rectangle aligned to bearing 052° with `u ∈ [1800, 3000]`, `v ∈ [−650, 650]` → vertices (1018,1620), (1819,596), (2764,1335), (1964,2359). **H-1:** HOSTILE_ATTACK/FPV_ATTACK, spawn 5000 ms at (2837, 2216), z 120, 40 m/s, TERRAIN_HUG toward the origin, `emitsRf` true, no Remote-ID. **B-1:** BIRD flock spawn 9000 ms at (445, 1222), ERRATIC, 6 m/s. **C-1:** CIVIL_QUAD at (1992, 1150), z 60, 8 m/s slow orbit, broadcasts Remote-ID, spawn 9000 ms. **Chaos:** FOG at 28000 ms for 18000 ms (EOIR); JAMMING at 64000 ms for 15000 ms (RF). **Trigger:** TRACK_NEUTRALISED(H-1) → spawn after +2000 ms: 5 SWARM_ELEMENT_FW at bearing 300°, R 3000 m (100 m lateral spacing), 45 m/s, RF-silent, plus 3 BIRD flocks at bearings 280/300/320, R 2500 m. Pick the seed so `t_trk(H-1) ∈ [T+8, T+11]`.
- [ ] Golden (scripted-trainee-free) assertions: `t_vis(H-1) = 5000 ± 1000 ms`; masked from T+30 to T+50 (±1 s); `t_PNR(H-1) = 82.5 s ± 1 s`; RF sees H-1 for the whole masked interval. **AC:** test passes; changing the descent trigger distance to a fixed 300 m still passes (documented margin) but changing speed to 70 m/s fails.

### TASK-P1-10 — Zones, asset, PNR ring rendering · P0 (urban) / P1 (ridge, forest) · A · 1.0 h
Files: `src/render/radarLayer.ts`
- [ ] URBAN dashed amber outline with 8% hatch and `U1 ρ0.8 H40` label; RIDGE and FOREST styles (P1). **AC:** screenshot matches `DESIGN.md` §4.1; asset marker and dashed PNR ring at 25 px (500 m at 520 px).

**Checkpoint H10:** DEMO-1 plays: H-1 vanishes into U1's shadow at T+30 and reappears at T+51 (track coasts, goes LOST, reacquires); table and radar run at 60 fps with 40 tracks; golden timeline part 1 green.

---

## Phase 2 — F2T2EA Interaction, Effector Engine and Chaos Engine (H10 – H18)

### TASK-P2-01 — F2T2EA state machine and commands · P0 · B · 2.0 h
Files: `src/sim/{f2t2ea,inputQueue,core}.ts`, `tests/unit/f2t2ea.test.ts`
- [ ] Transitions and fire preconditions per `ARCHITECTURE.md` §3.3 (`DESIGNATE`, `CLASSIFY`, `SELECT_EFFECTOR`, `FIRE`, `ASSESS`, `SENSOR_MODE`, `EO_SLEW`); `LOST` regresses to `FIND` keeping the label; `ASSESS(MISS)` returns to `TARGET` before PNR. **AC:** table-driven test covers every row of the transition table, including re-designation after reacquire auto-advancing to `TARGET` when a label is retained.
- [ ] `fireBlockedReason` computed each tick. **AC:** `Q_LOW` when `q < 0.6`; `PAST_PNR` after the PNR tick; firing from `TRACK` is allowed.

### TASK-P2-02 — Classification grid and evidence UI · P0 · D · 2.0 h
Files: `src/ui/panels/{ClassGrid,F2T2EAPanel}.tsx`, `src/ui/labelText.ts`
- [ ] 7-button grid per `DESIGN.md` §2.6 with keyboard (`C`, arrows, `Enter`, `Esc`). **AC:** pressing `C`, arrows and `Enter` commits `HOSTILE_ATTACK` and enqueues `CLASSIFY`; the symbol on the radar updates within one tick.
- [ ] Stepper 6 segments. **AC:** reflects `TrackEntity.step`.

### TASK-P2-03 — Effectors and kill resolution · P0 · B · 1.5 h
Files: `src/sim/effectors.ts`, `tests/unit/effectors.test.ts`
- [ ] `Pk = Pk0 × g(R) × h(chaos)` with plateau 60%, RF-silent 0.1, swarm gun 0.35, laser ×0.5 in fog, RF soft-kill 0 under jamming; kill draw at fire tick from `kill` stream `(trackIdx, engagementIdx)`; reveal after `displayDelayMs`. **AC:** `g` is 1 on the middle 60% and 0 at both edges; re-running with the same seed and input log reproduces every draw; a 5000-draw test matches `Pk` within ±0.02.

### TASK-P2-04 — ROE module and flags · P0 · B · 1.5 h
Files: `src/sim/roe.ts`, `tests/unit/roe.test.ts`
- [ ] `KINETIC_OVER_ZONE` (debris-expanded polygon, `ρ > 0.5`, `wE ≥ 0.3`), `UNCLASSIFIED_RELEASE`, `CIVIL_ENGAGED`, `FRIENDLY_ENGAGED`, `UNFAVOURABLE_EXCHANGE` (`CER > 10`), `ROE_VIOLATION` events. **AC:** `Rules.md` §4.3 fixtures: missile on recon quad ⇒ `CER 75` and the flag; firing with `label = null` or `UNKNOWN_EVIDENCE_INSUFFICIENT` ⇒ `UNCLASSIFIED_RELEASE`.
- [ ] Live CER estimate helper by label (R3.5). **AC:** `HOSTILE_ISR` label shows the recon-quad nominal value; `null` shows `—`.

### TASK-P2-05 — Right rail: effectors, actions, ROE strip · P0 · D · 2.0 h
Files: `src/ui/panels/{EffectorList,RoeStrip}.tsx`, `src/ui/shell/RightRail.tsx`
- [ ] 5 effector rows (46 px) with tier colour, cost via `formatInr()`, live `Pk`, envelope bar, `CER … EST`, blocked reasons; keys `Q W E R T`, `F`, `A` then `K/M`. **AC:** right rail content is 588 px; no overflow at 768; `₹3,00,00,000`-style grouping is correct for 100, 20000, 200000, 3000000.

### TASK-P2-06 — Chaos engine (FOG, JAMMING) and sensor badges · P0 · A · 2.0 h
Files: `src/sim/chaos.ts`, `src/ui/shell/TopBar.tsx`
- [ ] `CHAOS_ON/OFF`, effects on EO reach, laser Pk, RF detection and soft-kill, extension rule (5 s), at most one concurrent. **AC:** DEMO-1 FOG at T+28 scales EO reach to 625 m; JAMMING at T+64 makes `rfSees` false and soft-kill `Pk = 0`.
- [ ] Badge states `NOM/DEG/BLIND` change within 1 s of onset, 1 Hz blink on `BLIND`. **AC:** Playwright reads badge text 20 ticks after `CHAOS_ON`.

### TASK-P2-06b — RAIN and DROPOUT chaos · P1 (cut first) · A · 1.0 h
Files: `src/sim/chaos.ts`, `src/render/radarLayer.ts`
- [ ] RAIN: `A_env 0.6` and 1–3 one-sweep false plots (never tracks); DROPOUT: `A_env 0`, 3–6 s. **AC:** false plots never initiate a track over 1000 sweeps.

### TASK-P2-07 — EO/IR renderer · P0 · A · 3.0 h
Files: `src/render/eoirLayer.ts`, `src/render/fx.ts`
- [ ] Layout per `DESIGN.md` §4.2 (viewfinder 520×372, mini-PPI 148, telemetry), reticle, HUD, day/IR palettes, 30° cone on mini-PPI. **AC:** screenshot matches dimensions; EO camera slews at 60°/s toward the selected track.
- [ ] Silhouettes (quad with spinning rotors, fixed-wing, bird flap, blob), size from clarity, payload at clarity ≥ 0.6, fog haze and ghosting, `NO LOS — MASKED`. **AC:** at clarity 0.2 only a blob is drawn; at 0.5 shape is visible; with fog the clarity readout drops.

### TASK-P2-08 — RF renderer · P0 · D · 2.0 h
Files: `src/render/rfLayer.ts`
- [ ] PPI 400×400 with DF lines, ±5° fan, `RID` lines; waterfall 520×120 at 8 rows/s via `ImageData` ring buffer; jamming saturation and `JAMMED` caption. **AC:** DF line jitter is identical on replay; jamming removes DF lines within one tick of `CHAOS_ON`.

### TASK-P2-09 — Operator log and bottom bar · P0 · C · 1.5 h
Files: `src/sim/oplog.ts`, `src/ui/shell/BottomBar.tsx`
- [ ] Map events to operator-visible lines (redacting truth); filter chips; 8 lines at 11 px. **AC:** `SPAWN`/`ENGAGE{cer}` lines never appear; timestamps are `T+012.350` form and multiples of 50 ms; bar is exactly 110 px.

### TASK-P2-10 — Sensor-mode commands, EO slew, SAL hooks · P0 · C · 1.5 h
Files: `src/sim/{sensors,core}.ts`, `src/ui/shell/Console.tsx`
- [ ] Keys `1/2/3` enqueue `SENSOR_MODE`; entering EO or changing selection while in EO enqueues `EO_SLEW`; `SENSOR_SWITCH` events logged. **AC:** the input log contains `applyTick` values only; mode change reflects in the strip within one tick.

### TASK-P2-11 — Session lifecycle and persistence · P0 · C · 1.5 h
Files: `src/store/consoleStore.ts`, `src/db/repo.ts`, `src/ui/screens/{Home,TraineeSelect,Briefing}.tsx`
- [ ] Start → run → finish/abort; draft autosave every 5 s; bulk write of events, inputs, tracks on finish. **AC:** killing the tab mid-session then reopening offers recovery that reproduces the same state hash at the last saved tick; aborted sessions are flagged.

### TASK-P2-12 — Renderer abstraction and frame driver · P1 · A · 1.0 h
Files: `src/render/renderer.ts`, `src/sim/loop.ts`, `src/sim/{core,tracker,sensors}.ts`, `tests/unit/loop.test.ts`
- [ ] `Renderer` interface (`ARCHITECTURE.md` §8.2) with a 2D adapter around the existing layers; `FrameDriver` and `LoopHandle` in `loop.ts` (§1.3). **AC:** the 2D console runs unchanged through the interface; a unit test that swaps drivers mid-run shows no skipped or duplicated ticks and an unchanged accumulator.
- [ ] `TrackEntity.masked` and the EO fields (`eoAzDeg`, `eoElevDeg`, `eoRangeM`) populated by the sim. **AC:** in DEMO-1 `masked` is true for H-1 from T+30 to T+50; EO fields are `null` whenever EO does not see the target.

**Checkpoint H18:** DEMO-1 playable from start to end offline: designate, classify, fire, flags and log lines appear; fog and jamming visibly change sensors; session persists to IndexedDB.

---

## Phase 3 — Scoring Math, Oracle Comparison and AAR Dashboard (H18 – H26)

### TASK-P3-01 — Scoring engine · P0 · B · 2.0 h
Files: `src/sim/scoring.ts`, `tests/unit/scoring.test.ts`
- [ ] `D, C (7th column), G, R, S`, session score, grades per `Rules.md` §4.2; `clamp()` and anomaly handling. **AC:** the three worked fixtures in `Rules.md` §4.3 pass to ±0.1; unclassified deadline gives `C = 0`; `UNKNOWN_EVIDENCE_INSUFFICIENT` on a hostile gives `C = 30`; scores never exceed [0,100] under fuzzed inputs.

### TASK-P3-02 — Oracle · P0 · B · 1.5 h
Files: `src/sim/oracle.ts`, `tests/unit/oracle.test.ts`
- [ ] Cheapest admissible effector at a tick (envelope, `Pk ≥ 0.6` incl. chaos, ROE-compliant) and earliest feasible tick (`q ≥ 0.6` and non-empty set). **AC:** DEMO-1 H-1 at 1.56 km ⇒ oracle is RF soft-kill; jamming active ⇒ soft-kill excluded; cost regret = trainee cost − oracle cost.

### TASK-P3-03 — `computeAAR` pure function · P0 · B · 1.5 h
Files: `src/sim/aar.ts`, `tests/unit/aar.test.ts`
- [ ] Metrics of `AARMetrics` incl. MDT/MET from `t_trk`, SAL (only when the degraded sensor was in use), SAT, aggregate CER, accuracy with unclassified as misses, recall/precision, 6×8 confusion, BDA accuracy/coverage, skill vector. **AC:** recomputing from the stored events reproduces the live score within `1e-6`; SAL is `null` for the JAMMING event in DEMO-1 when the trainee is on radar.

### TASK-P3-04 — Hot-wash screen · P0 · D · 1.0 h
Files: `src/ui/screens/HotWash.tsx`
- [ ] 560×360 chamfered card per `DESIGN.md` §5. **AC:** no page scroll; buttons `AAR [Enter]`, `HOME [Esc]` work.

### TASK-P3-05 — AAR shell and scorecard · P0 · D · 1.5 h
Files: `src/ui/aar/{AARScreen,Scorecard}.tsx`, `src/store/aarStore.ts`
- [ ] Layout 96/200/411 with 8 px gaps; badges and result tags per `DESIGN.md` §6.1; 6 KPI tiles. **AC:** at 1366×768 `scrollHeight <= innerHeight`; grade 72 shows `PROFICIENT IN SIMULATION · PASS`, 55 shows `DEVELOPING · CONDITIONAL`, 40 shows `NEEDS RETRAINING · FAIL`.

### TASK-P3-06 — Timeline scrubber and replay engine · P0 · A · 3.0 h
Files: `src/ui/aar/Timeline.tsx`, `src/sim/replay.ts`, `tests/unit/replay.test.ts`
- [ ] Replayer: spec + inputs → sim, snapshots every 100 ticks, `seek(tick)` ≤ 100 steps. **AC:** seek-to-any-tick state hash equals the hash from a straight run; seek under 16 ms on the test laptop.
- [ ] 5 lanes + ruler + PNR lines + playhead; keys `←/→`, `Shift+←/→`, `Space`, `Home/End`; marker hit-testing by binary search. **AC:** lane marks appear at the exact ticks of the events; clicking an engage marker selects it.

### TASK-P3-07 — Decision card · P0 · D · 1.5 h
Files: `src/ui/aar/DecisionCard.tsx`
- [ ] "What you knew" (label, `q`, `c_cls`, sensors seeing at that tick, time since `t_trk`) vs "what was true" (truth class, value, RF emission), effector, CER, `E_econ`, `E_time`, oracle choice, regret, flags. **AC:** values equal the `TrackResult` for the selected track; truth is shown only on this screen.

### TASK-P3-08 — Confusion matrix and spider · P0 · D · 2.0 h
Files: `src/ui/aar/charts/{ConfusionMatrix,Spider}.tsx`
- [ ] 6×8 matrix (400 px wide, 40 px cells) with colour rules and hover cost weight; 6-axis spider with session, EMA and 70 target ring, `N/A` hollow markers. **AC:** a fixture with one FN and one FP shows crimson and amber cells; missing SAT axis renders hollow.

### TASK-P3-09 — Session table and trend chart · P1 · D · 1.5 h
Files: `src/ui/aar/charts/TrendChart.tsx`, `src/ui/aar/panels/SessionTable.tsx`
- [ ] Per-metric lines plus difficulty `d` as a dashed cyan right axis. **AC:** with 5 sessions all six metrics and `d` render; legend is keyboard-accessible.

### TASK-P3-10 — Unit view, import/export, verification · P0 (minimal table) / P1 (heatmap, import/export) · C · 3.0 h
Files: `src/ui/aar/charts/UnitTable.tsx`, `src/db/io.ts`, `tests/unit/io.test.ts`
- [ ] Minimal unit table (P0): trainees with latest **EVAL** score and highest TRAIN `d`. **AC:** TRAIN-only trainees show `—` for score; aborted and unverified rows excluded.
- [ ] Heatmap and leaderboard (P1). **AC:** sorted by latest EVAL score.
- [ ] Bundle export/import with SHA-256 checksum, idempotent import by `uid`, callsign collision display, re-simulation verification (§5.2) (P1). **AC:** import of the same bundle twice changes no row count; a tampered score is flagged `unverified`; a different `simVersion` imports as `unverified`.

### TASK-P3-11 — Golden replay and `stateHash` tests · P0 · A · 1.5 h
Files: `tests/golden/{replay,statehash}.test.ts`, `tests/golden/demo1.inputs.json`
- [ ] Scripted trainee log for DEMO-1 (designate T-01 at 10.0 s, `SENSOR_MODE RF` at 13.0 s, `CLASSIFY HOSTILE_ATTACK` at 13.05 s, EO check of B-1 and C-1, FOG switch to RF at 31.0 s, re-designate at 52.0 s, `FIRE RF_SOFTKILL` at 56.0 s, assess at 58.0 s, swarm engagements). **AC:** same spec + log twice ⇒ identical events, identical `stateHash` every 20 ticks, score within `1e-6`; the swarm PNR is the trigger tick + 55.6 s (±1 s).

### TASK-P3-12 — 3D foundation, lazy chunk, view switch · P1 · C · 2.5 h
Files: `src/render3d/{index,capability,coords}.ts`, `vite.config.ts`, `src/ui/shell/{TopBar,Console}.tsx`, `src/db/staticAssets.ts`, `tests/guards/three.test.ts`
- [ ] Add `three` and `@types/three` at exact versions; `manualChunks` for `render3d`. **AC:** the main chunk contains no `three`; the 3D chunk is under 1.5 MB minified; the guard fails if `three` is imported outside `src/render3d/`.
- [ ] `detect()`, FPS probe and tier selection, load-timeout and context-loss fallbacks (`ARCHITECTURE.md` §8.4). **AC:** forcing `webgl2 = false` greys the `3D` tag with `NO WEBGL2` and the console stays in 2D; a simulated context loss returns to 2D without stopping the sim.
- [ ] `V` key, top-bar View tag, 3D viewport layout (`DESIGN.md` §11.1), `sessions.viewMode` stored. **AC:** a clear-colour 3D scene passes the no-scroll layout test at 1366×768 and 1280×700.
- [ ] `toThree()` and altitude-bin helpers; allow `/models/*.glb` in `staticAssets.ts`. **AC:** unit tests: north is −Z, altitude is +Y, bins map to 20/70/150 m.

### TASK-P3-13 — 3D tactical scene · P1 · B · 3.0 h
Files: `src/render3d/{tacticalScene,models}.ts`
- [ ] Ground grid, range rings 1–5 km, bearing spokes with labels, asset post, dashed PNR ring (`DESIGN.md` §11.2). **AC:** ring radii are 1000…5000 scene units; labels use Share Tech Mono sprites from procedural textures.
- [ ] Zones: URBAN instanced boxes up to `heightM` with a seeded cosmetic layout, RIDGE extrusion, FOREST cones, at most two draw calls per zone. **AC:** DEMO-1's U1 has a maximum block height of 40 m; all three zone types together stay under the tier draw-call budget.
- [ ] Sweep wedge (procedural `CanvasTexture`) and DF rays from `rfEmitters`. **AC:** the wedge angle equals the sim sweep angle at `tMs`.

### TASK-P3-14 — 3D tracks, picking, camera · P1 · A · 2.5 h
Files: `src/render3d/{tacticalScene,picking,camera}.ts`
- [ ] Symbol atlas from `render/symbols.ts`; sprites at constant 18 px at the estimate position and bin altitude; stems, ground dots, cached label sprites, velocity vector, coast sphere, selection brackets. **AC:** a fixture with the 8 label states draws 8 distinct symbols; a masked track draws no live marker; the module cannot import truth types.
- [ ] Screen-space picking (nearest within 14 px) and `OrbitControls` presets `OBLIQUE`/`TOP`/`POST`, `Home` reset. **AC:** unit test picks the nearest of overlapping markers; orbit and zoom enqueue no commands.
- [ ] `dispose()`. **AC:** ten 2D↔3D toggles leave `renderer.info.memory` at baseline.

**Checkpoint H26:** AAR for 3 sessions of one trainee shows trends and confusion matrix; unit table shows EVAL scores; replay seeks are deterministic; scoring fixtures pass. (3D, if attempted: `V` toggles to a tactical 3D view with extruded U1 and track markers; 2D remains the default.)

---

## Phase 4 — Adaptive Red Team Generator and TRAIN/EVAL Modes (H26 – H31)

### TASK-P4-01 — Features and calibration · P0 · C · 1.5 h
Files: `src/director/features.ts`, `tools/calibrate-features.ts`, `public/feature-calibration.json`, `tests/unit/features.test.ts`
- [ ] 33-dim vector (§6.2), z-scoring, cosine. **AC:** vector length is 33; identical specs give cosine 1.
- [ ] Calibration over ≥ 500 generated specs (uniform `d`). **AC:** at least 98% of random same-`d` pairs have cosine below 0.85; the script fails otherwise.

### TASK-P4-02 — Fairness validator · P0 · B · 2.0 h
Files: `src/director/validate.ts`, `tests/unit/validate.test.ts`
- [ ] Headless sensing run with the ideal operator; checks (a) budget, (b) effector, (c) sensing window, (d) joint window, (e) PNR inside session, (f) load. **AC:** DEMO-1 passes; a crafted spec with a hostile masked for its whole approach fails (c) and (d); a hostile with `T_budget` of 5 s fails (a); RF-silent target with only soft-kill available fails (b).

### TASK-P4-03 — Generator, levers, grammar · P0 · C · 2.5 h
Files: `src/director/{director,profile,levers,generator}.ts`, `tests/unit/generator.test.ts`
- [ ] EMA profile → weakness → softmax sampling of 1–2 levers; phases PROBE → DECOY-FLOOD → MAIN/SWARM; profiles and paths; decoys with Remote-ID probability `1 − 0.3d`; difficulty mapping. **AC:** for `d = 0` hostiles = 2 and for `d = 1` = 10; a trainee weak in SAL receives chaos aimed at their most-used sensor; same inputs ⇒ same spec.

### TASK-P4-04 — Novelty filter, mutation, fallback · P0 · C · 1.0 h
Files: `src/director/generator.ts`
- [ ] Reject when `max cosine over the last 10 ≥ 0.85`; 20 attempts then 20 mutations, **each re-validated**; bundled fallback of matching difficulty flagged `fallbackUsed`. **AC (AC-6):** ten consecutive generated scenarios for one trainee have pairwise similarity below 0.85.

### TASK-P4-05 — Reactive triggers · P0 · A · 1.5 h
Files: `src/sim/triggers.ts`, `tests/unit/triggers.test.ts`
- [ ] `TRACK_NEUTRALISED`, `MDT_ABOVE_MS`, `KINETIC_AT_BIRD`, `SENSOR_DWELL_FRACTION`; actions `SPAWN` (offsets from trigger time), `SCHEDULE_CHAOS`, `EXTEND_CHAOS`; `TRIGGER` events. **AC:** DEMO-1 wave 2 spawns 2 s after H-1's neutralisation tick; triggers fire once when `once` is true.

### TASK-P4-06 — TRAIN/EVAL flows, profiles, difficulty · P0 · D · 1.5 h
Files: `src/store/consoleStore.ts`, `src/ui/screens/Home.tsx`, `src/db/repo.ts`
- [ ] EVAL plays the bundled pack (no adaptation, speed 1×); TRAIN uses the Director; EMA and difficulty update after TRAIN only (R4.2). **AC:** after an EVAL session `difficultyState` is unchanged; after TRAIN it follows `d + 0.15(Score − 70)/30`.

### TASK-P4-07 — Red Team plan panel · P1 · D · 1.0 h
Files: `src/ui/aar/RedTeamPlan.tsx`
- [ ] Three lines (levers, why with EMA values, next). **AC:** content derives from `leversUsed` and the stored EMA, never invented text.

### TASK-P4-08 — Scenario export tool · P0 · C · 1.0 h
Files: `tools/gen-scenarios.ts`, `public/scenarios/*`
- [ ] Generate 12 fallbacks (several per difficulty tier), the 6-scenario EVAL pack (`d = 0.3, 0.5, 0.7` × 2), DEMO-2 (30 s, one `RECON_QUAD` hostile in open ground for the missile-penalty demo). **AC:** every exported spec passes the validator and contains `configHash`.

### TASK-P4-09 — Thompson-sampling lever selection · P2 · C · 1.5 h
Files: `src/director/levers.ts`
- [ ] Beta posterior per trainee and lever (success = session score dropped ≥ 5 points after using the lever); fall back to softmax before 3 sessions. **AC:** simulated trainee who is hurt only by DETECTION converges to sampling DETECTION > 60% of the time after 20 sessions.

### TASK-P4-10 — Config import screen · P1 · D · 1.0 h
Files: `src/ui/screens/ConfigImport.tsx`, `src/db/repo.ts`
- [ ] File picker (no network), zod validation, hash display, activate/revert, footer `NOTIONAL PARAMETERS — NOT FOR OPERATIONAL USE`. **AC:** invalid file shows the failing path; sessions record the hash actually used.

### TASK-P4-11 — Instructor mode · P2 (second cut) · D · 2.0 h
Files: `src/ui/screens/Instructor.tsx`
- [ ] PIN-gated screen: choose scenario or bench id, set difficulty, enable 1×/2×/4× for DEMO, and (DEMO only) inject a chaos event during play. **AC:** injected events appear in the log with `TRIGGER` and are replayable.

### TASK-P4-12 — 3D EO/IR camera view · P1 · B · 3.0 h
Files: `src/render3d/{eoScene,models}.ts`
- [ ] Camera rig at antenna height following `operator.eoAzimuthDeg` and `eoElevDeg`; FOV 30° searching, 6° when locked, zoom caption; terrain visible. **AC:** DEMO-1 at T+35 in the EO view shows U1 and no drone, with the overlay `NO LOS — MASKED`.
- [ ] Procedural low-poly models (quad with spinning rotors, fixed-wing, bird flap, icosahedron blob), apparent size `lerp(18, 110, clarity)` px, payload at clarity ≥ 0.6, IR white-hot palette at night, fog haze and ghosting. **AC:** at clarity 0.2 only the blob is drawn, at 0.5 the shape appears, fog lowers the clarity readout.
- [ ] Reuse `render/hud.ts` as an overlay. **AC:** HUD text and reticle equal the 2D EO view at the same state.

**Checkpoint H31:** (3D, if attempted: EO/IR 3D view shows terrain occlusion.) AC-6 holds; EVAL pack plays and never changes difficulty; the validator rejects crafted bad specs; a TRAIN session's next scenario targets the weakest metric and the AAR names the levers.

---

## Phase 5 — Hardening, Golden Tests and Demo Rehearsal (H31 – H36)

### TASK-P5-01 — Feature freeze and regression · P0 · A · 1.0 h
- [ ] Freeze at H31; bump `SIM_VERSION`, regenerate golden fixtures once, record in `MEMORY.md`. **AC:** `npm run check` and `npm run test:e2e` are green on a clean clone.

### TASK-P5-02 — E2E suites · P0 · C · 1.5 h
Files: `tests/e2e/{airgap,truthLeak,layout,roundtrip}.spec.ts`
- [ ] Air-gap (route recorder, websocket listener), truth-leak, layout at 1366×768 and 1280×700 on Console/Briefing/HotWash/AAR, export→import round trip. **AC:** all four pass on the pinned Chromium (AC-11).

### TASK-P5-03 — Packaging and cold start · P0 · C · 1.5 h
Files: `tools/launcher/*`, `README-OFFLINE.txt`
- [ ] Final launcher binaries (Windows, Linux), pinned Chromium path, USB kit layout, fixed port 47260. **AC:** from plugging in the stick to the first scenario running takes under 2 minutes; cold start under 3 s on the minimum-spec laptop; `dist/` under 8 MB.

### TASK-P5-04 — Low-end performance pass · P0 · A · 1.5 h
- [ ] Profile on the minimum-spec laptop with a 100-track stress scenario. **AC (AC-1):** 60 fps at 100 live tracks (≥ 30 fps at the 150-entity cap), sim step under 1.5 ms, heap under 150 MB; low-fidelity toggle works if needed.

### TASK-P5-05 — Demo content and rehearsal · P0 · D · 2.0 h
- [ ] Preload three sessions (one TRAIN, two EVAL) and DEMO-2; rehearse the 3-minute script twice; record a backup screen capture. **AC:** a cold run of the script fits in 3:00 ± 15 s with the laptop in airplane mode.

### TASK-P5-06 — Pitch sheet and Q&A rehearsal · P0 · D · 1.0 h
- [ ] One-page architecture and metrics sheet; rehearse the judge prompts in `MEMORY.md` §5. **AC:** each team member can answer all prompts in under 30 s without notes.

### TASK-P5-07 — Final records · P0 · all · 0.5 h
- [ ] Update `MEMORY.md` status, decisions, traps; confirm every `Tasks.md` box reflects reality. **AC:** no unchecked P0 box without an explanation in `MEMORY.md` §2.

### TASK-P5-08 — 3D validation and hardware record · P1 · C · 2.0 h
Files: `tests/e2e/view3d.spec.ts`, `tests/unit/render3d/*.test.ts`
- [ ] Budget, leak, parity, layout, offline and fallback tests (`ARCHITECTURE.md` §8.11) under software WebGL on the pinned Chromium. **AC:** all pass; parity shows identical events and score for `viewMode` 2D and 3D.
- [ ] Run on at least one machine with a discrete GPU and record GPU, driver, tier and fps in `MEMORY.md` §2. **AC:** HIGH tier holds 60 fps on DEMO-1, or the shortfall is logged as technical debt.

### TASK-P5-09 — WebXR VR mode · P2 (first cut) · A · 6.0 h
Files: `src/render3d/{xr,vrPanel}.ts`
- [ ] Session request with `local-floor`, table-top scale 1:10,000, XR `FrameDriver` handoff and restore. **AC:** entering and leaving a session mid-scenario preserves tick continuity (state-hash check in an emulator run).
- [ ] Controllers and mapping (`ARCHITECTURE.md` §8.9) and the 1024×704 panel texture calling the same store actions as the DOM UI. **AC:** the input log shows quantised `applyTick` values only; panel buttons issue the same commands as the DOM buttons.
- [ ] Comfort rules, LOW tier, fixed foveation, 10-minute advisory. **AC:** the app applies no camera motion.
- [ ] Verification. **AC:** **a real-headset run is recorded in `MEMORY.md`**; otherwise the status stays "experimental, unverified" and the UI says so.

### TASK-P5-10 — 3D AAR replay · P2 · D · 3.0 h
Files: `src/render3d/aarScene.ts`, `src/sim/replay.ts`, `src/ui/aar/AARScreen.tsx`
- [ ] `ReplaySim.truthView()`, scene with truth wireframes and trails, operator ghost tracks, radar dome, EO cone, RF disc and shadow prisms, synced to the timeline playhead. **AC:** seeking updates the scene in under 100 ms; the guard allows `truthView` imports only from `src/ui/aar/**` and `src/render3d/aarScene.ts`.

**Checkpoint H36:** USB kit demonstrated on a clean low-end laptop, offline, in 2D; backup recording ready. 3D validated on at least one GPU machine if attempted; VR claimed only if a headset run is recorded.

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
| AC-12 | (3D) Same spec and inputs ⇒ identical events and score in 2D and 3D; 3D chunk lazy and absent from the main chunk; fallback to 2D works | P2-12, P3-12, P5-08 |
| AC-13 | (3D) No ground truth drawn in scored sessions; masked tracks have no live marker | P3-14, P4-12 |
| AC-14 | (VR) Session verified on a real headset and recorded, else labelled experimental | P5-09 |
