/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language, TrackGroup } from '../../types';
import { Feather } from 'lucide-react';
import { RightSidebarKaraokeViewer } from './RightSidebarKaraokeViewer';

interface RightSidebarToadaTabProps {
  lang: Language;
  t: (key: string) => string;
  letras: string;
  onLetrasChange: (val: string) => void;
  onExtractLyrics?: () => void;
  onOpenAuthorshipModal: () => void;
  tracks: TrackGroup[];
  karaokeContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const RightSidebarToadaTab: React.FC<RightSidebarToadaTabProps> = ({
  lang,
  t,
  letras,
  onLetrasChange,
  onExtractLyrics,
  onOpenAuthorshipModal,
  tracks,
  karaokeContainerRef,
}) => {
  const letrasRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (letrasRef.current) letrasRef.current.value = letras || '';
  }, [letras]);

  return (
    <div className="flex flex-col flex-grow overflow-hidden min-h-0">
      <div className="flex items-center justify-between mb-1 shrink-0">
        <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus text-left">
          {lang === 'fr' ? 'Paroles de la Toada' : 'Letra da Toada'}
        </span>
        <button
          onClick={onOpenAuthorshipModal}
          className="flex items-center gap-1 opacity-60 hover:opacity-100 text-[var(--cordel-text)] transition-opacity"
          title="C'est votre texte ?"
        >
          <Feather size={14} />
        </button>
      </div>

      <div className="xilo-feedback-container flex flex-col flex-grow overflow-hidden min-h-0 p-4 gap-2 mb-1">
        <textarea
          ref={letrasRef}
          id="letras-textarea"
          placeholder={t('letrasPlaceholder')}
          defaultValue={letras}
          onBlur={(e) => {
            if (e.target.value !== letras) onLetrasChange(e.target.value);
          }}
          className="xilo-textarea h-[120px] min-h-[80px] mb-3 shrink-0"
        />

        {onExtractLyrics && (
          <button
            onClick={onExtractLyrics}
            className="w-full py-1.5 bg-[#8b2a1a] text-[#f4ecd8] text-xs font-bold cordel-border-sm hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer mb-3 shrink-0 flex items-center justify-center gap-1.5"
            title={t('extractBtn')}
          >
            <span>{t('extractBtn')}</span>
          </button>
        )}

        <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus mb-1 shrink-0 text-left flex items-center gap-1.5">
          {lang === 'fr' ? 'Letra da Toada (Ao Vivo)' : 'Letra da Toada (Ao Vivo)'}
        </span>

        <RightSidebarKaraokeViewer tracks={tracks} lang={lang} containerRef={karaokeContainerRef} />
      </div>
    </div>
  );
};
