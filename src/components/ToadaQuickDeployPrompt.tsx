/**
 * ToadaQuickDeployPrompt.tsx
 * Toast contextuel d'action rapide proposant de dérouler la suite de la Toada
 * après l'assignation du 1er motif de Puxador sur une mesure.
 * Respect strict de l'architecture anti-monolithe (< 150 lignes).
 */
import React, { useEffect } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { Music, ArrowRight, X } from 'lucide-react';

export const ToadaQuickDeployPrompt: React.FC = () => {
  const pending = useSequencerStore((state) => state.pendingToadaQuickDeploy);
  const clearPrompt = useSequencerStore((state) => state.setPendingToadaQuickDeploy);
  const deploy = useSequencerStore((state) => state.deployToadaCycleAtMeasure);
  const lang = useSequencerStore((state) => state.lang);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      clearPrompt(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [pending, clearPrompt]);

  if (!pending) return null;

  const mNum = pending.measureIdx + 1;

  const handleApply = () => {
    deploy(pending.measureIdx);
    clearPrompt(null);
    const msg = lang === 'fr'
      ? `Tour de Toada déroulé dès M${mNum}`
      : `Toada desenrolada a partir de M${mNum}`;
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));
  };

  return (
    <div
      role="alert"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-4 py-2.5 bg-[var(--cordel-bg,#f4ecd8)] text-[var(--cordel-text,#1a1a1a)] border-2 border-[var(--cordel-border,#1a1a1a)] shadow-[4px_4px_0px_var(--cordel-border,#1a1a1a)] font-cactus animate-in fade-in slide-in-from-bottom-3 duration-150 select-none max-w-[92vw]"
    >
      <Music className="w-4 h-4 text-[#9a3412] shrink-0" />
      <span className="text-xs font-bold whitespace-nowrap">
        {lang === 'fr'
          ? `Dérouler toute la suite de la Toada à partir de M${mNum} ?`
          : `Desenrolar toda a sequência da Toada a partir de M${mNum}?`}
      </span>
      <button
        type="button"
        onClick={handleApply}
        className="px-2.5 py-1 bg-[#9a3412] hover:bg-[#802a0e] text-white text-xs font-bold flex items-center gap-1.5 border border-[var(--cordel-border,#1a1a1a)] shadow-[2px_2px_0px_var(--cordel-border,#1a1a1a)] active:translate-y-[1px] active:shadow-none cursor-pointer transition-all shrink-0"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        <span>{lang === 'fr' ? 'Appliquer' : 'Aplicar'}</span>
      </button>
      <button
        type="button"
        onClick={() => clearPrompt(null)}
        title={lang === 'fr' ? 'Ignorer' : 'Ignorar'}
        className="p-1 hover:bg-[var(--cordel-border,#1a1a1a)]/10 text-[var(--cordel-text,#1a1a1a)] transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
