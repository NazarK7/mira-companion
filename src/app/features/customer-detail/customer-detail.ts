// src/app/features/customer-detail/customer-detail.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { CustomerService } from '../../core/services/customer.service';
import { PlantService } from '../../core/services/plant.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ContactDialogComponent } from '../../shared/components/contact-dialog/contact-dialog';

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
  private readonly plantService = inject(PlantService);
  private readonly dialog = inject(MatDialog);

  private readonly slug$ = this.route.paramMap.pipe(filter(params => params.has('slug')));

  readonly customer = toSignal(
    this.slug$.pipe(switchMap(params => this.customerService.getBySlug(params.get('slug')!)))
  );

  // --- GESTIONE CONTATTI (Pop-up e API Patch) ---
  openContactDialog(contact?: any): void {
    const cust = this.customer();
    if (!cust) return;

    const dialogRef = this.dialog.open(ContactDialogComponent, {
      width: '400px',
      data: { contact }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        let updatedContacts = [...(cust.contacts || [])];
        if (contact && contact.id) {
          // Modifica
          updatedContacts = updatedContacts.map((c: any) => c.id === contact.id ? { ...c, ...result } : c);
        } else {
          // Aggiunta
          delete result.id; // Lasciamo generare l'UUID a Postgres
          updatedContacts.push(result);
        }
        
        // Salva e forza un re-fetch ricaricando la rotta
        this.customerService.update(cust.id, { contacts: updatedContacts }).subscribe(() => this.reloadRoute());
      }
    });
  }

  deleteContact(contact: any): void {
    const cust = this.customer();
    if (!cust) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Elimina Contatto',
        message: `Sei sicuro di voler eliminare il contatto ${contact.name}?`,
        confirmText: 'Elimina',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        const updatedContacts = cust.contacts.filter((c: any) => c.id !== contact.id);
        this.customerService.update(cust.id, { contacts: updatedContacts }).subscribe(() => this.reloadRoute());
      }
    });
  }

  // --- GESTIONE PLANT (Azioni sulle card) ---
  editPlant(event: Event, plantId: string): void {
    event.preventDefault();
    event.stopPropagation();
    const cust = this.customer();
    if (cust) this.router.navigate(['/customers', cust.slug, 'plants', plantId, 'edit']);
  }

  deletePlant(event: Event, plantId: string, plantName: string): void {
    event.preventDefault();
    event.stopPropagation();
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Elimina Plant',
        message: `Sei sicuro di voler eliminare ${plantName}?\n\nTutte le Station e le Camere associate verranno eliminate.`,
        confirmText: 'Elimina',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.plantService.delete(plantId).subscribe(() => this.reloadRoute());
      }
    });
  }

  // Metodo helper per forzare il refresh dei dati a schermo senza sfarfallii eccessivi
  private reloadRoute(): void {
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }
}