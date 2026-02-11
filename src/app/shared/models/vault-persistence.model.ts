import { VaultConfig } from './vault-config.model';
import { VaultEntry } from './vault-entry.model';

export interface KdfParams {
  algorithm: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  saltB64: string;
}

export interface EncryptedPayload {
  ivB64: string;
  cipherTextB64: string;
}

export interface MasterPasswordRecord {
  kdf: KdfParams;
  validator: EncryptedPayload;
}

export interface EncryptedVaultRecord extends EncryptedPayload {
  version: 1;
  userId: string;
  updatedAt: string;
}

export interface PersistedVaultEnvelope {
  master: MasterPasswordRecord;
  vault: EncryptedVaultRecord | null;
  config: VaultConfig;
}

export interface VaultPlaintextPayload {
  entries: VaultEntry[];
}
