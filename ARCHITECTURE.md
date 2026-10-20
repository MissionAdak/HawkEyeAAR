# ARCHITECTURE.md — DRISHTI-CUAS

**Product:** offline-first, browser-based 2D C-UAS radar-console simulator, adaptive decision trainer and After-Action Review (AAR) engine for SIH26247.
**Source of truth:** PRD v1.1 for product intent and scoring math. Where this file or its siblings (`DESIGN.md`, `Rules.md`, `Tasks.md`, `MEMORY.md`) differ from the PRD, **these five files win**. Every deviation is listed in `MEMORY.md` §3 (Decision log).
**Stack:** React 19 + TypeScript (strict) + Vite + Tailwind CSS + Zustand + native HTML5 Canvas 2D + Dexie.js (IndexedDB). No server logic, no internet. PixiJS, Three.js and chart libraries are not used.

---

## 1. System topology and offline data flow

### 1.1 Runtime topology

```
                         UNIT LAPTOP (air-gapped, Windows or Linux)
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │ start.bat / start.sh                                                          │
 │   └─ Vite Preview (static file server, 127.0.0.1:4173, serves ./dist)        │
 │                                                                               │
 │  BROWSER (single origin http://127.0.0.1:4173)                                │
 │  ┌────────────┐  commands   ┌──────────────────────────────────────────────┐  │
 │  │ React UI   │────────────▶│ InputQueue (quantised to 50 ms ticks)        │  │
 │  │ + Zustand  │             └───────────────┬──────────────────────────────┘  │
 │  │ (UI state, │                             ▼                                 │
 │  │ projection)│◀──projection──  SimCore  (plain TS, fixed 20 Hz, seeded)      │
 │  └─────┬──────┘   per tick      │  state: plain JSON-serialisable data        │
 │        │                        │  RNG: traj | sense | kill  (keyed mulberry32)│
 │        │ DOM panels             ├──▶ SimEvent log (ms-stamped, append-only)   │
 │        ▼                        ▼                                             │
 │  ┌────────────────────────────────────┐   ┌──────────────────────────────┐   │
 │  │ Canvas renderers @ 60 fps (rAF)    │   │ Dexie / IndexedDB            │   │
 │  │ read SimCore.view() + alpha        │   │ sessions, events, inputs,    │   │
 │  │ interpolate prevPos→pos            │   │ profiles, drafts, config     │   │
 │  └────────────────────────────────────┘   └──────────────┬───────────────┘   │
 │                                                          │ JSON bundle       │
 │  Scenario Director (TypeScript, in-browser, build-time + runtime)             │
 │   weakness profile → levers → ScenarioSpec → fairness validator → novelty     │
 └───────────────────────────────────────────────────────────────┬───────────────┘
                                                                 ▼
                       USB stick / shared folder: drishti-session-bundle.json
                       (instructor laptop imports → unit view, EVAL sessions only)
```

There is no application server. The launcher serves static files only and binds to loopback. After page load, the app makes **no requests** except same-origin static asset loads (see `Rules.md` §1).

### 1.2 Three clocks (never mix them)

| Clock | Source | Used by | Rule |
| --- | --- | --- | --- |
| Wall clock | `performance.now()` / `event.timeStamp` (same time base) | `src/sim/loop.ts`, `src/sim/clock.ts`, input handlers only | Nowhere else may read wall time. |
| Sim clock | `tick × 50 ms` (integers) | `SimCore`, scoring, AAR, Director, validator | The only clock for anything that is logged or scored. |
| Render clock | `requestAnimationFrame` timestamp | Canvas renderers, CSS animations | Cosmetic only; never feeds the sim. |

### 1.3 Fixed 20 Hz accumulator, decoupled from refresh rate

```ts
// src/sim/loop.ts — the only file that calls requestAnimationFrame for the sim
export const DT_MS = 50;                       // 20 Hz, dt = 0.05 s

export function startLoop(sim: SimCore, draw: (v: SimView, alpha: number) => void,
                          clock: SimClock, onFinish: () => void): () => void {
  let last = performance.now();
  let acc = 0;                                 // sim-ms waiting to be stepped
  let raf = 0;

  const frame = (now: number) => {
    const wallDt = Math.min(now - last, 250);  // a stalled tab never fast-forwards the sim
    last = now;
    acc += wallDt * clock.speed;               // speed is 1 in scored sessions
    while (acc >= DT_MS && !sim.finished) {
      sim.step();                              // drains inputs for tick N+1, then advances
      acc -= DT_MS;
    }
    clock.anchor(now, sim.tick * DT_MS + acc); // lets handlers map event.timeStamp → sim ms
    draw(sim.view(), acc / DT_MS);             // alpha ∈ [0,1): interpolation weight
    if (sim.finished) { onFinish(); return; }
    raf = requestAnimationFrame(frame);
  };

  const onVis = () => { if (!document.hidden) { last = performance.now(); } };
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
}
```

Properties this guarantees:

- A 30 Hz, 60 Hz, 120 Hz or 144 Hz display all produce the same sequence of `sim.step()` calls for the same input log, because stepping depends only on the accumulator, never on frame count.
- A background tab stops `requestAnimationFrame`; on return, `last` is reset so the sim resumes without a jump.
- Scored sessions run at speed 1×. Speed 1×/2×/4× exists only for AAR replay and DEMO scenarios.
- There is no pause in scored sessions. `Esc` opens an ABORT dialog; confirming ends the session with `SESSION_END{reason:'ABORT'}` and the session is flagged `aborted` and excluded from scoring aggregates.

### 1.4 Input quantisation to 50 ms ticks

UI handlers never mutate state. They convert the browser timestamp to sim time, quantise to the next tick and enqueue a command.

```ts
// src/sim/clock.ts
export class SimClock {
  speed = 1;
  private anchorWall = 0;
  private anchorSimMs = 0;                       // sim ms at anchorWall
  anchor(wallNow: number, simMs: number) { this.anchorWall = wallNow; this.anchorSimMs = simMs; }
  /** Sim time (ms, fractional) at which a DOM event happened. */
  simMsAt(eventTimeStamp: number): number {
    return this.anchorSimMs + (eventTimeStamp - this.anchorWall) * this.speed;
  }
}

// src/sim/inputQueue.ts
export function applyTickFor(simMs: number, lastProcessedTick: number): number {
  return Math.max(lastProcessedTick + 1, Math.ceil(simMs / DT_MS));
}
export function enqueue(cmd: Command, ev: { timeStamp: number }) {
  const tick = applyTickFor(clock.simMsAt(ev.timeStamp), sim.tick);
  queue.push({ applyTick: tick, rawTimeStamp: ev.timeStamp, cmd });   // rawTimeStamp: diagnostics only
}
```

Rules that follow:

1. An event that occurred before the last processed tick (late delivery) is applied at the next unprocessed tick, never in the past.
2. `SimEvent.tMs = applyTick × 50`. **All trainee-time metrics (t_desig, t_cls, t_eng, SAL) use the quantised time**, never `rawTimeStamp`.
3. `sim.step()` first drains every queued command with `applyTick === sim.tick + 1`, in queue order, then advances the world.
4. The input log (`InputRecord[]`) stores `applyTick`, not wall time, so a replay needs no clock mapping.

### 1.5 Render interpolation at 60 fps

Each entity keeps `prevPos` (position at tick N−1) and `pos` (tick N). The renderer draws `lerp(prevPos, pos, alpha)`. The radar sweep angle is drawn from continuous sim time `((tick·50 + acc) mod 2000) / 2000 × 2π`; **detection** uses the discrete tick interval (§4.1), so drawing smoothness never changes outcomes. Phosphor afterglow decay uses wall `dt` (`alpha = 1 − exp(−dt/τ)`, τ = 1.2 s) because it is cosmetic.

### 1.6 Deterministic order of operations inside `sim.step()`

