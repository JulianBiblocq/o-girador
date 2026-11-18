import React from 'react';
import { useInstrumentLabel } from '../../../stores/useNomenclatureStore';
import { swapDirectionalHands } from '../../../data/strokePedagogyCatalog';

interface ShortcutsStrokesPercussionProps {
  t: (key: string) => string;
  lang: string;
  isLeftHanded?: boolean;
  renderBadge: (instIds: string[], strokes: string[], display: string) => React.ReactNode;
  shouldShowSection: (instIds: string[]) => boolean;
  isStrokeActiveForInstruments: (instIds: string[], strokeSymbols: string[]) => boolean;
}

export const ShortcutsStrokesPercussion: React.FC<ShortcutsStrokesPercussionProps> = ({
  t,
  lang,
  isLeftHanded = false,
  renderBadge,
  shouldShowSection,
  isStrokeActiveForInstruments,
}) => {
  const getInstrumentLabel = useInstrumentLabel();
  const isFr = lang === 'fr';
  const andWord = lang === 'pt' ? 'e' : '&';
  const labelMarcante = getInstrumentLabel('marcante');
  const labelMeiao = getInstrumentLabel('meiao');
  const labelRepique = getInstrumentLabel('repique');
  const isDefaultAlfaia = labelMarcante === 'Marcante' && labelMeiao === 'Meião' && labelRepique === 'Repique';
  const alfaiaTitle = isDefaultAlfaia
    ? `Alfaia (${labelMarcante}, ${labelMeiao}, ${labelRepique})`
    : `${labelMarcante} · ${labelMeiao} · ${labelRepique} (Alfaia)`;
  const alIds = ['marcante', 'meiao', 'repique'];
  const cxIds = ['caixa', 'tarol'];
  const sw = (txt: string) => swapDirectionalHands(txt, isLeftHanded);
  const rowCls = 'flex items-start gap-2 leading-snug';

  return (
    <>
      {shouldShowSection(alIds) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/alfaia.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {alfaiaTitle}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1.5 text-[10.5px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(alIds, ['D', 'd']) && <div className={rowCls}>{renderBadge(alIds, ['D'], 'D / d')}<span>{sw(t('legendAlfaiaD'))}</span></div>}
            {isStrokeActiveForInstruments(alIds, ['E', 'e']) && <div className={rowCls}>{renderBadge(alIds, ['E'], 'E / e')}<span>{sw(t('legendAlfaiaE'))}</span></div>}
            {isStrokeActiveForInstruments(alIds, ['A', 'a']) && <div className={rowCls}>{renderBadge(alIds, ['A'], 'A / a')}<span>{sw(t('legendAlfaiaAbafado'))}</span></div>}
            {isStrokeActiveForInstruments(alIds, ['I']) && <div className={rowCls}>{renderBadge(alIds, ['I'], 'I')}<span>{sw(t('legendAlfaiaIguarassu'))}</span></div>}
            {isStrokeActiveForInstruments(alIds, ['C']) && <div className={rowCls}>{renderBadge(alIds, ['C'], 'C')}<span>{t('legendTarolClick')}</span></div>}
            {isStrokeActiveForInstruments(alIds, ['X']) && <div className={rowCls}>{renderBadge(alIds, ['X'], 'X')}<span>{t('legendAlfaiaCerclage')}</span></div>}
            {isStrokeActiveForInstruments(alIds, ['B']) && <div className={rowCls}>{renderBadge(alIds, ['B'], 'B')}<span>{t('legendAlfaiaBarulho')}</span></div>}
          </div>
        </details>
      )}

      {shouldShowSection(cxIds) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/caixa.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {`${getInstrumentLabel('caixa')} ${andWord} ${getInstrumentLabel('tarol')}`}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1.5 text-[10.5px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(cxIds, ['D', 'd', 'E', 'e']) && (
              <>
                <div className={rowCls}>{renderBadge(cxIds, ['D'], 'D / E')}<span>{sw(t('strokeStrongGroup'))}</span></div>
                <div className={rowCls}>{renderBadge(cxIds, ['d'], 'd / e')}<span>{sw(t('strokeWeakGroup'))}</span></div>
              </>
            )}
            {isStrokeActiveForInstruments(cxIds, ['R', 'r']) && (
              <>
                <div className={rowCls}>{renderBadge(cxIds, ['R'], 'R')}<span>{sw(t('legendCaixaRufadaD'))}</span></div>
                <div className={rowCls}>{renderBadge(cxIds, ['r'], 'r')}<span>{sw(t('legendCaixaRufadaG'))}</span></div>
              </>
            )}
            {isStrokeActiveForInstruments(cxIds, ['F', 'f']) && <div className={rowCls}>{renderBadge(cxIds, ['F'], 'F / f')}<span>{sw(t('legendCaixaFla'))}</span></div>}
            {isStrokeActiveForInstruments(cxIds, ['A']) && <div className={rowCls}>{renderBadge(cxIds, ['A'], 'A')}<span>{sw(t('legendCaixaRimshotD'))}</span></div>}
            {isStrokeActiveForInstruments(cxIds, ['a']) && <div className={rowCls}>{renderBadge(cxIds, ['a'], 'a')}<span>{sw(t('legendCaixaRimshotG'))}</span></div>}
            {isStrokeActiveForInstruments(cxIds, ['C']) && <div className={rowCls}>{renderBadge(cxIds, ['C'], 'C')}<span>{t('legendTarolClick')}</span></div>}
            {isStrokeActiveForInstruments(cxIds, ['X']) && <div className={rowCls}>{renderBadge(cxIds, ['X'], 'X')}<span>{t('legendCaixaCerclage')}</span></div>}
            {isStrokeActiveForInstruments(cxIds, ['B']) && <div className={rowCls}>{renderBadge(cxIds, ['B'], 'B')}<span>{t('legendCaixaBarulho')}</span></div>}
          </div>
        </details>
      )}

      {shouldShowSection(['gongue']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/gongue.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {`${getInstrumentLabel('gongue')} — ${isFr ? 'Cloche unique en fer forgé' : 'Campana única de ferro forjado'}`}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1.5 text-[10.5px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['gongue'], ['G', 'g']) && <div className={rowCls}>{renderBadge(['gongue'], ['G'], 'G / g')}<span>{t('gongueGrave')}</span></div>}
            {isStrokeActiveForInstruments(['gongue'], ['A', 'a']) && <div className={rowCls}>{renderBadge(['gongue'], ['A'], 'A / a')}<span>{t('gongueAigu')}</span></div>}
            {isStrokeActiveForInstruments(['gongue'], ['X']) && <div className={rowCls}>{renderBadge(['gongue'], ['X'], 'X')}<span>{t('gongueAbafado')}</span></div>}
            {isStrokeActiveForInstruments(['gongue'], ['B']) && <div className={rowCls}>{renderBadge(['gongue'], ['B'], 'B')}<span>{t('gongueBarulho')}</span></div>}
          </div>
        </details>
      )}

      {shouldShowSection(['agbe']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/agbe.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {getInstrumentLabel('agbe')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1.5 text-[10.5px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['agbe'], ['E', 'e']) && <div className={rowCls}>{renderBadge(['agbe'], ['E'], 'E / e')}<span>{sw(t('agbeG'))}</span></div>}
            {isStrokeActiveForInstruments(['agbe'], ['D', 'd']) && <div className={rowCls}>{renderBadge(['agbe'], ['D'], 'D / d')}<span>{sw(t('agbeD'))}</span></div>}
            {isStrokeActiveForInstruments(['agbe'], ['S']) && <div className={rowCls}>{renderBadge(['agbe'], ['S'], 'S')}<span>{t('legendAgbeSaut')}</span></div>}
            {isStrokeActiveForInstruments(['agbe'], ['V']) && <div className={rowCls}>{renderBadge(['agbe'], ['V'], 'V')}<span>{t('legendAgbeVolta')}</span></div>}
            {isStrokeActiveForInstruments(['agbe'], ['B']) && <div className={rowCls}>{renderBadge(['agbe'], ['B'], 'B')}<span>{t('legendAgbeBarulho')}</span></div>}
          </div>
        </details>
      )}
    </>
  );
};
