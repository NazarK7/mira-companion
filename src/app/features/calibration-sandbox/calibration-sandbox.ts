import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { quat } from 'gl-matrix';

import type {
  CalibrationPoseStatus,
  CameraHardware,
  CanonicalPose,
  PlateWorldSetup,
  Quaternion
} from '../../core/models/domain.model';
import { ThreeViewer } from '../../shared/components/three-viewer/three-viewer';
import { parseAbbRapidTargets } from '../../core/utils/abb-parser.util';
import { abbToCanonical, quatToZyxIntrinsic } from '../../core/utils/pose-conversions.util';
import { validateCalibrationPose, type PoseValidationResult } from '../../core/utils/pose-validation.util';

interface SandboxPoseEntry {
  readonly index: number;
  readonly label: string;
  readonly status: CalibrationPoseStatus | string;
  readonly pose: CanonicalPose;
  readonly validation: PoseValidationResult;
}

const SANDBOX_CAMERA: CameraHardware = {
  model: 'Matrox Iris GTR',
  sensor: { width_px: 2448, height_px: 2048, pixel_pitch_um: 3.45 },
  lens: { focal_length_mm: 12, aperture_min_f: 2.8 },
};

const RAW_ABB_POSES = `
  VAR robtarget pCalib1:=[[1227.53,1502.73,735.27],[0.127076,-0.0342972,0.988669,-0.0721781],[0,-1,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib2:=[[2636.86,989.60,603.84],[0.0381502,0.905414,-0.38453,-0.175803],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib3:=[[1142.86,1016.13,663.94],[0.175836,-0.0565023,0.982405,0.0277442],[0,-1,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib4:=[[2473.40,814.06,889.13],[0.20417,-0.964762,0.162828,0.032191],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib5:=[[1105.38,1163.83,605.95],[0.206906,-0.342704,0.911437,-0.095013],[0,-1,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib6:=[[2071.53,1236.85,954.85],[0.0432872,-0.987006,-0.125654,-0.0903088],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib7:=[[2050.37,1084.24,839.66],[0.257237,0.546316,-0.794547,-0.0637414],[0,0,-1,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib8:=[[2378.01,1102.82,756.43],[0.23727,-0.885374,-0.397479,0.0427253],[0,0,-3,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib9:=[[2079.63,1102.96,745.62],[0.154493,0.844343,-0.513047,6.38525E-05],[0,-1,-1,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib10:=[[1970.98,525.71,579.00],[0.241966,-0.709188,0.65601,0.0903139],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib11:=[[2012.96,1190.01,940.39],[0.0988611,-0.109432,-0.988954,0.014857],[0,0,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib12:=[[2251.69,448.30,342.71],[0.2136,-0.844383,0.411801,0.26798],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib13:=[[2019.91,1147.23,830.30],[0.128703,0.017721,-0.984108,0.121048],[0,-1,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib14:=[[1996.04,1187.83,890.72],[0.00270668,-0.984815,0.12738,-0.117924],[0,-1,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib15:=[[1764.64,447.29,482.98],[0.0684845,-0.417954,0.834146,0.353306],[0,0,-1,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib16:=[[1921.86,1283.19,775.12],[0.121532,0.965359,0.195473,0.122889],[0,-1,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib17:=[[2490.79,551.45,360.19],[0.179382,-0.808406,0.482995,0.284636],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib18:=[[1767.01,753.53,660.14],[0.213144,-0.75289,0.622604,0.00955414],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib19:=[[2100.05,1270.10,948.46],[0.0516894,-0.992903,-0.0990728,-0.0407076],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
  VAR robtarget pCalib20:=[[2127.19,727.74,676.41],[0.0391581,0.706984,-0.679955,-0.190529],[0,0,-1,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
`;

const STATUS_LABELS: Record<string, string> = {
  'planned': 'Planned',
  'in-progress': 'In progress',
  'ok': 'OK',
  'ok-with-override': 'OK override',
  'ko-unreachable': 'KO unreachable',
  'ko-not-recognized': 'KO not recognized',
  'skipped': 'Skipped',
  'invalid': 'Invalid (Conflict)'
};

