/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen } from 'lucide-react';
import { Language, PresetMetadata } from '../../types';
import { RightSidebarYouTubePreview } from './RightSidebarYouTubePreview';

interface RightSidebarMetadataTabProps {
  metadata: PresetMetadata;
  onMetadataChange: (newMeta: PresetMetadata) => void;
  lang: Language;
  t: (key: string) => string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  getCurrentDescription: (meta?: PresetMetadata, currentLang?: Language) => string;
  onOpenDescriptionModal: () => void;
}

export const RightSidebarMetadataTab: React.FC<RightSidebarMetadataTabProps> = ({
  metadata,
  onMetadataChange,
  lang,
  t,
  textareaRef,
  getCurrentDescription,
  onOpenDescriptionModal,
}) => {
  const toadaInputRef = React.useRef<HTMLInputElement>(null);
  const nacaoInputRef = React.useRef<HTMLInputElement>(null);
  const compositorInputRef = React.useRef<HTMLInputElement>(null);
  const ritmoInputRef = React.useRef<HTMLInputElement>(null);
  const youtubeInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (metadata) {
      if (toadaInputRef.current) toadaInputRef.current.value = metadata.toada || '';
      if (nacaoInputRef.current) nacaoInputRef.current.value = metadata.nacao || '';
      if (compositorInputRef.current) compositorInputRef.current.value = metadata.compositor || '';
      if (ritmoInputRef.current) ritmoInputRef.current.value = metadata.ritmo || '';
      if (youtubeInputRef.current) youtubeInputRef.current.value = metadata.youtubeUrl || '';
      if (textareaRef.current) textareaRef.current.value = getCurrentDescription(metadata, lang);
    }
  }, [metadata, lang, getCurrentDescription, textareaRef]);

  return (
    <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0">
      <div className="xilo-feedback-container flex flex-col gap-2">
        <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1">{t('metaInfo')}</span>
        <input
          ref={toadaInputRef}
          type="text"
          placeholder={t('metaToada')}
          defaultValue={metadata.toada}
          onBlur={(e) => { if (e.target.value !== metadata.toada) onMetadataChange({ ...metadata, toada: e.target.value }); }}
          className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
        />
        <input
          ref={nacaoInputRef}
          type="text"
          placeholder={t('metaNacao')}
          defaultValue={metadata.nacao}
          onBlur={(e) => { if (e.target.value !== metadata.nacao) onMetadataChange({ ...metadata, nacao: e.target.value }); }}
          className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
        />
        <input
          ref={compositorInputRef}
          type="text"
          placeholder={t('metaCompositor')}
          defaultValue={metadata.compositor}
          onBlur={(e) => { if (e.target.value !== metadata.compositor) onMetadataChange({ ...metadata, compositor: e.target.value }); }}
          className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
        />
        <input
          ref={ritmoInputRef}
          type="text"
          placeholder={t('metaRitmo')}
          defaultValue={metadata.ritmo}
          onBlur={(e) => { if (e.target.value !== metadata.ritmo) onMetadataChange({ ...metadata, ritmo: e.target.value }); }}
          className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
        />
        <input
          ref={youtubeInputRef}
          type="text"
          placeholder={lang === 'pt' ? 'Link do YouTube' : 'Lien YouTube'}
          defaultValue={metadata.youtubeUrl || ''}
          onBlur={(e) => { if (e.target.value !== (metadata.youtubeUrl || '')) onMetadataChange({ ...metadata, youtubeUrl: e.target.value }); }}
          className="bg-transparent border-b border-[var(--cordel-border)]/30 text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
        />
        {metadata.youtubeUrl && <RightSidebarYouTubePreview youtubeUrl={metadata.youtubeUrl} lang={lang} />}
        <div className="flex items-center justify-between gap-2 mt-3 mb-1">
          <span className="text-[11px] font-bold text-[var(--cordel-text)] uppercase font-cactus tracking-wide truncate">
            {lang === 'fr' ? 'Histoire & Contexte' : 'História & Contexto'}
          </span>
          <button
            type="button"
            onClick={onOpenDescriptionModal}
            className="cordel-border-sm bg-[#8b2a1a] hover:bg-[#1a1a1a] text-[#f4ecd8] px-2.5 py-1 text-[11px] font-cactus font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-[2px_2px_0px_#1a1a1a]"
          >
            <BookOpen size={13} className="shrink-0 text-[#f4ecd8]" />
            <span>{lang === 'fr' ? 'Lire plus' : 'Ler mais'}</span>
          </button>
        </div>
        <textarea
          ref={textareaRef}
          placeholder={lang === 'pt' ? 'Descrição / História do ritmo...' : 'Description / Histoire du rythme...'}
          defaultValue={getCurrentDescription(metadata, lang)}
          onBlur={(e) => {
            const val = e.target.value;
            if (lang === 'pt') {
              if (val !== (metadata.descriptionPt || metadata.description || '')) {
                onMetadataChange({ ...metadata, descriptionPt: val, description: val });
              }
            } else {
              if (val !== (metadata.descriptionFr || '')) {
                onMetadataChange({ ...metadata, descriptionFr: val });
              }
            }
          }}
          rows={3}
          className="xilo-textarea max-h-32 overflow-y-auto custom-scrollbar resize-none"
          style={{ minHeight: '64px' }}
        />
      </div>
    </div>
  );
};
