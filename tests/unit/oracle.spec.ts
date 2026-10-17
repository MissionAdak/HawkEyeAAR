import { describe, it, expect } from 'vitest';
import { computeOracleEffector, computeCostRegret } from '@/sim/oracle';

describe('Oracle Decision Engine (School Solution & Cost Regret)', () => {
  it('dictates HOLD_FIRE with zero cost for non-hostile entities (Friendly, Civil, Bird)', () => {
    const friendOracle = computeOracleEffector({
      rangeM: 1000,
      trueClass: 'FRIENDLY',
    });
    expect(friendOracle.oracleEffector).toBe('HOLD_FIRE');
    expect(friendOracle.oracleCostInr).toBe(0);

    const civilOracle = computeOracleEffector({
      rangeM: 800,
      trueClass: 'CIVIL_UAS',
    });
    expect(civilOracle.oracleEffector).toBe('HOLD_FIRE');

    const birdOracle = computeOracleEffector({
      rangeM: 400,
      trueClass: 'BIRD',
    });
    expect(birdOracle.oracleEffector).toBe('HOLD_FIRE');
  });

  it('selects cheapest admissible RF_SOFTKILL (₹100) for hostile target emitting RF at 1200m', () => {
    const oracle = computeOracleEffector({
      rangeM: 1200,
      trueClass: 'HOSTILE_ATTACK',
      emitsRf: true,
      droneType: 'FPV_ATTACK',
    });

    expect(oracle.oracleEffector).toBe('RF_SOFTKILL');
    expect(oracle.oracleCostInr).toBe(100);
    expect(oracle.admissible).toBe(true);
  });

  it('bypasses RF_SOFTKILL for RF-silent hostile drone and selects LASER (₹500)', () => {
    const oracle = computeOracleEffector({
      rangeM: 1000,
      trueClass: 'HOSTILE_ATTACK',
      emitsRf: false, // Autonomous / RF-silent
      droneType: 'FPV_ATTACK',
    });

    // RF_SOFTKILL inadmissible on RF-silent; LASER is next cheapest
    expect(oracle.oracleEffector).toBe('LASER');
    expect(oracle.oracleCostInr).toBe(500);
  });

  it('bypasses LASER during heavy fog chaos and selects GUN or INTERCEPTOR', () => {
    const oracle = computeOracleEffector({
      rangeM: 1000,
      trueClass: 'HOSTILE_ATTACK',
      emitsRf: false,
      isFogActive: true, // Fog scatters laser beam
    });

    expect(oracle.oracleEffector).toBe('GUN');
    expect(oracle.oracleCostInr).toBe(20000);
  });

  it('calculates zero regret when trainee matches Oracle choice', () => {
    const regret = computeCostRegret('RF_SOFTKILL', 'RF_SOFTKILL');
    expect(regret.isOptimal).toBe(true);
    expect(regret.regretInr).toBe(0);
    expect(regret.text).toBe('OPTIMAL (₹0)');
  });

  it('computes severe financial cost regret when firing Missile over cheap RF soft-kill', () => {
    // Missile is ₹3,000,000, RF soft-kill is ₹100
    const regret = computeCostRegret('MISSILE', 'RF_SOFTKILL');
    expect(regret.isOptimal).toBe(false);
    expect(regret.regretInr).toBe(2999900);
    expect(regret.text).toContain('REGRET');
  });

  it('penalizes engagement of non-hostile as an ROE violation with full weapon cost', () => {
    const regret = computeCostRegret('GUN', 'HOLD_FIRE');
    expect(regret.isOptimal).toBe(false);
    expect(regret.regretInr).toBe(20000);
    expect(regret.text).toContain('ROE VIOLATION');
  });

  it('labels non-matching effector with zero financial regret as suboptimal identifying the oracle choice', () => {
    // Trainee fires RF_SOFTKILL (₹100), but Oracle required MISSILE (₹3,000,000)
    const regret = computeCostRegret('RF_SOFTKILL', 'MISSILE');
    expect(regret.isOptimal).toBe(false);
    expect(regret.regretInr).toBe(0);
    expect(regret.text).toBe('SUBOPTIMAL (ORACLE: MISSILE)');
  });
});
