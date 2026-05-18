// src/app/features/station-editor/station-editor.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { StationService } from '../../core/services/station.service';
import { Station } from '../../core/models/domain.model';

@Component({
  selector: 'app-station-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatSelectModule],
  templateUrl: './station-editor.html',

})
export class StationEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stationService = inject(StationService);

  readonly isSubmitting = signal(false);
  readonly isEditMode = signal(false);

  private customerSlug = '';
  private plantId = '';
  private stationId = '';

  readonly form = this.fb.group({
    name: ['', Validators.required],
    code: [''],
    line: [''],
    status: ['PRODUCTION'],
    description: [''],
    recoveryProcedure: [''],
    notes: ['']
  });

  ngOnInit(): void {
    // Estrai i parametri dalla rotta
    this.customerSlug = this.route.snapshot.paramMap.get('slug') || '';
    this.plantId = this.route.snapshot.paramMap.get('plantId') || '';
    this.stationId = this.route.snapshot.paramMap.get('stationId') || '';

    // Se c'è lo stationId ma non è 'new', siamo in Edit Mode
    if (this.stationId && !this.route.snapshot.url.map(segment => segment.path).includes('new')) {
      this.isEditMode.set(true);
      this.stationService.getById(this.stationId).subscribe(s => {
        this.form.patchValue({
          name: s.name,
          code: s.code || '',
          line: s.line || '',
          status: s.status || 'PRODUCTION',
          description: s.description || '',
          recoveryProcedure: s.recoveryProcedure || '',
          notes: s.notes || ''
        });
      });
    }
  }

  save(): void {
    if (this.form.invalid || !this.plantId) return;
    this.isSubmitting.set(true);

    const formPayload = this.form.getRawValue() as Partial<Station>;

    const req$ = this.isEditMode()
      ? this.stationService.update(this.stationId, formPayload)
      : this.stationService.create({ ...formPayload, plantId: this.plantId });

    req$.subscribe({
      next: () => {
        // Torna alla pagina del Plant
        this.router.navigate(['/customers', this.customerSlug, 'plants', this.plantId]);
      },
      error: (err) => {
        console.error('Errore durante il salvataggio:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/customers', this.customerSlug, 'plants', this.plantId]);
  }
}