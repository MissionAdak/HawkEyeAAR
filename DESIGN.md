# DESIGN.md — DRISHTI-CUAS Tactical C2 Interface

**Intent:** an authentic air-defence operations-room console, not a web app. Dark phosphor screen, dense tabular data, hard edges, instrument typography. Every pixel has a job. If a component would look at home in a SaaS dashboard, it is wrong here.

**Reference resolution:** 1366×768 (minimum supported 1280×700). **Never** any vertical page scroll.

---

## 0. Anti-SaaS ruleset (hard bans)

| Banned | Use instead |
| --- | --- |
| Rounded corners above 2 px, pill buttons, "cards" | 0 px radius panels; 2 px radius only on status tags; chamfered corner (8 px) on panel headers |
| Box shadows, glassmorphism, `backdrop-blur`, glows on DOM | Flat fills, 1 px borders. Phosphor glow exists **only inside canvases** |
| CSS gradients on DOM, pastel palettes, purple/indigo/violet anything | Flat colours from the token set in §1 |
| Inter, system-ui, rounded geometric sans | Chakra Petch (labels), JetBrains Mono (data), Share Tech Mono (canvas annotations) |
| Emoji, illustration, hero sections, landing-page layouts, icon packs | Inline 12-glyph set (§3.9) and Unicode box-drawing |
| Toasts, slide-in drawers, skeleton shimmer, easing animations | Static panels; state changes are instant. Only functional motion (§9) |
| Lorem or decorative copy | Terse operator language: `TRK`, `DESIG`, `PNR`, `ROE`, `BDA` |
| "Dashboard" widgets with big rounded numbers | Tabular readouts with units, labels above values |

Enforcement: Tailwind default palette, radii and shadows are removed in `theme.css` (§1.3) so the banned classes physically do not exist; `tests/guards/design.test.ts` fails on `rounded-(md|lg|xl|2xl|3xl|full)`, `shadow-`, `blur`, `gradient`, `indigo|purple|violet|fuchsia|pink` in `src/`.

---

## 1. Design system and palette

### 1.1 Colour tokens

| Token (Tailwind class suffix) | Hex | Role |
| --- | --- | --- |
| `base` | `#0D1117` | Screen background, canvas background |
| `panel` | `#161B22` | Panel fill, table rows (alternate), inputs |
| `neutral-800` | `#262626` | 1 px borders (`border-neutral-800`) |
| `neutral-700` | `#404040` | Strong borders, scrollbar thumb, hover border |
| `phos` | `#00FF66` | Phosphor green: primary data, sweep, nominal state, civil/bird symbols |
| `phos-dim` | `#00A844` | Secondary phosphor: range rings, raw plots, labels |
| `phos-deep` | `#003B1A` | Deep green fills: crosshair, selected-row fill, gauge troughs |
| `amber` | `#FF9900` | Night-vision amber: caution, degraded, unknown/unclassified, urban zones |
| `crimson` | `#FF3333` | Threat/hostile, blind, violations, PNR |
| `cyan` | `#00CCFF` | Friendly, selection, focus, EO camera, playhead |
| `text` | `#C9D1D9` | Primary text |
| `text-dim` | `#8B949E` | Secondary text, units |
| `text-faint` | `#6E7681` | Disabled and decorative ticks only (below 4.5:1: never for essential information) |

### 1.2 Verified contrast (WCAG 2.x relative luminance)

| Foreground | on `base` `#0D1117` | on `panel` `#161B22` |
| --- | --- | --- |
| `phos` | 13.96 | 12.76 |
| `phos-dim` | 6.02 | 5.51 |
| `amber` | 8.84 | 8.08 |
| `crimson` | 5.20 | 4.76 |
| `cyan` | 9.99 | 9.13 |
| `text` | 12.26 | 11.21 |
| `text-dim` | 6.15 | 5.62 |
| `text-faint` | 4.12 | 3.77 (decorative/disabled only) |

Button text on filled states uses `base`: on `phos` 13.96, on `amber` 8.84, on `crimson` 5.20. Colour is never the only carrier of meaning: every state also has a shape or text label.

### 1.3 `src/theme.css` (Tailwind v4, CSS-first; resets the default theme)

