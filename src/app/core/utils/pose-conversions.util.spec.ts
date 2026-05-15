/**
 * Tests per pose-conversions.util.ts
 *
 * Aggiunti rispetto alla versione precedente:
 * - Verifica wrapping A e R in [-180°, 180°] per Comau (conformità PDL2)
 * - Verifica E ∈ [0°, 180°] per Comau
 * - Test funzioni esportate rotateVecByQuat e conjugateQuat
 */

import {
  abbToCanonical,
  canonicalToAbb,
  canonicalToComau,
  canonicalToControllerPose,
  canonicalToFanuc,
  canonicalToKuka,
  comauToCanonical,
  conjugateQuat,
  controllerPoseToCanonical,
  fanucToCanonical,
  kukaToCanonical,
  normalizeQuat,
  poseSimilarityScore,
  quatAngleDifferenceDeg,
  rotateVecByQuat,
  vec3Distance,
} from './pose-conversions.util';
import type {
  ABBPose,
  CanonicalPose,
  ComauPose,
  FanucPose,
  KukaPose,
} from '../models/domain.model';

// =============================================================================
// HELPERS
// =============================================================================

function expectQuaternionsEqual(
  actual: readonly [number, number, number, number],
  expected: readonly [number, number, number, number],
  precision = 4,
) {
  const dot =
    actual[0] * expected[0] +
    actual[1] * expected[1] +
    actual[2] * expected[2] +
    actual[3] * expected[3];
  const sign = dot < 0 ? -1 : 1;
  for (let i = 0; i < 4; i++) {
    expect(actual[i] * sign).toBeCloseTo(expected[i], precision);
  }
}

function expectVec3Equal(
  actual: readonly [number, number, number],
  expected: readonly [number, number, number],
  precision = 4,
) {
  expect(actual[0]).toBeCloseTo(expected[0], precision);
  expect(actual[1]).toBeCloseTo(expected[1], precision);
  expect(actual[2]).toBeCloseTo(expected[2], precision);
}

// =============================================================================
// TESTS
// =============================================================================

