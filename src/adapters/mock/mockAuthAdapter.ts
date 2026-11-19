import {
  AuthPort,
  AuthResult,
  validateEmailAddress,
  validateFullName,
  validatePassword,
} from '../../domain/auth/authPort';
import {
  AccountRole,
  AuthCredentials,
  AuthSession,
  AuthUser,
  DemoAccount,
  SignUpInput,
} from '../../domain/auth/types';
import {
  readStoredJson,
  removeStoredKey,
  STORAGE_KEYS,
  writeStoredJson,
} from '../browser/storage';
import { DEMO_ACCOUNTS } from './demoAccounts';

function toAuthUser(account: DemoAccount): AuthUser {
  const {
    password: _pw,
    shortLabel: _sl,
    workspaceSummary: _ws,
    ...user
  } = account;
  return user;
}

function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'LP'
  );
}

function persistSession(session: AuthSession): void {
  removeStoredKey(STORAGE_KEYS.authSession, 'both');
  writeStoredJson(
    STORAGE_KEYS.authSession,
    session,
    session.remembered ? 'local' : 'session'
  );
}

export function createMockAuthAdapter(): AuthPort {
  return {
    getDemoAccounts(): DemoAccount[] {
      return DEMO_ACCOUNTS;
    },

    loadSession(): AuthSession | null {
      const local = readStoredJson<AuthSession>(
        STORAGE_KEYS.authSession,
        'local'
      );
      if (local?.user?.role) return local;

      const tab = readStoredJson<AuthSession>(
        STORAGE_KEYS.authSession,
        'session'
      );
      return tab?.user?.role ? tab : null;
    },

    signIn(credentials: AuthCredentials): AuthResult {
      const emailErr = validateEmailAddress(credentials.email);
      if (emailErr) {
        return { ok: false, field: 'email', message: emailErr };
      }

      const passwordErr = validatePassword(credentials.password);
      if (passwordErr) {
        return { ok: false, field: 'password', message: passwordErr };
      }

      const normalizedEmail = credentials.email.trim().toLowerCase();
      const matched = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === normalizedEmail
      );

      if (matched) {
        if (matched.password !== credentials.password) {
          return {
            ok: false,
            field: 'form',
            message: `Invalid password for ${matched.shortLabel}. Hint: use the ${matched.shortLabel} demo card below.`,
          };
        }
        const session: AuthSession = {
          user: toAuthUser(matched),
          remembered: credentials.rememberMe,
          authenticatedAt: new Date().toISOString(),
        };
        persistSession(session);
        return { ok: true, session };
      }

      // Guard elevated email hints while allowing custom commuter login in Phase 1
      if (normalizedEmail.includes('admin')) {
        return {
          ok: false,
          field: 'form',
          message:
            'Unknown administrator email. Use admin@lostinph.gov.ph or pick the Admin demo card.',
        };
      }

      const handle = normalizedEmail.split('@')[0];
      const displayName = handle
        .split(/[._-]/)
        .filter(Boolean)
        .map((seg) => seg[0].toUpperCase() + seg.slice(1))
        .join(' ');

      const customAppUser: AuthUser = {
        id: `app-${Date.now()}`,
        name: displayName || 'LostInPH Commuter',
        email: credentials.email.trim(),
        role: 'app',
        homeCity: 'cebu',
        discountType: 'regular',
        avatarInitials: initialsFor(displayName || 'LP'),
        badgeLabel: 'Commuter app explorer',
        savedPlaces: [],
        savedRouteIds: ['cebu-17c'],
        tripsCompleted: 1,
        status: 'active',
      };

      const session: AuthSession = {
        user: customAppUser,
        remembered: credentials.rememberMe,
        authenticatedAt: new Date().toISOString(),
      };
      persistSession(session);
      return { ok: true, session };
    },

    signInWithDemo(role: AccountRole, rememberMe = true): AuthResult {
      const demo = DEMO_ACCOUNTS.find((acc) => acc.role === role);
      if (!demo) {
        return {
          ok: false,
          field: 'form',
          message: `Demo account "${role}" is not configured.`,
        };
      }
      const session: AuthSession = {
        user: toAuthUser(demo),
        remembered: rememberMe,
        authenticatedAt: new Date().toISOString(),
      };
      persistSession(session);
      return { ok: true, session };
    },

    signUp(input: SignUpInput): AuthResult {
      const nameErr = validateFullName(input.fullName);
      if (nameErr) {
        return { ok: false, field: 'name', message: nameErr };
      }
      const emailErr = validateEmailAddress(input.email);
      if (emailErr) {
        return { ok: false, field: 'email', message: emailErr };
      }
      const passwordErr = validatePassword(input.password);
      if (passwordErr) {
        return { ok: false, field: 'password', message: passwordErr };
      }

      const newUser: AuthUser = {
        id: `user-${Date.now()}`,
        name: input.fullName.trim(),
        email: input.email.trim(),
        role: input.role,
        homeCity: input.homeCity,
        discountType: input.discountType,
        avatarInitials: initialsFor(input.fullName),
        badgeLabel:
          input.role === 'admin'
            ? 'Transit operations contributor'
            : input.discountType === 'student'
              ? 'Student commuter (-20%)'
              : input.discountType === 'senior_pwd'
                ? 'Senior / PWD commuter (-20%)'
                : 'Commuter app explorer',
        savedPlaces: [],
        savedRouteIds: [],
        tripsCompleted: 0,
        status: 'active',
      };

      const session: AuthSession = {
        user: newUser,
        remembered: true,
        authenticatedAt: new Date().toISOString(),
      };
      persistSession(session);
      return { ok: true, session };
    },

    signOut(): void {
      removeStoredKey(STORAGE_KEYS.authSession, 'both');
    },
  };
}
