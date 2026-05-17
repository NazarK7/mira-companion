// src/app/features/customer-detail/customer-detail.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { CustomerService } from '../../core/services/customer.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './customer-detail.html',
})
export class CustomerDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly dialog = inject(MatDialog);

  private readonly slug$ = this.route.paramMap.pipe(filter(params => params.has('slug')));

  readonly customer = toSignal(
    this.slug$.pipe(switchMap(params => this.customerService.getBySlug(params.get('slug')!)))
  );

  deleteCustomer(id: string, name: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Elimina Customer',
        message: `Sei sicuro di voler eliminare ${name}?\n\nATTENZIONE: Questa azione eliminerà a cascata tutti i Plant, Station, Camere e Job associati. L'azione è irreversibile.`,
        confirmText: 'Elimina',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.customerService.delete(id).subscribe({
          next: () => this.router.navigate(['/customers']),
          error: (err) => console.error('Errore durante eliminazione:', err)
        });
      }
    });
  }
}