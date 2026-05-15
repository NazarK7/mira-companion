import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardComponent } from './dashboard';
import { ArchiveService } from '../../core/services/archive.service';
import { ThemeService } from '../../core/services/theme.service';

const archiveServiceMock = {
  isLoading: signal(false),
  countCustomers: signal(0),
  countPlants: signal(0),
  countStations: signal(0),
  countCameras: signal(0),
  lastSavedAt: signal<string | null>(null),
  isSaving: signal(false),
  error: signal<string | null>(null),
};

const themeServiceMock = {
  theme: signal<'light' | 'dark' | 'auto'>('auto'),
  resolvedTheme: signal<'light' | 'dark'>('light'),
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        {
          provide: ArchiveService,
          useValue: archiveServiceMock,
        },
        {
          provide: ThemeService,
          useValue: themeServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
