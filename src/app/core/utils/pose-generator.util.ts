/**
 * pose-generator.util.ts
 *
 * Algoritmo di generazione delle pose di calibrazione hand-eye.
 *
 * STRATEGIA: GREEDY MAXIMIN su pool di candidati casuali.
 *
 * 1. Genera N candidati (default 500) campionando uniformemente:
 *    - Posizione: nel translation box centrato sull'anchor
 *    - Orientazione: anchor + tilt random (asse uniforme su sfera, angolo nel range)
 * 2. Filtra: scarta candidati dove il plate non è visibile o coverage fuori range
 * 3. Seleziona N pose finali (anchor incluso) con greedy maximin:
 *    - Pose 0 = anchor (la "perpendicolare al plate" fornita dall'utente)
 *    - Ad ogni step, scegli il candidato che massimizza la distanza minima
 *      rispetto alle pose già selezionate
 *
 * Vantaggio: distribuzione massimamente diversa nello spazio dei parametri →
 * matrici di calibrazione hand-eye ben condizionate (Halcon non rifiuta).
 *
 * RIPRODUCIBILITÀ: dato uno stesso `seed`, l'output è identico bit-a-bit.
 * Essenziale per i test e per "rigenerare" deterministicamente.
 *
 * RAPPRESENTAZIONE: le pose generate sono CAMERA poses (origine = centro
 * ottico, Z+ asse ottico forward). In fase di pianificazione non conosciamo
 * ancora ToolInCamPose; il chiamante interpreta queste come "dove vorremmo che
 * la camera fosse" e approssima le coordinate TCP corrispondenti.
 */

import type {
  CameraHardware,
  CanonicalPose,
  PoseGeneratorConstraints,
  Quaternion,
  Vec3 as DomainVec3,
} from '../models/domain.model';
import {
  normalizeQuat,
  poseSimilarityScore,
  quatAngleDifferenceDeg,
  vec3Distance,
} from './pose-conversions.util';
import {
  checkPlateVisibility,
  type PlateWorldSetup,
} from './plate.visibility.util';
import { mat3, quat, vec3 } from 'gl-matrix';
import { computeFovLinear, computeSensorDimensions } from './camera-geometry.util';


// =============================================================================
// SEEDED RNG (Mulberry32)
// =============================================================================

/**
 * RNG seedato leggero (Mulberry32). Periodo ~2^32, distribuzione uniforme,
 * deterministico al 100%. Sufficiente per generare candidati di pose; non per
 * uso crittografico.
 */
class SeededRng {
  private state: number;

  constructor(seed: number) {
    // Forza a uint32
    this.state = (seed >>> 0) || 1;
  }

  /** Numero uniforme in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Numero uniforme in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// =============================================================================
// GEOMETRIA: orientation sampling
// =============================================================================

/**
 * Vettore unitario uniforme sulla sfera S². Algoritmo di Marsaglia.
 */
function randomUnitVector(rng: SeededRng): vec3 {
  let u1: number;
  let u2: number;
  let s: number;
  // Reject sampling: punti nel disco unitario 2D
  do {
    u1 = rng.range(-1, 1);
    u2 = rng.range(-1, 1);
    s = u1 * u1 + u2 * u2;
  } while (s >= 1 || s === 0);
  const factor = 2 * Math.sqrt(1 - s);
  return [u1 * factor, u2 * factor, 1 - 2 * s] as const;
}

/**
 * Costruisce un quaternione da rappresentazione asse-angolo.
 *
 * @param axis  Vettore unitario.
 * @param angleDeg Angolo di rotazione in gradi.
 */
function axisAngleToQuat(axis: vec3, angleDeg: number): Quaternion {
  const halfRad = (angleDeg * Math.PI) / 360; // = (deg→rad) / 2
  const sin = Math.sin(halfRad);
  return [
    axis[0] * sin,
    axis[1] * sin,
    axis[2] * sin,
    Math.cos(halfRad),
  ] as const;
}

/**
 * Moltiplicazione di quaternioni a · b (composizione di rotazioni).
 * Notazione [x, y, z, w].
 */
function quatMultiply(a: Quaternion, b: Quaternion): Quaternion {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ] as const;
}

