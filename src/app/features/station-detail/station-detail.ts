// src/app/features/station-detail/station-detail.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../core/services/customer.service';

// Definiamo un tipo locale compatibile con l'enum di Prisma se il tuo domain.model non è allineato
type CameraType = 'COGNEX_INSIGHT' | 'COGNEX_DATAMAN' | 'MIRA_3D';

@Component({
  selector: 'app-station-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './station-detail.html',
})
export class StationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);

  private readonly slug$ = this.route.paramMap.pipe(
    filter(params => params.has('slug'))
  );

  // 1. Carica l'albero Eager-loaded dal backend tramite CustomerService
  readonly customer = toSignal(
    this.slug$.pipe(
      switchMap(params => this.customerService.getBySlug(params.get('slug')!))
    )
  );

  // 2. Filtra il plant specifico
  readonly plant = computed(() => {
    const cust = this.customer();
    const id = this.route.snapshot.paramMap.get('plantId');
    if (!cust || !id) return null;
    return cust.plants.find((p: any) => p.id === id) ?? null;
  });

  // 3. Filtra la station specifica dal plant
  readonly station = computed(() => {
    const p = this.plant();
    const id = this.route.snapshot.paramMap.get('stationId');
    if (!p || !id) return null;
    return p.stations.find((s: any) => s.id === id) ?? null;
  });

  typeLabel(t: CameraType): string {
    switch (t) {
      case 'COGNEX_INSIGHT':
        return 'In-Sight';
      case 'COGNEX_DATAMAN':
        return 'DataMan';
      case 'MIRA_3D':
        return 'MiRa 3D';
      default:
        return 'Unknown';
    }
  }

  typeBadgeClass(t: CameraType): string {
    switch (t) {
      case 'MIRA_3D':
        return 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]';
      case 'COGNEX_INSIGHT':
        return 'bg-[var(--color-accent-50)] text-[var(--color-accent-700)]';
      case 'COGNEX_DATAMAN':
        return 'bg-[var(--color-info-50)] text-[var(--color-info-700)]';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

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