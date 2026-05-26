// src/app/features/customer-editor/customer-editor.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../core/services/customer.service';
import { NotificationService } from '../../shared/services/notification.service';
import { I18nService } from '../../shared/services/i18n.service';
import { AppButtonComponent } from '../../shared/components/button/button.component';
import { Customer } from '../../core/models/domain.model';

@Component({
  selector: 'app-customer-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppButtonComponent],
  templateUrl: './customer-editor.html',
})
export class CustomerEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly notify = inject(NotificationService);
  protected readonly i18n = inject(I18nService);
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
    contacts: this.fb.array([])
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
          if (customer.contacts) {
            customer.contacts.forEach((c: any) => this.addContact(c));
          }
        },
        error: () => this.notify.error('Impossibile caricare il cliente')
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.notify.warning('Controlla i campi obbligatori');
      return;
    }
    
    this.isSubmitting.set(true);
    const payload = this.form.getRawValue() as Partial<Customer>;

    const req$ = this.isEditMode()
      ? this.customerService.update(this.customerId, payload)
      : this.customerService.create(payload);

    req$.subscribe({
      next: () => {
        this.notify.success(this.isEditMode() ? 'Cliente aggiornato' : 'Cliente creato');
        this.router.navigate(['/customers']);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notify.error('Errore durante il salvataggio');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/customers']);
  }
}