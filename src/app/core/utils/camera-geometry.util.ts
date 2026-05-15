/**
 * camera-geometry.util.ts
 *
 * Calcoli geometrici della camera per supportare:
 * - Setup wizard: dato sensore + lente + distanza, calcolare FOV e DOF
 * - Plate suggester: dato camera + distanza, suggerire plate Halcon ottimale
 * - 3D viewer: dimensioni del frustum da renderizzare
 * - Validation: avvisare se setup borderline (DOF stretta, coverage fuori range)
 *
 * Tutte le funzioni sono pure: stessi input → stessi output. Nessun side effect.
 *
 * Convenzioni:
 * - Distanze sempre in mm
 * - Angoli sempre in gradi
 * - Pixel pitch in micrometri (come da datasheet camera)
 */

import type { CameraHardware, CalibrationPlate } from '../models/domain.model';

// =============================================================================
// SENSOR & FOV
// =============================================================================

export interface SensorDimensions {
  /** Larghezza sensore in mm. */
  width_mm: number;
  /** Altezza sensore in mm. */
  height_mm: number;
  /** Diagonale in mm. */
  diagonal_mm: number;
}

/**
 * Calcola dimensioni fisiche del sensore a partire da risoluzione e pixel pitch.
 */
export function computeSensorDimensions(
  width_px: number,
  height_px: number,
  pixel_pitch_um: number,
): SensorDimensions {
  const pitch_mm = pixel_pitch_um / 1000;
  const width_mm = width_px * pitch_mm;
  const height_mm = height_px * pitch_mm;
  const diagonal_mm = Math.hypot(width_mm, height_mm);
  return { width_mm, height_mm, diagonal_mm };
}

export interface FovAngular {
  horizontal_deg: number;
  vertical_deg: number;
  diagonal_deg: number;
}

/**
 * Field of view angolare in gradi.
 *
 * Formula pinhole: fov = 2 · atan(sensor_size / (2 · focal_length))
 */
export function computeFovAngular(
  sensor: SensorDimensions,
  focal_length_mm: number,
): FovAngular {
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const horizontal_deg = toDeg(2 * Math.atan(sensor.width_mm / (2 * focal_length_mm)));
  const vertical_deg = toDeg(2 * Math.atan(sensor.height_mm / (2 * focal_length_mm)));
  const diagonal_deg = toDeg(2 * Math.atan(sensor.diagonal_mm / (2 * focal_length_mm)));
  return { horizontal_deg, vertical_deg, diagonal_deg };
}

export interface FovLinear {
  /** Larghezza coperta nello spazio oggetto, a `distance_mm`. */
  width_mm: number;
  /** Altezza coperta nello spazio oggetto. */
  height_mm: number;
  /** Area coperta in mm². */
  area_mm2: number;
}

/**
 * Field of view lineare alla distanza specificata (proiezione del sensore
 * sullo spazio oggetto a quella distanza dalla camera).
 *
 * Approssimazione thin-lens: fov_size = sensor_size · distance / focal_length
 */
export function computeFovLinear(
  sensor: SensorDimensions,
  focal_length_mm: number,
  distance_mm: number,
): FovLinear {
  const width_mm = (sensor.width_mm * distance_mm) / focal_length_mm;
  const height_mm = (sensor.height_mm * distance_mm) / focal_length_mm;
  return { width_mm, height_mm, area_mm2: width_mm * height_mm };
}

// =============================================================================
// DEPTH OF FIELD
// =============================================================================

export interface DofResult {
  /** Distanza di near sharp boundary, in mm. */
  near_mm: number;
  /** Distanza di far sharp boundary, in mm. */
  far_mm: number;
  /** Profondità totale (far - near), in mm. */
  total_mm: number;
  /** Distanza iperfocale, in mm (informativa). */
  hyperfocal_mm: number;
}

/**
 * Depth of field secondo formule classiche ottica.
 *
 * @param focal_length_mm     focale lente
 * @param aperture_f          numero f (es. 2.8, 5.6, 8)
 * @param focus_distance_mm   distanza messa a fuoco
 * @param coc_mm              circle of confusion accettabile (default: 2 pixel)
 *
 * Per vision robot guidance, CoC tipico = 2 · pixel_pitch (matching su edge).
 * Per requisiti più stretti (sub-pixel matching) usare 1 pixel.
 */
