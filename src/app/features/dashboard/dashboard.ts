/**
 * DashboardComponent — pagina iniziale dell'applicazione.
 *
 * Mostra:
 * - Stato archivio (count customer / plant / station / camera)
 * - Stato sistema (theme, storage status, ultimo salvataggio)
 * - Empty state con CTA per creare il primo customer (disabilitato per ora)
 * - Color preview del design system (utile a vedere che i tokens sono live)
 * - Info card "stato del progetto" + "prossime fasi"
 *
 * Sarà rimpiazzato gradualmente con widget più ricchi (recent activity,
 * quick actions, statistiche per cliente) man mano che features si completano.
 */

import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { ArchiveService } from '../../core/services/archive.service';
import { ThemeService } from '../../core/services/theme.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    DatePipe,
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
  protected readonly archive = inject(ArchiveService);
  protected readonly themeService = inject(ThemeService);
}