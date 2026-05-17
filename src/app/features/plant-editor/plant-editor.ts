// src/app/features/plant-editor/plant-editor.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../core/services/customer.service';
import { PlantService } from '../../core/services/plant.service';
import { Plant } from '../../core/models/domain.model';

@Component({
  selector: 'app-plant-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './plant-editor.html',
})
export class PlantEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly plantService = inject(PlantService);

  readonly isSubmitting = signal(false);
  readonly isEditMode = signal(false);
  
  private customerId = '';
  private customerSlug = '';
  private plantId = '';

  readonly form = this.fb.group({
    name: ['', Validators.required],
    location: [''],
    address: [''],
    notes: [''],
    contacts: this.fb.array([]) // Inizializza il FormArray vuoto
  });

  // Getter per accedere facilmente al FormArray nell'HTML
  get contactsFormArray() {
    return this.form.get('contacts') as FormArray;
  }

  ngOnInit(): void {
    this.customerSlug = this.route.snapshot.paramMap.get('slug') || '';
    this.plantId = this.route.snapshot.paramMap.get('plantId') || '';
    
    // Recupera Customer ID (indispensabile per creare un Plant)
    this.customerService.getBySlug(this.customerSlug).subscribe(c => {
      this.customerId = c.id;
    });

    if (this.plantId) {
      this.isEditMode.set(true);
      // Carica il Plant per l'edit
      this.plantService.getById(this.plantId).subscribe(p => {
        // Popola i campi testuali di base
        this.form.patchValue({
          name: p.name,
          location: p.location || '',
          address: p.address || '',
          notes: p.notes || ''
        });

        // Popola il FormArray per ogni contatto esistente nel DB
        if (p.contacts && p.contacts.length > 0) {
          p.contacts.forEach((contact: any) => this.addContact(contact));
        }
      });
    }
  }

  // Aggiunge un nuovo FormGroup all'Array (usato dal bottone e dal caricamento DB)
  addContact(contact?: any): void {
    const contactForm = this.fb.group({
      name: [contact?.name || '', Validators.required],
      role: [contact?.role || ''],
      email: [contact?.email || ''],
      phone: [contact?.phone || '']
    });
    this.contactsFormArray.push(contactForm);
  }

  // Rimuove un FormGroup dall'Array
  removeContact(index: number): void {
    this.contactsFormArray.removeAt(index);
  }

save(): void {
    if (this.form.invalid || !this.customerId) return;
    this.isSubmitting.set(true);

    // Eseguiamo il cast per rassicurare TypeScript sui tipi del FormArray
    const formPayload = this.form.getRawValue() as Partial<Plant>;

    const req$ = this.isEditMode()
      ? this.plantService.update(this.plantId, formPayload)
      : this.plantService.create({ ...formPayload, customerId: this.customerId });

    req$.subscribe({
      next: () => {
        this.router.navigate(['/customers', this.customerSlug]);
      },
      error: (err) => {
        console.error('Errore durante il salvataggio:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/customers', this.customerSlug]);
  }
}