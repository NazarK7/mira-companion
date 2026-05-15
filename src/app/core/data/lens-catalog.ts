import type { LensSpec } from '../models/domain.model';

/**
 * Catalogo ottiche C-Mount.
 *
 * Image circle diameter è approssimato sulla base del formato standard:
 *   - 2/3"  → ~11.0 mm
 *   - 1"    → ~16.0 mm
 *   - 1.1"  → ~17.6 mm
 *   - 1.2"  → ~20.0 mm
 *   - 4/3"  → ~21.6 mm
 *
 * Verifica con il datasheet della lente reale che usi, perché i produttori
 * variano leggermente nel formato dichiarato.
 *
 * Default qui: formato 1" (16 mm). Adatto per la maggior parte dei sensori
 * Matrox tranne il 16MP (sensore 18.10 mm di diagonale).
 */
export const LENS_CATALOG: readonly LensSpec[] = [
  {
    id: 'cmount-6mm',
    label: '6 mm',
    focal_length_mm: 6,
    image_circle_format: '1"',
    image_circle_diameter_mm: 16.0,
  },
  {
    id: 'cmount-8mm',
    label: '8 mm',
    focal_length_mm: 8,
    image_circle_format: '1"',
    image_circle_diameter_mm: 16.0,
  },
  {
    id: 'cmount-8.5mm',
    label: '8.5 mm',
    focal_length_mm: 8.5,
    image_circle_format: '1"',
    image_circle_diameter_mm: 16.0,
  },
  {
    id: 'cmount-9mm',
    label: '9 mm',
    focal_length_mm: 9,
    image_circle_format: '1"',
    image_circle_diameter_mm: 16.0,
  },
  {
    id: 'cmount-10mm',
    label: '10 mm',
    focal_length_mm: 10,
    image_circle_format: '1"',
    image_circle_diameter_mm: 16.0,
  },
  {
    id: 'cmount-12mm',
    label: '12 mm',
    focal_length_mm: 12,
    image_circle_format: '1"',
    image_circle_diameter_mm: 16.0,
  },
];

export const DEFAULT_LENS_ID = 'cmount-8mm';

export function findLensById(id: string): LensSpec | undefined {
  return LENS_CATALOG.find((l) => l.id === id);
}

/**
 * Verifica compatibilità lente/camera: image circle della lente deve
 * coprire la diagonale del sensore.
 */
export function isLensCompatible(
  lens: { image_circle_diameter_mm: number },
  camera: { sensor_diagonal_mm: number },
): boolean {
  return lens.image_circle_diameter_mm >= camera.sensor_diagonal_mm;
}