import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { RouterLink } from '@angular/router';

import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent {
  protected readonly themeService = inject(ThemeService);

  // Questi signal sostituiranno l'ArchiveDataService.
  // Nel prossimo step li popoleremo tramite un nuovo DashboardService / HttpClient.
  readonly isLoading = signal(false);
  readonly countCustomers = signal(0);
  readonly countPlants = signal(0);
  readonly countStations = signal(0);
  readonly countCameras = signal(0);
}