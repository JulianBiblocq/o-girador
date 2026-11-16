import React, { useCallback } from 'react';
import { Keyboard, Radio, X, SlidersHorizontal } from 'lucide-react';
import { useMidiStore } from '../../../stores/useMidiStore';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../../stores/useSequencerSettingsStore';
import { useDesktopWorkspaceStore } from '../../../stores/useDesktopWorkspaceStore';
import { formatMidiKey } from '../../midi-manager/midiFormatters';

export interface StrokeMidiAndKeyBadgeProps {
  trackId: number;
  instrumentId: string;
  symbol: string;
  shortcut?: string;
  isFr: boolean;
  trackLabel?: string;
  patternId?: number;
  patternLabel?: string;
  activeTool?: string;
}

export const StrokeMidiAndKeyBadge: React.FC<StrokeMidiAndKeyBadgeProps> = React.memo((props) => {
  const { trackId, instrumentId, symbol, shortcut, isFr, trackLabel, patternId, patternLabel, activeTool } = props;

  const mappedKey = useMidiStore(
    useCallback((s) => {
      for (const k in s.mappings) {
        const num = Number(k);
        const m = s.mappings[num];
        if (m && String(m.trackId) === String(trackId) && m.symbol === symbol) return num;
      }
      return null;
    }, [trackId, symbol])
  );

  const isWaiting = useMidiStore(
    useCallback(
      (s) => Boolean(s.waitingForMidiStroke && String(s.waitingForMidiStroke.trackId) === String(trackId) && s.waitingForMidiStroke.symbol === symbol),
      [trackId, symbol]
    )
  );

  const handleToggleLearn = useCallback(() => {
    const midi = useMidiStore.getState();
    if (isWaiting) {
      midi.setWaitingForMidiStroke(null);
      midi.setMidiLearnActive(false);
    } else {
      midi.setMidiLearnActive(true);
      midi.setWaitingForMidiStroke({ trackId: String(trackId), instrumentId, symbol });
    }
  }, [isWaiting, trackId, instrumentId, symbol]);

  const handleUnmap = useCallback(() => {
    if (mappedKey !== null) useMidiStore.getState().removeMidiMapping(mappedKey);
  }, [mappedKey]);

  const handleOpenOficinaMidi = useCallback(() => {
    const st = useSequencerStore.getState();
    const returnContext = {
      trackId, trackLabel, patternId: patternId ?? null, patternLabel,
      stepIdx: st.selectedStepIdx, isPreRoll: st.selectedStepIsPreRoll, subIndex: st.selectedSubIndex, activeTool: activeTool ?? null,
    };
    if (!useDesktopWorkspaceStore.getState().isSatelliteOpen) st.closeDetailEditor();
    useSequencerSettingsStore.getState().openOficinaSection('midi', { focus: { trackId, instrumentId }, returnContext });
  }, [trackId, instrumentId, trackLabel, patternId, patternLabel, activeTool]);

  const keyLabel = shortcut || symbol;

  return (
    <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 mt-0.5 border-t border-[var(--cordel-ink-dark)]/15 text-[9px] font-mono select-none w-full min-w-0">
      <div className="flex items-center gap-1 min-w-0">
        <span
          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm bg-[var(--cordel-surface-elevated)] border border-[var(--cordel-ink-dark)]/40 text-[var(--cordel-ink-dark)] font-bold shrink-0"
          title={isFr ? `Raccourci clavier PC : touche [${keyLabel}]` : `Atalho de teclado PC: tecla [${keyLabel}]`}
        >
          <Keyboard size={9} />
          <span>[{keyLabel}]</span>
        </span>
        {mappedKey !== null && !isWaiting && (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm bg-[var(--cordel-parchment-surface)] border border-[var(--cordel-ink-dark)]/50 text-[var(--cordel-accent-readable)] font-bold truncate max-w-[105px]">
            <span className="truncate">{formatMidiKey(mappedKey)}</span>
            <button
              type="button" onClick={handleUnmap}
              className="ml-0.5 hover:text-[var(--cordel-status-danger)] cursor-pointer shrink-0"
              title={isFr ? 'Supprimer ce mapping MIDI' : 'Remover este mapeamento MIDI'}
            >
              <X size={9} />
            </button>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          data-testid={`midi-learn-btn-${symbol}`}
          data-tour-id="editor-midi-learn-btn"
          onClick={handleToggleLearn}
          className={`h-5 px-1.5 inline-flex items-center gap-0.5 rounded-sm border border-[var(--cordel-ink-dark)] font-cactus font-bold uppercase tracking-wide cursor-pointer transition-opacity ${
            isWaiting
              ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] animate-pulse'
              : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
          }`}
          title={isFr ? 'Apprendre un pad ou une note MIDI à la volée' : 'Aprender um pad ou nota MIDI na hora'}
        >
          <Radio size={9} />
          <span>{isWaiting ? (isFr ? 'Pad...' : 'Pad...') : 'Learn'}</span>
        </button>
        <button
          type="button"
          onClick={handleOpenOficinaMidi}
          className="w-5 h-5 inline-flex items-center justify-center rounded-sm bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-ink-dark)] cursor-pointer transition-colors"
          title={isFr ? 'Ouvrir les Contrôleurs MIDI dans A Oficina' : 'Abrir Controladores MIDI em A Oficina'}
        >
          <SlidersHorizontal size={9} />
        </button>
      </div>
    </div>
  );
});

StrokeMidiAndKeyBadge.displayName = 'StrokeMidiAndKeyBadge';
