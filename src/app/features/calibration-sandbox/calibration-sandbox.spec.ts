import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CalibrationSandboxComponent } from './calibration-sandbox';

@Component({
  selector: 'app-three-viewer',
  template: '',
})
class ThreeViewerStubComponent {
  readonly poses = input.required<unknown[]>();
  readonly plateSetup = input.required<unknown>();
  readonly cameraHardware = input.required<unknown>();
  readonly poseStatuses = input<unknown[]>([]);
  readonly selectedPoseIndex = input<number | null>(null);
  readonly conflictPoseIndex = input<number | null>(null);
  readonly showGrid = input<boolean>(true);
  readonly showAxisHelper = input<boolean>(true);
  readonly showOrigin = input<boolean>(true);
  readonly poseSelected = output<number>();
}

describe('CalibrationSandboxComponent', () => {
  let fixture: ComponentFixture<CalibrationSandboxComponent>;

  beforeEach(async () => {
    const { ThreeViewer } = await import('../../shared/components/three-viewer/three-viewer');

    await TestBed.configureTestingModule({
      imports: [CalibrationSandboxComponent],
    })
      .overrideComponent(CalibrationSandboxComponent, {
        remove: { imports: [ThreeViewer] },
        add: { imports: [ThreeViewerStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CalibrationSandboxComponent);
    fixture.detectChanges();
  });

  it('si crea senza errori', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('mostra il riepilogo della pose selezionata', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Calibration Sandbox');
    expect(root.textContent).toContain('Anchor');
    expect(root.textContent).toContain('Matrox Iris GTR');
  });
});