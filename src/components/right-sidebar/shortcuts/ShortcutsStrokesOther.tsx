import React from 'react';
import DOMPurify from 'dompurify';
import { useInstrumentLabel } from '../../../stores/useNomenclatureStore';
import { swapDirectionalHands } from '../../../data/strokePedagogyCatalog';

interface ShortcutsStrokesOtherProps {
  t: (key: string) => string;
  lang: string;
  isLeftHanded?: boolean;
  renderBadge: (instIds: string[], strokes: string[], display: string) => React.ReactNode;
  shouldShowSection: (instIds: string[]) => boolean;
  isStrokeActiveForInstruments: (instIds: string[], strokeSymbols: string[]) => boolean;
}

export const ShortcutsStrokesOther: React.FC<ShortcutsStrokesOtherProps> = ({
  t,
  lang,
  isLeftHanded = false,
  renderBadge,
  shouldShowSection,
  isStrokeActiveForInstruments,
}) => {
  const getInstrumentLabel = useInstrumentLabel();
  const andWord = lang === 'pt' ? 'e' : '&';
  const sw = (txt: string) => swapDirectionalHands(txt, isLeftHanded);
  const rowCls = 'flex items-start gap-2 leading-snug';

  return (
    <>
      {shouldShowSection(['mineiro']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/mineiro.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {getInstrumentLabel('mineiro')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1.5 text-[10.5px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['mineiro'], ['P', 'p']) && <div className={rowCls}>{renderBadge(['mineiro'], ['P'], 'P / p')}<span>{t('mineiroP')}</span></div>}
            {isStrokeActiveForInstruments(['mineiro'], ['T', 't']) && <div className={rowCls}>{renderBadge(['mineiro'], ['T'], 'T / t')}<span>{t('mineiroT')}</span></div>}
            {isStrokeActiveForInstruments(['mineiro'], ['L']) && <div className={rowCls}>{renderBadge(['mineiro'], ['L'], 'L')}<span>{t('mineiroL')}</span></div>}
            {isStrokeActiveForInstruments(['mineiro'], ['B']) && <div className={rowCls}>{renderBadge(['mineiro'], ['B'], 'B')}<span>{t('mineiroB')}</span></div>}
          </div>
        </details>
      )}

      {shouldShowSection(['timbal']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/timbal.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {getInstrumentLabel('timbal')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1.5 text-[10.5px] text-[var(--cordel-text)]">
            <div className="px-2 py-1 bg-[var(--cordel-surface-elevated)] border border-[var(--cordel-border)] text-[9.5px] font-bold text-[var(--cordel-accent-readable)]">
              {sw(t('legendTimbalRule'))}
            </div>
            {isStrokeActiveForInstruments(['timbal'], ['G', 'g']) && <div className={rowCls}>{renderBadge(['timbal'], ['G'], 'G / g')}<span>{t('legendTimbalBaixo')}</span></div>}
            {isStrokeActiveForInstruments(['timbal'], ['A', 'a']) && <div className={rowCls}>{renderBadge(['timbal'], ['A'], 'A / a')}<span>{t('legendTimbalAberto')}</span></div>}
            {isStrokeActiveForInstruments(['timbal'], ['S', 's']) && <div className={rowCls}>{renderBadge(['timbal'], ['S'], 'S / s')}<span>{t('legendTimbalSlap')}</span></div>}
            {isStrokeActiveForInstruments(['timbal'], ['T', 't']) && <div className={rowCls}>{renderBadge(['timbal'], ['T'], 'T / t')}<span>{t('legendTimbalTapaAberto')}</span></div>}
            {isStrokeActiveForInstruments(['timbal'], ['D', 'd']) && <div className={rowCls}>{renderBadge(['timbal'], ['D'], 'D / d')}<span>{t('legendTimbalDedilhado')}</span></div>}
            {isStrokeActiveForInstruments(['timbal'], ['P', 'p']) && <div className={rowCls}>{renderBadge(['timbal'], ['P'], 'P / p')}<span>{t('legendTimbalPreso')}</span></div>}
            {isStrokeActiveForInstruments(['timbal'], ['F', 'f']) && <div className={rowCls}>{renderBadge(['timbal'], ['F'], 'F / f')}<span>{t('legendTimbalFlaAberto')}</span></div>}
            {isStrokeActiveForInstruments(['timbal'], ['V', 'v']) && <div className={rowCls}>{renderBadge(['timbal'], ['V'], 'V / v')}<span>{t('legendTimbalFlaSlap')}</span></div>}
            {isStrokeActiveForInstruments(['timbal'], ['C']) && <div className={rowCls}>{renderBadge(['timbal'], ['C'], 'C')}<span>{t('legendTimbalClap')}</span></div>}
            {isStrokeActiveForInstruments(['timbal'], ['B']) && <div className={rowCls}>{renderBadge(['timbal'], ['B'], 'B')}<span>{t('legendTimbalBarulho')}</span></div>}
          </div>
        </details>
      )}

      {shouldShowSection(['apito']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/apito.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {getInstrumentLabel('apito')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1.5 text-[10.5px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['apito'], ['L', 'l', 'W']) && <div className={rowCls}>{renderBadge(['apito'], ['L'], 'L / l')}<span>{t('apitoLong')}</span></div>}
            {isStrokeActiveForInstruments(['apito'], ['C', 'w']) && <div className={rowCls}>{renderBadge(['apito'], ['C'], 'C')}<span>{t('apitoShort')}</span></div>}
          </div>
        </details>
      )}

      {shouldShowSection(['voice']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/micro.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {`${t('voiceLegendTitle')} (${getInstrumentLabel('puxador')} ${andWord} ${getInstrumentLabel('coro')})`}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[10.5px] text-[var(--cordel-text)] leading-relaxed flex flex-col gap-1">
            <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('voiceLegend1')) }} />
            <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('voiceLegend2')) }} />
          </div>
        </details>
      )}
    </>
  );
};
