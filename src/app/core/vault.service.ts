import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subscription, timer } from 'rxjs';
import { AUTH_SERVICE } from './auth/auth-service.token';
import { AuthService } from './auth/auth.service.interface';
import { DEFAULT_VAULT_CONFIG, PASSBOX_SCHEMA_VERSION } from './config/security.constants';
import { CryptoService } from './crypto/crypto.service';
import { VAULT_STORAGE } from './storage/vault-storage.token';
import { VaultStorage } from './storage/vault-storage.interface';
import { VaultConfig } from '../shared/models/vault-config.model';
import { VaultEntry, VaultEntryInput } from '../shared/models/vault-entry.model';
import {
  EncryptedVaultRecord,
  PersistedVaultEnvelope,
  VaultPlaintextPayload
} from '../shared/models/vault-persistence.model';

@Injectable({ providedIn: 'root' })
export class VaultService {
  private readonly cryptoService = inject(CryptoService);
  private readonly storage = inject<VaultStorage>(VAULT_STORAGE);
  private readonly authService = inject<AuthService>(AUTH_SERVICE);
  private readonly router = inject(Router);

  private readonly configuredSignal = signal(false);
  private readonly unlockedSignal = signal(false);
  private readonly entriesSignal = signal<VaultEntry[]>([]);
  private readonly configSignal = signal<VaultConfig>(DEFAULT_VAULT_CONFIG);
  private readonly lockReasonSignal = signal<'manual' | 'timeout' | null>(null);

  private envelope: PersistedVaultEnvelope | null = null;
  private sessionKey: CryptoKey | null = null;
  private activitySubscription?: Subscription;
  private inactivityTimerSubscription?: Subscription;

  readonly isConfigured: Signal<boolean> = this.configuredSignal.asReadonly();
  readonly isUnlocked: Signal<boolean> = this.unlockedSignal.asReadonly();
  readonly entries: Signal<VaultEntry[]> = computed(() => this.entriesSignal());
  readonly config: Signal<VaultConfig> = this.configSignal.asReadonly();
  readonly lockReason: Signal<'manual' | 'timeout' | null> = this.lockReasonSignal.asReadonly();

  async initialize(): Promise<void> {
    const user = this.authService.requireUser();
    const envelope = await this.storage.loadEnvelope(user.id);
    this.envelope = envelope;
    this.configuredSignal.set(Boolean(envelope));
    this.configSignal.set(envelope?.config ?? DEFAULT_VAULT_CONFIG);
    this.unlockedSignal.set(false);
    this.entriesSignal.set([]);
    this.lockReasonSignal.set(null);
  }

  async setupMasterPassword(masterPassword: string): Promise<void> {
    const user = this.authService.requireUser();
    const masterRecord = await this.cryptoService.createMasterPasswordRecord(masterPassword);

    this.envelope = {
      master: masterRecord,
      vault: null,
      config: this.configSignal()
    };

    await this.storage.saveEnvelope(user.id, this.envelope);
    this.configuredSignal.set(true);
    await this.unlock(masterPassword);
  }

  async unlock(masterPassword: string): Promise<boolean> {
    if (!this.envelope) {
      await this.initialize();
    }

    if (!this.envelope) {
      return false;
    }

    const key = await this.cryptoService.verifyMasterPassword(masterPassword, this.envelope.master);
    if (!key) {
      return false;
    }

    this.sessionKey = key;

    if (this.envelope.vault) {
      const payload = await this.cryptoService.decryptVaultPayload(this.envelope.vault, key);
      this.entriesSignal.set(payload.entries);
    } else {
      this.entriesSignal.set([]);
    }

    this.unlockedSignal.set(true);
    this.lockReasonSignal.set(null);
    this.startInactivityLock();
    return true;
  }

  lock(reason: 'manual' | 'timeout' = 'manual'): void {
    this.sessionKey = null;
    this.unlockedSignal.set(false);
    this.entriesSignal.set([]);
    this.lockReasonSignal.set(reason);
    this.stopInactivityLock();

    void this.router.navigateByUrl('/unlock');
  }

