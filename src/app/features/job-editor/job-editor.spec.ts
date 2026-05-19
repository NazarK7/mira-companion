import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobEditor } from './job-editor';

describe('JobEditor', () => {
  let component: JobEditor;
  let fixture: ComponentFixture<JobEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(JobEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
