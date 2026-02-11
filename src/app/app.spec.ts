import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AUTH_SERVICE } from './core/auth/auth-service.token';
import { MockAuthService } from './core/auth/mock-auth.service';
import { VAULT_STORAGE } from './core/storage/vault-storage.token';
import { VaultStorage } from './core/storage/vault-storage.interface';
import { PersistedVaultEnvelope } from './shared/models/vault-persistence.model';

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

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AUTH_SERVICE, useClass: MockAuthService },
        { provide: VAULT_STORAGE, useClass: InMemoryVaultStorage }
      ]
    }).compileComponents();
  });

  it('creates the app shell', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
