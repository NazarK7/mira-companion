// src/app/features/camera-details/camera-details.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs/operators';
import { combineLatest, BehaviorSubject } from 'rxjs';

// MATERIAL IMPORTS
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// COMMON IMPORTS (Aggiunti NgTemplateOutlet e DecimalPipe)
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';

// SERVICES & COMPONENTS
import { CustomerService } from '../../core/services/customer.service';
import { CameraService } from '../../core/services/camera.service';
import { JobService } from '../../core/services/job.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';

import { ToastContainerComponent } from '../../shared/components/feedback-toast/toast-container.component';
import { NotificationService } from '../../shared/services/notification.service';

type CameraType = 'COGNEX_INSIGHT' | 'COGNEX_DATAMAN' | 'MIRA_3D';

@Component({
  selector: 'app-camera-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    DatePipe,
    NgTemplateOutlet,
  ],
  templateUrl: './camera-details.html',
})
export class CameraDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly cameraService = inject(CameraService);
  private readonly jobService = inject(JobService);
  private readonly dialog = inject(MatDialog);
  private readonly feedback = inject(NotificationService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  // --- SIGNALS PER GLI ASSET ---
  readonly isUploadingAsset = signal<'mira3d' | 'halcon' | 'restart' | null>(null);

  // --- DATA FETCHING ---
  private readonly slug$ = this.route.paramMap.pipe(filter(params => params.has('slug')));
  private readonly cameraId$ = this.route.paramMap.pipe(filter(params => params.has('cameraId')));

  readonly customer = toSignal(
    this.slug$.pipe(
      switchMap(params => this.customerService.getBySlug(params.get('slug')!))
    )
  );

  readonly camera = toSignal(
    combineLatest([this.cameraId$, this.refresh$]).pipe(
      switchMap(([params]) => this.cameraService.getById(params.get('cameraId')!))
    )
  );

  readonly plant = computed(() => {
    const cust = this.customer();
    const id = this.route.snapshot.paramMap.get('plantId');
    if (!cust || !id) return null;
    return (cust as any).plants.find((p: any) => p.id === id) ?? null;
  });

  readonly station = computed(() => {
    const p = this.plant();
    const id = this.route.snapshot.paramMap.get('stationId');
    if (!p || !id) return null;
    return (p as any).stations.find((s: any) => s.id === id) ?? null;
  });

  readonly isMira3D = computed(() => this.camera()?.type === 'MIRA_3D');

  // --- LOGICA ASSET (TASK 4, 5, 6) ---

  onAssetSelected(event: any, type: 'mira3d' | 'halcon' | 'restart'): void {
    const file = event.target.files[0];
    const cam = this.camera();
    if (!file || !cam) return;

    this.isUploadingAsset.set(type);

    this.cameraService.uploadAsset(cam.id, type, file).subscribe({
      next: () => {
        this.isUploadingAsset.set(null);
        this.feedback.success(`Upload di ${type} completato con successo!`); // Feedback pro
        this.refresh$.next();
      },
      error: (err) => {
        this.isUploadingAsset.set(null);
        console.error(`Errore upload ${type}:`, err);

        // Gestione errore raffinata
        const errorMsg = err.status === 404
          ? "Rotta non trovata (Verifica l'URL del backend)"
          : "Errore durante l'upload. Il file potrebbe essere troppo grande.";

        this.feedback.error(errorMsg); // Niente più alert brutti!
      }
    });
  }

  downloadAsset(type: 'mira3d' | 'halcon' | 'restart'): void {
    const cam = this.camera();
    if (!cam) return;
    const url = this.cameraService.getAssetDownloadUrl(cam.id, type);

    // Usiamo window.open come nei Job che funzionano
    window.open(url, '_blank');
  }

  // --- LOGICA JOB ---

  openJobDetails(jobId: string): void {
    const c = this.customer();
    const p = this.plant();
    const s = this.station();
    const cam = this.camera();

    if (c && p && s && cam) {
      this.router.navigate([
        '/customers', c.slug,
        'plants', p.id,
        'stations', s.id,
        'cameras', cam.id,
        'jobs', jobId,
        'edit'
      ]);
    }
  }

  // Nota: il metodo editJob() può essere rimosso o puntare a openJobDetails()
  editJob(event: Event, jobId: string): void {
    event.stopPropagation();
    this.openJobDetails(jobId);
  }

  deleteJob(event: Event, id: string, name: string): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Job',
        message: `Sei sicuro di voler eliminare il job "${name}"?`,
        confirmText: 'Delete',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.jobService.delete(id).subscribe(() => this.refresh$.next());
      }
    });
  }

  // --- UI UTILS ---

  typeLabel(t: CameraType): string {
    switch (t) {
      case 'COGNEX_INSIGHT': return 'In-Sight';
      case 'COGNEX_DATAMAN': return 'DataMan';
      case 'MIRA_3D': return 'MiRa 3D';
      default: return 'Unknown';
    }
  }

  typeBadgeClass(t: CameraType): string {
    switch (t) {
      case 'MIRA_3D': return 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]';
      case 'COGNEX_INSIGHT': return 'bg-[var(--color-accent-50)] text-[var(--color-accent-700)]';
      case 'COGNEX_DATAMAN': return 'bg-[var(--color-info-50)] text-[var(--color-info-700)]';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  statusBadgeClass(status: string | undefined | null): string {
    if (!status) return 'hidden';
    switch (status.toLowerCase()) {
      case 'production': return 'bg-[var(--color-success-50)] text-[var(--color-success-700)]';
      case 'maintenance': return 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)]';
      default: return 'bg-[var(--bg-strong)] text-[var(--text-secondary)]';
    }
  }
}