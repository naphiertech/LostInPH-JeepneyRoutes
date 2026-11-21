import {
  AccountRole,
  AuthCredentials,
  AuthSession,
  DemoAccount,
  SignUpInput,
} from './types';

export type AuthResult =
  | { ok: true; session: AuthSession }
  | {
      ok: false;
      field?: 'name' | 'email' | 'password' | 'form';
      message: string;
    };

export interface AuthPort {
  getDemoAccounts(): DemoAccount[];
  getCachedSession(): AuthSession | null;
  loadSession(): Promise<AuthSession | null>;
  signIn(credentials: AuthCredentials): Promise<AuthResult>;
  signInWithDemo(role: AccountRole, rememberMe?: boolean): Promise<AuthResult>;
  signUp(input: SignUpInput): Promise<AuthResult>;
  signOut(): Promise<void>;
  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void;
}

export function validateFullName(value: string): string {
  if (!value.trim()) {
    return 'Enter your full name to continue.';
  }
  if (value.trim().length < 2) {
    return 'Full name must be at least 2 characters.';
  }
  return '';
}

export function validateEmailAddress(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Enter your email address.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address (for example, admin@lostinph.gov.ph).';
  }
  return '';
}

export function validatePassword(value: string): string {
  if (!value) {
    return 'Enter your password.';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return '';
}
