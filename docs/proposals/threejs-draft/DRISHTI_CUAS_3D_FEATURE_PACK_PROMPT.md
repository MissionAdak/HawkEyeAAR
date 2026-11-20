# ANTIGRAVITY PROMPT — DRISHTI-CUAS 3D Feature Pack (track X3D)

Paste everything below the line into Antigravity (Gemini Flash agent) as the task prompt. Put `ARCHITECTURE.md`, `DESIGN.md`, `Rules.md`, `Tasks.md` and `MEMORY.md` in the repo root first. Work through the sections in order; do not skip Step 0.

---

You are a principal graphics and simulation engineer working on **DRISHTI-CUAS**, an offline, browser-based counter-drone training simulator (Smart India Hackathon problem statement SIH26247). The 2D canvas console and the optional Three.js 3D/VR renderer are already specified in the repo docs. Your job is to implement the **3D feature pack (track X3D)** described here: sensor and effector volumes, line-of-sight rays, swarm-cluster overlay, two decision "aids", a 3D after-action replay with truth, and an Engagement Inspector.

## 1. Read first, in this order

1. `MEMORY.md` (status, decisions D-01…D-37, traps T-01…T-34, open questions)
2. `Rules.md` (especially §1 zero-server, §2 determinism, §3 truth separation, §10 Three.js rules)
3. `ARCHITECTURE.md` §1 (loop and input quantisation), §3 (contracts), §4 (sim algorithms), §8 (3D/VR renderer)
4. `DESIGN.md` §0 (anti-SaaS bans), §1 (tokens), §11 (3D presentation)
5. `Tasks.md` (add the new X3D tasks listed in §10 of this prompt)

Precedence on conflict: `Rules.md` > `ARCHITECTURE.md` > `DESIGN.md` > `Tasks.md` > this prompt's feature wording. **Exception:** Step 0 below deliberately amends the docs; after Step 0, the amended docs win.

## 2. Mission and non-goals

**Mission.** Make the 3D view a genuinely useful training instrument that shows spatial relationships a 2D plan view cannot: where sensors and effectors reach, why a drone vanished behind a building, how a cluster is stacked in altitude, and, after the session, exactly how a decision's inputs and luck combined.

**Non-goals (do not do these).**
- Do not turn the console into a free-flying view of the true scene. In scored sessions 3D shows only what sensors provide.
- Do not claim any visual is a physics simulation. There is no ballistic model: kill outcomes are one seeded probability draw at the fire tick.
- Do not claim DEM-accurate terrain viewsheds. Terrain is zones with a uniform roofline height and a shadow length.
- Do not add dependencies other than the already-allowed `three`. No post-processing, no shaders unless unavoidable, no external textures or models.
- Do not change scoring formulas, thresholds or the classification matrix.

## 3. Non-negotiable constraints (summary; the docs are authoritative)

- **Zero server.** No `fetch`, `XMLHttpRequest`, `WebSocket`; Three.js loaders that fetch are banned; textures are procedural (`CanvasTexture`). (R1.1, R10.4)
- **Determinism.** No `Math.random` anywhere, no `MathUtils.randFloat/randInt/randFloatSpread/generateUUID`. Cosmetic randomness: `mulberry32(hash32(...))` in `render/fx.ts` only. The sim changes only inside `SimCore.step()`. (R2, R10.5)
- **View-only.** `src/render3d/` reads `SimView` and pure helpers; it never mutates sim state; commands go through `enqueue()` with the same quantisation. (R10.2)
- **Truth separation.** In scored sessions nothing in `render3d/` may touch `TruthEntity`, `truthClass`, `droneClass`, true positions or true altitude. The only exception is the post-session AAR through `ReplaySim.truthView()`, importable only from `src/ui/aar/**` and `src/render3d/aarScene.ts`. (R3.3, R10.3)
- **2D is the baseline.** Any 3D failure falls back to 2D without stopping the session. (R10.7)
- **Budgets.** HIGH tier: 60 fps, under 150k triangles, under 250 draw calls. LOW tier / VR: under 60k triangles, under 120 draw calls. 3D chunk under 1.5 MB. Use `InstancedMesh`, merged geometry, static geometry built once, and per-tick updates only where state changes. (R10.8)
- **Design.** Unlit flat materials, token palette from `DESIGN.md` §1, no glow, bloom, gradient sky, shadows or glossy materials. Transparent surfaces use `depthWrite = false`, explicit `renderOrder`, alpha at most 0.18. (R10.13)
- **Provenance of numbers.** Every number comes from `config.json` (new keys in §5). No magic numbers in sim code; render-only cosmetic constants live in `src/render3d/constants.ts` with a comment.

