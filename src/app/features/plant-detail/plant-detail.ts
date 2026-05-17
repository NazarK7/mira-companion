// src/app/features/plant-detail/plant-detail.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { CustomerService } from '../../core/services/customer.service';
import { PlantService } from '../../core/services/plant.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-plant-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './plant-detail.html',
})
export class PlantDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly plantService = inject(PlantService);
  private readonly dialog = inject(MatDialog);

  private readonly slug$ = this.route.paramMap.pipe(filter(params => params.has('slug')));

  readonly customer = toSignal(
    this.slug$.pipe(switchMap(params => this.customerService.getBySlug(params.get('slug')!)))
  );

  readonly plant = computed(() => {
    const cust = this.customer();
    const id = this.route.snapshot.paramMap.get('plantId');
    if (!cust || !id) return null;
    return cust.plants.find((p: any) => p.id === id) ?? null;
  });

  // METODO PER ELIMINARE IL PLANT
  deletePlant(id: string, name: string): void {
    const cust = this.customer();
    if (!cust) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Elimina Plant',
        message: `Sei sicuro di voler eliminare ${name}?\n\nATTENZIONE: Questa azione eliminerà a cascata tutte le Station, Camere e Job associati a questo Plant. L'azione è irreversibile.`,
        confirmText: 'Elimina',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.plantService.delete(id).subscribe({
          // Se va a buon fine, torna alla pagina del Customer
          next: () => this.router.navigate(['/customers', cust.slug]),
          error: (err) => console.error('Errore durante eliminazione plant:', err)
        });
      }
    });
  }

  statusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
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