import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalibrationWizard } from './calibration-wizard';

describe('CalibrationWizard', () => {
  let component: CalibrationWizard;
  let fixture: ComponentFixture<CalibrationWizard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalibrationWizard],
    }).compileComponents();

    fixture = TestBed.createComponent(CalibrationWizard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