```css
@import "tailwindcss";

@theme {
  /* Remove the default palette, radii, shadows and blurs: banned looks cannot be expressed. */
  --color-*: initial;
  --radius-*: initial;
  --shadow-*: initial;
  --drop-shadow-*: initial;
  --blur-*: initial;
  --font-*: initial;
  --text-*: initial;

  --color-base: #0D1117;
  --color-panel: #161B22;
  --color-neutral-800: #262626;
  --color-neutral-700: #404040;
  --color-phos: #00FF66;
  --color-phos-dim: #00A844;
  --color-phos-deep: #003B1A;
  --color-amber: #FF9900;
  --color-crimson: #FF3333;
  --color-cyan: #00CCFF;
  --color-text: #C9D1D9;
  --color-text-dim: #8B949E;
  --color-text-faint: #6E7681;

  --radius-none: 0px;
  --radius-tag: 2px;

  --font-label: "Chakra Petch", "Bahnschrift", "DejaVu Sans Condensed", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, Consolas, "DejaVu Sans Mono", monospace;
  --font-display: "Share Tech Mono", "JetBrains Mono", ui-monospace, monospace;

  --text-2xs: 10px;   --text-2xs--line-height: 11px;
  --text-xs: 11px;    --text-xs--line-height: 14px;
  --text-sm: 12px;    --text-sm--line-height: 16px;
  --text-md: 14px;    --text-md--line-height: 18px;
  --text-lg: 18px;    --text-lg--line-height: 22px;
  --text-hero: 40px;  --text-hero--line-height: 40px;
}

:root {
  --top: 45px; --bottom: 110px; --rail-l: 240px; --rail-r: 320px; --strip: 35px;
  --radar: min(520px, calc(100vh - 190px));
}
@media (min-height: 900px) { :root { --radar: min(720px, calc(100vh - 190px)); } }   /* optional, P2: projector at 1080p */

html, body, #root { height: 100vh; margin: 0; overflow: hidden; background: var(--color-base); color: var(--color-text);
  font-family: var(--font-mono); font-size: 11px; line-height: 14px; font-variant-numeric: tabular-nums; }
*, *::before, *::after { box-sizing: border-box; border-radius: 0; }
```

Tailwind's built-in keywords (`transparent`, `current`, `inherit`) stay available. If the repo is pinned to Tailwind v3, express the same tokens in `tailwind.config.ts` with `theme: { colors, borderRadius, boxShadow: {}, fontFamily }` (replace, do not extend).

### 1.4 Typography

| Family | Weights | Use |
| --- | --- | --- |
| Chakra Petch | 500, 600 | Panel headers, button labels, badges: uppercase, `tracking-[0.12em]` |
| JetBrains Mono | 400, 700 | All data: tables, readouts, log, timer, numerics (tabular) |
| Share Tech Mono | 400 | Canvas annotations: range-ring labels, track labels, HUD text |

Scale: 10 / 11 / 12 / 14 / 18 / 40 px (`2xs` … `hero`). The hero size is only for the AAR session score. Fonts are bundled as latin-subset `woff2` in `/public/fonts` (≈150 KB total) with `font-display: block`; **never** a CDN. Canvas text is drawn only after `await document.fonts.load('10px "Share Tech Mono"')` (and the others) resolves.

---

## 2. Viewport geometry (exact, no vertical overflow)

### 2.1 Shell

```css
.shell { display: grid; height: 100vh; min-width: 1280px;
  grid-template-columns: var(--rail-l) minmax(0, 1fr) var(--rail-r);
  grid-template-rows: var(--top) minmax(0, 1fr) var(--bottom); }
.top    { grid-column: 1 / -1; height: var(--top); }
.bottom { grid-column: 1 / -1; height: var(--bottom); }
.rail   { min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
.center { min-height: 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
.strip  { height: var(--strip); width: var(--radar); display: flex; align-items: center; justify-content: space-between; }
.radar  { width: var(--radar); height: var(--radar); aspect-ratio: 1 / 1; }   /* canvas border is drawn inside the canvas: adds 0 px */
```

Every flex child that may grow has `min-height: 0`. Only two regions scroll internally, both with a 6 px square scrollbar (`neutral-700` thumb): the track table body and the AAR lists.

### 2.2 Arithmetic (proof that nothing overflows)

