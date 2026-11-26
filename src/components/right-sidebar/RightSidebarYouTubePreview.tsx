import React, { useState, useEffect } from 'react';
import { Video } from 'lucide-react';
import { Language } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface RightSidebarYouTubePreviewProps {
  youtubeUrl: string;
  lang: Language;
}

/**
 * Façade légère YouTube à hauteur constante (< 115 lignes) :
 * - Affiche par défaut la miniature statique (0 processus `<iframe>` monté tant que l'utilisateur ne clique pas).
 * - Démonte automatiquement l'`<iframe>` vers la miniature dès que `Sequenciador` passe en `isPlaying === true`.
 */
export const RightSidebarYouTubePreview: React.FC<RightSidebarYouTubePreviewProps> = ({ youtubeUrl, lang }) => {
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const [overrideOrientation, setOverrideOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [isIframeRequested, setIsIframeRequested] = useState(false);

  useEffect(() => {
    setOverrideOrientation('auto');
    setIsIframeRequested(false);
  }, [youtubeUrl]);

  useEffect(() => {
    if (isPlaying && isIframeRequested) setIsIframeRequested(false);
  }, [isPlaying, isIframeRequested]);

  const isDetectedShort = Boolean(
    youtubeUrl && (youtubeUrl.includes('/shorts/') || youtubeUrl.includes('youtube.com/shorts'))
  );
  const isPortrait = overrideOrientation === 'auto' ? isDetectedShort : overrideOrientation === 'portrait';

  const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  const videoId = match ? match[1] : null;
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : '';
  const thumbUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';

  if (!videoId) return null;
  const showIframe = isIframeRequested && !isPlaying;
  const frameBoxClass = isPortrait
    ? 'aspect-[9/16] max-h-[460px] w-auto mx-auto rounded-none border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]'
    : 'aspect-video w-full rounded-none border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]';

  return (
    <div className="mt-2.5 flex flex-col items-center w-full">
      <div className="w-full flex items-center justify-between mb-1.5 gap-2">
        <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase font-cactus opacity-75 flex items-center gap-1.5 truncate">
          <Video className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <span className="truncate">
            {lang === 'fr'
              ? (isPortrait ? 'Format smartphone (9:16)' : 'Format paysage (16:9)')
              : (isPortrait ? 'Formato celular (9:16)' : 'Formato paisagem (16:9)')}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setOverrideOrientation(isPortrait ? 'landscape' : 'portrait')}
          className="px-2 py-0.5 text-[10px] font-cactus font-bold uppercase cordel-border-sm bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
          title={isPortrait ? 'Basculer en 16:9' : 'Basculer en 9:16'}
        >
          {isPortrait ? (
            <>
              <svg viewBox="0 0 16 11" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="1" y="1" width="14" height="9" rx="0.5" />
              </svg>
              <span>16:9</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 11 16" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="1" y="1" width="9" height="14" rx="0.5" />
              </svg>
              <span>9:16</span>
            </>
          )}
        </button>
      </div>
      <div className={`overflow-hidden relative bg-[var(--cordel-surface)] ${frameBoxClass}`}>
        {showIframe ? (
          <iframe
            width="100%"
            height="100%"
            src={embedUrl}
            title="YouTube Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsIframeRequested(true)}
            aria-label={lang === 'fr' ? 'Charger la vidéo de référence' : 'Carregar vídeo de referência'}
            className="relative w-full h-full block cursor-pointer group focus:outline-none"
          >
            <img
              src={thumbUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            />
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="w-12 h-9 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg viewBox="0 0 16 16" className="w-4 h-4 ml-0.5" fill="currentColor" aria-hidden="true">
                  <polygon points="4,2.5 13.5,8 4,13.5" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
