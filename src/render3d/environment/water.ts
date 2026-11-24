import * as THREE from 'three';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './types';
import { resolveRandomBiome } from './descriptor';
import { getForestRiverElevation } from './terrain';

export const SPECTRUM_RIVER_POINTS: Array<{ x: number; z: number }> = [
  { x: -800, z: 4600 },
  { x: -1200, z: 3200 },
  { x: -1600, z: 1800 },
  { x: -1400, z: 500 },
  { x: -1700, z: -900 },
  { x: -2300, z: -2200 },
  { x: -1800, z: -3500 },
  { x: 400, z: -4300 },
  { x: 2600, z: -4700 },
];

// Tactical military water palette
const COLOR_DEEP_OCEAN = 0x0284c7; // Vibrant cerulean oceanic water
const COLOR_ALPINE_LAKE = 0x0ea5e9;
const COLOR_RESERVOIR_WATER = 0x1e3a5f;
const COLOR_CANAL_WATER = 0x164e63;
const COLOR_BEACH_SAND = 0xdda15e; // Warm golden tropical yellow beach sand
const COLOR_RIVERBANK = 0x64748b; // Natural slate granite river stone shoreline
const COLOR_ROCKY_SHORE = 0x52525b;
const COLOR_CONCRETE_WALL = 0x475569;
const COLOR_BRIDGE_DECK = 0x1e293b;

export type WaterFeatureType =
  | 'OCEAN'
  | 'COASTLINE'
  | 'BEACH'
  | 'LAKE'
  | 'RIVER'
  | 'RESERVOIR'
  | 'DRAINAGE_CHANNEL';

export interface WaterFeatureSpec {
  id: string;
  name: string;
  type: WaterFeatureType;
  position?: { x: number; y: number; z: number };
  width?: number;
  length?: number;
  radiusX?: number;
  radiusZ?: number;
  elevationY?: number;
  points?: Array<{ x: number; z: number }>;
  description?: string;
}

export interface WaterBuildResult {
  group: THREE.Group;
  objects: EnvironmentObjectInfo[];
  selectableMeshes: THREE.Object3D[];
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures?: THREE.Texture[];
  };
  update?: (simMs: number) => void;
}

/**
 * Creates dynamic procedural river current & foam flow texture (100% in-memory DataTexture).
 * Operates in all environments including headless unit tests without DOM/Canvas dependencies.
 */
