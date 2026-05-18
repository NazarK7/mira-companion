import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CameraService } from '../../core/services/camera.service';
import { Camera } from '../../core/models/domain.model';

@Component({
  selector: 'app-camera-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './camera-editor.html',
})
export class CameraEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly cameraService = inject(CameraService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly isEditMode = signal(false);

  private customerSlug = '';
  private plantId = '';
  private stationId = '';
  private cameraId = '';

  readonly form = this.fb.group({
    name: ['', Validators.required],
    type: ['MIRA_3D', Validators.required],
    cameraModel: [''],
    lensFocalMm: [null as number | null],
    ipAddress: [''],
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
    
    // Controlliamo se stiamo modificando o creando
    const idParam = this.route.snapshot.paramMap.get('cameraId');
    if (idParam && !this.route.snapshot.url.map(s => s.path).includes('new')) {
      this.cameraId = idParam;
      this.isEditMode.set(true);
      
      this.cameraService.getById(this.cameraId).subscribe({
        next: (camera) => {
          this.form.patchValue({
            name: camera.name,
            type: camera.type,
            cameraModel: camera.cameraModel || '',
            lensFocalMm: camera.lensFocalMm || null,
            ipAddress: camera.ipAddress || '',
            firmware: camera.firmware || '',
            serialNumber: camera.serialNumber || '',
            macAddress: camera.macAddress || '',
            controllerType: camera.controllerType || null,
            plcNotes: camera.plcNotes || '',
            notes: camera.notes || ''
          });
        },
        error: (err) => console.error('Impossibile caricare la camera per la modifica', err)
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || !this.stationId) return;
    this.isSubmitting.set(true);

    const payload = this.form.getRawValue() as Partial<Camera>;

    const req$ = this.isEditMode()
      ? this.cameraService.update(this.cameraId, payload)
      : this.cameraService.create({ ...payload, stationId: this.stationId });

    req$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.navigateBack();
      },
      error: (err) => {
        console.error('Salvataggio fallito:', err);
        this.isSubmitting.set(false);
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