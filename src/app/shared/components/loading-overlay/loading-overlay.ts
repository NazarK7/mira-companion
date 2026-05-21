// src/app/shared/components/loading-overlay/loading-overlay.ts
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (active()) {
      <div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/40 backdrop-blur-md transition-all duration-500">
        <div class="relative flex h-20 w-20 items-center justify-center">
          <div class="absolute h-full w-full animate-spin rounded-full border-b-2 border-t-2 border-[var(--color-primary-500)]"></div>
          <div class="absolute h-12 w-12 animate-ping rounded-full bg-[var(--color-primary-500)]/20"></div>
          <mat-icon class="text-[var(--color-primary-500)] scale-125">sync</mat-icon>
        </div>
        
        <div class="mt-4 flex flex-col items-center">
          <span class="text-[10px] font-black uppercase tracking-[0.3em] text-white">System Processing</span>
          <span class="mt-1 h-0.5 w-8 bg-[var(--color-primary-500)] animate-pulse"></span>
        </div>
      </div>
    }
  `,
  host: { 'class': 'contents' }
})
export class LoadingOverlayComponent {
  active = input.required<boolean>();
}