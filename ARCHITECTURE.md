# ARCHITECTURE.md: DRISHTI-CUAS (SIH26247)

Applies PRD v1.1 plus the v1.1 Architecture & Scoring Patch. Where they differ, **the patch wins** (see MEMORY.md, Decision Log). Stack: React 19, TypeScript, Vite, Tailwind CSS, Zustand, native HTML5 Canvas 2D, Dexie.js (IndexedDB). No server, no network, no PixiJS, no Three.js.

---

## 1. System Topology and Offline-First Data Flow

### 1.1 Runtime topology (client-only)

```
+---------------------- Unit laptop, air-gapped, pinned Chromium ----------------------+
|                                                                                      |
|  static file server (tools/launcher, 127.0.0.1, serves dist/ only, no APIs)          |
|                                  |                                                   |
|  +-------------------------------v------------------------------------------------+  |
|  | Browser tab                                                                    |  |
|  |                                                                                |  |
|  |  DOM events --> InputQueue --> SimEngine (20 Hz, mutable state, seeded PRNG)   |  |
|  |                                   |  prev/curr state          |  SimEvent[]    |  |
|  |                                   v                           v                |  |
|  |                         Renderer (Canvas 2D, 60 fps)    EventRecorder          |  |
|  |                                                               |                |  |
|  |  Zustand sessionStore <-- uiSnapshot (20 Hz, shallow)         v                |  |
|  |        |                                               Dexie (IndexedDB)       |  |
|  |        v                                                      |                |  |
|  |  React UI (rails, panels, AAR)  <--- queries -----------------+                |  |
|  |                                                                                |  |
|  |  Director (src/director, TypeScript) --> ScenarioSpec --> SimEngine.load()     |  |
|  +--------------------------------------------------------------------------------+  |
|  Export: Dexie -> sessions.json / sessions.csv -> USB -> instructor laptop import    |
+--------------------------------------------------------------------------------------+
```

The Director only **generates** a complete `ScenarioSpec`. The engine **plays** it. Nothing mid-session reaches outside the browser.

### 1.2 Tick pipeline: input quantisation, fixed accumulator, interpolated rendering

Constants: `TICK_MS = 50` (dt = 0.05 s, 20 Hz), `MAX_FRAME_MS = 250` (spiral-of-death guard), session length 120 s = 2,400 ticks.

```
 DOM event (keydown / click)
   |  tRaw = simClockAtLastFrame + (ev.timeStamp - lastFrameTs) * speed
   v
 InputQueue.push({ tRawMs, applyTick: max(ceil(tRawMs / 50), currentTick + 1), action })

 requestAnimationFrame(frameTs):
   frameDelta = min(frameTs - lastFrameTs, 250)
   acc += frameDelta * speed          // speed locked to 1 in EVAL mode
   while (acc >= 50):
       engine.step()                  // tickIndex++, drains inputs with applyTick == tickIndex
       acc -= 50
   alpha = acc / 50                   // 0..1
   renderer.draw(engine.prev, engine.curr, alpha)   // positions lerped, sweep angle extrapolated
```

Rules of the pipeline:

1. The **simulation never reads the wall clock**. Only `tickIndex * 50` is sim time. The wall clock feeds the accumulator and nothing else.
2. A trainee action is applied at the **next tick boundary** after it occurred. `tMs = applyTick * 50` is the scored timestamp (deterministic). `tRawMs` is logged beside it as a diagnostic and shown in the AAR as "input timing (1 ms)".
3. Refresh rate is irrelevant: 30, 60 or 144 Hz displays run the same 20 Hz sim. Render cost scales with refresh rate, sim cost does not.
4. On `visibilitychange` to hidden, the engine pauses (accumulator frozen). Pauses are written as `SESSION_PAUSE` / `SESSION_RESUME` events and do not advance sim time. EVAL sessions flag any pause in the scorecard.
5. Canvas never subscribes to React or Zustand. It reads `engine.prev` / `engine.curr` directly each frame. React renders from `uiSnapshot` only (section 3.4).

---

## 2. Directory Structure

