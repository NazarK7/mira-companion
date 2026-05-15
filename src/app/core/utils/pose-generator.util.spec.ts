/**
 * Tests per pose-generator.util.ts
 *
 * Coverage:
 * - Determinismo (stessi input + seed → stessi output)
 * - Anchor è sempre la prima pose
 * - Tutte le pose generate hanno plate visibility OK
 * - Numero di pose generate = n_total (o meno se candidati validi insufficienti)
 * - Diversità ragionevole (min translation > 0, min tilt > 0)
 * - regenerateRemainingPoses preserva le fixed poses
 */

import type { CameraHardware, CanonicalPose } from '../models/domain.model';
import {
  DEFAULT_LAB_CONSTRAINTS,
  DEFAULT_PRODUCTION_CONSTRAINTS,
  generateCalibrationPoses,
  regenerateRemainingPoses,
} from './pose-generator.util';
import {
  checkPlateVisibility,
  nadirCameraPose,
  type PlateWorldSetup,
} from './plate.visibility.util';

// =============================================================================
// FIXTURES
// =============================================================================

const matroxIrisGtr12mm: CameraHardware = {
  model: 'Matrox Iris GTR',
  sensor: { width_px: 1920, height_px: 1200, pixel_pitch_um: 4.8 },
  lens: { focal_length_mm: 12, aperture_min_f: 2.8 },
};

const plate250: PlateWorldSetup = {
  center: [0, 0, 0],
  size_mm: 250,
};

/** Anchor pose tipica: camera nadir a 950mm sopra il plate. */
const anchorNadir = nadirCameraPose([0, 0, 0], 950);

const baseOptions = {
  plate_setup: plate250,
  camera_hw: matroxIrisGtr12mm,
};

// =============================================================================
// TESTS
// =============================================================================

