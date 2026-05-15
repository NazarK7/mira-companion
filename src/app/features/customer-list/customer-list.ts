import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ArchiveDataService } from '../../core/services/archive-data.service';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './customer-list.html',
})
export class CustomerListComponent {
  private readonly archive = inject(ArchiveDataService);

  readonly query = signal('');
  readonly all = this.archive.customers;

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.all();
    return this.all().filter(c =>
      [c.name, c.shortName, c.slug, c.notes ?? '']
        .filter(Boolean)
        .some(s => s!.toLowerCase().includes(q)),
    );
  });

  onSearch(ev: Event) {
    this.query.set((ev.target as HTMLInputElement).value);
  }

  stationsCount(customerId: string) {
    const c = this.all().find(x => x.id === customerId);
    return c ? c.plants.reduce((acc, p) => acc + p.stations.length, 0) : 0;
  }

  camerasCount(customerId: string) {
    const c = this.all().find(x => x.id === customerId);
    return c
      ? c.plants.reduce(
        (acc, p) => acc + p.stations.reduce((a, s) => a + s.cameras.length, 0),
        0,
      )
      : 0;
  }
}