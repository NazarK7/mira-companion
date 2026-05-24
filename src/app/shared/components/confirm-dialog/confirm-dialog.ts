// src/app/shared/components/confirm-dialog/confirm-dialog.ts
import { Component, signal, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (isOpen()) {
      <div class="dialog-overlay">
        <h3>{{ title() }}</h3>
        <p>{{ message() }}</p>
        <button (click)="close(false)">Cancel</button>
        <button (click)="close(true)">Confirm</button>
      </div>
    }
  `
})
export class ConfirmDialogComponent {
  // Sostituisci MAT_DIALOG_DATA con dei Signal
  readonly isOpen = signal(false);
  readonly title = signal('Confirm Action');
  readonly message = signal('Are you sure?');
  readonly confirmed = output<boolean>();

  open(title?: string, message?: string) {
    if (title) this.title.set(title);
    if (message) this.message.set(message);
    this.isOpen.set(true);
  }

  close(result: boolean) {
    this.isOpen.set(false);
    this.confirmed.emit(result);
  }
}