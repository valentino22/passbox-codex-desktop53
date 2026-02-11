import { Injectable, Signal, signal } from '@angular/core';
import { AuthService } from './auth.service.interface';
import { User } from '../../shared/models/user.model';

@Injectable()
export class MockAuthService implements AuthService {
  private readonly userSignal = signal<User | null>({
    id: 'local-user-1',
    displayName: 'Local User'
  });

  readonly currentUser: Signal<User | null> = this.userSignal.asReadonly();

  requireUser(): User {
    const user = this.userSignal();
    if (!user) {
      throw new Error('No authenticated user.');
    }

    return user;
  }

  signInMock(user?: Partial<User>): void {
    this.userSignal.set({
      id: user?.id ?? 'local-user-1',
      email: user?.email,
      displayName: user?.displayName ?? 'Local User'
    });
  }

  signOut(): void {
    this.userSignal.set(null);
  }
}
