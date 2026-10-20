# DRISHTI-CUAS: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer

**Product Requirements Document (v1.1, engineering hand-off)** | SIH PS 26247 | Ministry of Defence, Defence Services Staff College | Theme: Robotics and Drones | Category: Software

> **NOTE: Backend, REST API, and SQLite architectures described below have been intentionally superseded by the v1.1 Offline-First Client Architecture.**

### v1.1 changes (review fixes)

1. **Walkthrough (3.4) rebuilt** with one speed per drone class and sensor ranges and masking geometry that agree with each other. Session length is now 120 s. DEMO-1 and DEMO-2 are defined, and DEMO-1 doubles as a golden test.
2. **Detection scoring starts at t\_trk** (the moment the track appears), not t\_vis, so the 2 to 6 s track-initiation delay no longer caps D.
3. **TRAIN and EVAL modes separated.** Difficulty adapts towards a score of 70, so adaptive scores are not comparable between trainees. Leaderboards and percentiles use a fixed EVAL benchmark pack only.
4. **Track quality (position) separated from classification confidence.** The fairness validator now checks that every hostile has a usable sensing window.
5. **Scoring gaps closed:** full 6x6 classification matrix, PNR rules for all tracks, SAL and SAT scales, EMA cold start, unclassified tracks counted as misses.
6. **Number conflicts resolved:** track count, bundle size, AC-5, AC-6, unvalidated mutate fallback.
7. **Air-gap check and replay determinism fixed:** network-blocked browser test instead of URL grep; tick-quantised inputs, separate PRNG streams and a pinned browser.
8. **v1 is browser-only:** the Director runs in TypeScript, storage is IndexedDB, unit view uses session JSON export/import. FastAPI and SQLite are reserved for later.
9. **Adaptive engine described accurately** (rule-based in v1, optional bandit upgrade). Overclaims softened.
10. **Smaller fixes:** unit view kept out of the early cut line, ridge and forest zones added, callsigns instead of service numbers, DTID doctrine mapping, Remote-ID labelled as an assumption.

## 1. Executive Summary

DRISHTI-CUAS is an offline-first, 2D radar-console simulator that gives every unit the sensor-to-shooter repetitions that live-fire C-UAS drills cannot: unlimited, weather-independent and free per engagement. Operators work the full F2T2EA kill chain (Find, Fix, Track, Target, Engage, Assess) across Radar, EO/IR and RF sensor modes against single drones and swarms, while a Sensor Chaos Engine degrades their picture mid-engagement (fog, spectrum jamming, rain clutter) and mathematical terrain masking makes threats vanish behind urban zones without any 3D engine. Decision-tree scoring grades detection time, threat classification and engagement choices, and it enforces the asymmetric-economics lesson of modern conflict: firing a ₹30-lakh missile at a ₹40,000 quadcopter, or firing kinetically over a populated zone, is heavily penalised even when the target is destroyed. An Adaptive Red Team engine profiles each trainee, finds the weakest metric and procedurally generates the next scenario to exploit it, so a trainee cannot rely on a memorised script (a novelty filter keeps consecutive scenarios materially different). Every session is captured at millisecond resolution and feeds an After-Action Review (AAR) dashboard with Mean Engagement Time, confusion matrices, trend lines and frame-accurate timeline replay. It runs air-gapped on a 4 GB Intel i3 laptop with no GPU, no VR headset and no internet, so a unit can train on the day of delivery.

**Design principle: determinism over spectacle.** Real C-UAS operators fight from 2D track-based C2 consoles, not from cockpit views. We simulate the operator's decision environment (tracks, sensor cues, ROE, cost) rather than rendering a world. Scenarios are fully pre-computed and seeded and there is no real-time physics engine, so the live demo has no physics to misbehave (a golden replay test guards the rest).

## 2. Target Audience & Hardware Profile

### 2.1 Users

| Persona | Role | Primary needs |
| --- | --- | --- |
| Trainee Operator | Air-defence / infantry / unit-level C-UAS crew (NCO, JCO, junior officer) | Many short, varied repetitions; instant feedback; clear ROE and cost consequences |
| Instructor | Unit training JCO / DSSC faculty | Assign scenario packs, set difficulty, run a hot-wash using timeline replay |
| Unit Commander / Training Cell | CO, adjutant, training officer | Unit-wide readiness view: who is slow, who over-engages, trends over repeated sessions |

### 2.2 Hardware profile (minimum, tested target)

| Item | Spec |
| --- | --- |
| CPU / RAM | Dual-core Intel i3 (or equivalent) / 4 GB |
| GPU | None required (integrated; Canvas 2D path must hold 60 fps at 100 live tracks, hard cap 150 entities) |
| Display / Input | 1366x768 minimum; mouse + keyboard only |
| OS | Windows 10/11, Ubuntu 20.04+, BOSS Linux |
| Runtime | One pinned Chromium build (portable, bundled on USB); Firefox supported but not used for golden tests |
| Network | None. Air-gapped. No CDN, no web fonts, no telemetry |
| Install | One folder on a USB stick: static web bundle + tiny local launcher (static file server on 127.0.0.1) + the pinned browser. Target: first scenario running in under 2 minutes from plugging in the stick |

### 2.3 How this satisfies 'minimal specialized hardware'

- No VR headset, no GPU workstation, no game engine licence, no server. One unit laptop is the complete system.
- Offline-first by construction: all assets bundled, data in IndexedDB on the same machine; unit view across laptops uses session JSON export and import (USB or shared folder).
- Web bundle (HTML, JS, CSS, assets) under 8 MB; cold start under 3 s on the minimum spec. The USB kit as a whole (pinned browser, launcher) is larger and is not covered by this budget.

### 2.4 Traceability to PS 26247 expected outcomes

| PS requirement | DRISHTI-CUAS delivery |
| --- | --- |
| Desktop or VR-capable simulator, scripted and procedurally generated scenarios | Desktop web simulator; 12 scripted baseline scenarios plus Red Team procedural generator |
| Day/night, degraded sensors, urban/rural, single and swarm | Day/night flag (EO vs IR), Sensor Chaos Engine, urban, ridge and forest terrain zones vs open terrain, swarm sizes 1 to 12 |
| Decision-tree scoring on detection time, classification accuracy, engagement decisions | Section 4 scoring model with a runtime 'oracle' decision tree for optimal engagement |
| AAR dashboard, individual/unit performance over repeated sessions | Section 4.8 dashboard with trend lines, unit roll-ups, timeline replay |
| Adjustable difficulty, scenario randomisation against rote learning | Adaptive Red Team (Section 5.4) with novelty filter; TRAIN (adaptive) and EVAL (fixed benchmark) modes (Section 4.9) |

## 3. Core Features & User Flow

### 3.1 Feature list

