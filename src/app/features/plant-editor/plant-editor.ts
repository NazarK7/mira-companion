// src/app/features/plant-editor/plant-editor.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerService } from '../../core/services/customer.service';
import { PlantService } from '../../core/services/plant.service';
import { NotificationService } from '../../shared/services/notification.service';
import { I18nService } from '../../shared/services/i18n.service';
import { AppButtonComponent } from '../../shared/components/button/button.component';
import { Plant } from '../../core/models/domain.model';

@Component({
  selector: 'app-plant-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppButtonComponent],
  templateUrl: './plant-editor.html',
})
export class PlantEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly plantService = inject(PlantService);
  private readonly notify = inject(NotificationService);
  protected readonly i18n = inject(I18nService);

  readonly isSubmitting = signal(false);
  readonly isEditMode = signal(false);
  
  private customerId = '';
  private customerSlug = '';
  private plantId = '';

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    location: [''],
    address: [''],
    notes: [''],
    contacts: this.fb.array([])
  });

  get contactsFormArray() {
    return this.form.get('contacts') as FormArray;
  }

  ngOnInit(): void {
    this.customerSlug = this.route.snapshot.paramMap.get('slug') || '';
    this.plantId = this.route.snapshot.paramMap.get('plantId') || '';
    
    // Recupero Customer ID obbligatorio
    this.customerService.getBySlug(this.customerSlug).subscribe({
      next: c => this.customerId = c.id,
      error: () => this.notify.error('Impossibile recuperare i dati del cliente')
    });

    if (this.plantId) {
      this.isEditMode.set(true);
      this.plantService.getById(this.plantId).subscribe({
        next: p => {
          this.form.patchValue({
            name: p.name,
            location: p.location || '',
            address: p.address || '',
            notes: p.notes || ''
          });
          if (p.contacts) {
            p.contacts.forEach((contact: any) => this.addContact(contact));
          }
        },
        error: () => this.notify.error('Errore nel caricamento dell\'impianto')
      });
    }
  }

  addContact(contact?: any): void {
    const contactForm = this.fb.group({
      name: [contact?.name || '', Validators.required],
      role: [contact?.role || ''],
      email: [contact?.email || '', [Validators.email]],
      phone: [contact?.phone || '']
    });
    this.contactsFormArray.push(contactForm);
  }

  removeContact(index: number): void {
    this.contactsFormArray.removeAt(index);
  }

  save(): void {
    if (this.form.invalid || !this.customerId) {
      this.notify.warning('Compila correttamente i campi obbligatori');
      return;
    }
    
    this.isSubmitting.set(true);
    const formPayload = this.form.getRawValue() as Partial<Plant>;

    const req$ = this.isEditMode()
      ? this.plantService.update(this.plantId, formPayload)
      : this.plantService.create({ ...formPayload, customerId: this.customerId });

    req$.subscribe({
      next: () => {
        this.notify.success(this.isEditMode() ? 'Impianto aggiornato' : 'Impianto creato');
        this.router.navigate(['/customers', this.customerSlug]);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notify.error('Errore durante il salvataggio dell\'impianto');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/customers', this.customerSlug]);
  }
}