# Rules.md — DRISHTI-CUAS Engineering, Math and Operational Guardrails

These rules bind every developer and every AI coding agent. **MUST / MUST NOT** are absolute. A rule is enforced by the mechanism named in §9; if you cannot satisfy a rule, stop and record an `OPEN QUESTION` in `MEMORY.md` instead of working around it.

Precedence: `Rules.md` > `ARCHITECTURE.md` > `DESIGN.md` > `Tasks.md` > PRD v1.1 (the PRD is the product source; deviations are in `MEMORY.md` §3).

---

## 1. Zero-server rule

**R1.1 — No network APIs in application code.** `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, `axios`, `socket.io`, `ky`, `got`, GraphQL clients and any analytics/telemetry SDK MUST NOT appear in `src/`, with exactly **one** exception: `src/db/staticAssets.ts`.

**Why one exception exists.** `public/config.json`, `public/feature-calibration.json` and `public/scenarios/*.json` are static files that must stay editable by faculty without a rebuild, and the browser cannot read them without a same-origin request. `staticAssets.ts` is therefore the single audited gateway:

```ts
// src/db/staticAssets.ts — the ONLY module allowed to call fetch
const ALLOW = [/^\/config\.json$/, /^\/feature-calibration\.json$/, /^\/scenarios\/[a-z0-9-]+\.json$/];
export async function loadStatic<T>(path: string): Promise<T> {
  if (!ALLOW.some(r => r.test(path))) throw new Error(`Static path not allowed: ${path}`);
  const res = await fetch(path, { method: 'GET', credentials: 'omit', cache: 'no-store' });  // same-origin: path starts with '/'
  if (!res.ok) throw new Error(`Static load failed: ${path} (${res.status})`);
  return res.json() as Promise<T>;
}
```

**R1.2 — Loopback origin only.** After page load the browser MUST make requests only to the launcher origin (`http://127.0.0.1:47260`), and only `GET` for the allowlisted static paths plus the build's own JS, CSS and font files. Any request to another origin, any non-GET request, any WebSocket is a failure.

**R1.3 — No external resources.** No CDN scripts, no remote fonts, no remote images, no analytics, no `<link>` to other origins. Fonts live in `/public/fonts` (see `DESIGN.md` §1.4). Source files MUST NOT contain `http://` or `https://` literals, except XML namespace URIs under `http://www.w3.org/`.

**R1.4 — No telemetry, cookies or `localStorage` for scoring data.** All persistence goes through Dexie (`src/db`). `localStorage` may hold nothing the sim, scoring or AAR depends on.

**R1.5 — CSP is mandatory** (`ARCHITECTURE.md` §1.8) and is set both as a response header by the launcher and as a `<meta>` tag.

**R1.6 — If an HTTP call is detected, the test suite fails.** Two layers: (a) `tests/guards/network.test.ts` fails on any banned API or URL literal outside the exception; (b) `tests/e2e/airgap.spec.ts` plays a full DEMO-1 session with `page.route('**/*')` recording every request and `page.on('websocket')` armed, and fails on any non-loopback origin, non-GET method, non-allowlisted data path, or WebSocket.

