import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { CameraService } from '../../core/services/camera.service';
import { CameraType } from '../../core/models/domain.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { CAMERA_TYPE_OPTIONS, STATION_STATUS_OPTIONS } from '../../core/data/features';

@Component({
  selector: 'app-camera-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './camera-list.html',
})
export class CameraListComponent implements OnInit {
  private readonly cameraService = inject(CameraService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  // --- STATO REATTIVO (SERVER-SIDE) ---
  readonly totalItems = signal(0);
  readonly pageSize = signal(25);
  readonly pageIndex = signal(0);
  readonly searchFilter = signal('');

  // Aggiunta colonna 'path' per mostrare la gerarchia
  readonly displayedColumns = ['name', 'path', 'type', 'cameraModel', 'status', 'actions'];

  // DataSource ora solo per il rendering, non per il filtraggio logico
  readonly dataSource = new MatTableDataSource<any>([]);

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  constructor() {
    // Reazione automatica al cambio di pagina o di ricerca
    effect(() => {
      this.loadCameras();
    });
  }

  ngOnInit(): void {
    // Il caricamento iniziale è gestito dall'effect sopra
  }

  loadCameras(): void {
    // Calcoliamo lo skip per Prisma basandoci sulla pagina corrente
    const params = {
      skip: this.pageIndex() * this.pageSize(),
      take: this.pageSize(),
      search: this.searchFilter().trim()
    };

    this.cameraService.getAll(params).subscribe({
      next: (res: any) => {
        // Il backend ora restituisce { items: [], total: number }
        this.dataSource.data = res.items;
        this.totalItems.set(res.total);
      },
      error: (err) => console.error('Errore nel caricamento server-side:', err)
    });
  }

  // --- EVENTI UI ---

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchFilter.set(filterValue);
    this.pageIndex.set(0); // Reset alla prima pagina quando si cerca
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  // --- NAVIGAZIONE ---

  viewCamera(cam: any): void {
    this.router.navigate([
      '/customers', cam.customerSlug,
      'plants', cam.plantId,
      'stations', cam.stationId,
      'cameras', cam.id
    ]);
  }

  editCamera(cam: any): void {
    this.router.navigate([
      '/customers', cam.customerSlug,
      'plants', cam.plantId,
      'stations', cam.stationId,
      'cameras', cam.id,
      'edit'
    ]);
  }

  deleteCamera(cam: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Camera',
        message: `Sei sicuro di voler eliminare la camera "${cam.name}"?\n\nQuesta azione eliminerà anche tutti i Job e le calibrazioni associate.`,
        confirmText: 'Delete',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.cameraService.delete(cam.id).subscribe({
          next: () => this.loadCameras(),
          error: (err) => console.error('Errore durante l\'eliminazione:', err)
        });
      }
    });
  }

  typeLabel(t: CameraType): string {
    const option = CAMERA_TYPE_OPTIONS.find(opt => opt.value === t);
    return option?.label ?? 'Unknown';
  }

  /**
   * Restituisce la classe CSS del badge cercando nel catalogo centralizzato 
   */
  typeBadgeClass(t: CameraType): string {
    const option = CAMERA_TYPE_OPTIONS.find(opt => opt.value === t);
    return option?.badgeClass ?? 'bg-gray-100 text-gray-700';
  }

  statusBadgeClass(status: string | undefined | null): string {
    if (!status) return 'hidden';

    const option = STATION_STATUS_OPTIONS.find(o => o.value === status.toUpperCase());
    return option?.badgeClass ?? 'bg-bg-subtle text-text-tertiary border-border-subtle';
  }
}