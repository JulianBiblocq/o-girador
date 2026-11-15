import React, { useState, useCallback } from 'react';
import { Waves, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../../stores/useSequencerSettingsStore';
import { useDesktopWorkspaceStore } from '../../../stores/useDesktopWorkspaceStore';
import { BalancoPresetItem } from './inspectorTypes';

export interface PatternInspectorBalancoControlProps {
  activePattern: any; trackId: number; isFr: boolean; isVoice: boolean;
  balancoPresets?: BalancoPresetItem[]; currentBalancoAmount: number;
  instrumentName?: string; patternLabel?: string; activeTool?: string;
  onBalancoChange?: (trackId: number, patternId: number, presetId: string | undefined, amount: number) => void;
}

export const PatternInspectorBalancoControl: React.FC<PatternInspectorBalancoControlProps> = React.memo(({
  activePattern, trackId, isFr, isVoice, balancoPresets = [], currentBalancoAmount,
  instrumentName, patternLabel, activeTool, onBalancoChange,
}) => {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const handleOpenOficinaPatternGroove = useCallback(() => {
    const st = useSequencerStore.getState();
    const pId = activePattern?.id ?? null;
    const returnContext = {
      trackId, trackLabel: instrumentName, patternId: pId, patternLabel: patternLabel || activePattern?.name,
      stepIdx: st.selectedStepIdx, isPreRoll: st.selectedStepIsPreRoll, subIndex: st.selectedSubIndex, activeTool: activeTool ?? null,
    };
    if (!useDesktopWorkspaceStore.getState().isSatelliteOpen) {
      st.closeDetailEditor();
    }
    useSequencerSettingsStore.getState().openOficinaSection('groove', {
      focus: { grooveTier: 'pattern', trackId, patternId: pId }, returnContext,
    });
  }, [trackId, instrumentName, activePattern?.id, activePattern?.name, patternLabel, activeTool]);

  const bridgeButton = (
    <button
      type="button" data-testid="editor-open-oficina-pattern-groove" onClick={handleOpenOficinaPatternGroove}
      className="h-5 px-1.5 flex items-center gap-1 rounded-sm bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] hover:brightness-110 active:scale-95 transition-all cursor-pointer text-[9px] font-cactus font-bold uppercase tracking-wide shrink-0"
      title={isFr ? 'Ajuster le Balanço de ce motif dans A Oficina' : 'Ajustar o Balanço deste padrão em A Oficina'}
    >
      <SlidersHorizontal size={10} />
      <span>Groove</span>
    </button>
  );

  const content = (
    <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-[var(--cordel-ink-dark)]/15 w-full min-w-0 box-border">
      <select
        value={activePattern.balancoPresetId || ''}
        onChange={(e) => onBalancoChange?.(trackId, activePattern.id, e.target.value || undefined, currentBalancoAmount)}
        style={{ colorScheme: 'light' }}
        className="flex-1 min-w-0 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border border-[var(--cordel-ink-dark)] px-1 py-0.5 text-[10px] font-bold rounded shadow-[1px_1px_0px_var(--cordel-ink-dark)] outline-none cursor-pointer truncate"
        title={isFr ? 'Héritage du preset de balanço' : 'Herança do preset de balanço'}
      >
        <option value="">{isFr ? "Hériter de l'instrument" : 'Herdar do instrumento'}</option>
        {balancoPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input
        type="range" min="0" max="100" value={currentBalancoAmount}
        onChange={(e) => onBalancoChange?.(trackId, activePattern.id, activePattern.balancoPresetId, parseInt(e.target.value, 10))}
        className="w-16 h-1.5 bg-[var(--cordel-ink-dark)]/20 rounded-full appearance-none cursor-pointer outline-none accent-[var(--cordel-wood)] shrink-0"
        title={isFr ? 'Dosage local du balanço pour ce motif' : 'Dosagem local do balanço para este padrão'}
      />
    </div>
  );

  if (isVoice) {
    return (
      <div className="bg-[var(--cordel-parchment-bg)]/60 p-1.5 border border-[var(--cordel-ink-dark)]/30 rounded shadow-xs select-none w-full min-w-0 box-border flex flex-col gap-1">
        <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
          <button
            type="button" aria-expanded={isVoiceOpen} onClick={() => setIsVoiceOpen((prev) => !prev)}
            className="flex-1 min-w-0 text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center justify-between text-[var(--cordel-ink-dark)]/80 hover:text-[var(--cordel-ink-dark)]"
          >
            <span className="flex items-center gap-1 min-w-0 truncate">
              <Waves size={11} className="text-[var(--cordel-accent-readable)] shrink-0" />
              <span className="truncate">Balanço / Swing</span>
              <span className="font-mono text-[var(--cordel-accent-readable)] shrink-0">({currentBalancoAmount}%)</span>
            </span>
            <ChevronRight size={11} className={`transition-transform shrink-0 ml-1 ${isVoiceOpen ? 'rotate-90' : ''}`} />
          </button>
          {bridgeButton}
        </div>
        {isVoiceOpen && content}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 bg-[var(--cordel-parchment-bg)]/60 p-2 border border-[var(--cordel-ink-dark)]/30 rounded shadow-xs select-none w-full min-w-0 box-border">
      <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold text-[var(--cordel-ink-dark)] w-full min-w-0">
        <span className="flex items-center gap-1 min-w-0 truncate">
          <Waves size={12} className="text-[var(--cordel-accent-readable)] shrink-0" />
          <span className="truncate">Balanço / Swing</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] text-[var(--cordel-accent-readable)] font-bold tabular-nums">{currentBalancoAmount}%</span>
          {bridgeButton}
        </div>
      </div>
      {content}
    </div>
  );
});

PatternInspectorBalancoControl.displayName = 'PatternInspectorBalancoControl';
