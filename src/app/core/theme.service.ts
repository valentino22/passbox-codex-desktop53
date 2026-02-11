import { Injectable, computed, signal } from '@angular/core';

type ThemeMode = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeMode = signal<ThemeMode>('dark');
  readonly isDark = computed(() => this.themeMode() === 'dark');

  initialize(): void {
    const saved = this.readSavedTheme();
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = saved ?? (systemPrefersDark ? 'dark' : 'light');
    this.applyTheme(mode);
  }

  toggleTheme(): void {
    this.applyTheme(this.isDark() ? 'light' : 'dark');
  }

  private applyTheme(mode: ThemeMode): void {
    this.themeMode.set(mode);
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('passbox-theme', mode);
  }

  private readSavedTheme(): ThemeMode | null {
    const saved = localStorage.getItem('passbox-theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return null;
  }
}
