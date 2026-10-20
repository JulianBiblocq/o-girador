/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../../../types';

interface ShortcutsKeyboardTabProps {
  lang: Language;
  t: (key: string) => string;
}

export const ShortcutsKeyboardTab: React.FC<ShortcutsKeyboardTabProps> = ({ lang, t }) => {
  return (
    <div className="flex flex-col gap-y-3 overflow-y-auto custom-scrollbar flex-grow pr-1">
      {/* Section 1 : Transport & Navigation */}
      <div className="bg-[var(--cordel-bg)] cordel-border-sm p-2.5 flex flex-col gap-2">
        <h4 className="text-[11px] font-bold text-[#8b2a1a] uppercase tracking-wider font-cactus border-b border-[var(--cordel-border)]/20 pb-1">
          ▶️ {t('shortcutsTransportTitle')}
        </h4>
        <div className="flex flex-col gap-1.5 text-[10px] text-[var(--cordel-text)]">
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutSpaceDesc')}</span>
            <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">Space</kbd>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutEnterDesc')}</span>
            <div className="flex gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">Enter</kbd>
              <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">Home</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutTabDesc')}</span>
            <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">Tab</kbd>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutOficinaDesc')}</span>
            <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">O</kbd>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutLoopDesc')}</span>
            <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">L</kbd>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5">
            <span className="font-medium">{t('shortcutMeasureNavDesc')}</span>
            <div className="flex gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">&lt; / ,</kbd>
              <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">&gt; / .</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 : Édition & Partition */}
      <div className="bg-[var(--cordel-bg)] cordel-border-sm p-2.5 flex flex-col gap-2">
        <h4 className="text-[11px] font-bold text-[#8b2a1a] uppercase tracking-wider font-cactus border-b border-[var(--cordel-border)]/20 pb-1">
          ✏️ {t('shortcutsEditTitle')}
        </h4>
        <div className="flex flex-col gap-1.5 text-[10px] text-[var(--cordel-text)]">
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutWeakStrokesDesc')}</span>
            <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">d, e, g, a...</kbd>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutStrongStrokesDesc')}</span>
            <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">Shift + D, E...</kbd>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutNuanceWheelDesc')}</span>
            <div className="flex gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">↑ / ↓</kbd>
              <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">{lang === 'fr' ? 'Molette' : 'Roda'}</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutEraserDesc')}</span>
            <div className="flex gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">0</kbd>
              <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">{lang === 'fr' ? 'Suppr / ⌫' : 'Delete / ⌫'}</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutSplitStepDesc')}</span>
            <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">{lang === 'fr' ? 'Alt + Clic' : 'Alt + Clique'}</kbd>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutDuplicateMeasureDesc')}</span>
            <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">Ctrl + D</kbd>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-black/5">
            <span className="font-medium">{t('shortcutUndoRedoDesc')}</span>
            <div className="flex gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">Ctrl+Z</kbd>
              <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">Ctrl+Shift+Z / Y</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 py-0.5">
            <span className="font-medium">{t('shortcutSpecialToolsDesc')}</span>
            <kbd className="px-1.5 py-0.5 bg-[#fdfbf7] cordel-border-sm font-mono font-bold text-[9px] text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] shrink-0">B / C / X</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
