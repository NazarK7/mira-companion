/**
 * AppComponent — root component dell'applicazione.
 *
 * Layout:
 *  ┌──────────────────────────────────────────────┐
 *  │ Sidenav │  Toolbar (theme toggle, etc.)      │
 *  │         │ ─────────────────────────────────  │
 *  │ - Dash  │                                    │
 *  │ - Cust  │  <router-outlet>                   │
 *  │ - Calc  │                                    │
 *  │ - Set   │                                    │
 *  │         │                                    │
 *  └──────────────────────────────────────────────┘
 *
 * Mobile (Handset breakpoint): sidenav diventa overlay drawer.
 */

import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { ThemeService, type Theme } from './core/services/theme.service';

interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  protected readonly themeService = inject(ThemeService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  /** True quando viewport è handset (sidenav passa in overlay mode). */
  protected readonly isMobile = toSignal(
    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .pipe(map(result => result.matches)),
    { initialValue: false },
  );

  /** Stato apertura sidenav (rilevante solo desktop; mobile è gestito dal mat-sidenav). */
  protected readonly sidenavOpen = signal(true);

protected readonly navItems: readonly NavItem[] = [
    { label: 'Dashboard',   icon: 'dashboard', route: '/dashboard' },
    { label: 'Customers',   icon: 'business',  route: '/customers' },
    { label: 'Calib. Wizard', icon: 'auto_awesome', route: '/calibration-wizard' }, // <-- IL NUOVO TOOL
    { label: '3D Sandbox',  icon: 'view_in_ar', route: '/calibration-sandbox' },    // <-- IL VECCHIO PLAYGROUND
    { label: 'Calculators', icon: 'calculate', route: '/calculators' },
    { label: 'Settings',    icon: 'settings',  route: '/settings' },
  ] as const;

  protected setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  protected toggleSidenav(): void {
    this.sidenavOpen.update(v => !v);
  }
}