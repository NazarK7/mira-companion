/**
 * StorageService — astrazione di persistenza locale.
 *
 * Strategia corrente: IndexedDB via Dexie. È il "primo livello" di persistenza,
 * sempre disponibile in qualsiasi browser moderno, niente permessi utente.
 *
 * Strategia futura (Fase 1, First-Run Wizard): aggiungeremo File System Access
 * API per scrivere anche su una cartella scelta dall'utente (~/MiRa-Companion/),
 * con sync periodico tra IndexedDB cache e filesystem authoritative.
 *
 * Due tabelle:
 * - `archive`: una singola row con id='main' che contiene tutto l'ArchiveState
 *   serializzato. Non normalizziamo customer/plant/station in tabelle separate
 *   perché lo stato è piccolo (anche con 50 customer < 1MB) e il pattern
 *   "load all → mutate in memory → save all" è più semplice da gestire.
 * - `blobs`: storage separato per file pesanti (master images, backup zip,
 *   ToolInCamPose.dat, etc.). Indicizzati per chiave (path relativo).
 *
 * Quota IndexedDB tipica: 60-80% dello spazio disco disponibile. Sufficiente.
 *
 * NOTA: questo servizio è "low-level". Non conosce la struttura semantica di
 * ArchiveState; vede solo `{ id, data }`. La logica di business sta in
 * ArchiveService che lo usa.
 */

import { Injectable } from '@angular/core';
import Dexie, { type Table } from 'dexie';

import type { ArchiveState } from '../models/domain.model';

// =============================================================================
// SCHEMA INDEXEDDB
// =============================================================================

interface ArchiveRow {
  id: 'main';
  data: ArchiveState;
  saved_at: string;
}

interface BlobRow {
  key: string;
  data: Blob;
  size: number;
  sha256?: string;
  saved_at: string;
}

class MiraCompanionDb extends Dexie {
  archive!: Table<ArchiveRow, 'main'>;
  blobs!: Table<BlobRow, string>;

  constructor() {
    super('MiraCompanionDB');
    this.version(1).stores({
      // Primary keys e indici. La sintassi Dexie '++id' = auto-increment, 'id' = primary.
      archive: 'id, saved_at',
      blobs: 'key, size, saved_at',
    });
  }
}

// =============================================================================
// SERVICE
// =============================================================================

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly db = new MiraCompanionDb();

  // ---------------------------------------------------------------------------
  // PERSISTENT STORAGE REQUEST
  // ---------------------------------------------------------------------------

  /**
   * Richiede al browser di marcare lo storage come "persistent". Senza questo,
   * il browser può eventualmente evictare i dati in caso di scarsità spazio.
   * Da chiamare una volta all'avvio dell'app.
   *
   * Ritorna true se il permesso è stato concesso (o era già attivo), false se
   * negato o non supportato.
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (!('storage' in navigator) || !navigator.storage.persist) {
      return false;
    }
    try {
      const already = await navigator.storage.persisted();
      if (already) return true;
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }

  /** Quota e usage IndexedDB correnti (informativo). */
  async estimateStorage(): Promise<{ quota?: number; usage?: number } | null> {
    if (!('storage' in navigator) || !navigator.storage.estimate) return null;
    try {
      return await navigator.storage.estimate();
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // ARCHIVE STATE
  // ---------------------------------------------------------------------------

  /** Carica lo stato dell'archivio. Null se mai salvato prima. */
  async getArchive(): Promise<ArchiveState | null> {
    const row = await this.db.archive.get('main');
    return row?.data ?? null;
  }

  /** Salva (sovrascrive) lo stato dell'archivio. */
  async saveArchive(data: ArchiveState): Promise<void> {
    await this.db.archive.put({
      id: 'main',
      data,
      saved_at: new Date().toISOString(),
    });
  }

  /** Elimina lo stato dell'archivio (reset totale). I blob NON sono toccati. */
  async clearArchive(): Promise<void> {
    await this.db.archive.delete('main');
  }

  /** Timestamp dell'ultimo salvataggio, se mai avvenuto. */
  async getLastSavedAt(): Promise<string | null> {
    const row = await this.db.archive.get('main');
    return row?.saved_at ?? null;
  }

  // ---------------------------------------------------------------------------
  // BLOB STORAGE — usato in Fase 4+ per master images, backup zip, etc.
  // ---------------------------------------------------------------------------

  /** Salva un blob con la chiave specificata. */
  async saveBlob(key: string, data: Blob, sha256?: string): Promise<void> {
    await this.db.blobs.put({
      key,
      data,
      size: data.size,
      sha256,
      saved_at: new Date().toISOString(),
    });
  }

  /** Carica un blob. Null se non esiste. */
  async getBlob(key: string): Promise<Blob | null> {
    const row = await this.db.blobs.get(key);
    return row?.data ?? null;
  }

  /** Elimina un blob. No-op se non esisteva. */
  async deleteBlob(key: string): Promise<void> {
    await this.db.blobs.delete(key);
  }

  /** Lista tutte le chiavi blob salvate (utile per audit/cleanup). */
  async listBlobKeys(): Promise<string[]> {
    return await this.db.blobs.toCollection().primaryKeys();
  }

  /** Totale bytes occupati dai blob (per UI di gestione spazio). */
  async getTotalBlobSize(): Promise<number> {
    const rows = await this.db.blobs.toArray();
    return rows.reduce((sum, row) => sum + row.size, 0);
  }

  // ---------------------------------------------------------------------------
  // FULL WIPE — per testing / reset esplicito utente
  // ---------------------------------------------------------------------------

  /**
   * Cancella tutto: archive + blob. ATTENZIONE distruttivo.
   * Da invocare solo da Settings → "Reset application data" con conferma utente.
   */
  async wipeEverything(): Promise<void> {
    await this.db.transaction('rw', this.db.archive, this.db.blobs, async () => {
      await this.db.archive.clear();
      await this.db.blobs.clear();
    });
  }
}