// src/app/core/services/customer.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Customer } from '../models/domain.model';

@Injectable({
  providedIn: 'root'
})

export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_URL)}/customers`;

  readonly customers = signal<Customer[]>([]);
  readonly loading = signal<boolean>(false);

  loadAll(): void {
    this.loading.set(true);
    this.http.get<Customer[]>(this.endpoint).subscribe({
      next: (data) => {
        this.customers.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore fetch customers:', err);
        this.loading.set(false);
      }
    });
  }

  getBySlug(slug: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.endpoint}/slug/${slug}`);
  }

  create(customer: Partial<Customer>): Observable<Customer> {
    const payload = {
      ...customer,
      slug: customer.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    };
    return this.http.post<Customer>(this.endpoint, payload).pipe(
      tap(() => this.loadAll())
    );
  }

  update(id: string, changes: Partial<Customer>): Observable<Customer> {
    const payload = {
      ...changes,
      slug: changes.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    };
    return this.http.patch<Customer>(`${this.endpoint}/${id}`, payload).pipe(
      tap(() => this.loadAll())
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`).pipe(
      tap(() => this.loadAll())
    );
  }
}