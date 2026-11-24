# DRISHTI-CUAS: Judge Demonstration & Evaluation Guide

**Smart India Hackathon (SIH) Problem Statement:** SIH26247  
**Project:** DRISHTI-CUAS (Drone Reconnaissance & Interception Simulation with Holistic Tracking Intelligence — Counter-Unmanned Aerial System)  
**Repository:** `MissionAdak/HawkEyeAAR`  
**Development Branch:** `feature/optional-threejs-3d`  
**Deployment Target:** Air-Gapped / Tactical Offline C2 Terminal  

---

## 1. Executive Overview & Technical Value Proposition

DRISHTI-CUAS is an air-gapped, offline-first tactical Counter-UAS command-and-control simulation and After Action Review (AAR) platform. Built to address SIH problem statement SIH26247, the system trains air defense operators in multi-sensor threat evaluation, F2T2EA doctrine adherence, and Rules of Engagement (ROE) decision-making.

### Architectural Core Principles
1. **Permanent Canvas 2D Baseline:** The primary tactical radar PPI and situational display runs on a native HTML5 2D Canvas, ensuring 100% operation even on constrained or low-spec military hardware without dedicated GPU acceleration.
2. **Optional Three.js 3D Presentation Layer:** A rich, interactive 3D tactical viewport with procedural terrain elevation, sensor coverage domes, line-of-sight frustums, and camera presets is partitioned into a lazy-loaded chunk that loads on demand with a strict 3-second timeout guard.
3. **Zero Truth Leakage Principle:** Presentation layers (2D and 3D) receive only filtered, noisy tracker outputs (`SafeTrackView`), completely decoupled from authoritative truth physics (`TrackEntity`).
4. **Authoritative Simulation Invariance:** The simulation engine runs at a fixed 50ms timestep (20 Hz) with seeded PRNG (`mulberry32`). Switching between 2D and 3D does not pause, restart, or alter the simulation trajectory, scoring, or event log.
5. **Fail-Closed Air-Gap Security:** Zero external network calls. Strict Content Security Policy (`default-src 'self'; connect-src 'none'`) enforces physical air-gap integrity.

---

## 2. Recommended 5-to-7 Minute Judge Demonstration Script

| Step | Time | Screen / Action | What to Demonstrate & Explain | Key Technical Proof |
| :--- | :--- | :--- | :--- | :--- |
| **1. Cold Start & Air-Gap** | 0:00–0:45 | Browser DevTools Network tab + Launch application | Launch `npm run preview` or open local build. Demonstrate that 0 network requests leave localhost. Point out Content Security Policy (`connect-src 'none'`). Highlight initial bundle < 700 kB raw without Three.js. | Initial bundle does NOT contain Three.js. Network tab completely idle after load. |
| **2. 2D Radar PPI Tactical Command** | 0:45–2:00 | Tactical Radar Screen (Canvas 2D) | Load scenario `DEMO-1`. Point out the 20 Hz simulation clock. Show incoming radar blips. Demonstrate operator workflow: **Select Track**, **Designate (F2)**, **Classify (T2)**, **Select Effector (T3)**, **Engage (E)**. | F2T2EA state machine enforcement. Track quality ($Q$) gating. Sensor coverage models (Radar, EO/IR, RF). |
| **3. 3D Tactical Viewport Transition** | 2:00–3:15 | Click "3D Viewport" Toggle Button | Click "3D Viewport". Point out instant lazy chunk load (network inspector shows single local chunk fetch < 520 kB). Show tactical terrain, coverage domes, Line-of-Sight rays, and camera presets (Top-Down, 45° Tactical, Chaser). | Three.js loaded strictly on demand. 2D and 3D share the identical running `SimEngine` instance. Zero dropped ticks. |
| **4. 2D/3D Live Switching Continuity** | 3:15–4:00 | Toggle 3D $\leftrightarrow$ 2D multiple times while simulation runs | Rapidly switch between 2D and 3D. Highlight that simulation clock, entity coordinates, active designations, and scores do not reset or jump. | Automated unit & E2E verification proves bit-identical state hashes across presentation switches. |
| **5. Hardware Fault & Context Loss Fallback** | 4:00–4:45 | Trigger synthetic WebGL context loss or simulate unsupported WebGL2 | Show failover banner: *"WebGL2 context lost. Restored 2D Canvas baseline."* Show that simulation continues uninterrupted on the Canvas 2D fallback. | Production `attachContextLossHandler` cancels event, disposes GPU resources, and restores 2D baseline. |
| **6. Post-Mission AAR Evaluation** | 4:45–6:00 | Finish scenario or click "View AAR" | Show Post-Mission After Action Review: Composite readiness score (0–100), F2T2EA phase timelines, Confusion Matrix (classification accuracy), Cost-Exchange Ratio (CER), and Truth vs Estimate Replay. | Full mathematical evaluation. Visual replay showing noisy estimated track overlaid on ground truth. |
| **7. Unit Readiness & Persistence** | 6:00–7:00 | Navigate to Unit Readiness / Leaderboard | Show historical trend graphs and readiness tiers stored durably in IndexedDB (`Dexie.js`). Fully offline local storage. | Zero server database required; persistent tactical readiness tracking. |

