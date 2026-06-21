// src/app/features/camera-editor/camera-editor.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { CameraService } from '../../core/services/camera.service';
import { NotificationService } from '../../shared/services/notification.service';
import { I18nService } from '../../shared/services/i18n.service';
import { AppButtonComponent } from '../../shared/components/button/button.component';
import { Camera, CameraStatus } from '../../core/models/domain.model';
import { CAMERA_TYPE_OPTIONS, ROBOT_CONTROLLER_OPTIONS } from '../../core/data/features';

@Component({
  selector: 'app-camera-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    AppButtonComponent
  ],
  templateUrl: './camera-editor.html',
})
export class CameraEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly cameraService = inject(CameraService);
  private readonly notify = inject(NotificationService);
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly isEditMode = signal(false);
  
  protected readonly typeOptions = CAMERA_TYPE_OPTIONS;
  protected readonly robotOptions = ROBOT_CONTROLLER_OPTIONS;

  private customerSlug = '';
  private plantId = '';
  private stationId = '';
  private cameraId = '';

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    type: ['MIRA_3D', Validators.required],
    status: [null as CameraStatus | null],
    cameraModel: [''],
    lensFocalMm: [null as number | null],
    ipAddress: ['', [Validators.pattern(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)]],
    firmware: [''],
    serialNumber: [''],
    macAddress: [''],
    controllerType: [null as string | null],
    plcNotes: [''],
    notes: ['']
  });

  ngOnInit(): void {
    this.customerSlug = this.route.snapshot.paramMap.get('slug') || '';
    this.plantId = this.route.snapshot.paramMap.get('plantId') || '';
    this.stationId = this.route.snapshot.paramMap.get('stationId') || '';
    
    const idParam = this.route.snapshot.paramMap.get('cameraId');
    if (idParam && !this.route.snapshot.url.map(s => s.path).includes('new')) {
      this.cameraId = idParam;
      this.isEditMode.set(true);
      
      this.cameraService.getById(this.cameraId).subscribe({
        next: (camera) => {
          this.form.patchValue({
            name: camera.name,
            type: camera.type,
            status: camera.status || null,
            cameraModel: camera.cameraModel || '',
            lensFocalMm: camera.lensFocalMm || null,
            ipAddress: camera.ipAddress || '',
            firmware: camera.firmware || '',
            serialNumber: camera.serialNumber || '',
            controllerType: camera.controllerType || null,
            plcNotes: camera.plcNotes || '',
            notes: camera.notes || ''
          });
        },
        error: () => this.notify.error('Errore nel caricamento della camera')
      });
    }
  }

  save(): void {
    if (this.form.invalid || !this.stationId) {
      this.notify.warning('Verifica i parametri hardware');
      return;
    }
    
    this.isSubmitting.set(true);
    const payload = this.form.getRawValue() as Partial<Camera>;

    const req$ = this.isEditMode()
      ? this.cameraService.update(this.cameraId, payload)
      : this.cameraService.create({ ...payload, stationId: this.stationId });

    req$.subscribe({
      next: () => {
        this.notify.success(this.isEditMode() ? 'Configurazione aggiornata' : 'Camera registrata');
        this.navigateBack();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notify.error('Salvataggio fallito');
      }
    });
  }

  cancel(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    this.router.navigate(['/customers', this.customerSlug, 'plants', this.plantId, 'stations', this.stationId]);
  }
}