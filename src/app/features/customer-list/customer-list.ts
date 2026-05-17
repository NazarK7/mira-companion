// src/app/features/customer-list/customer-list.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CustomerService } from '../../core/services/customer.service';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './customer-list.html',
})
export class CustomerListComponent implements OnInit {
  private readonly customerService = inject(CustomerService);

  readonly query = signal('');
  
  // Bind diretto ai signal del service HTTP
  readonly all = this.customerService.customers;
  readonly isLoading = this.customerService.loading;

  ngOnInit(): void {
    // All'avvio del componente, scateniamo la GET al backend NestJS
    this.customerService.loadAll();
  }

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const customers = this.all() || [];
    
    if (!q) return customers;
    
    return customers.filter(c =>
      [c.name, c.shortName, c.slug, c.notes ?? '']
        .filter(Boolean)
        .some(s => s!.toLowerCase().includes(q)),
    );
  });

  onSearch(ev: Event) {
    this.query.set((ev.target as HTMLInputElement).value);
  }

  // ATTENZIONE: Questi metodi dipendono dal payload che il backend NestJS restituisce.
  // Se l'API GET /customers non include le relazioni (plants, stations, cameras),
  // queste riduzioni andranno in errore. 
  stationsCount(customerId: string): number {
    const c = this.all().find(x => x.id === customerId);
    if (!c || !c.plants) return 0;
    return c.plants.reduce((acc, p) => acc + (p.stations?.length || 0), 0);
  }

  camerasCount(customerId: string): number {
    const c = this.all().find(x => x.id === customerId);
    if (!c || !c.plants) return 0;
    return c.plants.reduce(
      (acc, p) => acc + (p.stations?.reduce((a, s) => a + (s.cameras?.length || 0), 0) || 0),
      0,
    );
  }
}