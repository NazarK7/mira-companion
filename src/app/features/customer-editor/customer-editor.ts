// src/app/features/customer-editor/customer-editor.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../core/services/customer.service';
import { Customer } from '../../core/models/domain.model';

@Component({
  selector: 'app-customer-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './customer-editor.html',
})
export class CustomerEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly isEditMode = signal(false);

  private customerId = '';
  private customerSlug = '';

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    shortName: [''],
    notes: [''],
    contacts: this.fb.array([]) // Aggiunto il FormArray
  });

  get contactsFormArray() {
    return this.form.get('contacts') as FormArray;
  }

  ngOnInit(): void {
    this.customerSlug = this.route.snapshot.paramMap.get('slug') || '';
    if (this.customerSlug) {
      this.isEditMode.set(true);
      this.customerService.getBySlug(this.customerSlug).subscribe({
        next: (customer) => {
          this.customerId = customer.id;

          this.form.patchValue({
            name: customer.name,
            shortName: customer.shortName || '',
            notes: customer.notes || ''
          });

          // Popoliamo i contatti esistenti
          if (customer.contacts && customer.contacts.length > 0) {
            customer.contacts.forEach((c: any) => this.addContact(c));
          }
        },
        error: (err) => console.error('Impossibile caricare il cliente per la modifica', err)
      });
    }
  }

  addContact(contact?: any): void {
    const contactForm = this.fb.group({
      name: [contact?.name || '', Validators.required],
      role: [contact?.role || ''],
      email: [contact?.email || ''],
      phone: [contact?.phone || '']
    });
    this.contactsFormArray.push(contactForm);
  }

  removeContact(index: number): void {
    this.contactsFormArray.removeAt(index);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.isSubmitting.set(true);

    // Cast esplicito per TypeScript
    const payload = this.form.getRawValue() as Partial<Customer>;

    const req$ = this.isEditMode()
      ? this.customerService.update(this.customerId, payload)
      : this.customerService.create(payload);

    req$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/customers']);
      },
      error: (err) => {
        console.error('Salvataggio fallito:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/customers']);
  }
}