1. Drain commands for this tick (`DESIGNATE`, `CLASSIFY`, `SELECT_EFFECTOR`, `FIRE`, `ASSESS`, `SENSOR_MODE`, `EO_SLEW`).
2. Apply chaos schedule (`CHAOS_ON/OFF`), update `A_env`, EO/RF factors.
3. Spawn entities scheduled for this tick (`SPAWN`).
4. Advance trajectories (`traj` stream for jitter), update behaviour-profile phases.
5. Compute masking per entity per zone (§4.2).
6. Update sensors: radar sweep interval test, EO alignment, RF visibility (`sense` stream).
7. Track manager: init, hit/miss bookkeeping, coast, lost, reacquire, `q` and `c_cls` (§4.3).
8. F2T2EA transitions from commands and sensor state (§3.3).
9. Resolve engagements fired this tick (`kill` stream), emit `ENGAGE`, `ROE_VIOLATION`.
10. PNR and leak checks; reveal pending kill results whose display delay elapsed.
11. Evaluate reactive triggers (read-only on trainee behaviour so far).
12. Emit events in the order produced above; append to the log.
13. Publish snapshot (`view()`), update `stateHash` every 20 ticks.

Changing this order changes replay results: any edit requires bumping `SIM_VERSION` and regenerating golden fixtures (`Tasks.md` TASK-P3-11 and TASK-P5-01).

### 1.7 React / Zustand / Canvas boundary

| Concern | Owner | Notes |
| --- | --- | --- |
| Simulation state | `SimCore` instance (plain TS) | Sole source of truth for the sim. Plain JSON-serialisable data; no class instances or closures inside state. |
| App/UI state | Zustand store | `app` (route, mode, trainee), `session` (status, projection), `ui` (selected track, armed effector, class-grid focus), `aar` (selected session, playhead). |
| Sim → UI | `sim.onTick(view => store.setState({ proj: toProjection(view) }))` | The projection is derived and read-only; it is overwritten every tick and never edited by UI code. |
| UI → Sim | Store actions call `enqueue(cmd, event)` | Actions never write to `proj`. |
| Canvas | Renderers read `sim.view()` directly in the rAF callback | Canvas never goes through React. |

UI refresh budget: canvases 60 fps; timer, ROE state and sensor badges 20 Hz; track table and event log 10 Hz (every second tick) with memoised rows keyed by track id and a per-track `rev` counter.

`TruthEntity` (ground truth) never leaves `src/sim`. The projection contains only `TrackEntity` (operator-visible). See §3.2.

### 1.8 Serving, packaging and CSP

- **Serving & Evaluation:** Built assets in `./dist` are served locally via `Vite Preview` on `http://127.0.0.1:4173` (fixed loopback port ensuring IndexedDB origin consistency across sessions).
- **USB kit:** `dist/`, `package.json`, launch scripts (`start.bat`, `start.sh`), and `README-OFFLINE.txt`. The 8 MB budget applies to `dist/` only.
- **Content Security Policy:** The HTML `<meta>` tag CSP embedded in `index.html` is the accepted, authoritative, and compliant security design for the Vite Preview environment:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline';
  img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; worker-src 'self' blob:;
```

This enforces strict zero-network air-gap protection (`connect-src 'none'`) with zero runtime `fetch` dependencies.

- **Vite:** `base: './'`, `build.target: 'es2022'`, `build.sourcemap: false`, `build.cssCodeSplit: false`, no PWA plugin, no analytics plugin. `define: { __SIM_VERSION__ }` from `package.json` version.

---

## 2. Directory structure

```
drishti-cuas/
├─ public/
│  ├─ config.json                    # ALL notional numbers (costs, speeds, Pk, envelopes, weights)
│  ├─ feature-calibration.json       # generated by tools/calibrate-features.ts (mean/std, 33 dims)
│  ├─ scenarios/
│  │  ├─ demo-1.json  demo-2.json    # DEMO-1 (120 s, golden) and DEMO-2 (30 s, missile penalty demo)
│  │  ├─ eval-pack.json              # 6 fixed scenarios: d = 0.3, 0.5, 0.7 × 2
│  │  └─ fallback-d{20,35,50,65,80}.json  # 12 pre-generated TRAIN fallbacks (several per tier)
│  └─ fonts/                         # woff2 latin subsets: Chakra Petch, JetBrains Mono, Share Tech Mono
├─ src/
│  ├─ main.tsx  App.tsx  theme.css   # Tailwind v4 @theme tokens (see DESIGN.md)
│  ├─ sim/                           # NO react, NO dom, NO store, NO db imports
│  │  ├─ taxonomy.ts                 # the only file that spells class labels
│  │  ├─ types.ts                    # contracts in §3
│  │  ├─ rng.ts                      # mulberry32, hash32, keyed draws, stream seeds
│  │  ├─ config.ts                   # schema validation (zod), canonical hash, typed accessors
│  │  ├─ clock.ts  loop.ts  inputQueue.ts
│  │  ├─ core.ts                     # SimCore: step(), view(), snapshot(), restore(), stateHash()
│  │  ├─ trajectories.ts             # behaviour profiles (DIRECT, TERRAIN_HUG, ORBIT_FEINT, SWARM_SATURATE)
│  │  ├─ masking.ts                  # elevation-angle masking, zone intersection
│  │  ├─ sensors.ts                  # radar sweep + Pd, EO alignment/clarity, RF DF
│  │  ├─ tracker.ts                  # track init, coast, lost, reacquire, q and c_cls
│  │  ├─ f2t2ea.ts                   # per-track state machine and fire preconditions
│  │  ├─ chaos.ts                    # FOG, JAMMING, RAIN, DROPOUT effects
│  │  ├─ effectors.ts                # Pk(R), envelopes, kill resolution
│  │  ├─ roe.ts                      # ROE checks, collateral overlap
│  │  ├─ oracle.ts                   # cheapest admissible effector, earliest feasible time
│  │  ├─ scoring.ts                  # D, C, G, R, per-track, session, grades (pure)
│  │  ├─ aar.ts                      # computeAAR(events, spec, config) → AARMetrics (pure)
│  │  ├─ oplog.ts                    # SimEvent → operator-visible log line (redacts truth)
│  │  └─ triggers.ts                 # reactive trigger evaluation
│  ├─ director/                      # imports sim/types, sim/rng, sim/masking, sim/sensors only
│  │  ├─ director.ts  profile.ts  levers.ts  generator.ts
│  │  ├─ features.ts                 # 33-dim feature vector + standardisation + cosine
│  │  └─ validate.ts                 # fairness validator (headless sensing run)
│  ├─ render/                        # canvas only; reads SimView; never imports store/ui/db
│  │  ├─ canvasKit.ts                # DPR handling, layers, font readiness
│  │  ├─ symbols.ts                  # class symbology Path2D definitions
│  │  ├─ radarLayer.ts  phosphor.ts  eoirLayer.ts  rfLayer.ts  hud.ts  fx.ts
│  ├─ store/
│  │  ├─ consoleStore.ts             # Zustand: app, session, ui slices
│  │  ├─ aarStore.ts
│  │  └─ projection.ts               # SimView → UI projection
│  ├─ ui/
│  │  ├─ shell/ TopBar.tsx LeftRail.tsx RightRail.tsx BottomBar.tsx Console.tsx
│  │  ├─ panels/ TrackTable.tsx EvidencePanel.tsx F2T2EAPanel.tsx ClassGrid.tsx EffectorList.tsx RoeStrip.tsx
│  │  ├─ aar/ AARScreen.tsx Scorecard.tsx Timeline.tsx DecisionCard.tsx RedTeamPlan.tsx
│  │  ├─ aar/charts/ ConfusionMatrix.tsx Spider.tsx TrendChart.tsx UnitTable.tsx   # custom canvas
│  │  ├─ screens/ Home.tsx TraineeSelect.tsx Briefing.tsx HotWash.tsx ConfigImport.tsx
│  │  └─ kit/ Panel.tsx Tag.tsx KeyCap.tsx Gauge.tsx
│  └─ db/
│     ├─ dexie.ts                    # schema + versioned migrations
│     ├─ repo.ts                     # typed repositories (sessions, events, profiles, drafts)
│     ├─ io.ts                       # database initialization and persistence helpers
│     └─ aarTransfer.ts              # export/import session bundle, checksum, re-verification
├─ tools/
│  ├─ start.bat / start.sh           # evaluation launcher scripts
│  └─ inline-config.mjs              # build-time configuration inliner
├─ tests/
│  ├─ unit/  golden/  guards/  e2e/  # vitest + playwright (see §7)
├─ eslint.config.js  tsconfig.json  vite.config.ts  package.json
└─ ARCHITECTURE.md DESIGN.md Rules.md Tasks.md MEMORY.md
```

**Import direction (enforced by lint and `tests/guards/imports.test.ts`):**
`sim` → (nothing outside `sim`); `director` → `sim/{types,rng,masking,sensors,config,taxonomy}`; `render` → `sim/types`; `store` → `sim`, `db`; `ui` → `store`, `render`, `sim/types`, `sim/taxonomy`; `db` → `sim/types`.

---

## 3. State machine and data contracts

### 3.1 Taxonomy

```ts
// src/sim/taxonomy.ts — the ONLY file allowed to contain these string literals
export const CLASS_LABELS = [
  'UNKNOWN_EVIDENCE_INSUFFICIENT', 'HOSTILE_ATTACK', 'HOSTILE_ISR', 'SWARM_ELEMENT',
  'CIVIL_UAS', 'BIRD', 'FRIENDLY',
] as const;
export type ClassLabel = typeof CLASS_LABELS[number];
export type TruthClass = Exclude<ClassLabel, 'UNKNOWN_EVIDENCE_INSUFFICIENT'>;   // truth is never "unknown"
export const HOSTILE = ['HOSTILE_ATTACK', 'HOSTILE_ISR', 'SWARM_ELEMENT'] as const;
export const NON_HOSTILE = ['CIVIL_UAS', 'BIRD', 'FRIENDLY'] as const;
export const isHostile = (c: ClassLabel): boolean => (HOSTILE as readonly string[]).includes(c);
export function assertClassLabel(x: string): asserts x is ClassLabel {
  if (!(CLASS_LABELS as readonly string[]).includes(x)) throw new Error(`Non-canonical class label: ${x}`);
}
```

`TrackEntity.label === null` means *no label entered yet*. `UNKNOWN_EVIDENCE_INSUFFICIENT` is an explicit trainee decision ("I looked and cannot tell"). For fire control both count as **not classified** (weapons release is an ROE violation). For scoring, the explicit label earns partial credit (matrix column in §3.8) while `null` at the deadline earns `C = 0`.

### 3.2 Entities

```ts
export interface Vec3 { x: number; y: number; z: number }          // metres: x east, y north, z altitude AGL

