import type { CameraHardware, CanonicalPose, PlateWorldSetup } from '../models/domain.model';
import { quatToZyxIntrinsic, vec3Distance } from './pose-conversions.util';

export interface PoseValidationMetrics {
  minTranslationToAnyPoseMm: number;
  minRotationToAnyPoseDeg: number;
  coveragePct: number;
  distanceToPlateMm: number;
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  suggestion: string;
}

export interface PoseValidationResult {
  isValid: boolean;
  metrics: PoseValidationMetrics;
  issues: ValidationIssue[];
}

function wrapAngleDiff(a: number, b: number): number {
  let diff = (a - b) % 360;
  if (diff > 180) diff -= 360;
  if (diff <= -180) diff += 360;
  return Math.abs(diff);
}

export function validateCalibrationPose(
  pose: CanonicalPose,
  allPoses: CanonicalPose[],
  currentIndex: number,
  plate: PlateWorldSetup,
  camera: CameraHardware,
  minTransMm: number, // <-- INIETTATO DALLA UI
  minRotDeg: number,  // <-- INIETTATO DALLA UI
  isAnchor: boolean = false
): PoseValidationResult {
  const issues: ValidationIssue[] = [];
  
  const distanceToPlateMm = vec3Distance(pose.position, plate.center);

  const sensorW = camera.sensor.width_px * (camera.sensor.pixel_pitch_um / 1000);
  const sensorH = camera.sensor.height_px * (camera.sensor.pixel_pitch_um / 1000);
  const fovAreaMm2 = ((sensorW * distanceToPlateMm) / camera.lens.focal_length_mm) * ((sensorH * distanceToPlateMm) / camera.lens.focal_length_mm);
  const coveragePct = ((plate.size_mm * plate.size_mm) / fovAreaMm2) * 100;

  let minTranslationToAnyPoseMm = Infinity;
  let minRotationToAnyPoseDeg = Infinity;
  let closestPoseIndex = -1;
  let isTooSimilar = false;
  let similarityReason = '';

  for (let i = 0; i < allPoses.length; i++) {
    if (i === currentIndex) continue;
    const other = allPoses[i];

    const dx = Math.abs(pose.position[0] - other.position[0]);
    const dy = Math.abs(pose.position[1] - other.position[1]);
    const dz = Math.abs(pose.position[2] - other.position[2]);
    const maxTrans = Math.max(dx, dy, dz);

    const eulerPose = quatToZyxIntrinsic(pose.quaternion);
    const eulerOther = quatToZyxIntrinsic(other.quaternion);
    const dRx = wrapAngleDiff(eulerPose[2], eulerOther[2]);
    const dRy = wrapAngleDiff(eulerPose[1], eulerOther[1]);
    const dRz = wrapAngleDiff(eulerPose[0], eulerOther[0]);
    const maxRot = Math.max(dRx, dRy, dRz);

    if (maxTrans < minTranslationToAnyPoseMm) minTranslationToAnyPoseMm = maxTrans;
    if (maxRot < minRotationToAnyPoseDeg) minRotationToAnyPoseDeg = maxRot;

    // Uso i parametri dinamici invece di 500 e 30
    const transLacking = maxTrans < minTransMm;
    const rotLacking = maxRot < minRotDeg;

    if (transLacking || rotLacking) {
      isTooSimilar = true;
      closestPoseIndex = i;
      
      if (transLacking && rotLacking) {
        similarityReason = `Manca traslazione (${maxTrans.toFixed(0)} < ${minTransMm}mm) e rotazione (${maxRot.toFixed(1)} < ${minRotDeg}°).`;
      } else if (transLacking) {
        similarityReason = `Manca traslazione (${maxTrans.toFixed(0)} < ${minTransMm}mm). Rotazione OK.`;
      } else {
        similarityReason = `Manca rotazione (${maxRot.toFixed(1)} < ${minRotDeg}°). Traslazione OK.`;
      }
    }
  }

  if (allPoses.length <= 1) {
    minTranslationToAnyPoseMm = 0;
    minRotationToAnyPoseDeg = 0;
  }

  if (isTooSimilar && !isAnchor) {
    issues.push({
      type: 'error',
      message: `Conflitto con Pose ${closestPoseIndex}.`,
      suggestion: similarityReason
    });
  }

  const zClearance = pose.position[2] - plate.center[2];
  // Controllo Z invariato, garantisce che non andiamo "sotto terra" o sbattiamo sul plate
  if (zClearance < 150) {
    issues.push({
      type: 'error',
      message: `Z Clearance critica (${zClearance.toFixed(0)}mm).`,
      suggestion: 'Alza immediatamente la coordinata Z.'
    });
  }

  return {
    isValid: !issues.some(i => i.type === 'error'),
    metrics: { minTranslationToAnyPoseMm, minRotationToAnyPoseDeg, coveragePct, distanceToPlateMm },
    issues
  };
}