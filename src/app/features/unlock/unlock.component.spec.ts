import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UnlockComponent } from './unlock.component';
import { AUTH_SERVICE } from '../../core/auth/auth-service.token';
import { MockAuthService } from '../../core/auth/mock-auth.service';
import { VAULT_STORAGE } from '../../core/storage/vault-storage.token';
import { VaultStorage } from '../../core/storage/vault-storage.interface';
import { PersistedVaultEnvelope } from '../../shared/models/vault-persistence.model';
import { VaultService } from '../../core/vault.service';

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

describe('UnlockComponent', () => {
  let fixture: ComponentFixture<UnlockComponent>;
  let component: UnlockComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnlockComponent],
      providers: [
        provideRouter([]),
        VaultService,
        { provide: AUTH_SERVICE, useClass: MockAuthService },
        { provide: VAULT_STORAGE, useClass: InMemoryVaultStorage }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnlockComponent);
    component = fixture.componentInstance;
    await TestBed.inject(VaultService).initialize();
    fixture.detectChanges();
  });

  it('requires matching master password confirmation in setup mode', async () => {
    component.form.controls.masterPassword.setValue('ThisIsAStrongMasterPassword123!');
    component.form.controls.confirmMasterPassword.setValue('different');

    await component.submit();

    expect(component.errorMessage()).toContain('confirmation does not match');
  });
});