## 4. Information classes (the rule that decides what each feature may show)

| Class | Meaning | Where allowed | Features |
| --- | --- | --- | --- |
| **A — same information as the 2D console** | Draws something the 2D console already shows numerically or symbolically | Always (TRAIN, EVAL, DEMO) | F1 sensor volumes, F2 effector domes, F3 LOS rays, F4 cluster overlay |
| **B — aids** | Reveals information 2D does not (shadow volumes, blind-spot map, predicted engagement windows) | TRAIN and the pre-mission briefing only; **locked off in EVAL**; usage logged per session | F5 coverage aid, F6 predict aid |
| **C — post-session truth** | Uses ground truth | AAR screens only | F7 truth replay extras, F8 Engagement Inspector |

Scoring, timing, events and replay are identical whether or not aids or any 3D feature are on. Aids are recorded as `sessions.aidUse = { coverageMs, predictMs }` (non-indexed) and shown in the AAR as `AIDS USED`.

---

## 5. Step 0 — amend the docs, decide ranges, add infrastructure (do this before any feature)

### 5.1 Doc amendments (write them first, in the same change as the code that needs them)

- `MEMORY.md` §3: add **D-38** (range metric becomes 3D slant range from the antenna for radar, EO, RF, effector envelopes and PNR; masking geometry stays horizontal), **D-39** (aids concept and EVAL lock), **D-40** (Engagement Inspector replaces "kill-cam"; effector flights are illustrative), **D-41** (EO volume is a spherical wedge because the sim checks azimuth only; elevation truncation is render-only), **D-42** (`ENGAGE` event gains `u`, `pk0`, `g`, `h`; `SIM_VERSION` bump). Add traps **T-35** (volumes that do not match sim math), **T-36** (aid left on in EVAL), **T-37** (calling the Inspector a physical proof).
- `Rules.md` §10: add **R10.14 Aids** (class B features are TRAIN/briefing only, logged, never alter sim or score), **R10.15 Volume fidelity** (every volume must be computed from the same config values and helpers as the sim; no decorative extents; render-only truncations are labelled `RENDER ONLY`), **R10.16 Illustrative labelling** (every effector flight or kill visual carries the caption `ILLUSTRATIVE — OUTCOME IS A SEEDED PROBABILITY DRAW`), **R10.17 Versioning** (any sim change bumps `SIM_VERSION` and regenerates goldens in the same change), **R10.18 Shared geometry** (`render3d` may import the pure modules `sim/masking.ts`, `sim/geometry.ts` and `sim/effectors.pure.ts`, which expose no truth types).
- `ARCHITECTURE.md` §8: add §8.12 "X3D feature pack" summarising F1–F8, the aids store, the config keys, and the `ReplaySim` additions.
- `DESIGN.md` §11: add §11.6 with the visual specs of §6 below (colours, labels, key map).
- `Tasks.md`: add the X3D track from §10.

### 5.2 Range metric (D-38)

Add `src/sim/geometry.ts` (pure, no truth types):

```ts
export interface P3 { x: number; y: number; z: number }
export const slantRangeM = (p: P3, antenna: P3): number => Math.hypot(p.x - antenna.x, p.y - antenna.y, p.z - antenna.z);
export const groundRangeM = (p: P3, antenna: P3): number => Math.hypot(p.x - antenna.x, p.y - antenna.y);
export const bearingDeg = (p: P3, antenna: P3): number => (Math.atan2(p.x - antenna.x, p.y - antenna.y) * 180 / Math.PI + 360) % 360;
```

Use `slantRangeM` for: radar `R` in `Pd` and `maxRangeM`, EO reach, RF reach, effector envelope tests (`Pk`, `g(R)`, fire preconditions), PNR (`R <= rMinM`), the oracle, the fairness validator and `E_time`. Masking keeps horizontal `R` and `d_n` (it is an elevation-angle test). The antenna point is `(0, 0, asset.antennaHeightM)`. Run the DEMO-1 golden: the timeline must still hold within 1 s (the change moves ranges by well under 1 m). Bump `SIM_VERSION` and regenerate fixtures once, in one commit.

