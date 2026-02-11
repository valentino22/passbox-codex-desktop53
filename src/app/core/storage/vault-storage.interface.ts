import { PersistedVaultEnvelope } from '../../shared/models/vault-persistence.model';

export interface VaultStorage {
  loadEnvelope(userId: string): Promise<PersistedVaultEnvelope | null>;
  saveEnvelope(userId: string, envelope: PersistedVaultEnvelope): Promise<void>;
  clearUserData(userId: string): Promise<void>;
}