// =============================================================================
// SAMPLING DEI CANDIDATI
// =============================================================================

/**
 * Campiona una pose candidata casuale entro i vincoli, partendo dall'anchor.
 *
 * Posizione: uniforme nel box di traslazione (anchor + delta).
 * Orientazione: anchor.quaternion · tilt_quaternion, dove tilt è una rotazione
 * di angolo uniforme in [min_tilt, max_tilt] attorno a un asse uniforme su S².
 */
function sampleCandidate(
  anchor: CanonicalPose,
  constraints: PoseGeneratorConstraints,
  rng: SeededRng,
  plateCenter: readonly [number, number, number]
): CanonicalPose {
  // 1. Campionamento sulla superficie della cupola
  const radius = constraints.dome.radius_mm;
  const azMin = constraints.dome.azimuth_range_deg[0] * Math.PI / 180;
  const azMax = constraints.dome.azimuth_range_deg[1] * Math.PI / 180;
  const elMin = Math.max(30, constraints.dome.elevation_range_deg[0]) * Math.PI / 180;
  const elMax = constraints.dome.elevation_range_deg[1] * Math.PI / 180;

  const azimuth = rng.range(azMin, azMax);
  const sinElMin = Math.sin(elMin);
  const sinElMax = Math.sin(elMax);
  const elevation = Math.asin(rng.range(sinElMin, sinElMax));

  const x = plateCenter[0] + radius * Math.cos(elevation) * Math.cos(azimuth);
  const y = plateCenter[1] + radius * Math.cos(elevation) * Math.sin(azimuth);
  const z = plateCenter[2] + radius * Math.sin(elevation);

  const position: readonly [number, number, number] = [x, y, z];

  // 2. Orientazione: LookAt verso il centro del plate
  const forward = vec3.normalize(vec3.create(), [
    plateCenter[0] - x,
    plateCenter[1] - y,
    plateCenter[2] - z
  ]);

  const worldUp = vec3.fromValues(0, 0, 1);
  const right = vec3.cross(vec3.create(), worldUp, forward);
  if (vec3.length(right) < 0.001) vec3.set(right, 1, 0, 0);
  vec3.normalize(right, right);
  const down = vec3.cross(vec3.create(), forward, right);

  const m3 = mat3.fromValues(
    right[0], right[1], right[2],
    down[0], down[1], down[2],
    forward[0], forward[1], forward[2]
  );

  // ORDINE CORRETTO: prima riempi lookAtQ dalla matrice, POI applichi roll e tilt
  const lookAtQ = quat.create();
  quat.fromMat3(lookAtQ, m3);

  // 3. Roll random attorno all'asse ottico (Z camera locale).
  // Aggiunge diversità rotazionale necessaria per qualità hand-eye Halcon.
  // Range ±90° invece di ±180° per limitare singolarità wrist del robot.
  const rollDeg = rng.range(-90, 90);
  const rollQuatLocal = axisAngleToQuat([0, 0, 1] as const, rollDeg);
  const orientationWithRoll = quatMultiply(
    [lookAtQ[0], lookAtQ[1], lookAtQ[2], lookAtQ[3]],
    rollQuatLocal
  );

  // 4. Tilt random addizionale
  const tiltAxis = randomUnitVector(rng);
  const tiltDeg = rng.range(0, constraints.tilt_range.max_deg * 0.5);
  const tiltQuatLocal = axisAngleToQuat(tiltAxis, tiltDeg);

  const finalQuat = quatMultiply(orientationWithRoll, tiltQuatLocal);

  return { position, quaternion: normalizeQuat(finalQuat) };
}

// =============================================================================
// API PUBBLICA
// =============================================================================

export interface PoseGeneratorOptions {
  /** Setup del plate nel world frame (centro, dimensione, orientamento). */
  plate_setup: PlateWorldSetup;
  /** Hardware camera per calcolo plate visibility. */
  camera_hw: CameraHardware;
  /** Seed RNG (default: 42). */
  seed?: number;
  /** Numero di candidati casuali da campionare (default: 500). */
  n_candidates?: number;
}

