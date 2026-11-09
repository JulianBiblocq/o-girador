import React from 'react';
import { Language } from '../../../types';

interface ShortcutsKeyboardTabProps {
  lang: Language;
  t: (key: string) => string;
}

export const ShortcutsKeyboardTab: React.FC<ShortcutsKeyboardTabProps> = ({ lang, t }) => {
  const rowCls = 'flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1 border-b border-black/5 min-w-0';
  const labelCls = 'font-medium leading-tight flex-1 min-w-[120px] pr-1';
  const kbdCls = 'px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[10px] leading-tight text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0';

  return (
    <div className="flex flex-col gap-y-3 overflow-y-auto custom-scrollbar flex-grow pr-1">
      {/* Section 1 : Transport & Navigation */}
      <div className="bg-[var(--cordel-bg)] cordel-border-sm p-2.5 flex flex-col gap-2">
        <h4 className="text-[11px] font-bold text-[#8b2a1a] dark:text-[#f59e0b] uppercase tracking-wider font-cactus border-b border-[var(--cordel-border)]/20 pb-1">
          {t('shortcutsTransportTitle')}
        </h4>
        <div className="flex flex-col gap-1 text-[10px] text-[var(--cordel-text)]">
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutSpaceDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>Space</kbd>
            </div>
          </div>
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutEnterDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>Enter</kbd>
              <kbd className={kbdCls}>Home</kbd>
            </div>
          </div>
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutTabDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>Tab</kbd>
            </div>
          </div>
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutOficinaDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>O</kbd>
            </div>
          </div>
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutLoopDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>L</kbd>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1 min-w-0">
            <span className={labelCls}>{t('shortcutMeasureNavDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>&lt; / ,</kbd>
              <kbd className={kbdCls}>&gt; / .</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 : Édition & Partition */}
      <div className="bg-[var(--cordel-bg)] cordel-border-sm p-2.5 flex flex-col gap-2">
        <h4 className="text-[11px] font-bold text-[#8b2a1a] dark:text-[#f59e0b] uppercase tracking-wider font-cactus border-b border-[var(--cordel-border)]/20 pb-1">
          {t('shortcutsEditTitle')}
        </h4>
        <div className="flex flex-col gap-1 text-[10px] text-[var(--cordel-text)]">
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutWeakStrokesDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>d, e, g, a...</kbd>
            </div>
          </div>
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutStrongStrokesDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>Shift + D, E...</kbd>
            </div>
          </div>
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutNuanceWheelDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>↑ / ↓</kbd>
              <kbd className={kbdCls}>{lang === 'fr' ? 'Molette' : 'Roda'}</kbd>
            </div>
          </div>
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutEraserDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>0</kbd>
              <kbd className={kbdCls}>{lang === 'fr' ? 'Suppr / ⌫' : 'Delete / ⌫'}</kbd>
            </div>
          </div>
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutSplitStepDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>{lang === 'fr' ? 'Alt + Clic' : 'Alt + Clique'}</kbd>
            </div>
          </div>
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutDuplicateMeasureDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>Ctrl + D</kbd>
            </div>
          </div>
          <div className={rowCls}>
            <span className={labelCls}>{t('shortcutUndoRedoDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>Ctrl+Z</kbd>
              <kbd className={kbdCls}>Ctrl+Shift+Z / Y</kbd>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1 min-w-0">
            <span className={labelCls}>{t('shortcutSpecialToolsDesc')}</span>
            <div className="flex flex-wrap justify-end gap-1 shrink-0">
              <kbd className={kbdCls}>B / C / X</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
