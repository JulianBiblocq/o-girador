/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Encart des 4 métadonnées du morceau actif pour le bandeau conducteur mobile (< 50 lignes).
 */
import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudio } from '../../contexts/AudioContext';

interface Props {
  onClick?: () => void;
  fallbackRhythm?: string;
  lang?: 'fr' | 'pt';
}

export const MobileConductorSongInfo: React.FC<Props> = ({ onClick, fallbackRhythm, lang: propLang }) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const metadata = useSequencerStore((s) => s.metadata);
  const { activePresetName } = useAudio();
  const lang = propLang || storeLang || 'pt';

  const toadaName = metadata?.toada || activePresetName || '—';
  const nacaoName = metadata?.nacao || '—';
  const compName = metadata?.compositor || '—';
  const ritmoName = metadata?.ritmo || fallbackRhythm || '—';

  return (
    <div
      onClick={onClick}
      className="ml-auto pl-2.5 border-l border-[#1a1a1a]/20 dark:border-[#f4ecd8]/20 flex flex-col justify-center gap-0.5 text-right sm:text-left max-w-[48%] shrink-0 relative z-10 cursor-pointer active:opacity-75 transition-opacity select-none"
      title={lang === 'pt' ? 'Ver informações e vídeo da toada' : 'Voir les informations et la vidéo du morceau'}
    >
      <span className="text-[11px] font-extrabold text-[#1a1a1a] dark:text-[#f4ecd8] truncate leading-tight">
        {toadaName}
      </span>
      <span className="text-[10px] text-[#1a1a1a]/80 dark:text-[#f4ecd8]/80 truncate leading-tight">
        {lang === 'fr' ? 'Groupe' : 'Nação'} : {nacaoName}
      </span>
      <span className="text-[10px] text-[#1a1a1a]/80 dark:text-[#f4ecd8]/80 truncate leading-tight">
        Comp. : {compName}
      </span>
      <span className="text-[10px] font-bold text-[#8b2a1a] dark:text-[#f59e0b] truncate leading-tight">
        Baque : {ritmoName}
      </span>
    </div>
  );
};