### 5.3 Event additions (D-42)

Extend `ENGAGE` with `u: number` (the exact `draw(master,'kill',trackIdx,engagementIdx)` value), `pk0: number`, `g: number`, `h: number` so that the AAR never recomputes them from possibly different inputs. `Pk = pk0 * g * h` must hold to 1e-9 in a unit test.

### 5.4 New `config.json` keys (add to the zod schema and defaults)

```json
"view3d": {
  "altBandMidM": [20, 70, 150],
  "altBandCeilM": [40, 100, 160],
  "cluster": { "epsM": 200, "minPts": 3 },
  "predict": { "horizonS": 30, "samples": 60 },
  "coverage": { "gridCells": 256, "rayStepDeg": 0.5, "ceilingSamples": 8, "sideViewMaxAltM": 200 },
  "radarShells": { "referenceRcsM2": [0.003, 0.01, 0.05] },
  "eoWedge": { "renderElevationMaxDeg": 45 },
  "aids": { "lockedInEval": true }
}
```

### 5.5 Store and persistence for aids

- `consoleStore`: `aids: { coverage: boolean; predict: boolean }`, `aidsLocked = mode === 'EVAL'`. Toggle keys: `Shift+C` (coverage aid), `Shift+P` (predict aid). In EVAL the keys do nothing and the top-bar shows `AIDS LOCKED`.
- While an aid is on, accumulate time using **sim ticks** (`view.tMs` deltas) into `aidUse.coverageMs` / `predictMs`; persist on `sessions` (non-indexed), include in the export bundle, show in the AAR scorecard subtitle (`AIDS USED: COVERAGE 42.0 s`).
- Briefing screen gets a **Terrain and Coverage Brief** (class B, never scored): 3D terrain plus coverage aid on, scenario zones only (no threats), bearing slider for the side view.

---

## 6. Feature specifications

Tokens: `phos #00FF66`, `phos-dim #00A844`, `phos-deep #003B1A`, `amber #FF9900`, `crimson #FF3333`, `cyan #00CCFF`, base `#0D1117`. Axis mapping always through `toThree(x, y, z) = (x, z, -y)`. Labels are sprites from cached procedural `CanvasTexture`s in Share Tech Mono 9 px.

### F1 — Sensor volumes that react to chaos (class A) · `render3d/volumes.ts`

**Purpose.** Show where each sensor can see, and how fog, rain, dropout, jamming and night change it, in real time.

**Radar.**
- Reference-target shell: hemisphere of radius `R90 = refRangeM × ((RCS_ref/refRcs) × A_env)^(1/4)` with `RCS_ref = 0.01`, `refRangeM = 3000`, `refRcs = 0.01`. At clear weather `R90 = 3000 m`; rain (`A_env 0.6`) gives 2640 m; dropout (`A_env 0`) collapses the shell to 0 and shows `RADAR DROPOUT`. Draw as latitude/longitude wire lines (`phos-dim`) plus fill alpha 0.04.
- Maximum-range hemisphere at `radar.maxRangeM` (5000 m): lines only, alpha 0.25, labelled `MAX 5.0 km`.
- Ground range rings at 1–5 km stay as in `DESIGN.md` §11.2.
- Badge-driven tint: `DEG` amber, `BLIND` crimson at alpha 0.12.
- Rebuild geometry only when `A_env` or the chaos state changes (compare with the previous view), otherwise reuse.

**EO/IR.**
- Spherical wedge (lune): azimuth `operator.eoAzimuthDeg ± fovDeg/2`, radius `reach_eff = reachDayM × (night ? nightFactor : 1) × (fog ? FOG.eoReachFactor : 1)`, elevation 0 to `eoWedge.renderElevationMaxDeg`. The elevation cap is **render only**: add a corner label `ELEV CAP: RENDER ONLY`. Colour `cyan`, alpha 0.10, edges `cyan`. Fog visibly shrinks the wedge to 625 m; night to 1750 m. The wedge is drawn brighter and the radar shell dims when the view mode is `EOIR`.

**RF.**
- Hemisphere radius `rf.reachM` (4000 m), lines only, `phos-dim` alpha 0.2; label `RF 4.0 km`. Jamming: lines grey (`neutral-700`), label `JAMMED`, DF rays hidden (they already vanish in the view).
- Zone pockets: for each zone, draw its footprint with a diagonal hatch texture and the label `RF x0.71` (reach multiplier √0.5) to show the attenuation region.

