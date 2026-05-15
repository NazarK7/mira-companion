import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationDetail } from './station-detail';

describe('StationDetail', () => {
  let component: StationDetail;
  let fixture: ComponentFixture<StationDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(StationDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
