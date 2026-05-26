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

// src/app/core/constants/station-status.ts
export const STATION_STATUS = {
  PRODUCTION: 'PRODUCTION',
  MAINTENANCE: 'MAINTENANCE',
  PLANNING: 'PLANNING',
  ARCHIVED: 'ARCHIVED'
} as const;

export type StationStatus = typeof STATION_STATUS[keyof typeof STATION_STATUS];

export const STATION_STATUS_OPTIONS = [
  { value: STATION_STATUS.PRODUCTION, label: 'Production', color: 'success' },
  { value: STATION_STATUS.MAINTENANCE, label: 'Maintenance', color: 'warning' },
  { value: STATION_STATUS.PLANNING, label: 'Planning', color: 'info' },
  { value: STATION_STATUS.ARCHIVED, label: 'Archived', color: 'neutral' }
];

export const CAMERA_STATUS = {
  PLANNING: 'PLANNING',
  CALIBRATING: 'CALIBRATING',
  JOB_CREATION: 'JOB_CREATION',
  PRODUCTION: 'PRODUCTION',
  MAINTENANCE: 'MAINTENANCE',
  ARCHIVED: 'ARCHIVED'
} as const;

export const CAMERA_TYPE_OPTIONS = [
  { value: 'MIRA_3D', label: 'MiRa 3D (Robot Guidance)' },
  { value: 'COGNEX_INSIGHT', label: 'Cognex In-Sight' },
  { value: 'COGNEX_DATAMAN', label: 'Cognex DataMan' }
];

export const ROBOT_CONTROLLER_OPTIONS = [
  { value: 'ABB', label: 'ABB (Quaternions)' },
  { value: 'COMAU', label: 'Comau (Euler ZYZ Intrinsic)' },
  { value: 'FANUC', label: 'Fanuc (Euler XYZ Extrinsic)' },
  { value: 'KUKA', label: 'Kuka (Euler ZYX Intrinsic)' }
];