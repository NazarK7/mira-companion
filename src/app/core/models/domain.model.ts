/**
 * MiRa Companion — Domain Model
 *
 * Architettura gerarchica:
 *   Customer → Plant[] → Station[] → Camera[] → { Jobs[], Calibrations[], Backups[] }
 *
 * NOTE STORICHE:
 * - 2026-05-13: corretta convenzione Comau (era ZYX, è ZYZ A/E/R) e Fanuc
 *   (era XYZ intrinseco, è XYZ estrinseco). Vedi `pose-conversions.util.ts`.
 */

// =============================================================================
// PRIMITIVE TYPES
// =============================================================================

export interface BlobRef {
  relative_path: string;
  size_bytes: number;
  sha256?: string;
  mime_type?: string;
}

export type Vec3 = readonly [number, number, number];
export type Quaternion = readonly [number, number, number, number];

// =============================================================================
// ROBOT POSE — multi-controller
// =============================================================================

export type RobotControllerType = 'ABB' | 'Comau' | 'Fanuc' | 'Kuka';

/**
 * Rappresentazione canonica interna di una pose robot.
 * - position: [X, Y, Z] in mm
 * - quaternion: [qx, qy, qz, qw] (scalare ULTIMO, normalizzato)
 */
export interface CanonicalPose {
  position: Vec3;
  quaternion: Quaternion;
}

/**
 * Pose ABB.
 *
 * Convenzione ABB: quaternione [q1, q2, q3, q4] dove q1 = w (scalare PER PRIMO).
 * Diverso dalla nostra canonica che ha lo scalare per ultimo.
 */
export interface ABBPose {
  type: 'ABB';
  /** Position [X, Y, Z] in mm. */
  trans: Vec3;
  /** Quaternione ABB: [q1=w, q2=x, q3=y, q4=z]. */
  rot: Quaternion;
  /** Robot configuration [cf1, cf4, cf6, cfx]. Opzionale. */
  robconf?: readonly [number, number, number, number];
}

/**
 * Pose Comau (PDL2 convention).
 *
 * Convenzione: angoli AER in gradi, **ZYZ intrinseco**.
 *  - A (Azimuth)   = prima rotazione attorno a Z base
 *  - E (Elevation) = seconda rotazione attorno a Y' (Y dopo la prima)
 *  - R (Roll)      = terza rotazione attorno a Z'' (Z dopo le prime due)
 *
 * Rotazione totale: R_total = Rz(A) · Ry(E) · Rz(R)
 *
 * GIMBAL LOCK quando E = 0° o E = 180°: A e R diventano accoppiati. La conversione
 * canonical → AER in quel caso fissa R = 0 per convenzione.
 *
 * Sui polsi sferici Comau (giunti J4, J5, J6) questa convenzione mappa diretto
 * sui giunti meccanici.
 */
export interface ComauPose {
  type: 'Comau';
  /** Position [X, Y, Z] in mm. */
  position: Vec3;
  /** Angoli [A, E, R] in gradi (ZYZ intrinseco). */
  aer: Vec3;
}

/**
 * Pose Fanuc (WPR convention).
 *
 * Convenzione: angoli WPR in gradi, **XYZ estrinseco** (rotazioni intorno agli
 * assi del WORLD frame, in ordine X poi Y poi Z).
 *  - W = rotazione intorno a X world
 *  - P = rotazione intorno a Y world
 *  - R = rotazione intorno a Z world
 *
 * Rotazione totale: R_total = Rz(R) · Ry(P) · Rx(W)
 *
 * Identità matematica utile: XYZ estrinseco ≡ ZYX intrinseco. Usata
 * nell'implementazione (gl-matrix order 'zyx').
 */
export interface FanucPose {
  type: 'Fanuc';
  /** Position [X, Y, Z] in mm. */
  position: Vec3;
  /** Angoli [W, P, R] in gradi (XYZ estrinseco). */
  wpr: Vec3;
  /** Configuration string Fanuc: es. "F U T B 0 0". */
  config?: string;
}

/**
 * Pose Kuka (KRL convention).
 *
 * Convenzione: angoli ABC in gradi, **ZYX intrinseco** (rotazioni intorno agli
 * assi BODY frame, in ordine Z poi Y' poi X'').
 *  - A = rotazione intorno a Z body
 *  - B = rotazione intorno a Y' body (dopo A)
 *  - C = rotazione intorno a X'' body (dopo A,B)
 *
 * Rotazione totale: R_total = Rz(A) · Ry(B) · Rx(C)
 *
 * Equivalenza Fanuc↔Kuka: stessa rotazione fisica esprime come
 *   Fanuc [W, P, R]  ≡  Kuka [A=R, B=P, C=W]
 * (perché entrambe matematicamente coincidono in ZYX intrinseco con outer
 * angoli scambiati).
 */
