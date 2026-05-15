/**
 * ArchiveService — stato globale dell'applicazione.
 *
 * Responsabilità:
 * - Mantenere lo stato `ArchiveState` (customers, audit log, settings) in un
 *   Angular signal mutabile.
 * - Caricarlo da StorageService all'avvio.
 * - Auto-salvarlo in background con debounce (500ms) ad ogni modifica.
 * - Esporre accessor computed di alto livello (countCustomers, allStations, etc.)
 * - Fornire API di mutazione semantica (addCustomer, updateStation, etc.) che
 *   verranno usate dai feature components senza che debbano conoscere la
 *   struttura interna profonda dell'archivio.
 *
 * Pattern signals + auto-save:
 * - `archive()` è la sorgente di verità reattiva
 * - Un `effect()` osserva i cambiamenti e fa il save (con guardia per evitare
 *   di risalvare immediatamente quello che abbiamo appena caricato)
 *
 * NOTA: le mutazioni qui non producono ancora `AuditEntry` nel log. Lo aggiungeremo
 * quando avremo i form CRUD veri (prossimo round). Per ora i metodi sono no-op
 * placeholder pronti per essere riempiti.
 */

import { Injectable, computed, effect, inject, signal } from '@angular/core';

import type {
  ArchiveState,
  Customer,
  Plant,
  Station,
  Camera,
  ToolSettings,
} from '../models/domain.model';
import { StorageService } from './storage.service';

// =============================================================================
// CONSTANTS
// =============================================================================

const AUTOSAVE_DEBOUNCE_MS = 500;

const DEFAULT_SETTINGS: ToolSettings = {
  ui_language: 'it',
  theme: 'auto',
  encryption_enabled: false,
  preferred_pose_format: {
    ABB: 'native',
    Comau: 'native',
    Fanuc: 'native',
    Kuka: 'native',
  },
};

const EMPTY_ARCHIVE: ArchiveState = {
  schema_version: 1,
  customers: [],
  audit_log: [],
  settings: DEFAULT_SETTINGS,
};

// =============================================================================
// SERVICE
// =============================================================================

@Injectable({ providedIn: 'root' })
export class ArchiveService {
  private readonly storage = inject(StorageService);

  // ---------------------------------------------------------------------------
  // STATE SIGNALS
  // ---------------------------------------------------------------------------

  private readonly archiveSignal = signal<ArchiveState>(EMPTY_ARCHIVE);

  /** Stato archivio (read-only per il chiamante). */
  readonly archive = this.archiveSignal.asReadonly();

  private readonly isLoadingSignal = signal(true);
  /** True durante il caricamento iniziale da IndexedDB. */
  readonly isLoading = this.isLoadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  /** Errore di I/O più recente, null se OK. */
  readonly error = this.errorSignal.asReadonly();

  private readonly lastSavedAtSignal = signal<string | null>(null);
  /** Timestamp ISO dell'ultimo salvataggio andato a buon fine. */
  readonly lastSavedAt = this.lastSavedAtSignal.asReadonly();

  private readonly isSavingSignal = signal(false);
  /** True durante un salvataggio in corso. */
  readonly isSaving = this.isSavingSignal.asReadonly();

  // ---------------------------------------------------------------------------
  // COMPUTED — accessor utili per UI
  // ---------------------------------------------------------------------------

  readonly customers = computed(() => this.archive().customers);
  readonly settings = computed(() => this.archive().settings);

  readonly countCustomers = computed(() => this.customers().length);

  readonly countPlants = computed(() =>
    this.customers().reduce((sum, c) => sum + c.plants.length, 0),
  );

  readonly countStations = computed(() =>
    this.customers().reduce(
      (sum, c) => sum + c.plants.reduce((s, p) => s + p.stations.length, 0),
      0,
    ),
  );

  readonly countCameras = computed(() =>
    this.customers().reduce(
      (sum, c) =>
        sum +
        c.plants.reduce(
          (s, p) => s + p.stations.reduce((ss, st) => ss + st.cameras.length, 0),
          0,
        ),
      0,
    ),
  );

  // ---------------------------------------------------------------------------
  // INIT + AUTO-SAVE LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Quando `true`, l'effect di auto-save osserva i cambiamenti dell'archivio
   * e fa il save. All'avvio è `false` per evitare di risalvare immediatamente
   * lo stato appena caricato.
   */
  private readonly autoSaveEnabled = signal(false);

  private saveTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Effect di auto-save. Reagisce ad archive() finché autoSaveEnabled() è true.
    effect(() => {
      const current = this.archive();
      if (!this.autoSaveEnabled()) return;
      this.scheduleSave(current);
    });

    // Caricamento iniziale asincrono.
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Persistent storage (best-effort, non blocca)
      void this.storage.requestPersistentStorage();

