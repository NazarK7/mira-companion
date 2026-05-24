// src/app/app.component.ts
import { Component, inject, signal, viewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

// Core Services & Components
import { ThemeService, type Theme } from './core/services/theme.service';
import { I18nService } from './shared/services/i18n.service';
import { AppButtonComponent } from './shared/components/button/button.component';
import { ToastContainerComponent } from './shared/components/feedback-toast/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog';
import { LoadingOverlayComponent } from "./shared/components/loading-overlay/loading-overlay";
import { LoadingService } from './shared/services/loading.service';

interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AppButtonComponent,
    ToastContainerComponent,
    ConfirmDialogComponent,
    LoadingOverlayComponent
],
  templateUrl: './app.html',
  styleUrl: './app.scss', // Tailwind v4 gestirà quasi tutto qui
})
export class AppComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly i18n = inject(I18nService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  /** Riferimento globale per dialoghi di conferma (accessibile via iniezione di AppComponent) */
  readonly confirm = viewChild.required(ConfirmDialogComponent);
  protected readonly loading = inject(LoadingService);

  /** Rilevamento Mobile via BreakpointObserver (CDK) convertito in Signal */
  protected readonly isMobile = toSignal(
    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .pipe(map(result => result.matches)),
    { initialValue: false },
  );

  /** Stato apertura sidenav reattivo */
  protected readonly sidenavOpen = signal(true);

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Dashboard', icon: 'grid_view', route: '/dashboard' },
    { label: 'Customers', icon: 'business', route: '/customers' },
    { label: 'Calib. Wizard', icon: 'auto_awesome', route: '/calibration-wizard' },
    { label: '3D Sandbox', icon: 'view_in_ar', route: '/calibration-sandbox' },
    { label: 'Calculators', icon: 'calculate', route: '/calculators' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
  ] as const;

  protected setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  protected toggleSidenav(): void {
    this.sidenavOpen.update(v => !v);
  }
}