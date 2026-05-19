import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlantList } from './plant-list';

describe('PlantList', () => {
  let component: PlantList;
  let fixture: ComponentFixture<PlantList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlantList],
    }).compileComponents();

    fixture = TestBed.createComponent(PlantList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