**Tests (AC).**
- Radar shell radius equals the formula for 5 combinations of `(RCS, A_env)`; dropout gives 0.
- EO wedge radius equals `reach_eff` for day, night, fog and night+fog; azimuth edges equal `eoAzimuthDeg ± 15°`.
- RF hemisphere radius equals 4000; jamming switches material and label.
- Toggling chaos events in a fixture view changes the geometry parameters on the next tick and does not allocate new geometries when nothing changed (count `renderer.info.memory.geometries`).

### F2 — Layered effector domes and PNR sphere (class A) · `render3d/domes.ts`

**Purpose.** Show the trainee's layered defence: which envelopes the current track range sits in, and how they overlap.

**Geometry.** For each effector `e` in `config.effectors` (centre = antenna point): hemispheres at slant radii `r_min`, `r_min + 0.2L`, `r_min + 0.8L`, `r_max` with `L = r_max − r_min`. Draw them as **ring/latitude line sets**, not filled shells, to avoid z-fighting and clutter:
- `r_min` and `r_max`: 1 px lines;
- plateau boundaries (`+0.2L`, `+0.8L`): brighter lines, because `g(R) = 1` between them;
- for the **armed** effector only: faint fill on the plateau band (alpha 0.08, `DoubleSide`) and a corner label `GUN 0.1–2.0 km · PLATEAU 0.46–1.64 km`.
Tier colours: tier 1 (RF soft-kill, laser) `phos`; tier 2 (gun, interceptor) `amber`; tier 3 (missile) `crimson`. State: effectors disabled by chaos (RF soft-kill under jamming; laser Pk halved in fog) draw dashed (`LineDashedMaterial`) with the reason label. The PNR sphere (radius `rMinM`) is dashed `crimson`, labelled `PNR 0.5 km`.

**Live marker.** On the line from the antenna to the selected track's estimate, draw a small ring at the estimate and a label `R 1.56 km · RF SOFT-KILL Pk 80% (PLATEAU)`; the `Pk` text uses the same function as the effector row (`pkNow(effector, rangeM, chaos)`, a pure helper). This is class A because the effector row already shows range and `Pk`.

**Layer toggles.** Keys `D` toggles domes (default on), `[` and `]` cycle which effector is highlighted when none is armed.

**Tests (AC).** Radii equal the config values for all five effectors; plateau radii equal `r_min + 0.2L` and `r_min + 0.8L`; a jammed fixture draws the soft-kill dome dashed; the live marker's `Pk` equals the effector-row value for 20 random ranges; draw calls for all five domes stay under 25 on the LOW tier.

### F3 — True line-of-sight rays and blocking-edge highlight (class A) · `render3d/los.ts`

**Purpose.** Let the trainee see *why* a track is coasting, using the same maths the sim uses.

**Helper (pure, in `sim/masking.ts`, exported):**
```ts
export interface LosResult { blocked: boolean; zoneId: string | null; nearEdge: P3 | null; roofPoint: P3 | null }
export function losToPoint(antenna: P3, target: P3, zones: ZoneSpec[]): LosResult;
```
It must agree with the sim's `isMasked` for the same inputs (property test: 10,000 random points inside and outside shadows; zero disagreements).

**Draw.** For the selected track: ray from the antenna to the track estimate. Not blocked: solid `phos`, 1.5 px. Blocked: `phos` up to `nearEdge`, then dashed `amber` to the target, a crimson ring at `nearEdge`, and the blocking zone's outline brightened with the label `LOS BLOCKED BY U1`. For coasting tracks the target is the ghost estimate. For other tracks: thin rays at alpha 0.15, only for hostile-labelled and unlabelled tracks (never use truth).

**Tests (AC).** DEMO-1 at T+35 (H-1 masked): ray is blocked by `U1` with `nearEdge` at range 1800 m along bearing 052°; at T+60 (reacquired) the ray is unblocked; C-1 at `z = 60`, `R = 2300` is unblocked.

### F4 — Swarm cluster overlay from operator-visible tracks (class A) · `render3d/clusters.ts`

**Purpose.** Show spatial density and vertical stacking that a plan view hides, without using truth.

