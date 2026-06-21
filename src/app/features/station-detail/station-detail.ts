// src/app/features/station-detail/station-detail.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, map, distinctUntilChanged, filter } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

import { CustomerService } from '../../core/services/customer.service';
import { CameraService } from '../../core/services/camera.service';
import { I18nService } from '../../shared/services/i18n.service';
import { AppButtonComponent } from '../../shared/components/button/button.component';
import { AppComponent } from '../../app';
import { NotificationService } from '../../shared/services/notification.service';
import { CAMERA_TYPE_OPTIONS, STATION_STATUS_OPTIONS } from '../../core/data/features';
import { CameraType } from '../../core/models/domain.model';

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

  // 1. Reactive invalidate trigger
  private readonly refreshTrigger = signal<number>(0);

  // 2. Reactive Route Parameters Stream (Eliminating raw snapshots from computed)
  private readonly activeParams = toSignal(this.route.paramMap);

  // 3. Unified Data Stream: Fires on Route change OR when refreshTrigger increments
  readonly customerData = toSignal(
    combineLatest([
      this.route.paramMap.pipe(map(params => params.get('slug')), filter(Boolean), distinctUntilChanged()),
      toObservable(this.refreshTrigger)
    ]).pipe(
      switchMap(([slug, _]) => this.customerService.getBySlug(slug))
    )
  );

  // 4. Pure Computed Signals driving the UI reactively
  readonly plant = computed(() => {
    const cust = this.customerData();
    const params = this.activeParams();
    const id = params?.get('plantId');
    if (!cust || !id) return null;
    return cust.plants.find((p: any) => p.id === id) ?? null;
  });

  readonly station = computed(() => {
    const p = this.plant();
    const params = this.activeParams();
    const id = params?.get('stationId');
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

  async deleteCamera(event: Event, id: string, name: string): Promise<void> {
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

          // 5. Elite execution: we increment the trigger, forcing automatic pull and UI repaint
          this.refreshTrigger.update(current => current + 1);
        },
        error: (err) => {
          console.error('[STATION_DETAIL] [DELETE_FAILED]', err);
          this.notify.error("Errore durante l'eliminazione");
        }
      });
    }
  }

  typeLabel(t: CameraType): string {
    return CAMERA_TYPE_OPTIONS.find(opt => opt.value === t)?.label ?? 'Unknown';
  }

  statusBadgeClass(status: string | undefined | null): string {
    if (!status) return 'hidden';
    return STATION_STATUS_OPTIONS.find(o => o.value === status.toUpperCase())?.badgeClass ?? 'bg-bg-subtle text-text-tertiary border-border-subtle';
  }
}