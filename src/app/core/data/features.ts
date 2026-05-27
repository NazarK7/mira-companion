// src/app/core/data/features.ts

import { PLATE_CATALOG, DEFAULT_PLATE_ID } from './plate-catalog';
import { CAMERA_CATALOG, DEFAULT_CAMERA_ID } from './camera-catalog';
import { LENS_CATALOG, DEFAULT_LENS_ID } from './lens-catalog';
import { Camera } from '../models/domain.model';

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
  { value: STATION_STATUS.PRODUCTION, label: 'Production', color: 'success', badgeClass: 'bg-success-500/10 text-success-500 border-success-500/20' },
  { value: STATION_STATUS.MAINTENANCE, label: 'Maintenance', color: 'warning', badgeClass: 'bg-warning-500/10 text-warning-500 border-warning-500/20' },
  { value: STATION_STATUS.PLANNING, label: 'Planning', color: 'info', badgeClass: 'bg-info-500/10 text-info-500 border-info-500/20' },
  { value: STATION_STATUS.ARCHIVED, label: 'Archived', color: 'neutral', badgeClass: 'bg-bg-subtle text-text-tertiary border-border-subtle' }
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
  { value: 'MIRA_3D', label: 'MiRa 3D', badgeClass: 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' },
  { value: 'COGNEX_INSIGHT', label: 'Cognex In-Sight', badgeClass: 'bg-[var(--color-accent-50)] text-[var(--color-accent-700)]' },
  { value: 'COGNEX_DATAMAN', label: 'Cognex DataMan', badgeClass: 'bg-[var(--color-info-50)] text-[var(--color-info-700)]' }
];

export const ROBOT_CONTROLLER_OPTIONS = [
  { value: 'ABB', label: 'ABB (Quaternions)' },
  { value: 'COMAU', label: 'Comau (Euler ZYZ Intrinsic)' },
  { value: 'FANUC', label: 'Fanuc (Euler XYZ Extrinsic)' },
  { value: 'KUKA', label: 'Kuka (Euler ZYX Intrinsic)' }
];


export type AssetKey = 'mira3d' | 'halcon' | 'restart';

export interface AssetConfig {
  key: AssetKey;
  title: string;
  icon: string;
  accept: string;
}

export const ASSET_CONFIGS: AssetConfig[] = [
  { key: 'mira3d', title: 'MiRa3D Backup', icon: 'settings_backup_restore', accept: '.zip' },
  { key: 'halcon', title: 'Halcon License', icon: 'verified_user', accept: '.zip' },
  { key: 'restart', title: 'Restart on Crash', icon: 'rebase_edit', accept: '.pptx,.zip' }
];

// --- CAMERA SPECIFICATIONS UI ---
export interface SpecDefinition {
  label: string;
  key: keyof Camera;
  icon: string;
  suffix?: string;
}

export const CAMERA_SPEC_DEFINITIONS: SpecDefinition[] = [
  { label: 'Model', key: 'cameraModel', icon: 'videocam' },
  { label: 'Focal', key: 'lensFocalMm', icon: 'center_focus_strong', suffix: 'mm' },
  { label: 'IP', key: 'ipAddress', icon: 'lan' },
  { label: 'Firmware', key: 'firmware', icon: 'developer_mode' },
  { label: 'Serial', key: 'serialNumber', icon: 'barcode' },
  { label: 'MAC', key: 'macAddress', icon: 'id_card' }
];

// --- HELPERS (SSOT LOGIC) ---

/** Recupera il nome del file fisico basato sulla chiave asset */
export function getAssetFileName(cam: Camera, key: AssetKey): string | undefined {
  const mapping: Record<AssetKey, string | undefined> = {
    mira3d: cam.mira3dBackupName,
    halcon: cam.halconLicenseName,
    restart: cam.restartOnCrashName
  };
  return mapping[key];
}

/** Recupera la dimensione del file basata sulla chiave asset */
export function getAssetFileSize(cam: Camera, key: AssetKey): number | bigint | undefined {
  const mapping: Record<AssetKey, number | bigint | undefined> = {
    mira3d: cam.mira3dBackupSize,
    halcon: cam.halconLicenseSize,
    restart: cam.restartOnCrashSize
  };
  return mapping[key];
}