export type DroneClassId =
  | 'RECON_QUAD' | 'FPV_ATTACK' | 'SWARM_ELEMENT_FW' | 'LOITERING_FW'
  | 'CIVIL_QUAD' | 'BIRD_FLOCK' | 'FRIENDLY_UAS';
export type BehaviourProfile = 'DIRECT' | 'TERRAIN_HUG' | 'ORBIT_FEINT' | 'SWARM_SATURATE' | 'ERRATIC' | 'TRANSIT';
export type Phase = 'CRUISE' | 'DESCENDING' | 'HUGGING' | 'CLIMBING';

/** Ground truth. Lives only inside src/sim. NEVER passed to render/, ui/, store/. */
export interface TruthEntity {
  id: string;                         // 'E-017'
  idx: number;                        // dense integer used as RNG key
  truthClass: TruthClass;
  droneClass: DroneClassId;
  pos: Vec3; prevPos: Vec3; vel: Vec3;
  rcsM2: number; valueInr: number;
  emitsRf: boolean; broadcastsRemoteId: boolean; hasPayload: boolean;
  profile: BehaviourProfile; phase: Phase; waypointIdx: number;
  spawnTick: number; alive: boolean; killedTick: number | null;
  pnrTick: number | null; leakedTick: number | null;
}

/** Operator-visible track. This is the ONLY entity type UI and renderers receive. */
export interface TrackEntity {
  id: string;                         // 'T-01'
  idx: number;                        // dense integer, RNG key for engagements
  state: 'ACTIVE' | 'COASTING' | 'LOST';
  step: F2T2EAStep;
  est: { x: number; y: number; vx: number; vy: number; sigmaM: number; altBin: 'LOW' | 'MED' | 'HIGH' };
  estPrev: { x: number; y: number };   // estimate one tick ago, for render interpolation
  q: number;                          // track quality: gates fire control
  cCls: number;                       // classification confidence hint: never gates fire control
  evidence: {
    radarSees: boolean; eoirSees: boolean; rfSees: boolean;
    microDoppler: 'ROTOR' | 'FLAP' | 'NONE';
    eoShape: 'QUAD' | 'FIXED_WING' | 'BIRD' | 'BLOB' | 'NONE';
    eoPayloadVisible: boolean; eoClarity: number;
    rfControlLink: boolean; remoteId: boolean; rfBearingDeg: number | null;
    rfBin: number | null;             // 0..999 notional spectrum bin = hash(entityIdx) mod 1000, for the waterfall
  };
  label: ClassLabel | null; labelTick: number | null; labelChanges: number;
  trkTick: number;                    // t_trk: tick the track first appeared in the table
  designatedTick: number | null;
  effectorId: EffectorId | null;      // currently armed
  engagements: number;                // count fired at this track
  pnrCrossed: boolean;
  fireBlockedReason: FireBlockReason | null;   // null = fire allowed
}
```

```ts
/** Everything the renderers and UI may read each frame. Contains no ground truth. */
export interface SimView {
  tick: number; tMs: number; durationMs: number; finished: boolean;
  operator: { sensorMode: SensorMode; eoAzimuthDeg: number; eoAligned: boolean };
  tracks: TrackEntity[];                                   // ascending idx
  plots: { x: number; y: number; paintedTick: number; falsePlot: boolean }[];   // raw radar paints for the phosphor layer
  zones: ZoneSpec[];
  chaos: { active: { id: string; type: ChaosType; remainingMs: number } | null;
           badges: Record<SensorMode, 'NOM' | 'DEG' | 'BLIND'> };
  rfEmitters: { trackId: string; bin: number; kind: 'LINK' | 'RID'; bearingDeg: number }[];
  asset: { name: string; rMinM: number };
  roe: { text: string; lastViolation: RoeFlag | null; violationTick: number | null };
}
```

The renderer derives the continuous sweep angle from `tMs` plus the interpolation remainder (`alpha × 50 ms`); the sweep is cosmetic, detection uses the discrete tick interval (§4.1).

The sim keeps a private `Map<trackIdx, truthIdx>` association. `TrackEntity` carries no truth reference, so a UI bug cannot leak ground truth.

### 3.3 Sensors and F2T2EA state machine

```ts
export type SensorMode = 'RADAR' | 'EOIR' | 'RF';
export type F2T2EAStep = 'FIND' | 'FIX' | 'TRACK' | 'TARGET' | 'ENGAGE' | 'ASSESS';
export type EffectorId = 'RF_SOFTKILL' | 'LASER' | 'GUN' | 'INTERCEPTOR' | 'MISSILE';
export type FireBlockReason = 'Q_LOW' | 'OUT_OF_ENVELOPE' | 'JAMMED' | 'PAST_PNR' | 'NO_EFFECTOR';
```

Which sensors contribute: **radar and RF are always active**; **EO/IR contributes only while the view mode is `EOIR` and the camera is aligned** (azimuth error ≤ 15°). The view mode is sim state (`operator.sensorMode`) because it drives SAL and EO alignment.

| Transition | Trigger | Notes |
| --- | --- | --- |
| (none) → `FIND` | Track initiates (2 hits in 3 sweeps) | `trkTick` set; event `TRACK_INIT`. |
| `FIND` → `FIX` | `DESIGNATE` command | Logs `DESIGNATE`. |
| `FIX` → `TRACK` | Automatic when `q ≥ Q_min` | |
| `TRACK` → `TARGET` | A label exists (`CLASSIFY` committed) and `q ≥ Q_min` | Label can be changed any time before `ENGAGE`. |
| `TRACK`/`TARGET` → `ENGAGE` | `FIRE` command with preconditions met | Firing from `TRACK` (no label) or with `UNKNOWN_EVIDENCE_INSUFFICIENT` is allowed but logs `UNCLASSIFIED_RELEASE`. |
| `ENGAGE` → `ASSESS` | After the effector's display delay | Outcome was drawn at the fire tick; the delay only reveals it. |
| `ASSESS` → `TARGET` | Outcome is MISS and the track is not past PNR | Re-engagement allowed. |
| any → `FIND` | Track becomes `LOST` | Designation and armed effector cleared, **label retained**. |
| `FIND` (after reacquire) → `FIX` | Trainee re-designates | With a retained label and `q ≥ Q_min`, the step then auto-advances `FIX → TRACK → TARGET`. |

Fire preconditions: `q ≥ Q_min`, range inside the armed effector's envelope, effector not disabled by chaos, track not past PNR. Failure sets `fireBlockedReason` and disables the UI button. Missing classification does **not** block fire; it is an ROE violation by design.

ASSESS is optional. The trainee declares `KILL` or `MISS`; a wrong declaration logs `correct:false`. BDA accuracy and coverage are reported KPIs and are **not** part of the weighted score (PRD v1.1 does not weight them).

### 3.4 ScenarioSpec

```ts
export type ZoneType = 'URBAN' | 'RIDGE' | 'FOREST';
export type ChaosType = 'FOG' | 'JAMMING' | 'RAIN' | 'DROPOUT';
export type Lever = 'DETECTION' | 'CLASSIFICATION' | 'ECONOMICS' | 'ROE' | 'SENSOR_ADAPT' | 'SWARM';

