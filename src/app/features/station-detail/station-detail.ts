// src/app/features/station-detail/station-detail.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; // <-- Aggiunto Router
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { CustomerService } from '../../core/services/customer.service';
import { CameraService } from '../../core/services/camera.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';

type CameraType = 'COGNEX_INSIGHT' | 'COGNEX_DATAMAN' | 'MIRA_3D';

@Component({
  selector: 'app-station-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule],
  templateUrl: './station-detail.html',
})
export class StationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router); // <-- Iniettato
  private readonly customerService = inject(CustomerService);
  private readonly cameraService = inject(CameraService);
  private readonly dialog = inject(MatDialog);

  private readonly slug$ = this.route.paramMap.pipe(
    filter(params => params.has('slug'))
  );

  readonly customer = toSignal(
    this.slug$.pipe(
      switchMap(params => this.customerService.getBySlug(params.get('slug')!))
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

  // --- NUOVO METODO EDIT CAMERA ---
  editCamera(event: Event, cameraId: string): void {
    event.preventDefault();
    event.stopPropagation(); // Evita di far scattare il routerLink della card madre
    const c = this.customer();
    const p = this.plant();
    const s = this.station();
    
    if (c && p && s) {
      this.router.navigate(['/customers', c.slug, 'plants', p.id, 'stations', s.id, 'cameras', cameraId, 'edit']);
    }
  }

  // --- METODO DELETE ESISTENTE ---
  deleteCamera(event: Event, id: string, name: string): void {
    event.preventDefault();
    event.stopPropagation(); // Evita di far scattare il routerLink della card madre

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Camera',
        message: `Are you sure you want to delete the camera "${name}"?\n\nThis action will cascade delete all associated jobs and calibrations. This action is irreversible.`,
        confirmText: 'Delete',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.cameraService.delete(id).subscribe({
          next: () => {
             this.customerService.loadAll();
          },
          error: (err) => console.error('Error deleting camera:', err)
        });
      }
    });
  }

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

  statusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'production': return 'bg-[var(--color-success-50)] text-[var(--color-success-700)]';
      case 'maintenance': return 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)]';
      case 'planning': return 'bg-[var(--color-info-50)] text-[var(--color-info-700)]';
      case 'archived': return 'bg-[var(--bg-strong)] text-[var(--text-tertiary)]';
      default: return 'bg-[var(--bg-strong)] text-[var(--text-secondary)]';
    }
  }
}