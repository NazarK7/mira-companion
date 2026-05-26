// src/app/core/components/toast-container/toast-container.component.ts
import { Component, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [],
  template: `
    <div class="fixed top-4 right-4 z-[var(--z-toast)] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      @for (note of notify.queue(); track note.id) {
        <div 
          class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl bg-bg-surface animate-in slide-in-from-right-full duration-300"
          [class]="typeClasses[note.type]"
          role="alert"
        >
          <div class="shrink-0">
          @switch (note.type) {
          @case ('success') { <span class="material-symbols-outlined text-success-500 text-2xl">check_circle</span> }
          @case ('error') { <span class="material-symbols-outlined text-danger-500 text-2xl">error</span> }
          @case ('warning') { <span class="material-symbols-outlined text-warning-500 text-2xl">warning</span> }
          @default { <span class="material-symbols-outlined text-info-500 text-2xl">info</span> }
          }
          </div>

          <div class="flex-1">
            <p class="text-sm font-medium text-text-primary">{{ note.message }}</p>
          </div>

          <button 
            (click)="notify.remove(note.id)"
            class="shrink-0 text-text-tertiary hover:text-text-primary transition-colors"
            [aria-label]="i18n.t().common.close"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  host: { 'class': 'contents' }
})
export class ToastContainerComponent {
  protected readonly notify = inject(NotificationService);
  protected readonly i18n = inject(I18nService);

  protected readonly typeClasses: Record<string, string> = {
    success: 'border-success-500/30 bg-success-50/10 dark:bg-success-900/20',
    error: 'border-danger-500/30 bg-danger-50/10 dark:bg-danger-900/20',
    warning: 'border-warning-500/30 bg-warning-50/10 dark:bg-warning-900/20',
    info: 'border-info-500/30 bg-info-50/10 dark:bg-info-900/20'
  };
}