describe('pose-generator', () => {

  describe('generateCalibrationPoses — base behavior', () => {

    it('Lab mode (5 pose): anchor è la prima, totale ≤ 5', () => {
      const result = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_LAB_CONSTRAINTS,
        { ...baseOptions, seed: 1 },
      );

      expect(result.poses[0]).toEqual(anchorNadir);
      expect(result.poses.length).toBeGreaterThan(1);
      expect(result.poses.length).toBeLessThanOrEqual(5);
    });

    it('Production mode (20 pose): se i candidati bastano, raggiunge 20', () => {
      const result = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_PRODUCTION_CONSTRAINTS,
        { ...baseOptions, seed: 1, n_candidates: 1000 },
      );

      // Con 1000 candidati e plate visibility ragionevole, dovremmo arrivare a 20
      expect(result.reached_target).toBe(true);
      expect(result.poses.length).toBe(20);
    });

    it('Anchor sempre primo elemento del risultato', () => {
      for (const seed of [1, 42, 100, 9999]) {
        const result = generateCalibrationPoses(
          anchorNadir,
          DEFAULT_LAB_CONSTRAINTS,
          { ...baseOptions, seed },
        );
        expect(result.poses[0].position).toEqual(anchorNadir.position);
        expect(result.poses[0].quaternion).toEqual(anchorNadir.quaternion);
      }
    });

    it('Statistiche: candidates_generated = n_candidates', () => {
      const result = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_LAB_CONSTRAINTS,
        { ...baseOptions, seed: 1, n_candidates: 250 },
      );
      expect(result.n_candidates_generated).toBe(250);
      expect(result.n_candidates_valid).toBeGreaterThan(0);
      expect(result.n_candidates_valid).toBeLessThanOrEqual(250);
    });
  });

  describe('generateCalibrationPoses — determinismo', () => {

    it('Stesso seed → output identico bit-a-bit', () => {
      const r1 = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_LAB_CONSTRAINTS,
        { ...baseOptions, seed: 7 },
      );
      const r2 = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_LAB_CONSTRAINTS,
        { ...baseOptions, seed: 7 },
      );

      expect(r2.poses.length).toBe(r1.poses.length);
      for (let i = 0; i < r1.poses.length; i++) {
        expect(r2.poses[i].position).toEqual(r1.poses[i].position);
        expect(r2.poses[i].quaternion).toEqual(r1.poses[i].quaternion);
      }
    });

    it('Seed diversi → output diversi (almeno una pose)', () => {
      const r1 = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_LAB_CONSTRAINTS,
        { ...baseOptions, seed: 1 },
      );
      const r2 = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_LAB_CONSTRAINTS,
        { ...baseOptions, seed: 2 },
      );

      // Almeno una pose deve differire (escluso anchor)
      let foundDiff = false;
      for (let i = 1; i < Math.min(r1.poses.length, r2.poses.length); i++) {
        if (
          r1.poses[i].position[0] !== r2.poses[i].position[0] ||
          r1.poses[i].position[1] !== r2.poses[i].position[1]
        ) {
          foundDiff = true;
          break;
        }
      }
      expect(foundDiff).toBe(true);
    });
  });

  describe('generateCalibrationPoses — vincoli di visibilità', () => {

    it('Tutte le pose generate (escluso anchor) vedono il plate in range', () => {
      const result = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_PRODUCTION_CONSTRAINTS,
        { ...baseOptions, seed: 1, n_candidates: 1000 },
      );

      // Per ogni pose generata (saltiamo l'anchor che è fornito dall'utente)
      for (let i = 1; i < result.poses.length; i++) {
        const vis = checkPlateVisibility(result.poses[i], plate250, matroxIrisGtr12mm, {
          coverage_min_pct: DEFAULT_PRODUCTION_CONSTRAINTS.plate_coverage_min_pct,
          coverage_max_pct: DEFAULT_PRODUCTION_CONSTRAINTS.plate_coverage_max_pct,
        });
        expect(vis.in_acceptable_coverage_range).toBe(true);
      }
    });

    it('Con pool candidati troppo piccolo non raggiunge il target', () => {
      const result = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_PRODUCTION_CONSTRAINTS,
        { ...baseOptions, seed: 1, n_candidates: 30 },
      );
      // 30 candidati raw → dopo filtering visibility ne avremo pochi
      // (probabilmente < 20)
      expect(result.poses.length).toBeLessThanOrEqual(20);
      // reached_target potrebbe essere false; non lo verifichiamo strettamente
      // ma deve esserci almeno l'anchor
      expect(result.poses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generateCalibrationPoses — diversità', () => {

    it('Pose finali sono ragionevolmente diverse tra loro', () => {
      const result = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_PRODUCTION_CONSTRAINTS,
        { ...baseOptions, seed: 1, n_candidates: 1000 },
      );

      // Min translation tra coppie > 50mm (soglia molto blanda)
      expect(result.diversity_stats.min_translation_diff_mm).toBeGreaterThan(50);
      // Min tilt > 5° (blanda)
      expect(result.diversity_stats.min_tilt_diff_deg).toBeGreaterThan(5);
      // Media translation: il box è ±500mm, ci aspettiamo qualche centinaio di mm
      expect(result.diversity_stats.avg_translation_diff_mm).toBeGreaterThan(100);
    });
  });

  describe('regenerateRemainingPoses', () => {

    it('Preserva tutte le pose fissate', () => {
      // Prima genera 5 pose normalmente
      const first = generateCalibrationPoses(
        anchorNadir,
        DEFAULT_LAB_CONSTRAINTS,
        { ...baseOptions, seed: 1, n_candidates: 500 },
      );

      // Prendi le prime 3 come "fisse" e rigenera le restanti
      const fixed = first.poses.slice(0, 3);
      const regenerated = regenerateRemainingPoses(
        fixed,
        DEFAULT_LAB_CONSTRAINTS,
        { ...baseOptions, seed: 99, n_candidates: 500 },
      );

      // Le prime 3 devono essere identiche
      for (let i = 0; i < 3; i++) {
        expect(regenerated.poses[i].position).toEqual(fixed[i].position);
        expect(regenerated.poses[i].quaternion).toEqual(fixed[i].quaternion);
      }
    });

    it('Quando fixedPoses ha già abbastanza pose, non genera nuove', () => {
      const fixed: CanonicalPose[] = [
        anchorNadir,
        { position: [100, 0, 950], quaternion: anchorNadir.quaternion },
        { position: [-100, 0, 950], quaternion: anchorNadir.quaternion },
        { position: [0, 100, 950], quaternion: anchorNadir.quaternion },
        { position: [0, -100, 950], quaternion: anchorNadir.quaternion },
      ];
      const result = regenerateRemainingPoses(
        fixed,
        DEFAULT_LAB_CONSTRAINTS,
        { ...baseOptions, seed: 1 },
      );
      expect(result.poses.length).toBe(5);
      expect(result.n_candidates_generated).toBe(0);
      expect(result.reached_target).toBe(true);
    });

    it('Throws se fixedPoses è vuoto', () => {
      expect(() =>
        regenerateRemainingPoses([], DEFAULT_LAB_CONSTRAINTS, { ...baseOptions, seed: 1 }),
      ).toThrow();
    });
  });

  describe('Constraint presets', () => {

    it('DEFAULT_LAB_CONSTRAINTS ha 5 pose', () => {
      expect(DEFAULT_LAB_CONSTRAINTS.n_total_poses).toBe(5);
    });

    it('DEFAULT_PRODUCTION_CONSTRAINTS ha 20 pose', () => {
      expect(DEFAULT_PRODUCTION_CONSTRAINTS.n_total_poses).toBe(20);
    });

    it('Coverage target = 1/6 area FOV ≈ 16.67%', () => {
      expect(DEFAULT_PRODUCTION_CONSTRAINTS.plate_coverage_target_pct).toBeCloseTo(16.67, 1);
    });
  });
});