export interface KukaPose {
  type: 'Kuka';
  /** Position [X, Y, Z] in mm. */
  position: Vec3;
  /** Angoli [A, B, C] in gradi (ZYX intrinseco). */
  abc: Vec3;
  /** Status & Turn (KUKA-specific kinematic config). */
  status_turn?: { s: number; t: number };
}

export type ControllerPose = ABBPose | ComauPose | FanucPose | KukaPose;

export interface RobotPose {
  canonical: CanonicalPose;
  controller_format: ControllerPose;
}

// =============================================================================
// CAMERA HARDWARE
// =============================================================================

export interface CameraHardware {
  model: string;
  sensor: {
    width_px: number;
    height_px: number;
    pixel_pitch_um: number;
  };
  lens: {
    focal_length_mm: number;
    aperture_min_f: number;
    aperture_max_f?: number;
    model?: string;
  };
  mac_address?: string;
  serial_number?: string;
}

// =============================================================================
// LICENZE
// =============================================================================

export interface HalconLicense {
  blob_ref: BlobRef;
  version?: string;
  expires_at?: string;
  notes?: string;
}

export interface ComauLicense {
  blob_ref: BlobRef;
  mac_linked?: string;
  comau_referent_contact?: string;
  reissue_procedure?: string;
  notes?: string;
}

// =============================================================================
// ROBOT INTEGRATION
// =============================================================================

export interface RobotThresholdsConfig {
  pickup_tolerance: {
    dx_mm: number;
    dy_mm: number;
    dz_mm: number;
    drx_deg: number;
    dry_deg: number;
    drz_deg: number;
  };
  max_offset_limits: {
    dx_mm: number;
    dy_mm: number;
    dz_mm: number;
    drx_deg: number;
    dry_deg: number;
    drz_deg: number;
    max_dz_mm: number;
  };
  iteration_settings: {
    n_attempts: number;
    n_iterations: number;
  };
  correction_enabled: {
    correct_x: boolean;
    correct_y: boolean;
    correct_z: boolean;
    correct_rx: boolean;
    correct_ry: boolean;
    correct_rz: boolean;
  };
}

export interface CameraNetworkConfig {
  camera_ip: string;
  camera_subnet_mask?: string;
  camera_gateway?: string;
  camera_port: number;
  pc_setup_ip?: string;
  pc_setup_subnet_mask?: string;
  language: 'italiano' | 'english';
}

export interface RobotIntegration {
  controller: RobotControllerType;
  controller_software_version?: string;
  system_id?: string;
  robot_model?: string;
  network: CameraNetworkConfig;
  thresholds: RobotThresholdsConfig;
  full_backup?: BlobRef;
  parsed_files?: {
    config_txt?: string;
    vision_tools_txt?: string;
    mira_platform_usr_excerpt?: string;
    localization_files?: { italian?: string; english?: string };
  };
}

// =============================================================================
// JOB — schema unificato Cognex + MiRa3D con versioning JobBackup
// =============================================================================

/**
 * Test image associata a un backup di job (tipicamente solo Cognex,
 * dove l'In-Sight mantiene un set di test images per il jobx).
 */
export interface JobTestImage {
  id: string;
  filename: string;
  /** Path al blob nel volume backend (relativo a /blobs/). */
  filePath?: string;
  /** Bytes. */
  fileSize?: number;
  /** ISO timestamp di acquisizione (se noto). */
  capturedAt?: string;
  notes?: string;
}

/**
 * Snapshot versionato di un Job. Ogni intervento on-site produce un nuovo
 * JobBackup con timestamp. Cronologia ordinata per `createdAt desc`.
 *
 * Per Cognex: `filePath` punta a un .jobx/.job (~MB). `masterImagePath`
 * è la master image associata. `testImages` ~20 per backup tipico.
 *
 * Per MiRa3D: `filePath` punta a un .zip ~500MB con shape_model_3d
 * + parametri detector + immagini di training.
 */
export interface JobBackup {
  id: string;
  jobId: string;
  createdAt: string;
  filePath?: string;
  fileSize?: number;
  /** Solo Cognex. Path alla master image associata a questo backup. */
  masterImagePath?: string;
  testImages: JobTestImage[];
  /** Note di versione: cosa è cambiato, perché. */
  notes?: string;
  createdBy?: string;
}