describe('pose-conversions', () => {

  describe('ABB conversions', () => {

    it('pCalib1 reale dal backup Volvo → canonical → ABB (round-trip)', () => {
      const original: ABBPose = {
        type: 'ABB',
        trans: [1227.53, 1502.73, 735.27],
        rot: [0.127076, -0.0342972, 0.988669, -0.0721781],
      };
      const c = abbToCanonical(original);
      expect(c.quaternion[0]).toBeCloseTo(-0.0342972, 6);
      expect(c.quaternion[1]).toBeCloseTo(0.988669, 6);
      expect(c.quaternion[2]).toBeCloseTo(-0.0721781, 6);
      expect(c.quaternion[3]).toBeCloseTo(0.127076, 6);
      const back = canonicalToAbb(c);
      expectVec3Equal(back.trans, original.trans);
      expectQuaternionsEqual(back.rot, original.rot);
    });

    it('identità ABB', () => {
      const id: ABBPose = { type: 'ABB', trans: [0, 0, 0], rot: [1, 0, 0, 0] };
      expectQuaternionsEqual(abbToCanonical(id).quaternion, [0, 0, 0, 1]);
    });
  });

  describe('Comau ZYZ conversions', () => {

    it('round-trip Comau AER per vari valori', () => {
      const samples: ReadonlyArray<readonly [number, number, number]> = [
        [0, 45, 0],
        [30, 60, 15],
        [90, 90, -45],
        [-120, 45, 60],
        [180, 30, -180],
      ];
      for (const aer of samples) {
        const original: ComauPose = { type: 'Comau', position: [500, 600, 700], aer };
        const c = comauToCanonical(original);
        const back = canonicalToComau(c);
        const recanonical = comauToCanonical(back);
        expectQuaternionsEqual(recanonical.quaternion, c.quaternion, 5);
      }
    });

    it('identità: A=E=R=0 → quat identità', () => {
      const id: ComauPose = { type: 'Comau', position: [0, 0, 0], aer: [0, 0, 0] };
      expectQuaternionsEqual(comauToCanonical(id).quaternion, [0, 0, 0, 1]);
    });

    it('A=90° E=0 R=0 → rotazione 90° intorno a Z', () => {
      const c = comauToCanonical({ type: 'Comau', position: [0, 0, 0], aer: [90, 0, 0] });
      expectQuaternionsEqual(c.quaternion, [0, 0, Math.SQRT1_2, Math.SQRT1_2]);
    });

    it('A=0 E=90° R=0 → rotazione 90° intorno a Y', () => {
      const c = comauToCanonical({ type: 'Comau', position: [0, 0, 0], aer: [0, 90, 0] });
      expectQuaternionsEqual(c.quaternion, [0, Math.SQRT1_2, 0, Math.SQRT1_2]);
    });

    it('Gimbal lock E=0: convenzione R=0, A assorbe somma', () => {
      const c = comauToCanonical({ type: 'Comau', position: [0, 0, 0], aer: [30, 0, 20] });
      const back = canonicalToComau(c);
      expect(back.aer[1]).toBeCloseTo(0, 4);
      expect(back.aer[2]).toBeCloseTo(0, 4);
      expect(back.aer[0]).toBeCloseTo(50, 3);
    });

    it('Gimbal lock E=180°: convenzione R=0', () => {
      const c = comauToCanonical({ type: 'Comau', position: [0, 0, 0], aer: [40, 180, 10] });
      const back = canonicalToComau(c);
      expect(back.aer[1]).toBeCloseTo(180, 3);
      expect(back.aer[2]).toBeCloseTo(0, 4);
    });

    // ─── CONFORMITÀ PDL2 SUL RANGE ────────────────────────────────────────
    it('PDL2: E sempre in [0°, 180°]', () => {
      // Genera tanti quaternioni casuali e verifica E
      for (let seed = 1; seed <= 50; seed++) {
        const q = normalizeQuat([
          Math.sin(seed * 1.7),
          Math.cos(seed * 2.3),
          Math.sin(seed * 3.1),
          Math.cos(seed * 0.7),
        ]);
        const comau = canonicalToComau({ position: [0, 0, 0], quaternion: q });
        expect(comau.aer[1]).toBeGreaterThanOrEqual(0);
        expect(comau.aer[1]).toBeLessThanOrEqual(180);
      }
    });

    it('PDL2: A e R sempre in (-180°, 180°]', () => {
      for (let seed = 1; seed <= 50; seed++) {
        const q = normalizeQuat([
          Math.sin(seed * 1.7),
          Math.cos(seed * 2.3),
          Math.sin(seed * 3.1),
          Math.cos(seed * 0.7),
        ]);
        const comau = canonicalToComau({ position: [0, 0, 0], quaternion: q });
        expect(comau.aer[0]).toBeGreaterThan(-180);
        expect(comau.aer[0]).toBeLessThanOrEqual(180);
        expect(comau.aer[2]).toBeGreaterThan(-180);
        expect(comau.aer[2]).toBeLessThanOrEqual(180);
      }
    });

    it('Input AER fuori range si normalizza nel round-trip', () => {
      // Inserisco A=270° (fuori PDL2): la ricostruzione restituisce -90°
      const c = comauToCanonical({ type: 'Comau', position: [0, 0, 0], aer: [270, 45, 0] });
      const back = canonicalToComau(c);
      expect(back.aer[0]).toBeGreaterThan(-180);
      expect(back.aer[0]).toBeLessThanOrEqual(180);
      // Verifica stessa rotazione fisica
      const recanonical = comauToCanonical(back);
      expectQuaternionsEqual(recanonical.quaternion, c.quaternion, 5);
    });
  });

  describe('Fanuc WPR conversions (XYZ estrinseco)', () => {

    it('round-trip Fanuc', () => {
      const samples: ReadonlyArray<readonly [number, number, number]> = [
        [0, 0, 0], [10, 20, 30], [-45, 15, 90], [90, 0, 0], [-30, 60, -120],
      ];
      for (const wpr of samples) {
        const original: FanucPose = { type: 'Fanuc', position: [10, 20, 30], wpr };
        const c = fanucToCanonical(original);
        const back = canonicalToFanuc(c);
        const recanonical = fanucToCanonical(back);
        expectQuaternionsEqual(recanonical.quaternion, c.quaternion, 5);
      }
    });

    it('Fanuc W=90° P=R=0 → rotazione 90° intorno X mondo', () => {
      const c = fanucToCanonical({ type: 'Fanuc', position: [0, 0, 0], wpr: [90, 0, 0] });
      expectQuaternionsEqual(c.quaternion, [Math.SQRT1_2, 0, 0, Math.SQRT1_2]);
    });

    it('Fanuc R=90° P=W=0 → rotazione 90° intorno Z mondo', () => {
      const c = fanucToCanonical({ type: 'Fanuc', position: [0, 0, 0], wpr: [0, 0, 90] });
      expectQuaternionsEqual(c.quaternion, [0, 0, Math.SQRT1_2, Math.SQRT1_2]);
    });
  });

  describe('Kuka ABC conversions (ZYX intrinseco)', () => {

    it('round-trip Kuka', () => {
      const samples: ReadonlyArray<readonly [number, number, number]> = [
        [0, 0, 0], [30, 45, 10], [90, 0, 0], [-60, 30, -20],
      ];
      for (const abc of samples) {
        const original: KukaPose = { type: 'Kuka', position: [100, 200, 300], abc };
        const c = kukaToCanonical(original);
        const back = canonicalToKuka(c);
        const recanonical = kukaToCanonical(back);
        expectQuaternionsEqual(recanonical.quaternion, c.quaternion, 5);
      }
    });

    it('Kuka A=90° B=C=0 → rotazione 90° intorno Z', () => {
      const c = kukaToCanonical({ type: 'Kuka', position: [0, 0, 0], abc: [90, 0, 0] });
      expectQuaternionsEqual(c.quaternion, [0, 0, Math.SQRT1_2, Math.SQRT1_2]);
    });
  });

  describe('Equivalenza Fanuc ↔ Kuka', () => {

    it('Fanuc [W, P, R] = Kuka [A=R, B=P, C=W] → stesso quat', () => {
      const w = 10, p = 20, r = 30;
      const cFanuc = fanucToCanonical({ type: 'Fanuc', position: [0, 0, 0], wpr: [w, p, r] });
      const cKuka = kukaToCanonical({ type: 'Kuka', position: [0, 0, 0], abc: [r, p, w] });
      expectQuaternionsEqual(cFanuc.quaternion, cKuka.quaternion);
    });
  });

  describe('Dispatcher', () => {

    it('round-trip per ogni controller via dispatcher', () => {
      const canonical: CanonicalPose = {
        position: [123.4, 56.7, 890.1],
        quaternion: normalizeQuat([0.1, 0.2, 0.3, 0.927]),
      };
      const controllers = ['ABB', 'Comau', 'Fanuc', 'Kuka'] as const;
      for (const t of controllers) {
        const cp = canonicalToControllerPose(canonical, t);
        const back = controllerPoseToCanonical(cp);
        expectQuaternionsEqual(back.quaternion, canonical.quaternion, 4);
        expectVec3Equal(back.position, canonical.position);
      }
    });
  });

  describe('Utility functions', () => {

    it('normalizeQuat', () => {
      const q = normalizeQuat([2, 0, 0, 0]);
      expect(Math.hypot(q[0], q[1], q[2], q[3])).toBeCloseTo(1, 6);
    });

    it('quatAngleDifferenceDeg: identity → 0', () => {
      const q = normalizeQuat([0.1, 0.2, 0.3, 0.927]);
      expect(quatAngleDifferenceDeg(q, q)).toBeCloseTo(0, 4);
    });

    it('quatAngleDifferenceDeg: 90° → 90°', () => {
      const id = [0, 0, 0, 1] as const;
      const rot90x = [Math.SQRT1_2, 0, 0, Math.SQRT1_2] as const;
      expect(quatAngleDifferenceDeg(id, rot90x)).toBeCloseTo(90, 2);
    });

    it('vec3Distance', () => {
      expect(vec3Distance([0, 0, 0], [3, 4, 0])).toBeCloseTo(5, 6);
    });

    it('poseSimilarityScore: identiche → 0', () => {
      const p: CanonicalPose = { position: [100, 200, 300], quaternion: [0, 0, 0, 1] };
      expect(poseSimilarityScore(p, p)).toBeCloseTo(0, 4);
    });
  });

  // ─── Nuove utility per plate visibility ─────────────────────────────────
  describe('rotateVecByQuat', () => {

    it('Identità: quat (0,0,0,1) lascia il vettore invariato', () => {
      const v = rotateVecByQuat([1, 2, 3], [0, 0, 0, 1]);
      expectVec3Equal(v, [1, 2, 3], 6);
    });

    it('Rotazione 90° intorno Z mappa (1, 0, 0) → (0, 1, 0)', () => {
      const q: readonly [number, number, number, number] = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
      const v = rotateVecByQuat([1, 0, 0], q);
      expectVec3Equal(v, [0, 1, 0], 6);
    });

    it('Rotazione 180° intorno X mappa (0, 0, 1) → (0, 0, -1)', () => {
      const q: readonly [number, number, number, number] = [1, 0, 0, 0];
      const v = rotateVecByQuat([0, 0, 1], q);
      expectVec3Equal(v, [0, 0, -1], 6);
    });
  });

  describe('conjugateQuat', () => {

    it('Inverte segno componenti vettoriali, lascia scalare', () => {
      const q: readonly [number, number, number, number] = [0.1, 0.2, 0.3, 0.927];
      const c = conjugateQuat(q);
      expect(c[0]).toBe(-0.1);
      expect(c[1]).toBe(-0.2);
      expect(c[2]).toBe(-0.3);
      expect(c[3]).toBe(0.927);
    });

    it('Conjugate è l\'inverso per quat unitari (ruota indietro)', () => {
      const q = normalizeQuat([0.3, 0.4, 0.1, 0.85]);
      const v: readonly [number, number, number] = [5, 6, 7];
      const rotated = rotateVecByQuat(v, q);
      const back = rotateVecByQuat(rotated, conjugateQuat(q));
      expectVec3Equal(back, v, 5);
    });
  });
});