---

## 3. Deep Technical Differentiators

### A. Authoritative Simulation vs Presentation Layer Decoupling
* **The Truth vs Filtered View Barrier:** Ground truth entities (`TrackEntity`) hold true coordinates, velocity, RCS, and drone types. Sensor models inject Gaussian noise, probability-of-detection ($P_d$) rollouts, masking, and radar clutter. The tracking filter ($\alpha\text{--}\beta$ estimator) updates `TrackEstimate`.
* **Safe Track Projection:** Both the 2D Canvas renderer and 3D Three.js renderer receive strictly `SafeTrackView`, containing only estimated range, bearing, speed, and uncertainty bounds. Ground truth is only revealed in the post-mission AAR screen.

### B. Dynamic Lazy-Loading Architecture
* **Budget Isolation:** The baseline application bundle is strictly under 700 kB (raw). Three.js (0.173.0) and all 3D modules are partitioned into `assets/render3d-*.js` (513 kB raw, ~130 kB gzip).
* **Guarded Import with Fail-Closed Timeout:** Dynamic import is wrapped in `loadRender3DModuleWithTimeout` with a 3000ms deadline (Rule R10.6). If the import hangs or fails, the promise rejects safely and the UI retains the 2D Canvas.

### C. Rigorous Determinism
* Both 2D and 3D sessions run with identical initial seeds (`mulberry32` PRNG).
* The authoritative state hash (`computeAuthoritativeStateHash`) serializes the full canonical `ScenarioSpec`, simulation clock, event sequence, sensor health, entity kinematics, tracker estimates, RF measurements, and input queue. Hashes match bit-for-bit across 2D and 3D runs.

---

## 4. Hardware Fault Injection & Recovery Scenarios

| Fault Injected | Trigger Mechanism | System Response | Verification Method |
| :--- | :--- | :--- | :--- |
| **WebGL2 Unsupported** | Device lacks WebGL2 driver or GPU support | `checkWebGL2Support()` returns `{ supported: false }`. 3D toggle disabled or immediately falls back to 2D Canvas. | Unit test: `Case A — Missing WebGL2` |
| **Dynamic Chunk Fetch Error** | Network drops or chunk corrupted | `loadRender3DModuleWithTimeout` catches error. Displays operator warning toast. Simulation continues in 2D. | Unit test: `Case B — Dynamic import failure` |
| **Constructor Allocation Failure** | GPU out of memory during WebGL context creation | Constructor `try...catch` disposes partial allocations and rethrows cleanly. UI retains 2D mode. | Unit test: `Case C — Renderer initialization failure` |
| **GPU Context Loss** | Driver crash, display switch, or OS memory reclaim | Canvas `webglcontextlost` triggers `attachContextLossHandler`. Cancels animation loop, disposes scene objects, clears renderer ref, switches UI to 2D Canvas. | Unit test: `Case D — WebGL Context Loss Teardown` + E2E Playwright test |
| **Chunk Load Timeout** | Storage/I/O stall exceeding 3000ms | Promise timer rejects after 3000ms (Rule R10.6). Prevents late-mounted zombie instances. | Unit test: `Case E — Three-second lazy chunk timeout` |

