/**
 * pose-conversions.util.ts
 *
 * Conversioni bidirezionali tra rappresentazione canonica interna (quaternione +
 * vec3) e i formati nativi dei 4 controller robot supportati.
 *
 * RAPPRESENTAZIONE CANONICA (interna):
 *   - position: [X, Y, Z] in mm
 *   - quaternion: [qx, qy, qz, qw] (scalare per ULTIMO, normalizzato)
 *
 * CONVENZIONI CONTROLLER (validate con Gateway Nazar Gem + manuali vendor):
 *
 *   ABB    → quaternione [q1, q2, q3, q4] dove q1=w (scalare PER PRIMO).
 *            Solo permutazione dalla canonica.
 *
 *   Comau  → ZYZ INTRINSECO (Proper Euler), angoli [A, E, R] in gradi.
 *            R_total = Rz(A) · Ry(E) · Rz(R)
 *            Range PDL2: A ∈ [-180°, 180°], E ∈ [0°, 180°], R ∈ [-180°, 180°].
 *            Gimbal lock quando E = 0° o 180° → A e R diventano accoppiati;
 *            convenzione: fissiamo R = 0 in quel caso.
 *
 *   Fanuc  → XYZ ESTRINSECO (rotazioni intorno agli assi del WORLD),
 *            angoli [W, P, R] in gradi.
 *            R_total = Rz(R) · Ry(P) · Rx(W)
 *            ↳ identità: XYZ estrinseco ≡ ZYX intrinseco, usata via gl-matrix
 *              order 'zyx'.
 *
 *   Kuka   → ZYX INTRINSECO (assi mobili del body), angoli [A, B, C] in gradi.
 *            R_total = Rz(A) · Ry(B) · Rx(C)
 *
 * NOTE IMPLEMENTATIVE:
 * - `quat.fromEuler` di gl-matrix supporta solo sequenze Tait-Bryan (3 assi
 *   distinti). Per Comau ZYZ (Proper Euler) implementiamo a mano.
 * - `quat.getEuler` di gl-matrix non è esposto nei tipi TypeScript dei pacchetti
 *   correnti; implementiamo a mano sia ZYZ che ZYX intrinseco per robustezza.
 * - Per Comau, A e R sono wrappati nel range [-180°, 180°] per conformità PDL2.
 */

import { quat } from 'gl-matrix';

import type {
  ABBPose,
  CanonicalPose,
  ComauPose,
  ControllerPose,
  FanucPose,
  KukaPose,
  Quaternion,
  RobotControllerType,
  Vec3,
} from '../models/domain.model';


// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const GIMBAL_EPSILON = 1e-6;

function fromGlQuat(q: quat): Quaternion {
  return [q[0], q[1], q[2], q[3]] as const;
}

function toGlQuat(q: Quaternion): quat {
  return quat.fromValues(q[0], q[1], q[2], q[3]);
}

function copyVec3(v: Vec3): Vec3 {
  return [v[0], v[1], v[2]] as const;
}

/**
 * Wrappa un angolo in gradi nel range (-180°, 180°].
 * Usato per A e R di Comau (PDL2 limita questi a [-180, 180]).
 */
function wrapAngleDeg(angle: number): number {
  let a = angle % 360;
  if (a > 180) a -= 360;
  else if (a <= -180) a += 360;
  return a;
}

// =============================================================================
// CUSTOM EULER EXTRACTORS
// =============================================================================

/**
 * Estrae angoli ZYX intrinseco da quaternione canonico.
 * R = Rz(α) · Ry(β) · Rx(γ)
 *
 * Usato per Kuka ABC (direttamente) e Fanuc WPR (con mapping diverso).
 *
 * Ritorna [α=rotZ, β=rotY, γ=rotX] in GRADI.
 * Range output: α ∈ (-180°, 180°], β ∈ [-90°, 90°], γ ∈ (-180°, 180°].
 */