**R1.7 — Dependency allowlist.** Runtime: `react`, `react-dom`, `zustand`, `dexie`, `zod`, `three` (exact version, only in the lazy 3D/VR chunk). Dev/build: `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `@playwright/test`, `eslint`, `typescript-eslint`, `@fontsource/chakra-petch`, `@fontsource/jetbrains-mono`, `@fontsource/share-tech-mono` (fonts are copied into `public/fonts` at build-prep time). Anything else requires a Decision-log entry in `MEMORY.md` first. PixiJS, Chart.js and any charting library are banned. `three` is allowed **only** for the optional 3D/VR renderer under `src/render3d/` (§10); `@types/three` is allowed as a dev dependency.

---

## 2. Deterministic simulation rules

**R2.1 — Fixed tick.** Simulation state MUST change only inside `SimCore.step()`, one call per 50 ms tick (`dt = 0.05 s`, `DT_MS = 50`). No `setInterval`, `setTimeout`, `requestAnimationFrame` or event handler may mutate sim state.

**R2.2 — No `Math.random()` anywhere in `src/`.** All procedural logic and combat rolls use the seeded `mulberry32` streams from `src/sim/rng.ts`:
- Runtime draws: `draw(master, stream, a, b, c, d)` with `stream ∈ {'traj','sense','kill'}` (keyed, order-independent).
- Generation: `sequence(master, 'scenario')`, used only inside `src/director/` while generating (the finished spec is stored).
- Renderer-only visual noise: `renderRng` in `src/render/fx.ts`; it must never be read by anything outside `render/`.
- Every new draw site MUST be registered in the key table in `ARCHITECTURE.md` §3.7 in the same change. Changing an existing key tuple requires a `SIM_VERSION` bump.

**R2.3 — Stream separation.** Trajectory jitter uses `traj`, detection/noise draws use `sense`, kill resolution uses `kill`. Trainee actions MUST NOT change any `traj` or `sense` outcome (the fairness validator depends on this).

**R2.4 — No wall time in the sim.** `Date`, `performance.now`, `Intl`, `setTimeout` and `requestAnimationFrame` are banned in `src/sim/` and `src/director/`, except `loop.ts` and `clock.ts`, which are the only files that read wall time.

**R2.5 — Inputs.** Every trainee action MUST be: (1) stamped with `event.timeStamp`; (2) converted with `SimClock.simMsAt`; (3) quantised with `applyTickFor` to the **next** unprocessed tick; (4) enqueued, never applied directly. Scores and timestamps use the quantised time (`tMs = applyTick × 50`), never the raw stamp. The input log stores `applyTick`.

**R2.6 — Fixed order of operations** (`ARCHITECTURE.md` §1.6). Any change to the order of steps, or to any formula that affects outcomes, requires: `SIM_VERSION` bump, regenerated golden fixtures, a `MEMORY.md` Decision-log entry.

**R2.7 — Ordering and iteration.** Iterate entities and tracks in ascending `idx`. `Array.prototype.sort` MUST have an explicit comparator with an `id` tie-break. Do not depend on object key order for non-string-integer keys.

**R2.8 — Plain-data state.** `SimState` MUST be JSON-serialisable (numbers, strings, booleans, arrays, plain objects). No class instances, closures, `Map`, `Set`, `undefined` fields or `NaN`/`Infinity`. This enables snapshots, crash recovery and `stateHash()`.

**R2.9 — Floating point.** Event times are integers (ticks). Golden tests run on the pinned bundled Chromium; JavaScript's `exp`, `log10`, `atan2`, `sqrt` are not bit-identical across engines, so replay equality is guaranteed only on the pinned build. Scores are compared with tolerance `1e-6`; event sequences and `stateHash` traces are compared exactly.

**R2.10 — Scored sessions.** Speed is fixed at 1×, there is no pause, and `Esc` → ABORT ends the session as `aborted` (excluded from scoring aggregates). Speed 1×/2×/4× exists only in AAR replay and DEMO scenarios.

**R2.11 — Renderers are read-only.** Code in `src/render/`, `src/render3d/` and `src/ui/` MUST NOT mutate `SimCore` or anything it returns. The only way to affect the sim is `enqueue(command)`.

**R2.12 — Replay equivalence.** Same `ScenarioSpec` + same `InputRecord[]` + same config hash + same `SIM_VERSION` ⇒ identical `SimEvent[]`, identical `stateHash` trace, score within `1e-6`. This is tested on every `npm run check`.

---

## 3. Canonical classification, symbology and truth separation

**R3.1 — Seven labels, spelled in one place.** The only valid classification labels are:

`UNKNOWN_EVIDENCE_INSUFFICIENT`, `HOSTILE_ATTACK`, `HOSTILE_ISR`, `SWARM_ELEMENT`, `CIVIL_UAS`, `BIRD`, `FRIENDLY`.

They are defined once in `src/sim/taxonomy.ts` and referenced through the `ClassLabel` type and `CLASS_LABELS` array. Any other class-like string is a **fatal error**. Display abbreviations (`ATK`, `ISR`, `SWM`, `CIV`, `BRD`, `FRN`, `UNK`) exist only in `src/ui/labelText.ts`, as a `Record<ClassLabel, string>`.

```ts
// tests/guards/taxonomy.test.ts (essential logic)
const OK = new Set([...CLASS_LABELS, 'HOSTILE', 'NON_HOSTILE', 'SWARM_ELEMENT_FW', 'SWARM_SATURATE',
                    'CIVIL_QUAD', 'BIRD_FLOCK', 'FRIENDLY_UAS']);
