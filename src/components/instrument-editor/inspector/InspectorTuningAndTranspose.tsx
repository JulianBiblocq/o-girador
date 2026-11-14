import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../../stores/useSequencerSettingsStore';
import { instrumentsConfig } from '../../../data';
import { PercussionTuningControl } from '../../PercussionTuningControl';
import { VocalTimbreSelector } from '../VocalTimbreSelector';

interface InspectorTuningAndTransposeProps {
  isVoice: boolean; isTunableDrum: boolean; pitchOffset: number; vocalTransposeSteps: number;
  lang: string; trackId: number; instrumentId?: string; trackLabel?: string;
  patternId?: number; patternLabel?: string; activeTool?: string;
  onTranspose: (semitones: number) => void; onPreviewDrum: () => void;
}

export const InspectorTuningAndTranspose: React.FC<InspectorTuningAndTransposeProps> = React.memo(({
  isVoice, isTunableDrum, pitchOffset, vocalTransposeSteps, lang, trackId,
  instrumentId, trackLabel, patternId, patternLabel, activeTool, onTranspose, onPreviewDrum,
}) => {
  const isFr = lang === 'fr';
  const trackDecay = useSequencerStore((state) => state.tracks.find((t) => t.id === trackId)?.trackDecay ?? 100);
  const setTrackDecay = useSequencerStore((state) => state.setTrackDecay);
  const expandTuning = useSequencerStore((state) => Boolean(state.editorDeepLink?.expandTuning));
  const [isTuningOpen, setIsTuningOpen] = useState<boolean>(() => Boolean(useSequencerStore.getState().editorDeepLink?.expandTuning));

  useEffect(() => {
    if (expandTuning) setIsTuningOpen(true);
  }, [expandTuning]);

  const handleOpenLutherie = useCallback(() => {
    const st = useSequencerStore.getState();
    const tr = st.tracks.find((t) => t.id === trackId);
    const resolvedInstId = instrumentId || (tr ? instrumentsConfig[tr.instrumentIdx]?.id : undefined) || null;
    const returnContext = {
      trackId, trackLabel: trackLabel || tr?.customName, patternId: patternId ?? null, patternLabel,
      stepIdx: st.selectedStepIdx, isPreRoll: st.selectedStepIsPreRoll, subIndex: st.selectedSubIndex, activeTool: activeTool ?? null,
    };
    st.closeDetailEditor();
    useSequencerSettingsStore.getState().openOficinaSection('lutherie', {
      focus: { trackId, instrumentId: resolvedInstId }, returnContext,
    });
  }, [trackId, instrumentId, trackLabel, patternId, patternLabel, activeTool]);

  if (!isVoice && !isTunableDrum) return null;

  const btnCls = 'h-7 flex items-center justify-center bg-[var(--cordel-parchment-bg)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] font-cactus font-bold text-xs rounded transition-colors cursor-pointer';

  return (
    <div className="border-t border-[var(--cordel-ink-dark)]/20 pt-1 flex flex-col gap-1.5 mt-auto shrink-0">
      {isVoice ? (
        <>
          <div className="bg-[var(--cordel-parchment-bg)] border-2 border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] p-2 rounded-sm select-none">
            <div className="text-xs font-cactus font-bold uppercase tracking-wider text-[var(--cordel-ink-dark)] mb-1.5">
              {isFr ? 'Transposition' : 'Transposição'}
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <button type="button" onClick={() => onTranspose(-7)} className={`flex-1 ${btnCls}`} title={isFr ? 'Transposer de -7 demi-tons' : 'Transpor -7 semitons'}>-7</button>
              <button type="button" onClick={() => onTranspose(-1)} className={`w-7 ${btnCls}`} title={isFr ? 'Transposer de -1 demi-ton' : 'Transpor -1 semitom'}>-</button>
              <span className="w-8 text-center font-cactus font-black text-sm text-[var(--cordel-accent-readable)] tabular-nums">
                {vocalTransposeSteps > 0 ? `+${vocalTransposeSteps}` : vocalTransposeSteps}
              </span>
              <button type="button" onClick={() => onTranspose(1)} className={`w-7 ${btnCls}`} title={isFr ? 'Transposer de +1 demi-ton' : 'Transpor +1 semitom'}>+</button>
              <button type="button" onClick={() => onTranspose(7)} className={`flex-1 ${btnCls}`} title={isFr ? 'Transposer de +7 demi-tons' : 'Transpor +7 semitons'}>+7</button>
            </div>
          </div>
          <VocalTimbreSelector lang={lang} />
        </>
      ) : (
        <div className="border-t-2 border-[var(--cordel-ink-dark)]/20 pt-2 mt-2 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 w-full min-w-0">
            <button
              type="button" aria-expanded={isTuningOpen} onClick={() => setIsTuningOpen((prev) => !prev)}
              className="flex-1 min-w-0 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-between py-1.5 px-2 select-none bg-[var(--cordel-parchment-bg)] cordel-border-sm text-[var(--cordel-ink-dark)]"
            >
              <span className="flex items-center gap-1.5 min-w-0 truncate">
                <Sliders className="w-3.5 h-3.5 text-[var(--cordel-accent-readable)] shrink-0" />
                <span className="truncate">{isFr ? 'Accordage & Peau' : 'Afinação & Pele'}</span>
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--cordel-accent-readable)] font-bold shrink-0 ml-1">
                <span>{pitchOffset > 0 ? `+${pitchOffset}` : pitchOffset} st · {trackDecay}%</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTuningOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
            <button
              type="button" data-testid="editor-open-oficina-lutherie" onClick={handleOpenLutherie}
              className="h-8 px-2 flex items-center gap-1 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] cordel-border-sm text-[10px] font-cactus font-bold uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
              title={isFr ? 'Ouvrir le Banc de Lutherie dans A Oficina' : 'Abrir a Bancada de Lutheria em A Oficina'}
            >
              <SlidersHorizontal size={12} />
              <span>{isFr ? 'Lutherie' : 'Lutheria'}</span>
            </button>
          </div>
          {isTuningOpen && (
            <div className="flex flex-col gap-2">
              <PercussionTuningControl trackId={trackId} onPreview={onPreviewDrum} showPreviewButton={true} />
              <div className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-text)] p-2 flex flex-col gap-1 select-none">
                <div className="flex items-center justify-between text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)]">
                  <span>{isFr ? 'Résonance / Decay global' : 'Ressonância / Decay global'}</span>
                  <span className="font-mono text-[var(--cordel-accent-readable)]">{trackDecay}%</span>
                </div>
                <input
                  type="range" min={15} max={100} step={1} value={trackDecay}
                  onChange={(e) => setTrackDecay(trackId, Number(e.target.value))}
                  onPointerUp={onPreviewDrum} onKeyUp={onPreviewDrum}
                  className="w-full accent-[var(--cordel-wood)] cursor-pointer h-1.5"
                  aria-label={isFr ? 'Résonance / Decay global de la piste' : 'Ressonância / Decay global da faixa'}
                />
                <div className="flex justify-between text-[9px] font-bold text-[var(--cordel-text)]/70">
                  <span>{isFr ? 'Sec (15%)' : 'Seco (15%)'}</span>
                  <span>{isFr ? 'Plein (100%)' : 'Pleno (100%)'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

InspectorTuningAndTranspose.displayName = 'InspectorTuningAndTranspose';
