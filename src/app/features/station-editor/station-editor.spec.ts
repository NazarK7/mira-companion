import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationEditor } from './station-editor';

describe('StationEditor', () => {
  let component: StationEditor;
  let fixture: ComponentFixture<StationEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(StationEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