export interface PoseGenerationDiversityStats {
  /** Distanza traslazione minima tra qualunque coppia di pose selezionate (mm). */
  min_translation_diff_mm: number;
  /** Tilt minimo tra qualunque coppia di pose selezionate (gradi). */
  min_tilt_diff_deg: number;
  /** Distanza traslazione media tra coppie (mm). */
  avg_translation_diff_mm: number;
  /** Tilt medio tra coppie (gradi). */
  avg_tilt_diff_deg: number;
}

export interface PoseGenerationResult {
  /** Pose generate (la prima è sempre l'anchor). */
  poses: CanonicalPose[];
  /** Numero di candidati casuali generati totali. */
  n_candidates_generated: number;
  /** Numero di candidati che hanno passato il filtro plate visibility. */
  n_candidates_valid: number;
  /** True se abbiamo raggiunto `constraints.n_total_poses`. */
  reached_target: boolean;
  /** Statistiche di diversità sulle pose finali. */
  diversity_stats: PoseGenerationDiversityStats;
}

const DEFAULT_SEED = 42;
const DEFAULT_N_CANDIDATES = 2000;

/**
 * Genera N pose di calibrazione partendo dall'anchor (pose perpendicolare al
 * plate fornita dall'utente).
 *
 * L'anchor è SEMPRE inclusa come prima pose nel risultato; le altre N-1 sono
 * scelte con greedy maximin tra i candidati casuali validi.
 */