**Algorithm (pure, `render3d/clusterMath.ts`, unit tested).**
1. Input: tracks with `state !== 'LOST'`, positions `est.x, est.y`, altitude band from `altBin`.
2. DBSCAN-lite on horizontal positions with `eps = cluster.epsM` and `minPts = cluster.minPts` (labels and truth are **not** inputs).
3. Per cluster: convex hull of ground positions (monotone chain), `n`, ground area `A_km2` of the hull (if `n < 3` or area below 0.001 km² use a circle of radius `eps`), altitude span from the lowest to the highest band present, mean spacing = mean nearest-neighbour distance.
4. Draw the hull extruded from the lowest band's lower bound to the highest band's ceiling (`altBandCeilM`), amber 1 px edges, fill alpha 0.08, and a label `CLUSTER 5 · LOW–HIGH · 3.1 TRK/KM² · SPACING 100 m`.

**Tests (AC).** Five tracks within 150 m cluster; two clusters 1 km apart stay separate; adding a track at 250 m does not join; the module cannot import truth types (type test); output is identical across two runs with the same input; label text does not include any class name.

### F5 — Coverage aid: shadow volumes, blind-spot map, side view (class B) · `render3d/coverage.ts`, `render3d/sideView.ts`

**Purpose.** Show where the radar cannot see low-flying drones and why.

**Shadow ceiling (derive it from the sim rule).** The sim masks a target iff `θ_t < θ_mask` and `R − d_n ≤ L`, where `θ_mask = atan2(H − h_r, d_n)`. Because `atan2` is monotonic for positive arguments, the condition at horizontal range `R` is `z < z_c(R)` with

`z_c(R) = h_r + R × (H − h_r) / d_n`, for `d_n < R ≤ d_n + L`.

Example (urban zone, `H = 40`, `h_r = 15`, `d_n = 1800`, `L = 800`): `z_c(1800) = 40 m`, `z_c(2600) = 51 m`. Ridge (`H = 80`, `L = 1200`, `d_n = 2000`): `z_c(3200) = 119 m`.

**Shadow mesh.** For each zone sweep bearings across the zone's angular extent in `coverage.rayStepDeg` steps; for each bearing find `d_n` (first polygon crossing; skip if the antenna is inside); sample `coverage.ceilingSamples` ranges in `[d_n, d_n + L]`; build a triangle strip at `z_c(R)` and vertical curtains to the ground at both ends. Amber alpha 0.12, edges alpha 0.5, label `RADAR SHADOW U1 · BELOW 40–51 m`. Build once per scenario (zones are static) and reuse.

**Blind-spot map.** A `CanvasTexture` of `coverage.gridCells²` cells over the 10 km square. Cell value `zMin(x, y)` = max over zones of `z_c(R)` if the cell lies inside that zone's shadow region, else 0. Paint amber with alpha `min(zMin / 120, 1) × 0.5` only where `zMin > 0`, and a legend `BLIND BELOW: 51 m (URBAN) … 119 m (RIDGE)`. `zMin` is a pure helper `minDetectableAltitudeM(x, y, zones, antenna)` in `sim/masking.ts`, unit-tested against `isMasked`.

**Multi-RCS radar shells (aid only).** Draw three nested radar shells for `radarShells.referenceRcsM2 = [0.003, 0.01, 0.05]` with `R90` from the F1 formula (2220 m, 3000 m, 4486 m at clear weather), labelled `BIRD`, `SMALL UAS`, `LARGE`.

**Side view (HUD inset 400×150 px, bottom-left of the 3D viewport).** Drawn with the existing 2D HUD canvas. X = ground range 0–5 km, Y = altitude 0–`sideViewMaxAltM` (200 m, exaggerated; label `ALT x4`). Show the cut through zones along bearing `φ` (rectangles of height `H`), the shadow wedge polygon, the radar grazing line `z = h_r + R·tan θ_mask`, the radar and EO reach limits, and the selected tracks' altitude bands as horizontal ticks. `φ` defaults to the selected track's bearing; drag a spoke or use `,` `.` to change it by 5°.

**Tests (AC).**
- Property test: for 10,000 random points `(x, y, z)`, `z < z_c(R)` within the shadow range ⇔ `isMasked(...)`; zero disagreements.
- Ceiling values for the three examples above equal 40/51/119 m to ±0.5 m.
- The blind-spot map returns 0 outside shadows and equals `z_c` inside.
- In EVAL the aid keys are inert and the geometry is never built (spy on the builder).
- Briefing shows the brief with no tracks and no threat information.

