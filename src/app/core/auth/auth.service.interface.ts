import { Signal } from '@angular/core';
import { User } from '../../shared/models/user.model';

export interface AuthService {
  currentUser: Signal<User | null>;
  requireUser(): User;
  signInMock(user?: Partial<User>): void;
  signOut(): void;
}
