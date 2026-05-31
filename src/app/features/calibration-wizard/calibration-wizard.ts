// in src/app/features/calibration-wizard/calibration-wizard.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DecimalPipe } from '@angular/common';
import { quat } from 'gl-matrix';
import { PoseGeneratorConstraints, CameraSpec, LensSpec, PlateSpec } from '../../core/models/domain.model';
import type { CameraHardware, CanonicalPose, PlateWorldSetup, RobotControllerType, RobotPose } from './../../core/models/domain.model';
import { abbToCanonical, canonicalToControllerPose, quatToZyxIntrinsic, quatAngleDifferenceDeg, vec3Distance } from './../../core/utils/pose-conversions.util';
import { DEFAULT_PRODUCTION_CONSTRAINTS, generateCalibrationPoses, regenerateRemainingPoses } from './../../core/utils/pose-generator.util';
import { parseAbbRapidTargets } from './../../core/utils/abb-parser.util';
import { ThreeViewer } from '../../shared/components/three-viewer/three-viewer';
import { CAMERA_CATALOG, DEFAULT_CAMERA_ID, findCameraById } from '../../core/data/camera-catalog';
import { LENS_CATALOG, DEFAULT_LENS_ID, findLensById, isLensCompatible } from '../../core/data/lens-catalog';
import { PLATE_CATALOG, DEFAULT_PLATE_ID, findPlateById } from '../../core/data/plate-catalog';
import { CameraPovViewer } from '../../shared/components/camera-pov-viewer/camera-pov-viewer';
import { toSignal } from '@angular/core/rxjs-interop'
@Component({
  selector: 'app-calibration-wizard',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatIconModule, MatTableModule, MatExpansionModule,
    ThreeViewer, DecimalPipe, CameraPovViewer
  ],
  templateUrl: './calibration-wizard.html',
  styleUrl: './calibration-wizard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalibrationWizardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly controllers: RobotControllerType[] = ['ABB', 'Comau', 'Fanuc', 'Kuka'];
  readonly selectedIndex = signal<number | null>(null);

  readonly form = this.fb.group({
    cameraId: [DEFAULT_CAMERA_ID, Validators.required],
    lensId: [DEFAULT_LENS_ID, Validators.required],
    plateId: [DEFAULT_PLATE_ID, Validators.required],
    controller: ['ABB' as RobotControllerType, Validators.required],
    workingDistance: [600, Validators.required],
    nPoses: [20, [Validators.required, Validators.min(5), Validators.max(30)]],
    minTrans: [250, Validators.required],
    minRot: [30, Validators.required],

    // Anchor in formato Eulero (universale per UI)
    x: [0, Validators.required],
    y: [0, Validators.required],
    z: [600, Validators.required],
    rx: [180, Validators.required],
    ry: [0, Validators.required],
    rz: [0, Validators.required],
  });
  /**
 * Form value come SIGNAL reattivo. I computed devono leggere da qui invece
 * di `this.form.value` (che è solo un accessor, non triggera signals).
 */
  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.value,
  });
  readonly showQuaternions = signal(false);
  readonly generatedPoses = signal<RobotPose[]>([]);
  readonly editingRowIndex = signal<number | null>(null);

  /** Snapshot della pose originale quando entri in editing, per la "Annulla". */
  readonly originalPoseSnapshot = signal<CanonicalPose | null>(null);

  /** Indici delle pose già confermate dall'utente (badge verde nella tabella). */
  readonly confirmedPoses = signal<ReadonlySet<number>>(new Set());

  /** Helper template per check rapido nella tabella. */
  isPoseConfirmed(idx: number): boolean {
    return this.confirmedPoses().has(idx);
  }
  /**
   * Indice della PRIMA pose in conflitto con quella attualmente selezionata.
   * Il conflitto è SIMMETRICO: itera tutte le pose ≠ current.
   * Conflitto = distanza < minTrans OR angolo < minRot.
   */
  readonly conflictWithAny = computed<number | null>(() => {
    const idx = this.selectedIndex();
    if (idx === null) return null;
    const poses = this.generatedPoses();
    if (idx >= poses.length) return null;

    const current = poses[idx].canonical;
    const minDist = this.formValue().minTrans ?? 150;
    const minRot = this.formValue().minRot ?? 30;

    for (let i = 0; i < poses.length; i++) {
      if (i === idx) continue;
      const other = poses[i].canonical;
      const d = vec3Distance(current.position, other.position);
      const angle = quatAngleDifferenceDeg(current.quaternion, other.quaternion);
      if (d < minDist || angle < minRot) return i;
    }
    return null;
  });

  // Verifica reattiva basata sui cataloghi forniti
  readonly isConfigurationValid = computed(() => {
    const lens = this.selectedLens(); // dal lens-catalog [cite: 318]
    const cam = this.selectedCamera(); // dal camera-catalog [cite: 317]
    return isLensCompatible(lens, cam); // [cite: 320]
  });

  /**
   * Tipo di violazione per il conflitto attuale (per messaggio UI specifico).
   * null se nessun conflitto.
   */
  readonly conflictReason = computed<'translation' | 'rotation' | 'both' | null>(() => {
    const idx = this.selectedIndex();
    const conflictIdx = this.conflictWithAny();
    if (idx === null || conflictIdx === null) return null;

    const poses = this.generatedPoses();
    const current = poses[idx].canonical;
    const other = poses[conflictIdx].canonical;

    const d = vec3Distance(current.position, other.position);
    const a = quatAngleDifferenceDeg(current.quaternion, other.quaternion);

    const minDist = this.formValue().minTrans ?? 150;
    const minRot = this.formValue().minRot ?? 30;

    const transFail = d < minDist;
    const rotFail = a < minRot;

    if (transFail && rotFail) return 'both';
    if (transFail) return 'translation';
    return 'rotation';
  });

  readonly canonicalPosesFor3D = computed(() => this.generatedPoses().map(p => p.canonical));
  readonly displayColumns = computed(() => {
    const base = ['idx', 'x', 'y', 'z'];
    const rot = this.showQuaternions() ? ['q1', 'q2', 'q3', 'q4'] : ['rx', 'ry', 'rz'];
    return [...base, ...rot];
  });

  readonly isABB = computed(() => this.form.value.controller === 'ABB');

  toggleRotationDisplay(): void {
    this.showQuaternions.update(v => !v);
  }

  readonly editForm = this.fb.group({
    x: [0], y: [0], z: [0],
    rx: [0], ry: [0], rz: [0]
  });

  onPoseSelectedFrom3D(index: number): void {
    // Auto-revert di un eventuale edit pendente su una pose diversa
    const prevIdx = this.selectedIndex();
    const prevSnap = this.originalPoseSnapshot();
    if (prevIdx !== null && prevIdx !== index && prevSnap !== null) {
      this.revertPoseToSnapshot(prevIdx, prevSnap);
    }

    this.selectedIndex.set(index);
    const pose = this.generatedPoses()[index].canonical;

    // Snapshot per il discard
    this.originalPoseSnapshot.set({
      position: [pose.position[0], pose.position[1], pose.position[2]] as const,
      quaternion: [pose.quaternion[0], pose.quaternion[1], pose.quaternion[2], pose.quaternion[3]] as const,
    });

    const [rz, ry, rx] = quatToZyxIntrinsic(pose.quaternion);
    this.editForm.patchValue({
      x: Number(pose.position[0].toFixed(2)),
      y: Number(pose.position[1].toFixed(2)),
      z: Number(pose.position[2].toFixed(2)),
      rx: Number(rx.toFixed(2)),
      ry: Number(ry.toFixed(2)),
      rz: Number(rz.toFixed(2))
    }, { emitEvent: false });
  }

  // 4. Metodo per aggiornare la posa mentre scrivi
  updateSelectedPoseLive(): void {
    const idx = this.selectedIndex();
    if (idx === null) return;

    const v = this.editForm.value;
    const q = quat.create();
    quat.fromEuler(q, v.rx!, v.ry!, v.rz!, 'zyx');

    const updatedPoses = [...this.generatedPoses()];
    updatedPoses[idx] = {
      ...updatedPoses[idx],
      canonical: {
        position: [v.x!, v.y!, v.z!],
        quaternion: [q[0], q[1], q[2], q[3]]
      }
    };

    // Aggiornando il signal, il ThreeViewer si aggiornerà da solo!
    this.generatedPoses.set(updatedPoses);
  }

  /** Helper: ricostruisce una RobotPose dato il canonical, usando il controller corrente. */
  private buildRobotPose(canonical: CanonicalPose): RobotPose {
    const controllerType = this.form.value.controller as RobotControllerType;
    return {
      canonical,
      controller_format: canonicalToControllerPose(canonical, controllerType),
    };
  }

  /** Helper: ripristina una pose nell'array a partire da uno snapshot. */
  private revertPoseToSnapshot(index: number, snapshot: CanonicalPose): void {
    const updated = [...this.generatedPoses()];
    updated[index] = this.buildRobotPose(snapshot);
    this.generatedPoses.set(updated);
  }

  /** Helper: costruisce i constraints attuali dal form. */
  private buildCurrentConstraints(): PoseGeneratorConstraints {
    const v = this.formValue();
    const wd = v.workingDistance!;
    return {
      ...DEFAULT_PRODUCTION_CONSTRAINTS,
      n_total_poses: v.nPoses!,
      min_translation_diff_mm: v.minTrans!,
      min_rotation_diff_deg: v.minRot!,
      dome: { ...DEFAULT_PRODUCTION_CONSTRAINTS.dome, radius_mm: wd },
    };
  }

  /** Conferma l'edit della pose selezionata. */
  confirmEdit(): void {
    const idx = this.selectedIndex();
    if (idx === null) return;

    const conflict = this.conflictWithAny();

    // 1. Blocca SOLO se in conflitto con una pose PRECEDENTE già confermata (locked)
    if (conflict !== null && conflict < idx && this.isPoseConfirmed(conflict)) {
      this.snackBar.open(
        `⚠️ Posa ${idx + 1} confligge con Posa ${conflict + 1} (precedente confermata). Modifica le coordinate.`,
        'OK',
        { duration: 5000 },
      );
      return;
    }

    // 2. Se in conflitto con una successiva confermata, avvisa: verrà rigenerata
    if (conflict !== null && conflict > idx && this.isPoseConfirmed(conflict)) {
      this.snackBar.open(
        `⚠️ Posa ${conflict + 1} (confermata) verrà rigenerata per evitare il conflitto.`,
        'OK',
        { duration: 4000 },
      );
    }

    // 3. Rigenera tutte le pose con idx > current (locked = pose <= idx)
    const poses = this.generatedPoses();
    const fixedCanonical = poses.slice(0, idx + 1).map((p) => p.canonical);

    if (fixedCanonical.length < poses.length) {
      const result = regenerateRemainingPoses(fixedCanonical, this.buildCurrentConstraints(), {
        plate_setup: this.wizardPlateSetup(),
        camera_hw: this.defaultCamera(),
      });
      const mappedPoses = result.poses.map((c) => this.buildRobotPose(c));
      this.generatedPoses.set(mappedPoses);

      // Invalida conferme delle pose successive (sono state rigenerate)
      this.confirmedPoses.update((set) => {
        const newSet = new Set<number>();
        for (const i of set) if (i <= idx) newSet.add(i);
        return newSet;
      });

      const regenerated = poses.length - (idx + 1);
      this.snackBar.open(
        `Posa ${idx + 1} confermata. ${regenerated} pose successive ricalcolate.`,
        'OK',
        { duration: 3500 },
      );
    } else {
      this.snackBar.open(`Posa ${idx + 1} confermata.`, 'OK', { duration: 2000 });
    }

    // 4. Marca current come confermata
    this.confirmedPoses.update((set) => new Set([...set, idx]));

    // 5. Auto-advance alla prossima
    const newPoses = this.generatedPoses();
    const nextIdx = idx + 1;
    if (nextIdx < newPoses.length) {
      this.onPoseSelectedFrom3D(nextIdx);
    } else {
      this.selectedIndex.set(null);
      this.originalPoseSnapshot.set(null);
      this.snackBar.open('🎉 Tutte le pose confermate!', 'OK', { duration: 4000 });
    }
  }
  /** Annulla l'edit corrente e ripristina lo snapshot. */
  discardEdit(): void {
    const idx = this.selectedIndex();
    const snapshot = this.originalPoseSnapshot();
    if (idx !== null && snapshot !== null) {
      this.revertPoseToSnapshot(idx, snapshot);
    }
    this.selectedIndex.set(null);
    this.originalPoseSnapshot.set(null);
  }

  // Helper per mostrare RX, RY, RZ nella tabella partendo dal quaternione canonico
  getEulerDisplay(q: readonly [number, number, number, number]): number[] {
    const [rz, ry, rx] = quatToZyxIntrinsic(q);
    return [rx, ry, rz]; // Restituiamo nell'ordine RX, RY, RZ
  }

  readonly wizardPlateSetup = computed<PlateWorldSetup>(() => {
    const v = this.formValue();
    const x = v.x ?? 0;
    const y = v.y ?? 0;
    const z = v.z ?? 600;
    const wd = v.workingDistance ?? 600;
    const plateSize = this.selectedPlate().size_mm;
    return { center: [x, y, z - wd], size_mm: plateSize };
  });

  // =============================================================================
  // HARDWARE SELECTION (catalog-based)
  // =============================================================================

  readonly cameras = CAMERA_CATALOG;
  readonly lenses = LENS_CATALOG;
  readonly plates = PLATE_CATALOG;

  readonly selectedCamera = computed<CameraSpec>(() => {
    return findCameraById(this.formValue().cameraId ?? DEFAULT_CAMERA_ID)
      ?? findCameraById(DEFAULT_CAMERA_ID)!;
  });

  readonly selectedLens = computed<LensSpec>(() => {
    return findLensById(this.formValue().lensId ?? DEFAULT_LENS_ID)
      ?? findLensById(DEFAULT_LENS_ID)!;
  });

  readonly selectedPlate = computed<PlateSpec>(() => {
    return findPlateById(this.formValue().plateId ?? DEFAULT_PLATE_ID)
      ?? findPlateById(DEFAULT_PLATE_ID)!;
  });

  /** Warning compatibilità lente/sensore (vignettatura). */
  readonly lensCompatibilityWarning = computed<string | null>(() => {
    const cam = this.selectedCamera();
    const lens = this.selectedLens();
    if (!isLensCompatible(lens, cam)) {
      return `Lente ${lens.image_circle_format} (${lens.image_circle_diameter_mm}mm) non copre il sensore ${cam.sensor_format} (${cam.sensor_diagonal_mm}mm di diagonale). Possibile vignettatura.`;
    }
    return null;
  });

  /**
   * CameraHardware derivata dinamicamente dal catalogo (camera + lens selezionati).
   * Usata dal world 3D viewer per disegnare i frustum.
   */
  readonly defaultCamera = computed<CameraHardware>(() => {
    const cam = this.selectedCamera();
    const lens = this.selectedLens();
    return {
      model: cam.label,
      sensor: {
        width_px: cam.resolution_px.w,
        height_px: cam.resolution_px.h,
        pixel_pitch_um: cam.pixel_pitch_mm * 1000, // mm → μm
      },
      lens: {
        focal_length_mm: lens.focal_length_mm,
        aperture_min_f: 2.8,
      },
    };
  });

  protected onPasteRawTarget(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text');
    if (!text) return;

    const parsed = parseAbbRapidTargets(text);
    if (parsed.length > 0) {
      // 1. Parsing Quat ABB -> Canonica -> Estrazione Eulero
      const canon = abbToCanonical(parsed[0]);
      const [rz, ry, rx] = quatToZyxIntrinsic(canon.quaternion);

      this.form.patchValue({
        controller: 'ABB',
        x: canon.position[0],
        y: canon.position[1],
        z: canon.position[2],
        rx: Number(rx.toFixed(3)),
        ry: Number(ry.toFixed(3)),
        rz: Number(rz.toFixed(3)),
      });
      this.snackBar.open('Anchor Pose caricata da Smart Paste', 'OK', { duration: 3000 });
    }
  }

  generate(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const controllerType = v.controller as RobotControllerType;

    // Costruiamo il quaternione canonico dagli input Rx, Ry, Rz
    const q = quat.create();
    quat.fromEuler(q, v.rx!, v.ry!, v.rz!, 'zyx');

    const anchorCanonical: CanonicalPose = {
      position: [v.x!, v.y!, v.z!],
      quaternion: [q[0], q[1], q[2], q[3]]
    };

    const wd = v.workingDistance!;
    const constraints = {
      ...DEFAULT_PRODUCTION_CONSTRAINTS,
      n_total_poses: v.nPoses!,
      min_translation_diff_mm: v.minTrans!,
      min_rotation_diff_deg: v.minRot!,
      dome: { ...DEFAULT_PRODUCTION_CONSTRAINTS.dome, radius_mm: wd }
    };

    const plateSetup = this.wizardPlateSetup();

    const result = generateCalibrationPoses(anchorCanonical, constraints, {
      plate_setup: plateSetup,
      camera_hw: this.defaultCamera(),
    });

    const mappedPoses: RobotPose[] = result.poses.map((canon) => ({
      canonical: canon,
      controller_format: canonicalToControllerPose(canon, controllerType)
    }));

    this.generatedPoses.set(mappedPoses);
    this.editingRowIndex.set(null);
    this.confirmedPoses.set(new Set()); // reset conferme su nuova generazione
    this.selectedIndex.set(null);
  }

  // --- OVERRIDE LOGIC ---

  startEditRow(index: number) { this.editingRowIndex.set(index); }
  cancelEditRow() { this.editingRowIndex.set(null); }

  onPasteOverride(index: number, event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text');
    if (!text) return;

    const parsed = parseAbbRapidTargets(text);
    if (!parsed.length) return;

    const controllerType = this.form.value.controller as RobotControllerType;
    const newCanonical = abbToCanonical(parsed[0]);

    const currentCanonicalPoses = this.generatedPoses().map(p => p.canonical);
    const fixedPoses = currentCanonicalPoses.slice(0, index);
    fixedPoses.push(newCanonical);

    const v = this.form.value;
    const wd = v.workingDistance!;
    const constraints = {
      ...DEFAULT_PRODUCTION_CONSTRAINTS,
      n_total_poses: v.nPoses!,
      min_translation_diff_mm: v.minTrans!,
      min_rotation_diff_deg: v.minRot!,
      dome: { ...DEFAULT_PRODUCTION_CONSTRAINTS.dome, radius_mm: wd }
    };

    const result = regenerateRemainingPoses(fixedPoses, constraints, {
      plate_setup: this.wizardPlateSetup(),
      camera_hw: this.defaultCamera(),
    });

    const mappedPoses: RobotPose[] = result.poses.map((canon) => ({
      canonical: canon,
      controller_format: canonicalToControllerPose(canon, controllerType)
    }));

    this.generatedPoses.set(mappedPoses);
    this.editingRowIndex.set(null);
    this.snackBar.open(`Ricalcolo completato dalla Posa ${index + 1}`, 'OK', { duration: 4000 });
  }

  copyPosesToClipboard(): void {
    const poses = this.generatedPoses();
    if (!poses.length) return;

    const showQ = this.showQuaternions();
    let text = 'IDX     X        Y        Z          ' + (showQ ? 'Q1(w)    Q2(x)    Q3(y)    Q4(z)\n' : 'Rx       Ry       Rz\n');
    text += '--------------------------------------------------------------------------\n';

    poses.forEach((p, i) => {
      const id = `P${i + 1}`.padEnd(5, ' ');
      const x = p.canonical.position[0].toFixed(2).padStart(8, ' ');
      const y = p.canonical.position[1].toFixed(2).padStart(8, ' ');
      const z = p.canonical.position[2].toFixed(2).padStart(8, ' ');

      let rot = '';
      if (showQ) {
        const q1 = p.canonical.quaternion[3].toFixed(4).padStart(8, ' ');
        const q2 = p.canonical.quaternion[0].toFixed(4).padStart(8, ' ');
        const q3 = p.canonical.quaternion[1].toFixed(4).padStart(8, ' ');
        const q4 = p.canonical.quaternion[2].toFixed(4).padStart(8, ' ');
        rot = `${q1} ${q2} ${q3} ${q4}`;
      } else {
        const [rx, ry, rz] = this.getEulerDisplay(p.canonical.quaternion);
        const rxs = rx.toFixed(2).padStart(8, ' ');
        const rys = ry.toFixed(2).padStart(8, ' ');
        const rzs = rz.toFixed(2).padStart(8, ' ');
        rot = `${rxs} ${rys} ${rzs}`;
      }

      text += `${id} ${x} ${y} ${z}    ${rot}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Pose copiate negli appunti (formattate)', 'OK', { duration: 3000 });
    }).catch(() => {
      this.snackBar.open('Errore durante la copia', 'OK', { duration: 3000 });
    });
  }
}