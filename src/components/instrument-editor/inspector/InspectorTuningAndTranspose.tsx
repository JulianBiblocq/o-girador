import React from 'react';
import { Sliders, ChevronDown } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { PercussionTuningControl } from '../../PercussionTuningControl';
import { VocalTimbreSelector } from '../VocalTimbreSelector';

interface InspectorTuningAndTransposeProps {
  isVoice: boolean;
  isTunableDrum: boolean;
  pitchOffset: number;
  vocalTransposeSteps: number;
  lang: string;
  trackId: number;
  onTranspose: (semitones: number) => void;
  onPreviewDrum: () => void;
}

export const InspectorTuningAndTranspose: React.FC<InspectorTuningAndTransposeProps> = React.memo(({
  isVoice,
  isTunableDrum,
  pitchOffset,
  vocalTransposeSteps,
  lang,
  trackId,
  onTranspose,
  onPreviewDrum,
}) => {
  const isFr = lang === 'fr';
  const trackDecay = useSequencerStore(state => state.tracks.find(t => t.id === trackId)?.trackDecay ?? 100);
  const setTrackDecay = useSequencerStore(state => state.setTrackDecay);

  if (!isVoice && !isTunableDrum) return null;

  const handleDecayCommit = () => {
    onPreviewDrum();
  };

  return (
    <div className="border-t border-[var(--cordel-ink-dark)]/20 pt-1 flex flex-col gap-1.5 mt-auto shrink-0">
      {isVoice ? (
        <>
          <div className="bg-[var(--cordel-parchment-bg)] border-2 border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] p-2 rounded-sm select-none">
            <div className="text-xs font-cactus font-bold uppercase tracking-wider text-[var(--cordel-ink-dark)] mb-1.5">
              {isFr ? 'Transposition' : 'Transposição'}
            </div>

            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => onTranspose(-7)}
                className="flex-1 h-7 flex items-center justify-center bg-[var(--cordel-parchment-bg)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] font-cactus font-bold text-xs rounded transition-colors"
                title={isFr ? 'Transposer de -7 demi-tons (Quinte descendante)' : 'Transpor -7 semitons (Quinta descendente)'}
              >
                -7
              </button>

              <button
                type="button"
                onClick={() => onTranspose(-1)}
                className="w-7 h-7 flex items-center justify-center bg-[var(--cordel-parchment-bg)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] font-cactus font-bold text-xs rounded transition-colors"
                title={isFr ? 'Transposer de -1 demi-ton' : 'Transpor -1 semitom'}
              >
                -
              </button>

              <span className="w-8 text-center font-cactus font-black text-sm text-[var(--cordel-wood)] tabular-nums">
                {vocalTransposeSteps > 0 ? `+${vocalTransposeSteps}` : vocalTransposeSteps}
              </span>

              <button
                type="button"
                onClick={() => onTranspose(1)}
                className="w-7 h-7 flex items-center justify-center bg-[var(--cordel-parchment-bg)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] font-cactus font-bold text-xs rounded transition-colors"
                title={isFr ? 'Transposer de +1 demi-ton' : 'Transpor +1 semitom'}
              >
                +
              </button>

              <button
                type="button"
                onClick={() => onTranspose(7)}
                className="flex-1 h-7 flex items-center justify-center bg-[var(--cordel-parchment-bg)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] font-cactus font-bold text-xs rounded transition-colors"
                title={isFr ? 'Transposer de +7 demi-tons (Quinte ascendante)' : 'Transpor +7 semitons (Quinta ascendente)'}
              >
                +7
              </button>
            </div>
          </div>

          <VocalTimbreSelector lang={lang} />
        </>
      ) : (
        <details className="border-t-2 border-[var(--cordel-ink-dark)]/20 pt-2 mt-2 group">
          <summary className="text-xs font-bold uppercase tracking-wider cursor-pointer list-none flex items-center justify-between py-1.5 px-2 select-none [&::-webkit-details-marker]:hidden bg-[var(--cordel-parchment-bg)] cordel-border-sm">
            <span className="flex items-center gap-1.5 text-[var(--cordel-ink-dark)]">
              <Sliders className="w-3.5 h-3.5 text-[var(--cordel-wood)]" />
              <span>{isFr ? 'Accordage & Peau' : 'Afinação & Pele'}</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--cordel-wood)] font-bold">
              <span>{pitchOffset > 0 ? `+${pitchOffset}` : pitchOffset} st · {trackDecay}%</span>
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>
          <div className="pt-2 flex flex-col gap-2">
            <PercussionTuningControl trackId={trackId} onPreview={onPreviewDrum} showPreviewButton={true} />

            <div className="bg-[var(--cordel-bg)] border-2 border-[var(--cordel-text)] p-2 flex flex-col gap-1 select-none">
              <div className="flex items-center justify-between text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)]">
                <span>{isFr ? 'Résonance / Decay global' : 'Ressonância / Decay global'}</span>
                <span className="font-mono text-[var(--cordel-wood)]">{trackDecay}%</span>
              </div>
              <input
                type="range"
                min={15}
                max={100}
                step={1}
                value={trackDecay}
                onChange={(e) => setTrackDecay(trackId, Number(e.target.value))}
                onPointerUp={handleDecayCommit}
                onKeyUp={handleDecayCommit}
                className="w-full accent-[var(--cordel-wood)] cursor-pointer h-1.5"
                aria-label={isFr ? 'Résonance / Decay global de la piste' : 'Ressonância / Decay global da faixa'}
              />
              <div className="flex justify-between text-[9px] font-bold text-[var(--cordel-text)]/70">
                <span>{isFr ? 'Sec (15%)' : 'Seco (15%)'}</span>
                <span>{isFr ? 'Plein (100%)' : 'Pleno (100%)'}</span>
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  );
});

InspectorTuningAndTranspose.displayName = 'InspectorTuningAndTranspose';
