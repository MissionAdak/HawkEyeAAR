import type { SafeTrackView } from '../types';
import type { TrackClass } from '@/sim/types';
import type { TargetModelCategory } from './targetModelTypes';

/**
 * Resolves the 3D visual target model category according to strict air-gap and truth-separation rules (Rules R3.3, R3.4).
 *
 * LIVE SIMULATION INVARIANT:
 * During live simulation (or whenever revealTruth is false), the rendered model category
 * MUST strictly reflect the operator's current assessment (traineeLabel).
 * If the operator has not classified the track or chosen UNKNOWN, a neutral geometric
 * contact beacon ('UNKNOWN') is displayed.
 * A wrong trainee classification displays the model matching that wrong classification,
 * NEVER the ground truth vehicle identity.
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
  }
): TargetModelCategory {
  // Post-session AAR Ground-Truth Projection (only when explicitly authorized)
  if (options?.revealTruth && options.truthClass) {
    return mapClassToCategory(options.truthClass);
  }

  // Active Operator View: Strictly follow trainee assessment
  const label = track.traineeLabel;
  if (!label || label === 'UNKNOWN_EVIDENCE_INSUFFICIENT') {
    return 'UNKNOWN';
  }

  return mapClassToCategory(label);
}

/**
 * Maps a canonical classification label to a 3D model category.
 */
function mapClassToCategory(label: TrackClass): TargetModelCategory {
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
