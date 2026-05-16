import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type {
  HalconLicenseRecord,
  MaintenanceCategory,
  MaintenanceEvent,
  RobotBackupRecord,
} from './../../../core/models/domain.model';
import {
  daysUntil,
  formatDate,
  formatFileSize,
  relativeTime,
} from './../../../core/utils/date-format.util';

@Component({
  selector: 'app-asset-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './asset-panel.html',
})
export class AssetPanelComponent {
  readonly licenses = input<HalconLicenseRecord[]>([]);
  readonly robotBackups = input<RobotBackupRecord[]>([]);
  readonly maintenanceEvents = input<MaintenanceEvent[]>([]);

  /** False per camere Cognex: nasconde colonne Halcon e Robot. */
  readonly showHalconAndRobot = input<boolean>(true);

  readonly sortedLicenses = computed(() =>
    [...this.licenses()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );

  readonly sortedRobotBackups = computed(() =>
    [...this.robotBackups()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );

  readonly sortedMaintenance = computed(() =>
    [...this.maintenanceEvents()].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    ),
  );

  readonly latestLicense = computed(() => this.sortedLicenses()[0] ?? null);

  licenseStatusClass(expiryDate: string | undefined): string {
    if (!expiryDate) return 'bg-[var(--bg-strong)] text-[var(--text-tertiary)]';
    const days = daysUntil(expiryDate);
    if (days < 0) return 'bg-[var(--color-danger-50)] text-[var(--color-danger-700)]';
    if (days < 30) return 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)]';
    return 'bg-[var(--color-success-50)] text-[var(--color-success-700)]';
  }

  licenseStatusLabel(expiryDate: string | undefined): string {
    if (!expiryDate) return 'no expiry';
    const days = daysUntil(expiryDate);
    if (days < 0) return `expired ${Math.abs(days)}d ago`;
    if (days === 0) return 'expires today';
    if (days < 30) return `expires in ${days}d`;
    if (days < 365) return `valid · ${days}d left`;
    return `valid · ${Math.round(days / 30)}mo left`;
  }

  maintenanceIcon(category: MaintenanceCategory): string {
    switch (category) {
      case 'installation':
        return 'build';
      case 'calibration':
        return 'center_focus_strong';
      case 'job_update':
        return 'edit_note';
      case 'license_renewal':
        return 'verified_user';
      case 'hardware_swap':
        return 'settings_input_component';
      case 'firmware_update':
        return 'memory';
      case 'troubleshooting':
        return 'bug_report';
      default:
        return 'event_note';
    }
  }

  maintenanceColor(category: MaintenanceCategory): string {
    switch (category) {
      case 'installation':
      case 'calibration':
        return 'text-[var(--color-success-700)] bg-[var(--color-success-50)]';
      case 'troubleshooting':
        return 'text-[var(--color-danger-700)] bg-[var(--color-danger-50)]';
      case 'license_renewal':
      case 'firmware_update':
        return 'text-[var(--color-accent-700)] bg-[var(--color-accent-50)]';
      default:
        return 'text-[var(--color-info-700)] bg-[var(--color-info-50)]';
    }
  }

  readonly relativeTime = relativeTime;
  readonly formatFileSize = formatFileSize;
  readonly formatDate = formatDate;
}