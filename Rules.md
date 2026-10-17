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
| ZS-5 | **FATAL.** `tests/e2e/airgap.spec.ts` (Playwright) runs against `vite preview`, plays a full scenario, and asserts **zero** requests whose resource type is `fetch`, `xhr`, `websocket` or `eventsource`, and zero requests to any origin other than the app's. | CI, AC-11 |

Production CSP (meta tag in `index.html`, prod build only): `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; worker-src 'self' blob:;`.

---

## 2. Deterministic Simulation Rules

| ID | Rule |
|---|---|
| DT-1 | **FATAL.** Sim state changes only inside `engine.step()`, once per 50 ms tick (`dt = 0.05`). No other function mutates `TrackEntity`. |
| DT-2 | **FATAL.** `Math.random()` is banned everywhere in `src/sim`, `src/director`, `src/render`. All randomness comes from `mulberry32` streams in `rng.ts`. |
| DT-3 | Four separate streams (`traj`, `sense`, `kill`, `gen`), built with `streamSeed(seed, label, key)`. Sensing draws are stateless keyed draws `(entityIndex, sweepIndex)`. No stream may be shared across labels. |
| DT-4 | Every trainee input is stamped with `event.timeStamp`, converted to sim time, and **quantised to the next tick** (`applyTick = max(ceil(tRaw / 50), currentTick + 1)`) before it can touch state. Scored time is `tMs = applyTick * 50`; `tRawMs` is stored beside it. |
| DT-5 | The sim never reads `Date`, `performance` or any wall clock. Only `clock.ts` reads `performance.now()`, and only to feed the accumulator. |
| DT-6 | Render code is read-only with respect to the engine. Canvas draws `prev`/`curr`/`alpha`; it never writes entity fields. |
| DT-7 | Every state change that matters to scoring or replay is written as a `SimEvent` with `seq` and `tMs`, **including reactive-trigger injections (full spawned spec in the payload) and every kill draw `u`**. |
| DT-8 | **FATAL.** AAR replay reconstructs the timeline only from stored `events` (plus `SNAPSHOT` keyframes). It must not call the Director, the engine or any PRNG. |
| DT-9 | **FATAL.** Golden tests: (a) same spec + same input log gives an identical event sequence and score within 1e-6; (b) DEMO-1 hits first-detectable T+5, masked T+30 to T+50, H-1 PNR T+82.5, swarm PNR T+115.6, each within 1 s. |
| DT-10 | Adding or changing a PRNG draw order is a breaking change: bump `simVersion` and regenerate golden fixtures in the same commit. |

---

## 3. Canonical Classification and Symbology

### 3.1 Taxonomy

| ID | Rule |
|---|---|
| TX-1 | **FATAL.** The only class strings in the code, DB, UI, matrix and exports are the 7 values of `CLASSES` in `src/sim/taxonomy.ts`: `UNKNOWN_EVIDENCE_INSUFFICIENT`, `HOSTILE_ATTACK`, `HOSTILE_ISR`, `SWARM_ELEMENT`, `CIVIL_UAS`, `BIRD`, `FRIENDLY`. |
| TX-2 | Short codes (`HA HI SW CU BI FR UNK`) are display-only and generated from one lookup table. Never store them. |
| TX-3 | Ground truth uses `TrueClass` (no `UNKNOWN_EVIDENCE_INSUFFICIENT`). Every new track starts with `traineeLabel = UNKNOWN_EVIDENCE_INSUFFICIENT`. |
| TX-4 | The scope renders the **trainee's label**, never `trueClass`. Ground truth is revealed only after `ASSESS`/session end and in the AAR. |

---

## 4. Scoring and Engagement Mathematics

| ID | Rule |
|---|---|
| SC-1 | **FATAL.** Every cost, speed, range, envelope, `Pk0`, weight, threshold and matrix value is read from `config.json` via `src/config`. No numeric doctrine constant in code. |
| SC-2 | **Clamping.** `clamp(x) = min(100, max(0, x))`. Clamp `D`, `C`, `E_econ`, `E_time`, `G`, `R`, each track score `S`, and the session score. |
| SC-3 | Track score: hostile `S = 0.25 D + 0.20 C + 0.35 G + 0.20 R`; non-hostile `S = 0.5 C + 0.25 G + 0.25 R`. Session: `clamp(100 * sum(w_i S_i)/sum(w_i) - 20 * leakers - 25 * critical)`. |
| SC-4 | Detection: `D = 100 * clamp(1 - (tDesig - tTrk) / T_budget)`. Detection time starts at `t_trk`, never `t_vis`. |
| SC-5 | CER = effector cost / threat value. `E_econ = 100` if CER <= 1, else `clamp(100 - 40 * log10(CER))`. **CER > 10 raises `UNFAVOURABLE EXCHANGE`**. |
| SC-6 | `R_opt = (envelope_min + envelope_max) / 2`. `E_time = 100 * clamp(1 - abs(R_engage - R_opt) / R_opt)`. |
| SC-7 | Neutralised before PNR `G = 0.6 E_econ + 0.4 E_time`; missed `G = 0.3 E_econ`; non-hostile held `G = 100`; non-hostile engaged `G = 0`. |
| SC-8 | Kinetic effector (`w_e >= 0.3`) over zone with `rho > 0.5` is an ROE violation and caps `G <= 40`. |
| SC-9 | Firing on `UNKNOWN_EVIDENCE_INSUFFICIENT` is an ROE violation. |
| SC-10 | Hard blocks disable button: `q < Q_min`, past PNR, out of envelope, soft-kill jammed. Soft gates stay enabled with warning badge. |
| SC-12 | Grades: $\ge 70$ `PROFICIENT_IN_SIMULATION`; $50..69$ `DEVELOPING`; $< 50$ `NEEDS_RETRAINING`. |
