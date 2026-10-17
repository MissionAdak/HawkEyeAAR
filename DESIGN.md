# DESIGN.md: DRISHTI-CUAS Tactical C2 Console

**Brief:** an air-defence operations-room console, not a web app. The operator is reading a scope under time pressure. Every pixel carries data or frames data. If a component would look at home in a SaaS dashboard, delete it.

## 0. Anti-SaaS checklist (reject a PR that breaks any line)

| Banned | Required instead |
|---|---|
| Rounded cards (`rounded-lg`, `rounded-2xl`), drop shadows, glassmorphism | 0 to 2 px radius, 1 px solid borders, flat fills |
| Gradients, pastel palettes, purple accents, hero sections, illustrations | Flat carbon panels; the only gradient allowed is the radar afterglow |
| Inter / system-ui / rounded geometric sans | `JetBrains Mono` (data), `Chakra Petch` (labels, headings), `Share Tech Mono` (clocks), all self-hosted |
| Friendly copy ("Great job!", emoji, toasts with icons) | Terse status codes: `TRK FIRM`, `WPN TIGHT`, `LEAK`, `BDA: KILL` |
| Sentence-case buttons with icons | UPPERCASE labels, 0.08em tracking, key hint in brackets: `[F] ENGAGE` |
| Animated easing, bounces, fades between screens | Instant state change; only allowed motion is the sweep, 1 Hz alert blink, waterfall scroll |
| Hidden info behind hover or modals during the scenario | Everything the operator needs is always on screen; modals only in AAR |

Every screen carries a fixed footer strip: `SYNTHETIC TRAINING AID | NOTIONAL PARAMETERS | NOT A CERTIFICATION`.

---

## 1. Design System

### 1.1 Palette (Tailwind `theme.extend.colors`, also exported to `render/palette.ts`)

| Token | Hex | Use |
|---|---|---|
| `carbon-950` | `#0D1117` | page background, radar background |
| `carbon-900` | `#161B22` | panel background |
| `carbon-800` | `#1F2630` | table row alt, input fill |
| `line` | `#262B33` (`border-neutral-800`) | all 1 px borders |
| `phosphor` | `#00FF66` | radar sweep, rings text, primary data, healthy state |
| `phosphor-dim` | `#003B1A` | range rings, grid, afterglow tail, inactive pills |
| `amber` | `#FF9900` | warning, degraded sensor, kinetic tier, IR HUD |
| `threat` | `#FF3333` | hostile symbols, ROE violation, LEAK, missile tier |
| `friend` | `#00CCFF` | friendly symbols, selected-track bracket |
| `unknown` | `#FFCC00` | unclassified track "?" |
| `text` | `#C9D1D9` / `text-dim` `#7D8590` | body / labels |

Contrast: all text on `carbon-900` must meet 4.5:1. Estimated from WCAG luminance: phosphor about 13:1, amber about 8:1, threat about 4.7:1, text-dim about 4.6:1; confirm with a contrast checker in TASK-P5-06. Colour is never the only carrier: each state also has a shape or a text code.

### 1.2 Typography

| Role | Font | Size / line | Notes |
|---|---|---|---|
| Panel title | Chakra Petch 600 | 11 px, UPPERCASE, 0.12em | phosphor-dim underline 1 px |
| Data | JetBrains Mono 400 | 12 px / 16 px | `font-variant-numeric: tabular-nums`, fixed column widths |
| Big readouts (clock, score) | Share Tech Mono | 20 px | |
| Event log | JetBrains Mono | 11 px / 13 px | 8 lines x 13 px = 104 px |

Fonts ship as `@fontsource/*` woff2 imported in `main.tsx` and bundled by Vite. No `<link>` to any font host.

### 1.3 NATO-style symbology (drawn with Canvas paths in `render/symbols.ts`)

The scope draws the **trainee's label**, never ground truth.