```
drishti-cuas/
  public/
    config.json                  # canonical notional parameters (edited by DSSC faculty)
  scripts/
    inline-config.mjs            # prebuild: validate config.json (zod) -> src/config/config.generated.ts
    build-fallbacks.mjs          # prebuild: run Director offline -> src/director/bundled/*.json (12 scenarios)
  tools/launcher/serve.mjs       # static server for dist/, 127.0.0.1 only
  src/
    config/        index.ts  schema.ts  config.generated.ts (git-ignored)
    sim/
      types.ts                   # all contracts in section 3
      taxonomy.ts                # CLASSES, CLASS_LABELS, hostile/non-hostile sets
      rng.ts                     # mulberry32, hash32, stream factory, keyed draws
      engine.ts                  # SimEngine: load(), step(), applyInput(), snapshot()
      inputQueue.ts
      entities.ts  behaviours.ts # drone profiles incl. TERRAIN_HUG, ORBIT_FEINT
      sensors.ts                 # radar Pd, EO/IR, RF, track quality q, class confidence
      masking.ts                 # zone ray test (URBAN, RIDGE, FOREST)
      chaos.ts                   # fog, jamming, rain, dropout state machine
      effectors.ts               # Pk model, kill resolution
      roe.ts                     # gating: Q_min, classified, PNR, zone rules
      oracle.ts                  # cheapest admissible effector
      scoring.ts                 # D, C, G, R, S, session score, grade
      metrics.ts                 # AARMetrics aggregation from events
      triggers.ts                # reactive trigger evaluation
    director/
      director.ts  generator.ts  levers.ts  profile.ts
      features.ts  novelty.ts  validate.ts
      bundled/                   # DEMO-1, DEMO-2, EVAL pack (6), fallbacks (12)
    render/
      renderer.ts  radarLayer.ts  eoirLayer.ts  rfLayer.ts
      symbols.ts  hud.ts  palette.ts
    store/
      sessionStore.ts            # Zustand facade (section 3.4)
      aarStore.ts  settingsStore.ts
    db/
      dexie.ts  recorder.ts  queries.ts  io.ts (export/import)  migrations.ts
    ui/
      Console.tsx  TopBar.tsx  TrackTable.tsx  EngagementPanel.tsx  EventLog.tsx
      HotWash.tsx  Login.tsx
      aar/ Scorecard.tsx  KpiTiles.tsx  Timeline.tsx  ConfusionMatrix.tsx
           TrendChart.tsx  SkillSpider.tsx  RedTeamPlan.tsx  UnitView.tsx
    main.tsx
  tests/
    unit/  golden/  e2e/         # Vitest, golden replay + DEMO-1, Playwright network-blocked test
```

---

## 3. State Machine and Data Contracts

### 3.1 Taxonomy (7 canonical classes, patch section 1)

```ts
export const CLASSES = [
  'UNKNOWN_EVIDENCE_INSUFFICIENT', 'HOSTILE_ATTACK', 'HOSTILE_ISR', 'SWARM_ELEMENT',
  'CIVIL_UAS', 'BIRD', 'FRIENDLY',
] as const;
export type TrackClass = typeof CLASSES[number];
export type TrueClass = Exclude<TrackClass, 'UNKNOWN_EVIDENCE_INSUFFICIENT'>; // ground truth is never UNKNOWN
export const HOSTILE: ReadonlySet<TrackClass> = new Set(['HOSTILE_ATTACK','HOSTILE_ISR','SWARM_ELEMENT']);
```

`UNKNOWN_EVIDENCE_INSUFFICIENT` is (a) the label every new track carries until the trainee classifies it and (b) a label the trainee may select deliberately. Either way the track counts as **unclassified** for weapons release (ROE) and scores per the UNKNOWN column of the matrix in `config.json` (section 3.3 of Rules.md).

### 3.2 Core interfaces

