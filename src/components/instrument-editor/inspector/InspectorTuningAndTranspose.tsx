
import React from 'react';
import { Sliders, ChevronDown } from 'lucide-react';
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

  if (!isVoice && !isTunableDrum) return null;

  return (
    <div className="border-t border-[#1a1a1a]/20 pt-1 flex flex-col gap-1.5 mt-auto shrink-0">
      {isVoice ? (
        <>
          {/* Widget Transposition vocale sur deux lignes */}
          <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] p-2 rounded-sm select-none">
            {/* Ligne 1 : Titre */}
            <div className="text-xs font-cactus font-bold uppercase tracking-wider text-[#1a1a1a] mb-1.5">
              {isFr ? 'Transposition' : 'Transposição'}
            </div>

            {/* Ligne 2 : Grille / Flex des 5 commandes */}
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => onTranspose(-7)}
                className="flex-1 h-7 flex items-center justify-center bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] font-cactus font-bold text-xs rounded transition-colors"
                title={isFr ? 'Transposer de -7 demi-tons (Quinte descendante)' : 'Transpor -7 semitons (Quinta descendente)'}
              >
                -7
              </button>

              <button
                type="button"
                onClick={() => onTranspose(-1)}
                className="w-7 h-7 flex items-center justify-center bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] font-cactus font-bold text-xs rounded transition-colors"
                title={isFr ? 'Transposer de -1 demi-ton' : 'Transpor -1 semitom'}
              >
                -
              </button>

              <span className="w-8 text-center font-cactus font-black text-sm text-[#8b2a1a] tabular-nums">
                {vocalTransposeSteps > 0 ? `+${vocalTransposeSteps}` : vocalTransposeSteps}
              </span>

              <button
                type="button"
                onClick={() => onTranspose(1)}
                className="w-7 h-7 flex items-center justify-center bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] font-cactus font-bold text-xs rounded transition-colors"
                title={isFr ? 'Transposer de +1 demi-ton' : 'Transpor +1 semitom'}
              >
                +
              </button>

              <button
                type="button"
                onClick={() => onTranspose(7)}
                className="flex-1 h-7 flex items-center justify-center bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] font-cactus font-bold text-xs rounded transition-colors"
                title={isFr ? 'Transposer de +7 demi-tons (Quinte ascendante)' : 'Transpor +7 semitons (Quinta ascendente)'}
              >
                +7
              </button>
            </div>
          </div>

          <VocalTimbreSelector lang={lang} />
        </>
      ) : (
        <details className="border-t-2 border-[#1a1a1a]/20 pt-2 mt-2 group">
          <summary className="text-xs font-bold uppercase tracking-wider cursor-pointer list-none flex items-center justify-between py-1.5 px-2 select-none [&::-webkit-details-marker]:hidden bg-[#f4ecd8] cordel-border-sm">
            <span className="flex items-center gap-1.5 text-[#1a1a1a]">
              <Sliders className="w-3.5 h-3.5 text-[#8b2a1a]" />
              <span>{isFr ? 'Accordage du fût' : 'Afinação do tambor'}</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-[#8b2a1a] font-bold">
              <span>{pitchOffset > 0 ? `+${pitchOffset}` : pitchOffset} st</span>
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>
          <div className="pt-2">
            <PercussionTuningControl trackId={trackId} onPreview={onPreviewDrum} showPreviewButton={true} />
          </div>
        </details>
      )}
    </div>
  );
});

InspectorTuningAndTranspose.displayName = 'InspectorTuningAndTranspose';
