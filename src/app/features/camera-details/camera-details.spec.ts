import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraDetails } from './camera-details';

describe('CameraDetails', () => {
  let component: CameraDetails;
  let fixture: ComponentFixture<CameraDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CameraDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(CameraDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
