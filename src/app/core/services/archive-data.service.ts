import { Injectable, computed, signal } from '@angular/core';
import type { Camera, Customer, Plant, Station } from '../models/domain.model';
import { SEED_CUSTOMERS } from '../data/seed-data';

/**
 * Service in-memory minimale per la fase di sviluppo UI.
 * Verrà sostituito dal client HTTP del backend NestJS (Fase D).
 *
 * Pattern: single writable signal su Customer[] + computed lookup methods.
 * Mutations: assegna un nuovo array (le pagine osservano via signal).
 */
@Injectable({ providedIn: 'root' })
export class ArchiveDataService {
  readonly customers = signal<Customer[]>(SEED_CUSTOMERS);

  customerBySlug(slug: string) {
    return computed(() => this.customers().find(c => c.slug === slug) ?? null);
  }

  plantById(slug: string, plantId: string) {
    return computed(
      () =>
        this.customers()
          .find(c => c.slug === slug)
          ?.plants.find(p => p.id === plantId) ?? null,
    );
  }

  stationById(slug: string, plantId: string, stationId: string) {
    return computed(() => {
      const plant = this.customers()
        .find(c => c.slug === slug)
        ?.plants.find(p => p.id === plantId);
      return plant?.stations.find(s => s.id === stationId) ?? null;
    });
  }

  cameraById(slug: string, plantId: string, stationId: string, cameraId: string) {
    return computed(() => {
      const station = this.customers()
        .find(c => c.slug === slug)
        ?.plants.find(p => p.id === plantId)
        ?.stations.find(s => s.id === stationId);
      return station?.cameras.find(cam => cam.id === cameraId) ?? null;
    });
  }

  /** Mutator helper: rimpiazza l'intero array, trigger re-render. */
  setCustomers(next: Customer[]) {
    this.customers.set(next);
  }
}