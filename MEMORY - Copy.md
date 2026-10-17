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

_Last updated: 2026-10-17 (documentation baseline only)._

**Completed:** the five repository documents; PRD v1.1; v1.1 patch decisions merged into the docs.

**In progress:** nothing. No source code exists yet. Do not describe features as working until their task in Tasks.md is ticked.

**Next:** execute Phase 0 then Phase 1 from Tasks.md (scaffold, config pipeline, contracts, PRNG and tick loop, Zustand + Dexie, first PPI frame with DEMO-1 stub).

**Known technical debt / open items (decide early):**

| # | Item | Why it matters | Proposed handling |
|---|---|---|---|
| TD-1 | Pinned Chromium bundle for golden tests is not chosen or packaged | Golden determinism (DT-9) relies on one JS engine | Choose a Playwright-installed Chromium for CI; ship the same build on the USB stick |
| TD-2 | Cost, speed and Pk values are notional | Judges may question realism | Keep in `config.json`, label notional, add public citations where a source exists |
| TD-3 | Quantised input timing means scored times are 50 ms resolution | Pitch says "milliseconds" | Show `tRawMs` (1 ms) beside quantised `tMs` in the AAR; say so openly |
| TD-4 | EVAL benchmark values (6 scenarios) are not yet authored | Needed for the unit view | TASK-P3-08, validated by the same fairness validator |
| TD-5 | SAL when the trainee never switches uses event duration as the fallback | May over-penalise short events | Revisit after first playtests |
| TD-6 | Contrast ratios in DESIGN.md are estimates | Accessibility claim | Verify in TASK-P5-06 |

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

## 5. Evaluation Cheat-Sheet

### 5.1 Three-minute pitch outline

| Time | Beat | Say / show |
|---|---|---|
| 0:00 | Problem | "Cheap drones are beating expensive air defence. Live-fire training is costly, weather-dependent and does not scale. We train the decision, not just the reflex." Show laptop in airplane mode. |
| 0:20 | Live: DEMO-1 (first 60 s) | Drone appears, descends and vanishes behind the urban zone; fog hits EO/IR; switch to RF; follow the bearing line through the zone; radar reacquires; RF soft-kill at about T+57. |
| 1:20 | Live: DEMO-2 (30 s) | Deliberately fire the missile at a Rs 40,000 recon quad: `UNFAVOURABLE EXCHANGE` (CER 75) and the ROE flag drop the score. |
| 1:50 | AAR | Open a pre-loaded session: Mean Engagement Time in ms, 7x7 confusion matrix, scrub the replay to the fog onset, show oracle vs trainee choice. |
| 2:30 | Red Team plan | "Slow detection and weak sensor adaptation, so the next scenario uses terrain-hugging drones and degrades the sensor you rely on." Launch it; it differs from the first. |
| 2:50 | Unit view and close | EVAL-only leaderboard (fair benchmark); runs on an i3, no GPU, no internet, no VR. |

### 5.2 Exact demo steps (keep this order)

1. Boot from the USB launcher in airplane mode; login as callsign `ALPHA-1`; select **TRAIN**.
2. Load **DEMO-1**. Press `1`. Designate the first track (`Space`), classify (`C`), press `3` for RF when the bearing line appears.
3. At about T+28 note fog; confirm sensor pills (`EO/IR DEG`). Show the masked track as `COAST` with the amber ellipse.
4. After reacquisition re-designate, open effectors, choose RF soft-kill (CER 0.001), assess `KILL`. Stop the live run at about T+60 and open the pre-loaded finished session for the rest.
5. Load **DEMO-2**, designate, classify `HOSTILE_ISR`, select Missile (hold `F`), show CER 75 and the flag; open hot-wash.
6. AAR: scorecard, KPI tiles (MET, MDT, accuracy), timeline lane CHAOS, marker drawer, confusion matrix.
7. Red Team plan panel, launch next TRAIN scenario, compare against the first.
8. Unit view (EVAL sessions), then export JSON to show air-gapped aggregation.

Backups: pre-seeded sessions in Dexie, JSON export, 12 bundled fallback scenarios, a recorded screen capture.

### 5.3 Likely judge prompts and answers

| Question | Answer |
|---|---|
| Is this really AI? | It is adaptive, profile-driven scenario generation: per-skill EMA profiling plus weighted lever sampling and fixed reactive rules. Explainable and deterministic given a seed. Not a trained neural model; we state that. Optional Thompson-sampling upgrade is planned. |
| Why 2D and not 3D or VR? | Real C-UAS operators work from 2D track-based consoles. We train the decision environment (sensors, ROE, cost). 2D guarantees determinism, runs on unit laptops and removes physics bugs. The PS allows desktop. |
| How do you prevent rote learning? | Per-session seeds, a procedural generator, decoy injection, chaos events, reactive triggers and a novelty filter (cosine similarity below 0.85 against the last 10 runs). |
| Are scenarios fair? | A fairness validator rejects any scenario where a hostile lacks 6 s of budget, an admissible effector, or 6 s of usable track quality before the point of no return. |
| Are the costs realistic? | They are notional configurable parameters in one `config.json` for DSSC faculty to set to doctrine. We make no certification claims. |
| How is the leaderboard fair if difficulty adapts? | It is not computed from TRAIN. Leaderboards and percentiles use the fixed EVAL benchmark pack only. |
| How do you prove replays are exact? | AAR replay is rebuilt from stored events only; CI re-simulates and compares event sequences and scores to 1e-6 on a pinned browser. |
| Does it need the internet? | No. Static bundle, IndexedDB, bundled fonts, CSP blocks connections, and an automated network-blocked test asserts zero requests. |
| How do multiple laptops aggregate? | Session JSON export (checksummed) to USB, imported on the instructor laptop, deduped by session id. |
| What about collateral damage? | Kinetic release over an urban zone with density above 0.5 is an automatic ROE violation and caps the engagement score. |
| What would you build next? | Optional FastAPI + SQLite LAN backend, doctrine packs from DSSC, more effector models, instructor-authored scenarios. |

## 6. Decision Log (append only)

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
