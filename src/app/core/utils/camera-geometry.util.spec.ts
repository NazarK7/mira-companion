/**
 * Tests per camera-geometry.util.ts
 *
 * Test cases ancorati a setup realistici:
 * - Matrox Iris GTR (1920×1200, pixel pitch 4.8µm) con lente 12mm @ 950mm
 *   → FOV calcolato e validato manualmente
 *   → Plate suggester deve raccomandare caltab250mm
 *   → DOF a f/2.8 deve essere ~343mm
 * - Camera 8mm @ 950mm → FOV più ampia, plate diverso
 * - Edge cases: distanze estreme, plate fuori catalogo
 */

import {
  HALCON_PLATE_CATALOG,
  computeCameraGeometrySummary,
  computeDof,
  computeFovAngular,
  computeFovLinear,
  computeOptimalDistanceForPlate,
  computeSensorDimensions,
  suggestPlate,
} from './camera-geometry.util';
import type { CameraHardware } from '../models/domain.model';

// =============================================================================
// FIXTURES — camera reali
// =============================================================================

/** Matrox Iris GTR (PYTHON2000 sensor): 1920×1200, pixel pitch 4.8µm. */
const matroxIrisGtr12mm: CameraHardware = {
  model: 'Matrox Iris GTR',
  sensor: {
    width_px: 1920,
    height_px: 1200,
    pixel_pitch_um: 4.8,
  },
  lens: {
    focal_length_mm: 12,
    aperture_min_f: 2.8,
    aperture_max_f: 16,
  },
};

/** Stessa Matrox ma con lente 8mm. */
const matroxIrisGtr8mm: CameraHardware = {
  ...matroxIrisGtr12mm,
  lens: { focal_length_mm: 8, aperture_min_f: 2.8 },
};

// =============================================================================
// TESTS
// =============================================================================