| Viewport height | Middle band (`vh − 45 − 110`) | Radar `min(520, vh − 190)` | Centre column (`35 + radar`) | Slack |
| --- | --- | --- | --- | --- |
| 768 | 613 | 520 | 555 | 58 |
| 720 | 565 | 520 | 555 | 10 |
| 700 | 545 | 510 | 545 | 0 |
| 900 | 745 | 520 | 555 | 190 |
| 1080 | 925 | 520 (720 with the optional media query) | 555 | 370 |

`190 = 45 (top) + 110 (bottom) + 35 (strip)`. The strip holds the sensor-mode tabs (left) and cursor bearing/range and scale readout (right) in **one row**, which is why the formula never overflows. Centre width at 1366 is `1366 − 240 − 320 = 806 px` (radar 520 centred); at 1280 it is 720 px.

`tests/e2e/layout.spec.ts` asserts `document.documentElement.scrollHeight <= window.innerHeight` at 1366×768 and 1280×700 on the Console, Briefing, Hot-wash and AAR screens.

### 2.3 Top bar — 45 px

| Segment | Width | Content |
| --- | --- | --- |
| Brand | 220 px | `DRISHTI-CUAS` (Chakra Petch 600, 12 px, `phos`) over `FOB ALPHA // SIM` (`text-dim`, 10 px) |
| ROE banner | flex (≈720 px at 1366) | One line, 11 px, `amber` text on `base`, 1 px `amber` border: `ROE: WEAPONS TIGHT OVER URBAN · HOLD FIRE ON CIVIL UAS · NO RELEASE ON UNCLASSIFIED`. A violation turns the border `crimson` and prepends `VIOLATION` for 3 s |
| Sensor health | 3 × 68 px (28 px high, 4 px gap) | `RADAR`, `EO/IR`, `RF`: `NOM` (`phos` border), `DEG` (`amber` border), `BLIND` (`crimson` fill, `base` text, 1 Hz blink). Colour changes within 1 s of chaos onset |
| Mission timer | 110 px | `T+012.350` JetBrains Mono 700 14 px, `/120` in `text-dim`; 2 px progress line under it |
| Mode tag | 56 px | `TRAIN` (`phos`), `EVAL` (`cyan`), `DEMO` (`amber`) |
| Sim speed | 56 px | `1×`; read-only in scored sessions (the control is active only in AAR replay and DEMO) |

Fixed segments total 646 px; the banner takes the rest. Bottom border 1 px `neutral-800`.

### 2.4 Left rail — 240 px

Stack: title bar 24 px + track table (flex, internal scroll) + evidence panel 168 px. At 768 the table viewport is `613 − 24 − 168 = 421 px` (header 20 px + 18 rows of 22 px).

Track table columns (sum 238 px inside borders):

| Column | Width | Format |
| --- | --- | --- |
| ID | 38 px | `T-01` |
| SYM | 24 px | class symbol (§3), 14 px |
| RNG | 44 px | km, 2 decimals |
| BRG | 40 px | `052°` three digits |
| SPD | 36 px | m/s integer |
| ST | 56 px | status tag |

Status tags (2 px radius, 10 px text, `base` text on fill, or outline): `FND` `FIX` `TRK` `TGT` `ENG` `ASS` (outline `phos-dim`/`phos`/`phos`/`amber`/`crimson`/`cyan`), `COAST` (amber outline), `LOST` (crimson outline), `PNR` (crimson fill). Rows are 22 px, 1 px bottom border `neutral-800`. Selected row: `phos-deep` fill and a 2 px `cyan` left bar. Designated tracks show `▸` before the ID. Sorted by range ascending; the sort never changes under the trainee's cursor more often than once per second.

Evidence panel (168 px): header 18 px + 8 rows × 16 px + 22 px padding. Rows: `MICRO-DOPPLER` (ROTOR/FLAP/—), `EO SHAPE`, `PAYLOAD`, `RF LINK`, `REMOTE-ID`, `RF BRG`, `c_cls` (bar 0–1), `q` (bar 0–1 with a `crimson` tick at 0.6 labelled `QMIN`). A value that its sensor cannot currently provide reads `NO CUE` in `text-faint`.

### 2.5 Centre column

`strip` (35 px): left = three sensor tabs `[1] RADAR  [2] EO/IR  [3] RF` (Chakra Petch 11 px; active tab `phos` bottom border 2 px and `phos` text; inactive `text-dim`); right = `CUR 052° / 2.31 km    SCALE 5 km` (JetBrains Mono 10 px). Below the strip: the sensor canvas, `var(--radar)` square, 1 px `neutral-800` border drawn inside the canvas. Remaining slack is empty `base`.

