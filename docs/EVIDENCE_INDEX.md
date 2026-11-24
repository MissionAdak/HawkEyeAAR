# DRISHTI-CUAS: Master Evidence Index & Verification Artifacts

**SIH Problem Statement:** SIH26247  
**Project:** DRISHTI-CUAS  
**Repository:** `MissionAdak/HawkEyeAAR`  
**Development Branch:** `feature/optional-threejs-3d`  
**Baseline Verification Commit:** `feature freeze`

---

## Master Capability & Verification Matrix

This index maps every major functional, tactical, and architectural capability of DRISHTI-CUAS to its corresponding automated unit test, end-to-end acceptance spec, architectural rule, and verified output.

| Category | Capability / Requirement | Source Implementation | Verification Spec / Test | Verified Outcome / Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Multi-Sensor Fusion** | Radar, EO/IR azimuth frustum, RF bearing-only line, Alpha-Beta tracking filter | `src/sim/sensor.ts`<br>`src/sim/tracker.ts` | `tests/unit/sensors.spec.ts`<br>`tests/unit/tracker.spec.ts` | **PASS** — Sensor noise injected; tracker updates estimates without accessing truth physics. |
| **2. Zero Truth Leakage** | Presentation layers receive only `SafeTrackView`; zero access to ground truth `TrackEntity` | `src/ui/Console.tsx`<br>`src/render3d/renderer3d.ts` | `tests/unit/zeroTruthLeakage.spec.ts`<br>`tests/e2e/airgap_security.spec.ts` | **PASS** — Ground truth fields are stripped before UI/3D consumption. Verified via unit audit. |
| **3. F2T2EA Doctrine** | State machine: Find $\to$ Fix $\to$ Track $\to$ Target $\to$ Engage $\to$ Assess with $Q_{\min}$ demotion | `src/sim/roe.ts`<br>`src/sim/engine.ts` | `tests/unit/f2t2ea.spec.ts`<br>`tests/unit/roe.spec.ts` | **PASS** — Invalid state transitions blocked. Track quality drops below 0.6 trigger demotion to FIX. |
| **4. Rules of Engagement** | Hard blocks (PNR, out of envelope, inactive target) and Soft gates (collateral, dense zone, ROE text) | `src/sim/roe.ts`<br>`src/sim/effector.ts` | `tests/unit/roe.spec.ts` | **PASS** — Out-of-envelope fire blocked; dense urban zone collateral warnings logged. |
| **5. 2D Canvas Baseline** | Primary tactical Radar PPI, 60 FPS Canvas rendering, zero WebGL/GPU hardware dependency | `src/ui/radar/RadarView.tsx`<br>`src/ui/radar/` | `tests/unit/radarCoverage.spec.ts`<br>`tests/e2e/sim_fidelity_test.spec.ts` | **PASS** — Full operational capability without 3D loaded or WebGL2 enabled. |
| **6. Optional 3D Viewport** | Procedural terrain elevation, sensor domes, line-of-sight frustums, camera presets | `src/render3d/` | `tests/unit/task22Render3dAcceptance.spec.ts`<br>`tests/unit/terrainSampling.spec.ts` | **PASS** — Realistic tactical 3D viewport rendered via Three.js with correct coordinate transforms. |
| **7. 2D/3D Simulation Parity** | Identical simulation clock, bit-identical state hashes, identical event logs and follow-on RNG draws | `src/sim/engine.ts`<br>`src/ui/Console.tsx` | `tests/unit/task24RendererParityLifecycle.spec.ts` | **PASS** — 2D and 3D sessions yield bit-identical state hashes at checkpoints (50, 100, 150, 200) and identical `ENGAGE_RESULT` RNG payloads. |
| **8. Production Bundle Acceptance** | Initial entry JS < 700 kB raw, Three.js chunk partitioned, total dist < 2.0 MB | `vite.config.ts` | `tests/unit/task25BundleAcceptance.spec.ts` | **PASS** — Dist size 1.786 MB (budget 2.0 MB); Three.js in lazy chunk `render3d-*.js`; initial JS 671 kB. |
| **9. Hardware Fault Resilience** | WebGL2 probe, dynamic chunk load timeout (3000ms), context-loss teardown, 2D fallback | `src/render3d/capability.ts`<br>`src/ui/Console.tsx` | `tests/unit/task24RendererParityLifecycle.spec.ts`<br>`tests/e2e/task25_performanceResourceAcceptance.spec.ts` | **PASS** — WebGL context loss triggers automatic teardown, zero memory leaks, and seamless 2D restoration. |
| **10. Post-Mission AAR** | Composite scoring (0–100), F2T2EA timelines, confusion matrix, Cost-Exchange Ratio (CER) | `src/sim/metrics.ts`<br>`src/ui/aar/` | `tests/unit/metrics.spec.ts`<br>`tests/unit/task24RendererParityLifecycle.spec.ts` | **PASS** — Full mathematical evaluation with identical scores across 2D and 3D presentations. |
| **11. Truth vs Estimate Replay** | Visual replay showing true trajectory vs noisy estimated track with spatial error bounds | `src/ui/aar/ReplayView.tsx` | `tests/unit/task24RendererParityLifecycle.spec.ts` | **PASS** — Ground truth exposed strictly in AAR review mode for training evaluation. |
| **12. Offline Air-Gap Security** | Zero external HTTP requests, strict CSP (`default-src 'self'; connect-src 'none'`), inlined fonts | `index.html`<br>`vite.config.ts` | `tests/e2e/airgap_security.spec.ts`<br>`tests/e2e/task25_performanceResourceAcceptance.spec.ts` | **PASS** — 0 network requests observed; CSP header & meta tag enforced. |
| **13. IndexedDB Durability** | Local session storage, historical trend analysis, unit readiness tiering | `src/db/` | `tests/unit/recorder.spec.ts`<br>`tests/unit/sessionRepo.spec.ts` | **PASS** — Sessions stored durably in IndexedDB (`Dexie.js`); persists across restarts without server. |

