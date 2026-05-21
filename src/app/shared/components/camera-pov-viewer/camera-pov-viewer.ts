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
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';

import type {
  CameraSpec,
  CanonicalPose,
  LensSpec,
  PlateSpec,
  PlateWorldSetup,
} from '../../../core/models/domain.model';
import { generatePlateTexture } from '../../../core/utils/texture-generator.util';

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
 * Aggiunge una guida visiva nel POV per mostrare l'area target (1/6 del FOV).
 * Aiuta a capire se il plate è troppo piccolo o troppo grande.
 */
private drawTargetGuide(): void {
  // Rimuovi guide precedenti se esistono
  const oldGuide = this.scene.getObjectByName('targetGuide');
  if (oldGuide) this.scene.remove(oldGuide);

  // Calcolo dimensioni target (sqrt(1/6) dell'area sensore)
  const targetRatio = Math.sqrt(1/6); 
  const cam = this.cameraSpec();
  const sensorW = cam.resolution_px.w * cam.pixel_pitch_mm;
  const sensorH = cam.resolution_px.h * cam.pixel_pitch_mm;
  
  const guideW = (sensorW * targetRatio * this.cameraPose().position[2]) / this.lensSpec().focal_length_mm;
  const guideH = (sensorH * targetRatio * this.cameraPose().position[2]) / this.lensSpec().focal_length_mm;

  const geometry = new THREE.PlaneGeometry(guideW, guideH);
  const edges = new THREE.EdgesGeometry(geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 }));
  
  line.name = 'targetGuide';
  // Posiziona la guida sul piano del plate (Z=0 del mondo)
  line.position.set(this.plateSetup().center[0], this.plateSetup().center[1], this.plateSetup().center[2] + 1);
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