| ID | Feature | Description | Priority |
| --- | --- | --- | --- |
| F-01 | 2D PPI radar console | Rotating sweep (30 RPM), range rings, bearing ticks, phosphor-fade plots, track symbology (unknown/hostile/neutral/friendly) | P0 |
| F-02 | Three sensor modes | Radar, EO/IR, RF, toggled with keys 1/2/3 with distinct information content (3.2) | P0 |
| F-03 | F2T2EA workflow | Detect, Designate (Fix), Track, Classify and Assign (Target), Engage, Assess (BDA); weapons release needs track quality at least Q\_min and a trainee classification | P0 |
| F-04 | Decision-tree engagement with cost and collateral model | Effector menu with live cost, Pk, envelope; ROE and economics scoring | P0 |
| F-05 | Mathematical terrain masking | Urban, ridge and forest zones mask radar/EO LOS via elevation-angle test; ghost-track coasting | P0 (urban), P1 (ridge, forest) |
| F-06 | Sensor Chaos Engine | Fog, jamming, rain clutter, radar dropout at randomised times | P1 |
| F-07 | Adaptive Red Team engine | Weakness-driven procedural scenario generation (rule-based, explainable), decoy injection, reactive triggers; optional Thompson-sampling lever selection (F-07b) | P1 (F-07b: P2) |
| F-08 | AAR dashboard | KPI tiles, confusion matrix, per-session timeline replay, trends with difficulty overlay, unit view (EVAL sessions only) | P0 (basic, incl. minimal unit table), P1 (full) |
| F-09 | Instructor mode | Difficulty override, scenario pack select, session export (JSON/CSV) | P2 |

**Doctrine mapping.** F2T2EA (Find, Fix, Track, Target, Engage, Assess) is the cycle the trainee walks through. C-UAS practice is often described as detect, track, identify, defeat (DTID). The mapping is: Detect = Find; Track = Fix and Track; Identify = classify (first half of Target); Defeat = assign effector, Engage and Assess. The UI shows both labels. Confirm terminology against public doctrine or DSSC faculty before the pitch.

### 3.2 Sensor modes (information content is deliberately different)

| Mode | Nominal reach | Gives | Classification power | Blinded by |
| --- | --- | --- | --- | --- |
| Radar | 0 to 5 km, 360 degrees | Position, velocity, coarse altitude, RCS bin, micro-Doppler hint (rotor vs flapping) | Low (confidence up to 0.5) | Terrain/urban masking, rain clutter, radar dropout |
| EO/IR | 0 to 2.5 km, steerable 30 degree FOV (slew 60 deg/s) | Procedural visual silhouette: quad, fixed-wing, bird, payload visible. IR at night (range x0.7) | High (up to 0.9) | Fog (range x0.25), LOS masking, narrow FOV |
| RF (passive) | 0 to 4 km | Emitter bearing (DF, plus or minus 5 degrees), control-link signature, Remote-ID broadcast (identifies cooperative civil UAS; scenario assumption, see 5.4), spectrum waterfall | High for civil/controlled; zero for RF-silent autonomous drones | Spectrum jamming (waterfall saturates), RF-silent targets |

**Two separate quantities.** (1) *Classification confidence* c\_cls is shown as a hint beside the class estimate: radar up to 0.5, EO/IR up to 0.9, RF up to 0.9 (controlled emitters only), fused as 1 - product(1 - c\_i) over the sensors that currently see the track. It never gates fire control. (2) *Track quality* q gates fire control and depends only on position data: radar firm track 0.8, EO/IR with laser ranging 0.7, RF direction-finding (bearing only) 0.4, fused as 1 - product(1 - q\_i). A masked track coasts and its q decays linearly to 0 over 8 s. Fire control requires q at least Q\_min (0.6) and a classification entered by the trainee, so a ghost or a bearing-only target cannot be engaged.

### 3.3 UI layout (1366x768)

Centre 700x700 sensor viewport (Canvas). Left rail: track table (ID, class estimate, range, bearing, speed, state). Right rail: F2T2EA panel (current step, classification dropdown, effector decision tree with cost/Pk/collateral). Top strip: ROE banner, scenario clock, sensor-health badges (green/amber/red). Bottom: event log (last 8 events). Hotkeys: 1/2/3 sensor mode, Space designate, C classify, F fire, A assess, Tab cycle tracks.

### 3.4 Step-by-step: a 120-second trainee simulation (scenario DEMO-1)

Notional values used (all in config.json): FPV attack drone cruises at 40 m/s at z = 120 m; terrain-hug descent 8 m/s to z\_hug = 20 m, triggered 500 m before the zone edge (40 x 100 / 8); swarm element 45 m/s; EO/IR day reach 2.5 km; R\_min (PNR) 0.5 km; daytime.

Briefing (not scored): FOB ALPHA at origin; Urban Zone U1 (density 0.8, building height 40 m, shadow length 800 m) spanning range 1.8 to 3.0 km, bearing 040 to 070. ROE: weapons tight over urban zones, hold fire on civil UAS, no weapons release on unclassified tracks.

