import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraPovViewer } from './camera-pov-viewer';

describe('CameraPovViewer', () => {
  let component: CameraPovViewer;
  let fixture: ComponentFixture<CameraPovViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CameraPovViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(CameraPovViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
