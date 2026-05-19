// src/app/core/services/plant.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Plant } from '../models/domain.model';

@Injectable({ providedIn: 'root' })
export class PlantService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_URL)}/plants`;

  getById(id: string): Observable<Plant> {
    return this.http.get<Plant>(`${this.endpoint}/${id}`);
  }

  create(plant: Partial<Plant>): Observable<Plant> {
    return this.http.post<Plant>(this.endpoint, plant);
  }

  update(id: string, plant: Partial<Plant>): Observable<Plant> {
    return this.http.patch<Plant>(`${this.endpoint}/${id}`, plant);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
  getAll(params: { skip: number; take: number; search: string }) {
    return this.http.get<{ items: any[]; total: number }>(`${this.endpoint}`, { params });
  }

}