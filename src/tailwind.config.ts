/**
 * Tailwind CSS v4 — Configurazione
 *
 * I design tokens veri stanno in src/styles/_tokens.scss come CSS variables.
 * Qui si fa il "bridge": espone i token Tailwind utility classes (es. bg-primary-500,
 * text-accent-500, ecc.) in modo che la classe Tailwind risolva alla CSS variable.
 *
 * Vantaggi:
 * - Cambio di tema (light/dark/auto) avviene live via CSS variables, senza ricompilare
 * - Tailwind genera solo le utility che usi (purge automatico)
 * - I componenti Material Angular co-esistono con classi Tailwind
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{html,ts}',
  ],
  darkMode: ['class', '.dark'],   // attiviamo dark via class su <html> o <body>
  theme: {
    extend: {
      colors: {
        primary: {
          50:  'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          DEFAULT: 'var(--color-primary-600)',
        },
        accent: {
          50:  'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
          900: 'var(--color-accent-900)',
          DEFAULT: 'var(--color-accent-500)',
        },
        neutral: {
          0:    'var(--color-neutral-0)',
          50:   'var(--color-neutral-50)',
          100:  'var(--color-neutral-100)',
          200:  'var(--color-neutral-200)',
          300:  'var(--color-neutral-300)',
          400:  'var(--color-neutral-400)',
          500:  'var(--color-neutral-500)',
          600:  'var(--color-neutral-600)',
          700:  'var(--color-neutral-700)',
          800:  'var(--color-neutral-800)',
          900:  'var(--color-neutral-900)',
          950:  'var(--color-neutral-950)',
        },
        success: {
          50:  'var(--color-success-50)',
          500: 'var(--color-success-500)',
          700: 'var(--color-success-700)',
          DEFAULT: 'var(--color-success-500)',
        },
        warning: {
          50:  'var(--color-warning-50)',
          500: 'var(--color-warning-500)',
          700: 'var(--color-warning-700)',
          DEFAULT: 'var(--color-warning-500)',
        },
        danger: {
          50:  'var(--color-danger-50)',
          500: 'var(--color-danger-500)',
          700: 'var(--color-danger-700)',
          DEFAULT: 'var(--color-danger-500)',
        },
        info: {
          50:  'var(--color-info-50)',
          500: 'var(--color-info-500)',
          700: 'var(--color-info-700)',
          DEFAULT: 'var(--color-info-500)',
        },
        // Aliases di superficie/testo per uso semantico
        'bg-app':       'var(--bg-app)',
        'bg-surface':   'var(--bg-surface)',
        'bg-elevated':  'var(--bg-elevated)',
        'bg-subtle':    'var(--bg-subtle)',
        'bg-strong':    'var(--bg-strong)',

        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary':  'var(--text-tertiary)',
        'text-disabled':  'var(--text-disabled)',

        'border-subtle':  'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong':  'var(--border-strong)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        xs:   ['var(--text-xs)',   { lineHeight: 'var(--line-height-normal)' }],
        sm:   ['var(--text-sm)',   { lineHeight: 'var(--line-height-normal)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--line-height-normal)' }],
        lg:   ['var(--text-lg)',   { lineHeight: 'var(--line-height-normal)' }],
        xl:   ['var(--text-xl)',   { lineHeight: 'var(--line-height-tight)' }],
        '2xl':['var(--text-2xl)',  { lineHeight: 'var(--line-height-tight)' }],
        '3xl':['var(--text-3xl)',  { lineHeight: 'var(--line-height-tight)' }],
      },
      borderRadius: {
        none: 'var(--radius-none)',
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      transitionDuration: {
        fast:   'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow:   'var(--duration-slow)',
      },
      transitionTimingFunction: {
        DEFAULT:  'var(--easing-default)',
        emphasis: 'var(--easing-emphasis)',
      },
      zIndex: {
        base:     'var(--z-base)',
        dropdown: 'var(--z-dropdown)',
        sticky:   'var(--z-sticky)',
        overlay:  'var(--z-overlay)',
        modal:    'var(--z-modal)',
        popover:  'var(--z-popover)',
        tooltip:  'var(--z-tooltip)',
        toast:    'var(--z-toast)',
      },
    },
  },
  plugins: [],
};

export default config;