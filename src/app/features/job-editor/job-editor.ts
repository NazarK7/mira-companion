import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { JobService } from '../../core/services/job.service';
import { Job } from '../../core/models/domain.model';

@Component({
  selector: 'app-job-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './job-editor.html',
})
export class JobEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobService = inject(JobService); // <-- Iniezione del Service vero

  readonly isSubmitting = signal(false);
  readonly isEditMode = signal(false);

  private customerSlug = '';
  private plantId = '';
  private stationId = '';
  private cameraId = '';
  private jobId = '';

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    visionToolSlot: [null as number | null]
  });

  ngOnInit(): void {
    this.customerSlug = this.route.snapshot.paramMap.get('slug') || '';
    this.plantId = this.route.snapshot.paramMap.get('plantId') || '';
    this.stationId = this.route.snapshot.paramMap.get('stationId') || '';
    this.cameraId = this.route.snapshot.paramMap.get('cameraId') || '';

    const idParam = this.route.snapshot.paramMap.get('jobId');
    if (idParam && !this.route.snapshot.url.map(s => s.path).includes('new')) {
      this.jobId = idParam;
      this.isEditMode.set(true);

      // FETCH DEL JOB ESISTENTE
      this.jobService.getById(this.jobId).subscribe({
        next: (job) => {
          this.form.patchValue({
            name: job.name,
            description: job.description || '',
            visionToolSlot: job.visionToolSlot || null
          });
        },
        error: (err) => console.error('Error fetching job', err)
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || !this.cameraId) return;
    this.isSubmitting.set(true);

    const rawValue = this.form.getRawValue();

    // Puliamo il payload: convertiamo i null in undefined 
    // per rispettare la firma Partial<Job>
    const payload: Partial<Job> = {
      name: rawValue.name,
      description: rawValue.description,
      visionToolSlot: rawValue.visionToolSlot ?? undefined
    };

    // CHIAMATA API REALE (POST o PATCH)
    const req$ = this.isEditMode()
      ? this.jobService.update(this.jobId, payload)
      : this.jobService.create({ ...payload, cameraId: this.cameraId });

    req$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.navigateBack();
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  cancel(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    this.router.navigate([
      '/customers', this.customerSlug,
      'plants', this.plantId,
      'stations', this.stationId,
      'cameras', this.cameraId
    ]);
  }
}