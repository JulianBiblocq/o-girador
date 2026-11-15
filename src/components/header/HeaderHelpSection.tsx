import React from 'react';
import { HelpCircle, Video, BookOpen, MessageSquare, Share2, ScrollText } from 'lucide-react';
import { XiloFanion } from '../XiloIcons';
import { useSequencer } from '../../contexts/SequencerContext';
import { i18n } from '../../data';

interface HeaderHelpSectionProps {
  lang: 'pt' | 'fr';
  onToggleRightPanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais') => void;
  onMobileTabToggle?: (tab: 'roda' | 'mixer' | 'toada') => void;
  onViewModeToggle: (mode: any) => void;
  onOpenWallpaperModal?: () => void;
  showWallpaperOption?: boolean;
  onCloseMenu: () => void;
}

export const HeaderHelpSection: React.FC<HeaderHelpSectionProps> = ({
  lang,
  onToggleRightPanel,
  onMobileTabToggle,
  onViewModeToggle,
  onOpenWallpaperModal,
  showWallpaperOption = false,
  onCloseMenu,
}) => {
  const sequencer = useSequencer();
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const handleShareApp = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'O Girador',
          text: 'O Girador - Sequenciador de Maracatu',
          url: window.location.href,
        });
      } catch {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        await sequencer.alertAsync(lang === 'pt' ? 'Link copiado!' : 'Lien copié !');
      } catch {}
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wide flex items-center gap-1.5 font-cactus">
        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{lang === 'pt' ? 'Ajuda & Sobre' : 'Aide & À propos'}</span>
      </span>

      <div className="grid grid-cols-2 gap-1.5 mt-0.5">
        <button
          type="button"
          onClick={() => {
            window.open('https://youtube.com/playlist?list=PLBaYhFEJG6PwhFTn0mbfkdejwOrphZRu1&si=p80nNE9lcbzij4Eo', '_blank');
            onCloseMenu();
          }}
          className="px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-xs font-bold font-cactus hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
        >
          <Video className="w-3.5 h-3.5 shrink-0" /> Tuto
        </button>
        <button
          type="button"
          onClick={() => { window.open('/tutorial.html', '_blank'); onCloseMenu(); }}
          className="px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-xs font-bold font-cactus hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" /> Guide
        </button>
        <button
          type="button"
          onClick={() => { onToggleRightPanel('feedback'); onMobileTabToggle?.('toada'); onCloseMenu(); }}
          className="px-2 py-1.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-xs font-bold font-cactus hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{t('feedbackBtn')}</span>
        </button>
        <button
          type="button"
          onClick={() => { void handleShareApp(); onCloseMenu(); }}
          className="px-2 py-1.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-xs font-bold font-cactus hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{lang === 'pt' ? 'Compartilhar' : 'Partager'}</span>
        </button>
        <button
          type="button"
          onClick={() => { onViewModeToggle('landing'); onCloseMenu(); }}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer col-span-2 transition-colors"
        >
          <ScrollText className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Sobre O Girador' : 'À propos'}
        </button>
        {showWallpaperOption && onOpenWallpaperModal && (
          <button
            type="button"
            onClick={() => { onOpenWallpaperModal(); onCloseMenu(); }}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border)] text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer col-span-2 transition-colors"
          >
            <XiloFanion size={14} className="shrink-0" /> {lang === 'pt' ? 'Papel de Parede' : 'Papier Peint'}
          </button>
        )}
      </div>
    </div>
  );
};
