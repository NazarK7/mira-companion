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
import { StationService } from '../../core/services/station.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ContactDialogComponent } from '../../shared/components/contact-dialog/contact-dialog';

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
  private readonly stationService = inject(StationService);
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

  // --- GESTIONE STAZIONI (Navigazione e Cancellazione) ---
  goToStation(stationId: string): void {
    const c = this.customer();
    const p = this.plant();
    if (c && p) this.router.navigate(['/customers', c.slug, 'plants', p.id, 'stations', stationId]);
  }

  editStation(event: Event, stationId: string): void {
    event.stopPropagation();
    const c = this.customer();
    const p = this.plant();
    // Preparazione per il prossimo step: la rotta dell'editor stazione
    if (c && p) this.router.navigate(['/customers', c.slug, 'plants', p.id, 'stations', stationId, 'edit']);
  }

  deleteStation(event: Event, stationId: string, stationName: string): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Elimina Stazione',
        message: `Sei sicuro di voler eliminare la stazione ${stationName}?\n\nTutte le Camere e i Job associati verranno eliminati definitivamente.`,
        confirmText: 'Elimina',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.stationService.delete(stationId).subscribe(() => this.reloadRoute());
      }
    });
  }

  // --- GESTIONE CONTATTI (Pop-up e API Patch) ---
  openContactDialog(contact?: any): void {
    const p = this.plant();
    if (!p) return;

    const dialogRef = this.dialog.open(ContactDialogComponent, {
      width: '400px',
      data: { contact }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        let updatedContacts = [...(p.contacts || [])];
        if (contact && contact.id) {
          updatedContacts = updatedContacts.map((c: any) => c.id === contact.id ? { ...c, ...result } : c);
        } else {
          delete result.id;
          updatedContacts.push(result);
        }
        this.plantService.update(p.id, { contacts: updatedContacts }).subscribe(() => this.reloadRoute());
      }
    });
  }

  deleteContact(contact: any): void {
    const p = this.plant();
    if (!p) return;

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
        const updatedContacts = p.contacts.filter((c: any) => c.id !== contact.id);
        this.plantService.update(p.id, { contacts: updatedContacts }).subscribe(() => this.reloadRoute());
      }
    });
  }

  private reloadRoute(): void {
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
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