import { describe, it, expect } from 'vitest';
import { CONFIG, CONFIG_HASH, getMatrixScore, ConfigSchema } from '../../src/config';

describe('Configuration Pipeline & Schema Validation (TASK-P0-02)', () => {
  it('loads valid inlined CONFIG with sha256 hash', () => {
    expect(CONFIG).toBeDefined();
    expect(CONFIG_HASH).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(CONFIG._meta.notional).toBe(true);
    expect(CONFIG._meta.version).toBe('1.1.0');
  });

  it('validates against ConfigSchema successfully', () => {
    const parseResult = ConfigSchema.safeParse(CONFIG);
    expect(parseResult.success).toBe(true);
  });

  it('fails validation when a required key is missing (AC: TASK-P0-02)', () => {
    // Clone config and delete required key
    const corrupted = JSON.parse(JSON.stringify(CONFIG));
    delete corrupted.thresholds.qMin;

    const result = ConfigSchema.safeParse(corrupted);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('qMin'));
      expect(issue).toBeDefined();
    }
  });

  it('verifies 6x7 classification matrix scores from Rules.md 3.3', () => {
    // Hostile attack
    expect(getMatrixScore('HOSTILE_ATTACK', 'HOSTILE_ATTACK')).toBe(100);
    expect(getMatrixScore('HOSTILE_ATTACK', 'HOSTILE_ISR')).toBe(60);
    expect(getMatrixScore('HOSTILE_ATTACK', 'SWARM_ELEMENT')).toBe(60);
    expect(getMatrixScore('HOSTILE_ATTACK', 'CIVIL_UAS')).toBe(0);
    expect(getMatrixScore('HOSTILE_ATTACK', 'BIRD')).toBe(0);
    expect(getMatrixScore('HOSTILE_ATTACK', 'FRIENDLY')).toBe(0);
    expect(getMatrixScore('HOSTILE_ATTACK', 'UNKNOWN_EVIDENCE_INSUFFICIENT')).toBe(25);

    // Civil UAS
    expect(getMatrixScore('CIVIL_UAS', 'CIVIL_UAS')).toBe(100);
    expect(getMatrixScore('CIVIL_UAS', 'BIRD')).toBe(50);
    expect(getMatrixScore('CIVIL_UAS', 'FRIENDLY')).toBe(30);
    expect(getMatrixScore('CIVIL_UAS', 'HOSTILE_ATTACK')).toBe(20);
    expect(getMatrixScore('CIVIL_UAS', 'UNKNOWN_EVIDENCE_INSUFFICIENT')).toBe(40);

    // Bird
    expect(getMatrixScore('BIRD', 'BIRD')).toBe(100);
    expect(getMatrixScore('BIRD', 'CIVIL_UAS')).toBe(50);
    expect(getMatrixScore('BIRD', 'UNKNOWN_EVIDENCE_INSUFFICIENT')).toBe(40);
  });

  it('contains all required effectors and doctrine thresholds', () => {
    expect(CONFIG.effectors.RF_SOFTKILL).toBeDefined();
    expect(CONFIG.effectors.LASER).toBeDefined();
    expect(CONFIG.effectors.GUN).toBeDefined();
    expect(CONFIG.effectors.INTERCEPTOR).toBeDefined();
    expect(CONFIG.effectors.MISSILE).toBeDefined();

    expect(CONFIG.thresholds.qMin).toBe(0.6);
    expect(CONFIG.thresholds.rMinM).toBe(500);
    expect(CONFIG.thresholds.tBudgetMinMs).toBe(6000);
    expect(CONFIG.thresholds.sensingWindowMinMs).toBe(6000);
  });
});