### F6 — Predict aid: predicted path, engagement windows, ETA, ROE-conflict volumes (class B) · `render3d/predict.ts`

**Purpose.** Let the trainee see when a track will enter each envelope and cross PNR, and where a kinetic shot would endanger an urban zone.

**Maths (pure, `render3d/predictMath.ts`).** Constant-velocity prediction from the track estimate: `p(t) = (x + vx·t, y + vy·t, z_mid)` with `z_mid` from `altBandMidM`. The slant range squared to the antenna is `r(t)² = |p0 + v t − a|²`. Crossing a radius `R*`: `A t² + B t + C = 0` with `A = |v|²`, `B = 2 (p0 − a)·v`, `C = |p0 − a|² − R*²`. Take the smallest `t > 0` for an inbound crossing; if `A < 1e-9` (stationary) there is no crossing. Compute `t` for: PNR (`rMinM`), each effector `r_min`, `r_max`, plateau bounds.

**Draw (selected track, horizon `predict.horizonS = 30 s`, `samples = 60`).**
- A polyline along the prediction coloured by the **armed effector** window: inside the plateau `phos` solid; inside the envelope but outside the plateau `phos-dim`; outside grey. Labels at boundaries: `PLATEAU IN 12 s`, `ENVELOPE OUT 41 s`.
- `PNR IN 31 s` in crimson at the crossing point; `NO PNR WITHIN 30 s` if none.
- Uncertainty: a translucent tube whose radius grows with `est.sigmaM + 12 m/s × t`.
- **ROE-conflict volumes:** if the armed effector is kinetic (`wE ≥ 0.3`), mark path samples inside any urban zone (`rho > 0.5`) polygon expanded by `debrisM` as crimson, brighten that zone, and label `ROE CONFLICT: KINETIC OVER U1 (ρ 0.8)`.
- Caption `CV PREDICTION: TERRAIN-HUG, ORBIT AND JINK WILL DEVIATE`.

**Tests (AC).** A 40 m/s inbound track from 3.6 km at the same altitude gives `PNR IN` equal to `(3600−500)/40 = 77.5 s` (±0.1); a stationary track has no crossing; the ROE-conflict flag matches `roe.ts` for 1,000 random positions; the aid is built only when enabled and not locked.

### F7 — Truth replay extras: LOS severance and altitude ribbons (class C) · `render3d/aarScene.ts`

This extends TASK-P5-10 (3D AAR replay). With `ReplaySim.truthView()`:
- True drones as wireframe low-poly models in truth-class colours, 10 s trails, true altitude ribbons (a vertical ribbon under each trail coloured amber while masked).
- **LOS severance markers:** at every `MASKED{on:true}` tick draw the truth LOS ray from the antenna to the drone with a crimson cut ring at the near edge and the label `LOS SEVERED T+030.100 · z 20 m`; at `MASKED{on:false}` a green `LOS RESTORED` marker. This visualises "the drone dropped altitude to use the building".
- Operator tracks as ghost outlines (estimate) with a thin line to the truth position showing track error; fragmentation (`fragmentedFrom`) drawn as a dashed link between old and new track.
- Formation labels (truth) from the spec's `groupId`/formation kind (see S1).
- Sensor volumes of F1 with their state at the playhead.

**Tests (AC).** Seeking to the MASKED tick shows the severance marker at the correct position; seek updates the scene in under 100 ms; `truthView` imports are allowed only from the two permitted paths (guard).

### F8 — Engagement Inspector (replaces "kill-cam") (class C) · `render3d/inspector.ts`

**Purpose.** For a selected `ENGAGE` event, show the *inputs* to the scoring maths and whether the result was decision or luck. It is not a physics proof.

