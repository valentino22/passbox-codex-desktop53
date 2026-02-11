# PassBox

PassBox is a local-first password manager built with Angular standalone APIs.
Vault data is encrypted in the browser with Web Crypto (PBKDF2 + AES-GCM) and stored in IndexedDB.

## Architecture

- `src/app/core`
  - `crypto`: framework-agnostic cryptography service around Web Crypto.
  - `storage`: `VaultStorage` interface + IndexedDB implementation.
  - `auth`: `AuthService` interface + mock single-user adapter.
  - `vault.service.ts`: orchestrates setup/unlock/lock, CRUD, encryption, inactivity timeout.
- `src/app/features`
  - `unlock`: setup/unlock screen.
  - `passwords`: list and create/edit entry screens.
  - `settings`: inactivity timeout, manual lock, clear-all flow.
- `src/app/shared/models`
  - domain/persistence interfaces reused across layers.

## Reuse path for Ionic and backend

The `shared/models`, crypto logic, and storage/auth interfaces are intentionally isolated from UI concerns.
In a future Nx-style workspace, they can move into shared libraries consumed by both:

- Angular web app (current)
- Ionic mobile app (future)

To add backend sync later, implement `ApiVaultStorageService` for the existing `VaultStorage` contract and swap DI providers only.
To add real auth, replace `MockAuthService` with a JWT/session-backed `AuthService` implementation.

## Security model (demo scope)

- Master password is never stored in plaintext.
- A salted/stretched validation record is stored (PBKDF2 SHA-256, 310000 iterations).
- Vault payload is encrypted with AES-GCM and random IV on each save.
- Session key lives only in memory and is cleared on lock.

## Run

```bash
npm install
npm start
```

Then open `http://localhost:4200/`.

## Test

```bash
npm test
```
