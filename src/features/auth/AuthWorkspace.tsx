import React, { useId, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  Compass,
  Eye,
  EyeOff,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { AuthPort } from '../../domain/auth/authPort';
import { AccountRole, AuthSession } from '../../domain/auth/types';
import { CityId, CityInfo, DiscountType } from '../../domain/transit/types';
import { LostInPhLogo } from '../../shared/ui/LostInPhLogo';
import { ShowcasePreviewPanel } from './ShowcasePreviewPanel';

interface AuthWorkspaceProps {
  authPort: AuthPort;
  cities: CityInfo[];
  onAuthenticated: (session: AuthSession) => void;
}

export const AuthWorkspace: React.FC<AuthWorkspaceProps> = ({
  authPort,
  cities,
  onAuthenticated,
}) => {
  const demoAccounts = authPort.getDemoAccounts();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [homeCity, setHomeCity] = useState<CityId>('cebu');
  const [discountType, setDiscountType] = useState<DiscountType>('regular');
  const [signupRole, setSignupRole] = useState<AccountRole>('app');
  const [showRecoveryHint, setShowRecoveryHint] = useState(false);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const cityId = useId();
  const discountId = useId();

  const clearErrors = () => {
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setFormError('');
  };

  const handleModeToggle = () => {
    clearErrors();
    setShowRecoveryHint(false);
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const result =
      mode === 'signin'
        ? authPort.signIn({ email, password, rememberMe })
        : authPort.signUp({
            fullName,
            email,
            password,
            homeCity,
            discountType,
            role: signupRole,
          });

    if (result.ok) {
      onAuthenticated(result.session);
      return;
    }

    if (result.field === 'name') {
      setNameError(result.message);
      nameRef.current?.focus();
    } else if (result.field === 'email') {
      setEmailError(result.message);
      emailRef.current?.focus();
    } else if (result.field === 'password') {
      setPasswordError(result.message);
      passwordRef.current?.focus();
    } else {
      setFormError(result.message);
    }
  };

  const handleDemoLaunch = (role: AccountRole) => {
    clearErrors();
    const result = authPort.signInWithDemo(role, rememberMe);
    if (result.ok) {
      onAuthenticated(result.session);
    } else {
      setFormError(result.message);
    }
  };

  return (
    <div className="grid min-h-dvh w-full max-w-full grid-cols-1 overflow-x-hidden bg-[var(--surface)] lg:grid-cols-[48%_52%]">
      {/* Left Auth Column */}
      <section className="auth-grid-bg flex min-w-0 w-full flex-col justify-between px-5 py-6 sm:px-10 sm:py-7 lg:px-14">
        <header className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <LostInPhLogo size="sm" theme="darkTile" />
            <div>
              <span className="font-display text-lg font-semibold tracking-tight text-[var(--foreground)]">
                LostInPH
              </span>
            </div>
          </div>

          <span className="shrink-0 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            PH Transit Platform
          </span>
        </header>

        <main className="mx-auto my-8 w-full max-w-[392px]">
          {/* Centered App Icon Mark */}
          <div className="flex flex-col items-center text-center">
            <LostInPhLogo size="lg" theme="darkTile" />

            <h1 className="font-display mt-5 text-[26px] font-semibold tracking-tight text-[var(--foreground)]">
              {mode === 'signin'
                ? 'Sign in to your account'
                : 'Create a LostInPH account'}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              {mode === 'signin'
                ? 'Enter your email or pick a demo workspace below.'
                : 'Choose Admin operations or the Commuter App view.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor={nameId}
                  className="mb-1.5 block text-xs font-medium text-[var(--foreground)]"
                >
                  Full name
                </label>
                <input
                  ref={nameRef}
                  id={nameId}
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  aria-invalid={Boolean(nameError)}
                  className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                />
                {nameError && (
                  <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
                    {nameError}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor={emailId}
                className="mb-1.5 block text-xs font-medium text-[var(--foreground)]"
              >
                Email
              </label>
              <input
                ref={emailRef}
                id={emailId}
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="admin@lostinph.gov.ph"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                aria-invalid={Boolean(emailError)}
                className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
              {emailError && (
                <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={passwordId}
                className="mb-1.5 block text-xs font-medium text-[var(--foreground)]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id={passwordId}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  aria-invalid={Boolean(passwordError)}
                  className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 pr-11 pl-4 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-full p-1.5 text-[var(--text-muted)] hover:text-[var(--foreground)]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
                  {passwordError}
                </p>
              )}
            </div>

            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={cityId}
                      className="mb-1.5 block text-xs font-medium text-[var(--foreground)]"
                    >
                      Home city
                    </label>
                    <select
                      id={cityId}
                      value={homeCity}
                      onChange={(e) => setHomeCity(e.target.value as CityId)}
                      className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={discountId}
                      className="mb-1.5 block text-xs font-medium text-[var(--foreground)]"
                    >
                      Fare tier
                    </label>
                    <select
                      id={discountId}
                      value={discountType}
                      onChange={(e) =>
                        setDiscountType(e.target.value as DiscountType)
                      }
                      className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                    >
                      <option value="regular">Regular</option>
                      <option value="student">Student (-20%)</option>
                      <option value="senior_pwd">Senior / PWD (-20%)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">
                    Workspace access
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['app', 'admin'] as AccountRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSignupRole(r)}
                        className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                          signupRole === r
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {r === 'admin'
                          ? 'Admin Dashboard'
                          : 'Commuter App UI'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mode === 'signin' && (
              <div className="flex items-center justify-between pt-0.5 text-xs">
                <label className="flex cursor-pointer items-center gap-2 text-[var(--text-secondary)] select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] accent-[var(--foreground)]"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowRecoveryHint((prev) => !prev)}
                  className="cursor-pointer font-medium text-[var(--foreground)] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {showRecoveryHint && (
              <div className="t-panel-reveal rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                  <HelpCircle className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Phase 1 local demo credentials</span>
                </div>
                <div className="mt-1.5 space-y-1 font-mono text-[11px]">
                  {demoAccounts.map((acc) => (
                    <div key={acc.id} className="flex justify-between gap-2">
                      <span>
                        {acc.shortLabel}: {acc.email}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        {acc.password}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-subtle)] px-3.5 py-2.5 text-xs text-[var(--danger)]"
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-[var(--surface)] transition-opacity hover:opacity-90"
            >
              <span>{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </form>

          {/* Divider + Strictly 2 Demo Accounts (Admin vs App) */}
          <div className="my-6 flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span>or open demo workspace</span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <div
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
            aria-label="Demo workspace accounts"
          >
            {demoAccounts.map((demo) => {
              const isAdmin = demo.role === 'admin';
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleDemoLaunch(demo.role)}
                  className="t-card-lift group flex cursor-pointer items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface)]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        isAdmin
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                          : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]'
                      }`}
                    >
                      {isAdmin ? (
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Compass className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--foreground)]">
                        {demo.shortLabel}
                      </div>
                      <div className="truncate text-[11px] text-[var(--text-secondary)]">
                        {isAdmin ? 'Admin Dashboard' : 'Commuter App UI'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </main>

        <footer className="mx-auto flex w-full max-w-[392px] items-center justify-between border-t border-[var(--border-subtle)] pt-4 text-xs">
          <span className="text-[var(--text-secondary)]">
            {mode === 'signin'
              ? "Don't have an account?"
              : 'Already have an account?'}
          </span>
          <button
            type="button"
            onClick={handleModeToggle}
            className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
          >
            <span>{mode === 'signin' ? 'Sign up' : 'Sign in'}</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </footer>
      </section>

      {/* Right Green Showcase Column (desktop only so mobile reaches login cleanly) */}
      <aside className="hidden p-4 lg:flex lg:p-5">
        <ShowcasePreviewPanel />
      </aside>
    </div>
  );
};