export function quatToZyxIntrinsic(q: Quaternion): [number, number, number] {
  const [qx, qy, qz, qw] = q;

  const sinBeta = Math.max(-1, Math.min(1, 2 * (qw * qy - qx * qz)));
  const beta = Math.asin(sinBeta);

  let alpha: number;
  let gamma: number;

  if (Math.abs(sinBeta) >= 1 - GIMBAL_EPSILON) {
    alpha = 0;
    const sign = sinBeta > 0 ? 1 : -1;
    gamma = sign * Math.atan2(
      2 * (qx * qy - qw * qz),
      1 - 2 * (qx * qx + qz * qz),
    );
  } else {
    alpha = Math.atan2(
      2 * (qx * qy + qw * qz),
      1 - 2 * (qy * qy + qz * qz),
    );
    gamma = Math.atan2(
      2 * (qy * qz + qw * qx),
      1 - 2 * (qx * qx + qy * qy),
    );
  }

  return [alpha * RAD2DEG, beta * RAD2DEG, gamma * RAD2DEG];
}

/**
 * Estrae angoli ZYZ intrinseco (Comau A/E/R) da quaternione canonico.
 * R = Rz(A) · Ry(E) · Rz(R)
 *
 * Formule:
 *   qx = sin(E/2) · sin((A-R)/2)
 *   qy = sin(E/2) · cos((A-R)/2)
 *   qz = cos(E/2) · sin((A+R)/2)
 *   qw = cos(E/2) · cos((A+R)/2)
 *
 * Ritorna [A, E, R] in gradi, con:
 *   - E ∈ [0°, 180°] (naturale da atan2 con argomenti ≥ 0)
 *   - A, R ∈ (-180°, 180°] (wrappati esplicitamente per conformità PDL2)
 */
function quatToZyz(q: Quaternion): [number, number, number] {
  const [qx, qy, qz, qw] = q;

  const sinHalfE = Math.sqrt(qx * qx + qy * qy);
  const cosHalfE = Math.sqrt(qz * qz + qw * qw);
  const eRad = 2 * Math.atan2(sinHalfE, cosHalfE);

  let aRad: number;
  let rRad: number;

  if (sinHalfE < GIMBAL_EPSILON) {
    // E ≈ 0: convenzione R = 0, tutto in A.
    rRad = 0;
    aRad = 2 * Math.atan2(qz, qw);
  } else if (cosHalfE < GIMBAL_EPSILON) {
    // E ≈ 180°: convenzione R = 0.
    rRad = 0;
    aRad = 2 * Math.atan2(qx, qy);
  } else {
    const sumHalf = Math.atan2(qz, qw); // (A+R)/2
    const diffHalf = Math.atan2(qx, qy); // (A-R)/2
    aRad = sumHalf + diffHalf;
    rRad = sumHalf - diffHalf;
  }

  // Wrap A e R nel range PDL2 [-180°, 180°]. E è già in [0°, 180°].
  return [
    wrapAngleDeg(aRad * RAD2DEG),
    eRad * RAD2DEG,
    wrapAngleDeg(rRad * RAD2DEG),
  ];
}

/**
 * Quaternione canonico da angoli ZYZ intrinseco (Comau A/E/R) in gradi.
 */
function zyzToQuat(aDeg: number, eDeg: number, rDeg: number): Quaternion {
  const aRad = aDeg * DEG2RAD;
  const eRad = eDeg * DEG2RAD;
  const rRad = rDeg * DEG2RAD;

  const halfE = eRad / 2;
  const sumHalf = (aRad + rRad) / 2;
  const diffHalf = (aRad - rRad) / 2;

  const sinHalfE = Math.sin(halfE);
  const cosHalfE = Math.cos(halfE);

  return [
    sinHalfE * Math.sin(diffHalf), // qx
    sinHalfE * Math.cos(diffHalf), // qy
    cosHalfE * Math.sin(sumHalf),  // qz
    cosHalfE * Math.cos(sumHalf),  // qw
  ] as const;
}

// =============================================================================
// ABB
// =============================================================================

export function abbToCanonical(abb: ABBPose): CanonicalPose {
  const [q1, q2, q3, q4] = abb.rot;
  return {
    position: copyVec3(abb.trans),
    quaternion: [q2, q3, q4, q1] as const,
  };
}

export function canonicalToAbb(c: CanonicalPose): ABBPose {
  const [qx, qy, qz, qw] = c.quaternion;
  return {
    type: 'ABB',
    trans: copyVec3(c.position),
    rot: [qw, qx, qy, qz] as const,
  };
}

// =============================================================================
// COMAU — ZYZ intrinseco (A, E, R)
// =============================================================================

export function comauToCanonical(c: ComauPose): CanonicalPose {
  const [a, e, r] = c.aer;
  return {
    position: copyVec3(c.position),
    quaternion: zyzToQuat(a, e, r),
  };
}

