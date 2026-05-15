import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ArchiveDataService } from '../../core/services/archive-data.service';
import type { CameraType } from '../../core/models/domain.model';

@Component({
  selector: 'app-station-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './station-detail.html',
})
export class StationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly archive = inject(ArchiveDataService);

  readonly params = toSignal(this.route.paramMap, { requireSync: true });

  readonly customer = computed(() => {
    const slug = this.params().get('slug');
    return slug ? this.archive.customers().find(c => c.slug === slug) ?? null : null;
  });

  readonly plant = computed(() => {
    const c = this.customer();
    const id = this.params().get('plantId');
    return c && id ? c.plants.find(p => p.id === id) ?? null : null;
  });

  readonly station = computed(() => {
    const p = this.plant();
    const id = this.params().get('stationId');
    return p && id ? p.stations.find(s => s.id === id) ?? null : null;
  });

  typeLabel(t: CameraType): string {
    switch (t) {
      case 'COGNEX_INSIGHT':
        return 'In-Sight';
      case 'COGNEX_DATAMAN':
        return 'DataMan';
      case 'MIRA_3D':
        return 'MiRa 3D';
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
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
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