| Sim time | Ground truth (scenario) | Trainee action | System hook |
| --- | --- | --- | --- |
| T+00 | Scenario seed loaded; radar sweep starts (one sweep per 2 s); all sensors green | Reads ROE strip | Seed and difficulty stored |
| T+05 | FPV attack drone H-1 (RCS 0.01 m2, value ₹1.0 lakh, 40 m/s, z 120 m) on bearing 052 becomes detectable at 3.6 km | Watches radar | t\_vis(H-1) = 5,000 ms (diagnostic only) |
| T+07.5 | H-1 at 3.5 km, 500 m before U1's outer edge: terrain-hug profile starts descending at 8 m/s | None | Behaviour trigger logged |
| T+09 | Track T-01 initiated (2 hits in 3 sweeps). Bird flock B-1 (bearing 020, 1.3 km) and civil drone C-1 (over U1, 2.3 km, z 60 m, broadcasting Remote-ID) appear | FIX: clicks T-01, presses Space at T+10 | t\_trk(H-1) = 9,000 ms; MDT(H-1) = t\_desig minus t\_trk = 1,000 ms |
| T+13 | H-1 at 3.3 km, z 76 m, still descending | Presses 3 (RF): control-link emitter on bearing 052, no Remote-ID; radar micro-Doppler hint shows rotors. CLASSIFY: HOSTILE-ATTACK | t\_cls = 13,000 ms; sensor-usage log (c\_cls fused 0.95) |
| T+17 to T+26 | B-1 and C-1 are inside EO/IR reach | Presses 2 (EO/IR), slews to B-1: wing-flap silhouette, labels BIRD; slews to C-1 (visible: 60 m is above the roofline mask), RF shows Remote-ID, labels CIVIL-UAS | Classification matrix entries; false positives avoided |
| T+20 | H-1 at 3.0 km, z 20 m (below the 40 m roofline), crosses U1's outer edge | None | None |
| T+28 | CHAOS: FOG, EO/IR range x0.25 (625 m) for 18 s; badge turns amber | Trainee is on EO/IR and switches to RF (key 3) at T+31 | Sensor Adaptation Latency SAL = 3,000 ms (SAL-score 50) |
| T+30 | H-1 at 2.6 km enters the radar shadow (z 20 m is below the mask angle): radar track goes COASTING with a growing uncertainty ellipse | Follows the RF DF line towards U1 (RF is attenuated, not blocked) | MASKED logged; q decays below Q\_min after about 2 s, so fire control is blocked |
| T+50 | H-1 leaves the shadow at 1.8 km and climbs | None | None |
| T+51 | Radar re-acquires H-1 at about 1.76 km on the first sweep | Re-designates at T+52; track firm | Reacquisition time logged; q back to 0.8 |
| T+56 | H-1 at 1.56 km; PNR (0.5 km) at about T+82 | TARGET: decision tree opens; picks RF soft-kill (₹100, Pk 0.8, envelope 0.2 to 2.0 km) | Oracle comparison; CER 0.001 |
| T+57 | Pk draw (seeded PRNG) succeeds; H-1 loses link and falls in open ground | ASSESS: confirms KILL at T+58 | Assessment correctness scored |
| T+60 | Red Team reactive trigger (H-1 neutralised): Wave 2 spawns, five RF-silent autonomous swarm elements (₹50,000 each, 45 m/s) detectable at 3.0 km on bearing 300, plus three bird flocks | Re-prioritises; returns to radar | Trigger logged |
| T+64 | CHAOS: JAMMING for 15 s, RF blind (the swarm is RF-silent anyway) | Trainee is on radar and EO/IR, so no switch is needed | SAL not recorded (the jammed sensor was not in use) |
| T+71 | Swarm at 2.5 km, inside EO/IR reach | Uses EO/IR to classify elements; picks gun burst (₹20,000) or interceptors (₹2,00,000); the missile (₹30,00,000, CER 60, E\_econ 29) is tempting but wasteful | CER and swarm handling scored |
| T+82 | Swarm enters the gun envelope (2.0 km) | Engages elements (Pk 0.35 per element for the gun) | Seeded kill draws |
| T+116 | One swarm element crosses PNR (0.5 km) still alive | None | LEAK recorded, asset damage, leak penalty |
| T+120 | Sim ends | Hot-wash card: score, MET, MDT, accuracy, CER, collateral, leakers, Red Team's next-session plan | Session persisted; EMA and difficulty updated (TRAIN mode) |

DEMO-1 is also a golden test (AC-8): first detectable at T+5, masked T+30 to T+50, H-1 PNR at T+82.5, swarm PNR at T+115.6, each within 1 s. DEMO-2 is a 30 s scenario with one recon quad, used to show the missile penalty in the demo.

## 4. Scoring & AAR Logic

All parameters live in config.json (weights, costs, envelopes) so DSSC faculty can tune doctrine without code changes. All values below are notional defaults.

### 4.1 Timestamps (ms, from simulation clock; input times use event.timeStamp, mapped to the sim clock and quantised to the next 50 ms tick)

- t\_vis: first instant the ground-truth target is detectable by at least one sensor after masking and chaos are applied (computed by the sim, never by the trainee). Diagnostic only.
- t\_trk: instant the track is initiated and appears in the track table (2 hits in 3 sweeps). This is the earliest moment the trainee can act, so every trainee-time metric starts here. t\_trk minus t\_vis is reported as a system diagnostic and is not scored.
- t\_desig: trainee designates (Fix). t\_cls: classification confirmed. t\_eng: fire command. t\_PNR: moment the target crosses the asset's minimum engagement radius R\_min (point of no return: weapons release against it is disabled from here).
- T\_budget = t\_PNR minus t\_trk.

### 4.2 Per-track score

For a hostile track: S = 0.25 D + 0.20 C + 0.35 G + 0.20 R. For a non-hostile track (bird, civil, friendly) D is dropped and weights renormalise to S = 0.5 C + 0.25 G + 0.25 R. All components are in \[0, 100\].

### 4.3 D, Detection speed

D = 100 x clamp(1 minus (t\_desig minus t\_trk) / T\_budget, 0, 1). Never designated: D = 0. MDT (Mean Detection Time) = mean(t\_desig minus t\_trk) in ms.

### 4.4 C, Classification accuracy (cost-weighted matrix)

Classes: HOSTILE-ATTACK (HA), HOSTILE-ISR (HI), SWARM-ELEMENT (SW), CIVIL-UAS (CU), BIRD (BI), FRIENDLY (FR). C = M\[true\]\[pred\] from the notional matrix below (config.json). Rows are the true class; columns are the trainee's label.

| True / Pred | HA | HI | SW | CU | BI | FR |
| --- | --- | --- | --- | --- | --- | --- |
| HA | 100 | 60 | 60 | 0 | 0 | 0 |
| HI | 60 | 100 | 60 | 0 | 0 | 0 |
| SW | 60 | 60 | 100 | 0 | 0 | 0 |
| CU | 20 | 20 | 20 | 100 | 50 | 30 |
| BI | 20 | 20 | 20 | 50 | 100 | 30 |
| FR | 20 | 20 | 20 | 30 | 30 | 100 |

Rules: confusion inside the hostile family scores 60 (right threat family, wrong type). A non-hostile labelled hostile scores 20 and is logged as a False Positive. A hostile labelled CU, BI or FR scores 0 and is logged as a False Negative (critical). A track not classified before its deadline scores C = 0; the deadline is t\_PNR for hostile tracks and, for non-hostile tracks, the moment they cross R\_min or the end of the session, whichever comes first. Aggregate Classification Accuracy = correct diagonal / all tracks that existed, so unclassified tracks count as misses. Also report classification coverage (classified / total), hostile recall and hostile precision.

### 4.5 G, Engagement decision (the decision tree and asymmetric economics)

Effector table (notional):

| Effector | Cost per engagement | Pk0 | Envelope (km) | Collateral weight w\_e | Notes |
| --- | --- | --- | --- | --- | --- |
| RF soft-kill / GNSS denial | ₹100 | 0.8 (0.1 vs RF-silent) | 0.2 to 2.0 | 0.1 | Dead if RF jammed or target autonomous |
| Directed energy (laser) | ₹500 | 0.7 | 0.2 to 1.5 | 0.1 | Pk x0.5 in fog |
| Gun burst (12.7/40 mm) | ₹20,000 | 0.6 (0.35 per element in swarm) | 0.1 to 2.0 | 0.6 | Debris and stray rounds |
| Interceptor drone | ₹2,00,000 | 0.8 | 0.5 to 4.0 | 0.3 | Good vs loitering munitions |
| SAM / MANPADS missile | ₹30,00,000 | 0.9 | 1.0 to 5.0 | 0.9 | High collateral, high cost |

