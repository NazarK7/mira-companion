import type { CameraSpec } from '../models/domain.model';

/**
 * Catalogo camere Matrox/Zebra Smart Cameras (CMOS Global Shutter).
 * Pixel pitch comune: 3.2 μm (Sony Pregius S generation).
 *
 * NOTA: pixel_pitch_mm è in millimetri (0.0032 = 3.2 μm).
 */
export const CAMERA_CATALOG: readonly CameraSpec[] = [
  {
    id: 'matrox-12mp',
    label: '12 MP',
    resolution_px: { w: 4096, h: 3072 },
    pixel_pitch_mm: 0.0048,
    sensor_format: '1"',
    sensor_diagonal_mm: 16.38,
  },
  {
    id: 'matrox-8mp',
    label: '8 MP',
    resolution_px: { w: 4096, h: 2160 },
    pixel_pitch_mm: 0.0048,
    sensor_format: '1/1.1"',
    sensor_diagonal_mm: 14.81,
  },
  {
    id: 'matrox-5mp',
    label: '5 MP',
    resolution_px: { w: 2592, h: 2048 },
    pixel_pitch_mm: 0.0048,
    sensor_format: '2/3"',
    sensor_diagonal_mm: 10.56,
  },
  {
    id: 'matrox-2mp',
    label: '2 MP',
    resolution_px: { w: 1920, h: 1200 },
    pixel_pitch_mm: 0.0048,
    sensor_format: '1/2.2"',
    sensor_diagonal_mm: 7.24,
  },
];

export const DEFAULT_CAMERA_ID = 'matrox-5mp';

export function findCameraById(id: string): CameraSpec | undefined {
  return CAMERA_CATALOG.find((c) => c.id === id);
}