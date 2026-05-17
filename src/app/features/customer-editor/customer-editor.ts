// src/app/features/customer-editor/customer-editor.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CustomerService } from '../../core/services/customer.service';

@Component({
  selector: 'app-customer-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
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

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    shortName: [''],
    notes: ['']
  });

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.isEditMode.set(true);
      this.customerService.getBySlug(slug).subscribe({
        next: (customer) => {
          this.customerId = customer.id;
          this.form.patchValue({
            name: customer.name,
            shortName: customer.shortName || '',
            notes: customer.notes || ''
          });
        },
        error: (err) => console.error('Impossibile caricare il cliente per la modifica', err)
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    const rawValues = this.form.getRawValue();
    
    const req$ = this.isEditMode()
      ? this.customerService.update(this.customerId, rawValues)
      : this.customerService.create(rawValues);

    req$.subscribe({
      next: (updatedCustomer) => {
        this.isSubmitting.set(false);
        // Naviga al dettaglio (con lo slug potenzialmente aggiornato se ha cambiato nome)
        this.router.navigate(['/customers', updatedCustomer.slug]);
      },
      error: (err) => {
        console.error('Salvataggio fallito:', err);
        this.isSubmitting.set(false);
      }
    });
  }
}