      const stored = await this.storage.getArchive();
      if (stored) {
        // Migration check: se schema_version è cambiata in futuro, qui andrebbe
        // la logica di migration. Per ora supportiamo solo v1.
        if (stored.schema_version !== 1) {
          console.warn(
            `Archive schema_version ${stored.schema_version} unknown; loading anyway.`,
          );
        }
        this.archiveSignal.set(stored);
      }
      this.lastSavedAtSignal.set(await this.storage.getLastSavedAt());
    } catch (err) {
      this.errorSignal.set(`Errore caricamento archivio: ${this.errorMessage(err)}`);
      console.error('ArchiveService init error:', err);
    } finally {
      this.isLoadingSignal.set(false);
      // Solo ORA abilitiamo l'auto-save, altrimenti il primo set() sopra
      // farebbe partire un save inutile dello stato appena caricato.
      this.autoSaveEnabled.set(true);
    }
  }

  private scheduleSave(state: ArchiveState): void {
    if (this.saveTimerId !== null) {
      clearTimeout(this.saveTimerId);
    }
    this.saveTimerId = setTimeout(() => {
      this.saveTimerId = null;
      void this.performSave(state);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  private async performSave(state: ArchiveState): Promise<void> {
    this.isSavingSignal.set(true);
    try {
      await this.storage.saveArchive(state);
      this.lastSavedAtSignal.set(new Date().toISOString());
      this.errorSignal.set(null);
    } catch (err) {
      this.errorSignal.set(`Errore salvataggio: ${this.errorMessage(err)}`);
      console.error('ArchiveService save error:', err);
    } finally {
      this.isSavingSignal.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // MUTATIONS — placeholder per il prossimo round
  //
  // Le implementazioni vere arriveranno con i form CRUD. Le firme sono già qui
  // come "scaffolding" per i componenti che le invocheranno.
  // ---------------------------------------------------------------------------

  /** Sostituisce completamente lo stato (es. dopo import bulk). */
  replaceArchive(next: ArchiveState): void {
    this.archiveSignal.set(next);
  }

  /** Forza un salvataggio immediato bypassando il debounce. */
  async saveNow(): Promise<void> {
    if (this.saveTimerId !== null) {
      clearTimeout(this.saveTimerId);
      this.saveTimerId = null;
    }
    await this.performSave(this.archive());
  }

  /** Reset completo dell'archivio (con conferma utente nell'UI). */
  async resetArchive(): Promise<void> {
    this.archiveSignal.set(EMPTY_ARCHIVE);
    await this.saveNow();
  }

  /** Aggiorna le settings utente. */
  updateSettings(partial: Partial<ToolSettings>): void {
    this.archiveSignal.update(a => ({
      ...a,
      settings: { ...a.settings, ...partial },
    }));
  }

  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }

  addCustomer(customerData: Omit<Customer, 'id' | 'slug' | 'plants' | 'created_at' | 'modified_at'>): string {
    const slug = this.generateSlug(customerData.name);
    const now = new Date().toISOString();

    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      slug,
      name: customerData.name,
      contacts: customerData.contacts || [],
      plants: [],
      createdAt: now,
      modifiedAt: now
    };

    this.archiveSignal.update(state => {
      if (state.customers.some(c => c.slug === slug)) {
        console.warn(`Customer with slug ${slug} already exists.`);
        return state;
      }
      return {
        ...state,
        customers: [...state.customers, newCustomer]
      };
    });
    return slug;
  }

  updateCustomer(slug: string, updates: Partial<Omit<Customer, 'id' | 'slug' | 'plants' | 'created_at' | 'modified_at'>>): void {
    const now = new Date().toISOString();
    this.archiveSignal.update(state => ({
      ...state,
      customers: state.customers.map(c =>
        c.slug === slug ? { ...c, ...updates, modified_at: now } : c
      )
    }));
  }

  deleteCustomer(slug: string): void {
    this.archiveSignal.update(state => ({
      ...state,
      customers: state.customers.filter(c => c.slug !== slug)
    }));
  }

  addPlant(customerSlug: string, plantData: Partial<Plant>): string {
    const now = new Date().toISOString();
    const newPlant: Plant = {
      id: crypto.randomUUID(),
      name: plantData.name || 'Unnamed Plant',
      location: plantData.location || '',
      address: plantData.address || '',
      contacts: plantData.contacts || [],
      stations: [], // Inizializza array vuoto per le stazioni
      notes: plantData.notes || '',
      createdAt: now,
      modifiedAt: now,
      customerId: ''
    };

    this.archiveSignal.update(state => ({
      ...state,
      customers: state.customers.map(c =>
        c.slug === customerSlug
          ? { ...c, plants: [...c.plants, newPlant], modifiedAt: now }
          : c
      )
    }));

    return newPlant.id;
  }

  updatePlant(customerSlug: string, plantId: string, updates: Partial<Plant>): void {
    const now = new Date().toISOString();

    this.archiveSignal.update(state => ({
      ...state,
      customers: state.customers.map(c =>
        c.slug === customerSlug
          ? {
            ...c,
            modifiedAt: now,
            plants: c.plants.map(p =>
              p.id === plantId ? { ...p, ...updates, modifiedAt: now } : p
            )
          }
          : c
      )
    }));
  }

  deletePlant(customerSlug: string, plantId: string): void {
    const now = new Date().toISOString();

    this.archiveSignal.update(state => ({
      ...state,
      customers: state.customers.map(c =>
        c.slug === customerSlug
          ? {
            ...c,
            modifiedAt: now,
            plants: c.plants.filter(p => p.id !== plantId)
          }
          : c
      )
    }));
  }

  // TODO Round 5: addCustomer, updateCustomer, deleteCustomer
  // TODO Round 6: addPlant, addStation, addCamera
  // (le aggiungiamo quando creiamo i form, così la firma sarà guidata dall'uso)

  // ---------------------------------------------------------------------------
  // UTILS
  // ---------------------------------------------------------------------------

  private errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return JSON.stringify(err);
  }
}