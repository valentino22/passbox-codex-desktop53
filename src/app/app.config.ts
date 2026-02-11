import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AUTH_SERVICE } from './core/auth/auth-service.token';
import { MockAuthService } from './core/auth/mock-auth.service';
import { VAULT_STORAGE } from './core/storage/vault-storage.token';
import { IndexedDbVaultStorageService } from './core/storage/indexeddb-vault-storage.service';
import { VaultService } from './core/vault.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    { provide: AUTH_SERVICE, useClass: MockAuthService },
    { provide: VAULT_STORAGE, useClass: IndexedDbVaultStorageService },
    provideAppInitializer(() => inject(VaultService).initialize())
  ]
};
