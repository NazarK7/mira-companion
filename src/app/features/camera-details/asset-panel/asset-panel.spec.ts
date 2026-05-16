import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetPanel } from './asset-panel';

describe('AssetPanel', () => {
  let component: AssetPanel;
  let fixture: ComponentFixture<AssetPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
