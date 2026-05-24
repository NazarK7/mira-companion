// src/app/core/components/loading-overlay/loading-overlay.component.ts
import { Component, inject } from '@angular/core';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  template: `
    @if (loading.isLoading()) {
      <div class="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center bg-zinc-950/60 backdrop-blur-sm transition-all animate-in fade-in duration-300">
        <div class="relative flex h-24 w-24 items-center justify-center">
          <div class="absolute h-full w-full animate-spin rounded-full border-b-2 border-t-2 border-primary-500"></div>
          <div class="absolute h-14 w-14 animate-ping rounded-full bg-primary-500/10"></div>
          <span class="font-mono text-xs font-bold text-primary-500 animate-pulse">MiRa</span>
        </div>
        
        <div class="mt-6 flex flex-col items-center">
          <span class="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">System Processing</span>
          <span class="mt-2 h-0.5 w-12 bg-primary-600 animate-bounce"></span>
        </div>
      </div>
    }
  `,
  host: { 'class': 'contents' }
})
export class LoadingOverlayComponent {
  protected readonly loading = inject(LoadingService);
}