/**
 * Job logico (es. "EFAD", "ERAD", "Pallet Sense").
 * Contiene N JobBackup nel tempo.
 *
 * NB: questo è il NUOVO schema. Il vecchio `Job` con detector_params/algorithm
 * era inline alla Camera; ora le configurazioni vivono dentro il blob del
 * JobBackup, non più in metadati strutturati (semplifica drasticamente
 * il backend e i conflitti di versioning).
 */
export interface Job {
  id: string;
  cameraId: string;
  name: string;
  description?: string;
  /** Solo MiRa3D: indice 1..99 che lega al VisionTool_NN del robot. */
  visionToolSlot?: number;
  backups: JobBackup[];
  createdAt: string;
  modifiedAt: string;
}

// =============================================================================
// CALIBRAZIONE
// =============================================================================

export type CalibrationMode = 'production-20' | 'lab-5' | 'extended-30' | 'custom';

export type CalibrationPoseStatus =
  | 'planned'
  | 'in-progress'
  | 'ok'
  | 'ok-with-override'
  | 'ko-unreachable'
  | 'ko-not-recognized'
  | 'skipped';

export interface CalibrationPoseMetrics {
  plate_in_fov_estimated: boolean;
  plate_coverage_pct: number;
  min_translation_diff_to_others_mm: number;
  min_tilt_diff_to_others_deg: number;
}

export interface CalibrationPose {
  index: number;
  planned: RobotPose;
  actual?: RobotPose;
  status: CalibrationPoseStatus;
  metrics: CalibrationPoseMetrics;
  attempted_at?: string;
  photo?: BlobRef;
  notes?: string;
}

export interface CalibrationPlate {
  type: 'caltab250mm' | 'caltab300mm' | 'caltab400mm' | 'caltab125mm' | 'custom';
  size_mm: number;
  descr_filename?: string;
  descr_blob?: BlobRef;
  printable_pdf_blob?: BlobRef;
}

export interface CalibrationResult {
  halcon_pose: CanonicalPose;
  opencv_pose?: CanonicalPose;
  tool_in_cam_pose_dat_blob?: BlobRef;
  intrinsic_blob?: BlobRef;
  min_translational_error: number;
  min_rotational_error: number;
  completed_at: string;
}

export interface Calibration {
  id: string;
  mode: CalibrationMode;
  total_poses_planned: number;
  anchor_pose: RobotPose;
  poses: CalibrationPose[];
  plate: CalibrationPlate;
  result?: CalibrationResult;
  is_current: boolean;
  created_at: string;
  notes?: string;
}

// =============================================================================
// BACKUP
// =============================================================================

export type BackupType =
  | 'release_zip'
  | 'aomei_image'
  | 'recovery_kit'
  | 'manual_files'
  | 'robot_program';

export interface Backup {
  id: string;
  type: BackupType;
  timestamp: string;
  files: BlobRef[];
  checksum_sha256?: string;
  trigger_reason?: string;
  description?: string;
  notes?: string;
}

// =============================================================================
// PHOTO GALLERY E ISSUE TRACKER
// =============================================================================

export type PhotoCategory =
  | 'cell_overview'
  | 'camera_mount'
  | 'connections'
  | 'lighting'
  | 'plate_setup'
  | 'master_position'
  | 'wiring'
  | 'documentation'
  | 'other';

export interface PhotoEntry {
  id: string;
  blob: BlobRef;
  category: PhotoCategory;
  caption?: string;
  taken_at: string;
}

export type IssueStatus = 'open' | 'in-progress' | 'resolved' | 'wont-fix';
export type IssueSeverity = 'critical' | 'major' | 'minor' | 'informational';

export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

// =============================================================================
// CAMERA
// =============================================================================

// =============================================================================
// CAMERA — schema unificato Cognex + MiRa3D
// =============================================================================

// =============================================================================
// CAMERA — schema unificato Cognex + MiRa3D
// =============================================================================

export type CameraType = 'COGNEX_INSIGHT' | 'COGNEX_DATAMAN' | 'MIRA_3D';

export type CameraStatus =
  | 'planning'
  | 'calibrating'
  | 'job-creation'
  | 'production'
  | 'maintenance'
  | 'archived';

/**
 * Snapshot versionato della licenza Halcon (rinnovi nel tempo).
 * Solo per camere MIRA_3D (Cognex non usa Halcon).
 */
