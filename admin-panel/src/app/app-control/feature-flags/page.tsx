'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/layout/Shell';
import { AlertTriangle, Globe, Lock, RotateCcw, Save, Smartphone } from 'lucide-react';
import { fetchFeatureFlags, updateFeatureFlag } from '@/lib/api/client';
import { FeatureFlagRecord } from '@/types/admin';
import { useAuth } from '@/context/AuthContext';

const COUNTRY_OPTIONS = ['IN', 'AE', 'US', 'GB'];
const PLATFORM_OPTIONS: Array<'android' | 'ios'> = ['android', 'ios'];

type TargetDraft = {
  countries: string[];
  platforms: ('android' | 'ios')[];
  minAppVersion: string;
  rolloutPercentage: number;
};

export default function FeatureFlagsPage() {
  const { hasPermission } = useAuth();
  const [flags, setFlags] = useState<FeatureFlagRecord[]>([]);
  const [confirmFlag, setConfirmFlag] = useState<FeatureFlagRecord | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, TargetDraft>>({});
  const canEdit = hasPermission('features.edit');

  useEffect(() => {
    fetchFeatureFlags()
      .then((loaded) => {
        setFlags(loaded);
        setDrafts(Object.fromEntries(loaded.map((flag) => [flag.key, {
          countries: [...(flag.countries || [])],
          platforms: [...(flag.platforms || [])],
          minAppVersion: flag.minAppVersion || '',
          rolloutPercentage: flag.rolloutPercentage ?? 0,
        }])));
      })
      .catch((error) => setToastMsg(error instanceof Error ? error.message : 'Could not load live feature flags.'));
  }, []);

  const activeCount = useMemo(
    () => flags.filter((flag) => flag.enabled && (flag.rolloutPercentage ?? 0) > 0).length,
    [flags],
  );

  const updateLocalDraft = (key: string, patch: Partial<TargetDraft>) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleToggleClick = (flag: FeatureFlagRecord) => {
    if (!canEdit) {
      setToastMsg('Permission Denied: features.edit permission required.');
      return;
    }
    if (flag.requiresConfirmation) setConfirmFlag(flag);
    else void executeToggle(flag.key);
  };

  const executeToggle = async (key: string) => {
    const current = flags.find((flag) => flag.key === key);
    if (!current) return;
    const nextEnabled = !current.enabled;
    setSavingKey(key);
    try {
      const updated = await updateFeatureFlag(key, {
        enabled: nextEnabled,
        rolloutPercentage: nextEnabled ? Math.max(current.rolloutPercentage ?? 0, 100) : 0,
      });
      setFlags((prev) => prev.map((flag) => flag.key === key ? updated : flag));
      updateLocalDraft(key, { rolloutPercentage: updated.rolloutPercentage ?? 0 });
      setConfirmFlag(null);
      setToastMsg(current.name + ' is now ' + (updated.enabled ? 'enabled' : 'disabled') + '. Saved to the backend.');
    } catch (error) {
      setToastMsg(error instanceof Error ? error.message : 'Feature flag update failed; no change was saved.');
    } finally {
      setSavingKey(null);
    }
  };

  const saveTargeting = async (flag: FeatureFlagRecord) => {
    if (!canEdit) {
      setToastMsg('Permission Denied: features.edit permission required.');
      return;
    }
    const draft = drafts[flag.key];
    if (!draft) return;
    setSavingKey(flag.key);
    try {
      const updated = await updateFeatureFlag(flag.key, {
        rolloutPercentage: draft.rolloutPercentage,
        countries: draft.countries,
        platforms: draft.platforms,
        minAppVersion: draft.minAppVersion.trim() || undefined,
      });
      setFlags((prev) => prev.map((item) => item.key === flag.key ? updated : item));
      setDrafts((prev) => ({ ...prev, [flag.key]: {
        countries: [...(updated.countries || [])],
        platforms: [...(updated.platforms || [])],
        minAppVersion: updated.minAppVersion || '',
        rolloutPercentage: updated.rolloutPercentage ?? 0,
      }}));
      setToastMsg(flag.name + ' targeting and rollout saved to the backend.');
    } catch (error) {
      setToastMsg(error instanceof Error ? error.message : 'Targeting update failed; no change was saved.');
    } finally {
      setSavingKey(null);
    }
  };

  const resetDraft = (flag: FeatureFlagRecord) => {
    setDrafts((prev) => ({ ...prev, [flag.key]: {
      countries: [...(flag.countries || [])],
      platforms: [...(flag.platforms || [])],
      minAppVersion: flag.minAppVersion || '',
      rolloutPercentage: flag.rolloutPercentage ?? 0,
    }}));
  };

  return (
    <Shell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-purple-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-mono font-bold">
              SYSTEM FEATURE OVERRIDE ENGINE
            </span>
            <span className="text-xs text-slate-400 font-mono">• ${flags.length} Flags Configured • ${activeCount} Active</span>
          </div>
          <h1 className="text-2xl font-black text-white">App Feature Flags &amp; Granular Rollouts</h1>
          <p className="text-xs text-slate-400">
            Control live app capabilities, rollout percentage, countries, platforms, and minimum app version.
          </p>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs flex items-center justify-between">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="text-slate-400 hover:text-white" aria-label="Dismiss">✕</button>
        </div>
      )}

      {flags.length === 0 ? (
        <div className="p-8 rounded-3xl glass-card border border-slate-800 text-center text-sm text-slate-400">
          No live feature flags were returned by the backend.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {flags.map((flag) => {
            const draft = drafts[flag.key] || {
              countries: flag.countries || [],
              platforms: flag.platforms || [],
              minAppVersion: flag.minAppVersion || '',
              rolloutPercentage: flag.rolloutPercentage ?? 0,
            };
            const isSaving = savingKey === flag.key;

            return (
              <div key={flag.key} className={'p-6 rounded-3xl glass-card border transition-all space-y-5 ' + (
                flag.enabled ? 'border-slate-800 hover:border-purple-500/40' : 'border-slate-900 opacity-90'
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-white">{flag.name}</span>
                      {flag.isBetaOnly && <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold">BETA</span>}
                      {flag.requiresConfirmation && <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-mono font-bold">CRITICAL</span>}
                    </div>
                    <span className="text-[11px] font-mono text-purple-400 block">{flag.key}</span>
                  </div>

                  <button
                    onClick={() => handleToggleClick(flag)}
                    disabled={!canEdit || isSaving}
                    aria-label={flag.enabled ? 'Disable ' + flag.name : 'Enable ' + flag.name}
                    className={'relative w-12 h-6 rounded-full transition-colors shrink-0 ' + (flag.enabled ? 'bg-purple-600' : 'bg-slate-800') + ((!canEdit || isSaving) ? ' cursor-not-allowed opacity-60' : '')}
                  >
                    <span className={'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ' + (flag.enabled ? 'translate-x-6' : 'translate-x-0')} />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{flag.description}</p>

                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Percentage Rollout</span>
                    <span className="text-purple-400 font-mono font-bold">{draft.rolloutPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={draft.rolloutPercentage}
                    onChange={(e) => updateLocalDraft(flag.key, { rolloutPercentage: parseInt(e.target.value, 10) })}
                    disabled={!canEdit || !flag.enabled || isSaving}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0% — Off for rollout</span>
                    <span>100% — Everyone eligible</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Globe className="w-3.5 h-3.5 text-sky-400" />Countries</div>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRY_OPTIONS.map((country) => {
                      const checked = draft.countries.includes(country);
                      return (
                        <label key={country} className={'px-2.5 py-1.5 rounded-lg border text-[10px] font-mono cursor-pointer transition-colors ' + (checked ? 'bg-sky-500/10 border-sky-500/40 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-500') + ((!canEdit || isSaving) ? ' pointer-events-none opacity-60' : '')}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => updateLocalDraft(flag.key, { countries: checked ? draft.countries.filter((item) => item !== country) : [...draft.countries, country] })}
                          />
                          {country}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Smartphone className="w-3.5 h-3.5 text-indigo-400" />Platforms</div>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_OPTIONS.map((platform) => {
                      const checked = draft.platforms.includes(platform);
                      return (
                        <label key={platform} className={'px-2.5 py-1.5 rounded-lg border text-[10px] font-mono cursor-pointer transition-colors ' + (checked ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500') + ((!canEdit || isSaving) ? ' pointer-events-none opacity-60' : '')}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => updateLocalDraft(flag.key, { platforms: checked ? draft.platforms.filter((item) => item !== platform) : [...draft.platforms, platform] })}
                          />
                          {platform === 'android' ? 'Android' : 'iOS'}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-300" htmlFor={'version-' + flag.key}>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />Minimum App Version
                  </label>
                  <input
                    id={'version-' + flag.key}
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 1.0.50"
                    value={draft.minAppVersion}
                    onChange={(e) => updateLocalDraft(flag.key, { minAppVersion: e.target.value })}
                    disabled={!canEdit || isSaving}
                    className="w-full rounded-xl bg-slate-950/70 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/60"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="text-[10px] text-slate-500">
                    {flag.enabled ? 'Changes affect eligible live app users.' : 'Flag is disabled; targeting is saved for when it is enabled.'}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => resetDraft(flag)} disabled={!canEdit || isSaving} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-semibold hover:text-white disabled:opacity-50 flex items-center gap-1.5">
                      <RotateCcw className="w-3 h-3" />Reset
                    </button>
                    <button onClick={() => void saveTargeting(flag)} disabled={!canEdit || isSaving} className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold disabled:opacity-50 flex items-center gap-1.5">
                      <Save className="w-3 h-3" />{isSaving ? 'Saving…' : 'Save Targeting'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl glass-card border border-amber-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Confirm Critical Feature Toggle</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are toggling <strong className="text-white">{confirmFlag.name}</strong> ({confirmFlag.key}). This action directly impacts live mobile app user sessions.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setConfirmFlag(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
              <button onClick={() => void executeToggle(confirmFlag.key)} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20">Confirm &amp; Audit Log Action</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
