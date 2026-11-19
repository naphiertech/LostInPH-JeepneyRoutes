import React, { useState } from 'react';
import { Calculator, Save } from 'lucide-react';
import {
  calculateFareFromRates,
  formatFare,
} from '../../../domain/transit/fareEngine';
import { FareRule, VehicleType } from '../../../domain/transit/types';

interface FareMatrixPageProps {
  fareRules: FareRule[];
  onSaveFareRule: (updatedRule: FareRule) => void;
}

export const FareMatrixPage: React.FC<FareMatrixPageProps> = ({
  fareRules,
  onSaveFareRule,
}) => {
  const [simVehicle, setSimVehicle] = useState<VehicleType>(
    'traditional_jeepney'
  );
  const [simDistanceKm, setSimDistanceKm] = useState<number>(7.4);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftBase, setDraftBase] = useState<string>('13');
  const [draftPerKm, setDraftPerKm] = useState<string>('1.8');

  const selectedRule =
    fareRules.find((r) => r.vehicleType === simVehicle) ?? fareRules[0];

  const calculated = selectedRule
    ? calculateFareFromRates(
        selectedRule.baseFarePhp,
        selectedRule.perKmRatePhp,
        simDistanceKm,
        selectedRule.discountPercent,
        selectedRule.firstKmCount
      )
    : { regular: 0, discounted: 0 };

  const startEdit = (rule: FareRule) => {
    setEditingId(rule.id);
    setDraftBase(rule.baseFarePhp.toString());
    setDraftPerKm(rule.perKmRatePhp.toFixed(2));
  };

  const commitEdit = (rule: FareRule) => {
    const base = Number.parseFloat(draftBase);
    const perKm = Number.parseFloat(draftPerKm);
    if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(perKm) || perKm < 0) {
      return;
    }
    onSaveFareRule({
      ...rule,
      baseFarePhp: Math.round(base * 4) / 4,
      perKmRatePhp: Number(perKm.toFixed(2)),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Editable LTFRB Rate Schedule Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {fareRules.map((rule) => {
          const isEditing = editingId === rule.id;
          return (
            <div
              key={rule.id}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block rounded-md bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--text-secondary)]">
                    {rule.effectiveOrder}
                  </span>
                  <h2 className="mt-2 text-base font-semibold text-[var(--foreground)]">
                    {rule.label}
                  </h2>
                </div>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => startEdit(rule)}
                    className="cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
                  >
                    Edit rates
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => commitEdit(rule)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Apply</span>
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border-subtle)] pt-4">
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    First {rule.firstKmCount} km base
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.25"
                      min="5"
                      aria-label={`Base fare for ${rule.label}`}
                      value={draftBase}
                      onChange={(e) => setDraftBase(e.target.value)}
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 font-mono text-sm text-[var(--foreground)]"
                    />
                  ) : (
                    <div className="mt-1 tabular-nums font-mono text-xl font-semibold text-[var(--foreground)]">
                      {formatFare(rule.baseFarePhp)}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Succeeding km
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      aria-label={`Per km rate for ${rule.label}`}
                      value={draftPerKm}
                      onChange={(e) => setDraftPerKm(e.target.value)}
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 font-mono text-sm text-[var(--foreground)]"
                    />
                  ) : (
                    <div className="mt-1 tabular-nums font-mono text-xl font-semibold text-[var(--foreground)]">
                      {formatFare(rule.perKmRatePhp)}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Student / Senior / PWD
                  </div>
                  <div className="mt-1 tabular-nums font-mono text-xl font-semibold text-[var(--success)]">
                    -{rule.discountPercent}%
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-[var(--text-muted)]">
                Rounded to nearest ₱0.25 increment · Synced to route estimator (
                {rule.updatedAt})
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Fare Matrix Simulator */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2">
          <Calculator
            className="h-4 w-4 text-[var(--accent)]"
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Interactive ₱ fare matrix verifier
          </h3>
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Verify exact regular and statutory 20% discounted amounts computed by
          the trip engine.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1.2fr]">
          <div>
            <label
              htmlFor="sim-vehicle-select"
              className="mb-1.5 block text-xs font-medium text-[var(--foreground)]"
            >
              Vehicle class
            </label>
            <select
              id="sim-vehicle-select"
              value={simVehicle}
              onChange={(e) => setSimVehicle(e.target.value as VehicleType)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]"
            >
              {fareRules.map((r) => (
                <option key={r.id} value={r.vehicleType}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
              <label
                htmlFor="sim-distance-range"
                className="text-[var(--foreground)]"
              >
                Segment distance
              </label>
              <span className="tabular-nums font-mono text-[var(--accent)]">
                {simDistanceKm.toFixed(1)} km
              </span>
            </div>
            <input
              id="sim-distance-range"
              type="range"
              min="1"
              max="20"
              step="0.2"
              value={simDistanceKm}
              onChange={(e) =>
                setSimDistanceKm(Number.parseFloat(e.target.value))
              }
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
            <div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Regular fare
              </div>
              <div className="mt-0.5 tabular-nums font-mono text-lg font-semibold text-[var(--foreground)]">
                {formatFare(calculated.regular)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                20% discounted
              </div>
              <div className="mt-0.5 tabular-nums font-mono text-lg font-semibold text-[var(--success)]">
                {formatFare(calculated.discounted)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