export interface HalconLicenseRecord {
  id: string;
  cameraId: string;
  /** Es. "23.11". */
  version?: string;
  /** ISO date di scadenza. */
  expiryDate?: string;
  filePath?: string;
  fileSize?: number;
  /** Data di rilascio/caricamento del record. */
  createdAt: string;
  notes?: string;
}

/**
 * Snapshot versionato del backup robot (~500MB zip).
 * Solo per camere MIRA_3D che dialogano con un controller robot.
 */
export interface RobotBackupRecord {
  id: string;
  cameraId: string;
  createdAt: string;
  filePath?: string;
  fileSize?: number;
  robotController?: RobotControllerType;
  /** Es. "RobotWare 6.13.02". */
  controllerVersion?: string;
  notes?: string;
}

export type MaintenanceCategory =
  | 'installation'
  | 'calibration'
  | 'job_update'
  | 'license_renewal'
  | 'hardware_swap'
  | 'firmware_update'
  | 'troubleshooting'
  | 'other';

/**
 * Evento di manutenzione/intervento sulla camera. Timeline ordinata per
 * `occurredAt desc` in UI.
 */
export interface MaintenanceEvent {
  id: string;
  cameraId: string;
  occurredAt: string;
  category: MaintenanceCategory;
  title: string;
  description?: string;
  performedBy?: string;
}

export interface Camera {
  id: string;
  stationId: string;

  // ─── Identità (required) ──────────────────────────────────────────────────
  name: string;
  type: CameraType;

  // ─── Hardware (tutti opzionali) ───────────────────────────────────────────
  cameraModel?: string;
  lensFocalMm?: number;
  firmware?: string;
  ipAddress?: string;
  serialNumber?: string;
  macAddress?: string;

  // ─── MIRA_3D only ─────────────────────────────────────────────────────────
  controllerType?: RobotControllerType;

  // ─── Note ─────────────────────────────────────────────────────────────────
  plcNotes?: string;
  notes?: string;
  tags?: string[];
  status?: CameraStatus;

  // ─── Sub-entities ─────────────────────────────────────────────────────────
  jobs: Job[];
  halconLicenses: HalconLicenseRecord[];
  robotBackups: RobotBackupRecord[];
  maintenanceEvents: MaintenanceEvent[];

  // ─── Audit ────────────────────────────────────────────────────────────────
  createdAt: string;
  modifiedAt: string;
}

/**
 * Snapshot versionato del backup robot (~500MB zip).
 * Solo per camere MIRA_3D che dialogano con un controller robot.
 */
export interface RobotBackupRecord {
  id: string;
  cameraId: string;
  createdAt: string;
  filePath?: string;
  fileSize?: number;
  robotController?: RobotControllerType;
  /** Es. "RobotWare 6.13.02". */
  controllerVersion?: string;
  notes?: string;
}


/**
 * Evento di manutenzione/intervento sulla camera. Timeline ordinata per
 * `occurredAt desc` in UI.
 */
export interface MaintenanceEvent {
  id: string;
  cameraId: string;
  occurredAt: string;
  category: MaintenanceCategory;
  title: string;
  description?: string;
  performedBy?: string;
}

export interface Camera {
  id: string;
  stationId: string;

  // ─── Identità (required) ──────────────────────────────────────────────────
  name: string;
  type: CameraType;

  // ─── Hardware (tutti opzionali) ───────────────────────────────────────────
  cameraModel?: string;
  lensFocalMm?: number;
  firmware?: string;
  ipAddress?: string;
  serialNumber?: string;
  macAddress?: string;

  // ─── MIRA_3D only ─────────────────────────────────────────────────────────
  controllerType?: RobotControllerType;

  // ─── Note ─────────────────────────────────────────────────────────────────
  plcNotes?: string;
  notes?: string;
  tags?: string[];
  status?: CameraStatus;

  // ─── Sub-entities ─────────────────────────────────────────────────────────
  jobs: Job[];
  halconLicenses: HalconLicenseRecord[];
  robotBackups: RobotBackupRecord[];
  maintenanceEvents: MaintenanceEvent[];

  // ─── Audit ────────────────────────────────────────────────────────────────
  createdAt: string;
  modifiedAt: string;
}



// =============================================================================
// STATION / PLANT / CUSTOMER
// =============================================================================

export type StationStatus = 'planning' | 'production' | 'maintenance' | 'archived';

