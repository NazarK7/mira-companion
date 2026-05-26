// src/app/features/station-editor/station-editor.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StationService } from '../../core/services/station.service';
import { NotificationService } from '../../shared/services/notification.service';
import { I18nService } from '../../shared/services/i18n.service';
import { AppButtonComponent } from '../../shared/components/button/button.component';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Station } from '../../core/models/domain.model';
// Assicurati di importare anche il tipo StationStatus
import { STATION_STATUS, STATION_STATUS_OPTIONS, StationStatus } from '../../core/data/features';

@Component({
  selector: 'app-station-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppButtonComponent, MatSelectModule, MatFormFieldModule, MatInputModule],
  templateUrl: './station-editor.html',
})
export class StationEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stationService = inject(StationService);
  private readonly notify = inject(NotificationService);
  protected readonly i18n = inject(I18nService);

  readonly isSubmitting = signal(false);
  readonly isEditMode = signal(false);
  protected readonly statusOptions = STATION_STATUS_OPTIONS;

  private customerSlug = '';
  private plantId = '';
  private stationId = '';

  // FIX: Usiamo l'operatore 'as' per definire il tipo corretto del campo status
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: [''],
    line: [''],
    // Definiamo esplicitamente il tipo del controllo come StationStatus
    status: new FormControl<StationStatus>(STATION_STATUS.PRODUCTION, { nonNullable: true, validators: [Validators.required] }),
    description: [''],
    recoveryProcedure: [''],
    notes: ['']
  });

  ngOnInit(): void {
    this.customerSlug = this.route.snapshot.paramMap.get('slug') || '';
    this.plantId = this.route.snapshot.paramMap.get('plantId') || '';
    this.stationId = this.route.snapshot.paramMap.get('stationId') || '';

    if (this.stationId && !this.route.snapshot.url.map(s => s.path).includes('new')) {
      this.isEditMode.set(true);
      this.stationService.getById(this.stationId).subscribe({
        next: s => {
          // Ora patchValue accetterà qualsiasi StationStatus (PLANNING, MAINTENANCE, etc.)
          this.form.patchValue({
            name: s.name,
            code: s.code || '',
            line: s.line || '',
            status: (s.status as StationStatus) || STATION_STATUS.PRODUCTION, // <-- CAST DI SICUREZZA
            description: s.description || '',
            recoveryProcedure: s.recoveryProcedure || '',
            notes: s.notes || ''
          });
        },
        error: () => this.notify.error('Impossibile caricare la stazione')
      });
    }
  }

  save(): void {
    if (this.form.invalid || !this.plantId) {
      this.notify.warning('Compila i campi obbligatori');
      return;
    }

    this.isSubmitting.set(true);

    // Usiamo 'unknown' come ponte per forzare il cast a Partial<Station>
    const formPayload = this.form.getRawValue() as unknown as Partial<Station>;

    const req$ = this.isEditMode()
      ? this.stationService.update(this.stationId, formPayload)
      : this.stationService.create({ ...formPayload, plantId: this.plantId });
    req$.subscribe({
      next: () => {
        this.notify.success(this.isEditMode() ? 'Stazione aggiornata' : 'Stazione creata');
        this.router.navigate(['/customers', this.customerSlug, 'plants', this.plantId]);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notify.error('Errore durante il salvataggio');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/customers', this.customerSlug, 'plants', this.plantId]);
  }
}