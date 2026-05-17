// src/app/features/plant-detail/plant-detail.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../core/services/customer.service';
import { switchMap, filter } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-plant-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  // ... (Il template HTML rimane identico, tranne forse la rimozione della porzione isEditMode se non supportata in questo template inline)
  templateUrl: './plant-detail.html', // Assicurati di puntare al tuo file HTML che hai incollato
})
export class PlantDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);

  private readonly slug$ = this.route.paramMap.pipe(
    filter(params => params.has('slug'))
  );

  private readonly plantId$ = this.route.paramMap.pipe(
    filter(params => params.has('plantId'))
  );

  // 1. Carica il customer dal backend (NestJS restituisce l'albero Eager-loaded coi plants)
  readonly customer = toSignal(
    this.slug$.pipe(
      switchMap(params => this.customerService.getBySlug(params.get('slug')!))
    )
  );

  // 2. Filtra il plant specifico dall'albero del customer
  readonly plant = computed(() => {
    const cust = this.customer();
    const id = this.route.snapshot.paramMap.get('plantId'); // Sincrono perché la rotta è caricata

    if (!cust || !id) return null;
    return cust.plants.find((p: any) => p.id === id) ?? null;
  });

  statusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'production':
        return 'bg-[var(--color-success-50)] text-[var(--color-success-700)]';
      case 'maintenance':
        return 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)]';
      case 'planning':
        return 'bg-[var(--color-info-50)] text-[var(--color-info-700)]';
      case 'archived':
        return 'bg-[var(--bg-strong)] text-[var(--text-tertiary)]';
      default:
        return 'bg-[var(--bg-strong)] text-[var(--text-secondary)]';
    }
  }
}