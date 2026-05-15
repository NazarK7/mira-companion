import type { CameraSpec } from '../models/domain.model';

/**
 * Catalogo camere Matrox/Zebra Smart Cameras (CMOS Global Shutter).
 * Pixel pitch comune: 3.2 μm (Sony Pregius S generation).
 *
 * NOTA: pixel_pitch_mm è in millimetri (0.0032 = 3.2 μm).
 */
export const CAMERA_CATALOG: readonly CameraSpec[] = [
  {
    id: 'matrox-16mp',
    label: '16 MP · 4000×4000',
    resolution_px: { w: 4000, h: 4000 },
    pixel_pitch_mm: 0.0032,
    sensor_format: '1.1"',
    sensor_diagonal_mm: 18.10,
  },
  {
    id: 'matrox-12.5mp',
    label: '12.5 MP · 4096×3072',
    resolution_px: { w: 4096, h: 3072 },
    pixel_pitch_mm: 0.0032,
    sensor_format: '1"',
    sensor_diagonal_mm: 16.38,
  },
  {
    id: 'matrox-8.8mp',
    label: '8.8 MP · 4096×2160',
    resolution_px: { w: 4096, h: 2160 },
    pixel_pitch_mm: 0.0032,
    sensor_format: '1/1.1"',
    sensor_diagonal_mm: 14.81,
  },
  {
    id: 'matrox-5.3mp',
    label: '5.3 MP · 2592×2048',
    resolution_px: { w: 2592, h: 2048 },
    pixel_pitch_mm: 0.0032,
    sensor_format: '2/3"',
    sensor_diagonal_mm: 10.56,
  },
  {
    id: 'matrox-2.3mp',
    label: '2.3 MP · 1920×1200',
    resolution_px: { w: 1920, h: 1200 },
    pixel_pitch_mm: 0.0032,
    sensor_format: '1/2.2"',
    sensor_diagonal_mm: 7.24,
  },
];

export const DEFAULT_CAMERA_ID = 'matrox-5.3mp';

export function findCameraById(id: string): CameraSpec | undefined {
  return CAMERA_CATALOG.find((c) => c.id === id);
}