function createRiverFlowTexture(): THREE.Texture {
  const width = 256;
  const height = 256;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Base river water color: deep rich vibrant azure/cobalt blue
      let r = 24;
      let g = 115;
      let b = 225;

      // Longitudinal current streams and eddies flowing along Y axis
      const flowWobble = Math.sin(y * 0.12) * 12 + Math.cos(y * 0.05) * 6;
      const streak1 = Math.sin((x + flowWobble) * 0.22);
      const streak2 = Math.cos((x - flowWobble * 0.5) * 0.45 + y * 0.08);
      const currentIntensity = (streak1 + streak2) * 0.5;

      // Surface ripples and foam crests
      const ripple = Math.sin(x * 0.35 + y * 0.28) * Math.cos(x * 0.18 - y * 0.45);

      if (currentIntensity > 0.25) {
        // Vivid turquoise / bright cyan flow streams
        r = 38;
        g = 210;
        b = 250;
      }
      if (ripple > 0.32) {
        // Bright white-water foam crests and bubbling rapids
        r = 245;
        g = 252;
        b = 255;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255; // 100% opaque water to prevent dark terrain bleed-through
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 75);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds continuous procedural river mesh along 2D centerline waypoints.
 * Conforms cleanly to terrain with dynamic flowing water currents and surface waves.
 */
function buildWindingRiver(
  points: Array<{ x: number; z: number }>,
  riverWidth: number,
  elevationY: number,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  textures: THREE.Texture[]
): { waterMesh: THREE.Mesh; bankMesh: THREE.Mesh; updateFlow: (simMs: number) => void } {
  const n = points.length;
  const segments = (n - 1) * 8; // interpolate 8 sub-segments between waypoints

  // Catmull-Rom spline interpolation along centerline
  const vPoints = points.map((p) => new THREE.Vector2(p.x, p.z));
  const curve = new THREE.SplineCurve(vPoints);
  const samplePoints = curve.getPoints(segments);

  const waterPositions: number[] = [];
  const waterNormals: number[] = [];
  const waterUvs: number[] = [];
  const waterIndices: number[] = [];

  const bankPositions: number[] = [];
  const bankIndices: number[] = [];

  const halfW = riverWidth / 2;
  const bankW = riverWidth * 0.28; // sloping pebble bank on each side

  for (let i = 0; i <= segments; i++) {
    const pt = samplePoints[i];
    // Tangent direction
    const tNext = samplePoints[Math.min(segments, i + 1)];
    const tPrev = samplePoints[Math.max(0, i - 1)];
    const tangent = new THREE.Vector2().subVectors(tNext, tPrev).normalize();
    const normal = new THREE.Vector2(-tangent.y, tangent.x); // perpendicular normal

    // Water surface left and right vertices
    const leftX = pt.x + normal.x * halfW;
    const leftZ = pt.y + normal.y * halfW;
    const rightX = pt.x - normal.x * halfW;
    const rightZ = pt.y - normal.y * halfW;

    // Water quad vertices (elevationY)
    const idxWater = waterPositions.length / 3;
    waterPositions.push(leftX, elevationY, leftZ);
    waterPositions.push(rightX, elevationY, rightZ);

    waterNormals.push(0, 1, 0, 0, 1, 0);
    const u = i / segments;
    waterUvs.push(0, u, 1, u);

    if (i < segments) {
      // Counter-clockwise winding order facing upwards (+Y) toward the camera
      waterIndices.push(idxWater, idxWater + 2, idxWater + 1);
      waterIndices.push(idxWater + 1, idxWater + 2, idxWater + 3);
    }

    // Outer bank vertices (rise slightly to seamlessly merge into terrain)
    const outLeftX = pt.x + normal.x * (halfW + bankW);
    const outLeftZ = pt.y + normal.y * (halfW + bankW);
    const outRightX = pt.x - normal.x * (halfW + bankW);
    const outRightZ = pt.y - normal.y * (halfW + bankW);

    const idxBank = bankPositions.length / 3;
    // Left bank: from water edge to outer bank
    bankPositions.push(leftX, elevationY, leftZ);
    bankPositions.push(outLeftX, elevationY + 0.8, outLeftZ);
    // Right bank: from water edge to outer bank
    bankPositions.push(rightX, elevationY, rightZ);
    bankPositions.push(outRightX, elevationY + 0.8, outRightZ);

    if (i < segments) {
      // Left bank quad
      bankIndices.push(idxBank, idxBank + 1, idxBank + 4);
      bankIndices.push(idxBank + 1, idxBank + 5, idxBank + 4);
      // Right bank quad
      bankIndices.push(idxBank + 2, idxBank + 6, idxBank + 3);
      bankIndices.push(idxBank + 3, idxBank + 6, idxBank + 7);
    }
  }

  // Base positions for dynamic wave displacement
  const baseWaterPositions = new Float32Array(waterPositions);

  // Water BufferGeometry
  const waterGeom = new THREE.BufferGeometry();
  waterGeom.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
  waterGeom.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
  waterGeom.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
  waterGeom.setIndex(waterIndices);
  geometries.push(waterGeom);

  // Procedural flowing river water current texture
  const flowTexture = createRiverFlowTexture();
  textures.push(flowTexture);

  const waterMat = new THREE.MeshLambertMaterial({
    map: flowTexture,
    color: 0xffffff, // Pure white color ensures texture's rich azure and foam colors are 100% visible
    side: THREE.DoubleSide, // Ensure visibility from all view angles without back-face culling
    transparent: false,
    flatShading: false,
  });
  materials.push(waterMat);
  const waterMesh = new THREE.Mesh(waterGeom, waterMat);
  group.add(waterMesh);

  // Bank BufferGeometry
  const bankGeom = new THREE.BufferGeometry();
  bankGeom.setAttribute('position', new THREE.Float32BufferAttribute(bankPositions, 3));
  bankGeom.computeVertexNormals();
  bankGeom.setIndex(bankIndices);
  geometries.push(bankGeom);

  const bankMat = new THREE.MeshLambertMaterial({
    color: COLOR_RIVERBANK,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  materials.push(bankMat);
  const bankMesh = new THREE.Mesh(bankGeom, bankMat);
  group.add(bankMesh);

  // Dynamic river flow animation updater:
  // 1. Scrolls flow texture downstream along the winding river continuously
  // 2. Displaces water vertices creating realistic surface wave undulations
  const updateFlow = (simMs: number) => {
    // Smooth downstream river current scrolling using authoritative simMs
    flowTexture.offset.y = -(simMs * 0.0006) % 1.0;

    const posAttr = waterGeom.attributes.position as THREE.BufferAttribute;
    if (!posAttr) return;
    const t = simMs * 0.003;
    for (let s = 0; s <= segments; s++) {
      const idxLeft = s * 2;
      const idxRight = s * 2 + 1;
      const wave1 = Math.sin(s * 0.5 - t * 3.0) * 0.28;
      const wave2 = Math.cos(s * 1.1 + t * 2.0) * 0.14;
      const dy = wave1 + wave2;
      posAttr.setY(idxLeft, baseWaterPositions[idxLeft * 3 + 1] + dy);
      posAttr.setY(idxRight, baseWaterPositions[idxRight * 3 + 1] + dy);
    }
    posAttr.needsUpdate = true;
    waterGeom.computeVertexNormals();
  };

  return { waterMesh, bankMesh, updateFlow };
}

/**
 * Builds realistic paved asphalt roads that closely conform to ground surface elevation.
 */
function buildPavedRoad(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  widthM: number,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const totalLen = Math.hypot(dx, dz);
  if (totalLen < 1) return;

  const stepSize = 100;
  const steps = Math.ceil(totalLen / stepSize);
  const heading = Math.atan2(dx, dz);

  const roadMat = new THREE.MeshLambertMaterial({ color: 0x242a32, flatShading: true });
  const shoulderMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  materials.push(roadMat, shoulderMat, stripeMat);

  for (let s = 0; s < steps; s++) {
    const tStart = s / steps;
    const tEnd = (s + 1) / steps;
    const tMid = (tStart + tEnd) / 2;

    const sx = x1 + dx * tMid;
    const sz = z1 + dz * tMid;
    const len = totalLen / steps;

    // Conforms cleanly to ground elevation (sitting slightly above ground mesh at Y = -1.0)
    const elev = getForestRiverElevation(sx, -sz);
    const roadY = elev - 0.85;

    // Road asphalt slab
    const slabGeom = new THREE.BoxGeometry(widthM, 0.25, len);
    geometries.push(slabGeom);
    const slabMesh = new THREE.Mesh(slabGeom, roadMat);
    slabMesh.position.set(sx, roadY, sz);
    slabMesh.rotation.y = heading;
    group.add(slabMesh);

    // Shoulder gravel verges
    const shoulderGeom = new THREE.BoxGeometry(widthM + 3.6, 0.15, len);
    geometries.push(shoulderGeom);
    const shoulderMesh = new THREE.Mesh(shoulderGeom, shoulderMat);
    shoulderMesh.position.set(sx, roadY - 0.05, sz);
    shoulderMesh.rotation.y = heading;
    group.add(shoulderMesh);

    // White dashed road centerline
    if (s % 2 === 0) {
      const stripeGeom = new THREE.PlaneGeometry(0.5, len * 0.65);
      stripeGeom.rotateX(-Math.PI / 2);
      geometries.push(stripeGeom);
      const stripeMesh = new THREE.Mesh(stripeGeom, stripeMat);
      stripeMesh.position.set(sx, roadY + 0.14, sz);
      stripeMesh.rotation.y = heading;
      group.add(stripeMesh);
    }
  }
}

/**
 * Builds realistic tactical highway bridge spanning the river corridor:
 * Paved road deck, painted double-yellow lane divider, concrete abutments,
 * riverbed piers, crash barriers, steel truss towers with suspension cables, and approach ramps.
 */
function buildTacticalHighwayBridge(
  xCenter: number,
  zCenter: number,
  spanM: number,
  widthM: number,
  headingRad: number,
  bridgeId: string,
  bridgeName: string,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  registerFeature: (
    id: string,
    name: string,
    type: WaterFeatureType,
    pos: { x: number; y: number; z: number },
    mesh: THREE.Object3D,
    desc: string
  ) => void
): void {
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(xCenter, 1.2, zCenter);
  bridgeGroup.rotation.y = headingRad;

  // 1. Reinforced concrete & asphalt bridge deck
  const deckGeom = new THREE.BoxGeometry(spanM, 1.6, widthM);
  geometries.push(deckGeom);
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  materials.push(deckMat);
  const deckMesh = new THREE.Mesh(deckGeom, deckMat);
  bridgeGroup.add(deckMesh);

  // Road lane markings on bridge deck
  const lineMatYellow = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const lineMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
  materials.push(lineMatYellow, lineMatWhite);

  // Double yellow center divider lines
  const centerLineGeom = new THREE.PlaneGeometry(spanM - 4, 0.35);
  centerLineGeom.rotateX(-Math.PI / 2);
  geometries.push(centerLineGeom);
  const centerLineLeft = new THREE.Mesh(centerLineGeom, lineMatYellow);
  centerLineLeft.position.set(0, 0.82, -0.3);
  const centerLineRight = new THREE.Mesh(centerLineGeom, lineMatYellow);
  centerLineRight.position.set(0, 0.82, 0.3);
  bridgeGroup.add(centerLineLeft, centerLineRight);

  // White fog shoulder lines
  const edgeLineGeom = new THREE.PlaneGeometry(spanM - 4, 0.4);
  edgeLineGeom.rotateX(-Math.PI / 2);
  geometries.push(edgeLineGeom);
  const leftEdgeLine = new THREE.Mesh(edgeLineGeom, lineMatWhite);
  leftEdgeLine.position.set(0, 0.82, -widthM / 2 + 1.2);
  const rightEdgeLine = new THREE.Mesh(edgeLineGeom, lineMatWhite);
  rightEdgeLine.position.set(0, 0.82, widthM / 2 - 1.2);
  bridgeGroup.add(leftEdgeLine, rightEdgeLine);

  // 2. Concrete crash barriers & safety guardrails
  const barrierGeom = new THREE.BoxGeometry(spanM, 1.2, 0.6);
  geometries.push(barrierGeom);
  const barrierMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
  materials.push(barrierMat);

  const leftBarrier = new THREE.Mesh(barrierGeom, barrierMat);
  leftBarrier.position.set(0, 1.2, -widthM / 2 + 0.35);
  const rightBarrier = new THREE.Mesh(barrierGeom, barrierMat);
  rightBarrier.position.set(0, 1.2, widthM / 2 - 0.35);
  bridgeGroup.add(leftBarrier, rightBarrier);

  // Steel top handrails
  const handrailGeom = new THREE.BoxGeometry(spanM, 0.18, 0.18);
  geometries.push(handrailGeom);
  const handrailMat = new THREE.MeshBasicMaterial({ color: 0xcfd8dc });
  materials.push(handrailMat);
  const leftRail = new THREE.Mesh(handrailGeom, handrailMat);
  leftRail.position.set(0, 1.9, -widthM / 2 + 0.35);
  const rightRail = new THREE.Mesh(handrailGeom, handrailMat);
  rightRail.position.set(0, 1.9, widthM / 2 - 0.35);
  bridgeGroup.add(leftRail, rightRail);

  // 3. Concrete Abutments on both riverbanks with angled wing walls
  const abutGeom = new THREE.BoxGeometry(26, 6, widthM + 4);
  geometries.push(abutGeom);
  const abutMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  materials.push(abutMat);

  const leftAbut = new THREE.Mesh(abutGeom, abutMat);
  leftAbut.position.set(-spanM / 2 + 6, -2.5, 0);
  const rightAbut = new THREE.Mesh(abutGeom, abutMat);
  rightAbut.position.set(spanM / 2 - 6, -2.5, 0);
  bridgeGroup.add(leftAbut, rightAbut);

  // 4. Heavy Concrete Support Piers in Riverbed
  const pierColGeom = new THREE.CylinderGeometry(2.6, 3.4, 8, 12);
  geometries.push(pierColGeom);
  const pierCapGeom = new THREE.BoxGeometry(5.2, 1.6, widthM + 3);
  geometries.push(pierCapGeom);
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  materials.push(pierMat);

  const pierXOffsets = [-spanM * 0.28, spanM * 0.28];
  for (const pX of pierXOffsets) {
    // Dual columns per pier
    const colLeft = new THREE.Mesh(pierColGeom, pierMat);
    colLeft.position.set(pX, -3.2, -widthM * 0.28);
    const colRight = new THREE.Mesh(pierColGeom, pierMat);
    colRight.position.set(pX, -3.2, widthM * 0.28);
    // Pier cap beam
    const cap = new THREE.Mesh(pierCapGeom, pierMat);
    cap.position.set(pX, 0.4, 0);
    bridgeGroup.add(colLeft, colRight, cap);
  }

  // 5. Heavy Steel Through-Truss Superstructure
  // Structural steel palette: Tactical charcoal / battleship steel
  const steelMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
  const steelAccentMat = new THREE.MeshLambertMaterial({ color: 0x4b5563 });
  const hazardMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  materials.push(steelMat, steelAccentMat, hazardMat);

  const trussH = 17.0; // Height of truss above deck (deck is at Y=0.8 to 1.2)
  const zLeft = -widthM / 2 + 0.35;
  const zRight = widthM / 2 - 0.35;
  const numPanels = 8;
  const panelW = spanM / numPanels; // 190 / 8 = 23.75m per bay

  // Bottom chords along left and right trusses
  const bottomChordGeom = new THREE.BoxGeometry(spanM, 0.8, 0.8);
  geometries.push(bottomChordGeom);
  const bChordL = new THREE.Mesh(bottomChordGeom, steelMat);
  bChordL.position.set(0, 1.2, zLeft);
  const bChordR = new THREE.Mesh(bottomChordGeom, steelMat);
  bChordR.position.set(0, 1.2, zRight);
  bridgeGroup.add(bChordL, bChordR);

  // Top chords along left and right trusses (spans between panel 1 and panel 7)
  const topChordLen = spanM - 2 * panelW;
  const topChordGeom = new THREE.BoxGeometry(topChordLen, 0.9, 0.9);
  geometries.push(topChordGeom);
  const tChordL = new THREE.Mesh(topChordGeom, steelMat);
  tChordL.position.set(0, trussH, zLeft);
  const tChordR = new THREE.Mesh(topChordGeom, steelMat);
  tChordR.position.set(0, trussH, zRight);
  bridgeGroup.add(tChordL, tChordR);

  // Vertical struts at panel nodes
  const vertPostGeom = new THREE.BoxGeometry(0.7, trussH - 1.2, 0.7);
  geometries.push(vertPostGeom);

  // Overhead transverse sway beams connecting left and right top chords
  const overheadBeamGeom = new THREE.BoxGeometry(0.8, 0.8, widthM);
  geometries.push(overheadBeamGeom);

  // End posts angled at 45 degrees
  const endPostLen = Math.hypot(panelW, trussH - 1.2);
  const endPostAngle = Math.atan2(trussH - 1.2, panelW);
  const endPostGeom = new THREE.BoxGeometry(endPostLen, 1.0, 1.0);
  geometries.push(endPostGeom);

  // Diagonal lattice struts
  const diagStrutLen = Math.hypot(panelW, trussH - 1.2);
  const diagAngle = Math.atan2(trussH - 1.2, panelW);
  const diagStrutGeom = new THREE.BoxGeometry(diagStrutLen, 0.65, 0.65);
  geometries.push(diagStrutGeom);

  // Portal header plates above entrances
  const portalHeaderGeom = new THREE.BoxGeometry(0.5, 1.8, widthM - 1);
  geometries.push(portalHeaderGeom);

  // Assemble Left & Right Truss Frameworks
  const zSides = [zLeft, zRight];
  for (const zSide of zSides) {
    // West end post (sloping up from X0 to X1)
    const westEndPost = new THREE.Mesh(endPostGeom, steelMat);
    westEndPost.position.set(-spanM / 2 + panelW / 2, (1.2 + trussH) / 2, zSide);
    westEndPost.rotation.z = -endPostAngle;
    bridgeGroup.add(westEndPost);

    // East end post (sloping down from X7 to X8)
    const eastEndPost = new THREE.Mesh(endPostGeom, steelMat);
    eastEndPost.position.set(spanM / 2 - panelW / 2, (1.2 + trussH) / 2, zSide);
    eastEndPost.rotation.z = endPostAngle;
    bridgeGroup.add(eastEndPost);

    // Intermediate vertical posts and alternating diagonals for Pratt/Warren pattern
    for (let k = 1; k < numPanels; k++) {
      const nodeX = -spanM / 2 + k * panelW;

      // Vertical post
      const vPost = new THREE.Mesh(vertPostGeom, steelMat);
      vPost.position.set(nodeX, (1.2 + trussH) / 2, zSide);
      bridgeGroup.add(vPost);

      // Alternating diagonal struts in panels 1 to 6
      if (k < numPanels - 1) {
        const diagMesh = new THREE.Mesh(diagStrutGeom, steelAccentMat);
        const midX = nodeX + panelW / 2;
        diagMesh.position.set(midX, (1.2 + trussH) / 2, zSide);
        // Alternate diagonal direction in Warren pattern
        diagMesh.rotation.z = (k % 2 === 1) ? diagAngle : -diagAngle;
        bridgeGroup.add(diagMesh);
      }
    }
  }

  // Overhead transverse sway beams & portal entrance headers
  for (let k = 1; k < numPanels; k++) {
    const nodeX = -spanM / 2 + k * panelW;

    // Overhead transverse beam across roadway
    const swayBeam = new THREE.Mesh(overheadBeamGeom, steelMat);
    swayBeam.position.set(nodeX, trussH, 0);
    bridgeGroup.add(swayBeam);

    // Entrance portal header panels at panel 1 and panel 7
    if (k === 1 || k === numPanels - 1) {
      const portalHeader = new THREE.Mesh(portalHeaderGeom, steelMat);
      portalHeader.position.set(nodeX, trussH - 0.9, 0);
      bridgeGroup.add(portalHeader);

      // Hazard clearance sign on portal
      const hazardSignGeom = new THREE.PlaneGeometry(6, 0.8);
      hazardSignGeom.rotateY(k === 1 ? -Math.PI / 2 : Math.PI / 2);
      geometries.push(hazardSignGeom);
      const hazardSign = new THREE.Mesh(hazardSignGeom, hazardMat);
      hazardSign.position.set(nodeX + (k === 1 ? -0.3 : 0.3), trussH - 0.9, 0);
      bridgeGroup.add(hazardSign);
    }
  }

  // 6. Transition Ramps (connecting bridge deck Y=1.2m to road at Y=-0.85m)
  const rampLen = 32;
  const rampGeom = new THREE.BoxGeometry(rampLen, 0.4, widthM);
  geometries.push(rampGeom);
  const rampMat = new THREE.MeshLambertMaterial({ color: 0x242a32 });
  materials.push(rampMat);

  const leftRamp = new THREE.Mesh(rampGeom, rampMat);
  leftRamp.position.set(-spanM / 2 - rampLen / 2 + 2, -1.0, 0);
  leftRamp.rotation.z = 0.06;
  const rightRamp = new THREE.Mesh(rampGeom, rampMat);
  rightRamp.position.set(spanM / 2 + rampLen / 2 - 2, -1.0, 0);
  rightRamp.rotation.z = -0.06;
  bridgeGroup.add(leftRamp, rightRamp);

  group.add(bridgeGroup);

  registerFeature(
    bridgeId,
    bridgeName,
    'DRAINAGE_CHANNEL',
    { x: xCenter, y: -zCenter, z: 1.2 },
    deckMesh,
    `Reinforced tactical highway bridge spanning the river corridor with connected paved road networks.`
  );
}

/**
 * Builds simple canal or urban overpass bridges.
 */
function buildTacticalBridge(
  x: number,
  z: number,
  spanM: number,
  widthM: number,
  headingRad: number,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(x, 1.2, z);
  bridgeGroup.rotation.y = headingRad;

  // Bridge deck
  const deckGeom = new THREE.BoxGeometry(spanM, 1.2, widthM);
  geometries.push(deckGeom);
  const deckMat = new THREE.MeshLambertMaterial({ color: COLOR_BRIDGE_DECK });
  materials.push(deckMat);
  const deckMesh = new THREE.Mesh(deckGeom, deckMat);
  bridgeGroup.add(deckMesh);

  // Guardrails
  const railGeom = new THREE.BoxGeometry(spanM, 0.8, 0.4);
  geometries.push(railGeom);
  const railMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  materials.push(railMat);

  const leftRail = new THREE.Mesh(railGeom, railMat);
  leftRail.position.set(0, 0.8, -widthM / 2 + 0.2);
  const rightRail = new THREE.Mesh(railGeom, railMat);
  rightRail.position.set(0, 0.8, widthM / 2 - 0.2);
  bridgeGroup.add(leftRail, rightRail);

  // Concrete support piers
  const pierGeom = new THREE.CylinderGeometry(1.8, 2.2, 5, 8);
  geometries.push(pierGeom);
  const pierMat = new THREE.MeshLambertMaterial({ color: COLOR_CONCRETE_WALL });
  materials.push(pierMat);

  const pier1 = new THREE.Mesh(pierGeom, pierMat);
  pier1.position.set(-spanM * 0.25, -2.5, 0);
  const pier2 = new THREE.Mesh(pierGeom, pierMat);
  pier2.position.set(spanM * 0.25, -2.5, 0);
  bridgeGroup.add(pier1, pier2);

  group.add(bridgeGroup);
}

/**
 * Procedural water subsystem entrypoint.
 * Generates distinct realistic water features tailored to each scenario's visual profile.
 */
export function buildProceduralWater(descriptor: EnvironmentDescriptor): WaterBuildResult {
  const group = new THREE.Group();
  group.name = 'ProceduralWaterSubsystem';

  const objects: EnvironmentObjectInfo[] = [];
  const selectableMeshes: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  let updateCallback: ((simMs: number) => void) | undefined;

  const { preset, visualProfile } = descriptor;
  let activeProfile = visualProfile;
  if (visualProfile === 'RANDOM_SEEDED_LANDSCAPE') {
    activeProfile = resolveRandomBiome(descriptor.seed).visualProfile;
  }

  // Helper to register an inspectable water feature
  function registerWaterFeature(
    id: string,
    name: string,
    _categoryType: WaterFeatureType,
    pos: { x: number; y: number; z: number },
    mesh: THREE.Object3D,
    description: string
  ) {
    const info: EnvironmentObjectInfo = {
      id,
      name,
      category: 'WATER_FEATURE',
      preset,
      position: pos,
      heightM: 2,
      elevationM: pos.z,
      isObstructionEnvelope: false,
      description,
    };
    mesh.userData = { envObjectId: id };
    objects.push(info);
    selectableMeshes.push(mesh);
  }

  // 1. SPECTRUM-1: Dense Forest Valley with Winding Blue River, Flowing Current & Paved Highway Bridges
  if (activeProfile === 'SPECTRUM_FOREST_RIVER' || (!activeProfile && preset === 'FOREST_VALLEY')) {
    const { waterMesh, updateFlow } = buildWindingRiver(
      SPECTRUM_RIVER_POINTS,
      140,
      -0.6,
      group,
      geometries,
      materials,
      textures
    );
    updateCallback = updateFlow;

    registerWaterFeature(
      'WATER-RIVER-VALLEY',
      'Emerald Valley Meandering River',
      'RIVER',
      { x: -1400, y: -500, z: 0 },
      waterMesh,
      'Continuous winding tactical river corridor (140m width) cutting through dense woodland valley with dynamic flowing currents.'
    );

    // 1. Northern Tactical Highway Bridge crossing the river at Z = 500 (spanning X: -1495 to -1305, span 190m, width 22m)
    buildTacticalHighwayBridge(
      -1400,
      500,
      190,
      22,
      0, // East-West crossing
      'BRIDGE-TACTICAL-NORTH',
      'North River Crossing Tactical Highway Bridge',
      group,
      geometries,
      materials,
      registerWaterFeature
    );

    // Paved Highway Route 1 across North Bridge:
    // Eastern section from X = 3500 to eastern bridge abutment at X = -1305, Z = 500
    buildPavedRoad(3500, 500, -1305, 500, 18, group, geometries, materials);
    // Western section from western bridge abutment at X = -1495 to X = -3600, Z = 500
    buildPavedRoad(-1495, 500, -3600, 500, 18, group, geometries, materials);

    // 2. Southern Tactical Arch Bridge crossing the river at Z = -1500 (spanning X: -1995 to -1805, span 190m, width 22m)
    buildTacticalHighwayBridge(
      -1900,
      -1500,
      190,
      22,
      0, // East-West crossing
      'BRIDGE-TACTICAL-SOUTH',
      'South River Crossing Tactical Arch Bridge',
      group,
      geometries,
      materials,
      registerWaterFeature
    );

    // Paved Highway Route 2 across South Bridge:
    // Eastern section from X = 2200 to eastern bridge abutment at X = -1805, Z = -1500
    buildPavedRoad(2200, -1500, -1805, -1500, 18, group, geometries, materials);
    // Western section from western bridge abutment at X = -1995 to X = -3500, Z = -1500
    buildPavedRoad(-1995, -1500, -3500, -1500, 18, group, geometries, materials);

    // 3. North-South River Corridor Arterial Highway connecting both bridges along X = -1100
    buildPavedRoad(-1100, 500, -1100, -1500, 16, group, geometries, materials);

    // Register primary highway system
    const roadInfo: EnvironmentObjectInfo = {
      id: 'ROAD-TRANS-VALLEY-HIGHWAY',
      name: 'Trans-Valley Paved Highway Route 1',
      category: 'TERRAIN_ZONE',
      preset,
      position: { x: 0, y: -500, z: 0 },
      heightM: 2,
      elevationM: 0,
      isObstructionEnvelope: false,
      description: 'Paved military logistics highway and tactical bridge crossings spanning the river corridor.',
    };
    objects.push(roadInfo);
  }

  // 2. PROCEDURAL / COASTAL_AIRFIELD: Ocean & Beach (Structures placed strictly on landward bluffs, not upon ocean)
  else if (activeProfile === 'PROCEDURAL_COASTAL_AIRFIELD' || (!activeProfile && preset === 'COASTAL_AIRFIELD')) {
    // 1. Ocean Water Plane on western flank: X from -5200m to -1560m (width 3640m, centered at X = -3380m)
    // Water surface at Y = -0.5m. Seafloor is at Y = -5.0m (elev -4.0m), so depth is 4.5m.
    // 100% open, unobstructed maritime sea lane with zero floating structures upon the water.
    const oceanWidth = 3640;
    const oceanLength = 10400;
    const oceanGeom = new THREE.PlaneGeometry(oceanWidth, oceanLength, 32, 32);
    oceanGeom.rotateX(-Math.PI / 2);
    geometries.push(oceanGeom);

    const oceanMat = new THREE.MeshLambertMaterial({
      color: COLOR_DEEP_OCEAN, // Vibrant oceanic marine blue
      transparent: true,
      opacity: 0.9,
      flatShading: true,
    });
    materials.push(oceanMat);

    const oceanMesh = new THREE.Mesh(oceanGeom, oceanMat);
    oceanMesh.position.set(-3380, -0.5, 0);
    group.add(oceanMesh);

    registerWaterFeature(
      'WATER-OCEAN-COAST',
      'Western Maritime Ocean & Horizon',
      'OCEAN',
      { x: -3380, y: 0, z: -0.5 },
      oceanMesh,
      'Active maritime sea lane and open ocean horizon bordering military coastal airfield.'
    );

    // 2. Sandy Beach: Sloping intertidal yellow beach from X = -1610m to X = -1350m (width 260m, centered at X = -1480m)
    // Meets the flat airfield tarmac at X = -1350 (Y = -0.75m to -0.85m) and slopes down into the ocean at X = -1610 (Y = -1.30m).
    const beachWidth = 260;
    const beachGeom = new THREE.PlaneGeometry(beachWidth, 10400, 24, 32);
    beachGeom.rotateX(-Math.PI / 2);
    const beachPos = beachGeom.attributes.position;
    for (let i = 0; i < beachPos.count; i++) {
      const lx = beachPos.getX(i);
      const lz = beachPos.getZ(i);
      // lx in [-beachWidth/2, beachWidth/2]: -130 is West (seaward, X=-1610), +130 is East (landward, X=-1350)
      const t = (lx + beachWidth / 2) / beachWidth; // 0 at west (seaward), 1 at east (landward)
      // Subtle natural dune undulations along Z
      const undulation = Math.sin(lz * 0.005) * Math.cos(lz * 0.002) * 0.25;
      // Slopes down westward: at t=0 (west) vy = -0.45 (world Y = -1.35); at t=1 (east) vy = +0.15 (world Y = -0.75)
      const vy = -0.45 + t * 0.6 + undulation * (1 - (1 - t) * 0.7);
      beachPos.setY(i, vy);
    }
    beachGeom.computeVertexNormals();
    geometries.push(beachGeom);

    const beachMat = new THREE.MeshLambertMaterial({
      color: COLOR_BEACH_SAND, // Golden yellow beach sand
      flatShading: true,
    });
    materials.push(beachMat);

    const beachMesh = new THREE.Mesh(beachGeom, beachMat);
    beachMesh.position.set(-1480, -0.9, 0);
    group.add(beachMesh);

    registerWaterFeature(
      'WATER-BEACH-SHORE',
      'Coastal Shoreline & Sandy Beach',
      'BEACH',
      { x: -1480, y: 0, z: -0.9 },
      beachMesh,
      'Intertidal sand bar and sloping coastal beach transitioning from military runway to deep water.'
    );

    // 3. Wet Sand Shoreline Margin (X: -1620m to -1560m, width 60m, centered at X = -1590m)
    // Darker, damp wet sand lapped by waves just at the waterline
    const wetSandWidth = 60;
    const wetSandGeom = new THREE.PlaneGeometry(wetSandWidth, 10400, 4, 32);
    wetSandGeom.rotateX(-Math.PI / 2);
    geometries.push(wetSandGeom);

    const wetSandMat = new THREE.MeshLambertMaterial({
      color: 0xb58448, // Warm damp wet sand
      flatShading: true,
    });
    materials.push(wetSandMat);

    const wetSandMesh = new THREE.Mesh(wetSandGeom, wetSandMat);
    wetSandMesh.position.set(-1590, -0.65, 0);
    group.add(wetSandMesh);

    // 4. Surf Foam / Breaking Wave Wash Ribbon (X: -1592m to -1568m, width 24m, centered at X = -1580m)
    // Translucent wave froth along the shoreline where water meets the beach
    const foamWidth = 24;
    const foamGeom = new THREE.PlaneGeometry(foamWidth, 10400, 2, 32);
    foamGeom.rotateX(-Math.PI / 2);
    geometries.push(foamGeom);

    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xf0fdfa,
      transparent: true,
      opacity: 0.75,
    });
    materials.push(foamMat);

    const foamMesh = new THREE.Mesh(foamGeom, foamMat);
    foamMesh.position.set(-1580, -0.48, 0);
    group.add(foamMesh);

    // 5. Coastal Observation Beacon / Lookout Post placed on landward coastal headland bluff (X = -1340, Z = -1800)
    // Firmly on dry land overlooking the sea - NO structures floating upon the ocean.
    const beaconBaseGeom = new THREE.BoxGeometry(14, 4, 14);
    geometries.push(beaconBaseGeom);
    const beaconBaseMat = new THREE.MeshLambertMaterial({ color: COLOR_ROCKY_SHORE });
    materials.push(beaconBaseMat);
    const beaconBaseMesh = new THREE.Mesh(beaconBaseGeom, beaconBaseMat);
    beaconBaseMesh.position.set(-1340, 2, -1800);
    group.add(beaconBaseMesh);

    const beaconGeom = new THREE.CylinderGeometry(2.5, 3.5, 18, 12);
    geometries.push(beaconGeom);
    const beaconMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    materials.push(beaconMat);
    const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
    beaconMesh.position.set(-1340, 13, -1800);
    group.add(beaconMesh);

    const lanternGeom = new THREE.SphereGeometry(1.8, 8, 8);
    geometries.push(lanternGeom);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    materials.push(lanternMat);
    const lanternMesh = new THREE.Mesh(lanternGeom, lanternMat);
    lanternMesh.position.set(-1340, 23, -1800);
    group.add(lanternMesh);

    registerWaterFeature(
      'WATER-BEACON-COAST',
      'Coastal Maritime Observation Post',
      'COASTLINE',
      { x: -1340, y: 1800, z: 0 },
      beaconMesh,
      'Landward coastal navigation beacon and maritime surveillance post on the coastal headland overlooking the sea.'
    );
  }

  // 3. FORMATION_ALPINE_PASS: Alpine Glacial Lake
  else if (activeProfile === 'FORMATION_ALPINE_PASS') {
    // Elliptical glacial lake nestled high in the alpine valley
    const lakeGeom = new THREE.RingGeometry(0, 420, 48, 1);
    lakeGeom.rotateX(-Math.PI / 2);
    lakeGeom.scale(1, 1, 0.72); // ellipse: 420m X, 302m Z
    geometries.push(lakeGeom);

    const lakeMat = new THREE.MeshLambertMaterial({
      color: COLOR_ALPINE_LAKE,
      transparent: true,
      opacity: 0.86,
      flatShading: true,
    });
    materials.push(lakeMat);

    const lakeMesh = new THREE.Mesh(lakeGeom, lakeMat);
    lakeMesh.position.set(-700, 18, 2200); // sits at 18m elevation in alpine pass
    group.add(lakeMesh);

    // Rocky glacial moraine shoreline ring
    const moraineGeom = new THREE.RingGeometry(410, 480, 48, 1);
    moraineGeom.rotateX(-Math.PI / 2);
    moraineGeom.scale(1, 1, 0.72);
    geometries.push(moraineGeom);

    const moraineMat = new THREE.MeshLambertMaterial({
      color: COLOR_ROCKY_SHORE,
      flatShading: true,
    });
    materials.push(moraineMat);

    const moraineMesh = new THREE.Mesh(moraineGeom, moraineMat);
    moraineMesh.position.set(-700, 17.5, 2200);
    group.add(moraineMesh);

    registerWaterFeature(
      'WATER-LAKE-ALPINE',
      'Glacial Alpine Lake Tarn',
      'LAKE',
      { x: -700, y: -2200, z: 18 },
      lakeMesh,
      'High-altitude natural glacial tarn nestled between alpine pass ridgelines.'
    );
  }

  // 4. DEMO-2: Suburban Logistics Industrial Retention Reservoir
  else if (activeProfile === 'DEMO_2_SUBURBAN_LOGISTICS' || (!activeProfile && preset === 'SUBURBAN')) {
    // Rectangular industrial retention basin with concrete embankments
    const resW = 340;
    const resL = 260;
    const resGeom = new THREE.PlaneGeometry(resW, resL, 8, 8);
    resGeom.rotateX(-Math.PI / 2);
    geometries.push(resGeom);

    const resMat = new THREE.MeshLambertMaterial({
      color: COLOR_RESERVOIR_WATER,
      transparent: true,
      opacity: 0.84,
      flatShading: true,
    });
    materials.push(resMat);

    const resMesh = new THREE.Mesh(resGeom, resMat);
    resMesh.position.set(1600, -1.2, -1400);
    group.add(resMesh);

    // Concrete perimeter bund / embankment walls
    const wallThick = 18;
    const wallH = 2.4;
    const wallGeom = new THREE.BoxGeometry(resW + wallThick * 2, wallH, resL + wallThick * 2);
    geometries.push(wallGeom);
    const wallMat = new THREE.MeshLambertMaterial({ color: COLOR_CONCRETE_WALL });
    materials.push(wallMat);

    const wallMesh = new THREE.Mesh(wallGeom, wallMat);
    wallMesh.position.set(1600, -0.6, -1400);
    group.add(wallMesh);

    registerWaterFeature(
      'WATER-RESERVOIR-LOGISTICS',
      'Industrial Perimeter Retention Reservoir',
      'RESERVOIR',
      { x: 1600, y: 1400, z: -1.2 },
      resMesh,
      'Concrete-bunded industrial stormwater retention basin protecting logistics facility perimeter.'
    );
  }

  // 5. POPUP-*: Urban Ingress Drainage Canal
  else if (activeProfile === 'POPUP_URBAN_CORRIDOR') {
    // Concrete-lined drainage canal along X = -450 from Z = -2600 to 2600
    const canalLen = 5200;
    const canalW = 46;
    const canalGeom = new THREE.PlaneGeometry(canalW, canalLen, 4, 32);
    canalGeom.rotateX(-Math.PI / 2);
    geometries.push(canalGeom);

    const canalMat = new THREE.MeshLambertMaterial({
      color: COLOR_CANAL_WATER,
      transparent: true,
      opacity: 0.85,
    });
    materials.push(canalMat);

    const canalMesh = new THREE.Mesh(canalGeom, canalMat);
    canalMesh.position.set(-450, -2.5, 0);
    group.add(canalMesh);

    // Concrete channel walls
    const leftWallGeom = new THREE.BoxGeometry(4, 3.6, canalLen);
    geometries.push(leftWallGeom);
    const concreteMat = new THREE.MeshLambertMaterial({ color: COLOR_CONCRETE_WALL });
    materials.push(concreteMat);

    const leftWall = new THREE.Mesh(leftWallGeom, concreteMat);
    leftWall.position.set(-450 - canalW / 2 - 2, -1.0, 0);
    const rightWall = new THREE.Mesh(leftWallGeom, concreteMat);
    rightWall.position.set(-450 + canalW / 2 + 2, -1.0, 0);
    group.add(leftWall, rightWall);

    // Street overpass bridges across the canal
    buildTacticalBridge(-450, -600, 64, 20, Math.PI / 2, group, geometries, materials);
    buildTacticalBridge(-450, 1200, 64, 20, Math.PI / 2, group, geometries, materials);

    registerWaterFeature(
      'WATER-CANAL-URBAN',
      'Metropolitan Stormwater Drainage Canal',
      'DRAINAGE_CHANNEL',
      { x: -450, y: 0, z: -2.5 },
      canalMesh,
      'Deep concrete urban drainage canal running through the center of the pop-up ingress corridor.'
    );
  }

  // 6. SWARM-1: Rocky Dry Riverbed / Arroyo Landmark in the Northern Valley
  else if (activeProfile === 'SWARM_MOUNTAIN_VALLEY') {
    const arroyoPoints = [
      { x: 750, z: 3400 },
      { x: 300, z: 2800 },
      { x: -100, z: 2200 },
      { x: -350, z: 1600 },
      { x: -200, z: 1200 },
    ];

    // Build gravel wash bed
    const arroyoGeom = new THREE.BufferGeometry();
    const posList: number[] = [];
    const indList: number[] = [];
    const w = 70;

    for (let i = 0; i < arroyoPoints.length; i++) {
      const p = arroyoPoints[i];
      const next = arroyoPoints[Math.min(arroyoPoints.length - 1, i + 1)];
      const prev = arroyoPoints[Math.max(0, i - 1)];
      const tangent = new THREE.Vector2(next.x - prev.x, next.z - prev.z).normalize();
      const norm = new THREE.Vector2(-tangent.y, tangent.x);

      const idx = posList.length / 3;
      posList.push(p.x + norm.x * w, 0.2, p.z + norm.y * w);
      posList.push(p.x - norm.x * w, 0.2, p.z - norm.y * w);

      if (i < arroyoPoints.length - 1) {
        indList.push(idx, idx + 1, idx + 2);
        indList.push(idx + 1, idx + 3, idx + 2);
      }
    }

    arroyoGeom.setAttribute('position', new THREE.Float32BufferAttribute(posList, 3));
    arroyoGeom.computeVertexNormals();
    arroyoGeom.setIndex(indList);
    geometries.push(arroyoGeom);

    const arroyoMat = new THREE.MeshLambertMaterial({
      color: 0x44403c, // Dark rocky gravel bed
      flatShading: true,
    });
    materials.push(arroyoMat);

    const arroyoMesh = new THREE.Mesh(arroyoGeom, arroyoMat);
    group.add(arroyoMesh);

    registerWaterFeature(
      'WATER-ARROYO-WASH',
      'Northern Mountain Basin Dry Arroyo',
      'DRAINAGE_CHANNEL',
      { x: 100, y: -2200, z: 0.2 },
      arroyoMesh,
      'Rocky seasonal arroyo wash cutting through the northern valley floor between elevated ridges.'
    );
  }

  // 7. RANDOM_SEEDED_LANDSCAPE: Deterministic water based on seed
  else if (visualProfile === 'RANDOM_SEEDED_LANDSCAPE') {
    const seedMod = Math.abs(descriptor.seed) % 3;
    if (seedMod === 0) {
      // Seeded River
      const riverPoints = [
        { x: -600, z: 4200 },
        { x: -900, z: 2400 },
        { x: -1200, z: 600 },
        { x: -1500, z: -1400 },
        { x: -1000, z: -3800 },
      ];
      const { waterMesh } = buildWindingRiver(riverPoints, 110, -0.6, group, geometries, materials, textures);
      registerWaterFeature(
        'WATER-RIVER-SEEDED',
        'Procedural River Corridor',
        'RIVER',
        { x: -1000, y: 0, z: -0.6 },
        waterMesh,
        'Procedurally synthesized river corridor generated deterministically from seed.'
      );
    } else if (seedMod === 1) {
      // Seeded Lake
      const lakeGeom = new THREE.RingGeometry(0, 360, 32, 1);
      lakeGeom.rotateX(-Math.PI / 2);
      geometries.push(lakeGeom);
      const lakeMat = new THREE.MeshLambertMaterial({
        color: COLOR_ALPINE_LAKE,
        transparent: true,
        opacity: 0.85,
      });
      materials.push(lakeMat);
      const lakeMesh = new THREE.Mesh(lakeGeom, lakeMat);
      lakeMesh.position.set(-1200, -0.5, 1200);
      group.add(lakeMesh);
      registerWaterFeature(
        'WATER-LAKE-SEEDED',
        'Procedural Woodland Lake',
        'LAKE',
        { x: -1200, y: -1200, z: -0.5 },
        lakeMesh,
        'Procedurally synthesized woodland lake generated deterministically from seed.'
      );
    } else {
      // Seeded Reservoir
      const resGeom = new THREE.PlaneGeometry(300, 220);
      resGeom.rotateX(-Math.PI / 2);
      geometries.push(resGeom);
      const resMat = new THREE.MeshLambertMaterial({
        color: COLOR_RESERVOIR_WATER,
        transparent: true,
        opacity: 0.85,
      });
      materials.push(resMat);
      const resMesh = new THREE.Mesh(resGeom, resMat);
      resMesh.position.set(1200, -1.2, -1200);
      group.add(resMesh);
      registerWaterFeature(
        'WATER-RESERVOIR-SEEDED',
        'Procedural Reservoir Basin',
        'RESERVOIR',
        { x: 1200, y: 1200, z: -1.2 },
        resMesh,
        'Procedurally synthesized retention reservoir generated deterministically from seed.'
      );
    }
  }

  return {
    group,
    objects,
    selectableMeshes,
    disposables: { geometries, materials, textures },
    update: updateCallback,
  };
}