for (const file of walk('src')) {
  for (const tok of readFileSync(file, 'utf8').match(/\b(?:HOSTILE|SWARM|CIVIL|FRIENDLY|BIRD|UNKNOWN)[A-Z_]*\b/g) ?? []) {
    if (!OK.has(tok)) throw new Error(`${file}: non-canonical class token ${tok}`);
  }
}
// and outside taxonomy.ts, canonical label *string literals* are forbidden: use CLASS_LABELS / constants.
```

**R3.2 — `UNKNOWN_EVIDENCE_INSUFFICIENT` semantics.** It is a label the trainee may commit ("I looked and cannot tell"). It is never a truth class. `TrackEntity.label === null` means "no label entered yet". For fire control both `null` and `UNKNOWN_EVIDENCE_INSUFFICIENT` count as **not classified**. For scoring, the explicit label earns the matrix's UNKNOWN column; `null` at the deadline earns `C = 0`.

**R3.3 — Ground truth never leaves `src/sim`.** `TruthEntity`, `truthClass`, `droneClass`, `valueInr` of an entity and `truthRef` MUST NOT be imported or received by `render/`, `ui/` or `store/`. The UI receives only `TrackEntity` and operator log lines from `sim/oplog.ts`. The AAR may show truth only on the AAR screens, after the session ends. The single truth accessor is `ReplaySim.truthView()` (`src/sim/replay.ts`), importable only from `src/ui/aar/**` and `src/render3d/aarScene.ts`.

**R3.4 — Symbology reflects the trainee's label, never truth** (`DESIGN.md` §3): `null` → dashed amber `?`; `UNKNOWN_EVIDENCE_INSUFFICIENT` → solid amber `?`; hostile labels → crimson diamonds; `CIVIL_UAS`/`BIRD` → green squares; `FRIENDLY` → cyan circle. Symbols come from `src/render/symbols.ts` only. Describe the scheme as "NATO-inspired"; never as APP-6 or MIL-STD-2525 compliant.

**R3.5 — Live CER is an estimate.** The console shows `CER … EST` computed from the nominal value implied by the trainee's label (`HOSTILE_ATTACK` → `FPV_ATTACK`, `HOSTILE_ISR` → `RECON_QUAD`, `SWARM_ELEMENT` → `SWARM_ELEMENT_FW`); unlabelled tracks show `CER —`. The scored CER (true value) appears only in the AAR.

**R3.6 — Leak test.** `tests/e2e/truthLeak.spec.ts` plays DEMO-1 and asserts the DOM never contains any `DroneClassId` string (`FPV_ATTACK`, `SWARM_ELEMENT_FW`, …) or a truth class the trainee did not commit, until the AAR screen.

---

## 4. Scoring and engagement mathematics

All constants live in `/public/config.json` (schema in `ARCHITECTURE.md` §3.8). Code reads them through `cfg()`; **no numeric literal other than 0, 1, 2, 100 and 1000 may appear in `scoring.ts`, `effectors.ts`, `roe.ts`, `oracle.ts`** (ESLint `no-magic-numbers` with that allowlist).

**R4.1 — Clamping.** Every score component (`D, C, G, R, S, E_econ, E_time, SAL-score, SAT-score`) and the session score is clamped to `[0, 100]` through the single `clamp()` in `scoring.ts`; fractions through `clamp01()`. A `NaN` or `Infinity` is a bug: throw in development, and in production substitute 0 and log `SCORING_ANOMALY`.

**R4.2 — Formulas (authoritative).**

| Quantity | Definition |
| --- | --- |
| `t_trk` | tick the track first appears in the table; all trainee-time metrics start here (not `t_vis`, which is diagnostic only) |
| `T_budget` | `t_PNR − t_trk`, must be ≥ `scoring.minBudgetMs` (6000 ms) in every scenario |
| Track score, hostile | `S = 0.25 D + 0.20 C + 0.35 G + 0.20 R` |
| Track score, non-hostile | `S = 0.5 C + 0.25 G + 0.25 R` (no `D`) |
| `D` | `100 × clamp01(1 − (t_desig − t_trk) / T_budget)`; never designated ⇒ 0 |
| `C` | `classMatrix[truth][label]`; `label = null` at the deadline ⇒ 0. Deadline: `t_PNR` for hostile, and for non-hostile the first of crossing `R_min` or session end. The label used is the one held at `t_eng`, or at the deadline if never engaged |
| `CER` | `Σ effector cost on the track / true threat value` (value 0 ⇒ CER undefined) |
| `E_econ` | `100` if `CER ≤ 1`, else `max(0, 100 − 40 × log10(CER))` |
| `E_time` | `100 × clamp01(1 − |R_engage − R_opt| / R_opt)`; `R_opt` = midpoint of the effector envelope; `R_engage` = range at the neutralising engagement (or the last one) |
| `G`, hostile neutralised before PNR | `0.6 E_econ + 0.4 E_time` |
| `G`, hostile leaker with ≥ 1 engagement | `0.3 E_econ` |
| `G`, hostile leaker with no engagement | `0` |
| `G`, non-hostile left alone | `100`; engaged ⇒ `0` |
| `G` cap | `G = min(G, 40)` if any engagement on the track has `KINETIC_OVER_ZONE` |
| `R` | `clamp(100 − 100 × w_e × ρ × I_overlap − 50 [civil engaged] − 100 [friendly engaged] − 20 × N_ROE, 0, 100)`; the collateral term uses the worst engagement on the track; no engagement ⇒ `R = 100` |
| `I_overlap` | 1 if the target position at fire lies inside the zone polygon expanded by the effector's `debrisM` |
| Session score | `100 × Σ ω_i S_i / Σ ω_i − 20 × leakers − 25 × critical events`, clamped; `ω`: attack 1.0, ISR 0.6, swarm element 0.4, any decoy 0.3; critical event = civil or friendly engaged |
| Grade | ≥ 70 `PROFICIENT_IN_SIMULATION` (≥ 85 also sets `distinction`), 50–69 `DEVELOPING`, < 50 `NEEDS_RETRAINING` |
| `SAL-score` | `100 × clamp01(1 − SAL / 6000 ms)`; only for chaos events that degraded the sensor in use at onset; never switched ⇒ `SAL = event duration`; no such event ⇒ metric skipped |
| `SAT-score` | `100 ×` fraction of swarm elements engaged before PNR (skipped if no swarm) |
| EMA | `EMA₁ = x₁`; `EMAₙ = 0.4 xₙ + 0.6 EMAₙ₋₁`; skipped metrics keep their EMA; no history ⇒ weakness `w = 0.5` |
| Difficulty | `d₀ = 0.3`; `dₙ₊₁ = clamp(dₙ + 0.15 (Scoreₙ − 70)/30, 0, 1)`; updated after **TRAIN** sessions only |

**R4.3 — Engagement rules.**
1. A kinetic effector (`wE ≥ 0.3`) fired with the target inside a zone polygon (debris-expanded) whose `ρ > 0.5` MUST register `KINETIC_OVER_ZONE` automatically, increment `N_ROE`, emit `ROE_VIOLATION`, and cap that track's `G` at 40.
2. **Firing on an unclassified track is an automatic ROE violation** (`UNCLASSIFIED_RELEASE`): `label ∈ {null, UNKNOWN_EVIDENCE_INSUFFICIENT}` at the fire tick. Fire is not blocked for this; the consequence is the point.
3. `CER > 10` (true CER) MUST set `UNFAVOURABLE_EXCHANGE`. This is class-independent and covers the required case **a missile on the commercial recon quad (CER 75, `E_econ` 25) always triggers the flag**; a missile on the FPV (CER 30, `E_econ` ≈ 41) also does.
4. Fire requires `q ≥ Q_min (0.6)`, range inside the effector envelope, effector not disabled by chaos, and tick before the track's PNR. Weapons release after PNR is impossible; a still-alive hostile at PNR is a leaker.
5. The kill outcome is drawn at the fire tick from the `kill` stream: `Pk = Pk0 × g(R) × h(chaos)`, with `g` = 1 on the middle 60% of the envelope tapering linearly to 0 at the edges.
6. Civil or friendly engaged ⇒ `critical event` (session penalty) and `G = 0` for that track.

**Worked fixtures (must be unit tests):**
- FPV (value ₹1,00,000) hit by RF soft-kill (₹100) at 1.56 km: `CER 0.001`, `E_econ 100`, `R_opt 1.1 km`, `E_time 58.2`, `G = 0.6×100 + 0.4×58.2 = 83.3`.
- Recon quad (₹40,000) hit by missile (₹30,00,000) at 2.0 km over open ground: `CER 75`, `E_econ 25`, `R_opt 3.0 km`, `E_time 66.7`, `G = 0.6×25 + 0.4×66.7 = 41.7`, flag `UNFAVOURABLE_EXCHANGE`.
- Same missile engagement with the target inside an urban zone (`ρ 0.8`, debris-expanded overlap): `G = min(41.7, 40) = 40`, `KINETIC_OVER_ZONE`, `N_ROE ≥ 1`.

**R4.4 — TRAIN vs EVAL.** Difficulty adapts so that scores converge near 70, so TRAIN scores are **not comparable between trainees**. Leaderboards, percentiles, unit heatmaps and "improvement" deltas MUST use EVAL sessions only, and trend charts MUST show difficulty `d`. Aborted and `unverified` sessions never enter aggregates.

**R4.5 — Fairness.** The Director MUST NOT emit a spec that fails any validator check in `ARCHITECTURE.md` §6.1, and MUST NOT return an unvalidated mutated spec.

---

## 5. Doctrinal honesty

**R5.1 — Every number is notional.** Speeds, RCS, costs, Pk, envelopes, collateral weights and thresholds are placeholders for DSSC faculty to tune. Every screen that shows them (Config, AAR) carries the footer `NOTIONAL PARAMETERS — NOT FOR OPERATIONAL USE`.

**R5.2 — No unsupported claims.** Code, UI text, docs and the pitch MUST NOT say or imply: certified, validated against real systems, operationally ready, MIL-STD/APP-6 compliant, "NATO standard", endorsed by any force or agency, or that training with the tool measurably improves performance (unless backed by data collected from the team's own sessions, labelled as a small sample). Never claim VR as working unless a session was run on a real headset and recorded in `MEMORY.md`; until then say "VR-capable (experimental, not yet tested on hardware)".

**R5.3 — Generic only.** Use generic categories (RF soft-kill, laser, gun, interceptor drone, missile). Do not name real platforms, real weapon models, real units or locations, and do not include anything resembling classified or export-controlled specifications.

**R5.4 — Terminology.** "Adaptive, profile-driven scenario generation" (not "AI model" or "machine learning"), unless the optional Thompson-sampling upgrade (F-07b) has shipped, in which case say "adaptive scenario generation with a bandit lever selector".

**R5.5 — Provenance.** Any real-world number you adopt (for example a published typical speed) goes into `MEMORY.md` §6 with its public source before it enters `config.json`.

---

## 6. UI and design guardrails

**R6.1** Follow `DESIGN.md`. Banned: radii above 2 px, shadows, blur, CSS gradients on DOM elements, purple/indigo palettes, Inter or system-ui as primary type, emoji, icon packs, toasts, hero layouts. The Tailwind theme resets the default palette so these cannot be typed; `tests/guards/design.test.ts` also scans `src/`.

**R6.2** At 1366×768 and 1280×700 there is **no vertical page scroll** on any screen. The radar is `min(520px, calc(100vh − 190px))` square. Layout constants live in `theme.css` custom properties; do not hard-code heights in components.

**R6.3** Fonts are bundled and loaded before first canvas text draw. No `font-family` outside `--font-label`, `--font-mono`, `--font-display`.

**R6.4** Colour is never the sole carrier of meaning (shape/text redundancy). Contrast per `DESIGN.md` §1.2.

**R6.5** Canvas code MUST NOT allocate per frame in hot paths, MUST NOT trigger layout (no DOM reads in the rAF loop), and MUST draw at `devicePixelRatio` capped at 2.

---

## 7. Code, dependency and quality rules

**R7.1 — TypeScript.** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. No `any`. `@ts-expect-error` only with a one-line reason and a TASK id.

**R7.2 — Module boundaries** (`ARCHITECTURE.md` §2): `sim` imports nothing outside `sim`; `render` imports only `sim/types`; `ui` never imports `sim/core` internals; enforced by `tests/guards/imports.test.ts` and ESLint `no-restricted-imports`.

**R7.3 — Purity.** `scoring.ts`, `aar.ts`, `oracle.ts`, `masking.ts`, `features.ts`, `validate.ts` are pure functions of their inputs (and the config object passed in). They never read globals, storage or time.

**R7.4 — Tests.** Every `src/sim` module has unit tests. Golden tests (DEMO-1 timeline, replay equality, `stateHash` trace) and the guard tests run in `npm run check`. Tests are never deleted or loosened to make a change pass; if a golden fixture must change, follow R2.6.

**R7.5 — File and function size.** Files under 400 lines, functions under 60 lines, unless a `MEMORY.md` entry justifies it.

**R7.6 — No placeholders in merged code.** No `TODO`, `FIXME`, `lorem`, stub functions returning constants, or commented-out code, unless tied to a `TASK-Px-yy` id in `Tasks.md`.

**R7.7 — Logging.** No `console.*` in `src/sim` or `src/director`. Diagnostics go through events.

**R7.8 — Budgets.** Frame under 16 ms at 100 live tracks on an i3 with integrated graphics; sim step under 1.5 ms; heap under 150 MB; `dist/` under 8 MB; cold start under 3 s. 3D/VR budgets are in R10.8.

**R7.9 — Versioning.** `SIM_VERSION` = `package.json` version. Bump the minor version for any change to outcomes (R2.6), and record it in `MEMORY.md`.

---

## 8. Rules for AI coding agents

1. **Read first:** `MEMORY.md` (status, patterns, traps), then the task in `Tasks.md`, then the relevant section of `ARCHITECTURE.md`/`DESIGN.md`. Do not start coding before you can name the files you will touch.
2. **One task at a time.** Finish a task's acceptance criteria before the next. Keep diffs small and focused; do not refactor unrelated code.
3. **Never guess missing facts.** If a number, behaviour or interface is unspecified, add an entry to `MEMORY.md` §2 "Open questions", choose the stricter or safer reading, and continue.
4. **Run `npm run check`** (typecheck, lint, unit, golden, guards) before declaring a task done. Run `npm run test:e2e` for tasks that touch layout or the network.
5. **Never weaken a guard, rule or test.** If a guard blocks you, the design is wrong or a decision is needed; log it.
6. **Update the records in the same change:** tick sub-tasks in `Tasks.md`; update status, patterns, and any new trap in `MEMORY.md`; add Decision-log entries for deviations.
7. **Do not add dependencies** (R1.7) or introduce a second way of doing something that already has a single gateway (fetch, RNG, clock, class labels, symbols).
8. **Visual work is verified, not assumed.** You cannot see the UI: use Playwright screenshots and DOM/layout assertions (`scrollHeight`, element boxes) and compare against `DESIGN.md` dimensions.
9. **Be quota-efficient** when using a rate-limited free tier: batch related edits into one pass, write the test with the code, avoid open-ended "make it look better" loops, and commit after every green task.

---

## 9. Enforcement map

| Rule | Mechanism |
| --- | --- |
| R1.1, R1.3, R1.7 | `tests/guards/network.test.ts`, `deps.test.ts`; ESLint `no-restricted-globals` (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`) and `no-restricted-imports` |
| R1.2, R1.6 | `tests/e2e/airgap.spec.ts` (route recorder, websocket listener) + CSP |
| R2.1, R2.4, R2.11 | ESLint boundaries; `tests/guards/sim-purity.test.ts` |
| R2.2, R2.3 | ESLint `no-restricted-properties` (`Math.random`); rng key-table unit test |
| R2.5 | unit tests for `applyTickFor`; e2e input-log inspection |
| R2.6, R2.9, R2.12 | `tests/golden/*` on the pinned Chromium; CI blocks on diff |
| R2.8 | `stateHash` round-trip test (`JSON.parse(JSON.stringify(state))` equality) |
| R3.1 | `tests/guards/taxonomy.test.ts` |
| R3.3, R3.6 | import guard; `tests/e2e/truthLeak.spec.ts` |
| R4.1–R4.5 | `tests/unit/scoring.test.ts` (fixtures above), `validate.test.ts`, ESLint `no-magic-numbers` on scoring files |
| R5.* | review checklist + `tests/guards/copy.test.ts` (greps UI strings for banned phrases: certified, validated, MIL-STD, APP-6, operational) |
| R6.1–R6.3 | `tests/guards/design.test.ts`; `tests/e2e/layout.spec.ts` |
| R7.* | `tsc --noEmit`, ESLint, CI script `npm run check` |
| R10.1, R10.4, R10.5 | `tests/guards/three.test.ts` (import location, banned loaders and Math.random-based utilities), bundle-analysis assertion that the main chunk has no `three` |
| R10.2, R10.3 | `tests/unit/render3d/gating.test.ts`; import guard for truth types and `truthView` |
| R10.6 | XR unit test of `FrameDriver` handoff (tick continuity); input-log inspection |
| R10.7, R10.10 | `tests/e2e/view3d.spec.ts` (fallback, leak test) |
| R10.8 | `tests/e2e/view3d.spec.ts` (`renderer.info` budgets under software WebGL) + manual hardware record |
| R10.9 | parity test: same spec + inputs ⇒ identical events and score for `viewMode` 2D and 3D |
| R10.11 | review: `MEMORY.md` §2 must hold a headset test record before any VR claim |

---

## 10. Three.js, 3D and VR rules

**R10.1 — Isolation and laziness.** `three` (and `three/examples/jsm/*`) MAY be imported only inside `src/render3d/**`. `src/render3d/` is reached from the rest of the app only through a dynamic `import()` in `src/ui/`; the main chunk MUST NOT contain Three.js. Allowed example modules: `OrbitControls`, `BufferGeometryUtils`, and `GLTFLoader` (parse only).

**R10.2 — View-only.** 3D and VR code reads `SimView` and nothing else, and affects the sim only through `enqueue(command)` with the same quantisation as the 2D UI (R2.5). It MUST NOT import from `sim/core`, `sim/scoring`, or any module that exposes `TruthEntity`.

**R10.3 — Information gating.** In every scored session the 3D and VR views draw only what the sensors provide: track estimates and the trainee's label (symbol), altitude from `altBin` midpoints, no live marker for masked tracks, EO silhouettes from `evidence`, terrain from `zones`. Ground truth MUST NOT be drawn, even faintly. The only exception is the post-session AAR 3D replay (`aarScene.ts`) using `ReplaySim.truthView()`.

**R10.4 — No network through Three.js.** MUST NOT use `TextureLoader`, `ImageLoader`, `ImageBitmapLoader`, `FileLoader`, `CubeTextureLoader`, `AudioLoader`, `DRACOLoader`, `KTX2Loader`, or `GLTFLoader.load()`. Textures are procedural (`CanvasTexture`). GLB models, if used, are fetched by `loadStaticBinary` from the allowlisted `/models/*.glb` path and passed to `GLTFLoader.parse`. Models MUST be uncompressed. Each model needs a licence entry in `MEMORY.md` §6.

**R10.5 — Determinism hygiene.** `Math.random` is banned (R2.2), and so are Three's `MathUtils.randFloat`, `randInt`, `randFloatSpread` and `generateUUID`. Cosmetic randomness uses `mulberry32(hash32(…))` from `render/fx.ts` and never feeds the sim. Render-time clocks (`THREE.Clock`, `performance.now`) are allowed in `render3d/` only.

**R10.6 — XR loop and input timing.** While an XR session presents, the frame source is `renderer.setAnimationLoop` supplied to `startLoop` through `FrameDriver` (`setDriver`); on `sessionend` the window driver is restored. The sim, accumulator and input queue MUST NOT be reset by the handoff. XR input events use `event.timeStamp`; polled gamepad edges use the XR frame `time`; both go through `applyTickFor`. There is no pause in VR (R2.10).

**R10.7 — 2D is the baseline.** The 2D canvas console MUST remain fully functional and the default. A missing WebGL2, a failed or slow chunk load (> 3 s), or a lost context MUST fall back to 2D without stopping the session, and show the reason in the strip. No scored feature may depend on WebGL.

**R10.8 — Budgets.** Chunk under 1.5 MB minified. HIGH tier: 60 fps, under 150k triangles, under 250 draw calls (use `InstancedMesh`). LOW tier: under 60k triangles, under 120 draw calls. VR: at least 72 fps (90 on PC headsets) at LOW with fixed foveation; if the budget is missed, VR stays "experimental". No lights, no shadow maps by default, no post-processing.

**R10.9 — Scoring parity.** Scoring, timing, RNG, events and replays MUST be identical across 2D, 3D and VR. The session records `viewMode` (`'2D' | '3D' | 'VR'`) for transparency only; it never changes a formula, a threshold or a leaderboard rule. 3D and VR are not allowed to make the task easier by revealing more than 2D does.

**R10.10 — Resource hygiene.** `dispose()` frees every geometry, material, texture, render target and listener. Ten 2D↔3D toggles MUST return `renderer.info.memory.geometries` and `.textures` to baseline. Handle `webglcontextlost` and `webglcontextrestored`.

**R10.11 — VR claims.** VR is experimental until a real-headset run is recorded in `MEMORY.md` §2 (device, runtime, browser build, fps, date). Emulator results do not count. UI text and the pitch say "VR-capable (experimental)" until then. Comfort: no app-driven camera motion or locomotion, UI 0.6–1.0 m away, text at least 28 px on panel textures, 10-minute session advisory.

**R10.12 — One axis mapping.** All conversions go through `toThree(x, y, z) = (x, z, −y)` in `render3d/coords.ts`. Do not write inline axis swaps.

**R10.13 — Design parity.** The 3D look follows `DESIGN.md` §11: unlit flat materials, the token palette, no glow, gradient skyboxes, shadows or glossy surfaces.
