import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Job } from '../models/domain.model';
import { API_URL } from '../config/api.config'; // <-- Importiamo il tuo config

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private readonly http = inject(HttpClient);
  
  // Inietta l'URL base (http://localhost:3000/api) e ci appende /jobs
  private readonly baseUrl = inject(API_URL);
  private readonly apiUrl = `${this.baseUrl}/jobs`; 

  getById(id: string): Observable<Job> {
    return this.http.get<Job>(`${this.apiUrl}/${id}`);
  }

  create(job: Partial<Job>): Observable<Job> {
    return this.http.post<Job>(this.apiUrl, job);
  }

  update(id: string, job: Partial<Job>): Observable<Job> {
    return this.http.patch<Job>(`${this.apiUrl}/${id}`, job);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadBackup(jobId: string, file: File, notes?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) formData.append('notes', notes);
    
    return this.http.post(`${this.apiUrl}/${jobId}/backups`, formData);
  }

  /**
   * Scarica un file di backup esistente
   */
  downloadBackup(backupId: string): void {
    const url = `${this.apiUrl}/backups/${backupId}/download`;
    // Apriamo in un nuovo tab per far scattare il download gestito dal browser
    window.open(url, '_blank');
  }

  deleteBackup(backupId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/backups/${backupId}`);
  }
}