### 2.6 Right rail — 320 px (stack height 588 of 613 px, 25 px slack)

| Block | Height | Content |
| --- | --- | --- |
| Selected track header | 56 | `T-01` 14 px, class symbol, `RNG 2.31 km  BRG 052°  q 0.80`, state tag |
| F2T2EA stepper | 44 | six equal 53 px segments `FND FIX TRK TGT ENG ASS`; done = `phos-dim` fill, current = `phos` fill with `base` text, future = outline `neutral-800` |
| Classification block | 142 | 18 px label `CLASSIFY [C]` + grid 2 columns × 4 rows of 28 px buttons, 4 px gaps: `ATTACK`, `ISR`, `SWARM ELEMENT`, `CIVIL UAS`, `BIRD`, `FRIENDLY`, `UNKNOWN (EVID. INSUFF.)` (7 buttons; the 8th cell shows the committed label as text) |
| Weapons panel | 248 | 18 px label `EFFECTORS [Q W E R T]` + 5 rows × 46 px |
| Action bar | 40 | `FIRE [F]` (crimson outline, filled `crimson` when armed and allowed) and `ASSESS [A]` (cyan outline) side by side, 40 px high |
| ROE strip | 28 | Live checks: `CLASSIFIED ✓/✗   ZONE: CLEAR / URBAN ρ0.8 ✗   Q ✓/✗` |

Sum: 56 + 44 + 142 + 248 + 40 + 28 = 558; with five 6 px gaps = 588.

Effector row (46 px, 1 px border, **tier colour on the left edge**: tier 1 `phos` = RF soft-kill and laser; tier 2 `amber` = gun and interceptor; tier 3 `crimson` = missile):

```
┃ RF SOFT-KILL                         [Q]        ← 11 px Chakra Petch, keycap right
┃ ₹100        Pk 80%     ▕██░░░░░░▏ 1.52 km       ← cost, live Pk, envelope bar with range marker
┃ CER 0.001 EST                                    ← 10 px chip: ≤1 phos, ≤10 amber, >10 crimson + 'UNFAVOURABLE EXCHANGE'
```

Rules: a row is greyed with a one-word reason when blocked (`JAMMED`, `RANGE`, `Q LOW`, `PNR`). Cost uses Indian digit grouping via a hand-written `formatInr()` (no `Intl`). **Live CER is an estimate from the trainee's label**, using the nominal value of the class implied by the label (`HOSTILE_ATTACK` → FPV value, `HOSTILE_ISR` → recon quad value, `SWARM_ELEMENT` → swarm element value); with no label it reads `CER —`. The scored CER (AAR) always uses true value, which the console must never display.

### 2.7 Bottom bar — 110 px

Layout: filter row 16 px + 8 log lines × 11 px + 6 px padding = 110. Filter chips (10 px, 2 px radius tags): `ALL DET CLS ENG CHAOS MASK ROE`; toggles are instant. Log line (10 px/11 px JetBrains Mono, newest at the bottom):

```
T+012.350  DESIG   T-01 FIX
T+013.000  CLASS   T-01 HOSTILE_ATTACK
T+028.000  CHAOS   FOG ON  EO/IR REACH x0.25
T+030.100  MASK    T-01 ENTERED SHADOW U1
```

Timestamp 9 characters (`T+012.350`, always a multiple of 50 ms), code column 7 characters coloured by category (`DET` phos, `CLS` cyan, `ENG` crimson, `CHAOS` amber, `MASK` text-dim, `ROE` crimson). Lines come from `sim/oplog.ts` (operator-visible only; never ground truth).

---

## 3. Symbology (NATO-inspired, simplified)

This is **not** APP-6 / MIL-STD-2525 compliant and must never be described as such. Shape encodes affiliation, colour reinforces it, inner marks encode type. The symbol always shows the **trainee's label**, never ground truth.

