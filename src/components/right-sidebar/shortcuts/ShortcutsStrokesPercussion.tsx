
import React from 'react';
import { useInstrumentLabel } from '../../../stores/useNomenclatureStore';

interface ShortcutsStrokesPercussionProps {
  t: (key: string) => string;
  lang: string;
  renderBadge: (instIds: string[], strokes: string[], display: string) => React.ReactNode;
  shouldShowSection: (instIds: string[]) => boolean;
  isStrokeActiveForInstruments: (instIds: string[], strokeSymbols: string[]) => boolean;
}

export const ShortcutsStrokesPercussion: React.FC<ShortcutsStrokesPercussionProps> = ({
  t,
  lang,
  renderBadge,
  shouldShowSection,
  isStrokeActiveForInstruments,
}) => {
  const getInstrumentLabel = useInstrumentLabel();
  const andWord = lang === 'pt' ? 'e' : '&';
  const labelMarcante = getInstrumentLabel('marcante');
  const labelMeiao = getInstrumentLabel('meiao');
  const labelRepique = getInstrumentLabel('repique');
  const isDefaultAlfaia = labelMarcante === 'Marcante' && labelMeiao === 'Meião' && labelRepique === 'Repique';
  const alfaiaTitle = isDefaultAlfaia ? `Alfaia (${labelMarcante}, ${labelMeiao}, ${labelRepique})` : `${labelMarcante} · ${labelMeiao} · ${labelRepique} (Alfaia)`;

  return (
    <>
      {shouldShowSection(['marcante', 'meiao', 'repique']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/alfaia.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {alfaiaTitle}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['marcante', 'meiao', 'repique'], ['D', 'd', 'E', 'e']) && (
              <>
                <div className="flex items-center gap-2">{renderBadge(['marcante', 'meiao', 'repique'], ['D'], 'D / E')}<span>{t('strokeStrongGroup')}</span></div>
                <div className="flex items-center gap-2">{renderBadge(['marcante', 'meiao', 'repique'], ['d'], 'd / e')}<span>{t('strokeWeakGroup')}</span></div>
              </>
            )}
            {isStrokeActiveForInstruments(['marcante', 'meiao', 'repique'], ['X', 'x']) && (
              <div className="flex items-center gap-2">{renderBadge(['marcante', 'meiao', 'repique'], ['X'], 'X / x')}<span>{t('legendAlfaiaCerclage')}</span></div>
            )}
            {isStrokeActiveForInstruments(['marcante', 'meiao', 'repique'], ['I', 'i']) && (
              <div className="flex items-center gap-2">{renderBadge(['marcante', 'meiao', 'repique'], ['I'], 'I / i')}<span>{t('legendAlfaiaIguarassu')}</span></div>
            )}
            {isStrokeActiveForInstruments(['marcante', 'meiao', 'repique'], ['C', 'c']) && (
              <div className="flex items-center gap-2">{renderBadge(['marcante', 'meiao', 'repique'], ['C'], 'C / c')}<span>{t('legendTarolClick')}</span></div>
            )}
            {isStrokeActiveForInstruments(['marcante', 'meiao', 'repique'], ['B', 'b']) && (
              <div className="flex items-center gap-2">{renderBadge(['marcante', 'meiao', 'repique'], ['B'], 'B / b')}<span>{t('legendAlfaiaBarulho')}</span></div>
            )}
          </div>
        </details>
      )}

      {shouldShowSection(['caixa', 'tarol']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/caixa.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {`${getInstrumentLabel('caixa')} ${andWord} ${getInstrumentLabel('tarol')}`}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['D', 'd', 'E', 'e']) && (
              <>
                <div className="flex items-center gap-2">{renderBadge(['caixa', 'tarol'], ['D'], 'D / E')}<span>{t('strokeStrongGroup')}</span></div>
                <div className="flex items-center gap-2">{renderBadge(['caixa', 'tarol'], ['d'], 'd / e')}<span>{t('strokeWeakGroup')}</span></div>
              </>
            )}
            <div className="w-full h-px bg-[var(--cordel-border)]/10 my-1" />
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['R']) && <div className="flex items-center gap-2">{renderBadge(['caixa', 'tarol'], ['R'], 'R')}<span>{t('legendCaixaRufadaD')}</span></div>}
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['r']) && <div className="flex items-center gap-2">{renderBadge(['caixa', 'tarol'], ['r'], 'r')}<span>{t('legendCaixaRufadaG')}</span></div>}
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['F', 'f']) && <div className="flex items-center gap-2">{renderBadge(['caixa', 'tarol'], ['F'], 'F / f')}<span>{t('legendCaixaFla')}</span></div>}
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['X', 'x']) && <div className="flex items-center gap-2">{renderBadge(['caixa', 'tarol'], ['X'], 'X / x')}<span>{t('legendCaixaCerclage')}</span></div>}
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['C', 'c']) && <div className="flex items-center gap-2">{renderBadge(['caixa', 'tarol'], ['C'], 'C / c')}<span>{t('legendTarolClick')}</span></div>}
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['B', 'b']) && <div className="flex items-center gap-2">{renderBadge(['caixa', 'tarol'], ['B'], 'B / b')}<span>{t('legendAlfaiaBarulho')}</span></div>}
          </div>
        </details>
      )}

      {shouldShowSection(['gongue']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/gongue.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {getInstrumentLabel('gongue')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['gongue'], ['G', 'g']) && <div className="flex items-center gap-2">{renderBadge(['gongue'], ['G'], 'G / g')}<span>{t('gongueGrave')}</span></div>}
            {isStrokeActiveForInstruments(['gongue'], ['A', 'a']) && <div className="flex items-center gap-2">{renderBadge(['gongue'], ['A'], 'A / a')}<span>{t('gongueAigu')}</span></div>}
            {isStrokeActiveForInstruments(['gongue'], ['X', 'x']) && <div className="flex items-center gap-2">{renderBadge(['gongue'], ['X'], 'X / x')}<span>{t('legendGongueBord')}</span></div>}
            {isStrokeActiveForInstruments(['gongue'], ['B', 'b']) && <div className="flex items-center gap-2">{renderBadge(['gongue'], ['B'], 'B / b')}<span>{t('gongueBarulho')}</span></div>}
          </div>
        </details>
      )}

      {shouldShowSection(['agbe']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/agbe.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {getInstrumentLabel('agbe')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['agbe'], ['D', 'd', 'E', 'e']) && (
              <>
                <div className="flex items-center gap-2">{renderBadge(['agbe'], ['D'], 'D / E')}<span>{t('strokeStrongGroup')}</span></div>
                <div className="flex items-center gap-2">{renderBadge(['agbe'], ['d'], 'd / e')}<span>{t('strokeWeakGroup')}</span></div>
              </>
            )}
            {isStrokeActiveForInstruments(['agbe'], ['S', 's']) && <div className="flex items-center gap-2">{renderBadge(['agbe'], ['S'], 'S / s')}<span>{t('legendAgbeSaut')}</span></div>}
            {isStrokeActiveForInstruments(['agbe'], ['V', 'v']) && <div className="flex items-center gap-2">{renderBadge(['agbe'], ['V'], 'V / v')}<span>{t('legendAgbeVolta')}</span></div>}
            {isStrokeActiveForInstruments(['agbe'], ['B', 'b']) && <div className="flex items-center gap-2">{renderBadge(['agbe'], ['B'], 'B / b')}<span>{t('legendAgbeBarulho')}</span></div>}
          </div>
        </details>
      )}
    </>
  );
};
