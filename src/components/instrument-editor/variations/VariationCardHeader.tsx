
import React from 'react';
import { Play, Square } from 'lucide-react';
import { Language } from '../../../types';

export interface VariationCardHeaderProps {
  variation: any;
  ptnId: number;
  lang: Language;
  soloPatternPlayId: number | null;
  soloPatternVariationId: string | null;
  onPlaySoloPattern?: (patternId: number, variationId?: string) => void;
  onStopSoloPattern?: () => void;
  onTogglePatternVariationFirstTimeOnly?: (patternId: number, variationId: string, val: boolean) => void;
  onUpdatePatternVariationProbability?: (patternId: number, variationId: string, probability: number) => void;
  onDeletePatternVariation?: (patternId: number, variationId: string) => void;
}

export const VariationCardHeader: React.FC<VariationCardHeaderProps> = React.memo((props) => {
  const {
    variation, ptnId, lang, soloPatternPlayId, soloPatternVariationId,
    onPlaySoloPattern, onStopSoloPattern, onTogglePatternVariationFirstTimeOnly,
    onUpdatePatternVariationProbability, onDeletePatternVariation,
  } = props;

  const isSoloActive = soloPatternPlayId === ptnId && soloPatternVariationId === variation.id;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-cactus font-bold text-[var(--cordel-ink-dark)]">{variation.name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isSoloActive) onStopSoloPattern?.();
          else onPlaySoloPattern?.(ptnId, variation.id);
        }}
        className={`p-1 rounded-sm transition-colors ml-2 cursor-pointer ${
          isSoloActive ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)]/10'
        }`}
        title={isSoloActive ? (lang === 'fr' ? 'Arrêter la lecture' : 'Parar leitura') : (lang === 'fr' ? 'Écouter cette variation en solo' : 'Ouvir esta variação em solo')}
      >
        {isSoloActive ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
      </button>

      <div className="flex items-center gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
        <label className="flex items-center gap-1 mr-3 cursor-pointer" title={lang === 'fr' ? "Forcer cette variation à jouer uniquement la première fois (levée d'entrée)" : 'Forçar esta variação a tocar apenas na primeira vez'}>
          <input
            type="checkbox"
            checked={!!variation.playFirstTimeOnly}
            onChange={(e) => onTogglePatternVariationFirstTimeOnly?.(ptnId, variation.id, e.target.checked)}
            className="accent-[var(--cordel-wood)] cursor-pointer"
          />
          <span className="text-[10px] uppercase font-bold text-[var(--cordel-text-muted)]">{lang === 'fr' ? '1ère fois' : '1ª vez'}</span>
        </label>

        {!variation.playFirstTimeOnly ? (
          <div
            className="h-6 px-2 py-0.5 rounded-[2px] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] inline-flex items-center font-cactus font-bold text-[11px] uppercase tracking-wider tabular-nums select-none shrink-0 bg-[var(--cordel-parchment-panel)] text-[var(--cordel-ink-dark)]"
            title={lang === 'fr' ? 'Probabilité de la variation' : 'Probabilidade da variação'}
          >
            <span>{lang === 'fr' ? 'PROBA' : 'PROB'} :&nbsp;</span>
            <input
              type="number"
              min="0"
              max="100"
              value={variation.probability}
              onChange={(e) => onUpdatePatternVariationProbability?.(ptnId, variation.id, parseInt(e.target.value) || 0)}
              className="bg-transparent border-0 outline-none p-0 text-center font-cactus font-bold text-[11px] w-7 text-[var(--cordel-ink-dark)]"
            />
            <span>%</span>
          </div>
        ) : (
          <span
            className="h-6 px-2 py-0.5 rounded-[2px] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] inline-flex items-center font-cactus font-bold text-[11px] uppercase tracking-wider tabular-nums select-none shrink-0 bg-[var(--cordel-wood)]/10 text-[var(--cordel-wood)]"
            title={lang === 'fr' ? "Variation d'amorce (joue au 1er passage)" : 'Variação de levada (toca na 1ª vez)'}
          >
            {lang === 'fr' ? '1ÈRE FOIS' : '1ª VEZ'} : 100%
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDeletePatternVariation?.(ptnId, variation.id); }}
        className="text-[var(--cordel-wood)] text-[10px] font-bold hover:underline cursor-pointer ml-auto"
      >
        {lang === 'fr' ? 'Supprimer' : 'Excluir'}
      </button>
    </div>
  );
});

VariationCardHeader.displayName = 'VariationCardHeader';