export interface Station {
  id: string;
  plantId: string;

  // ─── Identità (only `name` required) ──────────────────────────────────────
  name: string;
  code?: string;
  line?: string;
  description?: string;
  installDate?: string;
  recoveryProcedure?: string;
  notes?: string;
  status?: StationStatus;
  tags?: string[];

  cameras: Camera[];

  createdAt: string;
  modifiedAt: string;
}

export type ContactCategory =
  | 'plant_referent'
  | 'it_referent'
  | 'robotics_referent'
  | 'comau_referent'
  | 'other';

export interface Contact {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  category?: ContactCategory;
  notes?: string;
}

export interface Plant {
  id: string;
  customerId: string;

  // ─── Identità (only `name` required) ──────────────────────────────────────
  name: string;
  location?: string;
  address?: string;
  notes?: string;

  contacts: Contact[];
  stations: Station[];

  createdAt: string;
  modifiedAt: string;
}

export interface Customer {
  id: string;
  /** URL-friendly slug, usato come param di route. */
  slug: string;

  // ─── Identità (only `name` required) ──────────────────────────────────────
  name: string;
  shortName?: string;
  notes?: string;

  contacts: Contact[];
  plants: Plant[];

  createdAt: string;
  modifiedAt: string;
}

// =============================================================================
// TOP-LEVEL ARCHIVE STATE
// =============================================================================

export interface ArchiveState {
  schema_version: number;
  customers: Customer[];
  audit_log: AuditEntry[];
  settings: ToolSettings;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'export' | 'import';
  entityType:
  | 'customer'
  | 'plant'
  | 'station'
  | 'camera'
  | 'job'
  | 'job_backup'
  | 'halcon_license'
  | 'robot_backup'
  | 'maintenance_event'
  | 'calibration'
  | 'other';
  entityId: string;
  entityPath: string;
  changeSummary: string;
  diffJson?: string;
}

export interface ToolSettings {
  ui_language: 'it' | 'en';
  projects_root_path?: string;
  theme: 'light' | 'dark' | 'auto';
  preferred_pose_format: Record<RobotControllerType, 'native' | 'canonical'>;
  encryption_enabled: boolean;
}

// =============================================================================
// HELPER TYPES PER ALGORITMI
// =============================================================================

export interface PoseGeneratorConstraints {
  n_total_poses: number;

  // -- NUOVI PARAMETRI CUPOLA SFERICA --
  dome: {
    radius_mm: number;                 // Distanza operativa (es. 600mm)
    azimuth_range_deg: [number, number];  // Giro intorno al plate (es. 0 - 360)
    elevation_range_deg: [number, number];// Inclinazione (es. 20 - 85, 0=terra, 90=zenit)
  };

  // -- TOLLERANZE REATTIVE --
  min_translation_diff_mm: number; // Range UI: 100 - 500
  min_rotation_diff_deg: number;   // Range UI: 15 - 45

  tilt_range: {
    max_deg: number;
    min_diff_between_poses_deg: number;
  };
  plate_coverage_target_pct: number;
  plate_coverage_min_pct: number;
  plate_coverage_max_pct: number;
}
/** Setup geometrico del plate nel world frame. */
export interface PlateWorldSetup {
  /** Centro del plate nel world frame (mm). */
  center: Vec3;
  /** Lato del plate (mm) — assumiamo plate quadrato. */
  size_mm: number;
  /**
   * Orientamento del plate. Default: identita' (normale = +Z world,
   * lati lungo X e Y world).
   */
  orientation?: Quaternion;
}


// =============================================================================
// HARDWARE CATALOGS (Camera, Lens, Plate)
// =============================================================================

export interface CameraSpec {
  readonly id: string;
  readonly label: string;
  readonly resolution_px: { w: number; h: number };
  readonly pixel_pitch_mm: number;
  readonly sensor_format: string;
  readonly sensor_diagonal_mm: number;
}

export interface LensSpec {
  readonly id: string;
  readonly label: string;
  readonly focal_length_mm: number;
  readonly image_circle_format: string;
  readonly image_circle_diameter_mm: number;
}

export interface PlateSpec {
  readonly id: string;
  readonly label: string;
  readonly size_mm: number;
  readonly grid: { rows: number; cols: number };
  readonly mark_distance_mm: number;
  readonly mark_radius_mm: number;
  readonly frame_thickness_mm: number;
  readonly triangle_mark: {
    p1_mm: readonly [number, number];
    p2_mm: readonly [number, number];
  };
}