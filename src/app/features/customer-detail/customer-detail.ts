import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ArchiveDataService } from '../../core/services/archive-data.service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
templateUrl: './customer-detail.html',
})
export class CustomerDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly archive = inject(ArchiveDataService);

  // Param "slug" from route. Empty string if creating new.
  readonly slug = toSignal(this.route.paramMap, { requireSync: true });

  readonly customer = computed(() => {
    const s = this.slug().get('slug');
    if (!s) return null;
    return this.archive.customers().find(c => c.slug === s) ?? null;
  });
}