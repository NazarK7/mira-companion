// src/app/features/camera-details/camera-details.ts
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, inject, input, Signal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { filter, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

import { CustomerService } from '../../core/services/customer.service';
import { CameraService } from '../../core/services/camera.service';
import { JobService } from '../../core/services/job.service';
import { I18nService } from '../../shared/services/i18n.service';
import { NotificationService } from '../../shared/services/notification.service';
import { AppComponent } from '../../app';
import { AppButtonComponent } from '../../shared/components/button/button.component';

// Importiamo tutto dal SSOT (features.ts)
import {
  CAMERA_TYPE_OPTIONS,
  STATION_STATUS_OPTIONS,
  ASSET_CONFIGS,
  CAMERA_SPEC_DEFINITIONS,
  AssetKey,
  getAssetFileName,
  getAssetFileSize
} from '../../core/data/features';
import { Camera, CameraType } from '../../core/models/domain.model';
import { DataSharingService } from '../../shared/services/dataSharing.service';

@Component({
  selector: 'app-camera-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppButtonComponent, DatePipe],
  templateUrl: './camera-details.html',
})
export class CameraDetailsComponent {
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly cameraService = inject(CameraService);
  private readonly jobService = inject(JobService);
  private readonly app = inject(AppComponent);
  private readonly notify = inject(NotificationService);
  protected readonly i18n = inject(I18nService);
  private readonly dataSharing = inject(DataSharingService);

  // --- Exposed to Template ---
  protected readonly ASSET_MAP = ASSET_CONFIGS;
  protected readonly SPECS_DEF = CAMERA_SPEC_DEFINITIONS;

  // --- Route Inputs ---
  slug = input.required<string>();
  plantId = input.required<string>();
  stationId = input.required<string>();
  cameraId = input.required<string>();

  // --- UI States ---
  readonly isUploadingAsset = signal<AssetKey | null>(null);

  // --- Data Fetching ---
  readonly customer = toSignal(toObservable(this.slug).pipe(filter(Boolean), distinctUntilChanged(), switchMap(s => this.customerService.getBySlug(s))));
  readonly camera = toSignal<Camera>(toObservable(this.cameraId).pipe(filter(Boolean), distinctUntilChanged(), switchMap(id => this.cameraService.getById(id))));

  readonly plant = computed(() => this.customer()?.plants.find(p => p.id === this.plantId()) ?? null);
  readonly station = computed(() => this.plant()?.stations.find(s => s.id === this.stationId()) ?? null);
  readonly isMira3D = computed(() => this.camera()?.type === 'MIRA_3D');

  // Unified Single Source of Truth for Camera Type Label
  readonly cameraType: Signal<string> = computed(() => {
    const currentType = this.camera()?.type;
    if (!currentType) return 'Unknown';
    return CAMERA_TYPE_OPTIONS.find(opt => opt.value === currentType)?.label ?? 'Unknown';
  });

 constructor() {
    effect(() => {
      let currentRawType = this.camera()?.type;
      currentRawType && this.dataSharing.setCameraType(currentRawType);
    });
  } 

  // --- Logic Wrappers ---
  getFileName(cam: Camera, key: AssetKey) { return getAssetFileName(cam, key); }
  getFileSize(cam: Camera, key: AssetKey) { return getAssetFileSize(cam, key); }

  formatBytes(bytes: number | bigint | string | undefined): string {
    if (!bytes) return '0 MB';
    const b = typeof bytes === 'string' ? parseInt(bytes, 10) : Number(bytes);
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
  }

  typeLabel(t: CameraType): string {
    return CAMERA_TYPE_OPTIONS.find(opt => opt.value === t)?.label ?? 'Unknown';
  }

  typeBadgeClass(t: CameraType): string { return CAMERA_TYPE_OPTIONS.find(opt => opt.value === t)?.badgeClass ?? 'bg-bg-subtle'; }
  statusBadgeClass(status: string | undefined | null): string {
    if (!status) return 'hidden';
    return STATION_STATUS_OPTIONS.find(o => o.value === status.toUpperCase())?.badgeClass ?? 'bg-bg-subtle';
  }

  // --- Actions ---
  onAssetSelected(event: Event, type: AssetKey): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const cam = this.camera();
    if (!file || !cam) return;

    this.isUploadingAsset.set(type);
    this.cameraService.uploadAsset(cam.id, type, file).subscribe({
      next: () => {
        this.isUploadingAsset.set(null);
        this.notify.success(`Asset updated`);
        this.reload();
      },
      error: () => { this.isUploadingAsset.set(null); this.notify.error("Upload error"); }
    });
  }

  downloadAsset(type: AssetKey): void {
    const cam = this.camera();
    if (cam) window.open(this.cameraService.getAssetDownloadUrl(cam.id, type), '_blank');
  }

  async deleteJob(event: Event, jobId: string, jobName: string) {
    event.stopPropagation();
    const ok = await this.app.confirm().open({ title: 'Delete Job', message: `Remove ${jobName}?`, isDestructive: true });
    if (ok) this.jobService.delete(jobId).subscribe(() => { this.notify.success('Job removed'); this.reload(); });
  }

  private reload(): void {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/customers', this.slug(), 'plants', this.plantId(), 'stations', this.stationId(), 'cameras', this.cameraId()]);
    });
  }
}