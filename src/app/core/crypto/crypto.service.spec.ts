import { TestBed } from '@angular/core/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoService);
  });

  it('creates and verifies a master password record', async () => {
    const record = await service.createMasterPasswordRecord('ThisIsAStrongMasterPassword123!');

    const key = await service.verifyMasterPassword('ThisIsAStrongMasterPassword123!', record);

    expect(key).not.toBeNull();
  });

  it('fails verification with an invalid password', async () => {
    const record = await service.createMasterPasswordRecord('ThisIsAStrongMasterPassword123!');

    const key = await service.verifyMasterPassword('wrong-password', record);

    expect(key).toBeNull();
  });

  it('encrypts and decrypts a vault payload', async () => {
    const record = await service.createMasterPasswordRecord('ThisIsAStrongMasterPassword123!');
    const key = await service.verifyMasterPassword('ThisIsAStrongMasterPassword123!', record);

    expect(key).not.toBeNull();
    if (!key) {
      return;
    }

    const encrypted = await service.encryptVaultPayload(
      { entries: [{ id: '1', title: 'Demo', username: 'user', password: 'pass', createdAt: 'a', updatedAt: 'b' }] },
      key
    );

    const decrypted = await service.decryptVaultPayload(encrypted, key);

    expect(decrypted.entries.length).toBe(1);
    expect(decrypted.entries[0].title).toBe('Demo');
  });
});
