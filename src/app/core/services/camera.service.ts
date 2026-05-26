// src/app/core/services/camera.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Camera } from '../models/domain.model';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly endpoint = `${this.apiUrl}/cameras`;

  // --- SIGNALS DI STATO ---
  // Utili per bindare direttamente le UI (es. liste) senza pipe async
  readonly cameras = signal<Camera[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // --- LETTURE (Queries) ---

  /**
   * Carica le camere nello stato del Signal.
   * Da invocare ad esempio nel ngOnInit di una lista camere.
   */
  loadCameras(stationId?: string): void {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (stationId) {
      params = params.set('stationId', stationId);
    }

    this.http.get<Camera[]>(this.endpoint, { params }).subscribe({
      next: (data) => {
        this.cameras.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore fetch cameras:', err);
        this.error.set('Impossibile caricare le camere.');
        this.loading.set(false);
      }
    });
  }

  /**
   * Recupera il dettaglio di una singola camera (con relazioni parziali).
   * Restituisce un Observable per essere gestito via toSignal() o async pipe nel componente di dettaglio.
   */
  getById(id: string): Observable<Camera> {
    return this.http.get<Camera>(`${this.endpoint}/${id}`);
  }

  // --- SCRITTURE (Mutations) ---

  create(camera: Partial<Camera>): Observable<Camera> {
    return this.http.post<Camera>(this.endpoint, camera).pipe(
      tap(() => this.reloadIfStationMatches(camera.stationId))
    );
  }

  update(id: string, changes: Partial<Camera>): Observable<Camera> {
    return this.http.patch<Camera>(`${this.endpoint}/${id}`, changes).pipe(
      tap(() => this.reloadIfStationMatches(changes.stationId))
    );
  }

  delete(id: string): Observable<any> {
    // Aggiungiamo { responseType: 'text' } per gestire il corpo vuoto del 200 OK
    return this.http.delete(`${this.endpoint}/${id}`, { responseType: 'text' }).pipe(
      tap(() => {
        // Aggiorna il segnale locale delle camere
        this.cameras.update(list => list.filter(c => c.id !== id));
      })
    );
  }

  // --- UTILS ---

  private reloadIfStationMatches(stationId?: string): void {
    // Ricarica la lista solo se stiamo guardando una specifica stazione
    // (Oppure forza sempre un ricaricamento globale se preferisci)
    this.loadCameras(stationId);
  }

  // Aggiungi questo in camera.service.ts se non c'è già
  getAll(params: { skip: number, take: number, search: string }) {
    return this.http.get(`${this.apiUrl}/cameras`, { params });
  }

  uploadAsset(cameraId: string, type: 'mira3d' | 'halcon' | 'restart', file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    // CORREZIONE: Usa this.endpoint invece di this.apiUrl
    return this.http.post(`${this.endpoint}/${cameraId}/assets/${type}`, formData);
  }

  getAssetDownloadUrl(cameraId: string, type: 'mira3d' | 'halcon' | 'restart'): string {
    // CORREZIONE: Anche qui serve il segmento /cameras
    return `${this.endpoint}/${cameraId}/assets/${type}/download`;
  }
}