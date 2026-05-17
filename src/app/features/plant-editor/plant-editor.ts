// src/app/features/plant-editor/plant-editor.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CustomerService } from '../../core/services/customer.service';
import { PlantService } from '../../core/services/plant.service';

@Component({
  selector: 'app-plant-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
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
  
  // Parametri URL salvati nello stato
  private customerId = '';
  private customerSlug = '';
  private plantId = '';

  readonly form = this.fb.group({
    name: ['', Validators.required],
    location: [''],
    address: [''],
    notes: ['']
  });

  ngOnInit(): void {
    this.customerSlug = this.route.snapshot.paramMap.get('slug') || '';
    this.plantId = this.route.snapshot.paramMap.get('plantId') || '';
    
    if (this.plantId) {
      this.isEditMode.set(true);
      // Carica i dati per l'edit
      this.plantService.getById(this.plantId).subscribe(p => {
        this.form.patchValue(p);
      });
    }

    // Ci serve l'ID del customer (UUID) per creare il plant, lo recuperiamo tramite lo slug
    this.customerService.getBySlug(this.customerSlug).subscribe(c => {
      this.customerId = c.id;
    });
  }

  save(): void {
    if (this.form.invalid || !this.customerId) return;
    this.isSubmitting.set(true);

    const req$ = this.isEditMode()
      ? this.plantService.update(this.plantId, this.form.getRawValue())
      : this.plantService.create({ ...this.form.getRawValue(), customerId: this.customerId });

    req$.subscribe({
      next: (savedPlant) => {
        // Torna al dettaglio del customer o del plant aggiornato
        this.router.navigate(['/customers', this.customerSlug]);
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/customers', this.customerSlug]);
  }
}