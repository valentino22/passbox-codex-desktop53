import { VaultConfig } from '../../shared/models/vault-config.model';

export const MASTER_PASSWORD_MIN_LENGTH = 10;

export const KDF_DEFAULTS = {
  algorithm: 'PBKDF2' as const,
  hash: 'SHA-256' as const,
  iterations: 310_000,
  saltBytes: 16
};

export const AES_GCM_DEFAULTS = {
  keyLength: 256,
  ivBytes: 12
};

export const MASTER_VALIDATION_PLAINTEXT = 'PASSBOX_MASTER_PASSWORD_VALID';

export const DEFAULT_VAULT_CONFIG: VaultConfig = {
  inactivityTimeoutMs: 5 * 60 * 1000
};

export const PASSBOX_SCHEMA_VERSION = 1 as const;
