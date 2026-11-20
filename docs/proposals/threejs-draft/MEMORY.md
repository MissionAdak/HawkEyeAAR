# MEMORY.md — DRISHTI-CUAS Persistent Project Memory

**Purpose:** the state file for developers and LLM coding agents across sessions. **Read this first, update it last.** Keep it factual. Do not record anything as done that has not been verified by a passing test or an observed run.

**How to update (every session):**
1. §2 — change module status and tick phase checkpoints; add or close `OQ-xx` open questions.
2. §3 — add a `D-xx` row for every deviation from PRD v1.1 or from these docs.
3. §5 — add a bug-log row for every bug fixed, with its regression test; add a new `T-xx` trap when you discover one.
4. Use the sprint hour marker (`H12`, `H26`, …) as the timestamp. Never delete history; append.

Last updated: **H0** (documentation set complete, optional Three.js 3D/VR renderer added to the specification; no application code written).

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
| Rendering | Native HTML5 Canvas 2D is the default and always available. **Optional** Three.js 3D / WebXR VR renderer, lazy-loaded as a separate chunk | The statement asks for a "desktop or VR-capable" simulator: 2D satisfies it on any unit laptop, 3D/VR is the option for machines that can run it. No PixiJS |
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
| Documentation set (PRD v1.1, ARCHITECTURE, DESIGN, Rules, Tasks, MEMORY) | **Done** | Written, cross-checked once; deviations in §3 |
| Toolchain, scaffold, theme, shell | Not started | TASK-P0-01, P0-02 |
| Contracts, taxonomy, config schema | Not started | TASK-P0-03 |
| RNG, clock, loop | Not started | TASK-P0-04 |
| Guards and lint | Not started | TASK-P0-05 |
| Launcher and packaging | Not started | TASK-P0-06, P5-03 |
| Dexie schema | Not started | TASK-P0-07 |
| SimCore, trajectories, masking, radar, tracker | Not started | Phase 1 |
| Radar renderer, symbols, track table | Not started | Phase 1 |
| F2T2EA, effectors, ROE, chaos, EO/IR and RF renderers | Not started | Phase 2 |
| Scoring, oracle, AAR, replay, unit view | Not started | Phase 3 |
| Director, validator, novelty, triggers, TRAIN/EVAL | Not started | Phase 4 |
| Hardening, e2e, demo content | Not started | Phase 5 |
| Renderer abstraction, `masked` and EO fields | Not started | TASK-P2-12 |
| 3D foundation, tactical scene, tracks and picking (optional) | Not started | TASK-P3-12, P3-13, P3-14 |
| 3D EO/IR view (optional) | Not started | TASK-P4-12 |
| 3D validation, hardware record (optional) | Not started | TASK-P5-08 |
| WebXR VR mode (optional, experimental) | Not started | TASK-P5-09; **no headset test recorded** |
| 3D AAR replay (optional) | Not started | TASK-P5-10 |

### 2.2 Phase checkpoints

- [ ] H2 — toolchain, shell passes 768p layout test, rng/loop tests green, config validates
- [ ] H10 — DEMO-1: H-1 vanishes into U1's shadow at T+30 and reappears at T+51; golden timeline part 1 green
- [ ] H18 — DEMO-1 playable start to end offline; fire, flags, fog and jamming working; session persists
- [ ] H26 — AAR with timeline replay, confusion matrix, unit table; scoring fixtures pass; replay deterministic
- [ ] H31 — Director, validator and novelty (AC-6); EVAL pack; TRAIN/EVAL flows
- [ ] H36 — USB kit demonstrated offline on a clean low-end laptop; backup recording ready

### 2.3 Known technical debt

