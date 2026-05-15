import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlantDetail } from './plant-detail';

describe('PlantDetail', () => {
  let component: PlantDetail;
  let fixture: ComponentFixture<PlantDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlantDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(PlantDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