export function computeDof(
  focal_length_mm: number,
  aperture_f: number,
  focus_distance_mm: number,
  coc_mm: number,
): DofResult {
  const f = focal_length_mm;
  const N = aperture_f;
  const s = focus_distance_mm;
  const c = coc_mm;

  // Distanza iperfocale: oltre questa, tutto è a fuoco fino all'infinito
  const hyperfocal_mm = (f * f) / (N * c) + f;

  // Approssimazione classica (valida quando s < hyperfocal):
  // DOF_near = s · (H - f) / (H + s - 2f)
  // DOF_far  = s · (H - f) / (H - s)        (∞ se s >= H)
  const H = hyperfocal_mm;
  const near_mm = (s * (H - f)) / (H + s - 2 * f);
  const far_mm =
    s >= H ? Number.POSITIVE_INFINITY : (s * (H - f)) / (H - s);

  const total_mm =
    far_mm === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : far_mm - near_mm;

  return { near_mm, far_mm, total_mm, hyperfocal_mm };
}

// =============================================================================
// PLATE SUGGESTER
// =============================================================================

/**
 * Catalogo plate Halcon disponibili (lato in mm + identificatore).
 * Riferimento: documentazione Halcon `caltab_<size>mm.descr`.
 */
export const HALCON_PLATE_CATALOG: ReadonlyArray<{
  type: Exclude<CalibrationPlate['type'], 'custom'>;
  size_mm: number;
}> = [
  { type: 'caltab125mm', size_mm: 125 },
  { type: 'caltab250mm', size_mm: 250 },
  { type: 'caltab300mm', size_mm: 300 },
  { type: 'caltab400mm', size_mm: 400 },
];

/**
 * Copertura target: 1/6 della FOV (vincolo MiRa_3D documentato nel manuale
 * Comau, par. 10.1.1).
 *
 * Lavoriamo con il **lato** del plate (assumendo plate quadrato) rispetto al
 * **lato minore** della FOV (il più restrittivo). Ratio lineare target =
 * sqrt(1/6) ≈ 0.408. Soglie accettabili: ratio in [0.32, 0.5].
 */
export const PLATE_COVERAGE_TARGET_RATIO = Math.sqrt(1 / 6);
export const PLATE_COVERAGE_MIN_RATIO = 0.32;
export const PLATE_COVERAGE_MAX_RATIO = 0.5;
export const PLATE_COVERAGE_TARGET_PCT = 100 / 6;
export const PLATE_COVERAGE_MIN_PCT = 10;
export const PLATE_COVERAGE_MAX_PCT = 25;

export interface PlateSuggestion {
  /** Plate raccomandato (dal catalogo Halcon). */
  recommended: { type: Exclude<CalibrationPlate['type'], 'custom'>; size_mm: number };
  /** Ratio plate_side / fov_min_side effettivo con la scelta raccomandata. */
  effective_ratio: number;
  /** Coverage in % dell'area FOV. */
  effective_coverage_pct: number;
  /** Plate ideale "teorico" (non vincolato al catalogo). */
  ideal_size_mm: number;
  /** Alternative dal catalogo ordinate per "qualità" della copertura. */
  alternatives: ReadonlyArray<{
    type: Exclude<CalibrationPlate['type'], 'custom'>;
    size_mm: number;
    ratio: number;
    coverage_pct: number;
    in_acceptable_range: boolean;
  }>;
}

/**
 * Suggerisce il plate Halcon più adatto data camera + distanza di lavoro.
 */
