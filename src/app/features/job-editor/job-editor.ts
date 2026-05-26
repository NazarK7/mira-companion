// src/app/features/job-editor/job-editor.ts
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { filter, switchMap, tap } from 'rxjs/operators';
import { DatePipe } from '@angular/common'; // DecimalPipe rimosso (Warning NG8113)

import { JobService } from '../../core/services/job.service';
import { Job } from '../../core/models/domain.model';
import { NotificationService } from '../../shared/services/notification.service';
import { AppButtonComponent } from '../../shared/components/button/button.component';
import { AppComponent } from '../../app';

@Component({
  selector: 'app-job-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppButtonComponent, DatePipe, RouterLink], // DecimalPipe rimosso
  templateUrl: './job-editor.html',
})
export class JobEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly jobService = inject(JobService);
  private readonly notify = inject(NotificationService);
  private readonly app = inject(AppComponent);

  // --- Route Inputs ---
  slug = input.required<string>();
  plantId = input.required<string>();
  stationId = input.required<string>();
  cameraId = input.required<string>();
  jobId = input<string>();

  // --- UI States ---
  readonly isSubmitting = signal(false);
  readonly isUploading = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly isEditMode = computed(() => !!this.jobId());

  // --- Form ---
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    visionToolSlot: [null as number | null, [Validators.min(1), Validators.max(99)]]
  });

  // --- Data Fetching ---
  protected readonly jobData = toSignal(
    toObservable(this.jobId).pipe(
      filter(Boolean),
      switchMap(id => this.jobService.getById(id)),
      tap(job => {
        this.form.patchValue({
          name: job.name,
          description: job.description || '',
          visionToolSlot: job.visionToolSlot ?? null
        });
      })
    )
  );

  protected readonly backups = computed(() => this.jobData()?.backups || []);

  ngOnInit(): void {}

  // --- Actions ---
  
  save(): void {
    if (this.form.invalid) return;
    this.isSubmitting.set(true);

    const rawValue = this.form.getRawValue();
    const id = this.jobId();

    // Pulizia payload: conversione null -> undefined per TypeScript (Error TS2345)
    const payload: Partial<Job> = {
      name: rawValue.name,
      description: rawValue.description || undefined,
      visionToolSlot: rawValue.visionToolSlot ?? undefined // Converte null in undefined
    };

    const request$ = id 
      ? this.jobService.update(id, payload)
      : this.jobService.create({ ...payload, cameraId: this.cameraId() });

    request$.subscribe({
      next: () => {
        this.notify.success(id ? 'Configurazione aggiornata' : 'Job creato correttamente');
        this.navigateBack();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.status === 409 ? 'Slot VT o Nome già in uso.' : 'Errore nel salvataggio.';
        this.notify.error(msg);
      }
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.selectedFile.set(file);
  }

  uploadBackup(notes: string): void {
    const file = this.selectedFile();
    const id = this.jobId();
    if (!file || !id) return;

    this.isUploading.set(true);
    this.jobService.uploadBackup(id, file, notes).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.notify.success('Backup sincronizzato');
        this.reloadJob();
      },
      error: () => {
        this.isUploading.set(false);
        this.notify.error("Errore durante l'upload");
      }
    });
  }

  async deleteBackup(backupId: string) {
    const confirmed = await this.app.confirm().open({
      title: 'Elimina Backup',
      message: 'Rimuovere definitivamente questa versione?',
      isDestructive: true
    });

    if (confirmed) {
      this.jobService.deleteBackup(backupId).subscribe(() => {
        this.notify.success('Versione rimossa');
        this.reloadJob();
      });
    }
  }

  downloadBackup(id: string): void {
    this.jobService.downloadBackup(id);
  }

  formatBytes(bytes: any): string {
    const b = Number(bytes || 0);
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
  }

  private reloadJob(): void {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/customers', this.slug(), 'plants', this.plantId(), 'stations', this.stationId(), 'cameras', this.cameraId(), 'jobs', this.jobId(), 'edit']);
    });
  }

  navigateBack(): void {
    this.router.navigate(['/customers', this.slug(), 'plants', this.plantId(), 'stations', this.stationId(), 'cameras', this.cameraId()]);
  }
}