Threat values: commercial recon quad ₹40,000; FPV attack drone ₹1,00,000; swarm element ₹50,000; fixed-wing loitering munition ₹10,00,000.

- Cost Exchange Ratio: CER = effector cost / threat value.
- Economic score: E\_econ = 100 if CER <= 1, else max(0, 100 minus 40 x log10(CER)). CER 10 gives 60; 75 gives 25. CER above 10 raises an 'UNFAVOURABLE EXCHANGE' flag in the AAR.
- Timing score: E\_time = 100 x clamp(1 minus abs(R\_engage minus R\_opt) / R\_opt, 0, 1), where R\_opt is the middle of the effector's Pk plateau.
- Hostile neutralised before PNR: G = 0.6 E\_econ + 0.4 E\_time. After PNR, weapons release against that track is disabled and, if it is still alive, it is a leaker. Engaged but missed with no successful re-engagement before PNR: leaker with G = 0.3 E\_econ (credit for trying). Leaker with no engagement attempt: G = 0.
- Non-hostile correctly left alone: G = 100. Engaged: G = 0.
- Oracle: at runtime the sim computes the 'school solution' for each hostile: the cheapest admissible effector with Pk at least 0.6 under current chaos state, inside its envelope, and ROE-compliant. The AAR shows trainee choice vs oracle and the cost regret.

### 4.6 R, ROE and collateral

R = clamp(100 minus 100 x w\_e x rho\_zone x I\_overlap minus 50 x \[civil engaged\] minus 100 x \[friendly engaged\] minus 20 x N\_ROE, 0, 100). rho\_zone in \[0,1\] is the Urban Zone density; I\_overlap = 1 if the target position at fire lies inside the zone polygon expanded by the effector debris radius (gun 150 m, missile 400 m, interceptor 100 m, soft-kill/laser 0 m). A kinetic effector (w\_e >= 0.3) fired over a zone with rho\_zone > 0.5 is an ROE violation: it counts in N\_ROE and caps G at 40. Weapons release on a track the trainee has not classified is also an ROE violation (counts in N\_ROE). Zones with rho\_zone = 0 (ridge, forest) mask sensors but add no collateral penalty.

### 4.7 Session score

Score = 100 x sum(omega\_i x S\_i) / sum(omega\_i), minus 20 per leaker, minus 25 per critical event (civil or friendly engaged), clamped to \[0, 100\]. Threat weights omega: attack 1.0, ISR 0.6, swarm element 0.4, decoys 0.3. A leaker is penalised twice on purpose (reduced G plus the flat deduction) because a leak is the worst outcome. Grades: 85+ MISSION-READY, 70 to 84 PROFICIENT, 50 to 69 DEVELOPING, below 50 REMEDIAL.

### 4.8 AAR dashboard

Metrics per session:

| Metric | Definition |
| --- | --- |
| Mean Engagement Time (MET, ms) | Mean of (t\_eng minus t\_trk) over engaged hostile tracks |
| Sensor-to-Shooter Latency (ms) | Mean of (t\_eng minus t\_desig) |
| Mean Detection Time (ms) | MDT from 4.3 |
| Detection-to-track latency (ms, diagnostic) | Mean of (t\_trk minus t\_vis); system latency, not scored |
| Mean Classification Time (ms) | Mean of (t\_cls minus t\_desig) |
| Classification Accuracy, precision, recall | From 4.4 |
| Aggregate CER and Unfavourable Exchange count | From 4.5 |
| Collateral incidents / ROE violations | From 4.6 |
| Leak rate | Leakers / hostile tracks |
| Sensor Adaptation Latency (SAL, ms) | Mean of (t\_switch minus t\_chaos\_onset) over chaos events that degraded the sensor in use at onset; if the trainee never switches, SAL = event duration; not recorded when no such event occurred |
| Swarm saturation handling | Fraction of swarm elements engaged before PNR (not applicable when the session has no swarm) |

Dashboard panels: (1) scorecard and grade; (2) KPI tiles with delta vs previous session; (3) timeline replay: scrubber with lanes for Detection, Classification, Engagement, Chaos, Masking; play at 1x/4x; click a marker to see the decision, ground truth and oracle choice; (4) confusion matrix heatmap; (5) trend lines per metric across sessions, with difficulty d overlaid so improvement is not mistaken for easier scenarios; (6) weakness spider chart plus 'Red Team plan for next session'; (7) unit view built from EVAL sessions only: cohort mean, percentile, trainee-by-metric heatmap, leaderboard ranked by latest EVAL score with the highest TRAIN difficulty reached shown beside it.

**Replay:** a session is stored as scenario spec + seed + timestamped input events. Replay re-runs the deterministic sim (2,400 steps for 120 s, effectively instant) and scrubs to any frame.

### 4.9 Modes, longitudinal tracking and difficulty

- **TRAIN mode (adaptive):** scenarios come from the Director (5.4) and difficulty adapts per trainee. Scores are **not** comparable between trainees, because difficulty is steered towards a score of about 70 for everyone.
- **EVAL mode (fixed benchmark):** a bundled pack of 6 scenarios with fixed seeds and difficulty tiers (for example d = 0.3, 0.5, 0.7, two scenarios each), no adaptation, identical for every trainee. Unit leaderboards, percentiles and deltas between sessions use EVAL sessions only. Run EVAL at the start and end of a training block.
- Per-metric EMA: EMA\_1 = x\_1 (first valid observation), EMA\_n = 0.4 x x\_n + 0.6 x EMA\_(n-1), for m in {D, C, E\_econ, R, SAL-score, SAT-score}. A metric with no valid observation in a session (no chaos event, no swarm) is skipped and keeps its previous EMA; with no history at all, w\_k = 0.5.
- SAL-score = 100 x clamp(1 minus SAL / 6000 ms, 0, 1). SAT-score = 100 x fraction of swarm elements engaged before PNR.
- Weakness vector: w\_k = 1 minus EMA\_k / 100.
- Difficulty d in \[0,1\], d\_0 = 0.3: d\_(n+1) = clamp(d\_n + 0.15 x (Score\_n minus 70) / 30, 0, 1), updated after TRAIN sessions only. Target score 70 keeps trainees in the learning zone. Trend charts always show d beside the metrics.

## 5. Technical Architecture

### 5.1 System overview

```
+------------------------ Unit Laptop (air-gapped) ------------------------+
| Pinned Chromium build (bundled)                                          |
|  React UI + Zustand  <->  Sim Core (TypeScript, fixed 20 Hz, seeded)     |
|  Canvas renderers: Radar | EO/IR | RF (60 fps, interpolated)            |
|        ^ ScenarioSpec                         | session + events         |
|  Scenario Director / Adaptive Red Team        v                          |
|  (TypeScript, in the browser)        IndexedDB (Dexie)                   |
|                                      AAR aggregation, unit roll-ups      |
+--------------------------------------------------------------------------+
  Unit view across laptops: trainee laptops export session JSON (USB or shared
  folder); the instructor laptop imports it. Optional after v1: FastAPI + SQLite.
```

