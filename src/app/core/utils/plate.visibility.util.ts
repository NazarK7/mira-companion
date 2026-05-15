/**
 * plate-visibility.util.ts
 *
 * Verifica se un plate di calibrazione è visibile da una data pose della camera,
 * e calcola la copertura percentuale dell'immagine.
 *
 * USATO DA:
 * - Pose generator (round 6): per filtrare pose candidate dove il plate non è
 *   visibile o copertura fuori range.
 * - 3D viewer (round 7): per visualizzare visivamente quali pose vedono il plate.
 * - Calibration sandbox (round 8): warning live in UI.
 *
 * CONVENZIONI USATE:
 *
 * WORLD FRAME:
 *   - X+, Y+, Z+ right-handed
 *   - Z+ è "up" (assunzione plant: pavimento sul piano Z=0, robot sopra)
 *
 * CAMERA FRAME (computer vision standard, "OpenCV"):
 *   - X+ a destra (rispetto a chi guarda dall'occhio della camera)
 *   - Y+ verso il basso
 *   - Z+ in avanti (asse ottico, verso ciò che la camera vede)
 *   - Right-handed (X × Y = Z)
 *
 * PIXEL COORDINATES:
 *   - Origine in alto a sinistra
 *   - u+ a destra, v+ in basso
 *   - u ∈ [0, sensor_width_px], v ∈ [0, sensor_height_px]
 *
 * PINHOLE PROJECTION (no distorsione, sufficiente per planning):
 *   x_film_mm = focal_mm · X_cam / Z_cam
 *   y_film_mm = focal_mm · Y_cam / Z_cam
 *   u_px = x_film_mm / pixel_pitch_mm + sensor_width_px / 2
 *   v_px = y_film_mm / pixel_pitch_mm + sensor_height_px / 2
 *
 * PLATE:
 *   - Quadrato di lato `size_mm`, orientato secondo `orientation` (quaternione).
 *   - Default: piatto sul piano X-Y world, normale verso +Z world.
 *
 * APPROSSIMAZIONE FASE DI PIANIFICAZIONE:
 * In fase di calibrazione planning non conosciamo ancora ToolInCamPose (è
 * proprio quello che la calibrazione calcola). Per ora il chiamante passa
 * direttamente la pose della camera in world frame (= pose dell'origine ottica
 * + orientamento dell'asse ottico). Dopo la calibrazione potremo usare la
 * trasformazione vera tool→camera per essere precisi.
 */

import type {
  CameraHardware,
  CanonicalPose,
  PlateWorldSetup,
  Quaternion,
  Vec3,
} from '../models/domain.model';
import { conjugateQuat, rotateVecByQuat } from './pose-conversions.util';

// =============================================================================
// TIPI
// =============================================================================

export type { PlateWorldSetup } from '../models/domain.model';

/** Coordinate pixel (può essere fuori dal sensor). */
export interface PixelCoord {
  /** Colonna (origine a sinistra). */
  u: number;
  /** Riga (origine in alto). */
  v: number;
}

/** Risultato della proiezione di un punto 3D. */
export interface ProjectedPoint {
  /** Coordinate pixel (anche se fuori sensor). Null se punto dietro la camera. */
  pixel: PixelCoord | null;
  /** Punto in camera frame (mm). */
  camera_point: Vec3;
  /** True se il punto è davanti alla camera (z_cam > 0) E dentro il sensor. */
  in_view: boolean;
}

/** Risultato visibility check completo del plate. */
export interface PlateVisibilityResult {
  /** True se TUTTI i 4 corner del plate sono in view. */
  all_corners_visible: boolean;
  /** Numero di corner effettivamente in view (0-4). */
  n_corners_visible: number;
  /** Copertura % dell'area sensor occupata dal bounding box dei corner proiettati. */
  coverage_pct: number;
  /** True se la copertura è nel range accettabile (parametrizzato). */
  in_acceptable_coverage_range: boolean;
  /** Risultato proiezione di ogni corner (4 elementi, ordinati). */
  corners: ProjectedPoint[];
  /** Centro del plate proiettato in pixel (null se dietro la camera). */
  plate_center_px: PixelCoord | null;
}

