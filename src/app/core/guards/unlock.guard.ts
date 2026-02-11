import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { VaultService } from '../vault.service';

export const unlockGuard: CanActivateFn = () => {
  const vaultService = inject(VaultService);
  const router = inject(Router);

  if (vaultService.isConfigured() && vaultService.isUnlocked()) {
    return router.parseUrl('/vault');
  }

  return true;
};