```ts
export type SensorMode = 'RADAR' | 'EOIR' | 'RF';
export type ZoneType = 'URBAN' | 'RIDGE' | 'FOREST';
export type Profile = 'DIRECT' | 'TERRAIN_HUG' | 'ORBIT_FEINT' | 'SWARM_SATURATE' | 'ERRATIC' | 'LOITER';
export type EffectorId = 'RF_SOFTKILL' | 'LASER' | 'GUN' | 'INTERCEPTOR' | 'MISSILE';
export type ChaosType = 'FOG' | 'JAMMING' | 'RAIN' | 'RADAR_DROPOUT';

/** F2T2EA per track. FIND=plot seen, FIX=designated, TRACK=firm (q>=Q_min), TARGET=classified + effector chosen. */
export type F2T2EAStep =
  'UNDETECTED' | 'FIND' | 'FIX' | 'TRACK' | 'TARGET' | 'ENGAGE' | 'ASSESS' | 'CLOSED';

export interface Vec3 { x: number; y: number; z: number }   // metres; z is scalar altitude, masking only

export interface TrackEntity {
  id: string;                        // ground-truth id 'H-1', 'B-1', 'C-1'
  trackNo: string | null;            // 'T-01', assigned at TRACK_INIT
  trueClass: TrueClass;
  droneType: 'RECON_QUAD' | 'FPV_ATTACK' | 'SWARM_ELEMENT' | 'LOITERING_MUNITION' | 'CIVIL_UAS' | 'BIRD' | 'FRIENDLY_UAS';
  pos: Vec3; prev: Vec3; vel: Vec3;  // prev used for render interpolation
  rcsM2: number; valueInr: number | null;
  emitsRf: boolean; remoteId: boolean; iff: boolean;
  profile: Profile; spawnTMs: number;
  lifecycle: 'DORMANT' | 'ACTIVE' | 'NEUTRALISED' | 'LEAKED' | 'DEPARTED';
  // trainee-facing picture (the only data the renderer may draw as classification)
  traineeLabel: TrackClass;          // default UNKNOWN_EVIDENCE_INSUFFICIENT
  step: F2T2EAStep;
  q: number;                         // track quality 0..1 (position data only)
  cCls: number;                      // classification confidence hint 0..1 (never gates fire)
  masked: boolean; coastingSinceMs: number | null; ghostSigmaM: number;
  hitHistory: boolean[];             // last 3 sweeps, 2-of-3 initiation
  // timestamps (sim ms, tick-quantised); null until reached
  tVis: number | null; tTrk: number | null; tDesig: number | null;
  tCls: number | null; tEng: number | null; tPnr: number | null;
  engagements: number; weaponUsed: EffectorId | null;
}

export interface ZoneSpec {
  id: string; type: ZoneType; polygon: [number, number][];  // metres, CCW
  heightM: number; shadowM: number; rho: number;            // rho 0..1 (ridge/forest = 0)
}

export interface ThreatSpawn {
  id: string; droneType: TrackEntity['droneType']; trueClass: TrueClass;
  spawnTMs: number; waypoints: Vec3[]; speedMps: number; profile: Profile;
  rcsM2: number; valueInr: number | null; emitsRf: boolean; remoteId: boolean; iff: boolean;
}

export interface ChaosSpec { type: ChaosType; tStartMs: number; tEndMs: number; severity: number }

export interface TriggerSpec {
  id: string;
  when: { kind: 'MDT_EXCEEDS' | 'TRACK_NEUTRALISED' | 'KINETIC_ON_BIRD' | 'NO_SENSOR_SWITCH'; arg?: number | string };
  action: { kind: 'SPAWN' | 'EXTEND_CHAOS'; spawns?: ThreatSpawn[]; extendMs?: number };
  maxFires: 1;
}

export interface ScenarioSpec {
  id: string; schemaVersion: 1; simVersion: string; configHash: string;
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  seed: number; difficulty: number; dayNight: 'DAY' | 'NIGHT';
  durationMs: 120_000 | 30_000;
  asset: { x: 0; y: 0; rMinM: number };
  zones: ZoneSpec[]; threats: ThreatSpawn[]; decoys: ThreatSpawn[];
  chaos: ChaosSpec[]; triggers: TriggerSpec[];
  roeText: string;
  levers: { id: string; reason: string }[];     // shown in AAR "Red Team plan"
  features: number[];                           // 33-dim vector (section 5.2)
  benchId?: string;                             // EVAL pack only
}

export type SimEventType =
  | 'SIM_START' | 'SPAWN' | 'DETECT' | 'TRACK_INIT' | 'MASKED' | 'REACQUIRE'
  | 'DESIGNATE' | 'SENSOR_SWITCH' | 'CLASSIFY' | 'ENGAGE' | 'ENGAGE_RESULT' | 'ASSESS'
  | 'CHAOS_ON' | 'CHAOS_OFF' | 'TRIGGER' | 'ROE_VIOLATION' | 'FLAG' | 'LEAK'
  | 'SNAPSHOT' | 'SESSION_PAUSE' | 'SESSION_RESUME' | 'SESSION_END';

export interface SimEvent {
  seq: number;                 // monotonic per session; breaks ties at equal tMs
  tMs: number;                 // tick-quantised sim time (scored)
  tRawMs?: number;             // raw input time, user actions only
  type: SimEventType;
  trackNo?: string; entityId?: string;
  payload: Record<string, unknown>;   // fully self-describing, see 4.3
}

export interface AARMetrics {
  sessionUid: string; mode: 'TRAIN' | 'EVAL'; score: number; grade: Grade;
  metMs: number | null;          // mean(tEng - tTrk), engaged hostiles
  mdtMs: number | null;          // mean(tDesig - tTrk)
  mctMs: number | null;          // mean(tCls - tDesig)
  s2sMs: number | null;          // mean(tEng - tDesig)
  detToTrackMs: number | null;   // mean(tTrk - tVis), diagnostic only
  clsAccuracy: number;           // correct / all tracks that existed
  clsCoverage: number; hostileRecall: number; hostilePrecision: number;
  aggregateCer: number | null; unfavourableExchanges: number;
  collateralIncidents: number; roeViolations: number; leakers: number; leakRate: number;
  salMs: number | null; salScore: number | null; swarmSat: number | null;
  dScore: number; cScore: number; econScore: number; rScore: number;
  confusion: number[][];         // 7x7, rows true (UNKNOWN row always 0), cols predicted
}
export type Grade = 'PROFICIENT_IN_SIMULATION' | 'DEVELOPING' | 'NEEDS_RETRAINING';
```

