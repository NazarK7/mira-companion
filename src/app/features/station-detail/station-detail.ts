// src/app/features/station-detail/station-detail.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, distinctUntilChanged } from 'rxjs/operators';

import { CustomerService } from '../../core/services/customer.service';
import { CameraService } from '../../core/services/camera.service';
import { I18nService } from '../../shared/services/i18n.service';
import { AppButtonComponent } from '../../shared/components/button/button.component';
import { AppComponent } from '../../app';
import { NotificationService } from '../../shared/services/notification.service';
import { CAMERA_TYPE_OPTIONS, STATION_STATUS_OPTIONS } from '../../core/data/features';

type CameraType = 'COGNEX_INSIGHT' | 'COGNEX_DATAMAN' | 'MIRA_3D';

@Component({
  selector: 'app-station-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppButtonComponent],
  templateUrl: './station-detail.html',
})
export class StationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly cameraService = inject(CameraService);
  private readonly app = inject(AppComponent);
  private readonly notify = inject(NotificationService);
  protected readonly i18n = inject(I18nService);

  // Trigger reattivo per il refresh dei dati
  private readonly refreshTrigger = signal(0);



  // Re-implementazione semplificata del fetch senza BehaviorSubject manuale
  readonly customerData = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('slug')!),
      switchMap(slug => this.customerService.getBySlug(slug))
    )
  );

  readonly plant = computed(() => {
    const cust = this.customerData();
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

  editCamera(event: Event, cameraId: string): void {
    event.preventDefault();
    event.stopPropagation();
    const c = this.customerData();
    const p = this.plant();
    const s = this.station();
    if (c && p && s) {
      this.router.navigate(['/customers', c.slug, 'plants', p.id, 'stations', s.id, 'cameras', cameraId, 'edit']);
    }
  }

  async deleteCamera(event: Event, id: string, name: string) {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = await this.app.confirm().open({
      title: 'Elimina Camera',
      message: `Sei sicuro di voler eliminare la camera "${name}"?`,
      isDestructive: true
    });

    if (confirmed) {
      this.cameraService.delete(id).subscribe({
        next: () => {
          this.notify.success('Camera eliminata con successo');
          this.customerService.getBySlug(this.customerData()!.slug).subscribe(() => {
            this.reloadRoute();
          });
        },
        error: (err) => {
          console.error('Errore durante la delete:', err);
          this.notify.error('Errore durante l\'eliminazione');
        }
      });
    }
  }

  typeLabel(t: CameraType): string {
    const option = CAMERA_TYPE_OPTIONS.find(opt => opt.value === t);
    return option?.label ?? 'Unknown';
  }

  statusBadgeClass(status: string | undefined | null): string {
    if (!status) return 'hidden';

    const option = STATION_STATUS_OPTIONS.find(o => o.value === status.toUpperCase());
    return option?.badgeClass ?? 'bg-bg-subtle text-text-tertiary border-border-subtle';
  }

  private reloadRoute(): void {
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl(currentUrl);
    });
  }
}