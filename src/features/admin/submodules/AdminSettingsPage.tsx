import React from 'react';
import { LogOut, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { ColorSchemeSetting } from '../../../adapters/browser/storage';
import { AuthUser } from '../../../domain/auth/types';
import { LostInPhLogo } from '../../../shared/ui/LostInPhLogo';

export type { ColorSchemeSetting };

interface AdminSettingsPageProps {
  currentUser: AuthUser;
  schemeSetting: ColorSchemeSetting;
  onChangeScheme: (scheme: ColorSchemeSetting) => void;
  onResetDemoData: () => void;
  onSignOut: () => void;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({
  currentUser,
  schemeSetting,
  onChangeScheme,
  onResetDemoData,
  onSignOut,
}) => {
  return (
    <div className="max-w-3xl space-y-5">
      {/* Brand Identity & Store Assets (/brandkit) */}
      <section
        aria-label="LostInPH brand kit and store identity"
        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Brand identity &amp; App Store / Google Play kit
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              The Wayfinding Jeepney Compass mark combines the 3-peak jeepney signboard crown, double-tracked <code className="font-mono">L</code> corridor loop, and 45° compass arrowhead.
            </p>
          </div>
          <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-3 py-1 font-mono text-[11px] font-semibold text-[var(--accent)]">
            /favicon.svg · ₱199 Store Asset
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
            <LostInPhLogo size="lg" theme="darkTile" />
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">
                Primary Store Icon
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Slate #111827 · Lime #78BE20
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
            <LostInPhLogo size="lg" theme="greenTile" />
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">
                Mobility Green Tile
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Green #5D9B19 · White #FFFFFF
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
            <LostInPhLogo size="lg" theme="darkTile" showConstruction />
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">
                Construction Grid
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                45° vector &amp; favicon spec
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[#0B0D10]">
          <img
            src="/brandkit-board.jpg"
            alt="LostInPH 3x3 Brand Kit presentation board showing logo geometry, color swatches, typography, and mobile UI"
            className="h-auto w-full object-cover"
          />
        </div>
      </section>

      {/* Appearance Theme Selector */}
      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Workspace appearance
        </h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Choose how the Admin console renders light or dark surfaces via browser{' '}
          <code className="font-mono">color-scheme</code>.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {(
            [
              { id: 'system', label: 'System', icon: Monitor },
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
            ] as const
          ).map(({ id, label, icon: Icon }) => {
            const active = schemeSetting === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChangeScheme(id)}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Phase 1 Local Dataset Maintenance */}
      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Phase 1 mock persistence
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Restore seed routes, fare rules, triage statuses, and corridor
              advisories back to default values.
            </p>
          </div>

          <button
            type="button"
            onClick={onResetDemoData}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset demo dataset</span>
          </button>
        </div>
      </section>

      {/* Operator Session Isolation */}
      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Signed-in session ({currentUser.email})
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Sign out to switch cleanly to the isolated Commuter App UI or
              another demo account.
            </p>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--danger)]/35 bg-[var(--danger-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--danger)] hover:opacity-90"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign out to Login</span>
          </button>
        </div>
      </section>
    </div>
  );
};
