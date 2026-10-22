export { Renderer3D } from './renderer3d';
export type { Renderer3DOptions } from './renderer3d';
export { Scene3D } from './scene3d';
export {
  checkWebGL2Support,
  isWebGL2Available,
  attachContextLossHandler,
} from './capability';
export type { WebGL2CapabilityResult } from './capability';
export { toThree, toThreeCoords, toSimCoords } from './coords';
export type { SimPoint } from './coords';
export type { SafeTrackView, CameraPreset, Scene3DOptions } from './types';
export {
  Coverage3D,
  calculateRadarR90Radius,
  calculateRadarCoverage,
  calculateEoirCoverage,
  calculateRfCoverage,
  isChaosActive,
} from './coverage';
export type {
  RadarCoverageStatus,
  EoirCoverageStatus,
  RfCoverageStatus,
  RadarCoverageModel,
  EoirCoverageModel,
  RfCoverageModel,
  SensorCoverageState,
} from './coverage';
export {
  EffectorEnvelopes3D,
  calculateEffectorEnvelopes,
  calculateTrackEngagementCue,
} from './effectorEnvelopes';
export type {
  EffectorEnvelopeState,
  TrackEngagementCue,
  EffectorVisualOptions,
} from './effectorEnvelopes';
export {
  LosVisualizer3D,
  calculateModelledLos,
} from './losVisualizer';
export type {
  LosRayPoint,
  LosBlockStatus,
  LosExplanation,
} from './losVisualizer';
export {
  ClusterOverlay3D,
} from './clusters';
export {
  detectTrackClusters,
  computeConvexHull2D,
  computePolygonAreaM2,
  getAltBand,
  getAltBandBounds,
} from './clusterMath';
export type {
  ClusterMetrics,
  ClusterOptions,
  AltBand,
  AltBandBounds,
  Point2D,
} from './clusterMath';
export { TrainingAid3D } from './trainingAid';
export type { TrainingAid3DOptions } from './trainingAid';
export {
  calculateShadowCeilingAt,
  calculateCrossSection,
  calculateRadarRcsShells,
  bearingRangeToCartesian,
} from './trainingAidMath';
export type {
  CrossSectionSample,
  ZoneCrossSectionBlock,
  CrossSectionProfile,
  RadarRcsShell,
} from './trainingAidMath';

export {
  checkWebXRSupport,
  queueVrAction,
  WebXRPanel,
  WebXRTableTop,
  WebXRControllerHandler,
  WebXRManager,
} from './xr';
export type { WebXRCapabilityResult } from './xr';

export {
  createAircraftBodyGeometry,
  createAircraftAccentGeometry,
  createAircraftHitProxyGeometry,
  calculateScreenSpaceScale,
  calculateAircraftOrientation,
  BASE_WINGSPAN_M,
  MIN_AIRCRAFT_SCALE,
  MAX_AIRCRAFT_SCALE,
  TARGET_PIXEL_SIZE,
} from './aircraftModel';