**Key architectural decision:** the Director only *generates* a complete ScenarioSpec (all spawns, paths, chaos schedule, reactive triggers). The sim then *plays* it deterministically. There is no network call at any point, and no server in v1. Insurance: 12 pre-generated scenarios (exported from the same generator at build time), the 6-scenario EVAL pack, DEMO-1 and DEMO-2 are bundled, so the demo runs even if generation fails.

### 5.2 Frontend (React + TypeScript + Vite, Canvas 2D; PixiJS optional)

```
/apps/web/src
  /sim      engine.ts  sensors.ts  masking.ts  chaos.ts  effectors.ts  oracle.ts  scoring.ts  rng.ts
  /render   radarLayer.ts  eoirLayer.ts  rfLayer.ts  hud.ts
  /ui       Console.tsx  TrackTable.tsx  Engage panel  AAR/*  UnitView.tsx
  /store    sessionStore.ts (Zustand)
  /db       dexie.ts  io.ts (session JSON export/import)
  /director director.ts  profile.ts  generator.ts  validate.ts  levers.ts
/tools/launcher     tiny static file server (127.0.0.1)
/services/director  (reserved, after v1: FastAPI + SQLite mirror)
```

- **Game loop:** fixed timestep dt = 50 ms (20 Hz) with an accumulator on the main thread (Worker is optional, P2). Renderer interpolates positions at 60 fps via requestAnimationFrame. Max 150 live entities.
- **Canvas layers (stacked):** (1) static base: range rings, bearing ticks, Urban Zone polygons, pre-rendered once; (2) dynamic: sweep wedge with alpha-fade afterglow, plots, tracks, velocity vectors, ghost ellipses, clear and redraw per frame; (3) React DOM HUD for tables and panels. Use object pooling for track sprites; no per-frame allocations.
- **Radar PPI:** world metres to canvas via fixed scale; sweep angle = 2 pi x (t / 2 s). Detection is evaluated only when the beam crosses a target bearing; a track initiates on 2 hits in 3 sweeps.
- **EO/IR view:** viewfinder panel with crosshair, procedural vector silhouettes (quad, fixed-wing, bird with flapping animation), film noise, fog haze overlay, IR green-white palette at night. No assets beyond inline SVG paths.
- **RF view:** scrolling spectrum waterfall plus DF bearing lines on the PPI; jamming fills the waterfall with wideband noise.
- **Input timing:** every trainee action is stamped with event.timeStamp, converted to sim-clock ms, quantised to the next 50 ms tick (where the action is applied) and appended to the event log.
- **Perf budget:** frame under 16 ms on i3 integrated graphics; JS heap under 150 MB; bundle under 8 MB. Chart.js bundled locally for the AAR.

### 5.3 Simulation core: the math

**World model.** 2D plane in metres, radar and asset at origin. Each drone carries x, y, and a scalar altitude z (never rendered as 3D, only used in masking math), velocity vector, vertical rate, RCS, class, cost, and a behaviour profile.

**Notional drone classes (config.json; verify against public specifications):**

| Class | Cruise speed | Value |
| --- | --- | --- |
| Commercial recon quad | 15 m/s | ₹40,000 |
| FPV attack drone | 40 m/s | ₹1,00,000 |
| Swarm element (one-way fixed-wing) | 45 m/s | ₹50,000 |
| Fixed-wing loitering munition | 50 m/s | ₹10,00,000 |
| Civil UAS | 8 to 12 m/s | not applicable |
| Bird | 3 to 10 m/s, erratic | not applicable |

**Radar detection.** SNR = (RCS / RCS\_ref) x (R\_ref / R)^4 x A\_env, with RCS\_ref = 0.01 m2 and R\_ref = 3.0 km. Pd = 1 minus exp(minus 2.303 x SNR), so a reference target at R\_ref has Pd = 0.9. A\_env = 1.0 clear, 0.6 rain, 0 during radar dropout. Birds: RCS 0.001 to 0.005, erratic velocity.

**Terrain masking (urban, ridge and forest zones).** For each terrain zone j (URBAN, RIDGE or FOREST) with polygon P\_j, roofline or crest height H\_j and shadow length L\_j (defaults: urban H 40 m, L 800 m; ridge H 80 m, L 1,200 m; forest H 25 m, L 300 m), and radar antenna height h\_r = 15 m:

1. Cast the segment from the radar to target at (x, y, z), range R.
2. If it intersects P\_j, let d\_n = distance to the first intersection (near edge).
3. theta\_mask = atan2(H\_j minus h\_r, d\_n). theta\_t = atan2(z minus h\_r, R).
4. The target is **masked** if theta\_t < theta\_mask AND R minus d\_n <= L\_j. Masked targets produce Pd = 0 for Radar and no EO LOS.
5. RF is attenuated, not blocked: A\_rf = 0.5 inside the zone, so RF can still cue a hidden emitter. This teaches sensor cross-cueing.

The terrain-hugging behaviour profile commands: cruise z = 120 m; when the distance to a zone edge falls below the trigger distance d\_trig = v x (z\_cruise minus z\_hug) / descent\_rate, descend at 8 m/s to z\_hug = 0.5 x H\_j; climb after exit. For the FPV at 40 m/s, d\_trig = 40 x 100 / 8 = 500 m. The 2D renderer needs nothing else: the drone simply stops being detectable. A masked track coasts as a ghost with uncertainty sigma(t) = sigma\_0 + 12 m/s x delta\_t, and its track quality q decays to 0 over 8 s, so engagement of a ghost is blocked by the Q\_min rule.

**Kill outcome.** Pk = Pk0(effector, class) x g(R) x h(chaos), where g(R) is 1 across the effector's plateau (default: the middle 60 percent of its envelope) tapering to 0 at the envelope edges, and h applies fog/jam factors (e.g. laser x0.5 in fog, soft-kill 0 under jamming). Outcome is drawn from its own seeded PRNG stream (mulberry32), so replays on the pinned browser build are deterministic.

**Sensor Chaos Engine.**

| Event | Effect | Duration |
| --- | --- | --- |
| FOG | EO/IR range x0.25 (laser Pk x0.5) | 12 to 25 s |
| JAMMING | RF waterfall saturated, RF detection 0, soft-kill Pk 0 | 10 to 20 s |
| RAIN CLUTTER | Radar A\_env 0.6, plus 1 to 3 transient false plots | 15 to 30 s |
| RADAR DROPOUT | Radar A\_env 0 | 3 to 6 s |

