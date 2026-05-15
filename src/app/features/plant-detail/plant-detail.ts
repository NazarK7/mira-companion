import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ArchiveDataService } from '../../core/services/archive-data.service';

@Component({
  selector: 'app-plant-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="mx-auto max-w-7xl px-6 py-8">
      <nav class="mb-4 text-sm text-[var(--text-tertiary)]" aria-label="Breadcrumb">
        <a routerLink="/customers" class="hover:text-[var(--color-primary-600)]">Customers</a>
        <span class="mx-2">/</span>
        @if (customer(); as c) {
          
          <a  [routerLink]="['/customers', c.slug]"
            class="hover:text-[var(--color-primary-600)]"
          >
            {{ c.name }}
          </a>
          <span class="mx-2">/</span>
        }
        <span class="text-[var(--text-primary)]">{{ plant()?.name ?? '—' }}</span>
      </nav>

      @if (plant(); as p) {
        <header class="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 class="text-3xl font-semibold text-[var(--text-primary)]">{{ p.name }}</h1>
            @if (p.location) {
              <p class="mt-1 text-sm text-[var(--text-secondary)]">
                <mat-icon class="!text-base !w-4 !h-4 align-middle">place</mat-icon>
                {{ p.location }}
              </p>
            }
            @if (p.address) {
              <p class="text-xs text-[var(--text-tertiary)]">{{ p.address }}</p>
            }
            @if (p.notes) {
              <p class="mt-3 max-w-2xl text-sm text-[var(--text-secondary)]">{{ p.notes }}</p>
            }
          </div>
          <button mat-stroked-button>
            <mat-icon>edit</mat-icon>
            Edit
          </button>
        </header>

        <!-- Stations -->
        <div class="mb-10">
          <div class="mb-4 flex items-end justify-between">
            <h2 class="text-xl font-semibold text-[var(--text-primary)]">Stations</h2>
            
            <a  mat-flat-button
              [routerLink]="['/customers', customer()!.slug, 'plants', p.id, 'stations', 'new']"
              class="!bg-[var(--color-primary-600)]"
            >
              <mat-icon>add</mat-icon>
              New Station
            </a>
          </div>

          @if (p.stations.length === 0) {
            <div
              class="rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)] p-8 text-center text-sm text-[var(--text-secondary)]"
            >
              No stations registered in this plant yet.
            </div>
          } @else {
            <ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" role="list">
              @for (s of p.stations; track s.id) {
                <li>
                  
                  <a  [routerLink]="['/customers', customer()!.slug, 'plants', p.id, 'stations', s.id]"
                    class="block h-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] transition hover:border-[var(--color-primary-500)] hover:shadow-[var(--shadow-md)]"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        @if (s.code) {
                          <p
                            class="font-mono text-xs text-[var(--text-tertiary)]"
                          >
                            {{ s.code }}
                          </p>
                        }
                        <h3
                          class="truncate text-base font-semibold text-[var(--text-primary)]"
                        >
                          {{ s.name }}
                        </h3>
                        @if (s.line) {
                          <p class="text-xs text-[var(--text-tertiary)]">{{ s.line }}</p>
                        }
                      </div>
                      @if (s.status) {
                        <span
                          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          [class]="statusBadgeClass(s.status)"
                        >
                          {{ s.status }}
                        </span>
                      }
                    </div>

                    <div class="mt-4 flex items-center gap-2 text-sm">
                      <mat-icon class="!text-base !w-4 !h-4 text-[var(--text-tertiary)]">
                        videocam
                      </mat-icon>
                      <span class="text-[var(--text-secondary)]">
                        {{ s.cameras.length }} camera{{ s.cameras.length === 1 ? '' : 's' }}
                      </span>
                    </div>
                  </a>
                </li>
              }
            </ul>
          }
        </div>

        <!-- Contacts -->
        @if (p.contacts.length) {
          <div>
            <h2 class="mb-4 text-xl font-semibold text-[var(--text-primary)]">
              Plant Contacts
              <span class="ml-2 text-sm font-normal text-[var(--text-tertiary)]">
                ({{ p.contacts.length }})
              </span>
            </h2>
            <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3" role="list">
              @for (ct of p.contacts; track ct.id) {
                <li class="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                  <p class="font-medium text-[var(--text-primary)]">{{ ct.name }}</p>
                  @if (ct.role) {
                    <p class="text-xs text-[var(--text-tertiary)]">{{ ct.role }}</p>
                  }
                  @if (ct.email) {
                    <p class="mt-2 truncate text-sm">
                      
                      <a  [href]="'mailto:' + ct.email"
                        class="text-[var(--color-primary-600)] hover:underline"
                      >
                        {{ ct.email }}
                      </a>
                    </p>
                  }
                  @if (ct.phone) {
                    <p class="text-sm text-[var(--text-secondary)]">{{ ct.phone }}</p>
                  }
                </li>
              }
            </ul>
          </div>
        }
      } @else {
        <div class="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-12 text-center">
          <p class="text-base text-[var(--text-secondary)]">Plant not found.</p>
        </div>
      }
    </section>
  `,
})
export class PlantDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly archive = inject(ArchiveDataService);

  readonly params = toSignal(this.route.paramMap, { requireSync: true });

  readonly customer = computed(() => {
    const slug = this.params().get('slug');
    return slug ? this.archive.customers().find(c => c.slug === slug) ?? null : null;
  });

  readonly plant = computed(() => {
    const c = this.customer();
    const id = this.params().get('plantId');
    if (!c || !id) return null;
    return c.plants.find(p => p.id === id) ?? null;
  });

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'production':
        return 'bg-[var(--color-success-50)] text-[var(--color-success-700)]';
      case 'maintenance':
        return 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)]';
      case 'planning':
        return 'bg-[var(--color-info-50)] text-[var(--color-info-700)]';
      case 'archived':
        return 'bg-[var(--bg-strong)] text-[var(--text-tertiary)]';
      default:
        return 'bg-[var(--bg-strong)] text-[var(--text-secondary)]';
    }
  }
}