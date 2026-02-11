import { Routes } from '@angular/router';
import { unlockGuard } from './core/guards/unlock.guard';
import { vaultGuard } from './core/guards/vault.guard';
import { UnlockComponent } from './features/unlock/unlock.component';
import { VaultListComponent } from './features/passwords/vault-list.component';
import { VaultEntryComponent } from './features/passwords/vault-entry.component';
import { SettingsComponent } from './features/settings/settings.component';
import { PasswordGeneratorComponent } from './features/password-generator/password-generator.component';

export const routes: Routes = [
  { path: 'unlock', canActivate: [unlockGuard], component: UnlockComponent },
  { path: 'vault', canActivate: [vaultGuard], component: VaultListComponent },
  { path: 'vault/new', canActivate: [vaultGuard], component: VaultEntryComponent },
  { path: 'vault/:id', canActivate: [vaultGuard], component: VaultEntryComponent },
  { path: 'generator', canActivate: [vaultGuard], component: PasswordGeneratorComponent },
  { path: 'settings', canActivate: [vaultGuard], component: SettingsComponent },
  { path: '', pathMatch: 'full', redirectTo: 'vault' },
  { path: '**', redirectTo: 'vault' }
];