| State | Shape (14×14 box, centred) | Colour | Inner mark |
| --- | --- | --- | --- |
| No label yet (`null`) | Dashed square | `amber` | `?` |
| `UNKNOWN_EVIDENCE_INSUFFICIENT` | Solid square, corner notch | `amber` | `?` and a hold-fire bar `—` below |
| `HOSTILE_ATTACK` | Diamond, 2 px stroke, 25% fill | `crimson` | none |
| `HOSTILE_ISR` | Diamond, 1.5 px stroke | `crimson` | horizontal bar |
| `SWARM_ELEMENT` | Diamond at 80% size | `crimson` | three dots in a row |
| `CIVIL_UAS` | Solid square | `phos` | centre dot |
| `BIRD` | Solid square | `phos` | `V` chevron |
| `FRIENDLY` | Circle | `cyan` | centre dot |

Overlays: selected = four `cyan` corner brackets at 18×18; designated = small `cyan` triangle above; coasting = symbol drawn dashed with an amber uncertainty circle of radius `σ`; PNR crossed = `crimson` cross through the symbol; velocity vector = 1 px line of `speed × 30 s` capped at 60 px.

```ts
// src/render/symbols.ts — Path2D definitions (units: px at 14×14 box)
export const P = {
  diamond: new Path2D('M0 -7 L7 0 L0 7 L-7 0 Z'),
  square:  new Path2D('M-6 -6 H6 V6 H-6 Z'),
  circle:  (() => { const p = new Path2D(); p.arc(0, 0, 6.5, 0, Math.PI * 2); return p; })(),
  bar:     new Path2D('M-3 0 H3'),
  chevron: new Path2D('M-3 -1 L0 2 L3 -1'),
  brackets: new Path2D('M-9 -5 V-9 H-5 M5 -9 H9 V-5 M9 5 V9 H5 M-5 9 H-9 V5'),
};
```

---

## 4. Sensor visualisation states (same 520×520 canvas in all modes)

Switching modes (keys 1/2/3) swaps the renderer instantly. Each mode draws only what its sensor could know.

### 4.1 Radar mode (key 1)

- **Frame:** padding 10 px, radius 250 px (50 px per km at 520 px; scale = `(size/2 − 10)/5000`). Range rings at 1–5 km (`phos-deep` 1 px, labels `phos-dim` 9 px Share Tech Mono at 45°). Bearing ticks every 10° (4 px), every 30° (8 px) with `000 030 … 330` labels inside the ring. Crosshair 1 px `phos-deep`. North up. Asset marker at the centre (`cyan` circle, `FOB ALPHA`) with a dashed `crimson` ring at `rMinM` (500 m = 25 px) labelled `PNR`.
- **Zones:** polygon with 1 px dashed outline and 8% diagonal hatch: URBAN `amber`, RIDGE `phos-dim` dotted, FOREST `phos-dim` dash-dot; label `U1 ρ0.8 H40` 9 px.
- **Sweep:** 1.5 px `phos` line at the sim angle plus a 40° trailing wedge (`createConicGradient`, alpha 0.18 → 0; fallback: 20 thin wedges). **Phosphor layer:** an offscreen canvas that fades with `destination-out` using `alpha = 1 − exp(−dt/1.2 s)`; raw plots are 3×3 px `phos-dim` squares written to it only when the beam paints them.
- **Tracks:** symbol per §3 at the interpolated position, label `T-01` (9 px, offset +10/−10), velocity vector.
- **Coasting:** dashed symbol, dashed `amber` circle of radius `σ`, label `COAST ±240m`.
- **EO pointing:** thin dotted `cyan` line from the centre along the EO camera azimuth.
- **Chaos:** RAIN = speckle clutter in `phos-deep` plus transient false plots (one sweep life) and banner `RAIN CLUTTER`; DROPOUT = sweep freezes, centre text `RADAR DROPOUT` (`crimson`), static ring. No other mode-specific text.

### 4.2 EO/IR mode (key 2) — layout inside the 520×520 canvas

```
┌──────────────────────────────────────┐  y 0
│  VIEWFINDER 520 × 372                │
│  top-left   EO DAY | IR NIGHT        │
│  top-right  FOV 30°  ZOOM x{z}       │
│  reticle, bracket corners, tick scale│
│  bottom-left AZ 052.3  EL +0.8       │
│  bottom-right RNG 3.28 km (LRF)      │
├───────────────┬──────────────────────┤  y 372
│ MINI-PPI      │ TELEMETRY 372 × 148  │
│ 148 × 148     │ az error, slew rate, │
│ 30° cone      │ clarity, haze, LOS   │
└───────────────┴──────────────────────┘  y 520
```

