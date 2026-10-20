/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DOMPurify from 'dompurify';
import { useInstrumentLabel } from '../../../stores/useNomenclatureStore';
import { ShortcutsGeneralInfo } from './ShortcutsGeneralInfo';

interface ShortcutsStrokesOtherProps {
  t: (key: string) => string;
  lang: string;
  renderBadge: (instIds: string[], strokes: string[], display: string) => React.ReactNode;
  shouldShowSection: (instIds: string[]) => boolean;
  isStrokeActiveForInstruments: (instIds: string[], strokeSymbols: string[]) => boolean;
}

export const ShortcutsStrokesOther: React.FC<ShortcutsStrokesOtherProps> = ({
  t,
  lang,
  renderBadge,
  shouldShowSection,
  isStrokeActiveForInstruments,
}) => {
  const getInstrumentLabel = useInstrumentLabel();
  const andWord = lang === 'pt' ? 'e' : '&';

  return (
    <>
      <ShortcutsGeneralInfo t={t} lang={lang} />

      {shouldShowSection(['voice']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/micro.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {`${t('voiceLegendTitle')} (${getInstrumentLabel('puxador')} ${andWord} ${getInstrumentLabel('coro')})`}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 text-xs text-[var(--cordel-text)] leading-relaxed">
            <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('voiceLegend1')) }} />
            <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('voiceLegend2')) }} />
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

      {shouldShowSection(['mineiro']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/mineiro.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {getInstrumentLabel('mineiro')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['mineiro'], ['P', 'p']) && <div className="flex items-center gap-2">{renderBadge(['mineiro'], ['P'], 'P / p')}<span>{t('mineiroP')}</span></div>}
            {isStrokeActiveForInstruments(['mineiro'], ['T', 't']) && <div className="flex items-center gap-2">{renderBadge(['mineiro'], ['T'], 'T / t')}<span>{t('mineiroT')}</span></div>}
            {isStrokeActiveForInstruments(['mineiro'], ['L', 'l']) && <div className="flex items-center gap-2">{renderBadge(['mineiro'], ['L'], 'L / l')}<span>{t('mineiroL')}</span></div>}
            {isStrokeActiveForInstruments(['mineiro'], ['B', 'b']) && <div className="flex items-center gap-2">{renderBadge(['mineiro'], ['B'], 'B / b')}<span>{t('mineiroB')}</span></div>}
          </div>
        </details>
      )}

      {shouldShowSection(['apito']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/apito.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {getInstrumentLabel('apito')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['apito'], ['W']) && <div className="flex items-center gap-2">{renderBadge(['apito'], ['W'], 'W')}<span>{t('apitoLong')}</span></div>}
            {isStrokeActiveForInstruments(['apito'], ['w']) && <div className="flex items-center gap-2">{renderBadge(['apito'], ['w'], 'w')}<span>{t('apitoShort')}</span></div>}
          </div>
        </details>
      )}
    </>
  );
};