export function canonicalToComau(c: CanonicalPose): ComauPose {
  const [a, e, r] = quatToZyz(c.quaternion);
  return {
    type: 'Comau',
    position: copyVec3(c.position),
    aer: [a, e, r] as const,
  };
}

// =============================================================================
// FANUC — WPR (XYZ estrinseco ≡ ZYX intrinseco)
// =============================================================================

export function fanucToCanonical(c: FanucPose): CanonicalPose {
  const [w, p, r] = c.wpr;
  const q = quat.create();
  quat.fromEuler(q, w, p, r, 'zyx');
  return {
    position: copyVec3(c.position),
    quaternion: fromGlQuat(q),
  };
}

export function canonicalToFanuc(c: CanonicalPose): FanucPose {
  const [alpha, beta, gamma] = quatToZyxIntrinsic(c.quaternion);
  return {
    type: 'Fanuc',
    position: copyVec3(c.position),
    wpr: [gamma, beta, alpha] as const,
  };
}

// =============================================================================
// KUKA — ABC (ZYX intrinseco)
// =============================================================================

export function kukaToCanonical(c: KukaPose): CanonicalPose {
  const [a, b, cAngle] = c.abc;
  const q = quat.create();
  quat.fromEuler(q, cAngle, b, a, 'zyx');
  return {
    position: copyVec3(c.position),
    quaternion: fromGlQuat(q),
  };
}

export function canonicalToKuka(c: CanonicalPose): KukaPose {
  const [alpha, beta, gamma] = quatToZyxIntrinsic(c.quaternion);
  return {
    type: 'Kuka',
    position: copyVec3(c.position),
    abc: [alpha, beta, gamma] as const,
  };
}

// =============================================================================
// DISPATCHER
// =============================================================================

export function controllerPoseToCanonical(p: ControllerPose): CanonicalPose {
  switch (p.type) {
    case 'ABB':   return abbToCanonical(p);
    case 'Comau': return comauToCanonical(p);
    case 'Fanuc': return fanucToCanonical(p);
    case 'Kuka':  return kukaToCanonical(p);
  }
}

export function canonicalToControllerPose(
  c: CanonicalPose,
  type: RobotControllerType,
): ControllerPose {
  switch (type) {
    case 'ABB':   return canonicalToAbb(c);
    case 'Comau': return canonicalToComau(c);
    case 'Fanuc': return canonicalToFanuc(c);
    case 'Kuka':  return canonicalToKuka(c);
  }
}

// =============================================================================
// UTILS QUATERNION / VEC3
// =============================================================================

export function normalizeQuat(q: Quaternion): Quaternion {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (len < 1e-10) return [0, 0, 0, 1] as const;
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len] as const;
}

export function quatAngleDifferenceDeg(q1: Quaternion, q2: Quaternion): number {
  const dot =
    q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
  const absDot = Math.min(1.0, Math.abs(dot));
  return (2 * Math.acos(absDot) * 180) / Math.PI;
}

export function vec3Distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function poseSimilarityScore(
  a: CanonicalPose,
  b: CanonicalPose,
  weightTrans = 1.0,
  weightRot = 10.0,
): number {
  const dTrans = vec3Distance(a.position, b.position);
  const dRot = quatAngleDifferenceDeg(a.quaternion, b.quaternion);
  return Math.sqrt(
    weightTrans * weightTrans * dTrans * dTrans +
    weightRot   * weightRot   * dRot   * dRot,
  );
}

/**
 * Ruota un vettore 3D applicando un quaternione (rotazione attiva).
 * Formula ottimizzata: v' = v + 2·qw·(q.xyz × v) + 2·(q.xyz × (q.xyz × v))
 *
 * Esportata perché serve anche al modulo plate-visibility per trasformare
 * punti dal world frame al camera frame.
 */
export function rotateVecByQuat(v: Vec3, q: Quaternion): Vec3 {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;

  // t = 2 · (q.xyz × v)
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);

  // v' = v + qw·t + (q.xyz × t)
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ] as const;
}

/**
 * Coniugato di un quaternione unitario (= inverso per quaternioni unitari).
 * Esportato per uso in trasformazioni inverse (world → camera frame).
 */
export function conjugateQuat(q: Quaternion): Quaternion {
  return [-q[0], -q[1], -q[2], q[3]] as const;
}