Scheduling: onsets sampled from a Poisson process with lambda = lambda\_0 x (1 + 2d). Fairness constraints: at most one concurrent event and at least one sensor class always remains functional. The sensor badge changes colour within 1 s of onset so response latency (SAL) is measurable. Chaos events are written into the ScenarioSpec by the Director, so they too are seeded and replayable. The Director's fairness validator (5.4, step 7) rejects any schedule that leaves a hostile with no usable sensing path.

### 5.4 Scenario Director and Adaptive Red Team (TypeScript, runs in the browser)

**ScenarioSpec fields:** seed, difficulty, day\_night, zones\[\] (type URBAN/RIDGE/FOREST, polygon, H, L, rho), threats\[\] (id, class, RCS, cost, spawn\_t, path waypoints, profile, emits\_rf, remote\_id), decoys\[\], chaos\_events\[\], reactive\_triggers\[\] (condition expression, action), asset (position, R\_min), roe\_text, levers\_used (for the AAR 'Red Team plan').

**Generation pipeline:**

1. **Seed:** hash(trainee\_id, session\_idx, random nonce) so the same trainee never gets the same layout.
2. **Weakness profiling:** load EMA metrics, compute w\_k, sample 1 to 2 levers via softmax: p\_k = exp(4 w\_k) / sum(exp(4 w\_j)). This is rule-based and fully explainable (the AAR shows which lever was chosen and why).
3. **Scenario grammar:** phases PROBE (1 to 2 threats), DECOY-FLOOD, MAIN ATTACK or SWARM-SATURATE, each placed by a Poisson arrival process over the session length; bearing sectors sampled with weights favouring sectors the trainee historically covers worst.
4. **Path synthesis:** waypoint paths with jitter (Bezier smoothing) under approach profiles DIRECT, TERRAIN-HUG, ORBIT-FEINT, SWARM-SATURATE.
5. **Decoy injection:** bird flocks (Brownian velocity 3 to 10 m/s, tiny RCS), civil drones (Remote-ID broadcast with probability 1 minus 0.3 d; the rest appear as unidentified controlled drones to create ambiguity), friendly UAS on IFF, placed so that some cross Urban Zones.
6. **Novelty filter:** feature-vector cosine similarity against the last 10 scenarios must be below 0.85, otherwise regenerate (20 attempts, then mutate and re-validate).
7. **Fairness validation:** every hostile must have (a) T\_budget of at least 6 s measured from t\_trk, (b) a non-empty admissible effector set, and (c) a sensing window of at least 6 s before PNR in which track quality q is at least Q\_min, given the scheduled masking and chaos events (simulated with an ideal operator). Otherwise the spec is rejected.

**Weakness to lever mapping (what the Red Team exploits):**

| Weak metric | Red Team lever |
| --- | --- |
| Slow detection (D) | Smaller RCS, terrain-hugging profile through zones, shorter T\_budget, blind-sector approach |
| Poor classification (C) | More decoys with RCS and speed close to real threats; civil drones near hostile tracks |
| Poor economics (E\_econ) | Cheap-saturation: many low-value drones that bait missile use |
| ROE and collateral (R) | Threats that loiter or transit over high-density Urban Zones |
| Slow sensor adaptation (SAL) | Schedule chaos events aimed at the sensor the trainee uses most (from sensor-usage log) |
| Swarm handling (SAT) | Increase swarm size, reduce spacing, RF-silent swarm elements |

**What is adaptive and what is rule-based (be precise in the pitch).** In v1 the adaptation is statistical profiling (EMA per skill) plus weighted sampling of scenario levers and fixed reactive rules. It is explainable, testable and deterministic given a seed. It is not a trained neural model, so say "adaptive, profile-driven scenario generation". Optional upgrade (F-07b, P2, only after AC-6 passes): replace softmax with Thompson sampling. Each lever keeps a Beta posterior for the probability that using it lowers that trainee's session score by at least 5 points; the Director samples from the posteriors and updates them after every TRAIN session, falling back to softmax until a trainee has 3 sessions. This learns which levers actually hurt a given trainee, not just which metric is low.

**Difficulty mapping (d in \[0,1\]):** hostile count N = round(2 + 8d); decoy ratio 0.2 + 0.5d; RCS multiplier 1 minus 0.5d; T\_budget compression 1 minus 0.4d; chaos intensity lambda\_0 x (1 + 2d).

**Reactive triggers (live adaptation without network):** rule list evaluated client-side, for example: if MDT(first hostile) > 8000 ms then spawn probe from the blind sector; if trainee fires kinetic at a bird then inject a civil drone into the zone; if no sensor switch within 5 s of chaos onset then extend the event by 5 s (capped).

```ts
function generateScenario(traineeId: string, sessionIdx: number, d: number,
                          W: WeaknessVector, history: ScenarioSpec[]): ScenarioSpec {
  const seed = hash(`${traineeId}:${sessionIdx}:${randomNonce()}`);  // nonce stored with the spec
  const rng = mulberry32(seed);
  let spec: ScenarioSpec | null = null;
  for (let i = 0; i < 20; i++) {
    const levers = chooseLevers(W, rng);   // softmax (v1) or Thompson sampling (F-07b)
    spec = buildSpec(rng, d, levers);
    const recent = history.slice(-10).map(h => h.features);
    if (maxCosine(spec.features, recent) < 0.85 && validate(spec)) return spec;
  }
  for (let i = 0; i < 20; i++) {           // mutate, then re-validate every candidate
    const candidate = mutate(spec!, rng);
    if (validate(candidate)) return candidate;
  }
  return pickBundledFallback(d);           // never return an unvalidated spec
}
```

> **NOTE: Backend, REST API, and SQLite architectures described below have been intentionally superseded by the v1.1 Offline-First Client Architecture.**

### 5.5 Module interfaces (in-process in v1; REST mirror reserved for later)

In v1 there is no server: the UI calls these functions directly. The same request and response shapes are reserved for an optional FastAPI backend after the hackathon.

| Function (reserved REST path) | Purpose |
| --- | --- |
| director.nextScenario(traineeId, mode) (POST /api/scenario/next) | TRAIN returns an adaptive ScenarioSpec plus levers\_used; EVAL returns the next scenario of the fixed benchmark pack with no adaptation |
| store.completeSession(session) (POST /api/session/complete) | Persists session, tracks, events, chaos log; for TRAIN sessions updates EMA and difficulty; returns next-plan preview |
| aar.session(id) (GET /api/aar/session/{id}) | KPIs, confusion matrix, event stream for replay |
| aar.traineeTrend(id) (GET /api/aar/trainee/{id}/trend) | Per-metric series, difficulty series and weakness vector |
| aar.unitSummary(unitId) (GET /api/unit/{id}/summary) | Cohort stats, percentiles, heatmap data, from EVAL sessions only |
| io.exportSessions() and io.importSessions(json) (POST /api/sync/import) | Trainee laptop exports session JSON; instructor laptop imports it (USB or shared folder) |

