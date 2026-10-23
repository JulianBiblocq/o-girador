/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet Informations et Vidéo YouTube du morceau actif (< 120 lignes).
 */
import React from 'react';
import { Video, ExternalLink, Music, BookOpen, User, Users } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudio } from '../../contexts/AudioContext';

interface Props {
  lang?: 'fr' | 'pt';
}

export const MobileSongInfoTab: React.FC<Props> = ({ lang: propLang }) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const metadata = useSequencerStore((s) => s.metadata);
  const { activePresetName } = useAudio();
  const lang = propLang || storeLang || 'pt';

  const toadaName = metadata?.toada || activePresetName || '—';
  const nacaoName = metadata?.nacao || '—';
  const compName = metadata?.compositor || '—';
  const ritmoName = metadata?.ritmo || '—';
  const description = (lang === 'pt' ? (metadata?.descriptionPt || metadata?.description) : (metadata?.descriptionFr || metadata?.description)) || '';
  const youtubeUrl = metadata?.youtubeUrl || '';

  const match = youtubeUrl ? youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/) : null;
  const videoId = match ? match[1] : null;
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar text-[var(--cordel-text)]">
      {/* 1. Fiche Récapitulative Cordel */}
      <div className="bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border)] p-2.5 shadow-[2px_2px_0px_#000] flex flex-col gap-1.5">
        <div className="text-sm font-cactus font-bold uppercase text-[#8b2a1a] dark:text-[#f59e0b] truncate border-b border-[var(--cordel-border)]/40 pb-1">
          {toadaName}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <Users size={13} className="text-[#b94a2c] shrink-0" />
            <span className="text-[var(--cordel-text-muted)]">{lang === 'fr' ? 'Groupe' : 'Nação'} :</span>
            <span className="font-bold truncate">{nacaoName}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <User size={13} className="text-[#b94a2c] shrink-0" />
            <span className="text-[var(--cordel-text-muted)]">{lang === 'fr' ? 'Compositeur' : 'Compositor'} :</span>
            <span className="font-bold truncate">{compName}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate sm:col-span-2">
            <Music size={13} className="text-[#b94a2c] shrink-0" />
            <span className="text-[var(--cordel-text-muted)]">Baque :</span>
            <span className="font-bold text-[#8b2a1a] dark:text-[#f59e0b] truncate">{ritmoName}</span>
          </div>
        </div>
      </div>

      {/* 2. Histoire et Notes du Morceau */}
      <div className="bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border)] p-2.5 shadow-[2px_2px_0px_#000] flex flex-col gap-1.5">
        <span className="text-xs font-cactus font-bold uppercase tracking-wider text-[var(--cordel-text)] flex items-center gap-1.5 border-b border-[var(--cordel-border)]/40 pb-1">
          <BookOpen size={13} className="text-[#b94a2c]" />
          <span>{lang === 'pt' ? 'História & Notas' : 'Histoire & Notes'}</span>
        </span>
        {description ? (
          <p className="text-xs font-serif leading-relaxed text-[var(--cordel-text)]/90 whitespace-pre-line italic">
            {description}
          </p>
        ) : (
          <p className="text-xs text-[var(--cordel-text-muted)] italic py-1">
            {lang === 'pt' ? 'Nenhuma nota histórica registrada para esta toada.' : 'Aucune note historique enregistrée pour ce morceau.'}
          </p>
        )}
      </div>

      {/* 3. Vidéo de Référence YouTube */}
      {embedUrl && (
        <div className="bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border)] p-2.5 shadow-[2px_2px_0px_#000] flex flex-col gap-2">
          <div className="flex items-center justify-between gap-1 border-b border-[var(--cordel-border)]/40 pb-1">
            <span className="text-xs font-cactus font-bold uppercase tracking-wider text-[var(--cordel-text)] flex items-center gap-1.5">
              <Video size={13} className="text-[#b94a2c]" />
              <span>{lang === 'pt' ? 'Vídeo de Referência' : 'Vidéo de Référence'}</span>
            </span>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-cactus font-bold uppercase text-[#b94a2c] hover:underline flex items-center gap-1"
            >
              <span>YouTube</span>
              <ExternalLink size={10} />
            </a>
          </div>
          <div className="aspect-video w-full border-2 border-[#1a1a1a] shadow-[1px_1px_0px_#000] overflow-hidden bg-black">
            <iframe
              width="100%"
              height="100%"
              src={embedUrl}
              title={toadaName}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};