---

## Detailed Acceptance Artifacts Reference

### Bundle Accounting (TASK 25-B Audit)
- **Total `dist/` Size:** 1,872,325 bytes (1.786 MB) — strictly below 2,097,152 bytes (2.0 MB budget).
- **Initial 2D Entry JS:** `assets/index-*.js` (671.18 kB raw, 203.94 kB gzip, 173.39 kB brotli).
- **Optional Three.js Vendor Chunk:** `assets/render3d-*.js` (513.44 kB raw, 130.92 kB gzip, 107.15 kB brotli).
- **Optional 3D Application Chunk:** `assets/render3d-index-*.js` (123.38 kB raw, 36.32 kB gzip).
- **Entry `index.html` Isolation:** Does NOT contain preloads or eager script tags for `render3d` or `three`.

### Parity & Determinism Accounting (TASK 24-A & TASK 26-A Audit)
- **Authoritative Hash Checkpoints (Ticks 50, 100, 150, 200):** Bit-identical SHA-256 hashes between pure Canvas 2D session and 3D Viewport presentation session.
- **RNG Synchronization:** `ENGAGE` and `ENGAGE_RESULT` events emitted by follow-on fire actions match identically with exact uniform random draw `u`, probability of kill `pk`, and boolean `killed`.
- **AAR Metric Invariance:** Composite score, grades (D, C, G, R), timing metrics, and confusion matrix are 100% identical between 2D and 3D presentations.

### Lifecycle & Resource Disposal Accounting (TASK 24-D Audit)
- **10-Cycle Real Renderer Stress Test:** 10 consecutive constructor-mount-update-dispose cycles executed.
- **Scene Geometry & Material Disposal:** Buffer geometries, materials, and textures allocated by Three.js scene are cleanly disposed (> 50 geometries and > 50 materials disposed over 10 cycles).
- **Listener Teardown:** All canvas listeners and renderer-owned window listeners (`keydown`) are detached after `dispose()`, preventing memory retention.
- **Animation Frame Cleanup:** Scheduled animation frames are cancelled on `stop()` and `dispose()`, leaving 0 active frame requests.

### Context-Loss Recovery Accounting (TASK 24-C & TASK 25-E Audit)
- **Synthetic Context Loss Handling:** Canvas `webglcontextlost` event default is prevented (`preventDefault()`), animation loop cancelled, GPU resources disposed, and `Console.tsx` seamlessly restores the Canvas 2D view.
- **Stale Instance Protection:** Dead `Renderer3D` instance is dereferenced and marked `disposed = true`, preventing any subsequent interaction from reusing invalid WebGL state.
