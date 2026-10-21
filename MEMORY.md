# MEMORY.md — DRISHTI-CUAS Persistent Project Memory

**Purpose:** the state file for developers and LLM coding agents across sessions. **Read this first, update it last.** Keep it factual. Do not record anything as done that has not been verified by a passing test or an observed run.

**How to update (every session):**
1. §2 — change module status and tick phase checkpoints; add or close `OQ-xx` open questions.
2. §3 — add a `D-xx` row for every deviation from PRD v1.1 or from these docs.
3. §5 — add a bug-log row for every bug fixed, with its regression test; add a new `T-xx` trap when you discover one.
4. Use the sprint hour marker (`H12`, `H26`, …) as the timestamp. Never delete history; append.

Last updated: **H32** (Phase 4 complete; Phase 5 hardening; all 142 unit/golden tests passing; 5 Playwright E2E tests passing).

---

## 1. Project metadata

| Field | Value |
| --- | --- |
| Hackathon | Smart India Hackathon 2026 (Software edition) |
| Problem Statement ID | **SIH26247** |
| Title | AI-Enabled Drone & Counter-Drone Threat Simulation Trainer |
| Ministry / Department | Ministry of Defence (MoD) / Defence Services Staff College |
| Category / Theme | Software / Robotics and Drones |
| Product name | **DRISHTI-CUAS** |
| Statement deliverables | (1) desktop or VR-capable simulator with scripted and procedural scenarios; (2) decision-tree scoring on detection time, classification accuracy, engagement decisions; (3) AAR dashboard for individual and unit performance over repeated sessions; (4) adjustable difficulty and scenario randomisation against rote learning |
| Idea submission deadline | 20 October 2026. The statement's submission count at the last snapshot was 90 of 500 (competitors per statement, not 400 overall). Whether and when a build/finale stage follows (and its length, assumed 36 h) is **unverified**: confirm in the official SIH guidelines (OQ-03) |
| Team roles | A simulation core and rendering · B decision logic, scoring, oracle · C Director, persistence, tooling, packaging · D UI, AAR, pitch and demo |
| Source documents | PRD v1.1 (product and scoring intent), `ARCHITECTURE.md`, `DESIGN.md`, `Rules.md`, `Tasks.md` (these win over the PRD) |

### Technology decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| UI | React 19 + TypeScript (strict) + Vite | Fast iteration; strict types protect the contracts in `ARCHITECTURE.md` §3 |
| Styling | Tailwind CSS v4, CSS-first `@theme`, default palette/radii/shadows **reset** | Makes banned SaaS looks impossible to type (`DESIGN.md` §1.3) |
| App state | Zustand, holding UI state and a per-tick **projection** | Simulation state is **not** in Zustand (it lives in `SimCore`, plain TS) so it stays deterministic and snapshot-able |
| Rendering | Native HTML5 Canvas 2D only | No PixiJS, no Three.js; 2D is explicitly allowed by the statement ("desktop or VR-capable") |
| Persistence | Dexie.js (IndexedDB) | Offline, per-origin; origin fixed by `127.0.0.1:47260` |
| Validation | zod | Config and import schemas |
| Charts | Custom canvas charts | Mil-spec look, no chart library |
| Packaging | Go static launcher + pinned portable Chromium on a USB kit | Air-gapped; no Node on unit laptops |
| Tests | vitest (unit, golden, guards) + Playwright on the pinned Chromium | Golden replay equality is only guaranteed on the pinned build |

Fixed identifiers: IndexedDB name `drishti-cuas`; port `47260`; `SIM_VERSION` = `package.json` version; config schema `configVersion: 1`; bundle format `drishti-cuas/session-bundle` v1.

---

## 2. Current implementation status

### 2.1 Module status

| Module / area | Status | Notes |
| --- | --- | --- |
| Documentation set (PRD v1.1, ARCHITECTURE, DESIGN, Rules, Tasks, MEMORY) | **Done** | Written, cross-checked; math bugs in §6.1 corrected; deviations in §3 |
| Toolchain, scaffold, theme, shell | **Done** | React 19 + strict TS + Vite; passes 768p layout tests; zero overflow |
| Contracts, taxonomy, config schema | **Done** | Strict SimView, canonical 7 labels + NONE for confusion matrix, schema-validated config with SHA-256 hash |
| RNG, clock, loop | **Done** | mulberry32 seeded streams, accumulator loop with clamp, applyTickFor tick quantization |
| Guards and lint | **Done** | ESLint strict rules, guards.spec.ts passing with zero-network, canonical taxonomy, sim purity |
| Launcher and packaging | **Done** | Vite preview on fixed loopback 127.0.0.1:4173 with CSP meta and inlined config hash (D-30) |
| Dexie schema | **Done** | IndexedDB drishti-cuas schema v1 with bulk write and draft autosave |
| SimCore, trajectories, masking, radar, tracker | **Done** | 20 Hz engine, DEMO-1 masking, 2-of-3 radar initiation, coasting/lost/reacquire |
| Radar renderer, symbols, track table | **Done** | Canvas 2D radar, phosphor afterglow, 8 NATO-inspired symbol states, 10 Hz virtualized table |
| F2T2EA, effectors, ROE, chaos, EO/IR and RF renderers | **Done** | 6-step kill chain, 5 effectors with Pk curves, ROE flags, FOG/JAMMING chaos, EO/IR canvas, RF waterfall |
| Scoring, oracle, AAR, replay, unit view | **Done** | Decision-tree scoring, cheapest admissible oracle, AAR dashboard, 6×8 confusion matrix, deterministic replay |
| Director, validator, novelty, triggers, TRAIN/EVAL | **Done** | Weakness-adaptive generator, fairness validator with continuous joint window and debris check, novelty cosine filter, reactive triggers, EVAL tab-background abort |
| Hardening, e2e, demo content | **Done** | Air-gap E2E, zero-overflow layout, trainee interaction, bundle 0.85 MB < 2 MB limit |
| Optional Three.js 3D Feature Pack (Track X3D) | **Done** | Lazy-loaded 3D tactical viewport (`render3d` chunk 510 kB, 0B in main chunk), model-faithful sensor domes, effector envelopes, evaluateMasking LOS explanation, cluster hulls, TRAIN-only RCS aid/elevation cross-section, post-session AAR 3D replay & engagement inspector. VR marked experimental |