### 3.3 Per-track state machine

```
UNDETECTED --(beam hit, Pd draw)--> FIND --(2 of 3 sweeps: TRACK_INIT, tTrk)--> [track in table]
FIND --(trainee DESIGNATE, tDesig)--> FIX --(q >= Q_min for 1 s)--> TRACK
TRACK --(CLASSIFY with a non-UNKNOWN label, tCls)--> TARGET
TARGET --(ENGAGE, tEng; allowed only if ROE gate passes)--> ENGAGE --(ENGAGE_RESULT)--> ASSESS
ASSESS --(trainee ASSESS KILL | NO_KILL | UNKNOWN)--> CLOSED     (NO_KILL and alive: back to TARGET)
Any step --(q < Q_min)--> FIX (coasting; weapons release blocked)
Any step --(t >= tPnr and alive)--> LEAK event, lifecycle LEAKED, step CLOSED
```

Transition guards live only in `roe.ts` and `engine.ts`. The UI may not set `step` directly.

### 3.4 Zustand facade and render-loop contract

- `SimEngine` is a plain class instance created once. It owns the authoritative mutable state (`curr`, `prev`, `events`). It is **not** stored in React state.
- `sessionStore` exposes **actions** (`designate(trackNo)`, `classify(trackNo, label)`, `selectEffector(...)`, `fire(trackNo)`, `assess(trackNo, result)`, `setSensor(mode)`, `pause()`) that call `inputQueue.push(...)`. Actions never mutate sim state.
- Each tick, `engine.step()` ends by calling `store.setState({ ui: buildUiSnapshot(engine) })` where the snapshot holds only table rows, sensor health, clock, recent log lines, and CER preview. Components select with shallow equality. The snapshot is capped at 150 rows.
- The renderer holds a reference to the engine and ignores the store. Hover and selection are local renderer state, pushed to the store on change only.

### 3.5 Seeded PRNG streams (golden-replay determinism)

`mulberry32(seed32)` is the only random source in `src/sim` and `src/director`. One scenario seed is split into **independent streams** by label so that trainee actions can never shift unrelated draws:

```ts
export const streamSeed = (scenarioSeed: number, label: string, key = 0) =>
  hash32(`${scenarioSeed}|${label}|${key}`);

// 1. TRAJECTORY  per entity: mulberry32(streamSeed(seed, 'traj', entityIndex))
//    consumed only at spawn to pre-generate jitter, bird Brownian steps, orbit phase.
// 2. SENSE       stateless keyed draw: u = keyedU(seed, 'sense', entityIndex, sweepIndex)
//    one uniform per (entity, sweep); the Pd comparison is u < Pd. No shared cursor, so
//    the number of tracks the trainee looks at cannot change another track's detection.
// 3. KILL        mulberry32(streamSeed(seed, 'kill')), consumed once per ENGAGE in
//    tick order. The draw and result are logged, so replay never needs the stream.
// 4. SCENARIO    mulberry32(streamSeed(seed, 'gen')), used only inside the Director.
```

