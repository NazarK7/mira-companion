import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraEditor } from './camera-editor';

describe('CameraEditor', () => {
  let component: CameraEditor;
  let fixture: ComponentFixture<CameraEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CameraEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(CameraEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
