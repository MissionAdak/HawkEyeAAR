# DRISHTI-CUAS (SIH PS 26247)
### AI-Enabled Drone & Counter-Drone Threat Simulation Trainer and AAR Engine

DRISHTI-CUAS is an air-gapped, offline 2D radar-console C-UAS (Counter-Unmanned Aerial Systems) tactical simulation trainer and After-Action Review (AAR) engine built for Ministry of Defence (MoD) / Defence Services Staff College (DSSC).

---

## Key Architectural Principles

1. **Zero-Server Rule:** 100% offline client capability. No `fetch`, `WebSocket`, or external network dependencies. Bundle includes production CSP `connect-src 'none'`.
2. **Deterministic Simulation:** Fixed 20 Hz timestep ($dt = 50\text{ ms}$) accumulator loop. Zero usage of `Math.random()` or `Date.now()` in simulation logic; all randomness is driven by seeded `mulberry32` PRNG streams.
3. **Native HTML5 Canvas 2D:** Clean 60 fps rendering on low-end integrated graphics (no PixiJS, WebGL, or Three.js).
4. **Canonical 7-Class Taxonomy:** Strict NATO-style symbology and classification matrix (`UNKNOWN_EVIDENCE_INSUFFICIENT`, `HOSTILE_ATTACK`, `HOSTILE_ISR`, `SWARM_ELEMENT`, `CIVIL_UAS`, `BIRD`, `FRIENDLY`).
5. **IndexedDB Local Persistence:** Dexie.js database recording millisecond-level `SimEvent` logs and 250 ms snapshots for event-sourced replay.

---

## Tech Stack

- **Framework:** React 19 + TypeScript (Strict)
- **Bundler:** Vite
- **Styling:** Tailwind CSS + Vanilla CSS (Tactical Carbon & Phosphor Palette)
- **State Management:** Zustand (ticking at 20 Hz, rendering Canvas at 60 fps)
- **Local Database:** Dexie.js (IndexedDB)
- **Validation:** Zod (Build-time config inlining)
- **Testing:** Vitest & Playwright

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Validate Config & Start Dev Server
```bash
npm run dev
```

### 3. Run Quality Gates & Tests
```bash
# Run ESLint guardrails (ZS-1, ZS-2, DT-2, DT-5 bans)
npm run lint

# Run Vitest test suite
npm run test

# Build production air-gapped bundle
npm run build
```

---

## Security & Disclaimer

`SYNTHETIC TRAINING AID | NOTIONAL PARAMETERS | NOT A CERTIFICATION`
All doctrine parameters (costs, envelopes, probabilities of kill, speeds) are notional configurable parameters managed in `public/config.json`.