> **NOTE: Backend, REST API, and SQLite architectures described below have been intentionally superseded by the v1.1 Offline-First Client Architecture.**

### 5.6 Database schema (Dexie/IndexedDB stores in v1; the SQL below is the portable definition for a later SQLite backend)

```sql
CREATE TABLE units (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE trainees (id INTEGER PRIMARY KEY, unit_id INTEGER REFERENCES units(id),
  callsign TEXT UNIQUE, role TEXT, created_at INTEGER);  -- pseudonymous callsign; no real names or service numbers in v1
CREATE TABLE scenarios (id INTEGER PRIMARY KEY, seed TEXT, difficulty REAL, day_night TEXT,
  spec_json TEXT, levers_json TEXT, feature_vec TEXT, bench_id TEXT, created_at INTEGER);  -- bench_id set for EVAL pack scenarios
CREATE TABLE sessions (id INTEGER PRIMARY KEY, trainee_id INTEGER REFERENCES trainees(id),
  scenario_id INTEGER REFERENCES scenarios(id), mode TEXT CHECK(mode IN ('TRAIN','EVAL')),
  started_at INTEGER, duration_ms INTEGER, d_start REAL, score REAL, grade TEXT, sim_version TEXT,
  met_ms REAL, mdt_ms REAL, mct_ms REAL, s2s_ms REAL, cls_accuracy REAL, hostile_recall REAL,
  aggregate_cer REAL, unfavourable_exchanges INTEGER, collateral_incidents INTEGER,
  roe_violations INTEGER, leakers INTEGER, sal_ms REAL, swarm_sat REAL);
CREATE TABLE track_results (id INTEGER PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  track_no TEXT, true_class TEXT, pred_class TEXT, rcs_m2 REAL, value_inr INTEGER,
  t_spawn_ms INTEGER, t_vis_ms INTEGER, t_trk_ms INTEGER, t_desig_ms INTEGER, t_cls_ms INTEGER,
  t_eng_ms INTEGER, t_pnr_ms INTEGER, effector TEXT, oracle_effector TEXT, cer REAL,
  outcome TEXT CHECK(outcome IN ('NEUTRALISED','LEAKED','HELD','ENGAGED_NONHOSTILE')),
  collateral REAL, d_score REAL, c_score REAL, g_score REAL, r_score REAL, s_track REAL);
CREATE TABLE events (id INTEGER PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  t_ms INTEGER, type TEXT, track_no TEXT, payload_json TEXT);
CREATE INDEX idx_events_session_t ON events(session_id, t_ms);
CREATE TABLE chaos_log (id INTEGER PRIMARY KEY, session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE, type TEXT,
  t_start_ms INTEGER, t_end_ms INTEGER, t_switch_ms INTEGER);
CREATE TABLE trainee_profile (trainee_id INTEGER REFERENCES trainees(id), metric TEXT, ema REAL, n INTEGER,
  updated_at INTEGER, PRIMARY KEY (trainee_id, metric));
CREATE TABLE difficulty_state (trainee_id INTEGER PRIMARY KEY, d REAL, last_score REAL);
```

Event types for the replay log: SPAWN, DETECT, TRACK\_INIT, MASKED, REACQUIRE, DESIGNATE, SENSOR\_SWITCH, CLASSIFY, ENGAGE, ASSESS, CHAOS\_ON, CHAOS\_OFF, TRIGGER, LEAK, SESSION\_END. Raw ms timestamps are stored so every AAR metric can be recomputed from the event table alone.

### 5.7 Offline, security and quality gates

- **Air-gap guarantee:** CSP set to default-src 'self'. Verified by an automated browser test (Playwright or Puppeteer) that starts the app with the network disabled, plays a full scenario and asserts zero outgoing requests. Do not grep the bundle for URLs: React and SVG code contain URL strings that are never requested. Fonts and icons are bundled.
- **Data protection:** all data stays on the unit laptop; trainees are identified by pseudonymous callsigns, never real names or service numbers, in v1; optional encryption of exported session files and an instructor PIN (P2); JSON/CSV export for the training cell.
- **Determinism:** inputs are quantised to the next 50 ms tick and applied at that tick; sensing, kill resolution and scenario generation each use their own seeded PRNG stream, so trainee actions never change sensing outcomes; golden tests run on the pinned bundled browser, because JavaScript math functions such as exp and atan2 are not guaranteed to be bit-identical across engines.
- **Golden replay test:** the same seed plus the same input log must reproduce the identical event sequence and the same score (compared to 1e-6) on the pinned browser (run in CI and before the demo).
- **Golden scenario test:** DEMO-1 must reproduce the timeline in 3.4 (first detectable T+5, masked T+30 to T+50, PNR T+82.5, swarm PNR T+115.6, each within 1 s).
- **Unit tests (must exist):** masking function (inside zone, in shadow, outside; urban, ridge and forest), terrain-hug profile reaches z\_hug before the shadow begins at configured speeds, radar Pd curve, CER and E\_econ, classification matrix, ROE overlap, EMA update and cold start, SAL-score and SAT-score, fairness validator sensing window.
- **Fallback:** if scenario generation fails validation, the Director uses the next bundled scenario of matching difficulty and flags it in the AAR; sessions are always saved locally first.

## 6. 36-Hour Build Order (Hackathon Strategy)

This plan assumes a 36-hour finale format; confirm against the official SIH schedule.

**Suggested team split (4 developers):** A = simulation core and rendering; B = decision logic, scoring, oracle; C = Scenario Director, persistence, import/export; D = React UI, AAR dashboard, pitch and demo. Each phase ends with a checkpoint demo on a real low-end laptop.

### Phase 0: Foundations (H0 to H2)

- [ ] Monorepo, Vite + React + TS, tiny local static launcher, shared config.json (costs, weights, speeds, envelopes)
- [ ] Define ScenarioSpec and event-log schemas first (the contract between A, B, C and D)
- [ ] Seeded PRNG (mulberry32) with separate streams (sensing, kill resolution, scenario), tick-quantised input log, fixed-timestep loop skeleton

### Phase 1: Core mechanics (H2 to H12)

- [ ] Radar PPI: sweep, range rings, afterglow, track symbols, 60 fps on the test laptop (A)
- [ ] Entity model: drones with x, y, z, velocity, RCS, class; spawn from a hand-written scenario JSON (A)
- [ ] Radar Pd model, 2-of-3 track initiation, track table UI (A, D)
- [ ] Terrain masking function plus terrain-hugging profile (trigger distance from speed) plus ghost coasting, with unit tests (A)
- [ ] EO/IR and RF mode views with the information differences from 3.2 (A, D)
- [ ] Bundle 3 hand-written scenarios (single drone, decoys, swarm), with DEMO-1 first **Checkpoint H12: a drone disappears behind U1 and reappears at the times in 3.4; sensor toggles work**

