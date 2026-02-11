import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AUTH_SERVICE } from './auth/auth-service.token';
import { MockAuthService } from './auth/mock-auth.service';
import { VAULT_STORAGE } from './storage/vault-storage.token';
import { VaultStorage } from './storage/vault-storage.interface';
import { VaultService } from './vault.service';
import { PersistedVaultEnvelope } from '../shared/models/vault-persistence.model';

class InMemoryVaultStorage implements VaultStorage {
  private readonly data = new Map<string, PersistedVaultEnvelope>();

  async loadEnvelope(userId: string): Promise<PersistedVaultEnvelope | null> {
    return this.data.get(userId) ?? null;
  }

  async saveEnvelope(userId: string, envelope: PersistedVaultEnvelope): Promise<void> {
    this.data.set(userId, envelope);
  }

  async clearUserData(userId: string): Promise<void> {
    this.data.delete(userId);
  }
}

describe('VaultService', () => {
  let service: VaultService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        VaultService,
        { provide: AUTH_SERVICE, useClass: MockAuthService },
        { provide: VAULT_STORAGE, useClass: InMemoryVaultStorage }
      ]
    }).compileComponents();

    service = TestBed.inject(VaultService);
    await service.initialize();
  });

  it('sets up, locks, unlocks, and keeps encrypted entries', async () => {
    await service.setupMasterPassword('ThisIsAStrongMasterPassword123!');

    await service.createEntry({
      title: 'Gmail',
      username: 'user@gmail.com',
      password: 'pw-1',
      url: 'https://mail.google.com',
      notes: 'Personal account'
    });

    expect(service.entries().length).toBe(1);

    service.lock('manual');
    expect(service.isUnlocked()).toBeFalse();

    const unlocked = await service.unlock('ThisIsAStrongMasterPassword123!');
    expect(unlocked).toBeTrue();
    expect(service.entries().length).toBe(1);
    expect(service.entries()[0].title).toBe('Gmail');
  });

  it('rejects wrong master password', async () => {
    await service.setupMasterPassword('ThisIsAStrongMasterPassword123!');
    service.lock('manual');

    const unlocked = await service.unlock('wrong-password');

    expect(unlocked).toBeFalse();
    expect(service.isUnlocked()).toBeFalse();
  });

  it('auto-locks after inactivity timeout', async () => {
    await service.setupMasterPassword('ThisIsAStrongMasterPassword123!');
    await service.setInactivityTimeoutMs(20);

    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 40);
    });

    expect(service.isUnlocked()).toBeFalse();
    expect(service.lockReason()).toBe('timeout');
  });
});
