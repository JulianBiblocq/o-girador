import React, { useCallback } from 'react';
import { Waves, SlidersHorizontal } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../../stores/useSequencerSettingsStore';
import { useDesktopWorkspaceStore } from '../../../stores/useDesktopWorkspaceStore';

export interface HeaderBalancoControlProps {
  targetBalancoTrack: any;
  effectiveEditTrackId: number;
  balancoPresets: Array<{ id: string; name: string }>;
  handleTrackBalancoChange: (trackId: number, presetId: string, amount: number) => void;
  lang: string;
  trackLabel?: string;
  selectedPatternId?: number;
  activePatternId?: number;
  activeTool?: string;
}

export const HeaderBalancoControl: React.FC<HeaderBalancoControlProps> = React.memo(({
  targetBalancoTrack,
  effectiveEditTrackId,
  balancoPresets,
  handleTrackBalancoChange,
  lang,
  trackLabel,
  selectedPatternId,
  activePatternId,
  activeTool,
}) => {
  const isFr = lang === 'fr';
  const resolvedPatternId = selectedPatternId ?? activePatternId ?? targetBalancoTrack?.patterns?.[0]?.id ?? null;

  const handleOpenOficinaTrackGroove = useCallback(() => {
    const st = useSequencerStore.getState();
    const ptns = targetBalancoTrack?.patterns || [];
    const pIdx = resolvedPatternId !== null ? ptns.findIndex((p: any) => p.id === resolvedPatternId) : -1;
    const ptn = pIdx >= 0 ? ptns[pIdx] : undefined;
    const patternLabel = ptn?.name || (pIdx >= 0 ? `${isFr ? 'Motif' : 'Padrão'} ${pIdx + 1}` : undefined);
    const returnContext = {
      trackId: effectiveEditTrackId,
      trackLabel: trackLabel || targetBalancoTrack?.customName,
      patternId: resolvedPatternId,
      patternLabel,
      stepIdx: st.selectedStepIdx,
      isPreRoll: st.selectedStepIsPreRoll,
      subIndex: st.selectedSubIndex,
      activeTool: activeTool ?? null,
    };
    if (!useDesktopWorkspaceStore.getState().isSatelliteOpen) {
      st.closeDetailEditor();
    }
    useSequencerSettingsStore.getState().openOficinaSection('groove', {
      focus: { grooveTier: 'track', trackId: effectiveEditTrackId, patternId: resolvedPatternId },
      returnContext,
    });
  }, [targetBalancoTrack, resolvedPatternId, isFr, effectiveEditTrackId, trackLabel, activeTool]);

  if (!targetBalancoTrack) return null;

  const currentAmount = targetBalancoTrack.balancoAmount !== undefined
    ? targetBalancoTrack.balancoAmount
    : (targetBalancoTrack.swingIntensity !== undefined ? targetBalancoTrack.swingIntensity : 100);

  return (
    <div className="flex items-center gap-2 bg-[var(--cordel-parchment-bg)] px-2.5 py-1 rounded border-[2px] border-[var(--cordel-ink-dark)] text-xs font-bold select-none text-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_0px_var(--cordel-ink-dark)] shrink-0 flex-shrink-0">
      <Waves
        size={13}
        className="text-[var(--cordel-accent-readable)] shrink-0"
        aria-hidden="true"
      />
      <select
        data-testid="track-balanco-preset-select"
        value={targetBalancoTrack.balancoPresetId || 'maracatu-trad'}
        onChange={(e) => {
          handleTrackBalancoChange(effectiveEditTrackId, e.target.value, currentAmount);
        }}
        className="bg-[var(--cordel-surface-elevated)] border border-[var(--cordel-ink-dark)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] outline-none cursor-pointer max-w-[125px] truncate"
        title={isFr ? "Preset de Balanço par défaut de l'instrument" : 'Preset de Balanço padrão do instrumento'}
      >
        {balancoPresets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        data-testid="track-balanco-slider"
        type="range"
        min="0"
        max="100"
        value={currentAmount}
        onChange={(e) => {
          handleTrackBalancoChange(effectiveEditTrackId, targetBalancoTrack.balancoPresetId || 'maracatu-trad', Number(e.target.value));
        }}
        className="w-16 sm:w-20 h-2 bg-[var(--cordel-ink-dark)]/20 rounded-full appearance-none cursor-pointer outline-none accent-[var(--cordel-wood)]"
        title={isFr ? "Dosage du balanço pour l'instrument" : 'Dosagem do balanço para o instrumento'}
      />
      <span data-testid="track-balanco-amount-label" className="w-8 text-right font-cactus text-sm tabular-nums">
        {currentAmount}%
      </span>
      <button
        type="button"
        data-testid="editor-open-oficina-track-groove"
        onClick={handleOpenOficinaTrackGroove}
        className="h-6 px-1.5 flex items-center gap-1 rounded-sm bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] hover:brightness-110 active:scale-95 transition-all cursor-pointer text-[10px] font-cactus font-bold uppercase tracking-wide shrink-0"
        title={isFr ? 'Ajuster le Balanço de cette piste dans A Oficina' : 'Ajustar o Balanço desta faixa em A Oficina'}
      >
        <SlidersHorizontal size={11} />
        <span className="hidden xl:inline">{isFr ? 'Groove' : 'Groove'}</span>
      </button>
    </div>
  );
});

HeaderBalancoControl.displayName = 'HeaderBalancoControl';