| Trainee label | Symbol | Colour | Size |
|---|---|---|---|
| `UNKNOWN_EVIDENCE_INSUFFICIENT` (default) | "?" glyph in a dashed square | `unknown` | 14 px |
| `HOSTILE_ATTACK`, `HOSTILE_ISR`, `SWARM_ELEMENT` | Diamond; ISR has a centre dot, SWARM has a small "S" | `threat` | 12 px half-diagonal |
| `FRIENDLY` | Circle | `friend` | 12 px |
| `CIVIL_UAS` | Square, solid outline | `phosphor` | 12 px |
| `BIRD` | Square with a wing tick on top | `unknown` (yellow) | 12 px |

State overlays: velocity vector (length = 10 s of travel), track number `T-01` label right of symbol (10 px mono), selected = four `friend` corner brackets, `FIX` = small ring, `COAST` = dashed outline plus uncertainty ellipse (`amber`, 1 px, radius = `ghostSigmaM`), `ENGAGED` = crosshair, `LEAK` = flashing `threat` ring at 1 Hz.
Raw plots (pre-track) are 2 px phosphor dots that fade over 3 sweeps.

---

## 2. Viewport Geometry (1366 x 768 target, zero vertical overflow)

```css
:root { --radar: min(520px, calc(100vh - 190px)); }   /* 190 = 45 top + 110 bottom + 35 padding */
html, body, #root { height: 100%; margin: 0; overflow: hidden; background: #0D1117; }

.console {
  display: grid; height: 100vh;
  grid-template-columns: 240px minmax(0, 1fr) 320px;
  grid-template-rows: 45px minmax(0, 1fr) 110px;
  grid-template-areas: "top top top" "left center right" "bottom bottom bottom";
}
.top    { grid-area: top;    height: 45px;  }
.left   { grid-area: left;   width: 240px;  overflow: hidden; }
.center { grid-area: center; display: grid; place-items: center; min-width: 0; }
.right  { grid-area: right;  width: 320px;  overflow: hidden; }
.bottom { grid-area: bottom; height: 110px; }
.radar-frame { position: relative; width: var(--radar); height: var(--radar); }  /* 1:1 */
.radar-frame canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
```

Budget at 768 px: 45 + 110 = 155 fixed; middle row = 613 px; canvas = min(520, 578) = **520 px**, leaving 93 px breathing room. Centre column width = 1366 - 240 - 320 = 806 px, so the 520 px canvas sits centred with 143 px gutters used for a **range legend** (left gutter: ring values, scale) and **sensor-state readout** (right gutter). The sensor-mode tabs (`[1] RADAR [2] EO/IR [3] RF`) and cursor bearing/range readout are **overlaid inside the canvas frame** (absolute positioned), so they add no height. Canvas backing store = `css size x min(devicePixelRatio, 1.5)`.

Fixed rails never scroll the page. Inside rails, the track table scrolls (`overflow-y: auto`, thin 4 px scrollbar in `phosphor-dim`) and holds 12 rows visible. Test at 1366x768, 1280x720 (canvas = 530 -> 520 stays), 1024x768 (rails shrink to 200/280 via `@media (max-width: 1200px)`).

### 2.1 Top bar (45 px)

`[ROE BANNER: WEAPONS TIGHT URBAN | HOLD FIRE CIVIL | NO RELEASE ON UNCLASSIFIED]` (amber, left, flex-1) | sensor health pills `RDR  EO/IR  RF` (green `OK`, amber `DEG`, red `OUT`, blink 1 Hz for first 3 s after change) | mission clock `T+00:57.350` | `SPEED 1x` (locked in EVAL) | mode tag `TRAIN d=0.42` or `EVAL BENCH-3`.

### 2.2 Left rail: track table (240 px)

Columns (mono 11 px): `TRK` (44) `LBL` (28, one-letter: H/I/S/C/B/F/?) `RNG km` (46) `BRG` (36) `SPD` (34) `ST` (52 status pill). Row height 20 px. Status pills are 1 px bordered rectangles: `FIND`, `FIX`, `FIRM`, `COAST` (amber), `TGT`, `ENG`, `ASSESS`, `LEAK` (red). Selected row has a 2 px `friend` left border. Tab cycles tracks sorted by time-to-PNR ascending (most urgent first).

### 2.3 Right rail: F2T2EA and weapons (320 px)

