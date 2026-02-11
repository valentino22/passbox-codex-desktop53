import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { VaultService } from '../../core/vault.service';
import { VaultEntry } from '../../shared/models/vault-entry.model';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-vault-list',
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './vault-list.component.html',
  styleUrl: './vault-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VaultListComponent {
  private readonly vaultService = inject(VaultService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly copiedPasswordEntryId = signal<string | null>(null);
  readonly copiedUsernameEntryId = signal<string | null>(null);
  readonly isDarkTheme = this.themeService.isDark;
  readonly iconByCategory = [
    { keywords: ['google', 'gmail', 'mail'], icon: 'mail' },
    { keywords: ['facebook', 'instagram', 'reddit', 'x', 'twitter', 'social'], icon: 'forum' },
    { keywords: ['amazon', 'shop', 'store', 'cart'], icon: 'shopping_bag' },
    { keywords: ['netflix', 'hulu', 'video', 'movie'], icon: 'movie' },
    { keywords: ['bank', 'card', 'finance'], icon: 'account_balance' },
    { keywords: ['linkedin', 'work', 'office'], icon: 'work' }
  ] as const;
  readonly cardBackgrounds = [
    'linear-gradient(140deg, #ff6b6b, #f84f8a)',
    'linear-gradient(140deg, #4ecdc4, #00a9d4)',
    'linear-gradient(140deg, #45b7d1, #1173d4)',
    'linear-gradient(140deg, #ffa07a, #f97316)',
    'linear-gradient(140deg, #9b5de5, #6d28d9)',
    'linear-gradient(140deg, #f15bb5, #be185d)'
  ] as const;

  private readonly searchValue = toSignal(
    this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)),
    { initialValue: this.searchControl.value }
  );

  readonly entries = this.vaultService.entries;
  readonly filteredEntries = computed(() => {
    const search = this.searchValue().trim().toLowerCase();
    const entries = this.entries();

    if (!search) {
      return entries;
    }

    return entries.filter((entry) => {
      const haystack = `${entry.title} ${entry.username}`.toLowerCase();
      return haystack.includes(search);
    });
  });

  cardBackground(index: number): string {
    return this.cardBackgrounds[index % this.cardBackgrounds.length];
  }

  iconForEntry(entry: VaultEntry): string {
    const title = entry.title.toLowerCase();
    const matching = this.iconByCategory.find(({ keywords }) => keywords.some((keyword) => title.includes(keyword)));
    return matching?.icon ?? 'key';
  }

  async copyPassword(entry: VaultEntry, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    await this.copyText(entry.password);
    this.copiedPasswordEntryId.set(entry.id);
    window.setTimeout(() => this.copiedPasswordEntryId.set(null), 1400);
  }

  async copyUsername(entry: VaultEntry, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    await this.copyText(entry.username);
    this.copiedUsernameEntryId.set(entry.id);
    window.setTimeout(() => this.copiedUsernameEntryId.set(null), 1400);
  }

  async removeEntry(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    const confirmed = confirm('Delete this entry? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    await this.vaultService.deleteEntry(id);
  }

  openEntry(id: string): Promise<boolean> {
    return this.router.navigate(['/vault', id]);
  }

  toggleTheme(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.themeService.toggleTheme();
  }

  private async copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.appendChild(fallback);
    fallback.focus();
    fallback.select();
    document.execCommand('copy');
    document.body.removeChild(fallback);
  }
}
