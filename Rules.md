# Rules.md: Engineering, Math and Operational Guardrails

These rules are binding on every developer and every AI coding agent. A rule marked **FATAL** fails CI. If a task seems to require breaking a rule, stop and record the conflict in MEMORY.md instead of working around it. Source of truth for numbers: `/public/config.json`. Source of truth for contracts: `src/sim/types.ts` and ARCHITECTURE.md.

---

## 1. Zero-Server Rule

| ID | Rule | Enforcement |
|---|---|---|
| ZS-1 | **FATAL.** No `fetch`, `XMLHttpRequest`, `axios`, `WebSocket`, `EventSource`, `navigator.sendBeacon` or dynamic `import()` of a URL anywhere in `src/`. | ESLint `no-restricted-globals` / `no-restricted-properties`, plus ZS-5 |
| ZS-2 | No CDN script, stylesheet, font, icon or image. Fonts come from bundled `@fontsource` packages. No analytics, no telemetry, no error-reporting SDK. | CSP + ZS-5 |
| ZS-3 | Config is **not fetched**. `scripts/inline-config.mjs` validates `public/config.json` with zod at build time and generates `src/config/config.generated.ts`. Runtime reads the generated module only. | build fails on schema error |
| ZS-4 | `tools/launcher` is a static file server for `dist/` bound to `127.0.0.1` with no API routes. It exists only because IndexedDB and ES modules are unreliable on `file://`. | code review |
| ZS-5 | **FATAL.** `tests/e2e/airgap.spec.ts` (Playwright) runs against `vite preview` with `context.setOffline(true)`, plays a full scenario, and asserts **zero** requests whose resource type is `fetch`, `xhr`, `websocket` or `eventsource`, and zero requests to any origin other than the app's. Do not grep the bundle for URLs (React and SVG contain URL strings that are never requested). | CI, AC-11 |