- **Palette:** day = flat sky band `#1B2A33` over ground band `#101A14`, horizon line `neutral-700`; night/IR = monochrome green-white ramp: background `#02130A`, hot targets up to `#D8FFE8`. HUD text `phos`.
- **Cone overlay:** the mini-PPI draws the 30° EO cone (`cyan` 15% fill, 1 px edge) and the 15° alignment tolerance.
- **Silhouette rendering:** vector shapes only (quad with four arms and spinning rotor discs, fixed-wing, bird with 6 Hz wing flap, `BLOB` for low clarity). Apparent size `lerp(18, 110, clarity)` px (digital zoom label `x{z}` shown). Shape appears at `clarity ≥ 0.35`, the payload (small rectangle under a quad) at `clarity ≥ 0.6`, both from `TrackEntity.evidence`.
- **Atmospheric degradation:** film grain from `renderRng`; fog = haze rectangle `#C9D1D9` at `0.55 × severity` alpha, silhouette ghosted with three offset low-alpha copies, clarity readout dropping. `NO LOS — MASKED` (static pattern) when the target is masked; `SLEWING — az error 38°` while the camera is out of tolerance (camera slews at 60°/s, visible as moving tick scale).
- **Reticle:** centre cross with 12 px gap, 4 corner brackets, range ticks; lock brackets turn `cyan` when aligned.

### 4.3 RF mode (key 3) — layout

```
┌──────────────────────────────────────┐  y 0
│  PPI 400 × 400 (38.4 px per km)      │  centred; DF lines + ±5° fan
├──────────────────────────────────────┤  y 400
│  WATERFALL 520 × 120                 │  scrolling, 8 rows/s (15 s history)
└──────────────────────────────────────┘  y 520
```

- **DF lines:** 1 px `phos` line from the asset along the measured bearing out to the 4 km reach (154 px), a ±5° translucent fan, label `T-01`. Bearing jitter comes from the sim (`sense` stream), so replays show identical jitter. Remote-ID emitters get a `cyan` line labelled `RID`.
- **Waterfall:** x-axis notional `0–1000 MHz` (caption `NOTIONAL SPECTRUM`); intensity ramp `base → phos-deep → phos-dim → phos`. Control links = persistent vertical traces in `phos`; Remote-ID = narrow `cyan` trace; each trace's x position is the emitter's `rfBin`. A new row is written every 125 ms into an `ImageData` ring buffer.
- **Jamming:** the whole waterfall fills with wideband `amber`/white speckle at ~70% density, caption `JAMMED`, DF lines vanish; the RF badge goes `BLIND`.
- **RF-silent targets** produce nothing; the panel shows `NO RF EMISSION` in the evidence row.

---

## 5. Screens and flow

`Home` (TRAIN, EVAL, AAR history, UNIT, CONFIG; five rectangular buttons, no illustrations) → `TraineeSelect` (callsign list, create callsign, unit) → `Briefing` (scenario name, ROE text, zone map preview, difficulty, mode; `START [Enter]`) → `Console` → `HotWash` → `AAR`.

**Hot-wash card** (centred 560×360 chamfered panel over a `base` 85% scrim, appears at `SESSION_END`): score (`hero` size), grade badge, six KPI rows (MDT, MET, accuracy, aggregate CER, leakers, ROE violations), `RED TEAM NEXT:` one line naming the sampled levers, buttons `AAR [Enter]` and `HOME [Esc]`.

**Config import screen:** file picker, validation result list, hash display, `ACTIVATE` / `REVERT TO DEFAULT`. Footer strip on Config and AAR (16 px): `NOTIONAL PARAMETERS — NOT FOR OPERATIONAL USE` (`amber`, 10 px).

---

## 6. AAR dashboard (1366×768)

