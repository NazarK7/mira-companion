// src/app/core/services/station.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Station } from '../models/domain.model';

@Injectable({
  providedIn: 'root'
})
export class StationService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_URL)}/stations`;

  readonly stations = signal<Station[]>([]);
  readonly loading = signal<boolean>(false);

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  loadStations(plantId?: string): void {
    this.loading.set(true);
    let params = new HttpParams();
    if (plantId) params = params.set('plantId', plantId);

    this.http.get<Station[]>(this.endpoint, { params }).subscribe({
      next: (data) => {
        this.stations.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore fetch stations:', err);
        this.loading.set(false);
      }
    });
  }

  getById(id: string): Observable<Station> {
    return this.http.get<Station>(`${this.endpoint}/${id}`);
  }

  // --- NUOVI METODI AGGIUNTI ---
  create(station: Partial<Station>): Observable<Station> {
    return this.http.post<Station>(this.endpoint, station);
  }

  update(id: string, station: Partial<Station>): Observable<Station> {
    return this.http.patch<Station>(`${this.endpoint}/${id}`, station);
  }
}