Top to bottom: (1) **Kill-chain strip**: six cells `FIND FIX TRACK TARGET ENGAGE ASSESS`, active cell filled phosphor, completed cells outlined, with elapsed ms since `t_trk` beside the active cell. (2) **Classification**: 7 radio rows with hotkeys (`1`..`7` while the panel has focus is avoided; use `C` then arrows); shows `c_cls` hint bar from sensors. (3) **Effector tiers**:

| Tier | Effectors | Style | Confirmation |
|---|---|---|---|
| T1 NON-KINETIC | RF soft-kill, Laser | phosphor border | none, `[F]` |
| T2 KINETIC | Gun, Interceptor | amber border | none, but ROE badge shown if over zone |
| T3 HEAVY | Missile | threat border, hatched fill | hold `[F]` for 500 ms |

Each effector button is 296 x 40 px and shows: name, `Rs` cost, `Pk` now (with chaos), envelope bar with the target's current range marked, and **live CER**: `CER 0.001` in phosphor (<= 1), amber (<= 10), or red with the text `UNFAVOURABLE EXCHANGE` (> 10), updating each tick. Physically impossible releases are disabled, dashed, and show a reason code (`Q<MIN`, `OUT ENV`, `PNR`, `RF JAM`). Releases that are possible but violate ROE stay enabled and carry a red badge (`UNCLASSIFIED`, `ROE URBAN`) so the trainee can make, and be scored on, the mistake. (4) `[A]` BDA row: `KILL | NO KILL | UNK`.

### 2.4 Bottom bar (110 px)

8 monospaced lines at 13 px, newest at bottom: `00:09.050  TRK  T-01 INIT  BRG 052 RNG 3.52`. Filter toggles on the right edge (vertical, 1 px boxes): `ALL TRK ENG CHAOS ROE`. Colours: info `text`, caution `amber`, violation `threat`. Millisecond stamps are tick-quantised sim time.

---

## 3. Sensor Visualisation States

All three modes share the same 520 px frame; keys `1`, `2`, `3` switch instantly, and each switch writes `SENSOR_SWITCH`.

### 3.1 Radar (key 1)

- Range rings every 1 km (phosphor-dim, 1 px), bearing ticks every 10 degrees, cardinal labels `000 090 180 270`, crosshair at the asset.
- Sweep: 30 RPM (2 s per revolution), 60 degree wedge drawn as a fading `phosphor` fill from alpha 0.35 to 0; plots persist and fade over 3 sweeps (alpha 1.0, 0.6, 0.3). Implemented by painting a `rgba(13,17,23,0.08)` overlay each frame on the dynamic layer.
- Urban/ridge/forest zones drawn on the static layer as 1 px dashed outlines with a type code and `H 40m` tag (zones are known terrain to the operator).
- Coasting tracks: dashed symbol, `amber` uncertainty ellipse growing with `ghostSigmaM`, label `COAST`.
- Rain clutter: 1 to 3 transient false plots plus speckle noise at 4% density. Dropout: scope freezes sweep, banner `RADAR OUT`.

### 3.2 EO/IR (key 2)

- 30 degree cone drawn on the PPI from the asset (amber outline, 1 px); mouse drag or arrow keys slew at up to 60 degrees/s.
- Viewfinder panel (260 x 260 px, bottom-left of canvas): monochrome. Day = grey-green, night IR = white-hot on black. Reticle with four ticks, range readout `RNG 1.62 km`, `FOV 30`.
- Target silhouette drawn from inline vector paths (quad with four rotors, fixed-wing, bird with 4 Hz wing animation, friendly with IFF tag) when inside the cone and range; scaled by 1/range; payload visible under 1.2 km.
- Fog: range x0.25, haze overlay (white noise at 25 to 60% alpha rising with severity), banner `EO/IR DEG - FOG`. Night: day-camera banner `EO OUT`, IR only at 70% range.

### 3.3 RF (key 3)

- Bearing lines from the asset to each emitting track: thin `phosphor` lines to the edge of range, with jitter of plus or minus 5 degrees redrawn at 4 Hz (line-of-bearing jitter), no range tick (bearing only).
- Spectrum waterfall along the bottom 120 px of the canvas: 200 bins, scrolling 1 row per 100 ms, each emitter is a bright vertical trace at its channel; Remote-ID emitters show `RID` tag, controlled links show `LINK`.
- Jamming: wideband noise fills all bins in `amber`, banner `RF OUT - JAMMING`; DF lines disappear. RF-silent drones never appear (the absence is the lesson).

