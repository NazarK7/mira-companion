import type { PlateSpec } from '../models/domain.model';

/**
 * Catalogo plate di calibrazione Halcon.
 *
 * Parametri derivati da CalibObj.descr standard Halcon:
 *   - Griglia: 7×7 marks
 *   - Distanza inter-asse marks = size_mm / 8
 *   - Raggio dot = size_mm / 32
 *   - Spessore frame nero = size_mm / 32
 *   - Mark triangolare ai punti (-half, -0.75·half) e (-0.75·half, -half)
 *     (angolo bottom-left, asimmetrico per orientazione)
 *
 * Verificato contro CalibObj.descr Halcon 18.11 per plate 250mm.
 */
function makePlateSpec(size_mm: number): PlateSpec {
  const half = size_mm / 2;
  return {
    id: `plate-${size_mm}mm`,
    label: `${size_mm} mm`,
    size_mm,
    grid: { rows: 7, cols: 7 },
    mark_distance_mm: size_mm / 8,
    mark_radius_mm: size_mm / 32,
    frame_thickness_mm: size_mm / 32,
    triangle_mark: {
      p1_mm: [-half, -half * 0.75],
      p2_mm: [-half * 0.75, -half],
    },
  };
}

export const PLATE_CATALOG: readonly PlateSpec[] = [
  makePlateSpec(300),
  makePlateSpec(288),
  makePlateSpec(250),
  makePlateSpec(200),
  makePlateSpec(150),
  makePlateSpec(100),
  makePlateSpec(75),
  makePlateSpec(70),
  makePlateSpec(50),
];

export const DEFAULT_PLATE_ID = 'plate-250mm';

export function findPlateById(id: string): PlateSpec | undefined {
  return PLATE_CATALOG.find((p) => p.id === id);
}