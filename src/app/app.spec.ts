import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AppComponent } from './app';
import { ThemeService, type ResolvedTheme, type Theme } from './core/services/theme.service';

const themeServiceMock = {
  theme: signal<Theme>('light'),
  resolvedTheme: signal<ResolvedTheme>('light'),
  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.resolvedTheme.set(theme === 'dark' ? 'dark' : 'light');
  },
};

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: false, breakpoints: {} }),
          },
        },
        {
          provide: ThemeService,
          useValue: themeServiceMock,
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-subtitle')?.textContent).toContain('companion');
  });
});
