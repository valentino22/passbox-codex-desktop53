import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MASTER_PASSWORD_MIN_LENGTH } from '../../core/config/security.constants';
import { VaultService } from '../../core/vault.service';

@Component({
  selector: 'app-unlock',
  imports: [ReactiveFormsModule],
  templateUrl: './unlock.component.html',
  styleUrl: './unlock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnlockComponent {
  private readonly vaultService = inject(VaultService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly isSetupMode = computed(() => !this.vaultService.isConfigured());
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    masterPassword: ['', [Validators.required, Validators.minLength(MASTER_PASSWORD_MIN_LENGTH)]],
    confirmMasterPassword: ['']
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  toggleConfirmVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  async submit(): Promise<void> {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const masterPassword = this.form.controls.masterPassword.value;

    if (this.isSetupMode()) {
      const confirmValue = this.form.controls.confirmMasterPassword.value;
      if (masterPassword !== confirmValue) {
        this.errorMessage.set('Master password confirmation does not match.');
        return;
      }
    }

    this.isSubmitting.set(true);

    try {
      if (this.isSetupMode()) {
        await this.vaultService.setupMasterPassword(masterPassword);
      } else {
        const unlocked = await this.vaultService.unlock(masterPassword);
        if (!unlocked) {
          this.errorMessage.set('Incorrect master password.');
          return;
        }
      }

      this.form.reset({ masterPassword: '', confirmMasterPassword: '' });
      await this.router.navigateByUrl('/vault');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