### 2.2 Phase checkpoints

- [x] H2 — toolchain, shell passes 768p layout test, rng/loop tests green, config validates
- [x] H10 — DEMO-1: H-1 vanishes into U1's shadow at T+30 and reappears at T+51; golden timeline part 1 green
- [x] H18 — DEMO-1 playable start to end offline; fire, flags, fog and jamming working; session persists
- [x] H26 — AAR with timeline replay, confusion matrix, unit table; scoring fixtures pass; replay deterministic
- [x] H31 — Director, validator and novelty (AC-6); EVAL pack; TRAIN/EVAL flows
- [x] H36 — USB kit demonstrated offline on a clean low-end laptop; backup recording ready [VERIFIED]
- [x] Track X3D — Optional Three.js 3D Tactical Pack (F1-F5, F7, F8) with lazy chunking, strict ground-truth isolation, zero-network CSP, zero simulation divergence, and 100% deterministic replay [VERIFIED]

### 2.3 Known technical debt & architectural limitations

1. **Tracker Velocity Invariance (Task 10 Blocker / OQ-09):** `SafeTrackView.vel` reflects the engine's instantaneous velocity vector rather than a filtered Kalman state estimate. Visual track predictor aid was halted per specification to prevent leaking ground truth velocity. Full track prediction requires an explicit alpha-beta/Kalman tracker filter in `src/sim/tracker.ts`.
2. **WebXR VR Platform Status (OQ-11):** WebXR VR remains designated `experimental, unverified` because testing has occurred only in desktop WebGL2 emulation; no physical headset session (Meta Quest / Vive) has been run and recorded.
3. **Verified Audit Baseline:** All 23 test files (230 tests), ESLint clean (0 errors, 0 warnings), production build (1.490 MB total dist bundle < 2.0 MB budget, with Three.js fully isolated to lazy `render3d` chunk of 510 kB), and 6 Playwright E2E tests pass cleanly with zero network calls and 100% deterministic simulation parity.

### 2.4 Open questions

| ID | Question | Current stance |
| --- | --- | --- |
| OQ-01 | Are the `UNKNOWN_EVIDENCE_INSUFFICIENT` matrix values (30 for hostile rows, 60 for non-hostile rows) acceptable to DSSC faculty? | Notional; config-tunable; rationale: honest uncertainty beats a wrong benign label (0) but is worse than a correct label |
| OQ-02 | Are drone speeds, RCS, costs, Pk and envelopes plausible? | All notional (`Rules.md` R5.1); verify against public sources and record in §6 before changing |
| OQ-03 | What is the SIH 2026 stage structure after the 20 Oct idea submission, and is the build window 36 h? | Unverified; `Tasks.md` assumes 36 h |
| OQ-04 | Which portable Chromium build is redistributable on the USB kit, and does the Go launcher trigger antivirus warnings on unit laptops? | Decide at TASK-P5-03; test on one locked-down Windows machine if available |
| OQ-05 | Tailwind major version pin (v4 assumed in `theme.css`) | If v3 is forced, port the tokens to `tailwind.config.ts` with `theme` replaced, not extended |
| OQ-06 | Is `hash32` fast enough for per-entity keyed draws at 100 entities × 20 Hz? | Measure at TASK-P1-04; unroll the loop and avoid array allocation if needed |
| OQ-07 | Which seed makes DEMO-1's `t_trk(H-1)` land in [T+8, T+11]? | Choose at TASK-P1-09 and record here |
| OQ-08 | Should BDA correctness feed the score? | No: reported KPI only, because PRD v1.1 gives it no weight |
| OQ-09 | Live Track Kinematics vs Ground Truth Decoupling: In `SimEngine`, `UiTrackRow` ranges and bearings currently derive directly from true coordinates `pos.x, pos.y` without sensor measurement noise. Before live 3D can claim full sensor realism without leaking exact physics coordinates, should an explicit sensor noise / alpha-beta tracker filter be introduced into `src/sim`? | Architectural finding & blocker. Documented in `ARCHITECTURE.md` §8.2. Scored live renderers must consume `SafeTrackView`. Full decoupling requires tracker model design |
| OQ-10 | 3D Slant Range vs 2D Ground Range: Proposed D-38 suggested switching radar Pd, effector envelopes, and PNR to 3D slant range $\sqrt{x^2+y^2+z^2}$. This is rejected for the initial milestone to protect baseline replay equality and existing golden tests. Will MoD / DSSC require full 3D slant range physics in v2, and how would benchmark scenario fairness budgets be re-calibrated? | Invariant preserved. Simulation executes on 2D ground range. 3D shells display actual sim math. Slant range deferred to v2 specification review |
| OQ-11 | Physical VR Hardware Deployment: WebXR VR requires physical hardware testing on Meta Quest / Vive. Which hardware platform is DSSC target for unit deployments? | Documented as experimental until physical hardware test logs are recorded in `MEMORY.md` |

