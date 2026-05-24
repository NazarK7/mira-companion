// src/app/core/data/features.ts

import { PLATE_CATALOG, DEFAULT_PLATE_ID } from './plate-catalog';
import { CAMERA_CATALOG, DEFAULT_CAMERA_ID } from './camera-catalog';
import { LENS_CATALOG, DEFAULT_LENS_ID } from './lens-catalog';

/**
 * MiRa Companion - Centralized Metadata Store (SSOT)
 * [DATO] Basato sui cataloghi Halcon, Matrox/Zebra e C-Mount forniti.
 */
export const FEATURES = {
  // Configurazione UI e i18n
  UI: {
    LANGUAGES: ['it', 'en'] as const,
    DEFAULT_LANG: 'it',
    THEMES: ['light', 'dark'] as const,
    DEFAULT_THEME: 'dark',
    TOAST_DURATION: 3000,
  },

  // Dominio Visione (Cataloghi aggregati)
  VISION: {
    PLATES: PLATE_CATALOG,
    DEFAULT_PLATE_ID,
    CAMERAS: CAMERA_CATALOG,
    DEFAULT_CAMERA_ID,
    LENSES: LENS_CATALOG,
    DEFAULT_LENS_ID,
  },

  // Dominio Robotica (Placeholder per futuri cataloghi)
  ROBOTICS: {
    VENDORS: ['ABB', 'Fanuc', 'Comau'] as const,
    EULER_CONVENTIONS: {
      COMAU: 'WPR',
      ABB: 'ZYX_STANDARD',
      FANUC: 'ZYX_INTRINSIC'
    } as const
  }
} as const;

// Estrazione Tipi Automatica (Senior Pattern)
export type AppLanguage = typeof FEATURES.UI.LANGUAGES[number];
export type AppTheme = typeof FEATURES.UI.THEMES[number];
export type RobotVendor = typeof FEATURES.ROBOTICS.VENDORS[number];