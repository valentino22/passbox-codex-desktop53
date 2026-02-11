import { InjectionToken } from '@angular/core';
import { VaultStorage } from './vault-storage.interface';

export const VAULT_STORAGE = new InjectionToken<VaultStorage>('VAULT_STORAGE');