Production CSP (meta tag in `index.html`, prod build only): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; worker-src 'self' blob:`.

ESLint core:

```js
'no-restricted-globals': ['error', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'],
'no-restricted-properties': ['error',
  { object: 'Math', property: 'random' },
  { object: 'navigator', property: 'sendBeacon' },
  { object: 'Date', property: 'now' },            // allowed only in src/db and src/ui via override
  { object: 'performance', property: 'now' },     // allowed only in src/sim/clock.ts via override
],
```

---

## 2. Deterministic Simulation Rules

| ID | Rule |
|---|---|
| DT-1 | **FATAL.** Sim state changes only inside `engine.step()`, once per 50 ms tick (`dt = 0.05`). No other function mutates `TrackEntity`. |
| DT-2 | **FATAL.** `Math.random()` is banned everywhere in `src/sim`, `src/director`, `src/render`. All randomness comes from `mulberry32` streams in `rng.ts`. Using `crypto.randomUUID()` is allowed only in `src/db` for non-scored ids. |
| DT-3 | Four separate streams (`traj`, `sense`, `kill`, `gen`), built with `streamSeed(seed, label, key)`. Sensing draws are stateless keyed draws `(entityIndex, sweepIndex)`. No stream may be shared across labels. |
| DT-4 | Every trainee input is stamped with `event.timeStamp`, converted to sim time, and **quantised to the next tick** (`applyTick = max(ceil(tRaw / 50), currentTick + 1)`) before it can touch state. Scored time is `tMs = applyTick * 50`; `tRawMs` is stored beside it. |
| DT-5 | The sim never reads `Date`, `performance` or any wall clock. Only `clock.ts` reads `performance.now()`, and only to feed the accumulator. |
| DT-6 | Render code is read-only with respect to the engine. Canvas draws `prev`/`curr`/`alpha`; it never writes entity fields. |
| DT-7 | Every state change that matters to scoring or replay is written as a `SimEvent` with `seq` and `tMs`, **including reactive-trigger injections (full spawned spec in the payload) and every kill draw `u`**. |
| DT-8 | **FATAL.** AAR replay reconstructs the timeline only from stored `events` (plus `SNAPSHOT` keyframes). It must not call the Director, the engine or any PRNG. |
| DT-9 | **FATAL.** Golden tests: (a) same spec + same input log gives an identical event sequence and score within 1e-6; (b) DEMO-1 hits first-detectable T+5, masked T+30 to T+50, H-1 PNR T+82.5, swarm PNR T+115.6, each within 1 s. Run on the pinned bundled Chromium only (`exp`, `atan2` are not bit-identical across engines). |
| DT-10 | Adding or changing a PRNG draw order is a breaking change: bump `simVersion` and regenerate golden fixtures in the same commit. |

---

## 3. Canonical Classification and Symbology

### 3.1 Taxonomy

| ID | Rule |
|---|---|
| TX-1 | **FATAL.** The only class strings in the code, DB, UI, matrix and exports are the 7 values of `CLASSES` in `src/sim/taxonomy.ts`: `UNKNOWN_EVIDENCE_INSUFFICIENT`, `HOSTILE_ATTACK`, `HOSTILE_ISR`, `SWARM_ELEMENT`, `CIVIL_UAS`, `BIRD`, `FRIENDLY`. Any other string is a fatal error; an ESLint rule and a type-level `never` exhaustiveness check enforce it. |
| TX-2 | Short codes (`HA HI SW CU BI FR UNK`) are display-only and generated from one lookup table. Never store them. |
| TX-3 | Ground truth uses `TrueClass` (no `UNKNOWN_EVIDENCE_INSUFFICIENT`). Every new track starts with `traineeLabel = UNKNOWN_EVIDENCE_INSUFFICIENT`. |
| TX-4 | The scope renders the **trainee's label**, never `trueClass`. Ground truth is revealed only after `ASSESS`/session end and in the AAR. |

### 3.2 Symbology map

Hostile classes: red diamond. `FRIENDLY`: blue circle. `CIVIL_UAS`: green square. `BIRD`: yellow square with wing tick. `UNKNOWN_EVIDENCE_INSUFFICIENT`: yellow question mark. Details in DESIGN.md 1.3.

### 3.3 Classification score matrix (notional, in `config.json`)

Rows are true class, columns are the trainee label. `UNK` = `UNKNOWN_EVIDENCE_INSUFFICIENT` (explicit declaration). A track never classified by its deadline scores 0 (not the UNK value); the deadline is `t_PNR` for hostiles and, for non-hostiles, the moment they cross `R_min` or the session end, whichever is first.

| True \ Label | HA | HI | SW | CU | BI | FR | UNK |
|---|---|---|---|---|---|---|---|
| HOSTILE_ATTACK | 100 | 60 | 60 | 0 | 0 | 0 | 25 |
| HOSTILE_ISR | 60 | 100 | 60 | 0 | 0 | 0 | 25 |
| SWARM_ELEMENT | 60 | 60 | 100 | 0 | 0 | 0 | 25 |
| CIVIL_UAS | 20 | 20 | 20 | 100 | 50 | 30 | 40 |
| BIRD | 20 | 20 | 20 | 50 | 100 | 30 | 40 |
| FRIENDLY | 20 | 20 | 20 | 30 | 30 | 100 | 40 |

- Non-hostile labelled hostile: log **False Positive**. Hostile labelled `CIVIL_UAS`, `BIRD` or `FRIENDLY`: log **False Negative (critical)**.
- The AAR confusion matrix is 7 x 7. The `UNKNOWN_EVIDENCE_INSUFFICIENT` row exists but is always 0 (never a ground truth).
- Classification Accuracy = correct diagonal / all tracks that existed (unclassified and UNK count as misses).

---

## 4. Scoring and Engagement Mathematics

| ID | Rule |
|---|---|
| SC-1 | **FATAL.** Every cost, speed, range, envelope, `Pk0`, weight, threshold and matrix value is read from `config.json` via `src/config`. No numeric doctrine constant in code. Parameters are labelled **Notional Configurable Parameters** in the UI and docs. |
| SC-2 | **Clamping.** `clamp(x) = min(100, max(0, x))`. Clamp `D`, `C`, `E_econ`, `E_time`, `G`, `R`, each track score `S`, and the session score. Clamp **each component before** it enters a weighted sum. No penalty may push any track score below 0. |
| SC-3 | Track score: hostile `S = 0.25 D + 0.20 C + 0.35 G + 0.20 R`; non-hostile `S = 0.5 C + 0.25 G + 0.25 R`. Session: `clamp(100 * sum(w_i S_i)/sum(w_i) - 20 * leakers - 25 * critical)` with `w`: attack 1.0, ISR 0.6, swarm 0.4, decoys 0.3. |
| SC-4 | Detection: `D = 100 * clamp(1 - (tDesig - tTrk) / T_budget)`, `T_budget = tPnr - tTrk`. **Detection time starts at `t_trk` (track appears), never `t_vis`.** `t_trk - t_vis` is a diagnostic only. Never designated: `D = 0`. |
| SC-5 | CER = effector cost / threat value. `E_econ = 100` if CER <= 1, else `clamp(100 - 40 * log10(CER))`. **CER > 10 raises `UNFAVOURABLE EXCHANGE`** (computed from CER, never hard-coded to a weapon/drone pair). Expected: missile on the Rs 40,000 recon quad CER 75, `E_econ` 25, flag; missile on the Rs 1,00,000 FPV CER 30, `E_econ` about 41, flag. |
| SC-6 | `R_opt = (envelope_min + envelope_max) / 2`. `E_time = 100 * clamp(1 - abs(R_engage - R_opt) / R_opt)`. |
| SC-7 | Engagement score: neutralised before PNR `G = 0.6 E_econ + 0.4 E_time`; engaged, missed, no successful re-engage `G = 0.3 E_econ`; leaker without attempt `G = 0`; non-hostile left alone `G = 100`; non-hostile engaged `G = 0`. |
| SC-8 | **ROE.** `R = clamp(100 - 100 * w_e * rho_zone * I_overlap - 50 * civilEngaged - 100 * friendlyEngaged - 20 * N_ROE)`. A kinetic effector (`w_e >= 0.3`) released while the target is inside a zone polygon expanded by the effector debris radius with `rho_zone > 0.5` automatically registers an ROE violation (`N_ROE += 1`, `ROE_VIOLATION` event) **and caps `G <= 40`**. Zones with `rho = 0` (ridge, forest) mask sensors but add no collateral. |
| SC-9 | **Firing on a track whose label is `UNKNOWN_EVIDENCE_INSUFFICIENT` is an automatic ROE violation** (`N_ROE += 1`), including a track the trainee explicitly declared UNK. |
| SC-10 | **Release gating.** Hard blocks (button disabled, no event): track quality `q < Q_min (0.6)`, `t >= tPnr`, target outside the effector envelope, soft-kill under jamming or against an RF-silent target (Pk 0.1 is allowed but flagged), lifecycle not ACTIVE. Soft gates (permitted, scored as violations): unclassified/UNK label, kinetic over dense urban zone. Log all gate results in `ENGAGE.payload.roeGate`. |
| SC-11 | Oracle = cheapest effector in the envelope with `Pk_eff >= 0.6` under current chaos and ROE-compliant. Always computed and stored; AAR shows trainee vs oracle and cost regret. |
| SC-12 | Grades (patch labels): `score >= 70` `PROFICIENT_IN_SIMULATION`; `50..69` `DEVELOPING`; `< 50` `NEEDS_RETRAINING`. The strings MISSION-READY and REMEDIAL must not appear anywhere. |
| SC-13 | EMA: first valid observation seeds, `EMA_n = 0.4 x_n + 0.6 EMA_{n-1}`; metrics with no valid observation (no chaos, no swarm) are skipped; no history means `w_k = 0.5`. `SAL-score = 100 * clamp(1 - SAL/6000)`; `SAT-score = 100 * fraction of swarm elements engaged before PNR`. |
| SC-14 | Difficulty updates after **TRAIN** only: `d' = clamp(d + 0.15 (Score - 70)/30, 0, 1)`, `d0 = 0.3`. Leaderboards, percentiles and unit view use **EVAL** sessions only. |
| SC-15 | Every scoring function has a Vitest unit test with at least one boundary case (CER = 1, CER = 10, `q` exactly `Q_min`, `tDesig = tTrk`, leaker with and without an attempt, score that would go negative). |

---

## 5. No Hallucinated Doctrinal Claims

| ID | Rule |
|---|---|
| DC-1 | All numbers (costs, speeds, Pk, envelopes, RCS) are **notional**, labelled in the UI footer and in `config.json` `_meta.notional = true`, and editable by DSSC faculty. Do not cite a real system's performance unless a public source is recorded in `config.json` beside the value. |
| DC-2 | Never write "certified", "qualified", "operationally ready", "validated against live data" or similar. Use "Proficient in Simulation" / "Needs Retraining". |
| DC-3 | Remote-ID broadcast and IFF are scenario assumptions, labelled as such. |
| DC-4 | The adaptive engine is "adaptive, profile-driven scenario generation" (EMA profiling plus weighted lever sampling plus fixed reactive rules). Do not call it a trained neural model or claim reinforcement learning. |
| DC-5 | Terminology: show both F2T2EA and DTID labels (Detect=Find, Track=Fix+Track, Identify=Target/classify, Defeat=Engage+Assess). Confirm wording with DSSC faculty before the pitch. |
| DC-6 | No real names or service numbers in data. Trainees are pseudonymous callsigns. |

---

## 6. UI and Performance Guardrails

- UI: native Canvas 2D only (**no PixiJS, no Three.js, no WebGL libraries**). Layout geometry exactly as DESIGN.md section 2; no vertical page overflow at 1366x768 (checked by a Playwright screenshot assertion: `document.documentElement.scrollHeight <= innerHeight`).
- Performance: frame <= 16 ms at 100 live tracks on the i3 test laptop (hard cap 150 entities); JS heap < 150 MB; bundle < 8 MB; no allocations in the render loop (pool symbols and vectors).
- Zustand: components subscribe through selectors with shallow equality. The canvas never subscribes. `uiSnapshot` is rebuilt once per tick, not per event.
- Sessions are written to Dexie before any dashboard reads them; export JSON after every EVAL session.

## 7. Rules for AI Coding Agents

1. Read `Rules.md`, `ARCHITECTURE.md`, `DESIGN.md` and `MEMORY.md` before editing. Pick one `TASK-*` from `Tasks.md`, do only that task, and tick its acceptance criteria.
2. Do not add a dependency that is not in the approved list: react, react-dom, zustand, dexie, tailwindcss, chart.js, zod, vitest, playwright, eslint, typescript, vite, `@fontsource/*`.
3. Do not touch files outside the task's target paths without recording why in MEMORY.md.
4. Run `npm run lint && npm run test && npm run build` before declaring a task done. Failing golden tests are never "updated to pass" unless DT-10 applies.
5. When a rule and a spec disagree, the order of precedence is: Rules.md, then the v1.1 patch, then PRD v1.1, then DESIGN.md. Log the conflict in MEMORY.md.