### Phase 2: Decision logic (H12 to H20)

- [ ] F2T2EA state machine per track: Detected, Designated, Tracked, Classified, Engaged, Assessed (B)
- [ ] Track quality q and classification confidence as separate quantities (B)
- [ ] Effector menu with cost, Pk, envelope; seeded kill resolution (B, D)
- [ ] Scoring engine: D, C, G, R, per-track and session score; oracle engine (B)
- [ ] Event log capture with ms timestamps; hot-wash card at session end (B, D)
- [ ] Sensor Chaos Engine: fog and jamming first, rain and dropout if time allows (A)
- [ ] Persist sessions to IndexedDB (Dexie) (C) **Checkpoint H20: full 120 s run from first plot to score, offline**

### Phase 3: AAR dashboard (H20 to H28)

- [ ] KPI tiles: MET, MDT, accuracy, CER, collateral, leakers (D)
- [ ] Timeline replay with lanes and marker detail incl. oracle comparison (D, B)
- [ ] Confusion matrix heatmap; per-trainee trend chart with difficulty overlay; EMA update (D, C)
- [ ] EVAL benchmark pack (6 fixed scenarios) and TRAIN/EVAL switch (C)
- [ ] Unit view: minimal trainee table first (latest EVAL score, difficulty reached), heatmap later; session JSON export/import (C, D)
- [ ] Golden replay and golden scenario tests passing **Checkpoint H28: AAR for 3 sessions of one trainee shows trends; unit table shows EVAL scores**

### Phase 4: Adaptive engine (H28 to H33)

- [ ] Scenario Director v1 (TypeScript, in the browser): seed, softmax lever choice, grammar, decoys, difficulty mapping (C)
- [ ] Novelty filter and fairness validator including the sensing window (C)
- [ ] Reactive triggers (2 to 3 rules) (A, C)
- [ ] 'Red Team plan for next session' panel and weakness spider chart (D)
- [ ] Export 12 fallback scenarios from the generator into the bundle, plus DEMO-1 and DEMO-2 (C)
- [ ] (P2, only after AC-6 passes) Thompson-sampling lever selection (C)

### Phase 5: Hardening and demo (H33 to H36)

- [ ] Feature freeze at H33; test on 2 low-end laptops, airplane mode, network-blocked automated test, cold start timing
- [ ] Rehearse the 3-minute demo twice; record a backup screen capture
- [ ] Print one-page architecture and metrics sheet for judges

**Cut line if behind schedule (cut in this order):** (1) RAIN and RADAR DROPOUT chaos events; (2) instructor mode; (3) ridge and forest zone types (keep urban); (4) Thompson-sampling lever selection and any other P2 item; (5) unit-view heatmap (keep the minimal unit table, because the PS asks for unit performance); (6) session JSON import/export (the unit view then covers one laptop). **Never cut:** terrain masking, three sensor modes, decision-tree scoring, MET and timeline replay, the TRAIN/EVAL split, the minimal unit table.

## 7. Demo Script, Acceptance Criteria and Risks

### 7.1 Three-minute demo script

1. (0:00) Pitch line: 'Cheap drones are beating expensive air defence. We train the decision, not just the reflex.' Show laptop in airplane mode.
2. (0:20) Run DEMO-1 live for its first 60 s: the drone descends and vanishes behind the urban zone, fog hits EO/IR, switch to RF, follow the DF line through the zone, re-acquire, soft-kill at about T+57. Then jump to a pre-loaded completed session for the rest.
3. (1:20) Load DEMO-2 (30 s, one recon quad): deliberately fire the missile at it and show the UNFAVOURABLE EXCHANGE and ROE flags drop the score.
4. (1:50) Open the AAR of a pre-loaded session: MET in ms, confusion matrix, timeline replay scrubbed to the fog onset.
5. (2:30) Show the Red Team plan: 'Slow detection and weak sensor adaptation, next scenario uses terrain-hugging drones and jams your preferred sensor.' Launch it to show it differs from the first.
6. (2:50) Show the unit view built from EVAL sessions, and say why leaderboards use the fixed benchmark.

### 7.2 Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-1 | Runs offline on i3 / 4 GB at 60 fps with 100 live tracks (hard cap 150 entities) |
| AC-2 | Same seed plus input log reproduces the identical event sequence and a score within 1e-6 on the pinned browser (golden replay) |
| AC-3 | A drone below the mask angle inside the shadow (urban, ridge or forest) is never detected by Radar, and the FPV profile at its configured speed reaches z\_hug before the shadow begins |
| AC-4 | Chaos events always leave at least one sensor class functional |
| AC-5 | Missile on the ₹40,000 recon quad yields E\_econ of 25 (below 30) and an UNFAVOURABLE EXCHANGE flag; missile on the ₹1,00,000 FPV yields E\_econ of about 41 with the flag; kinetic over a zone with density above 0.5 yields an ROE violation |
| AC-6 | Ten consecutive generated TRAIN scenarios for one trainee have pairwise similarity below 0.85 |
| AC-7 | AAR displays MET, MDT, accuracy, CER, and a working timeline replay for any past session |
| AC-8 | DEMO-1 reproduces the 3.4 timeline within 1 s (golden scenario test) |
| AC-9 | Unit leaderboard and percentiles use EVAL sessions only; trend charts show difficulty d |
| AC-10 | Every generated hostile has a sensing window of at least 6 s with q at least Q\_min (fairness validator) |
| AC-11 | With the network disabled the app plays a full scenario and makes zero outgoing requests |

### 7.3 Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Browser storage cleared or corrupted before the demo | Pre-loaded demo sessions in the bundle; JSON export after every session; bundled fallback scenarios |
| Frame-rate drop on weak laptop | Layered canvas, pooled sprites, entity cap, low-fidelity toggle |
| Judges question realism of notional costs, speeds and Pk values | All values in config.json, labelled notional, editable by DSSC faculty; cite public sources where available |
| Judges call the 'AI' rule-based | Say 'adaptive, profile-driven scenario generation'; show the explainable lever choice; optional Thompson-sampling upgrade (F-07b) |
| Scope creep | Cut line in Section 6; P0 features only until H20 |
| Unfair or unsolvable generated scenarios | Fairness validator (T\_budget, effector set, sensing window) |
| Adaptive scores misread as comparable between trainees | TRAIN/EVAL split; leaderboards from EVAL only |

### 7.4 Out of scope (v1)

3D rendering, VR, real sensor data ingestion, multiplayer red-vs-blue, ballistic-accurate effector modelling, classified threat libraries, live multi-laptop sync and a server backend (v1 uses session JSON export/import; FastAPI and SQLite are reserved for later). The architecture leaves a clean seam (ScenarioSpec and config.json) for DSSC to load real doctrine and threat data later.
