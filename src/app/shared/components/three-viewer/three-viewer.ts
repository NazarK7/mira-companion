/**
 * ThreeViewerComponent — Round 7 base
 *
 * Visualizzazione 3D di pose di calibrazione + plate Halcon + scene aids.
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
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DecimalPipe } from '@angular/common';
import {
  CanonicalPose,
  PlateWorldSetup,
  CameraHardware,
  CalibrationPoseStatus,
  PoseGeneratorConstraints
} from '../../../core/models/domain.model';
import { computeSensorDimensions } from '../../../core/utils/camera-geometry.util';
import { generatePlateTexture } from '../../../core/utils/texture-generator.util';

// =============================================================================
// CONSTANTS
// =============================================================================

const POSE_STATUS_COLORS: Record<CalibrationPoseStatus, number> = {
  'planned': 0x9ca3af,
  'in-progress': 0xff6600,
  'ok': 0x10b981,
  'ok-with-override': 0x3b82f6,
  'ko-unreachable': 0xef4444,
  'ko-not-recognized': 0xa855f7,
  'skipped': 0xd1d5db,
};

const ANCHOR_COLOR = 0x0033a0;
const CONFLICT_HIGHLIGHT_COLOR = 0xef4444;
const SELECTED_OUTLINE_COLOR = 0xffffff;
const SELECTED_RAY_COLOR = 0xf8fafc;
const FRUSTUM_FAR_MM = 100;
const SCENE_BG_COLOR = 0x111418;

// Colore del footprint FOV proiettato a terra: bianco se completamente
// dentro al plate, rosso se almeno un angolo esce dai bordi.
const FOOTPRINT_OK_COLOR = 0xf8fafc;
const FOOTPRINT_OUT_COLOR = 0xef4444;
const CROSSHAIR_COLOR = 0xffffff;

// =============================================================================
// COMPONENT
// =============================================================================

@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.html',
  styleUrl: './three-viewer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreeViewer implements AfterViewInit {
  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------

  readonly poses = input.required<CanonicalPose[]>();
  readonly plateSetup = input.required<PlateWorldSetup>();
  readonly cameraHardware = input.required<CameraHardware>();
  readonly poseStatuses = input<CalibrationPoseStatus[]>([]);
  readonly selectedPoseIndex = input<number | null>(null);
  readonly conflictPoseIndex = input<number | null>(null);
  readonly showGrid = input<boolean>(true);
  readonly showAxisHelper = input<boolean>(true);
  readonly showOrigin = input<boolean>(false);

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------

  readonly poseSelected = output<number>();

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
  private controls!: OrbitControls;

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();

  private robotBaseGroup!: THREE.Group;
  private sceneRoot!: THREE.Group;
  private plateGroup!: THREE.Group;
  private markersGroup!: THREE.Group;
  private aidsGroup!: THREE.Group;

  private poseMeshes: THREE.Mesh[] = [];
  private resizeObserver?: ResizeObserver;
  private rafId: number | null = null;
  private plateTexture?: THREE.CanvasTexture;
  private initialized = false;

  protected readonly scaleLabel = signal<string>('--- mm');
  protected readonly scaleWidthPx = signal<number>(0);

  /**
   * Info della pose selezionata: indice, posizione, distanza dall'anchor.
   * null quando nessuna pose è selezionata. Usato dal pannello HUD bottom-right.
   */
  protected readonly selectedPoseInfo = computed(() => {
    const idx = this.selectedPoseIndex();
    const poses = this.poses();
    if (idx === null || idx < 0 || idx >= poses.length) return null;

    const pose = poses[idx];
    const anchor = poses[0];
    const dx = pose.position[0] - anchor.position[0];
    const dy = pose.position[1] - anchor.position[1];
    const dz = pose.position[2] - anchor.position[2];
    const distanceFromAnchor = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return {
      index: idx,
      position: pose.position as readonly [number, number, number],
      distanceFromAnchor,
    };
  });

  constructor() {
    effect(() => {
      const poses = this.poses();
      const plate = this.plateSetup();
      const cam = this.cameraHardware();
      const statuses = this.poseStatuses();
      const selected = this.selectedPoseIndex();
      const conflict = this.conflictPoseIndex();
      const grid = this.showGrid();
      const axis = this.showAxisHelper();
      const origin = this.showOrigin();

      if (!this.initialized) return;

      this.rebuildPlate(plate);
      this.rebuildMarkers(poses, statuses, cam, plate, selected, conflict);
      this.rebuildAids(plate, grid, axis, origin);
      this.requestRender();
    });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngAfterViewInit(): void {
    this.initScene();
    this.setupControls();
    this.setupResize();
    this.setupPointerHandling();

    this.initialized = true;

    this.rebuildPlate(this.plateSetup());
    this.rebuildMarkers(
      this.poses(),
      this.poseStatuses(),
      this.cameraHardware(),
      this.plateSetup(),
      this.selectedPoseIndex(),
      this.conflictPoseIndex(),
    );
    this.rebuildAids(
      this.plateSetup(),
      this.showGrid(),
      this.showAxisHelper(),
      this.showOrigin(),
    );

    this.fitCameraToScene();
    this.updateDynamicScale();
    this.renderLoop();
    this.destroyRef.onDestroy(() => this.dispose());
  }

  // ---------------------------------------------------------------------------
  // Scene init
  // ---------------------------------------------------------------------------

  private initScene(): void {
    const canvas = this.canvasRef().nativeElement;
    const host = this.hostRef.nativeElement;
    const w = host.clientWidth || 800;
    const h = host.clientHeight || 600;

    this.robotBaseGroup = new THREE.Group();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE_BG_COLOR);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);
    this.camera.up.set(0, 0, 1);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h, false);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(500, 500, 1000);
    this.scene.add(ambient, directional);

    this.sceneRoot = new THREE.Group();
    this.plateGroup = new THREE.Group();
    this.markersGroup = new THREE.Group();
    this.aidsGroup = new THREE.Group();

    this.sceneRoot.add(this.plateGroup, this.markersGroup, this.aidsGroup, this.robotBaseGroup);
    this.scene.add(this.sceneRoot);
  }

  private rebuildAids(
    plate: PlateWorldSetup,
    showGrid: boolean,
    showAxis: boolean,
    showOrigin: boolean,
  ): void {
    this.clearGroup(this.aidsGroup);
    const [cx, cy, cz] = plate.center;
    const s = plate.size_mm;

    if (showGrid) {
      const gridSize = Math.max(s * 4, 1000);
      const grid = new THREE.GridHelper(gridSize, 20, 0x444444, 0x2a2a2a);
      grid.rotation.x = Math.PI / 2;
      grid.position.set(cx, cy, cz);
      this.aidsGroup.add(grid);
    }

    if (showAxis) {
      const axisLen = Math.max(s * 0.5, 150);
      const axes = new THREE.AxesHelper(axisLen);
      axes.position.set(cx - s / 2, cy - s / 2, cz + 1);
      this.aidsGroup.add(axes);

      const labelX = this.buildPoseLabelSprite('X', 0xff0000, 20);
      labelX.position.set(cx - s / 2 + axisLen, cy - s / 2, cz + 10);

      const labelY = this.buildPoseLabelSprite('Y', 0x00ff00, 20);
      labelY.position.set(cx - s / 2, cy - s / 2 + axisLen, cz + 10);

      const labelZ = this.buildPoseLabelSprite('Z', 0x0000ff, 20);
      labelZ.position.set(cx - s / 2, cy - s / 2, cz + axisLen + 10);

      this.aidsGroup.add(labelX, labelY, labelZ);
    }

    if (showOrigin) {
      const originGeom = new THREE.SphereGeometry(8, 16, 16);
      const originMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const originMesh = new THREE.Mesh(originGeom, originMat);
      originMesh.position.set(cx, cy, cz);
      this.aidsGroup.add(originMesh);
    }
  }

  private rebuildRobotBase(): void {
    this.clearGroup(this.robotBaseGroup);

    const baseRadius = 250;
    const baseHeight = 150;
    const geom = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 32);
    geom.rotateX(Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      roughness: 0.7,
      metalness: 0.3,
    });

    const baseMesh = new THREE.Mesh(geom, mat);
    baseMesh.position.set(0, 0, baseHeight / 2);

    const axes = new THREE.AxesHelper(400);
    baseMesh.add(axes);

    this.robotBaseGroup.add(baseMesh);
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
  }

  private renderLoop(): void {
    if (!this.initialized) return;

    this.rafId = requestAnimationFrame(() => this.renderLoop());

    this.controls?.update();
    this.updateDynamicScale();
    this.renderer.render(this.scene, this.camera);
  }

  private setupResize(): void {
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.handleResize());
    });
    this.resizeObserver.observe(this.hostRef.nativeElement);
  }

  private setupPointerHandling(): void {
    const canvas = this.canvasRef().nativeElement;

    const onPointerDown = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersects = this.raycaster.intersectObjects(this.poseMeshes, false);
      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const idx = mesh.userData['poseIndex'] as number | undefined;
        if (typeof idx === 'number') {
          this.poseSelected.emit(idx);
        }
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    this.destroyRef.onDestroy(() =>
      canvas.removeEventListener('pointerdown', onPointerDown),
    );
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  private handleResize(): void {
    if (!this.initialized) return;
    const host = this.hostRef.nativeElement;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);

    this.updateDynamicScale();
    this.requestRender();
  }

  // ---------------------------------------------------------------------------
  // Build: plate
  // ---------------------------------------------------------------------------

  private rebuildPlate(plate: PlateWorldSetup): void {
    this.clearGroup(this.plateGroup);

    if (this.plateTexture) {
      this.plateTexture.dispose();
      this.plateTexture = undefined;
    }
    this.plateTexture = generatePlateTexture({
      size_mm: plate.size_mm,
    });

    const plateGeom = new THREE.PlaneGeometry(plate.size_mm, plate.size_mm);
    const plateMat = new THREE.MeshStandardMaterial({
      map: this.plateTexture,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.0,
    });
    const plateMesh = new THREE.Mesh(plateGeom, plateMat);
    plateMesh.position.set(plate.center[0], plate.center[1], plate.center[2]);
    this.plateGroup.add(plateMesh);

    const edgeGeom = new THREE.EdgesGeometry(plateGeom);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x222222 });
    const edges = new THREE.LineSegments(edgeGeom, edgeMat);
    edges.position.copy(plateMesh.position);
    this.plateGroup.add(edges);
  }

  // ---------------------------------------------------------------------------
  // Build: pose markers (camera frusta)
  // ---------------------------------------------------------------------------

  private rebuildMarkers(
    poses: CanonicalPose[],
    statuses: CalibrationPoseStatus[],
    cam: CameraHardware,
    plate: PlateWorldSetup,
    selectedIdx: number | null,
    conflictIdx: number | null,
  ): void {
    this.clearGroup(this.markersGroup);
    this.poseMeshes = [];

    if (poses.length === 0) return;

    const sensor = computeSensorDimensions(
      cam.sensor.width_px,
      cam.sensor.height_px,
      cam.sensor.pixel_pitch_um,
    );
    const far = FRUSTUM_FAR_MM;
    const halfWFar = (far * sensor.width_mm) / (2 * cam.lens.focal_length_mm);
    const halfHFar = (far * sensor.height_mm) / (2 * cam.lens.focal_length_mm);

    const frustumGeom = this.buildFrustumGeometry(halfWFar, halfHFar, far);
    const labelScale = Math.max(Math.min(Math.max(halfWFar, halfHFar) * 0.9, 44), 24);

    poses.forEach((pose, idx) => {
      const isAnchor = idx === 0;
      const status: CalibrationPoseStatus = statuses[idx] ?? 'planned';
      const isSelected = selectedIdx === idx;
      const isConflict = conflictIdx === idx;
      const color = isConflict
        ? CONFLICT_HIGHLIGHT_COLOR
        : isAnchor
          ? ANCHOR_COLOR
          : POSE_STATUS_COLORS[status];

      const mat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: isConflict ? 0.7 : isAnchor ? 0.55 : 0.40,
        side: THREE.DoubleSide,
        roughness: 0.6,
      });
      const mesh = new THREE.Mesh(frustumGeom, mat);
      mesh.userData['poseIndex'] = idx;

      mesh.position.set(pose.position[0], pose.position[1], pose.position[2]);
      mesh.quaternion.set(
        pose.quaternion[0],
        pose.quaternion[1],
        pose.quaternion[2],
        pose.quaternion[3],
      );

      const labelSprite = this.buildPoseLabelSprite(String(idx + 1), color, labelScale);
      labelSprite.position.set(0, 0, far * 0.68);
      mesh.add(labelSprite);

      if (isSelected) {
        const edgeGeom = new THREE.EdgesGeometry(frustumGeom);
        const edgeMat = new THREE.LineBasicMaterial({
          color: SELECTED_OUTLINE_COLOR,
        });
        const outline = new THREE.LineSegments(edgeGeom, edgeMat);
        mesh.add(outline);

        const footprint = this.buildFovFootprint(
          pose,
          plate,
          halfWFar,
          halfHFar,
          far,
        );
        if (footprint) {
          this.markersGroup.add(footprint);
        }

        mesh.scale.set(1.08, 1.08, 1.08);
      }

      this.markersGroup.add(mesh);
      this.poseMeshes.push(mesh);
    });
  }

  private buildFovFootprint(
    pose: CanonicalPose,
    plate: PlateWorldSetup,
    halfWFar: number,
    halfHFar: number,
    far: number,
  ): THREE.Group {
    const groundZ = plate.center[2];
    const origin = new THREE.Vector3(pose.position[0], pose.position[1], pose.position[2]);
    const quaternion = new THREE.Quaternion(pose.quaternion[0], pose.quaternion[1], pose.quaternion[2], pose.quaternion[3]);

    const localCorners: ReadonlyArray<readonly [number, number, number]> = [
      [-halfWFar, +halfHFar, far],
      [+halfWFar, +halfHFar, far],
      [+halfWFar, -halfHFar, far],
      [-halfWFar, -halfHFar, far],
    ];

    const hitPoints: THREE.Vector3[] = [];
    let allHitGround = true;

    // Disegna sempre i raggi. Se non colpiscono terra (paralleli o verso l'alto),
    // li proiettiamo a 2000mm di distanza giusto per indicare la direzione
    for (const [lx, ly, lz] of localCorners) {
      const dir = new THREE.Vector3(lx, ly, lz).applyQuaternion(quaternion).normalize();

      if (Math.abs(dir.z) < 1e-5) {
        allHitGround = false;
        hitPoints.push(origin.clone().addScaledVector(dir, 2000));
      } else {
        const t = (groundZ - origin.z) / dir.z;
        if (t <= 0) {
          allHitGround = false;
          hitPoints.push(origin.clone().addScaledVector(dir, 2000));
        } else {
          hitPoints.push(origin.clone().addScaledVector(dir, t));
        }
      }
    }

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
    let centerHit: THREE.Vector3 | null = null;

    if (Math.abs(forward.z) > 1e-5) {
      const tCenter = (groundZ - origin.z) / forward.z;
      if (tCenter > 0) {
        centerHit = origin.clone().addScaledVector(forward, tCenter);
      }
    }

    // Se anche solo un punto non colpisce terra, l'area è per forza "sbordata"
    let outside = !allHitGround;
    const halfP = plate.size_mm / 2;
    const px = plate.center[0];
    const py = plate.center[1];

    if (!outside) {
      outside = hitPoints.some(
        (p) => p.x < px - halfP || p.x > px + halfP || p.y < py - halfP || p.y > py + halfP,
      );
    }

    const color = outside ? FOOTPRINT_OUT_COLOR : FOOTPRINT_OK_COLOR;
    const group = new THREE.Group();

    // 1) 4 linee laterali: Vengono sempre disegnate per mostrare il volume FOV
    const sidePts: THREE.Vector3[] = [];
    for (const hp of hitPoints) {
      sidePts.push(origin.clone(), hp.clone());
    }
    const sidesGeom = new THREE.BufferGeometry().setFromPoints(sidePts);
    const sidesMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const sides = new THREE.LineSegments(sidesGeom, sidesMat);
    sides.renderOrder = 9;
    group.add(sides);

    // 2) Rettangolo a terra: disegnato solo se i raggi colpiscono effettivamente il pavimento
    if (allHitGround) {
      const loopGeom = new THREE.BufferGeometry().setFromPoints([
        hitPoints[0], hitPoints[1], hitPoints[2], hitPoints[3], hitPoints[0],
      ]);
      const loopMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 });
      const loop = new THREE.Line(loopGeom, loopMat);
      loop.renderOrder = 10;
      group.add(loop);
    }

    // 3) Croce centrale: disegnata solo se il centro dell'ottica colpisce il pavimento
    if (centerHit) {
      const diag = hitPoints[0].distanceTo(hitPoints[2]);
      const axisLen = Math.max(diag * 0.22, 50);
      const axes = new THREE.AxesHelper(axisLen);
      axes.position.set(centerHit.x, centerHit.y, centerHit.z + 1);
      axes.renderOrder = 11;
      group.add(axes);

      const ch = axisLen * 0.35;
      const crosshairGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(centerHit.x - ch, centerHit.y, centerHit.z + 1),
        new THREE.Vector3(centerHit.x + ch, centerHit.y, centerHit.z + 1),
        new THREE.Vector3(centerHit.x, centerHit.y - ch, centerHit.z + 1),
        new THREE.Vector3(centerHit.x, centerHit.y + ch, centerHit.z + 1),
      ]);
      const crosshairMat = new THREE.LineBasicMaterial({ color: CROSSHAIR_COLOR, transparent: true, opacity: 0.7 });
      const crosshair = new THREE.LineSegments(crosshairGeom, crosshairMat);
      crosshair.renderOrder = 11;
      group.add(crosshair);
    }

    // ELIMINATO: Etichetta dimensionale (dimLabel) rimossa per evitare ostruzioni visive

    return group;
  }

  private buildPoseLabelSprite(label: string, color: number, labelHeight: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const fallbackWidth = 96;
    const fallbackHeight = 52;
    canvas.width = fallbackWidth;
    canvas.height = fallbackHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const fontSize = 30;
      const paddingX = 18;
      const paddingY = 10;
      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      const textWidth = Math.ceil(ctx.measureText(label).width);

      canvas.width = textWidth + paddingX * 2;
      canvas.height = fontSize + paddingY * 2;

      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      this.drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, 14, this.hexToRgba(color, 0.88));

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      this.strokeRoundedRect(ctx, 1, 1, canvas.width - 2, canvas.height - 2, 13);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(labelHeight * aspect, labelHeight, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: string,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  private strokeRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.stroke();
  }

  private hexToRgba(color: number, alpha: number): string {
    const rgb = new THREE.Color(color);
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private buildFrustumGeometry(
    halfW: number,
    halfH: number,
    far: number,
  ): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();

    const apex: [number, number, number] = [0, 0, 0];
    const farTL: [number, number, number] = [-halfW, +halfH, far];
    const farTR: [number, number, number] = [+halfW, +halfH, far];
    const farBR: [number, number, number] = [+halfW, -halfH, far];
    const farBL: [number, number, number] = [-halfW, -halfH, far];

    const positions = new Float32Array([
      ...apex, ...farTL, ...farTR,
      ...apex, ...farTR, ...farBR,
      ...apex, ...farBR, ...farBL,
      ...apex, ...farBL, ...farTL,
      ...farTL, ...farBL, ...farBR,
      ...farTL, ...farBR, ...farTR,
    ]);

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    return geom;
  }

  // ---------------------------------------------------------------------------
  // Camera framing
  // ---------------------------------------------------------------------------

  private fitCameraToScene(): void {
    const box = new THREE.Box3().setFromObject(this.sceneRoot);
    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 100);
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const dist = (maxDim / (2 * Math.tan(fovRad / 2))) * 1.4;

    const dir = new THREE.Vector3(1, -1, 0.7).normalize();
    this.camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));
    this.controls.target.copy(center);
    this.controls.update();
  }

  // ---------------------------------------------------------------------------
  // Render-on-demand
  // ---------------------------------------------------------------------------

  private requestRender(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.initialized) return;
      this.controls?.update();
      this.updateDynamicScale();
      this.renderer.render(this.scene, this.camera);
    });
  }

  private updateDynamicScale(): void {
    if (!this.camera || !this.renderer || !this.controls) return;

    const canvas = this.renderer.domElement;
    if (canvas.clientHeight === 0) return; // Guardia

    const distance = this.camera.position.distanceTo(this.controls.target);

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const visibleHeightMm = 2 * distance * Math.tan(fovRad / 2);

    const mmPerPixel = visibleHeightMm / canvas.clientHeight;

    const targetPx = 120;
    const exactMm = targetPx * mmPerPixel;

    const roundFactor = Math.pow(10, Math.floor(Math.log10(exactMm)));
    let niceMm = Math.round(exactMm / roundFactor) * roundFactor;

    if (niceMm === 0) niceMm = 1;

    const finalPx = niceMm / mmPerPixel;

    this.scaleLabel.set(`${niceMm} mm`);
    this.scaleWidthPx.set(finalPx);
  }

  // ---------------------------------------------------------------------------
  // Disposal
  // ---------------------------------------------------------------------------

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      this.disposeObject(child);
    }
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((node) => {
      const asMesh = node as THREE.Mesh;
      if (asMesh.geometry) {
        asMesh.geometry.dispose();
      }
      const mat = asMesh.material;
      if (mat) {
        if (Array.isArray(mat)) {
          mat.forEach((m) => this.disposeMaterial(m));
        } else {
          this.disposeMaterial(mat);
        }
      }
    });
  }

  private disposeMaterial(material: THREE.Material): void {
    const withMap = material as THREE.Material & { map?: THREE.Texture | null };
    withMap.map?.dispose();
    material.dispose();
  }

  private dispose(): void {
    this.initialized = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    this.controls?.dispose();

    if (this.sceneRoot) {
      this.clearGroup(this.plateGroup);
      this.clearGroup(this.markersGroup);
      this.clearGroup(this.aidsGroup);
      this.scene?.remove(this.sceneRoot);
    }

    if (this.plateTexture) {
      this.plateTexture.dispose();
      this.plateTexture = undefined;
    }

    this.renderer?.dispose();
  }
}