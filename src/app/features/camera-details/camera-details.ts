// src/app/features/camera-details/camera-details.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { CustomerService } from '../../core/services/customer.service';
import { CameraService } from '../../core/services/camera.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';

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
    DatePipe
  ],
  templateUrl: './camera-details.html',
})
export class CameraDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);
  private readonly cameraService = inject(CameraService);
  private readonly dialog = inject(MatDialog);

  private readonly slug$ = this.route.paramMap.pipe(filter(params => params.has('slug')));
  private readonly cameraId$ = this.route.paramMap.pipe(filter(params => params.has('cameraId')));

  readonly customer = toSignal(
    this.slug$.pipe(
      switchMap(params => this.customerService.getBySlug(params.get('slug')!))
    )
  );

  readonly camera = toSignal(
    this.cameraId$.pipe(
      switchMap(params => this.cameraService.getById(params.get('cameraId')!))
    )
  );

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

  // --- AZIONI SUI JOB ---
  editJob(event: Event, jobId: string): void {
    event.preventDefault();
    event.stopPropagation();
    // Implementazione futura: navigazione all'editor del job
    console.log('Richiesta modifica Job ID:', jobId);
  }

  deleteJob(event: Event, id: string, name: string): void {
    event.preventDefault();
    event.stopPropagation();

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Job',
        message: `Are you sure you want to delete the job "${name}"?\n\nThis action will remove all associated backups and test images. It is irreversible.`,
        confirmText: 'Delete',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        // Implementazione futura: chiamata a JobService
        console.log('Richiesta eliminazione Job ID:', id);
      }
    });
  }

  // --- UTILS PER LA UI ---
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
      case 'planning': return 'bg-[var(--color-info-50)] text-[var(--color-info-700)]';
      case 'archived': return 'bg-[var(--bg-strong)] text-[var(--text-tertiary)]';
      default: return 'bg-[var(--bg-strong)] text-[var(--text-secondary)]';
    }
  }
}