import { TestBed } from '@angular/core/testing';
import { IndexedDbVaultStorageService } from './indexeddb-vault-storage.service';
import { PersistedVaultEnvelope } from '../../shared/models/vault-persistence.model';

describe('IndexedDbVaultStorageService', () => {
  let service: IndexedDbVaultStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IndexedDbVaultStorageService]
    });
    service = TestBed.inject(IndexedDbVaultStorageService);
  });

  it('saves and loads an envelope', async () => {
    const userId = `spec-user-${Date.now()}`;
    const envelope: PersistedVaultEnvelope = {
      master: {
        kdf: {
          algorithm: 'PBKDF2',
          hash: 'SHA-256',
          iterations: 310000,
          saltB64: 'c2FsdA=='
        },
        validator: {
          ivB64: 'aXY=',
          cipherTextB64: 'Y2lwaGVy'
        }
      },
      vault: null,
      config: {
        inactivityTimeoutMs: 1000
      }
    };

    await service.saveEnvelope(userId, envelope);
    const loaded = await service.loadEnvelope(userId);

    expect(loaded).toEqual(envelope);

    await service.clearUserData(userId);
    const afterClear = await service.loadEnvelope(userId);
    expect(afterClear).toBeNull();
  });
});