export function generateCalibrationPoses(
  anchor: CanonicalPose,
  constraints: PoseGeneratorConstraints,
  options: PoseGeneratorOptions,
): PoseGenerationResult {
  const rng = new SeededRng(options.seed ?? 42);
  const selected: CanonicalPose[] = [];
  const minTrans = constraints.min_translation_diff_mm;
  const plateCenter = options.plate_setup.center;

  // Anchor sempre prima
  selected.push(anchor);

  // --- 1. GENERAZIONE TARGET ESTREMI ---
  // Anchor (centro), 4 angoli, 4 centri-bordi del FOV. Per ogni target:
  //  - spostiamo la camera lateralmente per ottenere parallasse
  //  - ruotiamo OLTRE il lookAt-al-centro per spostare il plate verso il
  //    quadrante target del FOV (NDC u,v). Senza questa rotazione il plate
  //    apparirebbe SEMPRE al centro dell'immagine, vanificando lo scopo.
  // h,v = direzione spostamento camera nel piano del plate
  // ndcU, ndcV = posizione target del plate nel FOV (OpenCV: u→destra, v→giù)
  const extremeTargets: ReadonlyArray<{ label: string; h: number; v: number; ndcU: number; ndcV: number }> = [
    // 4 angoli
    { label: 'TL', h: -1, v: -1, ndcU: -1, ndcV: -1 },
    { label: 'TR', h:  1, v: -1, ndcU:  1, ndcV: -1 },
    { label: 'BR', h:  1, v:  1, ndcU:  1, ndcV:  1 },
    { label: 'BL', h: -1, v:  1, ndcU: -1, ndcV:  1 },
    // 4 centri-bordi
    { label: 'T',  h:  0, v: -1, ndcU:  0, ndcV: -1 },
    { label: 'R',  h:  1, v:  0, ndcU:  1, ndcV:  0 },
    { label: 'B',  h:  0, v:  1, ndcU:  0, ndcV:  1 },
    { label: 'L',  h: -1, v:  0, ndcU: -1, ndcV:  0 },
  ];

  // Pre-calcolo half-tan FOV per posizionare il plate nel NDC desiderato
  const sensor = computeSensorDimensions(
    options.camera_hw.sensor.width_px,
    options.camera_hw.sensor.height_px,
    options.camera_hw.sensor.pixel_pitch_um,
  );
  const focal = options.camera_hw.lens.focal_length_mm;
  const halfTanH = (sensor.width_mm / 2) / focal;
  const halfTanV = (sensor.height_mm / 2) / focal;

  // Magnitudine NDC iniziale (0.6 = plate posizionato al 60% verso il bordo).
  // Schedule con livelli di rigorosità decrescente, per garantire SEMPRE che
  // l'estremo entri nel set (anche se solo parzialmente visibile).
  // strict=true → richiede tutti i 4 corner del plate in FOV.
  // strict=false → accetta se centro plate visibile + ≥2 corner visibili.
  const ndcMagSchedule: ReadonlyArray<{ mag: number; strict: boolean }> = [
    { mag: 0.6,  strict: true  },
    { mag: 0.45, strict: true  },
    { mag: 0.3,  strict: true  },
    { mag: 0.2,  strict: false },
    { mag: 0.1,  strict: false },
    { mag: 0.0,  strict: false }, // ultimissimo fallback: lookAt puro, posizione comunque distinta
  ];

  for (const t of extremeTargets) {
    const [offX, offY] = getCornerOffset(t.h, t.v, options.camera_hw, constraints.dome.radius_mm);
    const targetPos: DomainVec3 = [
      anchor.position[0] + offX,
      anchor.position[1] + offY,
      anchor.position[2],
    ];

    // Skip se la posizione è troppo vicina ad anchor o estremi già accettati.
    const hasConflict = selected.some(s => vec3Distance(s.position, targetPos) < minTrans);
    if (hasConflict) continue;

    const lookAtQ = calculateLookAtQuaternion(targetPos, plateCenter);

    let accepted: CanonicalPose | null = null;
    for (const step of ndcMagSchedule) {
      const u = t.ndcU * step.mag;
      const v = t.ndcV * step.mag;
      const finalQ = composeLookAtWithNdcOffset(lookAtQ, u, v, halfTanH, halfTanV);
      const candidate: CanonicalPose = { position: targetPos, quaternion: finalQ };

      const visibility = checkPlateVisibility(candidate, options.plate_setup, options.camera_hw);
      const ok = step.strict
        ? visibility.all_corners_visible
        : (visibility.plate_center_px !== null && visibility.n_corners_visible >= 2);
      if (ok) {
        accepted = candidate;
        break;
      }
    }

    if (accepted) selected.push(accepted);
  }

  // --- 2. RIEMPIMENTO GREEDY (Pose da 6 a N) ---
  const pool: CanonicalPose[] = [];
  // Generiamo un pool molto grande di candidati validi
  for (let i = 0; i < 3000; i++) {
    const c = sampleCandidate(anchor, constraints, rng, plateCenter);
    const visibility = checkPlateVisibility(c, options.plate_setup, options.camera_hw, {
      coverage_min_pct: constraints.plate_coverage_min_pct,
      coverage_max_pct: constraints.plate_coverage_max_pct
    });
    
    if (visibility.in_acceptable_coverage_range) {
      pool.push(c);
    }
  }

  while (selected.length < constraints.n_total_poses && pool.length > 0) {
    const bestIdx = pickBestMaximinCandidate(selected, pool);
    if (bestIdx < 0) break;

    const candidate = pool.splice(bestIdx, 1)[0];

    // FILTRO RIGIDO: Se la migliore posa possibile comunque confligge, la scartiamo
    const tooClose = selected.some(s => vec3Distance(s.position, candidate.position) < minTrans);
    
    if (!tooClose) {
      selected.push(candidate);
    }
  }

  return {
    poses: selected,
    n_candidates_generated: 3000,
    n_candidates_valid: pool.length,
    reached_target: selected.length >= constraints.n_total_poses,
    diversity_stats: computeDiversityStats(selected),
  };
}

