import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/theme.service';

type PasswordHistoryEntry = {
  id: string;
  password: string;
  createdAt: string;
};

@Component({
  selector: 'app-password-generator',
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './password-generator.component.html',
  styleUrl: './password-generator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PasswordGeneratorComponent {
  private readonly themeService = inject(ThemeService);

  readonly length = signal(16);
  readonly includeUppercase = signal(true);
  readonly includeLowercase = signal(true);
  readonly includeNumbers = signal(true);
  readonly includeSpecial = signal(true);
  readonly avoidAmbiguous = signal(false);
  readonly generatedPassword = signal('');
  readonly copied = signal(false);
  readonly isRolling = signal(false);
  readonly isDarkTheme = this.themeService.isDark;
  readonly history = signal<PasswordHistoryEntry[]>([]);

  readonly strength = computed(() => this.evaluateStrength(this.generatedPassword()));
  readonly passwordSegments = computed(() => {
    const password = this.generatedPassword();
    return Array.from(password).map((char) => ({
      value: char,
      type: this.characterType(char)
    }));
  });

  constructor() {
    this.loadHistory();
    this.rollPassword();
  }

  async copyPassword(): Promise<void> {
    const password = this.generatedPassword();
    if (!password) {
      return;
    }

    await this.copyText(password);

    this.copied.set(true);
    window.setTimeout(() => this.copied.set(false), 1200);
  }

  updateLength(next: number): void {
    const safe = Number.isFinite(next) ? Math.min(32, Math.max(8, Math.round(next))) : 16;
    this.length.set(safe);
    this.rollPassword();
  }

  setGeneratedPassword(value: string): void {
    this.generatedPassword.set(value ?? '');
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setIncludeUppercase(value: boolean): void {
    this.includeUppercase.set(value);
    this.ensureMinimumCharacterSet();
    this.rollPassword();
  }

  setIncludeLowercase(value: boolean): void {
    this.includeLowercase.set(value);
    this.ensureMinimumCharacterSet();
    this.rollPassword();
  }

  setIncludeNumbers(value: boolean): void {
    this.includeNumbers.set(value);
    this.ensureMinimumCharacterSet();
    this.rollPassword();
  }

  setIncludeSpecial(value: boolean): void {
    this.includeSpecial.set(value);
    this.ensureMinimumCharacterSet();
    this.rollPassword();
  }

  setAvoidAmbiguous(value: boolean): void {
    this.avoidAmbiguous.set(value);
    this.rollPassword();
  }

  rollPassword(): void {
    this.isRolling.set(true);
    window.setTimeout(() => this.isRolling.set(false), 820);

    const length = this.length();
    const uppercase = this.stripAmbiguous('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    const lowercase = this.stripAmbiguous('abcdefghijklmnopqrstuvwxyz');
    const numbers = this.stripAmbiguous('0123456789');
    const special = this.stripAmbiguous('!@#$%^&*()-_=+[]{};:,.?');

    const sets: string[] = [];
    if (this.includeUppercase()) {
      sets.push(uppercase);
    }
    if (this.includeLowercase()) {
      sets.push(lowercase);
    }
    if (this.includeNumbers()) {
      sets.push(numbers);
    }
    if (this.includeSpecial()) {
      sets.push(special);
    }

    const pool = sets.join('');
    if (!pool.length) {
      this.generatedPassword.set('');
      return;
    }

    const required = sets.map((set) => this.randomCharFrom(set));
    const remainingCount = Math.max(length - required.length, 0);
    const remaining = Array.from({ length: remainingCount }, () => this.randomCharFrom(pool));
    const password = this.shuffle([...required, ...remaining]).join('');
    this.generatedPassword.set(password);
    this.pushHistory(password);
  }

  async copyHistoryPassword(entry: PasswordHistoryEntry): Promise<void> {
    await this.copyText(entry.password);
    this.copied.set(true);
    window.setTimeout(() => this.copied.set(false), 1200);
  }

  historyTimestamp(value: string): string {
    return new Date(value).toLocaleString();
  }

  private ensureMinimumCharacterSet(): void {
    if (this.includeUppercase() || this.includeLowercase() || this.includeNumbers() || this.includeSpecial()) {
      return;
    }
    this.includeLowercase.set(true);
  }

  private randomCharFrom(set: string): string {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    return set[random[0] % set.length];
  }

  private shuffle(chars: string[]): string[] {
    const result = [...chars];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const random = new Uint32Array(1);
      crypto.getRandomValues(random);
      const swapIndex = random[0] % (index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  private evaluateStrength(password: string): { label: string; score: number } {
    let score = 0;

    if (password.length >= 12) {
      score += 25;
    }
    if (password.length >= 16) {
      score += 20;
    }
    if (/[A-Z]/.test(password)) {
      score += 15;
    }
    if (/[a-z]/.test(password)) {
      score += 15;
    }
    if (/\d/.test(password)) {
      score += 15;
    }
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 10;
    }

    if (score >= 85) {
      return { label: 'Very Strong', score };
    }
    if (score >= 65) {
      return { label: 'Strong', score };
    }
    if (score >= 45) {
      return { label: 'Good', score };
    }
    return { label: 'Weak', score };
  }

  private characterType(char: string): 'letter' | 'digit' | 'special' {
    if (/[A-Za-z]/.test(char)) {
      return 'letter';
    }
    if (/\d/.test(char)) {
      return 'digit';
    }
    return 'special';
  }

  private stripAmbiguous(set: string): string {
    if (!this.avoidAmbiguous()) {
      return set;
    }
    const ambiguous = new Set(['I', 'l', '1', 'O', '0']);
    return Array.from(set)
      .filter((char) => !ambiguous.has(char))
      .join('');
  }

  private pushHistory(password: string): void {
    if (!password) {
      return;
    }

    const next: PasswordHistoryEntry = {
      id: crypto.randomUUID(),
      password,
      createdAt: new Date().toISOString()
    };

    this.history.update((items) => {
      const updated = [next, ...items].slice(0, 100);
      localStorage.setItem('passbox-generator-history', JSON.stringify(updated));
      return updated;
    });
  }

  private loadHistory(): void {
    const raw = localStorage.getItem('passbox-generator-history');
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PasswordHistoryEntry[];
      if (Array.isArray(parsed)) {
        this.history.set(parsed);
      }
    } catch {
      localStorage.removeItem('passbox-generator-history');
    }
  }

  private async copyText(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const fallback = document.createElement('textarea');
    fallback.value = value;
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.appendChild(fallback);
    fallback.focus();
    fallback.select();
    document.execCommand('copy');
    document.body.removeChild(fallback);
  }
}
