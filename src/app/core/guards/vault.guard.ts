import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { VaultService } from '../vault.service';

export const vaultGuard: CanActivateFn = () => {
  const vaultService = inject(VaultService);
  const router = inject(Router);

  if (!vaultService.isConfigured() || !vaultService.isUnlocked()) {
    return router.parseUrl('/unlock');
  }

  return true;
};