export function suggestPlate(
  camera: CameraHardware,
  working_distance_mm: number,
): PlateSuggestion {
  const sensor = computeSensorDimensions(
    camera.sensor.width_px,
    camera.sensor.height_px,
    camera.sensor.pixel_pitch_um,
  );
  const fov = computeFovLinear(sensor, camera.lens.focal_length_mm, working_distance_mm);
  const fovMinSide = Math.min(fov.width_mm, fov.height_mm);

  const ideal_size_mm = fovMinSide * PLATE_COVERAGE_TARGET_RATIO;

  // Valuta ogni plate del catalogo
  const evaluations = HALCON_PLATE_CATALOG.map(p => {
    const ratio = p.size_mm / fovMinSide;
    const coverage_pct = (p.size_mm * p.size_mm) / fov.area_mm2 * 100;
    const in_acceptable_range =
      coverage_pct >= PLATE_COVERAGE_MIN_PCT && coverage_pct <= PLATE_COVERAGE_MAX_PCT;
    return { ...p, ratio, coverage_pct, in_acceptable_range };
  });

  // Sort: prima quelle in range di coverage, poi per vicinanza al target 1/6 area.
  // A parita di coverage, preferiamo la ratio piu vicina al target conservativo
  // calcolato sul lato minore della FOV.
  const sorted = [...evaluations].sort((a, b) => {
    if (a.in_acceptable_range !== b.in_acceptable_range) {
      return a.in_acceptable_range ? -1 : 1;
    }
    const coverageDelta =
      Math.abs(a.coverage_pct - PLATE_COVERAGE_TARGET_PCT) -
      Math.abs(b.coverage_pct - PLATE_COVERAGE_TARGET_PCT);
    if (coverageDelta !== 0) {
      return coverageDelta;
    }
    return (
      Math.abs(a.ratio - PLATE_COVERAGE_TARGET_RATIO) -
      Math.abs(b.ratio - PLATE_COVERAGE_TARGET_RATIO)
    );
  });

  const best = sorted[0];

  return {
    recommended: { type: best.type, size_mm: best.size_mm },
    effective_ratio: best.ratio,
    effective_coverage_pct: best.coverage_pct,
    ideal_size_mm,
    alternatives: sorted,
  };
}

/**
 * Calcolo inverso: data una camera e un plate fisso, qual è la distanza di
 * lavoro che produrrebbe la copertura ottimale (1/6 della FOV)?
 *
 * Utile quando il plate è dato (es. solo caltab250mm disponibile) e si deve
 * scegliere dove posizionare la camera.
 */
export function computeOptimalDistanceForPlate(
  camera: CameraHardware,
  plate_size_mm: number,
): number {
  const sensor = computeSensorDimensions(
    camera.sensor.width_px,
    camera.sensor.height_px,
    camera.sensor.pixel_pitch_um,
  );
  // Vogliamo: plate_size / fov_min_side = TARGET_RATIO
  // fov_min_side = sensor_min · distance / focal
  // → distance = (plate_size · focal) / (sensor_min · TARGET_RATIO)
  const sensorMin = Math.min(sensor.width_mm, sensor.height_mm);
  return (
    (plate_size_mm * camera.lens.focal_length_mm) /
    (sensorMin * PLATE_COVERAGE_TARGET_RATIO)
  );
}

// =============================================================================
// HIGH-LEVEL SUMMARY
// =============================================================================

export interface CameraGeometrySummary {
  sensor: SensorDimensions;
  fov_angular: FovAngular;
  fov_linear_at_working_distance: FovLinear;
  dof_at_working_distance: DofResult;
  plate_suggestion: PlateSuggestion;
}

/**
 * Riepilogo completo della geometria della camera al working distance dato.
 * Usato dall'UI di setup wizard per mostrare tutti i valori chiave in una vista.
 *
 * @param aperture_f apertura attuale (es. f/5.6 sweet spot di una lente f/2.8)
 */
export function computeCameraGeometrySummary(
  camera: CameraHardware,
  working_distance_mm: number,
  aperture_f: number,
): CameraGeometrySummary {
  const sensor = computeSensorDimensions(
    camera.sensor.width_px,
    camera.sensor.height_px,
    camera.sensor.pixel_pitch_um,
  );
  const fov_angular = computeFovAngular(sensor, camera.lens.focal_length_mm);
  const fov_linear_at_working_distance = computeFovLinear(
    sensor,
    camera.lens.focal_length_mm,
    working_distance_mm,
  );
  // CoC = 2 pixel (matching standard su edge)
  const coc_mm = (camera.sensor.pixel_pitch_um / 1000) * 2;
  const dof_at_working_distance = computeDof(
    camera.lens.focal_length_mm,
    aperture_f,
    working_distance_mm,
    coc_mm,
  );
  const plate_suggestion = suggestPlate(camera, working_distance_mm);

  return {
    sensor,
    fov_angular,
    fov_linear_at_working_distance,
    dof_at_working_distance,
    plate_suggestion,
  };
}