@Component({
  selector: 'app-calibration-sandbox',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    ThreeViewer,
  ],
  templateUrl: './calibration-sandbox.html',
  styleUrl: './calibration-sandbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalibrationSandboxComponent {
  protected readonly cameraHardware = SANDBOX_CAMERA;

  private readonly backupPoses = parseAbbRapidTargets(RAW_ABB_POSES).map(p => abbToCanonical(p));

  protected readonly poses = signal<CanonicalPose[]>([...this.backupPoses]);
  protected readonly poseStatuses = signal<CalibrationPoseStatus[]>(new Array(20).fill('planned'));

  protected readonly editingPoseIndex = signal<number | null>(null);

  // STATO LOCALE PER BYPASSARE IL SALTO EULERO
  // Mantiene il valore crudo digitato dall'utente durante l'edit
  protected readonly editingEuler = signal<[number, number, number] | null>(null);

  protected readonly validationMinTransMm = signal<number>(400); // Valore di default più sensato
  protected readonly validationMinRotDeg = signal<number>(30);

  protected readonly showGrid = signal(true);
  protected readonly showAxisHelper = signal(true);
  protected readonly showOrigin = signal(true);
  protected readonly selectedPoseIndex = signal<number | null>(0);

  protected readonly plateSetup = computed<PlateWorldSetup>(() => {
    const currentPoses = this.poses();
    if (currentPoses.length === 0) return { center: [0, 0, 0], size_mm: 250 };

    let sumX = 0, sumY = 0, sumZ = 0;
    for (const p of currentPoses) {
      sumX += p.position[0];
      sumY += p.position[1];
      sumZ += p.position[2];
    }
    const avgX = sumX / currentPoses.length;
    const avgY = sumY / currentPoses.length;
    const minZ = Math.min(...currentPoses.map(p => p.position[2]));
    const plateZ = Math.max(0, minZ - 800);

    return { center: [avgX, avgY, plateZ], size_mm: 250 };
  });

  protected readonly poseEntries = computed<SandboxPoseEntry[]>(() => {
    const currentPoses = this.poses();
    const statuses = this.poseStatuses();
    const plate = this.plateSetup();
    const cam = this.cameraHardware;

    // Leggiamo i signal qui, così l'update degli slider scatena il ricalcolo istantaneo
    const minTrans = this.validationMinTransMm();
    const minRot = this.validationMinRotDeg();

    if (currentPoses.length === 0) return [];

    return currentPoses.map((pose, index) => {
      const isAnchor = index === 0;

      // Passiamo i nuovi parametri alla pure function
      const validation = validateCalibrationPose(
        pose, currentPoses, index, plate, cam, minTrans, minRot, isAnchor
      );

      let effectiveStatus: string = statuses[index] ?? 'planned';
      if (effectiveStatus === 'planned' && !validation.isValid) {
        effectiveStatus = 'invalid';
      }

      return {
        index,
        label: isAnchor ? 'Anchor' : `Pose ${index}`,
        status: effectiveStatus,
        pose,
        validation
      };
    });
  });

  protected readonly selectedPose = computed(() => {
    const index = this.selectedPoseIndex();
    return index === null ? null : this.poseEntries()[index] ?? null;
  });

  protected readonly conflictPose = computed<SandboxPoseEntry | null>(() => {
    const pose = this.selectedPose();
    if (!pose || pose.validation.isValid) return null;

    const conflictIssue = pose.validation.issues.find(i => i.message.includes('Conflitto'));
    if (!conflictIssue) return null;

    const match = conflictIssue.message.match(/Pose (\d+)/);
    if (match && match[1]) {
      const conflictIndex = parseInt(match[1], 10);
      return this.poseEntries()[conflictIndex] ?? null;
    }
    return null;
  });

  protected readonly conflictPoseIndex = computed<number | null>(() => {
    return this.conflictPose()?.index ?? null;
  });

  protected readonly selectedPoseEuler = computed(() => {
    const isEditing = this.editingPoseIndex() !== null;
    const currentEulerValues = this.editingEuler();

    if (isEditing && currentEulerValues) {
      return currentEulerValues;
    }

    const pose = this.selectedPose();
    if (!pose) return [0, 0, 0];

    // Invertiamo l'output [Rz, Ry, Rx] per mappare [Rx, Ry, Rz] sulla UI
    const [rz, ry, rx] = quatToZyxIntrinsic(pose.pose.quaternion);
    return [rx, ry, rz];
  });

  protected readonly selectedQuaternionText = computed(() => {
    const pose = this.selectedPose();
    if (!pose) return '—';
    return pose.pose.quaternion.map(value => value.toFixed(3)).join(', ');
  });

  protected readonly selectedStatusLabel = computed(() => {
    const pose = this.selectedPose();
    return pose ? STATUS_LABELS[pose.status] || pose.status : 'No selection';
  });

  protected selectPose(index: number): void {
    if (this.editingPoseIndex() !== null && this.editingPoseIndex() !== index) {
      this.cancelEdit(this.editingPoseIndex()!);
    }
    this.selectedPoseIndex.set(index);
  }

  protected toggleGrid(): void { this.showGrid.update(v => !v); }
  protected toggleAxisHelper(): void { this.showAxisHelper.update(v => !v); }
  protected toggleOrigin(): void { this.showOrigin.update(v => !v); }

  protected markStatus(index: number, status: CalibrationPoseStatus): void {
    this.poseStatuses.update(s => {
      const copy = [...s];
      copy[index] = status;
      return copy;
    });
  }

  protected startEdit(index: number): void {
    this.editingPoseIndex.set(index);
    // Estrae e inverte per salvare lo stato locale in [Rx, Ry, Rz]
    const [rz, ry, rx] = quatToZyxIntrinsic(this.poses()[index].quaternion);
    this.editingEuler.set([rx, ry, rz]);
  }

  protected cancelEdit(index: number): void {
    this.poses.update(p => {
      const copy = [...p];
      copy[index] = { ...this.backupPoses[index] };
      return copy;
    });
    this.editingEuler.set(null);
    this.markStatus(index, 'planned');
    this.editingPoseIndex.set(null);
  }

  protected saveOverride(index: number): void {
    this.editingEuler.set(null);
    this.markStatus(index, 'ok-with-override');
    this.editingPoseIndex.set(null);
  }

  protected liveUpdatePosition(index: number, xStr: string, yStr: string, zStr: string): void {
    const x = parseFloat(xStr);
    const y = parseFloat(yStr);
    const z = parseFloat(zStr);
    if (isNaN(x) || isNaN(y) || isNaN(z)) return;

    this.poses.update(p => {
      const copy = [...p];
      copy[index] = { ...copy[index], position: [x, y, z] };
      return copy;
    });
  }

  protected liveUpdateRotation(index: number, rxStr: string, ryStr: string, rzStr: string): void {
    const rx = parseFloat(rxStr);
    const ry = parseFloat(ryStr);
    const rz = parseFloat(rzStr);
    if (isNaN(rx) || isNaN(ry) || isNaN(rz)) return;

    // Salva il raw digitato dall'utente per la UI
    this.editingEuler.set([rx, ry, rz]);

    // Spingi in memoria e scena 3D la conversione Quaternione
    const q = quat.create();
    quat.fromEuler(q, rx, ry, rz, 'zyx');
    const newQuat: Quaternion = [q[0], q[1], q[2], q[3]];

    this.poses.update(p => {
      const copy = [...p];
      copy[index] = { ...copy[index], quaternion: newQuat };
      return copy;
    });
  }

  protected getEulerFromQuat(q: Quaternion): number[] {
    const [rz, ry, rx] = quatToZyxIntrinsic(q);
    return [rx, ry, rz];
  }
}