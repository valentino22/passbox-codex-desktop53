import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { VaultService } from '../../core/vault.service';
import { VaultEntryInput } from '../../shared/models/vault-entry.model';

@Component({
  selector: 'app-vault-entry',
  imports: [ReactiveFormsModule],
  templateUrl: './vault-entry.component.html',
  styleUrl: './vault-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VaultEntryComponent {
  private readonly vaultService = inject(VaultService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly showPassword = signal(false);
  readonly errorMessage = signal('');

  private readonly entryId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: this.route.snapshot.paramMap.get('id') }
  );

  readonly isCreateMode = computed(() => !this.entryId());

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    username: ['', [Validators.required, Validators.maxLength(200)]],
    password: ['', [Validators.required]],
    url: ['', [Validators.maxLength(300)]],
    notes: ['', [Validators.maxLength(1500)]]
  });

  constructor() {
    effect(() => {
      const entryId = this.entryId();
      if (!entryId) {
        this.form.reset({ title: '', username: '', password: '', url: '', notes: '' });
        this.errorMessage.set('');
        return;
      }

      const entry = this.vaultService.getEntryById(entryId);
      if (!entry) {
        this.errorMessage.set('Entry not found.');
        return;
      }

      this.form.reset({
        title: entry.title,
        username: entry.username,
        password: entry.password,
        url: entry.url ?? '',
        notes: entry.notes ?? ''
      });
      this.errorMessage.set('');
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  async save(): Promise<void> {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const input: VaultEntryInput = {
      title: value.title.trim(),
      username: value.username.trim(),
      password: value.password,
      url: value.url.trim() || undefined,
      notes: value.notes.trim() || undefined
    };

    if (this.isCreateMode()) {
      await this.vaultService.createEntry(input);
    } else {
      const id = this.entryId();
      if (!id) {
        this.errorMessage.set('Could not determine entry id.');
        return;
      }
      await this.vaultService.updateEntry(id, input);
    }

    await this.router.navigateByUrl('/vault');
  }

  async deleteCurrent(): Promise<void> {
    const id = this.entryId();
    if (!id) {
      return;
    }

    const confirmed = confirm('Delete this entry permanently?');
    if (!confirmed) {
      return;
    }

    await this.vaultService.deleteEntry(id);
    await this.router.navigateByUrl('/vault');
  }

  cancel(): Promise<boolean> {
    return this.router.navigateByUrl('/vault');
  }
}
