// src/app/features/plant-detail/plant-detail.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map } from 'rxjs/operators';

import { CustomerService } from '../../core/services/customer.service';
import { PlantService } from '../../core/services/plant.service';
import { StationService } from '../../core/services/station.service';
import { I18nService } from '../../shared/services/i18n.service';
import { AppButtonComponent } from '../../shared/components/button/button.component';
import { AppComponent } from '../../app';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-plant-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppButtonComponent],
  templateUrl: './plant-detail.html',
})
export class PlantDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly plantService = inject(PlantService);
  private readonly stationService = inject(StationService);
  private readonly app = inject(AppComponent);
  private readonly notify = inject(NotificationService);
  protected readonly i18n = inject(I18nService);

  // Recupero dati Customer via Signal
  readonly customer = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('slug')!),
      switchMap(slug => this.customerService.getBySlug(slug))
    )
  );

  // Signal derivato per il Plant specifico
  readonly plant = computed(() => {
    const cust = this.customer();
    const id = this.route.snapshot.paramMap.get('plantId');
    if (!cust || !id) return null;
    return cust.plants.find((p: any) => p.id === id) ?? null;
  });

  // --- GESTIONE STAZIONI ---

  editStation(event: Event, stationId: string) {
    event.stopPropagation();
    const c = this.customer();
    const p = this.plant();
    if (c && p) {
      this.router.navigate(['/customers', c.slug, 'plants', p.id, 'stations', stationId, 'edit']);
    }
  }

  async deleteStation(event: Event, stationId: string, stationName: string) {
    event.stopPropagation();

    const confirmed = await this.app.confirm().open({
      title: 'Elimina Stazione',
      message: `Sei sicuro di voler eliminare la stazione ${stationName}?`,
      isDestructive: true
    });

    if (confirmed) {
      this.stationService.delete(stationId).subscribe({
        next: () => {
          this.notify.success('Stazione rimossa');
          this.reloadRoute();
        }
      });
    }
  }

  async openContactDialog(contact?: any) {
  const p = this.plant();
  if (!p) return;

  const result = await this.app.contactDialog().open(contact);

  if (result) {
    let updatedContacts: any[] = [...(p.contacts || [])];
    
    if (contact && contact.id) {
      updatedContacts = updatedContacts.map((c: any) => 
        c.id === contact.id ? { ...c, ...result, id: contact.id } : c
      );
    } else {
      const { id, ...newContactData } = result;
      updatedContacts.push(newContactData);
    }

    // 3. Inviamo l'aggiornamento al service
    this.plantService.update(p.id, { contacts: updatedContacts }).subscribe({
      next: () => {
        this.notify.success(contact ? 'Contatto aggiornato' : 'Contatto aggiunto');
        this.reloadRoute();
      }
    });
  }
}


  // --- GESTIONE CONTATTI ---

  async deleteContact(contact: any) {
    const p = this.plant();
    if (!p) return;

    const confirmed = await this.app.confirm().open({
      title: 'Elimina Contatto',
      message: `Rimuovere ${contact.name} dai riferimenti dell'impianto?`,
      isDestructive: true
    });

    if (confirmed) {
      const updatedContacts = p.contacts.filter((c: any) => c.id !== contact.id);
      this.plantService.update(p.id, { contacts: updatedContacts }).subscribe(() => this.reloadRoute());
    }
  }

private reloadRoute(): void {
  // 1. Salviamo l'URL attuale PRIMA di navigare via
  const currentUrl = this.router.url;

  // 2. Navighiamo verso la root temporaneamente (senza scriverlo nella history)
  this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
    // 3. Torniamo all'URL che avevamo salvato
    this.router.navigateByUrl(currentUrl);
  });
}

  statusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'production': return 'bg-success-500/10 text-success-500 border-success-500/20';
      case 'maintenance': return 'bg-warning-500/10 text-warning-500 border-warning-500/20';
      case 'planning': return 'bg-info-500/10 text-info-500 border-info-500/20';
      default: return 'bg-bg-subtle text-text-tertiary border-border-subtle';
    }
  }
}