import { InjectionToken } from '@angular/core';
import { AuthService } from './auth.service.interface';

export const AUTH_SERVICE = new InjectionToken<AuthService>('AUTH_SERVICE');
