import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe, DecimalPipe } from '@angular/common';

import { JobService } from '../../core/services/job.service';
import { Job, JobBackup } from '../../core/models/domain.model';

@Component({
  selector: 'app-job-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatIconModule, MatTooltipModule, DatePipe, DecimalPipe
  ],
  templateUrl: './job-editor.html',
})
export class JobEditorComponent implements OnInit {

  protected readonly Number = Number;
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobService = inject(JobService);

  // --- STATO ---
  readonly isSubmitting = signal(false);
  readonly isEditMode = signal(false);
  readonly errorMessage = signal<string | null>(null);
  
  // Gestione Backup
  readonly backups = signal<JobBackup[]>([]);
  readonly isUploading = signal(false);
  readonly selectedFile = signal<File | null>(null);

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
      this.loadJobData();
    }
  }

  private loadJobData(): void {
    this.jobService.getById(this.jobId).subscribe({
      next: (job) => {
        this.form.patchValue({
          name: job.name,
          description: job.description || '',
          visionToolSlot: job.visionToolSlot || null
        });
        this.backups.set(job.backups || []);
      },
      error: (err) => console.error('Error fetching job', err)
    });
  }

  // --- AZIONI LOGICHE (SAVE) ---
  onSubmit(): void {
    if (this.form.invalid || !this.cameraId) return;
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const rawValue = this.form.getRawValue();
    const payload: Partial<Job> = {
      name: rawValue.name,
      description: rawValue.description,
      visionToolSlot: rawValue.visionToolSlot ?? undefined
    };

    const req$ = this.isEditMode()
      ? this.jobService.update(this.jobId, payload)
      : this.jobService.create({ ...payload, cameraId: this.cameraId });

    req$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.navigateBack();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        // Gestione errore conflitto (Task 2)
        if (err.status === 409) {
          this.errorMessage.set(err.error.message || 'Slot VT o Nome già in uso per questa camera.');
        } else {
          this.errorMessage.set('Errore durante il salvataggio del Job.');
        }
      }
    });
  }

  // --- AZIONI FISICHE (FILES) ---
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) this.selectedFile.set(file);
  }

  uploadBackup(notes: string): void {
    const file = this.selectedFile();
    if (!file || !this.jobId) return;

    this.isUploading.set(true);
    this.jobService.uploadBackup(this.jobId, file, notes).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.loadJobData(); // Ricarica lo storico
      },
      error: () => this.isUploading.set(false)
    });
  }

  downloadBackup(id: string): void {
    this.jobService.downloadBackup(id);
  }

  deleteBackup(id: string): void {
    if (confirm('Eliminare definitivamente questo file di backup?')) {
      this.jobService.deleteBackup(id).subscribe(() => this.loadJobData());
    }
  }

  cancel(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    this.router.navigate(['/customers', this.customerSlug, 'plants', this.plantId, 'stations', this.stationId, 'cameras', this.cameraId]);
  }
}