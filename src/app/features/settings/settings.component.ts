import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { VaultService } from '../../core/vault.service';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly vaultService = inject(VaultService);
  private readonly themeService = inject(ThemeService);
  private readonly fb = inject(FormBuilder);

  readonly timeoutMinutes = computed(() => this.vaultService.config().inactivityTimeoutMs / 60000);
  readonly isDarkTheme = this.themeService.isDark;

  readonly timeoutForm = this.fb.nonNullable.group({
    minutes: [this.timeoutMinutes(), [Validators.required, Validators.min(1), Validators.max(120)]]
  });

  readonly clearForm = this.fb.nonNullable.group({
    confirmation: ['', [Validators.required]]
  });

  async saveTimeout(): Promise<void> {
    if (this.timeoutForm.invalid) {
      this.timeoutForm.markAllAsTouched();
      return;
    }

    const minutes = this.timeoutForm.controls.minutes.value;
    await this.vaultService.setInactivityTimeoutMs(minutes * 60 * 1000);
  }

  lockNow(): void {
    this.vaultService.lock('manual');
  }

  async clearAllData(): Promise<void> {
    const text = this.clearForm.controls.confirmation.value.trim();
    if (text !== 'DELETE') {
      return;
    }

    await this.vaultService.clearAllData();
  }

  toggleDarkMode(): void {
    this.themeService.toggleTheme();
  }
}
