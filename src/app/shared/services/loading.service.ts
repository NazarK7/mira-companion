// src/app/core/services/loading.service.ts
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  // Contatore delle richieste in corso per gestire chiamate parallele
  private readonly _activeRequests = signal<number>(0);

  /** Signal booleano: true se c'è almeno una richiesta pendente */
  readonly isLoading = computed(() => this._activeRequests() > 0);

  show(): void {
    this._activeRequests.update(v => v + 1);
  }

  hide(): void {
    this._activeRequests.update(v => Math.max(0, v - 1));
  }
}