---

## 5. Judge Q&A Cheat Sheet (Anticipated Tough Technical Questions)

### Q1: "Why not use Three.js for everything? Why maintain a 2D Canvas renderer?"
**Answer:** In military C2 and defense installations, terminal hardware ranges from ruggedized field tablets to legacy command consoles without dedicated GPU acceleration. Canvas 2D guarantees deterministic, lightweight 60 FPS operation under any hardware environment with zero external dependencies. Three.js is an optional tactical enhancement, never a hard operational requirement.

### Q2: "How do you guarantee that switching to 3D doesn't alter trainee scores or simulation outcomes?"
**Answer:** The simulation engine (`SimEngine`) is completely decoupled from the rendering loop. Rendering loops only read `SafeTrackView` snapshots. The authoritative simulation advances in discrete 50ms ticks driven by `requestAnimationFrame` timing or fixed-rate stepping. In automated unit tests (`task24RendererParityLifecycle.spec.ts`), bit-identical state hashes and identical follow-on `killRng` draws (`ENGAGE` and `ENGAGE_RESULT` events) prove zero side effects from 3D rendering.

### Q3: "What happens if an operator's browser loses WebGL context in the middle of a high-stress engagement?"
**Answer:** The system implements automated failover: `webglcontextlost` cancels default browser behavior, executes complete scene and resource disposal, and switches the UI view to the 2D Canvas baseline within a single frame. The simulation state, track designations, and active weapon engagements remain completely intact.

### Q4: "How do you prove that your application is truly air-gapped?"
**Answer:**
1. Content Security Policy contains `connect-src 'none'`, blocking all `fetch`, `XMLHttpRequest`, and `WebSocket` calls.
2. All fonts (`Chakra Petch`, `JetBrains Mono`, `Share Tech Mono`) and configuration files are bundled locally as static assets.
3. Automated Playwright E2E tests (`airgap_security.spec.ts` and `task25_performanceResourceAcceptance.spec.ts`) monitor every network request and assert that zero external requests occur during operation.

---

## 6. Honest Technical Disclosures & Known Limitations

In the interest of engineering integrity and transparent defense evaluation:
1. **Headless WebGL Execution:** Headless browser environments (e.g., Linux CI, GitHub Actions, or headless Chrome) utilize software WebGL implementations (such as SwiftShader) that do not expose physical GPU driver VRAM registers. GPU resource cleanup is therefore rigorously proven via Three.js resource object disposal (`BufferGeometry.dispose()`, `Material.dispose()`, `Texture.dispose()`) and event listener teardown rather than hardware VRAM metrics.
2. **Frame Callback Cadence vs Physical Display Refresh:** Browser `requestAnimationFrame` callback cadence reflects software execution scheduling rather than native physical monitor sync when executing in headless test environments.
3. **Wall-Clock Timing Tolerance:** Under headless execution and OS process scheduling, wall-clock timing exhibits jitter ($7\text{--}14\text{ ticks}$ over 500ms). The authoritative simulation timestep, however, remains strictly invariant at 50ms (20 Hz).
4. **Synthetic Context Loss:** WebGL context loss is tested programmatically via synthetic `webglcontextlost` events dispatch, which triggers the exact production handler attached to the canvas.

---

## 7. Quick-Reference Command Cheat Sheet

```bash
# 1. Start production preview server (offline, air-gapped simulation)
npm run preview

# 2. Run unit tests including 2D/3D parity and bundle acceptance
npm test

# 3. Run full end-to-end acceptance suite (headless Chromium)
npm run test:e2e

# 4. Check TypeScript types and ESLint
npx tsc --noEmit && npm run lint
```
