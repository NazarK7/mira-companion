// src/app/features/customer-editor/customer-editor.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
export class CustomerEditorComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    shortName: [''],
    notes: ['']
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    
    this.customerService.create(this.form.getRawValue()).subscribe({
      next: (newCustomer) => {
        this.isSubmitting.set(false);
        // Naviga al dettaglio del cliente appena creato
        this.router.navigate(['/customers', newCustomer.slug]);
      },
      error: (err) => {
        console.error('Creazione fallita:', err);
        this.isSubmitting.set(false);
      }
    });
  }
}