/**
 * Tests per plate-visibility.util.ts
 *
 * Scenari testati:
 * - Camera nadir a 950mm sopra plate caltab250mm → tutti corner visibili,
 *   coverage ~19% (calcolata manualmente: bbox 658x658px su sensor 1920x1200)
 * - Camera laterale → meno corner visibili o coverage diversa
 * - Camera dietro al plate (Z < 0 plate frame) → nessun corner in view
 * - Camera molto vicina → coverage altissima, out of range
 * - Camera molto lontana → coverage bassa, out of range
 */

import type { CameraHardware, CanonicalPose, Vec3 } from '../models/domain.model';
import {
  checkPlateVisibility,
  getPlateCornersWorld,
  nadirCameraPose,
  projectPinhole,
  projectWorldPoint,
  worldToCamera,
} from './plate.visibility.util';
import { normalizeQuat } from './pose-conversions.util';

// =============================================================================
// FIXTURES
// =============================================================================

const matroxIrisGtr12mm: CameraHardware = {
  model: 'Matrox Iris GTR',
  sensor: { width_px: 1920, height_px: 1200, pixel_pitch_um: 4.8 },
  lens: { focal_length_mm: 12, aperture_min_f: 2.8 },
};

const plate250AtOrigin = {
  center: [0, 0, 0] as Vec3,
  size_mm: 250,
};

// =============================================================================
// TESTS
// =============================================================================

