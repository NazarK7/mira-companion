// src/app/features/camera-details/camera-details.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../core/services/customer.service';
import { CameraService } from '../../core/services/camera.service';
import { JobCardComponent } from './job-card/job-card';
import { AssetPanelComponent } from './asset-panel/asset-panel';

type CameraType = 'COGNEX_INSIGHT' | 'COGNEX_DATAMAN' | 'MIRA_3D';

@Component({
  selector: 'app-camera-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    JobCardComponent,
    AssetPanelComponent,
  ],
  templateUrl: './camera-details.html',
})
export class CameraDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);
  private readonly cameraService = inject(CameraService);

  private readonly slug$ = this.route.paramMap.pipe(filter(params => params.has('slug')));
  private readonly cameraId$ = this.route.paramMap.pipe(filter(params => params.has('cameraId')));

  // 1. Carica il customer dal backend per i breadcrumbs (Customer -> Plant -> Station)
  readonly customer = toSignal(
    this.slug$.pipe(
      switchMap(params => this.customerService.getBySlug(params.get('slug')!))
    )
  );

  // 2. Carica la singola telecamera e le sue dipendenze profonde (Jobs, _counts)
  readonly camera = toSignal(
    this.cameraId$.pipe(
      switchMap(params => this.cameraService.getById(params.get('cameraId')!))
    )
  );

  // 3. Filtri computati per i breadcrumbs
  readonly plant = computed(() => {
    const cust = this.customer();
    const id = this.route.snapshot.paramMap.get('plantId');
    if (!cust || !id) return null;
    return cust.plants.find((p: any) => p.id === id) ?? null;
  });

  readonly station = computed(() => {
    const p = this.plant();
    const id = this.route.snapshot.paramMap.get('stationId');
    if (!p || !id) return null;
    return p.stations.find((s: any) => s.id === id) ?? null;
  });

  readonly isMira3D = computed(() => this.camera()?.type === 'MIRA_3D');

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
}