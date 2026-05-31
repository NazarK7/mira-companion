/**
 * CameraPovViewer
 *
 * Mini Three.js viewer che mostra cosa vede la camera dalla pose selezionata.
 *
 * MATEMATICA CHIAVE:
 *
 * 1. FOV verticale dalla geometria sensore:
 *      vFOV_rad = 2 * atan(sensorH_mm / (2 * focal_mm))
 *      aspect   = sensor.w_px / sensor.h_px
 *
 * 2. Conversione orientation OpenCV → Three.js:
 *    Le pose generate hanno convenzione OpenCV camera (Z+ = direzione di
 *    visione, Y+ = giù in immagine). Three.js usa Z- = direzione di visione,
 *    Y+ = su. La conversione è una rotazione di 180° attorno all'asse X
 *    locale: quaternion_threejs = quaternion_opencv * flipX180.
 *
 * 3. Coverage % bounding box:
 *    Proietto i 4 angoli del plate in NDC [-1,1], computo il bounding box
 *    clippato a [-1,1], divido per l'area totale NDC (= 4). Approssimazione
 *    OK per plate visivamente axis-aligned; per plate molto tilted dà una
 *    stima generosa.
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';

import type {
  CameraSpec,
  CanonicalPose,
  LensSpec,
  PlateSpec,
  PlateWorldSetup,
} from '../../../core/models/domain.model';
import { generatePlateTexture } from '../../../core/utils/texture-generator.util';
import { AppButtonComponent } from '../button/button.component';

// =============================================================================
// CONSTANTS
// =============================================================================

const SCENE_BG_COLOR = 0x0a0a0e;


// =============================================================================
// COMPONENT
// =============================================================================

@Component({
  selector: 'app-camera-pov-viewer',
  templateUrl: './camera-pov-viewer.html',
  styleUrl: './camera-pov-viewer.scss',
  imports: [FormsModule, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraPovViewer implements AfterViewInit {
  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------

  /** Posa della camera in world frame (OpenCV convention). */
  readonly cameraPose = input.required<CanonicalPose>();

  /** Setup del plate nel world frame (assunto piatto X-Y, normale +Z). */
  readonly plateSetup = input.required<PlateWorldSetup>();

  /** Specs della camera selezionata dal catalogo. */
  readonly cameraSpec = input.required<CameraSpec>();

  /** Specs della lente selezionata dal catalogo. */
  readonly lensSpec = input.required<LensSpec>();

  /** Specs del plate selezionato dal catalogo (per pattern texture). */
  readonly plateSpec = input.required<PlateSpec>();

  /** Output: coverage % della FOV per il pannello di stato del wizard. */
  readonly coveragePct = output<number>();

  // ---------------------------------------------------------------------------
  // Pagination inputs/outputs
  // ---------------------------------------------------------------------------

  /** Indice 0-based della pose corrente (per pagination). */
  readonly currentIndex = input<number>(0);
  /** Numero totale di pose disponibili. */
  readonly totalPoses = input<number>(1);
  /** Emette il nuovo indice 0-based quando l'utente naviga. */
  readonly indexChange = output<number>();

  /** Valore 1-based mostrato nell'input numerico. */
  protected readonly displayIndex = signal<number>(1);
  protected readonly canPrev = computed(() => this.currentIndex() > 0);
  protected readonly canNext = computed(() => this.currentIndex() < this.totalPoses() - 1);

  // ---------------------------------------------------------------------------
  // UI signals (protected: usati nel template)
  // ---------------------------------------------------------------------------

  protected readonly coverageLabel = signal<string>('--');
  protected readonly fovStatus = signal<'in-fov' | 'partial' | 'out-of-fov'>('out-of-fov');

  // ---------------------------------------------------------------------------
  // DI + view children
  // ---------------------------------------------------------------------------

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvasEl');

  // ---------------------------------------------------------------------------
  // Three.js state
  // ---------------------------------------------------------------------------

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private plateMesh?: THREE.Mesh;
  private plateTexture?: THREE.CanvasTexture;

  private resizeObserver?: ResizeObserver;
  private rafId: number | null = null;
  private initialized = false;

  /** Quaternion riusabile per la conversione OpenCV→Three.js (180° su X). */
  private readonly flipX180 = (() => {
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    return q;
  })();

  constructor() {
    effect(() => {
      // Sincronizza input numerico (1-based) col currentIndex (0-based).
      this.displayIndex.set(this.currentIndex() + 1);
    });

    effect(() => {
      // Trigger su tutti gli input reattivi
      const pose = this.cameraPose();
      const plate = this.plateSetup();
      const cam = this.cameraSpec();
      const lens = this.lensSpec();
      const plateSpec = this.plateSpec();

      if (!this.initialized) return;

      this.updateCamera(pose, cam, lens);
      this.updatePlate(plate, plateSpec);
      this.computeCoverage(plate);
      this.drawTargetGuide();
      this.requestRender();
    });
  }

  ngAfterViewInit(): void {
    this.initScene();
    this.setupResize();
    this.initialized = true;

    this.updateCamera(this.cameraPose(), this.cameraSpec(), this.lensSpec());
    this.updatePlate(this.plateSetup(), this.plateSpec());
    this.computeCoverage(this.plateSetup());
    this.requestRender();

    this.destroyRef.onDestroy(() => this.dispose());
  }

  // ---------------------------------------------------------------------------
  // Scene init
  // ---------------------------------------------------------------------------

  private initScene(): void {
    const canvas = this.canvasRef().nativeElement;
    const host = this.hostRef.nativeElement;
    const w = host.clientWidth || 400;
    const h = host.clientHeight || 300;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE_BG_COLOR);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h, false);

    // Light ambient + directional per dare un po' di volume al plate
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.3);
    dir.position.set(500, 500, 1000);
    this.scene.add(dir);
  }

  // ---------------------------------------------------------------------------
  // Camera update (FOV + pose)
  // ---------------------------------------------------------------------------

  private updateCamera(pose: CanonicalPose, cam: CameraSpec, lens: LensSpec): void {
    // 1. FOV dinamico
    const sensorHmm = cam.resolution_px.h * cam.pixel_pitch_mm;
    const vFovRad = 2 * Math.atan(sensorHmm / (2 * lens.focal_length_mm));
    this.camera.fov = (vFovRad * 180) / Math.PI;

    // 2. Aspect dal sensore (NON dal canvas — vogliamo l'aspect reale della camera)
    this.camera.aspect = cam.resolution_px.w / cam.resolution_px.h;
    this.camera.updateProjectionMatrix();

    // 3. Posizione
    this.camera.position.set(pose.position[0], pose.position[1], pose.position[2]);

    // 4. Orientation: pose.quaternion è OpenCV (+Z = forward). Three.js camera
    //    guarda lungo -Z. Combiniamo con flipX180 per allineare.
    const opencvQ = new THREE.Quaternion(
      pose.quaternion[0],
      pose.quaternion[1],
      pose.quaternion[2],
      pose.quaternion[3],
    );
    this.camera.quaternion.copy(opencvQ).multiply(this.flipX180);
  }

  /**
   * Disegna la guida "target 1/6 FOV" come un QUADRATO nel world (sul piano
   * del plate), così da essere visivamente confrontabile col plate:
   *  - Il plate è un quadrato giacente sul piano Z = plate.center[2].
   *  - La guida è anch'essa un quadrato sullo stesso piano, world-aligned.
   *  - Per vista perpendicolare copre esattamente 1/6 (≈16.667%) dell'area
   *    immagine. Per camere inclinate è una buona approssimazione visiva: il
   *    quadrato si deforma a trapezio in POV identicamente al plate, perché
   *    entrambi sono superfici planari sullo stesso piano world.
   *
   * NOTA sulla percezione: 1/6 dell'AREA significa lato = √(1/6) ≈ 40.8% del
   * lato frame. Visivamente sembra "grosso" ma l'area è davvero ~16.7%.
   *
   * MATEMATICA del lato S (vista perpendicolare):
   *   image_area / sensor_area = S²·f² / (D²·Ws·Hs) = 1/6
   *   ⟹ S = D · √(Ws·Hs/6) / f
   * dove D = distanza camera↔centro lungo l'asse ottico, f = focale,
   * Ws·Hs = area sensore in mm².
   */
  private drawTargetGuide(): void {
    // Cleanup guide precedente
    const oldGuide = this.scene.getObjectByName('targetGuide');
    if (oldGuide) {
      this.scene.remove(oldGuide);
      const asLine = oldGuide as THREE.Line;
      asLine.geometry?.dispose();
      (asLine.material as THREE.Material | undefined)?.dispose();
    }

    const pose = this.cameraPose();
    const plate = this.plateSetup();
    const cam = this.cameraSpec();
    const lens = this.lensSpec();

    const groundZ = plate.center[2];
    const cameraPos = new THREE.Vector3(
      pose.position[0],
      pose.position[1],
      pose.position[2],
    );
    const cameraQuat = new THREE.Quaternion(
      pose.quaternion[0],
      pose.quaternion[1],
      pose.quaternion[2],
      pose.quaternion[3],
    );

    // Intersezione asse ottico (+Z OpenCV) col piano del plate.
    const forward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(cameraQuat)
      .normalize();
    if (Math.abs(forward.z) < 1e-5) return;
    const tCenter = (groundZ - cameraPos.z) / forward.z;
    if (tCenter <= 0) return;
    const centerHit = cameraPos.clone().addScaledVector(forward, tCenter);

    // Distanza camera↔centro lungo l'asse ottico (NON la sola componente Z!).
    const D = cameraPos.distanceTo(centerHit);

    const sensorW = cam.resolution_px.w * cam.pixel_pitch_mm;
    const sensorH = cam.resolution_px.h * cam.pixel_pitch_mm;
    const focal = lens.focal_length_mm;

    // Lato del quadrato world che copre 1/6 dell'area immagine (vista perp.).
    const side = (D * Math.sqrt((sensorW * sensorH) / 6)) / focal;
    const half = side / 2;

    // Quadrato world-aligned su piano XY, centrato sul punto di mira.
    // Lift leggero (+1 mm) per evitare z-fighting con il plate.
    const z = groundZ + 1;
    const corners = [
      new THREE.Vector3(centerHit.x - half, centerHit.y - half, z),
      new THREE.Vector3(centerHit.x + half, centerHit.y - half, z),
      new THREE.Vector3(centerHit.x + half, centerHit.y + half, z),
      new THREE.Vector3(centerHit.x - half, centerHit.y + half, z),
      new THREE.Vector3(centerHit.x - half, centerHit.y - half, z),
    ];

    const geom = new THREE.BufferGeometry().setFromPoints(corners);
    const line = new THREE.Line(
      geom,
      new THREE.LineBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8,
      }),
    );
    line.name = 'targetGuide';
    this.scene.add(line);
  }
  // ---------------------------------------------------------------------------
  // Plate update (texture + mesh)
  // ---------------------------------------------------------------------------

  private updatePlate(plate: PlateWorldSetup, plateSpec: PlateSpec): void {
    // Cleanup old plate
    if (this.plateMesh) {
      this.scene.remove(this.plateMesh);
      this.plateMesh.geometry.dispose();
      (this.plateMesh.material as THREE.MeshStandardMaterial).dispose();
    }
    if (this.plateTexture) {
      this.plateTexture.dispose();
    }

    this.plateTexture = generatePlateTexture({ size_mm: plate.size_mm });

    const geom = new THREE.PlaneGeometry(plate.size_mm, plate.size_mm);
    const mat = new THREE.MeshStandardMaterial({
      map: this.plateTexture,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0,
    });
    this.plateMesh = new THREE.Mesh(geom, mat);
    this.plateMesh.position.set(plate.center[0], plate.center[1], plate.center[2]);
    // PlaneGeometry default normale +Z, coerente con plate piatto su X-Y world
    this.scene.add(this.plateMesh);
  }



  // ---------------------------------------------------------------------------
  // Coverage computation
  // ---------------------------------------------------------------------------

  /**
   * Proietta i 4 angoli del plate in NDC, computa bounding box clippato a
   * [-1, 1], deriva coverage % dell'area FOV.
   *
   * Approssimazione: usa il bounding box dei corner proiettati, non l'area
   * esatta del poligono. Per plate poco inclinati è accurato; per inclinazioni
   * forti sovrastima leggermente. Per v1 va bene.
   */
  private computeCoverage(plate: PlateWorldSetup): void {
    const half = plate.size_mm / 2;
    const cx = plate.center[0];
    const cy = plate.center[1];
    const cz = plate.center[2];

    const corners = [
      new THREE.Vector3(cx - half, cy - half, cz),
      new THREE.Vector3(cx + half, cy - half, cz),
      new THREE.Vector3(cx + half, cy + half, cz),
      new THREE.Vector3(cx - half, cy + half, cz),
    ];

    // Check: i corner sono davanti alla camera?
    const camFwd = new THREE.Vector3();
    this.camera.getWorldDirection(camFwd);

    let allInFront = true;
    const camToCorner = new THREE.Vector3();
    for (const c of corners) {
      camToCorner.subVectors(c, this.camera.position);
      if (camToCorner.dot(camFwd) <= 0) {
        allInFront = false;
        break;
      }
    }

    if (!allInFront) {
      this.coverageLabel.set('Plate non in vista');
      this.fovStatus.set('out-of-fov');
      this.coveragePct.emit(0);
      return;
    }

    // Proiezione in NDC
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of corners) {
      c.project(this.camera);
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    }

    // Clip a [-1, 1]
    const clippedW = Math.max(0, Math.min(maxX, 1) - Math.max(minX, -1));
    const clippedH = Math.max(0, Math.min(maxY, 1) - Math.max(minY, -1));
    const coverageArea = clippedW * clippedH;
    const coveragePct = (coverageArea / 4) * 100;

    this.coverageLabel.set(`${coveragePct.toFixed(1)}% FOV`);

    // Stato: piena visibilità o parziale (clipping presente)
    const fullyInside =
      minX >= -1 && maxX <= 1 && minY >= -1 && maxY <= 1;
    this.fovStatus.set(fullyInside ? 'in-fov' : 'partial');

    this.coveragePct.emit(coveragePct);
  }

  // ---------------------------------------------------------------------------
  // Resize + render loop
  // ---------------------------------------------------------------------------

  private setupResize(): void {
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.handleResize());
    });
    this.resizeObserver.observe(this.hostRef.nativeElement);
  }

  private handleResize(): void {
    if (!this.initialized) return;
    const host = this.hostRef.nativeElement;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;

    // NOTA: NON modifichiamo this.camera.aspect qui — l'aspect è fissato dal
    // sensore reale (vedi updateCamera). Il canvas viene letterboxed se il
    // suo aspect è diverso dal sensore. Il rendere si dimensiona solo
    // sul canvas physical.
    this.renderer.setSize(w, h, false);
    this.requestRender();
  }

  private requestRender(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.initialized) return;
      this.renderer.render(this.scene, this.camera);
    });
  }

  // ---------------------------------------------------------------------------
  // Pagination handlers
  // ---------------------------------------------------------------------------

  protected prevPose(): void {
    const idx = this.currentIndex();
    if (idx > 0) this.indexChange.emit(idx - 1);
  }

  protected nextPose(): void {
    const idx = this.currentIndex();
    if (idx < this.totalPoses() - 1) this.indexChange.emit(idx + 1);
  }

  /** Clamp [1, totalPoses] sull'input numerico. */
  protected onIndexInputChange(value: number | string): void {
    const total = this.totalPoses();
    const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
    const safe = Number.isFinite(parsed) ? parsed : this.currentIndex() + 1;
    const clamped = Math.min(Math.max(Math.round(safe), 1), Math.max(total, 1));
    this.displayIndex.set(clamped);
    const zeroBased = clamped - 1;
    if (zeroBased !== this.currentIndex()) {
      this.indexChange.emit(zeroBased);
    }
  }

  // ---------------------------------------------------------------------------
  // Disposal
  // ---------------------------------------------------------------------------

  private dispose(): void {
    this.initialized = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    if (this.plateMesh) {
      this.scene?.remove(this.plateMesh);
      this.plateMesh.geometry.dispose();
      (this.plateMesh.material as THREE.MeshStandardMaterial).dispose();
      this.plateMesh = undefined;
    }
    if (this.plateTexture) {
      this.plateTexture.dispose();
      this.plateTexture = undefined;
    }

    this.renderer?.dispose();
  }
}