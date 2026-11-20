import type { SafeTrackView } from '../types';
import type { TrackClass } from '@/sim/types';
import type { TargetModelCategory } from './targetModelTypes';
import { resolveTargetPresentation, type SensorObservationContext } from './targetObservation';

/**
 * Resolves the 3D visual target model category according to strict air-gap and truth-separation rules (Rules R3.3, R3.4).
 *
 * LIVE SIMULATION INVARIANT (Task 17.2):
 * During live simulation (or whenever revealTruth is false), the rendered model category
 * reflects sensor-observable physical airframe geometry via targetObservation.ts,
 * NOT operator traineeLabel or hidden truthClass.
 *
 * AAR REPLAY INVARIANT:
 * In post-session After Action Review, authorized truth revelation may project the
 * true threat model if and only if revealTruth is explicitly enabled.
 */
export function resolveTargetModelCategory(
  track: SafeTrackView,
  options?: {
    revealTruth?: boolean;
    truthClass?: TrackClass;
    context?: SensorObservationContext;
  }
): TargetModelCategory {
  // Post-session AAR Ground-Truth Projection (only when explicitly authorized)
  if (options?.revealTruth && options.truthClass) {
    return mapClassToCategory(options.truthClass);
  }

  // If observation context is provided, resolve through sensor-aware observation layer
  if (options?.context) {
    return resolveTargetPresentation(track, options.context).presentationCategory;
  }

  // If track has observedAirframe, use default sensor-aware presentation
  if (track.observedAirframe) {
    return resolveTargetPresentation(track, {
      activeSensor: 'EOIR',
      displayMode: 'AUTO',
    }).presentationCategory;
  }

  // Backward-compatible fallback for unobserved tracks without context
  const label = track.traineeLabel;
  if (!label || label === 'UNKNOWN_EVIDENCE_INSUFFICIENT') {
    return 'UNKNOWN';
  }

  return mapClassToCategory(label);
}

/**
 * Maps a canonical classification label to a 3D model category.
 */
export function mapClassToCategory(label: TrackClass): TargetModelCategory {
  switch (label) {
    case 'HOSTILE_ATTACK':
      return 'HOSTILE_ATTACK';
    case 'HOSTILE_ISR':
      return 'HOSTILE_ISR';
    case 'SWARM_ELEMENT':
      return 'SWARM_ELEMENT';
    case 'CIVIL_UAS':
      return 'CIVIL_UAS';
    case 'FRIENDLY':
      return 'FRIENDLY';
    case 'BIRD':
      return 'BIRD';
    case 'UNKNOWN_EVIDENCE_INSUFFICIENT':
    default:
      return 'UNKNOWN';
  }
}