describe('plate-visibility', () => {

  describe('worldToCamera', () => {

    it('Identità: camera in origine, no rotazione → punto invariato', () => {
      const camera: CanonicalPose = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
      const result = worldToCamera([5, 10, 15], camera);
      expect(result[0]).toBeCloseTo(5);
      expect(result[1]).toBeCloseTo(10);
      expect(result[2]).toBeCloseTo(15);
    });

    it('Camera traslata: sottrae offset', () => {
      const camera: CanonicalPose = { position: [10, 20, 30], quaternion: [0, 0, 0, 1] };
      const result = worldToCamera([15, 25, 35], camera);
      expect(result[0]).toBeCloseTo(5);
      expect(result[1]).toBeCloseTo(5);
      expect(result[2]).toBeCloseTo(5);
    });

    it('Camera nadir (180° intorno X) sopra origine: punto sotto a Z=0 → davanti camera', () => {
      const camera: CanonicalPose = { position: [0, 0, 950], quaternion: [1, 0, 0, 0] };
      const point: Vec3 = [0, 0, 0]; // plate center
      const result = worldToCamera(point, camera);
      // Camera è a (0,0,950) con asse Z capovolto → plate è davanti a 950mm
      expect(result[0]).toBeCloseTo(0, 4);
      expect(result[1]).toBeCloseTo(0, 4);
      expect(result[2]).toBeCloseTo(950, 4);
    });
  });

  describe('projectPinhole', () => {

    it('Punto al centro asse ottico → centro sensor', () => {
      const result = projectPinhole([0, 0, 950], 12, 0.0048, 1920, 1200);
      expect(result!.u).toBeCloseTo(960);
      expect(result!.v).toBeCloseTo(600);
    });

    it('Punto dietro la camera (z<=0) → null', () => {
      expect(projectPinhole([5, 5, -10], 12, 0.0048, 1920, 1200)).toBeNull();
      expect(projectPinhole([5, 5, 0], 12, 0.0048, 1920, 1200)).toBeNull();
    });

    it('Punto a 125mm dall\'asse ottico, distanza 950mm → spostato di ~329px', () => {
      // x_film = 12 * 125 / 950 = 1.579mm; pixel = 1.579 / 0.0048 ≈ 329px
      const result = projectPinhole([125, 0, 950], 12, 0.0048, 1920, 1200);
      expect(result!.u).toBeCloseTo(960 + 329, 0);
      expect(result!.v).toBeCloseTo(600);
    });
  });

  describe('getPlateCornersWorld', () => {

    it('Plate 250mm centrato in origine, no rotazione → 4 corner sul piano Z=0', () => {
      const corners = getPlateCornersWorld({ center: [0, 0, 0], size_mm: 250 });
      expect(corners[0]).toEqual([-125, -125, 0]);
      expect(corners[1]).toEqual([125, -125, 0]);
      expect(corners[2]).toEqual([125, 125, 0]);
      expect(corners[3]).toEqual([-125, 125, 0]);
    });

    it('Plate traslato: tutti i corner traslati', () => {
      const corners = getPlateCornersWorld({ center: [100, 200, 50], size_mm: 250 });
      for (const c of corners) {
        expect(c[2]).toBeCloseTo(50);
      }
    });
  });

  describe('checkPlateVisibility — scenari principali', () => {

    it('Camera NADIR a 950mm sopra plate caltab250 → 4 corner visibili, coverage ~18.8%', () => {
      const camera = nadirCameraPose([0, 0, 0], 950);
      const result = checkPlateVisibility(camera, plate250AtOrigin, matroxIrisGtr12mm);

      expect(result.all_corners_visible).toBe(true);
      expect(result.n_corners_visible).toBe(4);
      // Coverage atteso: bbox (658px)² / (1920·1200) ≈ 18.8%
      expect(result.coverage_pct).toBeGreaterThan(15);
      expect(result.coverage_pct).toBeLessThan(22);
      expect(result.in_acceptable_coverage_range).toBe(true);
    });

    it('Plate center proiettato è al centro del sensor (nadir)', () => {
      const camera = nadirCameraPose([0, 0, 0], 950);
      const result = checkPlateVisibility(camera, plate250AtOrigin, matroxIrisGtr12mm);
      expect(result.plate_center_px!.u).toBeCloseTo(960, 0);
      expect(result.plate_center_px!.v).toBeCloseTo(600, 0);
    });

    it('Camera troppo lontana → coverage troppo bassa, fuori range', () => {
      const camera = nadirCameraPose([0, 0, 0], 3000); // 3m
      const result = checkPlateVisibility(camera, plate250AtOrigin, matroxIrisGtr12mm);

      expect(result.all_corners_visible).toBe(true);
      // Coverage scala come (focal/distance)² → 3000mm dà ~1/10 di 950mm
      expect(result.coverage_pct).toBeLessThan(5);
      expect(result.in_acceptable_coverage_range).toBe(false);
    });

    it('Camera troppo vicina → coverage troppo alta, plate esce dal sensor', () => {
      const camera = nadirCameraPose([0, 0, 0], 400); // 40cm: troppo vicino
      const result = checkPlateVisibility(camera, plate250AtOrigin, matroxIrisGtr12mm);
      // Coverage > 25% e/o corner fuori sensor
      const fuoriSensor = !result.all_corners_visible;
      const coverageEccessiva = result.coverage_pct > 25;
      expect(fuoriSensor || coverageEccessiva).toBe(true);
      expect(result.in_acceptable_coverage_range).toBe(false);
    });

    it('Camera laterale (non perpendicolare): coverage diversa, alcuni corner possono uscire', () => {
      // Camera spostata laterale, ancora orientata verso il plate
      const camera: CanonicalPose = {
        position: [600, 0, 700],
        // Approssimazione: ruota la camera di ~40° intorno a Y oltre il nadir
        // così punta verso l'origine
        quaternion: normalizeQuat([0.81, 0.32, 0.32, 0.38]),
      };
      const result = checkPlateVisibility(camera, plate250AtOrigin, matroxIrisGtr12mm);
      // Non importa il risultato esatto, basta che non crashi e ritorni numeri validi
      expect(result.n_corners_visible).toBeGreaterThanOrEqual(0);
      expect(result.n_corners_visible).toBeLessThanOrEqual(4);
      expect(Number.isFinite(result.coverage_pct)).toBe(true);
    });

    it('Camera SOTTO il plate (Z negativa) guardando in alto → plate dietro camera, no corner', () => {
      // Camera a Z=-200 (sotto pavimento), guarda verso giù (asse Z opposto a +Z world)
      // Dato che il plate è sopra (Z=0), il plate è DIETRO la camera.
      const camera: CanonicalPose = {
        position: [0, 0, -200],
        quaternion: [1, 0, 0, 0], // 180° intorno X: asse ottico verso -Z
      };
      const result = checkPlateVisibility(camera, plate250AtOrigin, matroxIrisGtr12mm);
      expect(result.n_corners_visible).toBe(0);
      expect(result.coverage_pct).toBe(0);
    });
  });

  describe('nadirCameraPose helper', () => {

    it('Calcola posizione a distance sopra il plate, quat 180° intorno X', () => {
      const pose = nadirCameraPose([10, 20, 5], 900);
      expect(pose.position[0]).toBe(10);
      expect(pose.position[1]).toBe(20);
      expect(pose.position[2]).toBe(905); // 5 + 900
      expect(pose.quaternion).toEqual([1, 0, 0, 0]);
    });
  });

  describe('projectWorldPoint (integration)', () => {

    it('Plate center da camera nadir 950mm → centro sensor, in_view=true', () => {
      const camera = nadirCameraPose([0, 0, 0], 950);
      const result = projectWorldPoint([0, 0, 0], camera, matroxIrisGtr12mm);
      expect(result.in_view).toBe(true);
      expect(result.pixel!.u).toBeCloseTo(960, 0);
      expect(result.pixel!.v).toBeCloseTo(600, 0);
      expect(result.camera_point[2]).toBeCloseTo(950);
    });

    it('Punto molto fuori asse → in_view=false anche se pixel calcolato', () => {
      const camera = nadirCameraPose([0, 0, 0], 950);
      const result = projectWorldPoint([5000, 0, 0], camera, matroxIrisGtr12mm);
      // Pixel calcolato ma fuori sensor
      expect(result.pixel).not.toBeNull();
      expect(result.in_view).toBe(false);
    });
  });
});