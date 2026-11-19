import React from 'react';
import {
  AdvisorySeverity,
  TriageLabel,
  VehicleType,
  VerificationTier,
} from '../../domain/transit/types';

const VERIFICATION_META: Record<
  VerificationTier,
  { label: string; badgeClass: string }
> = {
  ltfrb_reference: {
    label: 'LTFRB reference',
    badgeClass:
      'bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success)]/25',
  },
  community_verified: {
    label: 'Community verified',
    badgeClass:
      'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/25',
  },
  field_draft: {
    label: 'Field draft',
    badgeClass:
      'bg-[var(--peak-subtle)] text-[var(--peak)] border-[var(--peak)]/25',
  },
};

const TRIAGE_STYLES: Record<TriageLabel, string> = {
  'needs-triage':
    'bg-[var(--peak-subtle)] text-[var(--peak)] border-[var(--peak)]/25',
  'needs-info':
    'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)]',
  'ready-for-agent':
    'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/25',
  'ready-for-human':
    'bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success)]/25',
  wontfix:
    'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border)] line-through',
};

const ADVISORY_META: Record<
  AdvisorySeverity,
  { label: string; badgeClass: string }
> = {
  advisory: {
    label: 'Advisory',
    badgeClass:
      'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/25',
  },
  detour: {
    label: 'Detour',
    badgeClass:
      'bg-[var(--peak-subtle)] text-[var(--peak)] border-[var(--peak)]/25',
  },
  suspended: {
    label: 'Suspended',
    badgeClass:
      'bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger)]/25',
  },
};

export const VerificationPill: React.FC<{ tier: VerificationTier }> = ({
  tier,
}) => {
  const meta = VERIFICATION_META[tier];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
};

export const TriagePill: React.FC<{ label: TriageLabel }> = ({ label }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TRIAGE_STYLES[label]}`}
    >
      {label}
    </span>
  );
};

export const VehiclePill: React.FC<{ type: VehicleType }> = ({ type }) => {
  const isModern = type === 'modern_puv';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
        isModern
          ? 'border-[var(--accent)]/25 bg-[var(--accent-subtle)] text-[var(--accent)]'
          : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)]'
      }`}
    >
      {isModern ? 'Modern PUV' : 'Traditional Jeep'}
    </span>
  );
};

export const AdvisorySeverityPill: React.FC<{ severity: AdvisorySeverity }> = ({
  severity,
}) => {
  const meta = ADVISORY_META[severity];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
};