export interface ZoneSpec { id: string; type: ZoneType; polygon: [number, number][]; heightM: number; shadowM: number; rho: number }
export interface EntitySpec {
  id: string; truthClass: TruthClass; droneClass: DroneClassId;
  spawnMs: number; spawnPos: Vec3; waypoints: Vec3[]; speedMps: number;
  profile: BehaviourProfile; groupId: string | null;
  rcsM2: number; valueInr: number; emitsRf: boolean; broadcastsRemoteId: boolean; hasPayload: boolean;
}
export interface ChaosEventSpec { id: string; type: ChaosType; startMs: number; durationMs: number; targetSensor: SensorMode }
export type TriggerCondition =
  | { kind: 'TRACK_NEUTRALISED'; entityId: string }
  | { kind: 'MDT_ABOVE_MS'; entityId: string; ms: number }
  | { kind: 'KINETIC_AT_BIRD' }
  | { kind: 'SENSOR_DWELL_FRACTION'; sensor: SensorMode; fraction: number; afterMs: number };
export type TriggerAction =
  | { kind: 'SPAWN'; entities: EntitySpec[] }        // entities[].spawnMs are OFFSETS (ms) from the tick the trigger fires
  | { kind: 'SCHEDULE_CHAOS'; event: ChaosEventSpec }
  | { kind: 'EXTEND_CHAOS'; chaosId: string; extraMs: number };
export interface ReactiveTriggerSpec { id: string; once: boolean; condition: TriggerCondition; action: TriggerAction }

export interface ScenarioSpec {
  specVersion: 1;
  seed: number;                       // uint32 master seed
  nonce: string;                      // stored so the spec is reproducible without the generator
  difficulty: number;                 // d ∈ [0,1]
  benchId: string | null;             // set only for EVAL pack, DEMO and fallback scenarios
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  durationMs: number;                 // 120000 (DEMO-2: 30000)
  dayNight: 'DAY' | 'NIGHT';
  asset: { name: string; rMinM: number; antennaHeightM: number };
  zones: ZoneSpec[];
  threats: EntitySpec[];              // hostile classes only
  decoys: EntitySpec[];               // CIVIL_UAS, BIRD, FRIENDLY only
  chaos: ChaosEventSpec[];
  triggers: ReactiveTriggerSpec[];
  roeText: string;
  leversUsed: Lever[];
  features: number[];                 // 33-dim raw feature vector (§6.2)
  configHash: string;                 // sha-256 of canonical config at generation time
}
```

### 3.5 Commands, inputs and events

```ts
export type Command =
  | { kind: 'DESIGNATE'; trackId: string }
  | { kind: 'CLASSIFY'; trackId: string; label: ClassLabel }
  | { kind: 'SELECT_EFFECTOR'; trackId: string; effectorId: EffectorId }
  | { kind: 'FIRE'; trackId: string; effectorId: EffectorId }
  | { kind: 'ASSESS'; trackId: string; verdict: 'KILL' | 'MISS' }
  | { kind: 'SENSOR_MODE'; mode: SensorMode }
  | { kind: 'EO_SLEW'; trackId: string | null };
export interface InputRecord { applyTick: number; rawTimeStamp: number; cmd: Command }

export type RoeFlag = 'KINETIC_OVER_ZONE' | 'UNCLASSIFIED_RELEASE' | 'CIVIL_ENGAGED' | 'FRIENDLY_ENGAGED';
export type EngagementFlag = RoeFlag | 'UNFAVOURABLE_EXCHANGE';
interface EventBase { tick: number; tMs: number }          // tMs = tick × 50

export type SimEvent = EventBase & (
  | { type: 'SPAWN'; entityId: string; truthClass: TruthClass }
  | { type: 'DETECT'; entityId: string; sensor: SensorMode }
  | { type: 'TRACK_INIT'; trackId: string; entityId: string }
  | { type: 'MASKED'; trackId: string; zoneId: string; on: boolean }
  | { type: 'REACQUIRE'; trackId: string; fragmentedFrom: string | null }
  | { type: 'DESIGNATE'; trackId: string }
  | { type: 'SENSOR_SWITCH'; from: SensorMode; to: SensorMode }
  | { type: 'CLASSIFY'; trackId: string; label: ClassLabel; previous: ClassLabel | null }
  | { type: 'ENGAGE'; trackId: string; effectorId: EffectorId; rangeM: number; costInr: number;
      pk: number; cer: number; flags: EngagementFlag[] }
  | { type: 'KILL_RESOLVED'; trackId: string; engagementIdx: number; success: boolean }
  | { type: 'ASSESS'; trackId: string; verdict: 'KILL' | 'MISS'; correct: boolean }
  | { type: 'ROE_VIOLATION'; trackId: string; flag: RoeFlag }
  | { type: 'PNR_CROSSED'; trackId: string }
  | { type: 'LEAK'; trackId: string }
  | { type: 'CHAOS_ON'; chaosId: string; chaos: ChaosType }
  | { type: 'CHAOS_OFF'; chaosId: string }
  | { type: 'TRIGGER'; triggerId: string; reason: string }
  | { type: 'SESSION_END'; reason: 'TIME' | 'ABORT' }
);
```

`SPAWN` and `ENGAGE` carry ground-truth or scoring data and exist for the AAR only. The bottom-bar log shows `OperatorLogLine`s produced by `sim/oplog.ts`, which redacts truth (for example it prints `T-01 CLASSIFIED HOSTILE_ATTACK`, never `SPAWN FPV_ATTACK`).

### 3.6 AARMetrics

```ts
export interface TrackResult {
  trackId: string; entityId: string; truthClass: TruthClass; finalLabel: ClassLabel | null;
  tSpawnMs: number; tVisMs: number; tTrkMs: number; tDesigMs: number | null; tClsMs: number | null;
  tEngMs: number | null; tPnrMs: number | null; budgetMs: number;
  outcome: 'NEUTRALISED' | 'LEAKED' | 'HELD' | 'ENGAGED_NONHOSTILE';
  D: number | null; C: number; G: number; R: number; S: number;
  effectorIds: EffectorId[]; costInr: number; cer: number | null; eEcon: number | null; eTime: number | null;
  flags: EngagementFlag[]; oracleEffector: EffectorId | null; oracleEarliestMs: number | null;
  costRegretInr: number | null; maskedIntervalsMs: [number, number][]; fragmented: boolean;
}