/** Helper per calcolare l'orientamento camera verso un punto (Z+ forward) */
function calculateLookAtQuaternion(source: DomainVec3, target: DomainVec3): Quaternion {
  const forward = vec3.normalize(vec3.create(), [
    target[0] - source[0],
    target[1] - source[1],
    target[2] - source[2]
  ]);
  const worldUp = vec3.fromValues(0, 0, 1);
  const right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), worldUp, forward));
  const down = vec3.cross(vec3.create(), forward, right);
  const m3 = mat3.fromValues(
    right[0], right[1], right[2],
    down[0], down[1], down[2],
    forward[0], forward[1], forward[2]
  );
  const q = quat.fromMat3(quat.create(), m3);
  return [q[0], q[1], q[2], q[3]];
}

/**
 * Compone un lookAt con una rotazione locale che porta il punto attualmente
 * al centro del frame (NDC 0,0) verso (ndcU, ndcV) nel piano immagine OpenCV.
 *
 * Convenzione: NDC u → destra, NDC v → giù. Camera frame OpenCV: X→right,
 * Y→down, Z→forward.
 *
 * Risultato: composizione finalQ = lookAtQ · rLocal, applicata come
 * rotazione *intrinseca* della camera. Dopo finalQ, un punto che prima
 * stava a (0,0) NDC apparirà a (ndcU, ndcV) NDC.
 */
function composeLookAtWithNdcOffset(
  lookAtQ: Quaternion,
  ndcU: number,
  ndcV: number,
  halfTanH: number,
  halfTanV: number,
): Quaternion {
  // Direzione (in camera-locale dopo lookAt) verso cui vogliamo che vada
  // l'attuale forward (0,0,1). NDC v positivo = giù in immagine OpenCV =
  // camera-y positivo.
  const dirX = ndcU * halfTanH;
  const dirY = ndcV * halfTanV;
  const dirZ = 1;
  const dir = vec3.normalize(vec3.create(), vec3.fromValues(dirX, dirY, dirZ));

  // Quaternione che mappa dir → (0,0,1). Così R_local^T · (0,0,1) = dir,
  // ovvero il plate (che dopo lookAt è in (0,0,d)) finisce in d·dir → NDC (u,v).
  const from = dir;
  const to = vec3.fromValues(0, 0, 1);
  const d = vec3.dot(from, to);
  let rLocal: Quaternion;
  if (d > 0.9999999) {
    rLocal = [0, 0, 0, 1];
  } else if (d < -0.9999999) {
    // 180° flip: scegli asse perpendicolare arbitrario
    rLocal = [1, 0, 0, 0];
  } else {
    const c = vec3.cross(vec3.create(), from, to);
    const s = Math.sqrt((1 + d) * 2);
    const invs = 1 / s;
    rLocal = [c[0] * invs, c[1] * invs, c[2] * invs, s * 0.5];
  }

  // finalQ = lookAtQ · rLocal (intrinseca)
  const lq = quat.fromValues(lookAtQ[0], lookAtQ[1], lookAtQ[2], lookAtQ[3]);
  const rq = quat.fromValues(rLocal[0], rLocal[1], rLocal[2], rLocal[3]);
  const out = quat.create();
  quat.multiply(out, lq, rq);
  quat.normalize(out, out);
  return [out[0], out[1], out[2], out[3]];
}

/**
 * Calcola un offset sulla cupola per forzare il plate in un angolo del FOV.
 * @param horizontal 0 = centro, -1 = sinistra, 1 = destra
 * @param vertical   0 = centro, -1 = sopra, 1 = sotto
 */
function getCornerOffset(horizontal: number, vertical: number, camera: CameraHardware, radius: number): [number, number] {
  const sensor = computeSensorDimensions(camera.sensor.width_px, camera.sensor.height_px, camera.sensor.pixel_pitch_um);
  const fov = computeFovLinear(sensor, camera.lens.focal_length_mm, radius);
  
  // Spostiamo la camera del 35% del FOV per portare il plate verso l'angolo
  const offsetX = horizontal * (fov.width_mm * 0.35);
  const offsetY = vertical * (fov.height_mm * 0.35);
  return [offsetX, offsetY];
}

