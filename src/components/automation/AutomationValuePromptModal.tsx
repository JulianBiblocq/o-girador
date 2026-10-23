import React, { useEffect, useState } from 'react';

export interface AutomationValuePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetIdx: number | null;
  type: 'tempo' | 'volume' | 'pan' | 'reverb';
  label?: string;
  min: number;
  max: number;
  lang: string;
  initialValue: number;
  onSubmit: (val: number) => void;
}

export const AutomationValuePromptModal: React.FC<AutomationValuePromptModalProps> = React.memo(({
  isOpen, onClose, targetIdx, type, label, min, max, lang, initialValue, onSubmit,
}) => {
  const [valueStr, setValueStr] = useState(String(initialValue));

  useEffect(() => {
    setValueStr(String(initialValue));
  }, [initialValue]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen || targetIdx === null) return null;

  const handleSubmit = () => {
    const val = parseInt(valueStr, 10);
    if (!isNaN(val)) onSubmit(Math.max(min, Math.min(max, val)));
    onClose();
  };

  const typeLabel = label || (
    type === 'tempo' ? 'Tempo (BPM)' :
    type === 'pan' ? (lang === 'fr' ? 'Panoramique' : 'Panorâmico') :
    type === 'reverb' ? (lang === 'fr' ? 'Send Réverbe (%)' : 'Envio Reverb (%)') : 'Volume'
  );

  return (
    <div
      data-testid="automation-prompt-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
        e.stopPropagation();
      }}
    >
      <div className="bg-[var(--cordel-wood)] text-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] rounded shadow-2xl p-6 w-[320px] animate-in fade-in zoom-in duration-200">
        <h3 className="font-cactus text-xl mb-4 text-[#f4ecd8]">
          {lang === 'fr' ? `Mesure ${targetIdx + 1} - ${typeLabel}` : `Compasso ${targetIdx + 1} - ${typeLabel}`}
        </h3>
        <p className="text-sm opacity-80 mb-2 text-[#f4ecd8]">
          {type === 'pan'
            ? (lang === 'fr' ? 'De -100 (Gauche) à +100 (Droite), 0 = Centre :' : 'De -100 (Esquerda) a +100 (Direita), 0 = Centro:')
            : (lang === 'fr' ? `Valeur comprise entre ${min} et ${max} :` : `Valor entre ${min} e ${max}:`)}
        </p>
        <input
          type="number" min={min} max={max} autoFocus
          className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border mb-4 p-2 font-bold"
          value={valueStr}
          onChange={(e) => setValueStr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="flex justify-end gap-2">
          <button
            data-testid="automation-prompt-cancel"
            onClick={onClose}
            className="px-4 py-2 text-sm cordel-border hover:bg-black/10 transition-colors rounded text-[#f4ecd8]"
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white cordel-border transition-colors rounded font-bold"
          >
            {lang === 'fr' ? 'Valider' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
});