export interface AARMetrics {
  sessionScore: number; grade: 'PROFICIENT_IN_SIMULATION' | 'DEVELOPING' | 'NEEDS_RETRAINING'; distinction: boolean;
  meanDetectionMs: number | null;       // MDT: mean(t_desig − t_trk)
  meanEngagementMs: number | null;      // MET: mean(t_eng − t_trk) over engaged hostile tracks
  meanClassificationMs: number | null;  // mean(t_cls − t_trk)
  sensorToShooterMs: number | null;     // mean(t_eng − t_desig)
  detectionToTrackMs: number | null;    // diagnostic: mean(t_trk − t_vis), not scored
  classificationAccuracy: number;       // diagonal / all tracks that existed (unclassified = miss)
  classificationCoverage: number;       // classified / all tracks
  hostileRecall: number | null; hostilePrecision: number | null;
  confusion: number[][];                // 6 truth rows × 7 label columns + a 7th "NONE" column appended: 6 × 8
  aggregateCer: number | null;          // Σ effector cost / Σ value of neutralised hostiles
  unfavourableExchanges: number; collateralIncidents: number; roeViolations: number;
  leakers: number; criticalEvents: number;
  salMs: number | null; salScore: number | null; satScore: number | null;
  bdaAccuracy: number | null; bdaCoverage: number | null;
  skill: { D: number | null; C: number | null; E_econ: number | null; R: number | null; SAL: number | null; SAT: number | null };
  tracks: TrackResult[];
  simVersion: string; configHash: string;
}
```

`confusion` has 6 truth rows and 8 columns: the 7 canonical labels plus a final `NONE` column for tracks never labelled. `computeAAR(events, spec, config)` is a pure function used at session end, in replay, and for import verification.

### 3.7 Separated seeded PRNG streams (mulberry32)

Three **runtime streams** (`traj`, `sense`, `kill`) plus one **generation stream** (`scenario`). Each stream has its own seed derived from the scenario master seed. Runtime draws are **keyed (stateless)**: the value depends only on `(stream, key tuple)`, never on how many draws happened before. This is what makes golden replay robust: a sensing draw for entity 7 at sweep 12 is identical whether or not the trainee fired a weapon earlier.

```ts
// src/sim/rng.ts
export function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type StreamId = 'traj' | 'sense' | 'kill' | 'scenario';
const SALT: Record<StreamId, number> = { traj: 0x7a31c5e1, sense: 0x2b9d4f07, kill: 0x91e3a6bd, scenario: 0x5c0f8a29 };

/** Allocation-free integer hash (murmur-style mixing). */
export function hash32(seed: number, a = 0, b = 0, c = 0, d = 0): number {
  let h = seed | 0;
  for (const x of [a, b, c, d]) {                 // ES2022: fine; replace with unrolled code if profiling demands
    h = Math.imul(h ^ (x | 0), 0x85ebca6b); h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  }
  return h >>> 0;
}
export const streamSeed = (master: number, s: StreamId) => hash32(master, SALT[s]);
/** One uniform draw in [0,1) for (stream, key). Deterministic and order-independent. */
export const draw = (master: number, s: StreamId, a = 0, b = 0, c = 0, d = 0): number =>
  mulberry32(hash32(streamSeed(master, s), a, b, c, d))();
