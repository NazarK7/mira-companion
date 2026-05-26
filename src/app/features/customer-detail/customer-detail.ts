// src/app/features/customer-detail/customer-detail.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map } from 'rxjs/operators';
import { CustomerService } from '../../core/services/customer.service';
import { PlantService } from '../../core/services/plant.service';
import { I18nService } from '../../shared/services/i18n.service';
import { AppButtonComponent } from '../../shared/components/button/button.component';
import { AppComponent } from '../../app'; 
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppButtonComponent],
  templateUrl: './customer-detail.html',
})
export class CustomerDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly plantService = inject(PlantService);
  private readonly app = inject(AppComponent);
  private readonly notify = inject(NotificationService);
  protected readonly i18n = inject(I18nService);

  readonly customer = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('slug')!),
      switchMap(slug => this.customerService.getBySlug(slug))
    )
  );

  // --- GESTIONE CONTATTI ---
  async openContactDialog(contact?: any) {
    const cust = this.customer();
    if (!cust) return;

    // Apriamo il dialog nativo centrato tramite AppComponent
    const result = await this.app.contactDialog().open(contact);

    if (result) {
      let updatedContacts = [...(cust.contacts || [])];
      
      if (contact && contact.id) {
        // MODIFICA: Aggiorniamo l'elemento esistente mantenendo l'ID originale
        updatedContacts = updatedContacts.map((c: any) => 
          c.id === contact.id ? { ...c, ...result, id: contact.id } : c
        );
      } else {
        // AGGIUNTA: Rimuoviamo l'id (che sarebbe undefined) e castiamo per TS
        // Lasciamo che PostgreSQL generi l'UUID via Prisma
        const { id, ...newContactData } = result;
        updatedContacts.push(newContactData as any);
      }
      
      this.customerService.update(cust.id, { contacts: updatedContacts }).subscribe({
        next: () => {
          this.notify.success(contact ? 'Contatto aggiornato' : 'Contatto aggiunto');
          this.reloadRoute();
        }
      });
    }
  }

  async deleteContact(contact: any) {
    const cust = this.customer();
    if (!cust) return;

    const confirmed = await this.app.confirm().open({
      title: 'Elimina Contatto',
      message: `Sei sicuro di voler eliminare il contatto ${contact.name}?`,
      isDestructive: true
    });

    if (confirmed) {
      const updatedContacts = cust.contacts.filter((c: any) => c.id !== contact.id);
      this.customerService.update(cust.id, { contacts: updatedContacts }).subscribe({
        next: () => {
          this.notify.success('Contatto eliminato');
          this.reloadRoute();
        }
      });
    }
  }

  // --- GESTIONE PLANT ---
  editPlant(event: Event, plantId: string) {
    event.preventDefault();
    event.stopPropagation();
    const cust = this.customer();
    if (cust) this.router.navigate(['/customers', cust.slug, 'plants', plantId, 'edit']);
  }

  async deletePlant(event: Event, plantId: string, plantName: string) {
    event.preventDefault();
    event.stopPropagation();
    
    const confirmed = await this.app.confirm().open({
      title: 'Elimina Plant',
      message: `Sei sicuro di voler eliminare ${plantName}?`,
      isDestructive: true
    });

    if (confirmed) {
      this.plantService.delete(plantId).subscribe(() => {
        this.notify.success('Plant rimosso');
        this.reloadRoute();
      });
    }
  }

  private reloadRoute(): void {
    const currentSlug = this.customer()?.slug;
    if (!currentSlug) return;
    
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/customers', currentSlug]);
    });
  }
}