import React, { useEffect, useMemo, useState } from 'react';
import { instrumentsConfig } from '../../data';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { OficinaFocusTarget, OficinaGrooveTier, useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { Language } from '../../types';
import { Balanco16StepTimeline } from '../balanco/Balanco16StepTimeline';
import { BalancoEditorPanel } from '../balanco/BalancoEditorPanel';
import { GrooveEffectiveSource, OficinaGrooveScopeBar } from '../balanco/OficinaGrooveScopeBar';

interface SettingsGrooveTabProps {
  lang: Language;
}

const resolveFocusTier = (focus: OficinaFocusTarget | null): OficinaGrooveTier => {
  if (focus?.grooveTier) return focus.grooveTier;
  if (focus?.patternId !== undefined && focus?.patternId !== null) return 'pattern';
  if (focus?.trackId !== undefined && focus?.trackId !== null) return 'track';
  return 'global';
};

export const SettingsGrooveTab: React.FC<SettingsGrooveTabProps> = ({ lang }) => {
  const isFr = lang === 'fr';
  const globalSwing = useTransportStore((s) => s.globalSwing);
  const setGlobalSwing = useTransportStore((s) => s.setGlobalSwing);
  const tracks = useSequencerStore((s) => s.tracks);
  const bpm = useSequencerStore((s) => s.bpm);
  const handleTrackBalancoChange = useSequencerStore((s) => s.handleTrackBalancoChange);
  const handlePatternBalancoChange = useSequencerStore((s) => s.handlePatternBalancoChange);
  const openInstrumentDetailAt = useSequencerStore((s) => s.openInstrumentDetailAt);
  const presets = useBalancoStore((s) => s.presets);
  const oficinaFocus = useSequencerSettingsStore((s) => s.oficinaFocus);
  const setIsSettingsOpen = useSequencerSettingsStore((s) => s.setIsSettingsOpen);

  const [tier, setTier] = useState<OficinaGrooveTier>(() => resolveFocusTier(oficinaFocus));
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(() =>
    oficinaFocus?.trackId !== undefined && oficinaFocus?.trackId !== null ? Number(oficinaFocus.trackId) : null
  );
  const [selectedPatternId, setSelectedPatternId] = useState<number | null>(() =>
    oficinaFocus?.patternId !== undefined && oficinaFocus?.patternId !== null ? Number(oficinaFocus.patternId) : null
  );

  useEffect(() => {
    if (!oficinaFocus) return;
    setTier(resolveFocusTier(oficinaFocus));
    if (oficinaFocus.trackId !== undefined && oficinaFocus.trackId !== null) setSelectedTrackId(Number(oficinaFocus.trackId));
    if (oficinaFocus.patternId !== undefined && oficinaFocus.patternId !== null) setSelectedPatternId(Number(oficinaFocus.patternId));
  }, [oficinaFocus]);

  const eligibleTracks = useMemo(
    () => tracks.filter((t) => !t.isBusFolder && (!t.isLinkFolder || t.id === selectedTrackId) && Array.isArray(t.patterns) && t.patterns.length > 0),
    [tracks, selectedTrackId]
  );
  const activeTrack = useMemo(
    () => (selectedTrackId !== null ? eligibleTracks.find((t) => t.id === selectedTrackId) : undefined) ?? eligibleTracks[0] ?? null,
    [eligibleTracks, selectedTrackId]
  );
  const activePattern = useMemo(() => {
    if (!activeTrack) return null;
    const explicit = selectedPatternId !== null ? activeTrack.patterns.find((p) => p.id === selectedPatternId) : undefined;
    return explicit ?? activeTrack.patterns.find((p) => p.id === activeTrack.selectedPatternId) ?? activeTrack.patterns[0] ?? null;
  }, [activeTrack, selectedPatternId]);

  const trackOptions = useMemo(
    () => eligibleTracks.map((t, idx) => ({ id: t.id, label: t.customName?.trim() || `${instrumentsConfig[t.instrumentIdx]?.name ?? 'Pupitre'} #${idx + 1}` })),
    [eligibleTracks]
  );
  const patternOptions = useMemo(
    () => (activeTrack ? activeTrack.patterns.map((p) => ({ id: p.id, label: p.name || `Motif ${p.id}` })) : []),
    [activeTrack]
  );

  const trackPresetId = activeTrack?.balancoPresetId || undefined;
  const trackAmount = activeTrack ? (activeTrack.balancoAmount ?? activeTrack.swingIntensity ?? 100) : 100;
  const patternPresetId = activePattern?.balancoPresetId || undefined;
  const patternAmount = activePattern ? (activePattern.balancoAmount ?? activePattern.swingIntensity ?? 100) : 100;
  const presetLabel = (id?: string) => presets.find((p) => p.id === id)?.name ?? 'Balanço Global';

  let effectiveSource: GrooveEffectiveSource = 'global-root';
  let canResetInheritance = false;
  let effectiveSummary = globalSwing.mode === 'off' ? 'Neutre (0%)' : `${globalSwing.mode === 'custom' ? (isFr ? 'Atelier' : 'Ateliê') : 'Balanço'} • ${globalSwing.swingIntensity ?? 100}%`;
  if (tier === 'track' && activeTrack) {
    canResetInheritance = Boolean(trackPresetId) || trackAmount !== 100;
    effectiveSource = canResetInheritance ? 'local-override' : 'inherited-global';
    effectiveSummary = `${trackPresetId ? presetLabel(trackPresetId) : 'Preset Global'} • ${trackAmount}%`;
  } else if (tier === 'pattern' && activeTrack && activePattern) {
    canResetInheritance = Boolean(patternPresetId) || patternAmount !== 100;
    effectiveSource = canResetInheritance ? 'local-override' : Boolean(trackPresetId) || trackAmount !== 100 ? 'inherited-track' : 'inherited-global';
    effectiveSummary = `${presetLabel(patternPresetId ?? trackPresetId)} • ${patternAmount}% (${isFr ? 'Piste' : 'Faixa'} ${trackAmount}%)`;
  }

  const scopeTrackLabel = trackOptions.find((o) => o.id === activeTrack?.id)?.label ?? '';
  const scopeTitle = tier === 'global' ? (isFr ? 'Morceau Global' : 'Música Global') : tier === 'track' ? scopeTrackLabel : `${scopeTrackLabel} • ${activePattern?.name ?? ''}`;

  return (
    <div className="flex flex-col gap-4 text-[var(--cordel-text)]">
      <OficinaGrooveScopeBar
        lang={lang} tier={tier} onTierChange={setTier} trackOptions={trackOptions}
        selectedTrackId={activeTrack?.id ?? null} onTrackChange={(id) => { setSelectedTrackId(id); setSelectedPatternId(null); }}
        patternOptions={patternOptions} selectedPatternId={activePattern?.id ?? null} onPatternChange={setSelectedPatternId}
        effectiveSource={effectiveSource} effectiveSummary={effectiveSummary} canResetInheritance={canResetInheritance}
        onResetInheritance={() => {
          if (tier === 'track' && activeTrack) handleTrackBalancoChange(activeTrack.id, '', 100);
          else if (tier === 'pattern' && activeTrack && activePattern) handlePatternBalancoChange(activeTrack.id, activePattern.id, undefined, 100);
        }}
        onOpenInEditor={() => {
          if (!activeTrack) return;
          setIsSettingsOpen(false);
          openInstrumentDetailAt({ trackId: activeTrack.id, patternId: tier === 'pattern' && activePattern ? activePattern.id : (activeTrack.selectedPatternId ?? activeTrack.patterns[0]?.id ?? null) });
        }}
      />
      <Balanco16StepTimeline lang={lang} bpm={bpm} globalSwing={globalSwing} track={tier === 'global' ? null : activeTrack} pattern={tier === 'pattern' ? activePattern : null} scopeTitle={scopeTitle} />
      <div className="p-4 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] rounded-sm shadow-[3px_3px_0px_var(--cordel-shadow-color)]">
        <BalancoEditorPanel
          globalSwing={globalSwing} setGlobalSwing={setGlobalSwing} lang={lang} compact={true}
          overrideScope={tier === 'global' ? undefined : {
            tier, presetId: tier === 'track' ? trackPresetId : patternPresetId, amount: tier === 'track' ? trackAmount : patternAmount,
            onPresetChange: (val) => {
              if (tier === 'track' && activeTrack) handleTrackBalancoChange(activeTrack.id, val, trackAmount);
              else if (tier === 'pattern' && activeTrack && activePattern) handlePatternBalancoChange(activeTrack.id, activePattern.id, val || undefined, patternAmount);
            },
            onAmountChange: (val) => {
              if (tier === 'track' && activeTrack) handleTrackBalancoChange(activeTrack.id, activeTrack.balancoPresetId ?? '', val);
              else if (tier === 'pattern' && activeTrack && activePattern) handlePatternBalancoChange(activeTrack.id, activePattern.id, activePattern.balancoPresetId, val);
            },
            onSwitchToGlobal: () => setTier('global'),
          }}
        />
      </div>
    </div>
  );
};