export const sequence = (master: number, s: 'scenario') => mulberry32(streamSeed(master, s));  // generation only
```

Key conventions (the tuple order is part of the contract; changing it requires a `SIM_VERSION` bump):

| Stream | Consumer | Key `(a, b, c, d)` |
| --- | --- | --- |
| `traj` | Bird/erratic velocity jitter | `(entityIdx, tick, axis 0|1, 0)` |
| `traj` | Spawn-position jitter from reactive trigger | `(triggerIdx, entityIdx, 0, 0)` |
| `sense` | Radar Pd draw per sweep | `(entityIdx, sweepIdx, 0, 0)` |
| `sense` | Rain false plots (position, lifetime one sweep) | `(sweepIdx, k, channel 0..2, 0)` |
| `sense` | RF DF bearing noise | `(entityIdx, tick, 0, 0)` |
| `sense` | EO clarity noise (silhouette jitter) | `(entityIdx, tick, 1, 0)` |
| `kill` | Kill resolution | `(trackIdx, engagementIdx, 0, 0)` |
| `scenario` | Director generation | sequential generator, used only while generating; the resulting spec is stored |

Renderer-only visual noise uses its own `renderRng = mulberry32(frameCounter ^ 0xA5A5A5A5)` in `src/render/fx.ts`. It never feeds the sim. `Math.random()` is banned everywhere (`Rules.md` §2).

### 3.8 `public/config.json` (default values; every number here is notional)

```json
{
  "configVersion": 1,
  "notice": "NOTIONAL PARAMETERS - NOT FOR OPERATIONAL USE - TUNABLE BY DSSC FACULTY",
  "session": { "durationMs": 120000, "dtMs": 50, "displayDelayMs": { "RF_SOFTKILL": 1000, "LASER": 1500, "GUN": 800, "INTERCEPTOR": 3000, "MISSILE": 4000 } },
  "asset": { "name": "FOB ALPHA", "rMinM": 500, "antennaHeightM": 15 },
  "radar": { "maxRangeM": 5000, "sweepPeriodMs": 2000, "beamWidthDegCosmetic": 3, "refRcsM2": 0.01, "refRangeM": 3000,
             "pdK": 2.303, "trackInitHits": 2, "trackInitSweeps": 3, "activeIfHitWithinSweeps": 2,
             "coastDecayMs": 8000, "coastSigmaGrowthMps": 12, "sigma0M": 40, "qFirm": 0.8, "clsConfidenceMax": 0.5,
             "reacqGateSigmaMult": 3, "reacqGatePadM": 150 },
  "eoir": { "reachDayM": 2500, "nightFactor": 0.7, "fovDeg": 30, "alignToleranceDeg": 15, "slewDegPerS": 60,
            "qLaser": 0.7, "clsConfidenceMax": 0.9, "shapeClarity": 0.35, "payloadClarity": 0.6 },
  "rf": { "reachM": 4000, "dfSigmaDeg": 2.5, "dfMaxDeg": 5, "qBearingOnly": 0.4, "clsConfidenceMax": 0.9, "zonePowerFactor": 0.5 },
  "fusion": { "qMin": 0.6 },
  "terrain": { "URBAN": { "heightM": 40, "shadowM": 800 }, "RIDGE": { "heightM": 80, "shadowM": 1200 }, "FOREST": { "heightM": 25, "shadowM": 300 },
               "cruiseAltM": 120, "hugFraction": 0.5, "descentRateMps": 8 },
  "chaos": { "lambda0PerMin": 1.0, "difficultyGain": 2, "maxConcurrent": 1, "sensorSwitchExtensionMs": 5000,
             "FOG": { "durationS": [12, 25], "eoReachFactor": 0.25, "laserPkFactor": 0.5 },
             "JAMMING": { "durationS": [10, 20] },
             "RAIN": { "durationS": [15, 30], "radarAEnv": 0.6, "falsePlotsPerSweep": [1, 3] },
             "DROPOUT": { "durationS": [3, 6], "radarAEnv": 0 } },
  "droneClasses": {
    "RECON_QUAD":       { "speedMps": 15, "rcsM2": 0.01,  "valueInr": 40000,   "emitsRf": true },
    "FPV_ATTACK":       { "speedMps": 40, "rcsM2": 0.01,  "valueInr": 100000,  "emitsRf": true },
    "SWARM_ELEMENT_FW": { "speedMps": 45, "rcsM2": 0.01,  "valueInr": 50000,   "emitsRf": false },
    "LOITERING_FW":     { "speedMps": 50, "rcsM2": 0.05,  "valueInr": 1000000, "emitsRf": false },
    "CIVIL_QUAD":       { "speedMps": 10, "rcsM2": 0.02,  "valueInr": 0,       "emitsRf": true },
    "BIRD_FLOCK":       { "speedMps": 6,  "rcsM2": 0.003, "valueInr": 0,       "emitsRf": false },
    "FRIENDLY_UAS":     { "speedMps": 18, "rcsM2": 0.02,  "valueInr": 0,       "emitsRf": true }
  },
  "effectors": {
    "RF_SOFTKILL": { "costInr": 100,     "pk0": 0.8, "pk0RfSilent": 0.1, "envelopeM": [200, 2000],  "wE": 0.1, "debrisM": 0,   "kinetic": false },
    "LASER":       { "costInr": 500,     "pk0": 0.7,                      "envelopeM": [200, 1500],  "wE": 0.1, "debrisM": 0,   "kinetic": false },
    "GUN":         { "costInr": 20000,   "pk0": 0.6, "pk0SwarmElement": 0.35, "envelopeM": [100, 2000], "wE": 0.6, "debrisM": 150, "kinetic": true },
    "INTERCEPTOR": { "costInr": 200000,  "pk0": 0.8,                      "envelopeM": [500, 4000],  "wE": 0.3, "debrisM": 100, "kinetic": true },
    "MISSILE":     { "costInr": 3000000, "pk0": 0.9,                      "envelopeM": [1000, 5000], "wE": 0.9, "debrisM": 400, "kinetic": true },
    "plateauFraction": 0.6, "oracleMinPk": 0.6, "kineticWeightThreshold": 0.3
  },
  "scoring": {
    "trackWeights": { "hostile": { "D": 0.25, "C": 0.20, "G": 0.35, "R": 0.20 }, "nonHostile": { "C": 0.5, "G": 0.25, "R": 0.25 } },
    "threatOmega": { "HOSTILE_ATTACK": 1.0, "HOSTILE_ISR": 0.6, "SWARM_ELEMENT": 0.4, "DECOY": 0.3 },
    "econ": { "log10Slope": 40, "unfavourableCer": 10 },
    "gMultipliers": { "neutralised": { "econ": 0.6, "time": 0.4 }, "leakerAttempted": 0.3, "leakerNoAttempt": 0, "kineticOverUrbanCap": 40 },
    "roe": { "civilEngagedPenalty": 50, "friendlyEngagedPenalty": 100, "perViolation": 20, "urbanRhoThreshold": 0.5 },
    "session": { "perLeaker": 20, "perCriticalEvent": 25 },
    "salMaxMs": 6000,
    "minBudgetMs": 6000,
    "grades": { "distinction": 85, "proficient": 70, "developing": 50 }
  },
  "classMatrix": {
    "labels": ["HOSTILE_ATTACK", "HOSTILE_ISR", "SWARM_ELEMENT", "CIVIL_UAS", "BIRD", "FRIENDLY", "UNKNOWN_EVIDENCE_INSUFFICIENT"],
    "rows": {
      "HOSTILE_ATTACK": [100, 60, 60, 0, 0, 0, 30],
      "HOSTILE_ISR":    [60, 100, 60, 0, 0, 0, 30],
      "SWARM_ELEMENT":  [60, 60, 100, 0, 0, 0, 30],
      "CIVIL_UAS":      [20, 20, 20, 100, 50, 30, 60],
      "BIRD":           [20, 20, 20, 50, 100, 30, 60],
      "FRIENDLY":       [20, 20, 20, 30, 30, 100, 60]
    }
  },
  "adaptive": { "emaAlpha": 0.4, "softmaxBeta": 4, "d0": 0.3, "dGain": 0.15, "targetScore": 70,
                "hostileCount": [2, 8], "decoyRatio": [0.2, 0.5], "rcsMultMin": 0.5, "budgetCompressionMax": 0.4,
                "remoteIdBroadcastLossPerD": 0.3 },
  "fairness": { "minWindowMs": 6000, "hostileHandlingS": 4, "decoyHandlingS": 2, "loadCap": 0.8, "pnrMarginMs": 1000 },
  "novelty": { "maxCosine": 0.85, "history": 10, "attempts": 20, "mutateAttempts": 20 },
  "eval": { "tiers": [0.3, 0.5, 0.7], "scenariosPerTier": 2 }
}
```

Constants quoted in PRD v1.1 are used unchanged. Values the PRD did not fix (`displayDelayMs`, EO clarity thresholds, classification-matrix UNKNOWN column, `pnrMarginMs`, fairness load constants) are architecture choices recorded in `MEMORY.md` §3.

---

## 4. Simulation algorithms (summary; `src/sim/*` is the implementation)

### 4.1 Radar sweep and detection

- Sweep angle `θ(t) = 2π × ((t mod 2000 ms) / 2000)`, clockwise from north, 9° per tick.
- An entity at bearing `b` is **painted** in the tick whose angular interval `(θ_{n−1}, θ_n]` contains `b` (mod 2π). Exactly once per sweep; independent of display refresh.
- `SNR = (RCS / 0.01) × (3000 / R)^4 × A_env`; `Pd = 1 − exp(−2.303 × SNR)`; `R > 5000` or masked ⇒ `Pd = 0`. Hit if `draw(master,'sense',entityIdx,sweepIdx) < Pd`.
- Track initiates on 2 hits within 3 consecutive sweeps (`TRACK_INIT`, sets `trkTick`).
- Track `ACTIVE` while there is a hit in the current or previous sweep; otherwise `COASTING`. Coasting uncertainty `σ(t) = 40 m + 12 m/s × Δt`. After 8 s without a hit the track is `LOST` (designation cleared, label kept).
- **Reacquisition:** a later hit within the gate `3σ(t) + 150 m` of the ghost resumes the same track (`REACQUIRE`); outside the gate a **new track id** is created and `fragmentedFrom` records the old one (AAR flags track fragmentation).

### 4.2 Terrain masking (urban, ridge, forest)

For each zone `j` with polygon `P_j`, height `H_j`, shadow length `L_j`, antenna height `h_r`:
cast radar→target; if it intersects `P_j`, `d_n` = distance to the first (near-edge) intersection; `θ_mask = atan2(H_j − h_r, d_n)`, `θ_t = atan2(z − h_r, R)`. **Masked** iff `θ_t < θ_mask` and `R − d_n ≤ L_j`. Masked ⇒ radar `Pd = 0` and no EO line of sight. `MASKED{on:true/false}` events mark interval edges.
**RF is attenuated, not blocked:** if the target position lies inside a zone polygon, RF *power* is scaled by `zonePowerFactor = 0.5`; because RF power falls as `R⁻²`, effective reach is `reach × √0.5 = 2.83 km`. (Using 0.5 directly as a range multiplier would drop RF below the DEMO-1 masking geometry and break the walkthrough.)

### 4.3 Track quality `q` and classification confidence `c_cls`

- `q_radar = 0.8` while `ACTIVE`; while `COASTING`, `0.8 × max(0, 1 − Δt/8000)`.
- `q_eo = 0.7` if EO sees the target (mode `EOIR`, camera aligned within 15°, range ≤ `reach × factors`, LOS not masked).
- `q_rf = 0.4` if RF sees an emitter (bearing only) and RF is not jammed.
- `q = 1 − Π(1 − q_i)`. Fire control requires `q ≥ 0.6`. Radar alone suffices while the track is firm; RF alone never does.
- `c_cls = 1 − Π(1 − c_i)` with radar 0.5 (if seeing), EO 0.9 (if seeing, scaled by clarity), RF 0.9 (only if the target emits or broadcasts Remote-ID). `c_cls` is a display hint only.
- EO evidence: `clarity = clamp(1 − R / reach_eff, 0, 1)` with `reach_eff = 2500 × (night ? 0.7 : 1) × (fog ? 0.25 : 1)`; shape is revealed at `clarity ≥ 0.35`, payload at `clarity ≥ 0.6`; otherwise `BLOB`.

### 4.4 Engagement resolution and ROE

`Pk = Pk0 × g(R) × h(chaos)`. `g` is 1 on the middle 60% of the envelope and tapers linearly to 0 at both edges. `h`: laser ×0.5 in fog; RF soft-kill 0 under jamming. `Pk0` special cases: RF soft-kill 0.1 vs `emitsRf = false`; gun 0.35 vs swarm elements. **The outcome is drawn at the fire tick** (`kill` stream, key `(trackIdx, engagementIdx)`); `displayDelayMs` only delays the reveal. A fire command is accepted only before the track's PNR tick (range ≤ `rMinM` disables fire).
ROE flags are computed at the fire tick: kinetic (`wE ≥ 0.3`) with target inside the zone polygon expanded by `debrisM` where `rho > 0.5` ⇒ `KINETIC_OVER_ZONE` (caps `G ≤ 40`); release with `label ∈ {null, UNKNOWN_EVIDENCE_INSUFFICIENT}` ⇒ `UNCLASSIFIED_RELEASE`; truth `CIVIL_UAS` or `FRIENDLY` ⇒ `CIVIL_ENGAGED`/`FRIENDLY_ENGAGED`. `CER = effector cost / threat value`; `CER > 10` ⇒ `UNFAVOURABLE_EXCHANGE` (a missile on the ₹40,000 recon quad gives CER 75, `E_econ` 25). For tracks engaged more than once, track cost is the sum of engagement costs.

### 4.5 Chaos engine

Effects as in `config.json` §`chaos`. At most one concurrent event; the sensor badge colour changes within 1 s of onset (`CHAOS_ON` tick + 20). Sensor Adaptation Latency is measured from `CHAOS_ON` to the first `SENSOR_SWITCH` away from the degraded sensor, only if that sensor was the active view mode at onset. If the trainee has not switched within 5 s, the event is extended once by 5 s (trigger `EXTEND_CHAOS`).

---

## 5. Storage and persistence (Dexie.js / IndexedDB)

### 5.1 Schema

```ts
// src/db/dexie.ts
export class DrishtiDB extends Dexie {
  constructor() {
    super('drishti-cuas');
    this.version(1).stores({
      units:           '++id, &name',
      trainees:        '&uid, unitId, &[unitId+callsign]',
      scenarios:       '&uid, seed, benchId, createdAt',
      sessions:        '&uid, traineeUid, mode, startedAt, [traineeUid+startedAt], [mode+traineeUid], configHash',
      trackResults:    '++id, sessionUid, &[sessionUid+trackId]',
      events:          '++id, sessionUid, [sessionUid+tMs], [sessionUid+type]',
      inputs:          '++id, [sessionUid+applyTick]',
      chaosLog:        '++id, sessionUid',
      traineeProfile:  '[traineeUid+metric]',
      difficultyState: 'traineeUid',
      drafts:          'sessionUid',               // crash recovery: spec + inputs so far
      configOverrides: '&hash',
      meta:            'key',
    });
  }
}
```

- **Indexing for millisecond queries:** `[sessionUid+tMs]` supports `where('[sessionUid+tMs]').between([uid, from], [uid, to])` for windowed event reads; `[sessionUid+type]` feeds the timeline lanes. The AAR screen loads a session's events (typically under 3,000) into a sorted in-memory array once and uses binary search on `tMs` for scrubbing and marker hit-testing.
- **Writes:** events, inputs and track results are written with `bulkAdd` inside one transaction at session end. During a session only `drafts[sessionUid]` is refreshed every 5 s with `{spec, inputs}`; after a crash the app re-simulates the draft to recover the session.
- **Replay:** the replay engine loads `scenario spec + inputs`, re-runs the sim and stores `SimSnapshot`s every 100 ticks (5 s). Seeking to tick `T` restores the nearest earlier snapshot and steps at most 100 ticks. This requires `SimState` to be plain serialisable data (`Rules.md` §2.8).
- **Provenance:** every `sessions` row stores `simVersion`, `configHash`, `mode`, `dStart`, `aborted`. Unit aggregates group by `configHash`; mixed hashes show a warning badge.
- **Config resolution at boot:** build-time configuration inlining (`scripts/inline-config.mjs` generates `src/config/config.generated.ts` with build-time SHA-256 calculation) is the authoritative design. Optional override chosen by the instructor through a file picker (`<input type="file">` + `FileReader`, strictly in-memory without network calls), validated with the zod schema, stored in `configOverrides` by hash and activated in `meta`. Each session records the hash actually used.

### 5.2 Export/import bundle (air-gapped multi-laptop aggregation)

```json
{
  "format": "drishti-cuas/session-bundle",
  "version": 1,
  "exportedAt": "2026-10-24T09:41:05.000Z",
  "simVersion": "1.1.0",
  "configHash": "sha256:9f2c…",
  "unit": { "name": "ALPHA COY" },
  "trainees": [ { "uid": "b1c4…", "callsign": "VIPER-2", "role": "OPERATOR" } ],
  "sessions": [
    {
      "uid": "5d7e…", "traineeUid": "b1c4…", "mode": "EVAL", "startedAt": 1766000000000, "dStart": 0.5,
      "aborted": false, "score": 78.4, "grade": "PROFICIENT_IN_SIMULATION",
      "spec": { "…": "ScenarioSpec" }, "inputs": [ { "applyTick": 190, "rawTimeStamp": 9512.3, "cmd": { "kind": "DESIGNATE", "trackId": "T-01" } } ],
      "events": [ { "tick": 100, "tMs": 5000, "type": "SPAWN", "entityId": "E-001", "truthClass": "HOSTILE_ATTACK" } ],
      "tracks": [ { "trackId": "T-01", "…": "TrackResult" } ], "chaos": [ { "…": "ChaosEventSpec" } ]
    }
  ],
  "checksum": "sha256:3ab1…"
}
```

- `checksum` is SHA-256 of the canonical JSON (sorted keys, no whitespace) of everything except `checksum`. Use `crypto.subtle.digest` (available because `127.0.0.1` is a secure context); fall back to the bundled pure-TS SHA-256 if it is unavailable.
- **Import:** identity is `uid` (idempotent: re-importing the same bundle changes nothing). Callsign collisions between laptops are displayed as `CALLSIGN#2`; identity never uses callsigns.
- **Verification:** if `simVersion` and `configHash` match the local build, each imported session is re-simulated from `spec + inputs` and the score must match within `1e-6`; mismatches are stored but marked `unverified` and excluded from leaderboards. Different versions import as `unverified` with a badge.
- Unit view uses **EVAL sessions only** (`Rules.md` §4.9).

---

## 6. Fairness validator and novelty engine

### 6.1 Fairness validator (`src/director/validate.ts`)

The validator runs the **real sensing and tracking code** headless over the spec with an *ideal operator* policy: radar and RF always on; EO treated as aligned on whichever hostile needs it at the time; every hostile designated at `t_trk + 1 s`; no weapons fired. Because runtime draws are keyed (§3.7), the validator reproduces exactly the same `t_trk`, hits and `q(t)` the trainee will experience.

For each hostile `h`, on the 50 ms tick grid, define:

- `q_h(t)` = fused track quality (§4.3), with scheduled masking and chaos applied.
- `E_h(t)` = set of admissible effectors at `t`: inside envelope with `Pk(t) ≥ 0.6` (including `g(R)` and chaos factors, RF-silent and swarm special cases), not disabled by chaos, and ROE-compliant (kinetic not over a zone with `ρ > 0.5` after debris expansion).
- `t_trk,h` = first tick where the hostile's track is initiated via radar (2 hits within 3 consecutive sweeps per §4.3).
- `t_PNR,h` = first tick with target range `R ≤ rMinM`.

A spec is accepted only if **all** checks pass for **every** hostile:

| Check | Condition |
| --- | --- |
| (a) Budget | `T_budget,h = t_PNR,h − t_trk,h ≥ 6000 ms` |
| (b) Effector | `∃ t ∈ [t_trk,h, t_PNR,h): E_h(t) ≠ ∅` |
| (c) Sensing window | `∃` a contiguous run of ticks in `[t_trk,h, t_PNR,h)` with `q_h(t) ≥ Q_min = 0.6` of length `≥ 6000 ms` |
| (d) Joint feasibility | `∃` a contiguous run of length `≥ 6000 ms` where **both** `q_h(t) ≥ 0.6` and `E_h(t) ≠ ∅` (closes the gap where (b) and (c) are each satisfied at different times) |
| (e) PNR inside session | `t_PNR,h ≤ durationMs − 1000 ms` |

Scenario-level load check (f): with `H` hostiles and `K` decoys, `Σ = 4 s × H + 2 s × K` must satisfy `Σ ≤ 0.8 × (max_h t_PNR,h − min_h t_trk,h)`. Chaos constraints: at most one concurrent chaos event, and no schedule may leave a hostile failing (c) or (d). Rejected specs return `{ ok: false, failures: [{check, entityId, detail}] }`, which the Director uses to regenerate or mutate.

### 6.2 Novelty engine (`src/director/features.ts`)

**Feature vector (33 dimensions, raw):**

| Index | Feature |
| --- | --- |
| 1 | difficulty `d` |
| 2 | hostile count / 10 |
| 3 | decoy ratio (decoys / total) |
| 4 | mean hostile RCS on log scale: `(log10(RCS) + 3) / 3` |
| 5 | mean `T_budget` / 120 s |
| 6 | night flag |
| 7 | fraction of the 5 km disc covered by zone polygons |
| 8 | maximum zone density `ρ` |
| 9–12 | fraction of hostiles by profile: DIRECT, TERRAIN_HUG, ORBIT_FEINT, SWARM_SATURATE |
| 13 | swarm size / 12 |
| 14–21 | hostile spawn-bearing histogram, 8 bins of 45°, summing to 1 (all zero if no hostiles) |
| 22–25 | chaos counts by type FOG, JAMMING, RAIN, DROPOUT, each / 4 |
| 26 | chaos time centroid / `durationMs` (0.5 if none) |
| 27 | wave count / 3 |
| 28–33 | lever indicators: DETECTION, CLASSIFICATION, ECONOMICS, ROE, SENSOR_ADAPT, SWARM |

**Standardise before comparing.** All raw features are non-negative, so raw cosine similarity between any two scenarios is high and a `< 0.85` filter would reject almost everything. Therefore each vector is z-scored with `mean`/`std` from `public/feature-calibration.json`, produced by `tools/calibrate-features.ts` over at least 500 generated scenarios with `d` uniform in [0,1]:

```
z_i = (f_i − mean_i) / max(std_i, 1e-6)
sim(a, b) = (z_a · z_b) / (‖z_a‖ ‖z_b‖)
```

A candidate is **novel** iff `max over the last 10 scenarios of this trainee (TRAIN mode) of sim(candidate, previous) < 0.85`. The generator makes up to 20 attempts, then up to 20 mutations (shift spawn bearings, swap a lever, re-roll chaos times), **validating every mutated candidate** with §6.1; if none pass it returns a bundled fallback of matching difficulty and flags `fallbackUsed` in the AAR. The calibration script asserts that at least 98% of random scenario pairs at the same `d` pass the 0.85 threshold; otherwise the feature set is not discriminative enough. This yields AC-6: ten consecutive generated scenarios have pairwise similarity below 0.85, because the check covers the last ten.

### 6.3 Director pipeline (summary)

1. `seed = hash32(traineeUidHash, sessionIdx, nonceInt)`; `nonce` stored in the spec.
2. Load EMA profile → weakness `w_k = 1 − EMA_k/100` (0.5 if no data) → sample 1–2 levers with `p_k = exp(4w_k) / Σ exp(4w_j)`.
3. Phases PROBE → DECOY-FLOOD → MAIN ATTACK or SWARM-SATURATE on a Poisson arrival process; spawn bearings weighted toward sectors the trainee covers worst.
4. Path synthesis (Bezier-smoothed waypoints) under the four approach profiles; terrain-hug trigger distance `d_trig = v × (z_cruise − z_hug) / descent_rate`.
5. Difficulty mapping: `N = round(2 + 8d)` hostiles, decoy ratio `0.2 + 0.5d`, RCS multiplier `1 − 0.5d`, `T_budget` compression `1 − 0.4d`, chaos `λ = λ0 (1 + 2d)`.
6. Decoys: Remote-ID broadcast probability `1 − 0.3d`; the remainder appear as unidentified controlled drones.
7. Novelty filter → fairness validator → emit `ScenarioSpec` (or fallback).

EVAL mode bypasses steps 2–6 and plays `public/scenarios/eval-pack.json`.

---

## 7. Performance budgets and test architecture

| Budget | Target |
| --- | --- |
| Frame time | under 16 ms on an i3 with integrated graphics, 100 live tracks |
| Sim step | under 1.5 ms per tick at 100 entities |
| JS heap | under 150 MB |
| `dist/` | under 8 MB; cold start under 3 s |
| Scrub seek | under 16 ms (snapshot every 100 ticks) |

Techniques: two canvases per viewport (static base layer drawn once, dynamic layer redrawn per frame), phosphor persistence drawn into an offscreen canvas that fades with `destination-out`, pooled symbol sprites, no per-frame allocation in render loops, `devicePixelRatio` capped at 2.

**Test layers** (`npm run check` runs 1–3; `npm run test:e2e` runs 4):

1. `tests/unit` (vitest): masking, Pd curve, `q` fusion, tracker transitions, effector `Pk(R)`, ROE, scoring (D, C incl. UNKNOWN column, G, R, session, grades), EMA, SAL/SAT, validator checks (a)–(f), feature calibration, rng key stability.
2. `tests/golden`: DEMO-1 timeline within 1 s (first detectable T+5, masked T+30..T+50, H-1 PNR T+82.5, swarm PNR T+115.6; RF sees H-1 throughout the mask); same seed plus input log ⇒ identical event sequence, `stateHash` trace every 20 ticks and score within `1e-6` on the pinned Chromium.
3. `tests/guards`: no network APIs anywhere in application code, no `Math.random`, no `Date`/`performance.now` inside `sim/`, `director/`, canonical labels only, import-direction rules, no forbidden dependencies, no Tailwind default palette classes.
4. `tests/e2e` (playwright on the pinned Chromium): full DEMO-1 run with network blocked and zero cross-origin requests; no vertical scroll at 1366×768 and 1280×700; export → import round trip with verification; EVAL leaderboard excludes TRAIN sessions.