**Data (all from the stored event, which now carries `u, pk0, g, h`).**
- `R_engage` (slant range), plateau factor `g`, chaos factor `h`, `pk0`, final `Pk`, draw `u`, outcome (`u < Pk`), effector cost, CER, `E_econ`, `E_time`, ROE flags, oracle effector and cost regret.
- **Luck vs decision banner:** `HIT` with `Pk < 0.4` ⇒ `LUCKY`; `MISS` with `Pk ≥ 0.7` ⇒ `UNLUCKY`; otherwise `AS EXPECTED`. Show `u = 0.83 ≥ Pk 0.78 → MISS`.
- **Footprint volume:** a sphere of radius `debrisM` around the target at the fire tick; zones overlapping it are highlighted crimson when `rho > 0.5` (this is exactly the `I_overlap` / `KINETIC_OVER_ZONE` condition), with the label `DEBRIS 150 m OVERLAPS U1 (ρ 0.8) → ROE VIOLATION, G ≤ 40`.
- **Counterfactual:** the oracle's effector dome highlighted with its `Pk` and cost.

**Cameras.** `ASSET` (from the antenna looking at the target), `CHASE` (behind the target along its truth velocity, 60 m back, 15 m up, critically damped follow, render time only), `GOD` (orbit). Keys `1`, `2`, `3` inside the inspector.

**Illustrative effector visuals (required caption: `ILLUSTRATIVE — OUTCOME IS A SEEDED PROBABILITY DRAW`).** Duration = `session.displayDelayMs[effector]`:
- RF soft-kill: expanding translucent cone from the antenna to the target;
- laser: a thin line with a dwell ring at the target;
- gun: 12 tracer segments whose offsets come from `mulberry32(hash32(trackIdx, engagementIdx, i))`;
- interceptor and missile: a lofted quadratic Bézier arc from the antenna to the target's position at the fire tick, control point at the midpoint raised by `0.25 × range` (cosmetic apex), with a marker travelling along it and a polyline trail.
The arc is a visualisation of a delay, not a trajectory solution. Do not label it "predicted" or "physical".

**Tests (AC).** `u` shown equals `draw(...)` recomputed from the spec; `Pk = pk0·g·h` within 1e-9; the luck banner follows the three thresholds; the overlap highlight appears iff the event has `KINETIC_OVER_ZONE`; the caption is present in every flight visual (DOM/canvas text test); no random calls (guard).

---

## 7. Optional sim extensions (do last, only if time remains; each bumps `SIM_VERSION`)

### S1 — Director formations (supports F4 and F7)

Add `director/formations.ts` that expands a group into per-entity spawn positions and waypoints (the sim stays unchanged; entities are independent). Kinds and parameters:

| Kind | Geometry |
| --- | --- |
| `LINE_ABREAST` | `n` entities side by side, lateral spacing `s` (100 m), same altitude |
| `V_WEDGE` | lead at the apex, followers at ±35° back, spacing `s` |
| `STACK` | `n` entities on one ground track at layers `z_k = 40 + 50 k` m (multi-altitude column), spacing 60 m along the track |
| `HELIX` | entities on a helical path around the group centreline (radius 80 m, pitch 120 m), phase offsets `2πk/n` |
| `DECOY_LEAD` | one RF-emitting, higher-RCS lead plus RF-silent followers 150 m behind |

Extend `EntitySpec` with `formation?: { kind, index, count }` (optional, additive). Add four dimensions (fractions of hostiles per kind) to the novelty feature vector (33 → 37), regenerate `feature-calibration.json`, and assert ≥ 98% of random same-`d` pairs still pass 0.85. The fairness validator runs unchanged. **AC:** each kind produces the expected geometry (unit tests), passes the validator, and appears with its true name only in the AAR.

### S2 — Pop-up dive profile (supports F7 and F8)

Add behaviour profile `POP_UP_DIVE`: `TERRAIN_HUG` until slant range to the antenna is `popupDistM = 900 m`, then climb at `climbRateMps = 15` to `peakZ = 150 m`, then a straight dive to the asset. Parameters live under `terrain.popUp`. The new profile raises the drone above masking height, exposing it for the final seconds; the validator re-checks sensing and joint windows. **AC:** unit test of phases and heights; DEMO-1 unaffected (it uses `TERRAIN_HUG`); a generated scenario with the profile passes the validator; the AAR replay shows the dive.

---

## 8. Order of work and checkpoints

