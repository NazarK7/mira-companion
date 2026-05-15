/**
 * ThemeService — gestione tema light / dark / auto.
 *
 * Pattern signal-based (Angular 21):
 * - `theme()` → preferenza utente ('light' | 'dark' | 'auto')
 * - `resolvedTheme()` → tema effettivamente applicato (mai 'auto')
 * - Persistito in localStorage
 * - Reagisce al cambio di OS preference quando theme = 'auto'
 * - Applica al DOM via `<html data-theme="...">` + classe `.dark` per Tailwind
 */

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type Theme = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'mira-companion:theme';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

function isValidTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'auto';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  /** Preferenza dell'utente. */
  readonly theme = signal<Theme>(this.loadFromStorage());

  /** Tracking dello stato OS dark (aggiornato dal media query listener). */
  private readonly osPrefersDark = signal<boolean>(this.detectOsPrefersDark());

  /**
   * Tema effettivamente applicato. Quando `theme()` è 'auto', segue l'OS.
   * Altrimenti coincide con la preferenza utente.
   */
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const t = this.theme();
    if (t === 'auto') {
      return this.osPrefersDark() ? 'dark' : 'light';
    }
    return t;
  });

  constructor() {
    this.installOsThemeListener();

    // Effetto: applica il resolvedTheme al DOM ogni volta che cambia
    effect(() => {
      const resolved = this.resolvedTheme();
      const html = this.document.documentElement;
      html.classList.toggle('dark', resolved === 'dark');
      html.setAttribute('data-theme', resolved);
      // Color-scheme a livello browser (per scrollbar nativa, form controls)
      html.style.colorScheme = resolved;
    });

    // Effetto: persiste la preferenza in localStorage
    effect(() => {
      this.persistToStorage(this.theme());
    });
  }

  /** Imposta una preferenza esplicita. */
  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  /**
   * Toggle rapido tra light e dark. Se attualmente in 'auto', commuta verso
   * l'opposto del tema risolto corrente.
   */
  toggle(): void {
    const next: Theme = this.resolvedTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private loadFromStorage(): Theme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isValidTheme(stored)) {
        return stored;
      }
    } catch {
      // localStorage disabilitato (private mode, sandboxing, ecc.)
    }
    return 'auto';
  }

  private persistToStorage(theme: Theme): void {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }

  private detectOsPrefersDark(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(DARK_MEDIA_QUERY).matches;
  }

  private installOsThemeListener(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(DARK_MEDIA_QUERY);

    // Prefer addEventListener (modern); fallback addListener su Safari vecchi
    const handler = (e: MediaQueryListEvent) => this.osPrefersDark.set(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else if ((mq as any).addListener) {
      (mq as any).addListener(handler);
    }
  }
}