None yet (no code). Add entries here with the TASK id that will repay them.

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
| OQ-09 | Is a VR headset available for testing, and which runtime (OpenXR on Windows)? | Unknown; until a real-headset run is recorded, VR is labelled experimental |
| OQ-10 | Which `three` version to pin, and which GPU classes meet the HIGH tier budget? | Pin at TASK-P3-12; record GPU, driver, fps per machine tested here |
| OQ-11 | Will any GLB models be used (licences) or are procedural models enough? | Procedural by default; every GLB needs a licence row in §6 |

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
| D-29 | Three.js is allowed **only** as an optional 3D/VR renderer in `src/render3d/`, lazy-loaded; this reverses the earlier ban (requested after the first doc set). 2D remains the default | The statement says "desktop or VR-capable"; 3D/VR is the option for capable machines | `Rules.md` §1.7, §10; `ARCHITECTURE.md` §8 |
| D-30 | 3D is sensor-gated: it draws track estimates, `altBin` altitudes and EO evidence, never ground truth, in scored sessions | A free-flying true scene would turn the trainer into a spotting game | R10.3 |
| D-31 | Scoring is identical in 2D, 3D and VR; `sessions.viewMode` is recorded for transparency only | Fairness across hardware | R10.9 |
| D-32 | `FrameDriver` makes the sim loop's frame source pluggable so WebXR can drive it | `window.requestAnimationFrame` is not reliable while presenting in XR | `sim/loop.ts`, R10.6 |
| D-33 | `TrackEntity` gains `masked`, `eoAzDeg`, `eoElevDeg`, `eoRangeM`; config gains `radar.altBinsM = [40, 100]` | Needed by the EO HUD (2D and 3D) and 3D placement; the PRD HUD showed values the contract did not carry | `types.ts`, config |
| D-34 | RF mode stays 2D inside the 3D view; VR is a table-top scene plus a floating panel | Scope control | `ARCHITECTURE.md` §8.7, §8.9 |
| D-35 | Three loaders that fetch are banned; textures are procedural; GLB only via `loadStaticBinary` + `GLTFLoader.parse` | Zero-server rule | R10.4 |
| D-36 | The AAR 3D replay may show truth through `ReplaySim.truthView()` after the session ends | Post-session review is the point of an AAR | R3.3, §8.10 |
| D-37 | 3D and VR tasks are P1 and P2 and are the first items in the cut order after the 2D baseline | Free-tier quota and limited hours; the 2D console alone meets the statement | `Tasks.md` |

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
| T-25 | Using `TextureLoader` or `GLTFLoader.load()` | They fetch URLs, which breaks the zero-server rule | `three.test.ts`; procedural textures; `parse()` only |
| T-26 | Leaving the sim on `window.requestAnimationFrame` during XR | The sim freezes or desynchronises while presenting | `FrameDriver` handoff test (tick continuity) |
| T-27 | Drawing true positions or exact altitude in the 3D console | Reveals the answer; breaks sensor realism | R10.3; gating unit test; `truthLeak.spec.ts` also runs in 3D |
| T-28 | Three's `MathUtils.rand*` / `generateUUID` | They use `Math.random` | Banned by guard; use `mulberry32(hash32(…))` |
| T-29 | Not disposing geometries, textures and listeners on toggle | GPU memory leak after repeated 2D↔3D switches | Leak test (ten toggles, `renderer.info.memory`) |
| T-30 | Inline axis swaps (sim z-up vs Three y-up) | Mirrored or flipped scenes | Single `toThree()`; north is −Z unit test |
| T-31 | 3D chunk leaking into the main bundle | Slower cold start and bigger `dist/` for 2D users | Chunk assertion in `three.test.ts` |
| T-32 | WebGL context loss ending the session | Black screen mid-scenario | Auto fallback to 2D; the sim never stops |
| T-33 | Claiming VR works without hardware | Untestable in emulators; credibility risk | R10.11; label "experimental" until a headset run is recorded |
| T-34 | VR below 72 fps or with app-driven camera motion | Motion sickness | LOW tier, fixed foveation, no locomotion |

### 5.2 Bug log (append when fixed)

| ID | Marker | Symptom | Root cause | Fix | Regression test |
| --- | --- | --- | --- | --- | --- |
| — | — | No bugs recorded yet (no code written) | — | — | — |

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
| `three` version and any GLB models | Not yet chosen | record version, licence and source per model |

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

Optional, only on a machine that passed the 3D check: at about T+32 press `V` to show the same scenario in 3D. The extruded urban zone stands between the post and the drone's last position and the track has no live marker (masked); press `V` to return to 2D. Do not enter VR in the pitch unless a headset test is recorded in this file.

Then switch to the **pre-loaded completed session** for the rest. **DEMO-2:** label the recon quad `ISR`, arm `T` (missile), `F`: console shows `CER … EST`, AAR shows true CER 75, `E_econ 25`, `UNFAVOURABLE EXCHANGE`, and the score drop.

**Recovery plan:** live run misbehaves → open the pre-loaded session or play the backup screen recording; browser data missing → import `backup-sessions.json` from the USB stick; projector at 1080p → the optional larger-radar media query applies automatically.

### 7.3 Live judge prompts and answers

| Question | Answer (keep under 30 s) |
| --- | --- |
| Is there a 3D or VR version? | The default is a 2D console that runs on any unit laptop, which is what the statement's "minimal specialised hardware" needs. For machines that can run it, there is an optional Three.js 3D view (and an experimental WebXR VR mode) that reads the same simulation, so scores are identical. VR is marked experimental until we have tested it on a headset. |
| Does 3D make it easier? | No. The 3D view is sensor-gated: it shows tracks, estimated altitude bands and EO evidence, never the true scene; masked drones disappear behind buildings exactly as in 2D. |
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

"Certified", "validated against real systems", "operationally ready", "MIL-STD/APP-6 compliant", "NATO standard", "proven to improve performance", "machine-learning model" (unless F-07b shipped), any real platform or weapon names, or "VR-validated" / "VR-ready" unless a real-headset run is recorded in §2.

### 7.5 Numbers to remember

20 Hz sim (50 ms ticks) · 60 fps render · 120 s scenarios · radar 5 km, 30 RPM, track init 2 of 3 · `Q_min 0.6`, coast decay 8 s · EO reach 2.5 km (×0.7 night, ×0.25 fog) · RF 4 km, DF ±5° · PNR 0.5 km · `CER > 10` ⇒ UNFAVOURABLE EXCHANGE · kinetic over `ρ > 0.5` ⇒ ROE violation, `G ≤ 40` · fairness: ≥ 6 s budget and window · novelty cosine < 0.85 over last 10 · target score 70 · `dist/` under 8 MB · port 47260 · 3D chunk under 1.5 MB · 3D HIGH 60 fps · VR at least 72 fps (LOW tier).

---

## 8. Glossary

**AAR** after-action review · **XR / WebXR** browser API for VR/AR sessions · **BDA** battle damage assessment · **CER** cost exchange ratio (effector cost / threat value) · **DF** direction finding · **DTID** detect, track, identify, defeat · **EMA** exponential moving average · **EVAL / TRAIN** fixed-benchmark vs adaptive session modes · **F2T2EA** find, fix, track, target, engage, assess · **MDT / MET** mean detection / engagement time (from `t_trk`) · **PNR** point of no return (`R ≤ R_min`) · **ROE** rules of engagement · **SAL / SAT** sensor adaptation latency / swarm saturation handling · **`t_trk`** tick the track first appears · **`t_vis`** first instant the target is detectable (diagnostic only).
