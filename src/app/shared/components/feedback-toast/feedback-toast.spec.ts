import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackToast } from './feedback-toast';

describe('FeedbackToast', () => {
  let component: FeedbackToast;
  let fixture: ComponentFixture<FeedbackToast>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackToast],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackToast);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
