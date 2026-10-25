/**
 * Modale de réglage de la Signature Rythmique et subdivisions par pattern (< 125 lignes).
 */
import React, { useState, useEffect } from 'react';
import { PatternMetricOverride, PaperStepValue } from '../../types/paperWorkshop.types';
import { Settings2, X, RotateCcw, Check, Split, AlertCircle } from 'lucide-react';
import { hasPatternNotesInSecondHalf, PRESET_METRICS } from '../../utils/paper/paperPatternResizeHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patternName: string;
  globalTimeSig: string;
  currentOverride?: PatternMetricOverride;
  pupitreMap?: Partial<Record<string, PaperStepValue[]>>;
  onSaveOverride: (patName: string, override?: PatternMetricOverride) => void;
  onSplitSection?: (patName: string) => void;
  lang: 'fr' | 'pt';
}

export const PaperPatternOverrideModal: React.FC<Props> = ({
  isOpen, onClose, patternName, globalTimeSig, currentOverride, pupitreMap,
  onSaveOverride, onSplitSection, lang,
}) => {
  const isFr = lang === 'fr';
  const [selectedMetricId, setSelectedMetricId] = useState('4/4_16');

  useEffect(() => {
    if (isOpen) {
      const match = PRESET_METRICS.find((m) => m.steps === currentOverride?.steps && m.sig === currentOverride?.timeSignature);
      setSelectedMetricId(match ? match.id : `${globalTimeSig}_16`);
    }
  }, [isOpen, currentOverride, globalTimeSig]);

  if (!isOpen) return null;

  const chosen = PRESET_METRICS.find((m) => m.id === selectedMetricId) || PRESET_METRICS[0];
  const hasSecondHalfNotes = chosen.steps === 8 && hasPatternNotesInSecondHalf(pupitreMap, 8);

  const handleSave = () => {
    onSaveOverride(patternName, {
      timeSignature: chosen.sig,
      steps: chosen.steps,
      beatResolutions: chosen.res,
      isLocked: true,
    });
    onClose();
  };

  const handleSplit = () => {
    if (onSplitSection) onSplitSection(patternName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs font-sans text-xs">
      <div className="bg-[var(--cordel-surface)] border-3 border-[var(--cordel-border)] shadow-[4px_4px_0px_#000] max-w-md w-full p-4 flex flex-col gap-3 text-[var(--cordel-text)]">
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border)] pb-2">
          <span className="font-cactus font-bold uppercase text-sm text-[#8b2a1a] flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" />
            <span>{isFr ? `Signature Rythmique : [${patternName}]` : `Fórmula de Compasso : [${patternName}]`}</span>
          </span>
          <button type="button" onClick={onClose} className="p-1 cursor-pointer hover:bg-black/10"><X size={16} /></button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-bold text-[11px] text-[#8b2a1a] uppercase">{isFr ? 'Choisir la métrique & subdivision :' : 'Escolher fórmula & subdivisão :'}</label>
          <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto border border-[var(--cordel-border)]/40 p-1">
            {PRESET_METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMetricId(m.id)}
                className={`p-1.5 text-left text-[11px] cursor-pointer border flex justify-between items-center transition-colors ${
                  selectedMetricId === m.id
                    ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-[var(--cordel-border)]'
                    : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-transparent hover:bg-black/5'
                }`}
              >
                <span>{m.label}</span>
                <span className="font-mono text-[9px] opacity-75">{m.sig} ({m.steps}p)</span>
              </button>
            ))}
          </div>
        </div>

        {hasSecondHalfNotes && (
          <div className="p-2 bg-[#d97706]/15 border border-[#d97706] flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-[#b45309]">
              <AlertCircle size={14} className="shrink-0" />
              <span>{isFr ? 'Notes détectées sur la 2e moitié (pas 9 à 16)' : 'Notas detectadas na 2ª metade (passos 9 a 16)'}</span>
            </div>
            {onSplitSection && (
              <button
                type="button"
                onClick={handleSplit}
                className="self-start px-2 py-1 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-[10px] flex items-center gap-1 cursor-pointer border border-black shadow-[1px_1px_0px_#000]"
              >
                <Split size={12} />
                <span>{isFr ? 'Scinder en 2 mesures de 8 pas (A1 & A2)' : 'Dividir em 2 compassos de 8 passos'}</span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[var(--cordel-border)]/30">
          <button
            type="button"
            onClick={() => { onSaveOverride(patternName, undefined); onClose(); }}
            className="px-3 py-1.5 text-[10px] font-bold bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#e2d5b8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={12} className="text-[#1a1a1a]" /> <span>{isFr ? 'Rétablir Global' : 'Restaurar Global'}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[10px] font-bold bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#e2d5b8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer transition-colors"
            >
              {isFr ? 'Annuler' : 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 text-[10px] font-bold bg-[#8b2a1a] text-[#f4ecd8] hover:bg-[#9a3412] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer flex items-center gap-1 transition-colors"
            >
              <Check size={12} /> <span>{isFr ? 'Appliquer' : 'Aplicar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