/**
 * Rigenera le pose RIMANENTI mantenendo fisse quelle già confermate.
 *
 * Caso d'uso: il robottista ha tentato le prime K pose (OK / KO / override).
 * Le pose successive (K+1...N) vanno ricalcolate sulla base delle prime K
 * effettivamente confermate (incluse eventuali coordinate "actual" diverse
 * dal piano originale).
 *
 * @param fixedPoses Pose già confermate (devono includere l'anchor in posizione 0).
 */
export function regenerateRemainingPoses(
  fixedPoses: CanonicalPose[],
  constraints: PoseGeneratorConstraints,
  options: PoseGeneratorOptions,
): PoseGenerationResult {
  if (fixedPoses.length === 0) {
    throw new Error('regenerateRemainingPoses: fixedPoses cannot be empty (anchor required)');
  }
  if (fixedPoses.length >= constraints.n_total_poses) {
    return {
      poses: fixedPoses.slice(),
      n_candidates_generated: 0,
      n_candidates_valid: 0,
      reached_target: true,
      diversity_stats: computeDiversityStats(fixedPoses),
    };
  }

  const anchor = fixedPoses[0];
  const seed = options.seed ?? DEFAULT_SEED;
  const n_candidates = options.n_candidates ?? DEFAULT_N_CANDIDATES;
  const rng = new SeededRng(seed);

  // 1. Genera candidati basati sull'anchor
  const allCandidates: CanonicalPose[] = [];
  for (let i = 0; i < n_candidates; i++) {
    allCandidates.push(sampleCandidate(anchor, constraints, rng, options.plate_setup.center));
  }

  // 2. Filtra per plate visibility
  const validCandidates: CanonicalPose[] = [];
  for (const candidate of allCandidates) {
    const visibility = checkPlateVisibility(
      candidate,
      options.plate_setup,
      options.camera_hw,
      {
        coverage_min_pct: constraints.plate_coverage_min_pct,
        coverage_max_pct: constraints.plate_coverage_max_pct,
      },
    );
    if (visibility.in_acceptable_coverage_range) {
      validCandidates.push(candidate);
    }
  }

  // 2b. HARD FILTER: Distanza minima da TUTTE le pose fisse (per evitare collisioni al 100%)
  const filteredCandidates = validCandidates.filter(c => {
    return fixedPoses.every(fixed => vec3Distance(c.position, fixed.position) >= constraints.min_translation_diff_mm);
  });

  // 3. Greedy maximin
  const selected = fixedPoses.slice();
  let pool = filteredCandidates.slice();

  while (
    selected.length < constraints.n_total_poses &&
    pool.length > 0
  ) {
    const bestIdx = pickBestMaximinCandidate(selected, pool);
    if (bestIdx < 0) break;

    const candidate = pool[bestIdx];
    pool.splice(bestIdx, 1);

    const tooClose = selected.some(
      (s) => vec3Distance(s.position, candidate.position) < constraints.min_translation_diff_mm,
    );

    if (!tooClose) {
      selected.push(candidate);
    }
  }
  
  return {
    poses: selected,
    n_candidates_generated: allCandidates.length,
    n_candidates_valid: filteredCandidates.length + fixedPoses.length,
    reached_target: selected.length >= constraints.n_total_poses,
    diversity_stats: computeDiversityStats(selected),
  };
}

// =============================================================================
// GREEDY MAXIMIN CORE
// =============================================================================

/**
 * Selezione greedy maximin: prende l'anchor come pose 0, poi ad ogni iterazione
 * aggiunge il candidato che massimizza la distanza minima rispetto alle pose
 * già selezionate.
 */
function selectGreedyMaximin(
  anchor: CanonicalPose,
  candidatesPool: CanonicalPose[],
  n_target: number,
  minTransMm: number,
): CanonicalPose[] {
  const pool = candidatesPool.slice();
  const selected: CanonicalPose[] = [anchor];

  while (selected.length < n_target && pool.length > 0) {
    const bestIdx = pickBestMaximinCandidate(selected, pool);
    if (bestIdx < 0) break;

    const candidate = pool[bestIdx];
    pool.splice(bestIdx, 1); // rimuoviamo sempre dal pool, anche se scartata

    // HARD FILTER: distanza minima rispetto a TUTTE le pose già selezionate
    const tooClose = selected.some(
      (s) => vec3Distance(s.position, candidate.position) < minTransMm,
    );

    if (!tooClose) {
      selected.push(candidate);
    }
    // se tooClose, scartiamo e continuiamo a cercare nel pool
  }

  return selected;
}