  async setInactivityTimeoutMs(timeoutMs: number): Promise<void> {
    const nextConfig: VaultConfig = {
      inactivityTimeoutMs: timeoutMs
    };

    this.configSignal.set(nextConfig);

    if (this.envelope) {
      this.envelope = { ...this.envelope, config: nextConfig };
      await this.storage.saveEnvelope(this.authService.requireUser().id, this.envelope);
    }

    if (this.unlockedSignal()) {
      this.bumpInactivityTimer();
    }
  }

  getEntryById(id: string): VaultEntry | undefined {
    return this.entriesSignal().find((entry) => entry.id === id);
  }

  async createEntry(input: VaultEntryInput): Promise<void> {
    this.requireSessionKey();

    const now = new Date().toISOString();
    const nextEntry: VaultEntry = {
      id: crypto.randomUUID(),
      title: input.title,
      username: input.username,
      password: input.password,
      url: input.url,
      notes: input.notes,
      createdAt: now,
      updatedAt: now
    };

    this.entriesSignal.update((entries) => [nextEntry, ...entries]);
    await this.persistVault();
  }

  async updateEntry(id: string, input: VaultEntryInput): Promise<void> {
    this.requireSessionKey();

    this.entriesSignal.update((entries) =>
      entries.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              title: input.title,
              username: input.username,
              password: input.password,
              url: input.url,
              notes: input.notes,
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    );

    await this.persistVault();
  }

  async deleteEntry(id: string): Promise<void> {
    this.requireSessionKey();
    this.entriesSignal.update((entries) => entries.filter((entry) => entry.id !== id));
    await this.persistVault();
  }

  async clearAllData(): Promise<void> {
    const user = this.authService.requireUser();
    await this.storage.clearUserData(user.id);

    this.envelope = null;
    this.sessionKey = null;
    this.configuredSignal.set(false);
    this.unlockedSignal.set(false);
    this.entriesSignal.set([]);
    this.configSignal.set(DEFAULT_VAULT_CONFIG);
    this.lockReasonSignal.set(null);
    this.stopInactivityLock();

    await this.router.navigateByUrl('/unlock');
  }

  private requireSessionKey(): CryptoKey {
    if (!this.unlockedSignal() || !this.sessionKey) {
      throw new Error('Vault is locked.');
    }
    return this.sessionKey;
  }

  private async persistVault(): Promise<void> {
    const sessionKey = this.requireSessionKey();

    if (!this.envelope) {
      throw new Error('Vault has not been initialized.');
    }

    const payload: VaultPlaintextPayload = {
      entries: this.entriesSignal()
    };

    const encrypted = await this.cryptoService.encryptVaultPayload(payload, sessionKey);
    const vaultRecord: EncryptedVaultRecord = {
      ...encrypted,
      version: PASSBOX_SCHEMA_VERSION,
      userId: this.authService.requireUser().id,
      updatedAt: new Date().toISOString()
    };

    this.envelope = {
      ...this.envelope,
      vault: vaultRecord,
      config: this.configSignal()
    };

    await this.storage.saveEnvelope(this.authService.requireUser().id, this.envelope);
    this.bumpInactivityTimer();
  }

  private startInactivityLock(): void {
    this.stopInactivityLock();

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    this.activitySubscription = merge(...events.map((eventName) => fromEvent(document, eventName))).subscribe(() => {
      this.bumpInactivityTimer();
    });

    this.bumpInactivityTimer();
  }

  private stopInactivityLock(): void {
    this.activitySubscription?.unsubscribe();
    this.activitySubscription = undefined;

    this.inactivityTimerSubscription?.unsubscribe();
    this.inactivityTimerSubscription = undefined;
  }

  private bumpInactivityTimer(): void {
    this.inactivityTimerSubscription?.unsubscribe();
    this.inactivityTimerSubscription = timer(this.configSignal().inactivityTimeoutMs).subscribe(() => {
      this.lock('timeout');
    });
  }
}
