import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  sha256Sync,
  computeScenarioSnapshotHash,
  verifyScenarioSnapshotHash,
  validateScenarioStructure,
} from '@/sim/snapshotHash';
import type { ScenarioSpec } from '@/sim/types';
import { loadCatalogScenario } from '@/director/catalog';

describe('TASK 27-R-D — Pure TypeScript SHA-256 and Snapshot Compatibility', () => {
  function nodeSha256(str: string): string {
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
  }

  describe('1. Standard Known-Answer Test Vectors (NIST / FIPS 180-4)', () => {
    it('computes correct hash for empty string', () => {
      const input = '';
      const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      expect(sha256Sync(input)).toBe(expected);
      expect(sha256Sync(input)).toBe(nodeSha256(input));
    });

    it('computes correct hash for "abc"', () => {
      const input = 'abc';
      const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
      expect(sha256Sync(input)).toBe(expected);
      expect(sha256Sync(input)).toBe(nodeSha256(input));
    });

    it('computes correct hash for "hello world"', () => {
      const input = 'hello world';
      const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      expect(sha256Sync(input)).toBe(expected);
      expect(sha256Sync(input)).toBe(nodeSha256(input));
    });

    it('computes correct hash for "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"', () => {
      const input = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
      const expected = '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1';
      expect(sha256Sync(input)).toBe(expected);
      expect(sha256Sync(input)).toBe(nodeSha256(input));
    });
  });

  describe('2. Boundary & Padding Sensitivity', () => {
    it.each([0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 500, 1024])(
      'matches Node crypto for input of length %i',
      (len) => {
        const input = 'A'.repeat(len);
        expect(sha256Sync(input)).toBe(nodeSha256(input));
      }
    );

    it('handles embedded null characters correctly', () => {
      const input = 'prefix\x00middle\x00suffix';
      expect(sha256Sync(input)).toBe(nodeSha256(input));
    });

    it('handles UTF-8 multi-byte characters and non-ASCII scripts', () => {
      const hindi = 'दृष्टि-सीयूएएस वायु रक्षा प्रणाली';
      expect(sha256Sync(hindi)).toBe(nodeSha256(hindi));

      const greek = 'Ολοκληρωμένο Σύστημα Αντι-UAV';
      expect(sha256Sync(greek)).toBe(nodeSha256(greek));

      const chinese = '印度智能防空无人机对抗仿真演练';
      expect(sha256Sync(chinese)).toBe(nodeSha256(chinese));
    });

    it('handles emojis and supplementary 4-byte UTF-8 sequences', () => {
      const emoji = '🎯 Drone Alert! 🛸 Threat Intercepted 🛡️ 🚀';
      expect(sha256Sync(emoji)).toBe(nodeSha256(emoji));
    });
  });

  describe('3. Scenario Snapshot Hashing & Verification', () => {
    const { spec: mockSpec } = loadCatalogScenario('DEMO-1', 2026);

    it('computes stable hash regardless of key order', () => {
      const hash1 = computeScenarioSnapshotHash(mockSpec);
      expect(hash1).toMatch(/^sha256:[0-9a-f]{64}$/);

      // Create new object with permuted keys
      const permutedSpec: ScenarioSpec = {
        triggers: mockSpec.triggers,
        chaos: mockSpec.chaos,
        zones: mockSpec.zones,
        decoys: mockSpec.decoys,
        threats: mockSpec.threats,
        asset: mockSpec.asset,
        dayNight: mockSpec.dayNight,
        schemaVersion: mockSpec.schemaVersion,
        simVersion: mockSpec.simVersion,
        difficulty: mockSpec.difficulty,
        seed: mockSpec.seed,
        mode: mockSpec.mode,
        durationMs: mockSpec.durationMs,
        configHash: mockSpec.configHash,
        roeText: mockSpec.roeText,
        levers: mockSpec.levers,
        features: mockSpec.features,
        id: mockSpec.id,
      };

      const hash2 = computeScenarioSnapshotHash(permutedSpec);
      expect(hash1).toBe(hash2);
    });

    it('verifyScenarioSnapshotHash verifies matching hash case-insensitively and with/without prefix', () => {
      const digest = computeScenarioSnapshotHash(mockSpec);
      const bareDigest = digest.replace('sha256:', '');

      expect(verifyScenarioSnapshotHash(mockSpec, digest)).toBe(true);
      expect(verifyScenarioSnapshotHash(mockSpec, digest.toUpperCase())).toBe(true);
      expect(verifyScenarioSnapshotHash(mockSpec, bareDigest)).toBe(true);
      expect(verifyScenarioSnapshotHash(mockSpec, bareDigest.toUpperCase())).toBe(true);
      expect(verifyScenarioSnapshotHash(mockSpec, 'sha256:0000000000000000000000000000000000000000000000000000000000000000')).toBe(false);
      expect(verifyScenarioSnapshotHash(mockSpec, '')).toBe(false);
    });
  });

  describe('4. Structural ScenarioSpec Validation', () => {
    it('accepts valid ScenarioSpec objects', () => {
      const { spec: validSpec } = loadCatalogScenario('DEMO-1', 2026);
      expect(validateScenarioStructure(validSpec)).toBe(true);
    });

    it('rejects invalid or malformed objects', () => {
      expect(validateScenarioStructure(null)).toBe(false);
      expect(validateScenarioStructure({})).toBe(false);
      expect(validateScenarioStructure([])).toBe(false);
      expect(validateScenarioStructure({ id: '', simVersion: '1.1.0' })).toBe(false);
      expect(validateScenarioStructure({ id: 'VALID', simVersion: '', schemaVersion: 1 })).toBe(false);
    });
  });
});