---

## 4. AAR Dashboard Layout (12-column grid, 1366 x 768, page scrolls vertically here only)

```
+-----------------------------------------------------------------------------------+
| SCORECARD  [PROFICIENT IN SIMULATION | DEVELOPING | NEEDS RETRAINING]  72  d=0.42  |  cols 1-12, 64 px
+------------------+------------------+------------------+--------------------------+
| MET ms           | MDT ms           | CLS ACC %        | CER / UNFAV  | COLL | LEAK|  KPI tiles, cols 1-12
+------------------------------------------------------------------+----------------+
| TIMELINE 0:00 ------ 2:00  scrubber, 1x / 4x                     | CONFUSION 7x7  |  cols 1-8 | 9-12
| lane DETECT   . . .  |  lane CLASSIFY . .  |  lane FIRE  X       | heatmap        |
| lane CHAOS  [FOG]    [JAM]                  | lane MASK [U1]      |                |
+------------------------------------------------------------------+----------------+
| TREND (metrics + difficulty overlay)       | SKILL SPIDER (6)     | RED TEAM PLAN  |  cols 1-5 | 6-8 | 9-12
+------------------------------------------------------------------+----------------+
| UNIT VIEW (EVAL only): table + trainee x metric heatmap                           |
+-----------------------------------------------------------------------------------+
```

- **Scorecard:** grade badge is a 1 px bordered rectangle: `PROFICIENT IN SIMULATION` (phosphor), `DEVELOPING` (amber), `NEEDS RETRAINING` (threat). Next to it: score 0..100 in Share Tech Mono 32 px, mode, difficulty, any `PAUSED`/`FALLBACK SCENARIO` flags.
- **Timeline (120 s):** 5 lanes of 22 px: DETECTION, CLASSIFICATION, EFFECTOR FIRE, SENSOR CHAOS, URBAN MASKING. Markers: tick for discrete events, bars for chaos and masking spans. Scrubber is a 1 px vertical `friend` line; drag or click; keys `Space` play/pause, `,` `.` step 50 ms, `[` `]` jump to previous/next marker. Marker click opens a 320 px side drawer (not a modal) with: trainee decision, ground truth, oracle choice, cost regret, ROE gate results.
- **Replay view:** a 360 px radar canvas renders the scrubbed state from stored events (section 4.2 of ARCHITECTURE.md), with trainee-label symbols and a ground-truth toggle `[G]` that overlays true classes in white.
- **Confusion matrix:** 7 x 7, rows = true class, columns = trainee label. Cell fill encodes the **cost-weighted outcome** (phosphor for 100-score cells, amber for partial, threat for 0-score false negatives), cell text = count. The `UNKNOWN_EVIDENCE_INSUFFICIENT` row is rendered but hatched and always 0 (it is never a ground truth).
- **Spider chart:** 6 axes `D C ECON ROE SAL SAT`, EMA polygon in phosphor, latest session in amber, 20/40/60/80 rings in phosphor-dim, drawn with Canvas.
- **Red Team plan:** list of levers from `spec.levers` with the weakness that triggered each: `LEVER TERRAIN_HUG <- D EMA 41`.
- **Trend:** Chart.js (bundled) lines for chosen metrics, with `d` as a dashed amber line on a secondary axis; flat styling (no fills, no smoothing beyond `tension: 0`).

---

## 5. Interaction and Accessibility

- Keyboard-first: `1/2/3` sensor, `Tab` / `Shift+Tab` track, `Space` designate, `C` open classification (arrows + `Enter`), `F` fire (hold for missile), `A` BDA, `P` pause (flagged in EVAL), `Esc` clear selection.
- Hit targets in tables and effector buttons are at least 20 px tall; the radar accepts click-to-select within 12 px of a symbol.
- `prefers-reduced-motion`: disables afterglow blur and alert blink (state still shown by text).
- Low-fidelity toggle (`L`): disables afterglow, noise textures and waterfall interpolation for weak GPUs; logged in session metadata.
