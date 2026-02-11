import { Injectable } from '@angular/core';
import { PersistedVaultEnvelope } from '../../shared/models/vault-persistence.model';
import { VaultStorage } from './vault-storage.interface';

const DB_NAME = 'passbox_db';
const DB_VERSION = 1;
const ENVELOPE_STORE = 'vault_envelopes';

interface StoredEnvelopeRecord {
  userId: string;
  envelope: PersistedVaultEnvelope;
}

@Injectable()
export class IndexedDbVaultStorageService implements VaultStorage {
  async loadEnvelope(userId: string): Promise<PersistedVaultEnvelope | null> {
    const db = await this.openDb();
    const transaction = db.transaction(ENVELOPE_STORE, 'readonly');
    const store = transaction.objectStore(ENVELOPE_STORE);
    const record = await this.request<StoredEnvelopeRecord | undefined>(store.get(userId));
    await this.transactionDone(transaction);
    return record?.envelope ?? null;
  }

  async saveEnvelope(userId: string, envelope: PersistedVaultEnvelope): Promise<void> {
    const db = await this.openDb();
    const transaction = db.transaction(ENVELOPE_STORE, 'readwrite');
    const store = transaction.objectStore(ENVELOPE_STORE);
    await this.request(store.put({ userId, envelope } satisfies StoredEnvelopeRecord));
    await this.transactionDone(transaction);
  }

  async clearUserData(userId: string): Promise<void> {
    const db = await this.openDb();
    const transaction = db.transaction(ENVELOPE_STORE, 'readwrite');
    const store = transaction.objectStore(ENVELOPE_STORE);
    await this.request(store.delete(userId));
    await this.transactionDone(transaction);
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ENVELOPE_STORE)) {
          db.createObjectStore(ENVELOPE_STORE, { keyPath: 'userId' });
        }
      };

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private transactionDone(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
}

/*
Future backend adapter sketch:
- Implement VaultStorage in ApiVaultStorageService.
- Persist/load the same PersistedVaultEnvelope by userId through REST.
- UI/features remain unchanged because they depend only on VaultStorage.
*/
