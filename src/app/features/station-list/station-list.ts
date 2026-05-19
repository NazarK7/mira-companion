import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { StationService } from '../../core/services/station.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-station-list',
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
  templateUrl: './station-list.html',
})
export class StationListComponent implements OnInit {
  private readonly stationService = inject(StationService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  // --- STATO SERVER-SIDE (Signals) ---
  readonly totalItems = signal(0);
  readonly pageSize = signal(25);
  readonly pageIndex = signal(0);
  readonly searchFilter = signal('');

  // Colonne: Nome, Codice, Percorso (Cliente > Impianto), Camere, Stato, Azioni
  readonly displayedColumns = ['name', 'code', 'path', 'camerasCount', 'status', 'actions'];
  readonly dataSource = new MatTableDataSource<any>([]);

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  constructor() {
    // Ricarica i dati ogni volta che cambiano i segnali di paginazione o ricerca
    effect(() => {
      this.loadStations();
    });
  }

  ngOnInit(): void {
    // Caricamento iniziale gestito dall'effect
  }

  loadStations(): void {
    const params = {
      skip: this.pageIndex() * this.pageSize(),
      take: this.pageSize(),
      search: this.searchFilter().trim()
    };

    this.stationService.getAll(params).subscribe({
      next: (res: any) => {
        // Il backend restituisce { items: [], total: number }
        this.dataSource.data = res.items;
        this.totalItems.set(res.total);
      },
      error: (err) => console.error('Errore caricamento stazioni:', err)
    });
  }

  // --- LOGICA UI ---

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchFilter.set(filterValue);
    this.pageIndex.set(0); // Torna alla prima pagina durante la ricerca
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  // --- NAVIGAZIONE ---

  viewStation(s: any): void {
    // URL gerarchico: /customers/:slug/plants/:plantId/stations/:id
    this.router.navigate(['/customers', s.customerSlug, 'plants', s.plantId, 'stations', s.id]);
  }

  editStation(s: any): void {
    this.router.navigate(['/customers', s.customerSlug, 'plants', s.plantId, 'stations', s.id, 'edit']);
  }

  deleteStation(s: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Station',
        message: `Sei sicuro di voler eliminare la stazione "${s.name}"?\n\nL'azione rimuoverà definitivamente tutte le camere e i job associati.`,
        confirmText: 'Delete',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.stationService.delete(s.id).subscribe({
          next: () => this.loadStations(),
          error: (err) => console.error('Errore eliminazione stazione:', err)
        });
      }
    });
  }

  statusBadgeClass(status: string | undefined | null): string {
    if (!status) return 'hidden';
    switch (status.toUpperCase()) {
      case 'PRODUCTION': return 'bg-[var(--color-success-50)] text-[var(--color-success-700)]';
      case 'MAINTENANCE': return 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)]';
      case 'PLANNING': return 'bg-[var(--color-info-50)] text-[var(--color-info-700)]';
      default: return 'bg-[var(--bg-strong)] text-[var(--text-secondary)]';
    }
  }
}