Top bar as in the Console (mode tag shows the session's mode). Content area `768 − 45 = 723 px`:

| Region | Height | Notes |
| --- | --- | --- |
| Scorecard strip | 96 | below |
| Timeline | 200 | below |
| Gaps (2 × 8) | 16 | |
| Lower row | 411 | confusion matrix 400 px + spider 300 px + tabbed panel (remaining ≈ 650 px) |

### 6.1 Scorecard (96 px)

Left: session score at `hero` size (`phos`/`amber`/`crimson` by grade), `/100` dim. Badge (rectangular, 28 px high, 1 px border, Chakra Petch):

| Grade | Badge text | Colour | Result tag |
| --- | --- | --- | --- |
| Score ≥ 70 | `PROFICIENT IN SIMULATION` (plus a cyan `DISTINCTION` tag at ≥ 85) | `phos` | `PASS` |
| 50 – 69 | `DEVELOPING` | `amber` | `CONDITIONAL` |
| < 50 | `NEEDS RETRAINING` | `crimson` | `FAIL` |

Badge wording avoids implying any operational certification. Right: six KPI tiles of 104×60 px (label 10 px above value 18 px): `MDT`, `MET`, `ACC`, `CER`, `LEAKERS`, `ROE`. Tiles show `—` when undefined. A subtitle line shows mode, difficulty `d`, scenario seed or bench id, `configHash` short form, and `UNVERIFIED` when applicable.

### 6.2 Timeline scrubber (200 px)

Width: `1366 − 16 (padding) − 120 (lane labels) = 1230 px` for 120 s (≈10.25 px/s, 0.51 px per tick). Heights: ruler 20 + 5 lanes × 24 + controls 30 + padding 30 = 200.

| Lane | Marks |
| --- | --- |
| DETECTION | `▲` at `TRACK_INIT`, `▼` at `DESIGNATE`, a bracket between them labelled with MDT in ms |
| CLASSIFICATION | label commits, coloured by matrix score (≥ 60 `phos`, 20–59 `amber`, < 20 `crimson`); hollow when later changed |
| EFFECTOR FIRE | filled markers by tier colour at `ENGAGE`, `✓`/`✗` for the draw, `A` for assess; **ghost outline markers** for the oracle's earliest feasible time and effector |
| SENSOR CHAOS | bars by type (FOG, JAM, RAIN, DROPOUT) with `SENSOR_SWITCH` ticks and the SAL bracket |
| URBAN MASKING | one 6 px sub-lane per masked track showing `MASKED` intervals (hatched) |

Vertical dashed `crimson` lines mark each hostile's `PNR_CROSSED` with a `PNR T-01` tag. The playhead is a 1 px `cyan` line with a readout `T+041.250`. Controls: `⏮ ◀ ▶ ▶▶ ⏭`, speed `1× 4×`, keyboard `←/→` ±1 tick (50 ms), `Shift+←/→` ±1 s, `Space` play/pause, `Home/End`. Seeking uses the 100-tick snapshots, so dragging is smooth. Clicking a marker selects it and opens the **Decision card**.

### 6.3 Lower row

- **Cost-weighted confusion matrix (400×411):** 6 truth rows × 8 columns (7 labels + `NONE`), abbreviations `ATK ISR SWM CIV BRD FRN UNK NONE`; label column 60 px, cells 40×40, header 40 px. Cell text = count. Fill intensity ∝ count; diagonal `phos`, hostile→benign cells (false negatives) `crimson`, benign→hostile (false positives) `amber`, other `neutral-700`. Hover/focus shows `M[true][pred]` (the cost weight) in the strip beneath, plus per-row recall. A legend explains the colours.
- **Skill spider (300×411):** six axes `DETECT`, `CLASSIFY`, `ECON`, `ROE`, `SENSOR ADAPT`, `SWARM`; rings at 33/66/100 and a dashed ring at 70 (target). Session polygon `phos` (20% fill), EMA polygon `amber` dashed. Axes with no data show a hollow marker and `N/A`. Under it, the Red Team plan: three 11 px lines (`LEVERS: DETECTION, SENSOR_ADAPT`, `WHY: D EMA 54, SAL EMA 61`, `NEXT: TERRAIN-HUG, RF JAM`).
- **Tabbed panel (≈650×411):** tabs `SESSION | TREND | UNIT | DECISION`.
  - `SESSION`: track-results table, 22 px rows (ID, truth, label, D, C, G, R, S, flags).
  - `TREND`: per-metric lines (`phos`, `cyan`, `amber`, `crimson`, `text`, `phos-dim`), difficulty `d` as a dashed `cyan` line on the right axis, session index on x.
  - `UNIT`: EVAL sessions only; trainee × metric heatmap, leaderboard sorted by latest EVAL score with the highest TRAIN `d` reached beside it; `UNVERIFIED` rows greyed.
  - `DECISION`: for the selected marker: **what you knew** (label, `q`, `c_cls`, sensors seeing, time since `t_trk`) versus **what was true** (truth class, value, RF emission), your effector and its CER/`E_econ`/`E_time`, the oracle's effector, cost regret, flags.

All charts are custom canvas drawings in `src/ui/aar/charts/` using the same tokens; no chart library.

---

## 7. Interaction map

| Key | Action |
| --- | --- |
| `1` `2` `3` | Radar / EO-IR / RF view (EO auto-slews to the selected track) |
| `Tab` / `Shift+Tab` | Next / previous track (range order) |
| `Space` | Designate selected track (FIX) |
| `C` | Focus the class grid; arrows move, `Enter` commits the label, `Esc` cancels |
| `Q` `W` `E` `R` `T` | Arm RF soft-kill, laser, gun, interceptor, missile |
| `F` | Fire the armed effector at the selected track |
| `A` then `K` / `M` | Assess: declare KILL or MISS |
| `Esc` | Abort dialog (confirm with `Enter`) |

Mouse: click a track on the canvas or in the table to select; double-click designates. Focus ring: 1 px dashed `cyan` with 2 px offset. All controls are reachable by keyboard; minimum button height 28 px (FIRE and ASSESS 40 px).

---

## 8. Component kit (`src/ui/kit`)

| Component | Spec |
| --- | --- |
| `Panel` | `bg-panel border border-neutral-800`, no padding by default; header 24 px with chamfer `clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)`, bottom border, label `font-label text-xs uppercase tracking-[0.12em] text-text-dim`, two 6×6 corner ticks drawn with 1 px borders |
| `Tag` | `rounded-tag px-1 text-2xs font-mono uppercase border`; variants `solid` (colour fill, `base` text) and `outline` |
| `KeyCap` | `border border-neutral-700 px-1 text-2xs font-mono text-text-dim`, shows the hotkey |
| `Button` | 28 px high (or 40 px for FIRE/ASSESS), `border`, uppercase `font-label`, `KeyCap` at the right; active = colour fill with `base` text; disabled = `text-text-faint border-neutral-800` plus a one-word reason |
| `Gauge` | 6 px bar, `phos-deep` trough, `phos` fill, 1 px tick marks (e.g. `QMIN`) |
| `Stat` | 10 px label above, 14–18 px value below, units in `text-dim` |

---

## 9. Motion, accessibility and content rules

- **Functional motion only:** radar sweep, phosphor decay, rotor spin, bird flap, waterfall scroll, 1 Hz blink on `BLIND`, a 3 s `VIOLATION` flash on the ROE banner border. Nothing flashes faster than 2 Hz. With `prefers-reduced-motion`, blink and film grain are disabled; the sweep and waterfall remain because they are instrument readings.
- **Redundant encoding:** every colour-coded state has a shape or text (`NOM/DEG/BLIND`, symbol shapes, `COAST`, `PNR`).
- **Language:** operator shorthand, uppercase labels, units always shown (`km`, `m/s`, `ms`, `₹`). Error messages state the cause and the action (`FIRE BLOCKED: Q LOW (0.42 < 0.60)`).
- **Truthfulness in the UI:** parameters are labelled notional; no screen may say or imply certification, validation against real systems, or operational readiness.
- **Audio:** none required. Optional (P2): short synthesised WebAudio tones for sensor degradation and violations, generated in code, no audio files.

## 10. Reference rendering checklist (acceptance for TASK-P1-xx / P2-xx / P3-xx)

1. At 1366×768 no scrollbar appears on any screen; the radar is exactly 520×520.
2. Switching 1/2/3 changes the viewport in under one frame and never shifts any other panel.
3. A coasting track shows a dashed symbol, an uncertainty circle and `COAST ±Nm`.
4. The EO silhouette changes shape and size with clarity; fog visibly obscures it and drops the clarity readout.
5. Jamming saturates the waterfall, removes DF lines and turns the RF badge `BLIND` within 1 s.
6. No DOM element has a border radius above 2 px, a shadow, a gradient, or a banned colour.
7. Symbols show the trainee's label, and never ground truth.
8. The live CER on effector rows is marked `EST`; the true CER appears only in the AAR.