`keyedU` hashes `(seed, label, a, b)` to a float in [0,1). Streams 1, 2 and 4 depend only on the spec. Stream 3 depends on the trainee's engagement order, which is exactly why every kill draw is logged in `ENGAGE_RESULT.payload.u`.

**Two determinism contracts:**

| Contract | What it guarantees | How it is tested |
|---|---|---|
| Event-sourced replay (AAR) | Replay reconstructs the timeline **only** from the stored `events` array. It never calls the Director or the engine. Bit-identical by construction. | AAR replay of a stored session yields the same rendered marker list and metrics as the hot-wash did. |
| Golden re-simulation (CI) | Same `ScenarioSpec` + same recorded input log on the pinned browser produces an identical event sequence (compared field by field) and a score within 1e-6. | `tests/golden/replay.spec.ts`, DEMO-1 input log fixture. |

---

## 4. Storage and Persistence Architecture

### 4.1 Dexie schema

```ts
db.version(1).stores({
  units:          'uid, name',
  trainees:       'uid, unitUid, &callsign',
  scenarios:      'uid, seed, mode, benchId, createdAt',
  sessions:       'uid, traineeUid, mode, startedAt, [traineeUid+mode+startedAt], [mode+traineeUid+startedAt]',
  trackResults:   '++id, sessionUid, [sessionUid+trackNo], trueClass',
  events:         '++id, sessionUid, [sessionUid+tMs+seq], [sessionUid+type+tMs]',
  chaosLog:       '++id, sessionUid, type',
  traineeProfile: '[traineeUid+metric]',
  difficulty:     'traineeUid',
  settings:       'key',
});
```

- `uid` is a string `<callsign>-<startedAtIso>-<4 hex>` so sessions from different laptops never collide on import. No auto-increment ids on exportable tables.
- No real names or service numbers. Trainees have a pseudonymous `callsign`.
- Events are written in batches of at most 200 via `bulkAdd` inside one transaction, flushed every 1 s and at `SESSION_END`. Sessions are **saved locally first**; scoring and AAR read from the stored rows.

### 4.2 Millisecond replay querying

```ts
// events between a and b ms, in exact order
db.events.where('[sessionUid+tMs+seq]')
  .between([uid, a, Dexie.minKey], [uid, b, Dexie.maxKey], true, false).toArray();
// all ENGAGE events, time-ordered
db.events.where('[sessionUid+type+tMs]').between([uid,'ENGAGE',0],[uid,'ENGAGE',Infinity]).toArray();
```

`SNAPSHOT` events are written every 250 ms (5 ticks). Payload is a compact array of `[entityIndex, x, y, z, step, q, flags]` for live entities, so the scrubber can jump to any time by finding the last snapshot at or before `t`, then applying the later discrete events and interpolating positions to the exact ms. Budget: 120 s x 4 Hz x about 100 entities is under 50,000 numbers per session.

### 4.3 Event payload contracts (self-describing, required for event-sourced replay)

| Event | Required payload |
|---|---|
| `SPAWN` | full `ThreatSpawn` plus entityIndex |
| `TRIGGER` | `triggerId`, `firedAtMs`, **full injected `ThreatSpawn[]`** (reactive injections are replayable without the Director) |
| `DESIGNATE` | `trackNo`, `via: 'KEY'\|'CLICK'` |
| `CLASSIFY` | `trackNo`, `label`, `cClsShown`, `sensorsSeeing[]` |
| `ENGAGE` | `trackNo`, `effector`, `rangeM`, `zoneId?`, `rhoZone`, `cer`, `roeGate: {qOk, classifiedOk, pnrOk, zoneOk}` |
| `ENGAGE_RESULT` | `trackNo`, `pk`, `u`, `killed` |
| `CHAOS_ON/OFF` | `type`, `severity`, `affectedSensors[]` |
| `MASKED / REACQUIRE` | `trackNo`, `zoneId`, `thetaT`, `thetaMask` |
| `SESSION_END` | final `AARMetrics` and per-track results (so the stored scorecard never needs recomputing) |

### 4.4 Export / import format (multi-laptop aggregation)

```json
{
  "format": "drishti-sessions", "version": 1,
  "simVersion": "1.1.0", "configHash": "sha256:...", "exportedAt": "2026-10-17T10:00:00Z",
  "sessions": [ { "session": {}, "scenario": {}, "tracks": [], "events": [], "chaos": [] } ],
  "checksum": "sha256:..."
}
```

