import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlantEditor } from './plant-editor';

describe('PlantEditor', () => {
  let component: PlantEditor;
  let fixture: ComponentFixture<PlantEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlantEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(PlantEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