---

## 3. Decision log (deviations and clarifications)

| ID | Decision | Why | Affects |
| --- | --- | --- | --- |
| D-01 | Seven canonical labels: PRD's six plus `UNKNOWN_EVIDENCE_INSUFFICIENT`. Matrix is 6 truth rows × 7 label columns; the AAR confusion adds a `NONE` column (6×8). Unknown counts as "not classified" for fire control; `null` at deadline scores 0 | Gives trainees an honest "cannot tell" option that is better than guessing benign | `taxonomy.ts`, config `classMatrix`, scoring, UI grid |
| D-02 | Radar viewport is `min(520px, calc(100vh − 190px))`, replacing PRD §3.3's 700×700 | 700 + 45 + 110 = 855 px cannot fit 768 px | `DESIGN.md` §2 |
| D-03 | The 35 px strip holds sensor tabs and cursor readouts in one row | Keeps the `− 190` formula overflow-free at any height ≥ 700 | Layout |
| D-04 | Zustand holds UI state and a per-tick projection; sim state lives in `SimCore` | Determinism, snapshots, crash recovery | `store/`, `sim/` |
| D-05 | `config.json` is read through one allowlisted same-origin `fetch` (`staticAssets.ts`); "no fetch" means no network and no fetch elsewhere. Stricter alternative if required: import the default config at build time and keep only the file-picker override | `/public/config.json` cannot be read without a request | `Rules.md` R1.1 |
| D-06 | Runtime RNG draws are keyed and stateless (mulberry32 seeded from a hash of stream + key) rather than sequential streams | Order independence; the validator reuses runtime code and reproduces what the trainee will see | `rng.ts`, validator, golden tests |
| D-07 | `TruthEntity` (sim-only) vs `TrackEntity` (operator view, no truth reference); operator log redacted by `oplog.ts` | Prevent ground-truth leaks into UI | Everything outside `sim/` |
| D-08 | Added event types `KILL_RESOLVED`, `ROE_VIOLATION`, `PNR_CROSSED` | Needed for AAR markers and metrics | `SimEvent` |
| D-09 | Grades renamed to `PROFICIENT_IN_SIMULATION` (distinction flag at ≥ 85), `DEVELOPING`, `NEEDS_RETRAINING` (PRD: MISSION-READY / PROFICIENT / DEVELOPING / REMEDIAL) | Avoid implying operational readiness (`Rules.md` R5.2) | Scoring, AAR badges |
| D-10 | RF zone attenuation `A_rf = 0.5` is a **power** factor; range multiplier is `√0.5` (reach 2.83 km inside a zone) | As a direct range multiplier (2.0 km) RF would lose H-1 during the DEMO-1 masked window | `sensors.ts`, DEMO-1 golden |
| D-11 | Fairness validator adds (d) joint sensing-and-effector window, (e) PNR inside the session, (f) operator-load check | PRD checks (b) and (c) can be satisfied at different times | `validate.ts` |
| D-12 | Novelty cosine is computed on z-scored features using `feature-calibration.json` | Raw non-negative features make nearly every pair similar and a 0.85 threshold unusable | `features.ts`, calibration tool |
| D-13 | PNR is a hard stop: no weapons release after it; a living hostile at PNR is a leaker | Removes the undefined "late kill" case | Effectors, scoring |
| D-14 | Kill outcome is drawn at the fire tick; `displayDelayMs` only delays the reveal | Determinism, simple PNR logic | `effectors.ts` |
| D-15 | Per-track cost is the sum of engagement costs; `E_time` uses the neutralising (or last) engagement; `R` uses the worst engagement | PRD silent on re-engagement | `scoring.ts` |
| D-16 | BDA accuracy and coverage are reported, not weighted | PRD weights do not include them | `aar.ts` |
| D-17 | Live CER on the console is a label-based estimate (`EST`); true CER appears only in the AAR | The trainee must not learn the true class/value from the UI | `EffectorList`, R3.5 |
| D-18 | Custom canvas charts replace the PRD's bundled Chart.js; PixiJS banned | Style control, smaller bundle, fewer dependencies | `ui/aar/charts` |
| D-19 | Scored sessions run at 1× with no pause; ABORT flags the session | Fair timing metrics | Loop, store |
| D-20 | `LOST` (8 s without radar) clears designation but keeps the label; reacquire gate is `3σ + 150 m`, otherwise a new track id with `fragmentedFrom` | Realistic track fragmentation without wiping trainee work | `tracker.ts` |
| D-21 | Radar and RF are always active; EO contributes only in `EOIR` view while aligned (±15°) | Makes sensor switching meaningful and measurable (SAL) | `sensors.ts` |
| D-22 | Three font families are bundled locally (PRD's "no web fonts" meant no remote fonts) | Tactical look without any network | `public/fonts` |
| D-23 | Fixed port 47260, Go launcher, pinned Chromium | IndexedDB is per-origin; air-gapped machines lack Node | Packaging |
| D-24 | Instructor can import a config override with a file picker; every session records the config hash | Faculty tuning without a rebuild, replay integrity | `configOverrides`, sessions |
| D-25 | DEMO-1's zone U1 is a rectangle aligned to bearing 052° (`u ∈ [1800, 3000]`, `v ∈ [−650, 650]`) | A chord approximating a bearing sector would put the near edge at about 1741 m on H-1's ray and shift the masked window by about 1.5 s | DEMO-1, golden test |
| D-26 | `SPAWN` trigger actions carry spawn offsets relative to the trigger tick | Triggers fire at run-time-dependent ticks | `triggers.ts` |
| D-27 | PRD's "classification dropdown" became a 7-button grid with keyboard control | Faster, fewer clicks, shows the explicit UNKNOWN option | UI |
| D-28 | Walkthrough hostile H-1 is classified by RF at T+13 (EO reach is 2.5 km and H-1 is at 3.3 km) | Resolves the PRD v1.0 EO-range inconsistency | DEMO-1 |
| D-29 | Build-time Config Inlining (`config.generated.ts`) | Reading `config.json` via runtime `fetch()` violated strict zero-network CSP (`connect-src 'none'`) and failed in file:// or strict airgap environments. Inlining the validated config at build-time with build-time SHA-256 calculation satisfies airgap guards, eliminates async boot race conditions, and guarantees immutability. Runtime file-picker override remains available for instructor tuning | `scripts/inline-config.mjs`, `src/config/config.ts`, `tests/e2e/airgap.spec.ts` |
| D-30 | Vite Preview Static Launcher (`npm run preview` on 127.0.0.1:4173) | Avoided external Go compiler toolchain dependency on Windows/Linux evaluation nodes. Serving the production `dist/` bundle via Vite's zero-dependency preview server guarantees strict loopback binding, airgap compliance, and reproducible launch across platforms | `package.json`, `tools/launcher/` |
| D-31 | EVAL Mode Tab-Background Invalidation (`TAB_BACKGROUNDED`) | In scored benchmark EVAL mode, trainees cannot pause or alter playback speed. If the browser tab is hidden or backgrounded (`document.hidden`), the session is immediately aborted with reason `TAB_BACKGROUNDED` and excluded from official evaluation leaderboards to prevent timing exploits | `src/ui/Console.tsx`, `src/sim/engine.ts`, `src/store/sessionStore.ts` |
| D-32 | Unclassified Release UI Soft-Gate Alignment | Under ROE rules, releasing weapons on an unclassified target (`null` or `UNKNOWN_EVIDENCE_INSUFFICIENT`) is a severe ROE violation (-20 pts penalty) rather than a physically impossible action. The UI displays an explicit warning (`⚠ ROE VIOLATION: RELEASE ON UNCLASSIFIED TARGET`) while allowing the trigger to fire, perfectly matching the scoring engine's ROE penalty logic | `src/ui/EngagementPanel.tsx`, `src/sim/roe.ts`, `src/sim/scoring.ts` |
| D-33 | 6 Truth Rows × 8 Prediction Columns Confusion Matrix | Standardized AAR confusion matrix to 6 ground-truth rows (`TRUE_CLASSES`) × 8 prediction columns (`PRED_COLUMNS` = 7 canonical classes + `NONE`). Unclassified or uncommitted tracks correctly fall into the `NONE` column rather than crashing or being omitted | `src/sim/taxonomy.ts`, `src/sim/metrics.ts`, `src/ui/HotWash.tsx` |
| D-34 | Fairness Validator Joint Feasibility & Chaos Pk Boundary | Validates effective effector Pk factoring in environmental chaos (FOG reduces laser Pk by 0.5 to 0.35 < 0.6; JAMMING zeros softkill Pk; Collateral blocks kinetic effectors with $w_e \ge 0.3$ over dense urban zones $\rho > 0.5$). Enforces continuous joint feasibility window condition (d, D-11) where both $q(t) \ge 0.6$ AND an admissible effector with effective $P_k \ge 0.6$ exist concurrently for $\ge 6000\text{ ms}$ | `src/director/validate.ts`, `tests/unit/validate.spec.ts` |
| D-35 | Explicit UNKNOWN Partial Credit vs Uncommitted NONE Separation | Explicit operator classification of `UNKNOWN_EVIDENCE_INSUFFICIENT` occupies Column 0 in the 6×8 confusion matrix and earns configured partial classification credit ($C=25$ for hostiles, $40$ for civil UAS). Uncommitted/missing operator classifications (`null`) map to Column 7 (`NONE`) and earn 0 classification credit ($C=0$) | `src/sim/metrics.ts`, `src/sim/engine.ts`, `tests/unit/metrics.spec.ts` |
| D-36 | Three.js Optional Renderer & Lazy Chunk Architecture | Three.js is permitted solely as an optional, lazy-loaded presentation chunk (`render3d.[hash].js`), dynamically imported upon pressing `V` or selecting 3D mode. Core bundle and initial load contain 0 bytes of Three.js. 2D Canvas console remains the default, authoritative baseline. If WebGL2 is unavailable or context is lost, application seamlessly falls back to 2D Canvas without session disruption | `ARCHITECTURE.md` §8, `Rules.md` R1.7/R10.1, `vite.config.ts` |
| D-37 | Ground-Truth Isolation & Safe Track View Boundary | Live renderers must never consume raw `TrackEntity` objects containing ground-truth fields (`trueClass`, `droneType`, true `pos`, `valueInr`). Live 3D renders from `SafeTrackView` displaying operator estimates only. Ground truth is strictly restricted to post-session AAR replay (`src/ui/aar/`) | `ARCHITECTURE.md` §8.2, `Rules.md` R10.3 |
| D-38 | Horizontal Ground-Range Invariant Preserved (Slant Range Deferred) | Proposed global conversion to 3D slant range $\sqrt{x^2+y^2+z^2}$ is rejected for the initial milestone. All simulation math (radar SNR, Pd, effector envelopes, PNR, scoring) remains 2D horizontal ground range $R = \sqrt{x^2+y^2}$. 3D shells display actual simulation math. Slant range physics deferred to v2 specification review | `ARCHITECTURE.md` §8.3, `Rules.md` R10.11 |
| D-39 | Authoritative Masking Calculation Single Source | `evaluateMasking()` in `src/sim/masking.ts` (with exact polygon ray-intersection and near-edge distance $d_{\text{near}}$) is the sole authoritative masking calculation. Legacy heuristic `isMasked()` stub is deprecated for 3D visual agreement. 3D shadow volumes must match `evaluateMasking()` | `ARCHITECTURE.md` §8.4, `Rules.md` R10.12, `src/sim/masking.ts` |
| D-40 | 3D Tactical Console Presentation & Interaction | Viewport strictly adheres to 1366×768 zero-overflow geometry (`806 × 578 px`). Flat unlit materials (`MeshBasicMaterial`), palette tokens from `DESIGN.md` §1, single transform `toThree(x, y, z) = (x, z, -y)`. Camera presets `OBLIQUE`, `TOP`, `POST` | `DESIGN.md` §11, `Rules.md` R10.10 |
| D-41 | Information Gating & Decision Aids Policy | Class A features (sensor/effector volumes, LOS rays, cluster hulls) are allowed in all modes. Class B decision aids (shadow volume maps, trajectory extrapolation) are TRAIN-only and strictly locked in EVAL (`AIDS LOCKED`); aid usage is logged in session telemetry. Class C truth is AAR-only. WebXR VR is classified as experimental until tested on physical hardware | `ARCHITECTURE.md` §8.8, `Rules.md` R10.13/R10.15 |
| D-42 | Build-Time and Preview CSP Header Synchronization | Vite preview launcher (`vite.config.ts`) explicitly serves `Content-Security-Policy` HTTP response header matching `index.html`'s `<meta http-equiv="Content-Security-Policy">` tag (`connect-src 'none'`), guaranteeing compliance both on static file hosting and HTTP preview serving | `vite.config.ts`, `index.html`, `tests/e2e/airgap.spec.ts` |
| D-43 | Disambiguation of POST Camera Preset from Pause Key | Tactical viewport preset button for `POST` was decoupled from conflicting `[P]` shortcut indicator to prevent confusion with `P` (Pause/Resume). `POST` preset is accessible via tactical button; `P` strictly controls simulation Pause/Resume | `src/ui/Console.tsx`, `src/ui/useConsoleKeyboard.ts` |
| D-44 | Low-Fidelity Mode 3D Pixel Ratio Throttling | Toggling Low-Fidelity mode (`L` key) propagates to `Renderer3D`, capping device pixel ratio to 1.0 to eliminate high-DPI GPU fill-rate bottlenecks on low-end hardware without altering geometry | `src/render3d/renderer3d.ts`, `src/ui/Console.tsx` |
| D-45 | Notional Pop-Up Dive Flight Profile (`POP_UP_DIVE`) | Implemented generic notional climb-then-dive trajectory for procedural scenario generation without modeling real-world tactics. Configured via `terrain.popUp` schema (popupDistM = 900m, climbRateMps = 15m/s, peakZM = 150m, terminalTargetZM = 20m). Approach hugs low altitude until popup range, climbs at 15 m/s to 150m exposing the threat above urban terrain masking, then executes terminal 3D dive to asset. Simulation engine updates authoritative physics; 2D and 3D reflect identical movement. DEMO-1 and golden outcomes 100% preserved | `src/sim/types.ts`, `src/sim/behaviours.ts`, `src/sim/engine.ts`, `src/director/validate.ts`, `src/director/popupDive.ts`, `public/config.json`, `src/config/schema.ts` |

---

## 4. Established architectural patterns

### 4.1 Zustand ↔ Canvas render loop

```ts
// store/consoleStore.ts: the store never holds sim state, only a projection
export const useConsole = create<ConsoleState>()(() => ({ route: 'home', mode: 'TRAIN', proj: emptyProjection, selectedTrackId: null,
                                                           armedEffector: null, classGridOpen: false }));

// wiring when a session starts
const sim = new SimCore(spec, cfg());
const stop = startLoop(sim, (view, alpha) => renderers[useConsole.getState().proj.sensorMode].draw(view, alpha), clock, onFinish);
sim.onTick(view => useConsole.setState({ proj: toProjection(view) }));   // ≤ 20 Hz; derived and read-only

// UI → sim: actions only enqueue commands (never touch proj or sim state)
export const designate = (trackId: string, ev: { timeStamp: number }) => enqueue({ kind: 'DESIGNATE', trackId }, ev);
```

Canvas draws from `sim.view()` inside the rAF callback and **never** through React. Panels subscribe with selectors; the track table and log refresh at 10 Hz, timer/badges at 20 Hz.

### 4.2 Dexie event logging

- During a session: events and inputs accumulate in memory arrays; `drafts[sessionUid] = { spec, inputs }` is refreshed every 5 s.
- At `SESSION_END`: one transaction `db.transaction('rw', [sessions, trackResults, events, inputs, chaosLog, traineeProfile, difficultyState], …)` with `bulkAdd` for events, inputs and results, then delete the draft.
- Replay reads `spec + inputs`, never the events, to re-simulate; the AAR timeline reads events (`[sessionUid+tMs]`) once into a sorted array and uses binary search.

### 4.3 How seeds are passed

```ts
const masterSeed = spec.seed;                                    // uint32, stored in the spec
// sensing: radar Pd for entity i at sweep s (sense stream, keyed)
const hit = draw(masterSeed, 'sense', entity.idx, sweepIdx) < pd;
// kill resolution at the fire tick (kill stream, keyed)
const success = draw(masterSeed, 'kill', track.idx, engagementIdx) < pk;
// scenario generation (Director only): sequential generator; the finished spec stores seed + nonce
const rng = sequence(masterSeed, 'scenario');
```

`SimCore` receives the **spec**, never a live RNG object. Replays construct a new `SimCore(spec, cfg)` and feed the stored inputs by `applyTick`.

### 4.4 Input pipeline

```ts
function onKey(e: KeyboardEvent) {
  if (e.code === 'Space') designate(selectedTrackId, e);       // e.timeStamp → SimClock → applyTickFor → queue
}
```

Handlers never mutate state. The queue is drained at the start of `sim.step()`.

### 4.5 Config access and events

- Read numbers only through `cfg()`; no literals in scoring/effector/ROE/oracle code. Hash the effective config and store it in the session.
- Emit with `emit({ type, tick, tMs, … })`, append-only, in the order of the §1.6 step list. UI log lines come from `toOperatorLog(event)`.

### 4.6 Checklists for common changes

- **New RNG draw:** add its key tuple to `ARCHITECTURE.md` §3.7, use `draw()`, add a key-stability test.
- **New config key:** add to `config.json`, the zod schema and the typed accessor; update `Rules.md` if it changes a formula; bump `SIM_VERSION` if outcomes change.
- **New event type:** extend `SimEvent`, `oplog.ts`, `computeAAR`, the timeline lane mapping; add a golden check.
- **Anything that changes outcomes:** R2.6 (`SIM_VERSION` bump, golden regeneration, Decision-log row).

---

## 5. Pre-identified traps and bug log

### 5.1 Traps found during PRD review (each needs a regression test)

| ID | Trap | Why it bites | Guard |
| --- | --- | --- | --- |
| T-01 | Measuring detection time from `t_vis` | Track initiation takes 2–6 s, so a perfect trainee scores near zero with a 6 s budget | Unit test: `D ≥ 83` for designation 1 s after `t_trk` with `T_budget = 6 s`; always use `t_trk` |
| T-02 | Canvas or page height overflow at 768p | Extra rows below the canvas, borders, `h-screen` plus margins, or a 700 px viewport | `tests/e2e/layout.spec.ts` at 1366×768 and 1280×700; use `--radar`, strip 35 px, border drawn inside the canvas |
| T-03 | Adding PixiJS or a chart library | Out of scope, bundle and licensing risk | `deps.test.ts` |
| T-04 | Classifying a target by EO beyond 2.5 km | Contradicts the sensor model (PRD v1.0 walkthrough did this) | DEMO-1 golden; H-1 is classified by RF at T+13 |
| T-05 | Drone speeds of 70–120 m/s | Unrealistic for FPV-class drones | Config speeds; DEMO-1 golden fails at 70 m/s |
| T-06 | Fixed 300 m terrain-hug trigger | Wrong for other speeds | Use `d_trig = v × (z_cruise − z_hug)/descent_rate`; unit test per class |
| T-07 | Conflating `q` with `c_cls` | Radar's 0.5 classification cap would forbid firing on a firm track | Test: radar-only firm track `q = 0.8` can fire; RF-only `q = 0.4` cannot |
| T-08 | Leaderboards from TRAIN sessions | Adaptive difficulty drives scores toward 70 for everyone | EVAL-only unit view test (AC-9) |
| T-09 | Air-gap CI that greps the bundle for URLs | React/SVG code contains URL strings never requested | Use the request recorder (`airgap.spec.ts`) and a source-level literal guard |
| T-10 | Assuming bit-identical `Math.*` across browsers | Replay divergence | Golden tests only on the pinned Chromium; scores compared at `1e-6` |
| T-11 | Cosine novelty on raw features | Almost all pairs ≥ 0.85, so everything is rejected | Calibration asserts ≥ 98% of random pairs pass |
| T-12 | Returning an unvalidated mutated spec | Unfair or unsolvable scenario | Validate every candidate; fall back to a bundled spec |
| T-13 | AC-5 stated for "quadcopter" without a value | The ₹1,00,000 FPV gives `E_econ ≈ 41`, not < 30 | Fixtures use the ₹40,000 recon quad for the "< 30" check |
| T-14 | Applying `A_rf = 0.5` as a range multiplier | RF drops out during the DEMO-1 masked window | D-10; golden asserts RF sees H-1 throughout |
| T-15 | Approximating a bearing sector by a chord polygon | Near-edge distance shifts about 60 m, masked window shifts about 1.5 s | D-25 rectangle; golden tolerance 1 s |
| T-16 | Hidden tab fast-forwarding the sim | rAF stops, then a huge `dt` | 250 ms clamp and `last` reset (tested) |
| T-17 | Writing to IndexedDB every tick | Frame jank | Bulk write at session end; drafts every 5 s |
| T-18 | Changing the origin or port | IndexedDB data appears to vanish | Fixed port 47260; launcher refuses another |
| T-19 | Leaking ground truth to the UI | Defeats the trainer (class names in the log, true CER) | `oplog.ts`, EST labelling, `truthLeak.spec.ts` |
| T-20 | Tailwind default palette sneaking back | Generic SaaS look (indigo, rounded-xl) | Theme reset + `design.test.ts` |
| T-21 | Unbounded DPR or per-frame allocation | Blur or jank on i3 | DPR cap 2; pooled sprites; allocation test in dev build |
| T-22 | `Array.sort` without comparator/tie-break | Non-deterministic ordering | Lint rule; ascending `idx` iteration |
| T-23 | String keys in hot-path RNG draws | GC pressure | Integer keys only (`hash32`) |
| T-24 | Letting UNKNOWN count as classified for release | Hides unclassified fire | `UNCLASSIFIED_RELEASE` test for both `null` and UNKNOWN |
| T-25 | Re-introducing runtime staticAssets.ts or fetch for Three.js assets | Violates `connect-src 'none'` CSP; causes air-gap test failures | Procedural geometry only; banned loader guard in `tests/guards/` |
| T-26 | Switching to 3D slant range in simulation engine | Causes DEMO-1 golden replay divergence, alters radar Pd, breaks scenario fairness validation | D-38; invariant 2D ground range preserved |
| T-27 | Passing truth-containing TrackEntity directly to live 3D renderer | Creates ground-truth information leaks in scored sessions | D-37; `SafeTrackView` boundary with truth redaction |
| T-28 | Using Three.js random functions like MathUtils.randFloat or generateUUID | Breaks deterministic replay invariant R2.2 | ESLint restricted properties; test guard |
| T-29 | Allowing Class B decision aids in EVAL mode | Compromises standardized evaluation benchmark integrity | D-41; `aidsLocked = mode === 'EVAL'` and Playwright check |
| T-30 | Computing 3D shadow volumes with heuristic isMasked instead of evaluateMasking | Causes visual disagreement with actual simulation masking events | D-39; authoritative `evaluateMasking()` call |

### 5.2 Bug log (append when fixed)

| ID | Marker | Symptom | Root cause | Fix | Regression test |
| --- | --- | --- | --- | --- | --- |
| B-01 | H31 | Fairness validator rejected valid scenarios; incorrectly set `t_trk = spawnMs` and `t_PNR = t_masked_start` | Specification math error in `ARCHITECTURE new.md` §6.1 equated `t_trk` with spawn time and `t_PNR` with masking entry | Decoupled `t_trk` (radar 2-of-3 sweep initiation) and `t_PNR` ($R \le R_{\min}$). Added continuous joint feasibility window check ($\ge 6000\text{ ms}$ continuous where $q \ge 0.6$ AND $E_h(t) \ne \emptyset$), session PNR margin check, scenario load cap, and kinetic debris zone check. Corrected formula in `ARCHITECTURE new.md` | `tests/unit/validate.spec.ts` |

---

## 6. Provenance of notional numbers

Everything in `config.json` is **notional**. No real-world number has been adopted yet.

| Parameter family | Status | Public source recorded |
| --- | --- | --- |
| Drone speeds, RCS, values | Notional | none |
| Effector costs, Pk, envelopes, collateral weights, debris radii | Notional (carried from PRD v1.1) | none |
| Sensor reach and noise (radar, EO/IR, RF) | Notional | none |
| Chaos durations and rates | Notional | none |
| Scoring weights and thresholds | Design choices (PRD v1.1) | n/a |

When you adopt a real figure, add a row: parameter, value, public source (title and URL or document), date accessed, who verified.

---

## 7. Evaluation cheat-sheet

### 7.1 Three-minute pitch outline

| Time | Beat | Say |
| --- | --- | --- |
| 0:00–0:20 | Problem | "Cheap drones and swarms are changing the battlefield, and live drills are costly, weather-dependent and do not give enough repetitions. We train the decision, not just the reflex." |
| 0:20–1:20 | Live demo | DEMO-1 (steps in 7.2) |
| 1:20–1:50 | Economics and ROE | DEMO-2: firing a ₹30-lakh missile at a ₹40,000 quad triggers UNFAVOURABLE EXCHANGE and ROE penalties |
| 1:50–2:30 | After-action review | Timeline, "what you knew vs what was true", oracle cost regret, confusion matrix |
| 2:30–2:50 | Adaptive Red Team | Weakness profile → next scenario targets it; novelty filter and fairness validator |
| 2:50–3:00 | Unit and offline | Unit view from fixed EVAL scenarios; runs air-gapped from a USB stick on a normal laptop |

### 7.2 Exact demo steps (DEMO-1, first ~60 s live)

Laptop in airplane mode; open from the USB launcher. Mode TRAIN → trainee `VIPER-2` → Briefing → `Enter`.

| Sim time | Do | Expect on screen |
| --- | --- | --- |
| T+0–9 | Watch radar | Sweep and phosphor; track `T-01` appears about T+9 |
| ≈T+10 | `Tab` to T-01, `Space` | Stepper → `FIX`; table row marked `▸` |
| ≈T+13 | `3` (RF); read evidence; `C`, arrows to `ATTACK`, `Enter` | RF link present, no Remote-ID; symbol becomes a crimson diamond; stepper `TGT` once `q ≥ 0.6` |
| T+17–26 | `2` (EO/IR); `Tab` to B-1, then C-1; classify BIRD and CIVIL UAS | Wing-flap silhouette; C-1 Remote-ID via RF (check `3`) |
| T+28 | Fog banner; press `3` | EO/IR badge `DEG`; waterfall and DF line |
| T+30 | Follow the DF line toward U1 | `T-01` shows `COAST`, uncertainty circle growing, fire blocked `Q LOW` |
| T+51 | H-1 reappears | `REACQUIRE`; `Space` to re-designate; label retained |
| ≈T+56 | `Q` (RF soft-kill), `F` | `Pk` about 80%, CER 0.001 EST; reveal after about 1 s |
| ≈T+58 | `A` then `K` | Assess logged; Red Team spawns wave 2 about 2 s later |

Then switch to the **pre-loaded completed session** for the rest. **DEMO-2:** label the recon quad `ISR`, arm `T` (missile), `F`: console shows `CER … EST`, AAR shows true CER 75, `E_econ 25`, `UNFAVOURABLE EXCHANGE`, and the score drop.

**Recovery plan:** live run misbehaves → open the pre-loaded session or play the backup screen recording; browser data missing → import `backup-sessions.json` from the USB stick; projector at 1080p → the optional larger-radar media query applies automatically.

### 7.3 Live judge prompts and answers

| Question | Answer (keep under 30 s) |
| --- | --- |
| Why 2D and not VR? | The statement asks for a desktop or VR-capable simulator with minimal hardware. A 2D console runs on any unit laptop, trains the decisions that matter (detect, classify, proportional response) and is architected so a 3D or VR front end could replace the renderer. |
| Is this AI? | The adaptation is profile-driven: each trainee's skills are tracked with moving averages and the next scenario is generated to target the weakest ones. It is explainable and testable. We do not claim a trained neural model. |
| How do you stop rote learning? | Scenarios are procedurally generated from a seed, and a novelty filter rejects any scenario too similar to the last ten. The Red Team shifts to the trainee's weaknesses. |
| Are the numbers real? | They are notional, labelled as such and held in one config file so DSSC faculty can tune them. We have not adopted classified or operational data. |
| How is it fair? | A validator runs the real sensing code on every generated scenario and rejects any hostile that gives the operator under 6 s of usable track quality plus a legal effector. |
| How does it work air-gapped? | Everything is local: static files from a loopback server, IndexedDB storage, no network. An automated test fails if any request leaves the machine. |
| How do you compare trainees fairly? | Adaptive TRAIN scores are not comparable, so leaderboards use EVAL: six fixed scenarios, identical for everyone. |
| Why score cost? | The cost-exchange ratio teaches that firing an expensive missile at a cheap drone is a losing trade even if it works. |
| How is "decision tree scoring" done? | Detection time from track appearance, a cost-weighted classification matrix, engagement economics and timing, and ROE/collateral. Weights and the formulas are in one place and in the AAR. |
| Evidence that it improves training? | Not claimed. We can show trends from sessions run by our team and say clearly that it is a small sample; unit studies are the next step. |
| What about data privacy? | Trainees use pseudonymous callsigns, data stays on the laptop, and exports are explicit files with checksums. |
| How would a unit use it across laptops? | Each laptop exports a session bundle; the instructor imports them, and imported sessions are re-simulated to verify scores. |
| What would you add with more time? | A 3D or VR renderer, richer sensors, instructor scenario builder, and a validated threat library from faculty. |
| Why 120-second scenarios? | Realistic drone speeds need time to cross a few kilometres; short enough for many repetitions in a session. |

### 7.4 Do not say

"Certified", "validated against real systems", "operationally ready", "MIL-STD/APP-6 compliant", "NATO standard", "proven to improve performance", "machine-learning model" (unless F-07b shipped), or any real platform or weapon names.

### 7.5 Numbers to remember

20 Hz sim (50 ms ticks) · 60 fps render · 120 s scenarios · radar 5 km, 30 RPM, track init 2 of 3 · `Q_min 0.6`, coast decay 8 s · EO reach 2.5 km (×0.7 night, ×0.25 fog) · RF 4 km, DF ±5° · PNR 0.5 km · `CER > 10` ⇒ UNFAVOURABLE EXCHANGE · kinetic over `ρ > 0.5` ⇒ ROE violation, `G ≤ 40` · fairness: ≥ 6 s budget and window · novelty cosine < 0.85 over last 10 · target score 70 · `dist/` under 8 MB · port 47260.

---

## 8. Glossary

**AAR** after-action review · **BDA** battle damage assessment · **CER** cost exchange ratio (effector cost / threat value) · **DF** direction finding · **DTID** detect, track, identify, defeat · **EMA** exponential moving average · **EVAL / TRAIN** fixed-benchmark vs adaptive session modes · **F2T2EA** find, fix, track, target, engage, assess · **MDT / MET** mean detection / engagement time (from `t_trk`) · **PNR** point of no return (`R ≤ R_min`) · **ROE** rules of engagement · **SAL / SAT** sensor adaptation latency / swarm saturation handling · **`t_trk`** tick the track first appears · **`t_vis`** first instant the target is detectable (diagnostic only).
