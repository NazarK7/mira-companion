// src/app/features/customer-list/customer-list.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CustomerService } from '../../core/services/customer.service';
import { I18nService } from '../../shared/services/i18n.service';
import { AppButtonComponent } from '../../shared/components/button/button.component';
import { AppComponent } from '../../app';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppButtonComponent],
  templateUrl: './customer-list.html',
})
export class CustomerListComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly app = inject(AppComponent);
  protected readonly i18n = inject(I18nService);

  readonly query = signal('');
  readonly all = this.customerService.customers;
  readonly isLoading = this.customerService.loading;

  ngOnInit(): void {
    this.customerService.loadAll();
  }

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const customers = this.all() || [];
    if (!q) return customers;

    return customers.filter(c => {
      // Creiamo un array di soli valori esistenti (stringhe vere)
      const searchableFields = [c.name, c.shortName, c.slug, c.notes].filter((val): val is string => !!val);
      
      // Ora 's' è garantito essere una stringa
      return searchableFields.some(s => s.toLowerCase().includes(q));
    });
  });
  onSearch(ev: Event) {
    this.query.set((ev.target as HTMLInputElement).value);
  }

  /**
   * Calcola le statistiche aggregate per le card.
   * Utilizza i dati già presenti nel segnale 'all'.
   */
  stats(c: any) {
    const stations = c.plants?.reduce((acc: number, p: any) => acc + (p.stations?.length || 0), 0) || 0;
    const cameras = c.plants?.reduce((acc: number, p: any) => 
      acc + (p.stations?.reduce((a: number, s: any) => a + (s.cameras?.length || 0), 0) || 0), 0) || 0;
    return { stations, cameras };
  }

  goToDetail(slug: string) {
    this.router.navigate(['/customers', slug]);
  }

  editCustomer(event: Event, slug: string) {
    event.stopPropagation(); // Impedisce l'attivazione di goToDetail della card
    this.router.navigate(['/customers', slug, 'edit']);
  }

  async deleteCustomer(event: Event, id: string, name: string) {
    event.stopPropagation();
    
    // Utilizza il dialog centrato (native <dialog>) definito nell'AppComponent
    const confirmed = await this.app.confirm().open({
      title: 'Elimina Customer',
      message: `Sei sicuro di voler eliminare ${name}?\n\nQuesta azione eliminerà a cascata tutti i dati associati. L'azione è irreversibile.`,
      confirmText: 'Elimina',
      isDestructive: true
    });

    if (confirmed) {
      this.customerService.delete(id).subscribe();
    }
  }
}