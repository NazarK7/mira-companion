/**
 * Smoke test ThreeViewerComponent.
 *
 * Vitest 4 gira su jsdom/happy-dom: niente WebGL nativo. Mocking di
 * THREE.WebGLRenderer e OrbitControls è obbligatorio per esercitare il
 * lifecycle del componente senza esplodere su `new WebGLRenderer`.
 *
 * Scope smoke test:
 *   1. Il componente si crea senza eccezioni
 *   2. Dispose pulito senza eccezioni
 *   3. Resize handler non crasha
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';

class FakeResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.stubGlobal('ResizeObserver', FakeResizeObserver);

// --- MOCK THREE.WebGLRenderer ------------------------------------------------
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();

  class FakeWebGLRenderer {
    domElement: HTMLCanvasElement;
    constructor(opts?: { canvas?: HTMLCanvasElement }) {
      this.domElement = opts?.canvas ?? document.createElement('canvas');
    }
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    render = vi.fn();
    dispose = vi.fn();
  }

  return {
    ...actual,
    WebGLRenderer: FakeWebGLRenderer as unknown as typeof actual.WebGLRenderer,
  };
});

// --- MOCK OrbitControls ------------------------------------------------------
vi.mock('three/addons/controls/OrbitControls.js', () => {
  class FakeOrbitControls {
    target = {
      copy: vi.fn(),
      set: vi.fn(),
    };
    enableDamping = false;
    dampingFactor = 0;
    private listeners = new Map<string, Array<() => void>>();
    constructor(_camera: unknown, _domElement: unknown) {}
    addEventListener(name: string, fn: () => void): void {
      const arr = this.listeners.get(name) ?? [];
      arr.push(fn);
      this.listeners.set(name, arr);
    }
    update = vi.fn();
    dispose = vi.fn();
  }
  return { OrbitControls: FakeOrbitControls };
});

import { ThreeViewer } from './three-viewer';
import type {
  CanonicalPose,
  PlateWorldSetup,
  CameraHardware,
} from '../../../core/models/domain.model';

describe('ThreeViewer', () => {
  let fixture: ComponentFixture<ThreeViewer>;

  const anchorPose: CanonicalPose = {
    position: [0, 0, 950],
    quaternion: [1, 0, 0, 0], // 180° rotation around X → looks toward -Z world
  };

  const secondPose: CanonicalPose = {
    position: [200, 100, 950],
    quaternion: [0.9659, 0.2588, 0, 0],
  };

  const plate: PlateWorldSetup = {
    size_mm: 250,
    center: [0, 0, 0],
  };

  const cam: CameraHardware = {
    model: 'Matrox Iris GTR',
    sensor: {
      width_px: 2448,
      height_px: 2048,
      pixel_pitch_um: 3.45,
    },
    lens: {
      focal_length_mm: 12,
      aperture_min_f: 2.8,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreeViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(ThreeViewer);
    const componentRef = fixture.componentRef;
    componentRef.setInput('poses', [anchorPose, secondPose]);
    componentRef.setInput('plateSetup', plate);
    componentRef.setInput('cameraHardware', cam);

    // Force host container size: jsdom default = 0×0
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(host, 'clientHeight', { configurable: true, value: 600 });
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('si crea senza errori', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('si distrugge senza errori (dispose pulito)', () => {
    fixture.detectChanges();
    expect(() => fixture.destroy()).not.toThrow();
  });

  it('non crasha al resize del container', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 1024 });
    Object.defineProperty(host, 'clientHeight', { configurable: true, value: 768 });

    // Simula il dispatch di un evento di resize a livello window: il ResizeObserver
    // del componente non lo riceve direttamente, ma chiamare detectChanges dopo
    // modifica del DOM è sufficiente per verificare che nulla esploda.
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('renderizza una label numerica su ogni frustum', () => {
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      markersGroup: THREE.Group;
    };

    const markerMeshes = component.markersGroup.children as THREE.Object3D[];
    expect(markerMeshes).toHaveLength(2);

    markerMeshes.forEach((marker, index) => {
      const labelSprite = marker.children.find((child) => child instanceof THREE.Sprite);
      expect(labelSprite).toBeTruthy();

      const material = (labelSprite as THREE.Sprite).material as THREE.SpriteMaterial;
      expect(material.map).toBeTruthy();
      expect((marker as THREE.Mesh).userData['poseIndex']).toBe(index);
    });
  });
});