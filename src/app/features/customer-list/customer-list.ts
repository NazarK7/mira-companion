// src/app/features/customer-list/customer-list.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { CustomerService } from '../../core/services/customer.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './customer-list.html',
})
export class CustomerListComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

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
    return customers.filter(c =>
      [c.name, c.shortName, c.slug, c.notes ?? ''].filter(Boolean).some(s => s!.toLowerCase().includes(q))
    );
  });

  onSearch(ev: Event) {
    this.query.set((ev.target as HTMLInputElement).value);
  }

  stationsCount(customerId: string): number {
    const c = this.all().find(x => x.id === customerId);
    if (!c || !c.plants) return 0;
    return c.plants.reduce((acc, p) => acc + (p.stations?.length || 0), 0);
  }

  camerasCount(customerId: string): number {
    const c = this.all().find(x => x.id === customerId);
    if (!c || !c.plants) return 0;
    return c.plants.reduce((acc, p) => acc + (p.stations?.reduce((a, s) => a + (s.cameras?.length || 0), 0) || 0), 0);
  }

  goToDetail(slug: string) {
    this.router.navigate(['/customers', slug]);
  }

  editCustomer(event: Event, slug: string) {
    event.stopPropagation(); // Evita che il click si propaghi alla card aprendo il dettaglio
    this.router.navigate(['/customers', slug, 'edit']);
  }

  deleteCustomer(event: Event, id: string, name: string) {
    event.stopPropagation(); // Evita l'apertura del dettaglio
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Elimina Customer',
        message: `Sei sicuro di voler eliminare ${name}?\n\nQuesta azione eliminerà a cascata tutti i Plant, Station, Camere e Job associati. L'azione è irreversibile.`,
        confirmText: 'Elimina',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.customerService.delete(id).subscribe({
          error: (err) => console.error('Errore durante eliminazione:', err)
        });
      }
    });
  }
}