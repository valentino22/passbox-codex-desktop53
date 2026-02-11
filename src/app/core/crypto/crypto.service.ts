import { Injectable } from '@angular/core';
import {
  AES_GCM_DEFAULTS,
  KDF_DEFAULTS,
  MASTER_VALIDATION_PLAINTEXT
} from '../config/security.constants';
import {
  EncryptedPayload,
  MasterPasswordRecord,
  VaultPlaintextPayload
} from '../../shared/models/vault-persistence.model';

@Injectable({ providedIn: 'root' })
export class CryptoService {
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  async createMasterPasswordRecord(masterPassword: string): Promise<MasterPasswordRecord> {
    const salt = crypto.getRandomValues(new Uint8Array(KDF_DEFAULTS.saltBytes));
    const key = await this.deriveAesKey(masterPassword, salt, KDF_DEFAULTS.iterations);

    // We validate future unlock attempts by decrypting this constant challenge text.
    const validator = await this.encryptBytes(
      this.encoder.encode(MASTER_VALIDATION_PLAINTEXT),
      key
    );

    return {
      kdf: {
        algorithm: KDF_DEFAULTS.algorithm,
        hash: KDF_DEFAULTS.hash,
        iterations: KDF_DEFAULTS.iterations,
        saltB64: this.toBase64(salt)
      },
      validator
    };
  }

  async verifyMasterPassword(
    masterPassword: string,
    record: MasterPasswordRecord
  ): Promise<CryptoKey | null> {
    try {
      const salt = this.fromBase64(record.kdf.saltB64);
      const key = await this.deriveAesKey(masterPassword, salt, record.kdf.iterations);
      const decoded = await this.decryptBytes(record.validator, key);
      const challenge = this.decoder.decode(decoded);
      return challenge === MASTER_VALIDATION_PLAINTEXT ? key : null;
    } catch {
      return null;
    }
  }

  async encryptVaultPayload(
    payload: VaultPlaintextPayload,
    key: CryptoKey
  ): Promise<EncryptedPayload> {
    return this.encryptBytes(this.encoder.encode(JSON.stringify(payload)), key);
  }

  async decryptVaultPayload(
    encrypted: EncryptedPayload,
    key: CryptoKey
  ): Promise<VaultPlaintextPayload> {
    const plainBytes = await this.decryptBytes(encrypted, key);
    const json = this.decoder.decode(plainBytes);
    return JSON.parse(json) as VaultPlaintextPayload;
  }

  private async deriveAesKey(
    masterPassword: string,
    salt: Uint8Array,
    iterations: number
  ): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(masterPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.toArrayBuffer(salt),
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: AES_GCM_DEFAULTS.keyLength
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encryptBytes(data: Uint8Array, key: CryptoKey): Promise<EncryptedPayload> {
    // AES-GCM requires a unique IV for each encryption under a given key.
    const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_DEFAULTS.ivBytes));
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
      key,
      this.toArrayBuffer(data)
    );

    return {
      ivB64: this.toBase64(iv),
      cipherTextB64: this.toBase64(new Uint8Array(cipherBuffer))
    };
  }

  private async decryptBytes(payload: EncryptedPayload, key: CryptoKey): Promise<Uint8Array> {
    const iv = this.fromBase64(payload.ivB64);
    const cipherText = this.fromBase64(payload.cipherTextB64);

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
      key,
      this.toArrayBuffer(cipherText)
    );

    return new Uint8Array(plainBuffer);
  }

  private toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  private fromBase64(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
  }
}
