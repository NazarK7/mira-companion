import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FeedbackToastComponent, FeedbackData } from '../feedback-toast/feedback-toast';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly snackBar = inject(MatSnackBar);

  show(message: string, type: FeedbackData['type'] = 'info') {
    this.snackBar.openFromComponent(FeedbackToastComponent, {
      data: { message, type },
      duration: type === 'error' ? 10000 : 5000,
      horizontalPosition: 'end', // Destra
      verticalPosition: 'top',   // In alto
      panelClass: 'custom-toast-container' // Classe per resettare padding/background nel CSS globale
    });
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string) { this.show(msg, 'error'); }
  warning(msg: string) { this.show(msg, 'warning'); }
  info(msg: string) { this.show(msg, 'info'); }
}