- Export: `db/io.ts` builds the JSON (and a flat CSV of `sessions` plus `trackResults`), checksums with `crypto.subtle.digest('SHA-256')` (available offline on `localhost`), and triggers a Blob download.
- Import: parse, verify checksum, validate with zod, **dedupe by `session.uid`**, warn on `configHash` or `simVersion` mismatch (scores from different configs are not comparable), then `bulkPut` in one transaction. Unit view includes EVAL sessions only.

---

## 5. Fairness Validator and Novelty Engine (`src/director`)

### 5.1 Fairness validator (`validate.ts`)

A spec is accepted only if every hostile `h` passes all three checks, simulated with an **ideal operator** (instant sensor choice, EO/IR always slewed to the target, deterministic Pd criterion). Rejected specs are regenerated; the Director never returns an unvalidated spec.

1. **Time budget:** `T_budget(h) = t_PNR(h) - t_trk(h) >= 6 s`, where `t_trk` is the earliest tick at which radar Pd >= 0.5 holds for three consecutive sweeps.
2. **Admissible effector:** the set `A(h) = { e : envelope(e) intersects the path inside the sensing window, Pk_eff(e,h) >= 0.6 under scheduled chaos, ROE-compliant (no kinetic with w_e >= 0.3 over a zone with rho > 0.5) }` is non-empty.
3. **Sensing window:** compute track quality on the 50 ms grid:

```
q_radar(t) = 0.8  if (Pd_det(t) >= 0.5) and not masked(t) and A_env(t) > 0
q_eo(t)    = 0.7  if (R(t) <= 2500 m x fogFactor(t) x nightFactor) and not masked_eo(t)
q_rf(t)    = 0.4  if emitsRf and (R(t) <= 4000 m) and not jammed(t)
q(t)       = 1 - (1 - q_radar)(1 - q_eo)(1 - q_rf)

W(h) = longest contiguous run of ticks in [t_trk, t_PNR) with q(t) >= Q_min (0.6)
accept iff W(h) >= 6 s
```

Because `q_rf = 0.4 < Q_min`, RF alone can never open a window; RF plus EO/IR (q = 0.82) or radar (q = 0.88) can. Check against DEMO-1: H-1 has q = 0.8 from T+9 to T+30 (21 s) and from T+51 to T+82.5 (31.5 s), so W = 31.5 s and the spec passes.

Chaos schedule must additionally satisfy: at most one concurrent event, and at least one sensor class functional at every tick (AC-4).

### 5.2 Novelty engine (`features.ts`, `novelty.ts`)

Feature vector `f` (33 dimensions, then L2-normalised): hostile count / 12; decoy ratio; fraction of threats per profile (4: DIRECT, TERRAIN_HUG, ORBIT_FEINT, SWARM_SATURATE); fraction per class (6); bearing histogram of threat approach weighted by value (8 sectors); chaos events per type (4, normalised by 3); total chaos duration / session; zone-type presence (3); fraction of hostile path length inside zone shadow; mean `T_budget` / 60 s; log-scaled mean RCS; swarm size / 12; day/night flag; difficulty `d`.

```ts
cos(a, b) = dot(a, b)            // both already L2-normalised
accept(spec) = max_{h in last10(traineeUid, mode='TRAIN')} cos(spec.features, h.features) < 0.85
```

Generation loop (matches PRD 5.4): 20 attempts of `chooseLevers -> buildSpec -> novelty + validate`; then 20 attempts of `mutate -> validate`; then `pickBundledFallback(d)` flagged in the AAR. EVAL packs are exempt from novelty (fixed by design) but not from validation, which is run once at build time by `scripts/build-fallbacks.mjs`.

### 5.3 Adaptation loop (rule-based, explainable)

1. After a TRAIN session: update `EMA_k` for `k in {D, C, E_econ, R, SAL, SAT}` (first valid sample seeds the EMA, alpha = 0.4; metrics with no valid observation are skipped) and `d_{n+1} = clamp(d_n + 0.15 (Score_n - 70) / 30, 0, 1)`.
2. Next scenario: `w_k = 1 - EMA_k / 100` (0.5 with no history); sample 1 to 2 levers with `p_k = exp(4 w_k) / sum_j exp(4 w_j)` using the SCENARIO stream; write each chosen lever plus its reason into `spec.levers` for the AAR panel.
3. Describe it as "adaptive, profile-driven scenario generation". It is not a trained model.
