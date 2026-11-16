import React from 'react';
import { ArrowLeftRight, Delete, Scissors } from 'lucide-react';

interface StrokeWritingDockSpecialToolsProps {
  supportsAlternation: boolean;
  isAlternating: boolean;
  onToggleAlternating?: () => void;
  isEraserActive: boolean;
  isScissorsActive: boolean;
  isMultiSelectActive: boolean;
  isFr: boolean;
  onSelectTool: (tool: string) => void;
}

export const StrokeWritingDockSpecialTools: React.FC<StrokeWritingDockSpecialToolsProps> = React.memo(({
  supportsAlternation, isAlternating, onToggleAlternating,
  isEraserActive, isScissorsActive, isMultiSelectActive,
  isFr, onSelectTool,
}) => {
  const activeCls = 'border-[var(--cordel-wood)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0px_var(--cordel-ink-dark)]';
  const idleCls = 'border-[var(--cordel-ink-dark)] bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-paper-surface)] text-[var(--cordel-paper-ink)] shadow-[1px_1px_0px_var(--cordel-ink-dark)]';

  return (
    <>
      <div className="h-6 w-[1px] bg-[var(--cordel-ink-dark)]/20 shrink-0 mx-0.5" />

      {supportsAlternation && onToggleAlternating && (
        <button
          type="button"
          onClick={onToggleAlternating}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-sm border-2 transition-transform cursor-pointer select-none shrink-0 active:scale-95 ${
            isAlternating ? activeCls : idleCls
          }`}
          title={isFr ? 'Mode Alternance (Frisé) : Pas 1,3,5... Coup Fort | Pas 2,4,6... Coup Faible' : 'Modo Alternância : Passo 1,3,5... Toque Forte | Passo 2,4,6... Toque Fraco'}
        >
          <ArrowLeftRight size={14} className={isAlternating ? 'text-[var(--cordel-on-accent)]' : 'text-[var(--cordel-wood)]'} />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[11px] font-cactus font-bold">{isFr ? 'Alternance' : 'Alternância'}</span>
            <span className={`text-[9px] font-mono ${isAlternating ? 'text-[var(--cordel-on-accent)]/90' : 'text-[var(--cordel-text-muted)]'}`}>
              {isAlternating ? (isFr ? 'ACTIF ⇄' : 'ATIVO ⇄') : (isFr ? 'Désactivé' : 'Inativo')}
            </span>
          </div>
        </button>
      )}

      <button
        type="button"
        onClick={() => onSelectTool('0')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-sm border-2 transition-transform cursor-pointer select-none shrink-0 active:scale-95 ${
          isEraserActive && !isMultiSelectActive ? `${activeCls} scale-105 z-10` : idleCls
        }`}
        title={isFr ? 'Gomme (Effacer) [0 / Del]' : 'Borracha (Apagar) [0 / Del]'}
      >
        <div className={`w-7 h-7 rounded-sm flex items-center justify-center font-bold border border-[var(--cordel-ink-dark)]/20 ${
          isEraserActive && !isMultiSelectActive ? 'bg-[var(--cordel-paper-surface)] text-[var(--cordel-wood)]' : 'bg-[var(--cordel-parchment-panel)] text-[var(--cordel-paper-ink)]'
        }`}>
          <Delete size={14} />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[11px] font-cactus font-bold">{isFr ? 'Gomme' : 'Borracha'}</span>
          <span className={`text-[9px] font-mono ${isEraserActive && !isMultiSelectActive ? 'text-[var(--cordel-on-accent)]/80' : 'text-[var(--cordel-text-muted)]'}`}>[0 / Del]</span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectTool(isScissorsActive ? 'D' : 'scissors')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-sm border-2 transition-transform cursor-pointer select-none shrink-0 active:scale-95 ${
          isScissorsActive && !isMultiSelectActive ? `${activeCls} scale-105 z-10` : idleCls
        }`}
        title={isFr ? 'Ciseau / Colle : Clic sur un pas simple pour scinder, ou pas scindé pour recoller' : 'Tesoura / Cola : Clique num passo para dividir ou colar'}
      >
        <div className={`px-1.5 h-7 rounded-sm flex items-center justify-center gap-1 font-bold text-xs border border-[var(--cordel-ink-dark)]/20 ${
          isScissorsActive && !isMultiSelectActive ? 'bg-[var(--cordel-paper-surface)] text-[var(--cordel-wood)]' : 'bg-[var(--cordel-parchment-panel)] text-[var(--cordel-paper-ink)]'
        }`}>
          <Scissors size={14} />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[11px] font-cactus font-bold">{isFr ? 'Ciseau / Colle' : 'Tesoura / Cola'}</span>
          <span className={`text-[9px] font-mono ${isScissorsActive && !isMultiSelectActive ? 'text-[var(--cordel-on-accent)]/80' : 'text-[var(--cordel-text-muted)]'}`}>[{isFr ? 'Scinder' : 'Dividir'}]</span>
        </div>
      </button>
    </>
  );
});

StrokeWritingDockSpecialTools.displayName = 'StrokeWritingDockSpecialTools';
