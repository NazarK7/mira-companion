// src/app/shared/components/feedback-toast/feedback-toast.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarModule, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface FeedbackData {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

@Component({
  selector: 'app-feedback-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatSnackBarModule, MatIconModule, MatButtonModule],
  templateUrl: './feedback-toast.html',
  host: { 'class': 'block' }
})
export class FeedbackToastComponent {
  readonly data = inject<FeedbackData>(MAT_SNACK_BAR_DATA);
  readonly snackBarRef = inject(MatSnackBarRef);

  get icon(): string {
    switch (this.data.type) {
      case 'success': return 'check_circle';
      case 'error': return 'report_problem';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}