1. **Step 0** (docs, `geometry.ts`, range change, event fields, config keys, aids store, briefing hook). Checkpoint X0: `npm run check` green, DEMO-1 timeline golden still within 1 s, goldens regenerated once.
2. **F1 → F2 → F3** (class A core). Checkpoint X1: in 3D, fog visibly shrinks the EO wedge, rain shrinks the radar shell, the five domes render, a masked track shows a blocked LOS ray; budgets hold on both tiers.
3. **F8 Inspector, then F7** (AAR truth). Checkpoint X2: selecting an engage marker opens the Inspector with `u`, `Pk` and the luck banner; LOS severance markers appear on replay.
4. **F4 clusters.** Checkpoint X3.
5. **F5 and F6 aids** (largest). Checkpoint X4: aids inert in EVAL, logged in TRAIN, briefing brief works.
6. **S1, S2** (optional).

If hours run short, cut in this order: S2, S1, F6, F5, F4, then F7. Never cut Step 0, F1–F3 or F8.

## 9. Verification (run after every feature, not only at the end)

- `npm run check` (typecheck, lint, unit, golden, guards) must be green.
- `npm run test:e2e` for anything touching layout, the network or the 3D view.
- You cannot see the screen, so verify geometry with **numbers**: assert radii, vertex counts, label text, `renderer.info.render.calls/triangles`, and camera-projected pixel positions. For visuals take Playwright screenshots under software WebGL (flags per the pinned Chromium, for example `--use-angle=swiftshader --enable-unsafe-swiftshader`) and compare against saved references with a small tolerance; never iterate on "make it look better" without a numeric assertion.
- Parity test: the same spec and input log must produce identical events and score with every feature on, every feature off, and `viewMode` 2D vs 3D.
- Leak test: ten 2D↔3D toggles leave `renderer.info.memory.geometries/textures` at the baseline with all features enabled.
- Guards to add: `three.test.ts` (loader and `Math.random`-utility bans, import locations), `truth3d.test.ts` (no truth types in `render3d/` except `aarScene.ts` and `inspector.ts`, which receive a `TruthView` only through `ReplaySim`), `aids.test.ts` (EVAL locks aids, logging works), `illustrative.test.ts` (caption present on every effector visual).

## 10. Tasks to add to `Tasks.md` (track X3D; all P2 unless stated)

| ID | Title | Est. | Owner |
| --- | --- | --- | --- |
| TASK-X3D-00 | Step 0: docs amendments, slant range, event fields, config keys, aids store and briefing hook | 3.0 h | B |
| TASK-X3D-01 | F1 sensor volumes with chaos reactivity | 3.0 h | A |
| TASK-X3D-02 | F2 effector domes, PNR sphere, live marker | 2.5 h | A |
| TASK-X3D-03 | F3 LOS rays and `losToPoint` property test | 2.0 h | B |
| TASK-X3D-04 | F8 Engagement Inspector | 5.0 h | D |
| TASK-X3D-05 | F7 truth replay extras (extends TASK-P5-10) | 2.5 h | D |
| TASK-X3D-06 | F4 cluster overlay | 2.0 h | C |
| TASK-X3D-07 | F5 coverage aid (shadow mesh, blind-spot map, side view) | 5.0 h | B |
| TASK-X3D-08 | F6 predict aid | 3.0 h | C |
| TASK-X3D-09 | S1 Director formations (optional) | 3.0 h | C |
| TASK-X3D-10 | S2 pop-up dive profile (optional) | 2.5 h | A |
| TASK-X3D-11 | X3D validation: budgets, parity, leaks, guards | 2.0 h | C |

Total about 35.5 h. Each task needs its acceptance tests from §6 before it is ticked.

## 11. Definition of done and what to report

Done means: all ticked tasks pass `npm run check` and the relevant e2e tests; docs amended per §5.1; `MEMORY.md` status, decisions, traps and the GPU/fps record updated; `SIM_VERSION` bumped and goldens regenerated exactly once per sim change; no new dependency; no truth leak in scored sessions; aids locked in EVAL.

At the end, reply with: (1) tasks completed and skipped with reasons; (2) test results; (3) measured triangles, draw calls and fps on this machine for the HIGH and LOW tiers; (4) any place where you had to guess (list each as an `OQ-xx` in `MEMORY.md`); (5) anything you refused to do because it would break a rule, and why.

## 12. Working style (important for a rate-limited free tier)

Plan first in a short checklist, then work one feature at a time. Write the pure maths and its tests before the Three.js code. Batch related edits into one pass; commit after every green task. Do not loop on visual polish without a numeric assertion. If a spec is ambiguous or a constraint blocks you, stop and record an `OQ-xx` instead of improvising. Prefer the stricter reading of any rule.
