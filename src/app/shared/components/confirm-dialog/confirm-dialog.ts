// src/app/core/components/confirm-dialog/confirm-dialog.ts
import { Component, ElementRef, viewChild, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from '../../services/i18n.service';
import { AppButtonComponent } from '../button/button.component';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButtonComponent],
  template: `
      <dialog 
        #dialogElement
        class="fixed inset-0 m-auto rounded-2xl border border-border-subtle bg-bg-surface p-0 shadow-2xl backdrop:bg-zinc-950/40 backdrop:backdrop-blur-sm open:flex open:flex-col max-w-md w-[calc(100%-2rem)] focus:outline-none"
        (cancel)="onCancel()">
      <div class="p-6">
        <h2 class="text-xl font-bold text-text-primary">{{ options().title }}</h2>
        <p class="mt-3 text-text-secondary whitespace-pre-wrap leading-relaxed">
          {{ options().message }}
        </p>
      </div>

      <div class="flex justify-end gap-3 bg-bg-subtle px-6 py-4">
        <app-button variant="ghost" (clicked)="onCancel()">
          {{ options().cancelText || i18n.t().common.cancel }}
        </app-button>
        <app-button 
          [variant]="options().isDestructive ? 'danger' : 'primary'" 
          (clicked)="onConfirm()"
        >
          {{ options().confirmText || i18n.t().common.confirm }}
        </app-button>
      </div>
    </dialog>
  `,
  host: { 'class': 'contents' }
})
export class ConfirmDialogComponent {
  protected readonly i18n = inject(I18nService);
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialogElement');

  options = signal<ConfirmOptions>({ title: '', message: '' });
  private resolveFn?: (value: boolean) => void;

  /**
   * Firma corretta: Accetta ConfirmOptions e ritorna Promise<boolean>
   */
  open(options: ConfirmOptions): Promise<boolean> {
    this.options.set(options);
    this.dialogRef().nativeElement.showModal();
    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  protected onConfirm() {
    this.close(true);
  }

  protected onCancel() {
    this.close(false);
  }

  private close(result: boolean) {
    this.dialogRef().nativeElement.close();
    this.resolveFn?.(result);
  }
}