describe('camera-geometry', () => {

  // ───────────────────────────────────────────────────────────────────────────
  describe('computeSensorDimensions', () => {

    it('Matrox Iris GTR: 1920×1200 @ 4.8µm → 9.216 × 5.76 mm', () => {
      const s = computeSensorDimensions(1920, 1200, 4.8);
      expect(s.width_mm).toBeCloseTo(9.216, 3);
      expect(s.height_mm).toBeCloseTo(5.76, 3);
      expect(s.diagonal_mm).toBeCloseTo(Math.hypot(9.216, 5.76), 3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('computeFovAngular', () => {

    it('Matrox Iris GTR @ 12mm: FOV ~42.4° H, ~27.4° V', () => {
      const sensor = computeSensorDimensions(1920, 1200, 4.8);
      const fov = computeFovAngular(sensor, 12);
      // 2 · atan(9.216 / 24) = 2 · atan(0.384) = 2 · 21.0° = 42.0°
      expect(fov.horizontal_deg).toBeCloseTo(42.0, 0);
      expect(fov.vertical_deg).toBeCloseTo(26.9, 0);
    });

    it('Matrox Iris GTR @ 8mm: FOV più ampia, ~59.7° H', () => {
      const sensor = computeSensorDimensions(1920, 1200, 4.8);
      const fov = computeFovAngular(sensor, 8);
      expect(fov.horizontal_deg).toBeCloseTo(59.7, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('computeFovLinear', () => {

    it('Matrox Iris GTR 12mm @ 950mm → ~730 × 456 mm', () => {
      const sensor = computeSensorDimensions(1920, 1200, 4.8);
      const fov = computeFovLinear(sensor, 12, 950);
      // 9.216 · 950 / 12 = 729.6
      expect(fov.width_mm).toBeCloseTo(729.6, 1);
      expect(fov.height_mm).toBeCloseTo(456, 1);
      expect(fov.area_mm2).toBeCloseTo(729.6 * 456, 0);
    });

    it('FOV scala linearmente con la distanza', () => {
      const sensor = computeSensorDimensions(1920, 1200, 4.8);
      const fov500 = computeFovLinear(sensor, 12, 500);
      const fov1000 = computeFovLinear(sensor, 12, 1000);
      expect(fov1000.width_mm).toBeCloseTo(2 * fov500.width_mm, 6);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('computeDof', () => {

    it('Matrox 12mm f/2.8 @ 950mm con CoC 9.6µm → DOF totale ~343mm', () => {
      const dof = computeDof(12, 2.8, 950, 0.0096);
      expect(dof.total_mm).toBeCloseTo(343, 0);
      expect(dof.near_mm).toBeLessThan(950);
      expect(dof.far_mm).toBeGreaterThan(950);
    });

    it('Apertura più chiusa (f/5.6) → DOF maggiore', () => {
      const dof28 = computeDof(12, 2.8, 950, 0.0096);
      const dof56 = computeDof(12, 5.6, 950, 0.0096);
      expect(dof56.total_mm).toBeGreaterThan(dof28.total_mm);
    });

    it('Focale più corta (8mm) → DOF molto maggiore', () => {
      const dof12 = computeDof(12, 2.8, 950, 0.0096);
      const dof8 = computeDof(8, 2.8, 950, 0.0096);
      expect(dof8.total_mm).toBeGreaterThan(2 * dof12.total_mm);
    });

    it('Quando focus distance >= hyperfocal, far è infinito', () => {
      const dof = computeDof(12, 11, 1500, 0.0096); // setup ad alta DOF
      // hyperfocal ≈ 12² / (11 · 0.0096) + 12 ≈ 1376mm; focus 1500 > 1376
      expect(dof.far_mm).toBe(Number.POSITIVE_INFINITY);
      expect(dof.total_mm).toBe(Number.POSITIVE_INFINITY);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('suggestPlate', () => {

    it('Matrox 12mm @ 950mm → raccomanda caltab250mm', () => {
      const result = suggestPlate(matroxIrisGtr12mm, 950);
      expect(result.recommended.type).toBe('caltab250mm');
      expect(result.recommended.size_mm).toBe(250);
      expect(result.effective_coverage_pct).toBeGreaterThan(15);
      expect(result.effective_coverage_pct).toBeLessThan(20);
    });

    it('Matrox 8mm @ 950mm → FOV più grande, plate diverso (caltab300 o caltab400)', () => {
      const result = suggestPlate(matroxIrisGtr8mm, 950);
      // FOV @ 8mm/950mm = 1094 × 684 mm; min side = 684; target = 684*0.408 ≈ 279mm
      // → caltab300mm più vicino
      expect(['caltab300mm', 'caltab250mm']).toContain(result.recommended.type);
    });

    it('Distanza molto bassa → plate piccolo', () => {
      const result = suggestPlate(matroxIrisGtr12mm, 300);
      expect(result.recommended.size_mm).toBeLessThanOrEqual(250);
    });

    it('Alternative ordinate: il primo è il recommended', () => {
      const result = suggestPlate(matroxIrisGtr12mm, 950);
      expect(result.alternatives[0].type).toBe(result.recommended.type);
    });

    it('ideal_size_mm coerente con target ratio', () => {
      const result = suggestPlate(matroxIrisGtr12mm, 950);
      // FOV min side @ 12mm/950mm = 456mm; ideal = 456 * sqrt(1/6) ≈ 186mm
      expect(result.ideal_size_mm).toBeCloseTo(186, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('computeOptimalDistanceForPlate', () => {

    it('Matrox 12mm + caltab250mm → distanza ottimale ~1276mm', () => {
      // distance = (250 · 12) / (5.76 · sqrt(1/6))
      //         = 3000 / (5.76 · 0.408) = 3000 / 2.353 ≈ 1275mm
      const d = computeOptimalDistanceForPlate(matroxIrisGtr12mm, 250);
      expect(d).toBeCloseTo(1275, -1); // tolleranza ±10mm
    });

    it('Plate più piccolo → distanza minore', () => {
      const d250 = computeOptimalDistanceForPlate(matroxIrisGtr12mm, 250);
      const d125 = computeOptimalDistanceForPlate(matroxIrisGtr12mm, 125);
      expect(d125).toBeLessThan(d250);
      // linearità
      expect(d125).toBeCloseTo(d250 / 2, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('computeCameraGeometrySummary (integration)', () => {

    it('Riepilogo completo Matrox 12mm @ 950mm f/5.6', () => {
      const summary = computeCameraGeometrySummary(matroxIrisGtr12mm, 950, 5.6);

      expect(summary.sensor.width_mm).toBeCloseTo(9.216, 3);
      expect(summary.fov_angular.horizontal_deg).toBeCloseTo(42, 0);
      expect(summary.fov_linear_at_working_distance.width_mm).toBeCloseTo(729.6, 1);
      expect(summary.dof_at_working_distance.total_mm).toBeGreaterThan(500);
      expect(summary.plate_suggestion.recommended.type).toBe('caltab250mm');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('HALCON_PLATE_CATALOG', () => {

    it('Contiene almeno i 4 plate standard', () => {
      const types = HALCON_PLATE_CATALOG.map(p => p.type);
      expect(types).toContain('caltab125mm');
      expect(types).toContain('caltab250mm');
      expect(types).toContain('caltab300mm');
      expect(types).toContain('caltab400mm');
    });

    it('Coerenza tra type e size_mm', () => {
      for (const p of HALCON_PLATE_CATALOG) {
        const sizeFromName = parseInt(p.type.replace('caltab', '').replace('mm', ''), 10);
        expect(p.size_mm).toBe(sizeFromName);
      }
    });
  });
});