export * from './schema';
export * from './config.generated';

import { CONFIG } from './config.generated';
import { assertNeverClass, type TrueClass, type TrackClass } from '../sim/taxonomy';

export function getDroneClassConfig(droneType: keyof typeof CONFIG.droneClasses) {
  return CONFIG.droneClasses[droneType];
}

export function getEffectorConfig(effectorId: keyof typeof CONFIG.effectors) {
  return CONFIG.effectors[effectorId];
}

export function getMatrixScore(trueClass: TrueClass, traineeLabel: TrackClass): number {
  const row = CONFIG.classificationMatrix[trueClass as keyof typeof CONFIG.classificationMatrix];
  if (!row) return 0;

  // Indices: HA=0, HI=1, SW=2, CU=3, BI=4, FR=5, UNK=6
  switch (traineeLabel) {
    case 'HOSTILE_ATTACK': return row[0];
    case 'HOSTILE_ISR': return row[1];
    case 'SWARM_ELEMENT': return row[2];
    case 'CIVIL_UAS': return row[3];
    case 'BIRD': return row[4];
    case 'FRIENDLY': return row[5];
    case 'UNKNOWN_EVIDENCE_INSUFFICIENT': return row[6];
    default: {
      return assertNeverClass(traineeLabel, 'Unhandled canonical class in getMatrixScore');
    }
  }
}
