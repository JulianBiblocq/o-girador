/**
 * Modale de surcharge de métrique et BPM pour un pattern individuel (< 125 lignes).
 */
import React, { useState, useEffect } from 'react';
import { PatternMetricOverride } from '../../types/paperWorkshop.types';
import { Settings2, X, RotateCcw, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patternName: string;
  globalBpm: number;
  globalTimeSig: string;
  currentOverride?: PatternMetricOverride;
  onSaveOverride: (patName: string, override?: PatternMetricOverride) => void;
  lang: 'fr' | 'pt';
}

const PRESET_METRICS = [
  { id: '4/4_16', label: '4/4 Binaire (16 pas)', sig: '4/4', steps: 16, res: [4, 4, 4, 4] },
  { id: '2/4_8', label: '2/4 Binaire (8 pas)', sig: '2/4', steps: 8, res: [4, 4] },
  { id: '3/4_12', label: '3/4 Binaire (12 pas)', sig: '3/4', steps: 12, res: [4, 4, 4] },
  { id: '12/8_12', label: '12/8 Ternaire (12 pas)', sig: '12/8', steps: 12, res: [3, 3, 3, 3] },
  { id: '6/8_6', label: '6/8 Ternaire (6 pas)', sig: '6/8', steps: 6, res: [3, 3] },
  { id: '4/4_24', label: '4/4 Sextolets (24 pas)', sig: '4/4', steps: 24, res: [6, 6, 6, 6] },
  { id: '4/4_20', label: '4/4 Mixte Tremer (20 pas)', sig: '4/4', steps: 20, res: [6, 6, 4, 4] },
  { id: '4/4_32', label: '4/4 Deux Mesures (32 pas)', sig: '4/4', steps: 32, res: [4, 4, 4, 4, 4, 4, 4, 4] },
];

export const PaperPatternOverrideModal: React.FC<Props> = ({
  isOpen, onClose, patternName, globalBpm, globalTimeSig, currentOverride, onSaveOverride, lang,
}) => {
  const isFr = lang === 'fr';
  const [selectedMetricId, setSelectedMetricId] = useState('4/4_16');
  const [customBpm, setCustomBpm] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      const match = PRESET_METRICS.find((m) => m.steps === currentOverride?.steps && m.sig === currentOverride?.timeSignature);
      setSelectedMetricId(match ? match.id : `${globalTimeSig}_16`);
      setCustomBpm(currentOverride?.bpm);
    }
  }, [isOpen, currentOverride, globalTimeSig]);

  if (!isOpen) return null;

  const handleSave = () => {
    const chosen = PRESET_METRICS.find((m) => m.id === selectedMetricId) || PRESET_METRICS[0];
    onSaveOverride(patternName, {
      timeSignature: chosen.sig,
      steps: chosen.steps,
      beatResolutions: chosen.res,
      bpm: customBpm || undefined,
      isLocked: true,
    });
    onClose();
  };

  const handleReset = () => {
    onSaveOverride(patternName, undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs font-sans text-xs">
      <div className="bg-[var(--cordel-surface)] border-3 border-[var(--cordel-border)] shadow-[4px_4px_0px_#000] max-w-md w-full p-4 flex flex-col gap-3 text-[var(--cordel-text)]">
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border)] pb-2">
          <span className="font-cactus font-bold uppercase text-sm text-[#8b2a1a] flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" />
            <span>{isFr ? `Surcharge Pattern : [${patternName}]` : `Ajuste Padrão : [${patternName}]`}</span>
          </span>
          <button type="button" onClick={onClose} className="p-1 cursor-pointer hover:bg-black/10"><X size={16} /></button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-bold text-[11px] text-[#8b2a1a] uppercase">{isFr ? 'Signature & Subdivision :' : 'Fórmula & Subdivisão :'}</label>
          <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto border border-[var(--cordel-border)]/40 p-1">
            {PRESET_METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMetricId(m.id)}
                className={`p-1.5 text-left text-[11px] cursor-pointer border flex justify-between items-center ${selectedMetricId === m.id ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-transparent'}`}
              >
                <span>{m.label}</span>
                <span className="font-mono text-[9px] opacity-75">{m.sig} ({m.steps}p)</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-bold text-[11px] text-[#8b2a1a] uppercase">BPM Spécifique (Laisser vide pour global {globalBpm}) :</label>
          <input
            type="number"
            min={40}
            max={240}
            placeholder={`Global (${globalBpm})`}
            value={customBpm || ''}
            onChange={(e) => setCustomBpm(Number(e.target.value) || undefined)}
            className="p-1.5 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-mono text-xs font-bold"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--cordel-border)]/30">
          <button type="button" onClick={handleReset} className="px-2.5 py-1 text-[10px] font-bold border border-gray-400 bg-white/70 text-gray-700 cursor-pointer flex items-center gap-1">
            <RotateCcw size={12} /> <span>{isFr ? 'Rétablir Global' : 'Restaurar Global'}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onClose} className="px-2.5 py-1 text-[10px] font-bold border border-[var(--cordel-border)] bg-gray-200 cursor-pointer">{isFr ? 'Annuler' : 'Cancelar'}</button>
            <button type="button" onClick={handleSave} className="px-3 py-1 text-[10px] font-bold bg-[#8b2a1a] text-[#f4ecd8] border border-[var(--cordel-border)] cursor-pointer flex items-center gap-1">
              <Check size={12} /> <span>{isFr ? 'Valider' : 'Confirmar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