/**
 * Restituisce l'indice del candidato che ha la distanza minima MASSIMA rispetto
 * al set già selezionato. -1 se il pool è vuoto.
 */
function pickBestMaximinCandidate(
  selected: CanonicalPose[],
  pool: readonly CanonicalPose[],
): number {
  if (pool.length === 0) return -1;

  let bestIdx = -1;
  let bestMinDist = -Infinity;

  for (let i = 0; i < pool.length; i++) {
    let minDist = Infinity;
    for (const s of selected) {
      const dist = poseSimilarityScore(s, pool[i]);
      if (dist < minDist) minDist = dist;
    }
    if (minDist > bestMinDist) {
      bestMinDist = minDist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

// =============================================================================
// STATS
// =============================================================================

function computeDiversityStats(
  poses: readonly CanonicalPose[],
): PoseGenerationDiversityStats {
  if (poses.length < 2) {
    return {
      min_translation_diff_mm: 0,
      min_tilt_diff_deg: 0,
      avg_translation_diff_mm: 0,
      avg_tilt_diff_deg: 0,
    };
  }

  let minTrans = Infinity;
  let minTilt = Infinity;
  let sumTrans = 0;
  let sumTilt = 0;
  let nPairs = 0;

  for (let i = 0; i < poses.length; i++) {
    for (let j = i + 1; j < poses.length; j++) {
      const dTrans = vec3Distance(poses[i].position, poses[j].position);
      const dTilt = quatAngleDifferenceDeg(
        poses[i].quaternion,
        poses[j].quaternion,
      );
      if (dTrans < minTrans) minTrans = dTrans;
      if (dTilt < minTilt) minTilt = dTilt;
      sumTrans += dTrans;
      sumTilt += dTilt;
      nPairs++;
    }
  }

  return {
    min_translation_diff_mm: minTrans,
    min_tilt_diff_deg: minTilt,
    avg_translation_diff_mm: sumTrans / nPairs,
    avg_tilt_diff_deg: sumTilt / nPairs,
  };
}

// =============================================================================
// HELPER: default constraints
// =============================================================================

/**
 * Constraint di default per calibrazione production (20 pose):
 *  - Translation box: ±50cm XY, ±10cm Z
 *  - Tilt: 20° min — 60° max rispetto all'anchor
 *  - Coverage plate: 10-25% area FOV (target 16.67% = 1/6)
 */
export const DEFAULT_PRODUCTION_CONSTRAINTS: PoseGeneratorConstraints = {
  n_total_poses: 20,
  dome: {
    radius_mm: 600,
    azimuth_range_deg: [0, 360],
    elevation_range_deg: [20, 85],
  },
  min_translation_diff_mm: 150,
  min_rotation_diff_deg: 30,
  tilt_range: {
    max_deg: 25,
    min_diff_between_poses_deg: 0,
  },
  plate_coverage_target_pct: 100 / 6,
  plate_coverage_min_pct: 5,   // Abbassato per non segare pose lontane
  plate_coverage_max_pct: 60,  // Alzato al 60% per tollerare plate grossi a distanze brevi
};
/** Constraint per setup veloce in laboratorio (5 pose minime). */
export const DEFAULT_LAB_CONSTRAINTS: PoseGeneratorConstraints = {
  ...DEFAULT_PRODUCTION_CONSTRAINTS,
  n_total_poses: 5,
};

/** Constraint esteso (30 pose, per setup critici o lunghi). */
export const DEFAULT_EXTENDED_CONSTRAINTS: PoseGeneratorConstraints = {
  ...DEFAULT_PRODUCTION_CONSTRAINTS,
  n_total_poses: 30,
};