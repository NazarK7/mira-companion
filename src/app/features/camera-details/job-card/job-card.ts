import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { CameraType, Job } from './../../../core/models/domain.model';
import {
  formatDate,
  formatFileSize,
  relativeTime,} from './../../../core/utils/date-format.util';

@Component({
  selector: 'app-job-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './job-card.html',
})
export class JobCardComponent {
  readonly job = input.required<Job>();
  readonly cameraType = input<CameraType>('MIRA_3D');

  readonly expanded = signal(false);

  readonly sortedBackups = computed(() =>
    [...this.job().backups].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );

  readonly latestBackup = computed(() => this.sortedBackups()[0] ?? null);

  readonly previousBackups = computed(() => this.sortedBackups().slice(1));

  readonly isCognex = computed(
    () => this.cameraType() === 'COGNEX_INSIGHT' || this.cameraType() === 'COGNEX_DATAMAN',
  );

  toggleExpand(): void {
    this.expanded.update(v => !v);
  }

  // Esposti al template
  readonly relativeTime = relativeTime;
  readonly formatFileSize = formatFileSize;
  readonly formatDate = formatDate;
}