/** Parametri di tolleranza per il visibility check. */
export interface VisibilityCheckOptions {
  /** Copertura minima % per essere "in range". Default: 10. */
  coverage_min_pct?: number;
  /** Copertura massima % per essere "in range". Default: 25. */
  coverage_max_pct?: number;
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Trasforma un punto dal world frame al camera frame.
 *
 * Math: P_camera = R⁻¹(camera_orientation) · (P_world - camera_position)
 *       Per quaternioni unitari, R⁻¹ = R(conjugate(q)).
 */
export function worldToCamera(world_point: Vec3, camera_pose: CanonicalPose): Vec3 {
  const dx = world_point[0] - camera_pose.position[0];
  const dy = world_point[1] - camera_pose.position[1];
  const dz = world_point[2] - camera_pose.position[2];
  const delta: Vec3 = [dx, dy, dz];
  return rotateVecByQuat(delta, conjugateQuat(camera_pose.quaternion));
}

/**
 * Proietta un punto in camera frame su pixel via modello pinhole.
 * Restituisce null se Z_cam ≤ 0 (punto dietro la camera).
 */
export function projectPinhole(
  camera_point: Vec3,
  focal_length_mm: number,
  pixel_pitch_mm: number,
  sensor_width_px: number,
  sensor_height_px: number,
): PixelCoord | null {
  const [x, y, z] = camera_point;
  if (z <= 0) return null;

  const x_film_mm = (focal_length_mm * x) / z;
  const y_film_mm = (focal_length_mm * y) / z;

  return {
    u: x_film_mm / pixel_pitch_mm + sensor_width_px / 2,
    v: y_film_mm / pixel_pitch_mm + sensor_height_px / 2,
  };
}

/**
 * Calcola i 4 corner del plate in world coordinates.
 *
 * Ordine: TL, TR, BR, BL nel frame del plate (con plate piatto sul piano X-Y
 * del proprio frame). Poi applicata trasformazione orientation → world.
 */
export function getPlateCornersWorld(setup: PlateWorldSetup): [Vec3, Vec3, Vec3, Vec3] {
  const half = setup.size_mm / 2;
  // Corner nel frame locale del plate (Z=0, piatto sul piano X-Y locale)
  const localCorners: [Vec3, Vec3, Vec3, Vec3] = [
    [-half, -half, 0], // TL
    [+half, -half, 0], // TR
    [+half, +half, 0], // BR
    [-half, +half, 0], // BL
  ];
  const orientation: Quaternion = setup.orientation ?? [0, 0, 0, 1];

  // Trasforma in world: P_world = orientation · P_local + center
  return localCorners.map(local => {
    const rotated = rotateVecByQuat(local, orientation);
    return [
      rotated[0] + setup.center[0],
      rotated[1] + setup.center[1],
      rotated[2] + setup.center[2],
    ] as Vec3;
  }) as [Vec3, Vec3, Vec3, Vec3];
}

/**
 * Proietta un singolo punto world tramite tutta la catena (world→camera→pixel)
 * e calcola in_view.
 */
export function projectWorldPoint(
  world_point: Vec3,
  camera_pose: CanonicalPose,
  camera_hw: CameraHardware,
): ProjectedPoint {
  const camera_point = worldToCamera(world_point, camera_pose);
  const pixel = projectPinhole(
    camera_point,
    camera_hw.lens.focal_length_mm,
    camera_hw.sensor.pixel_pitch_um / 1000,
    camera_hw.sensor.width_px,
    camera_hw.sensor.height_px,
  );

  const in_view =
    pixel !== null &&
    pixel.u >= 0 &&
    pixel.u <= camera_hw.sensor.width_px &&
    pixel.v >= 0 &&
    pixel.v <= camera_hw.sensor.height_px;

  return { pixel, camera_point, in_view };
}

/**
 * Check di visibilità completo del plate da una pose camera.
 */
export function checkPlateVisibility(
  camera_pose: CanonicalPose,
  plate_setup: PlateWorldSetup,
  camera_hw: CameraHardware,
  options: VisibilityCheckOptions = {},
): PlateVisibilityResult {
  const coverage_min_pct = options.coverage_min_pct ?? 10;
  const coverage_max_pct = options.coverage_max_pct ?? 25;

  const corners_world = getPlateCornersWorld(plate_setup);
  const corners = corners_world.map(p =>
    projectWorldPoint(p, camera_pose, camera_hw),
  );
  const center_proj = projectWorldPoint(plate_setup.center, camera_pose, camera_hw);

  const n_corners_visible = corners.filter(c => c.in_view).length;
  const all_corners_visible = n_corners_visible === 4;

  // Coverage: bounding box dei corner proiettati (anche se fuori sensor, finché
  // sono davanti alla camera). Se almeno un corner è dietro, coverage = 0.
  let coverage_pct = 0;
  if (corners.every(c => c.pixel !== null)) {
    const us = corners.map(c => c.pixel!.u);
    const vs = corners.map(c => c.pixel!.v);
    const bbox_w = Math.max(...us) - Math.min(...us);
    const bbox_h = Math.max(...vs) - Math.min(...vs);
    const bbox_area = bbox_w * bbox_h;
    const sensor_area = camera_hw.sensor.width_px * camera_hw.sensor.height_px;
    coverage_pct = (bbox_area / sensor_area) * 100;
  }

  const in_acceptable_coverage_range =
    all_corners_visible &&
    coverage_pct >= coverage_min_pct &&
    coverage_pct <= coverage_max_pct;

  return {
    all_corners_visible,
    n_corners_visible,
    coverage_pct,
    in_acceptable_coverage_range,
    corners,
    plate_center_px: center_proj.pixel,
  };
}

/**
 * Helper: data una distanza desiderata camera-plate, calcola un quaternione
 * camera che guarda dritto verso il plate dall'alto (nadir, asse ottico
 * verticale rivolto verso giù).
 *
 * Camera frame: Z+ forward (verso il plate sotto). Per allineare Z_camera a
 * -Z_world serve rotazione di 180° intorno X (o Y).
 *
 * Util per pose ANCHOR di default ("perpendicolare al plate") del wizard.
 */
export function nadirCameraPose(
  plate_center: Vec3,
  distance_above_mm: number,
): CanonicalPose {
  return {
    position: [
      plate_center[0],
      plate_center[1],
      plate_center[2] + distance_above_mm,
    ],
    // 180° intorno a X: inverte Z (camera guarda verso il plate sotto)
    quaternion: [1, 0, 0, 0],
  };
}