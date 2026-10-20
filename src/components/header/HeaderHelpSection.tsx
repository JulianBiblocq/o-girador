import React from 'react';
import { HelpCircle, Video, BookOpen, MessageSquare, Share2 } from 'lucide-react';
import { XiloFanion } from '../XiloIcons';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { i18n } from '../../data';

interface HeaderHelpSectionProps {
  lang: 'pt' | 'fr';
  onToggleRightPanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais') => void;
  onMobileTabToggle?: (tab: 'roda' | 'mixer' | 'toada') => void;
  onViewModeToggle: (mode: any) => void;
  onOpenWallpaperModal?: () => void;
  onCloseMenu: () => void;
}

export const HeaderHelpSection: React.FC<HeaderHelpSectionProps> = ({
  lang,
  onToggleRightPanel,
  onMobileTabToggle,
  onViewModeToggle,
  onOpenWallpaperModal,
  onCloseMenu,
}) => {
  const sequencer = useSequencer();
  const ecoMode = useSequencerStore((state) => state.isEcoMode);
  const toggleEcoMode = useSequencerStore((state) => state.toggleEcoMode);
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const handleShareApp = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'O Girador',
          text: 'O Girador - Sequenciador de Maracatu',
          url: window.location.href,
        });
      } catch (_) {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        await sequencer.alertAsync(lang === 'pt' ? 'Link copiado!' : 'Lien copié !');
      } catch (_) {}
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold text-[#d99b26] uppercase tracking-wide flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 shrink-0 text-[#d99b26]" /> {lang === 'pt' ? 'Ajuda & Comunidade' : 'Aide & Communauté'}
      </span>

      <div className="grid grid-cols-2 gap-1.5 mt-1">
        <button
          onClick={() => {
            window.open('https://youtube.com/playlist?list=PLBaYhFEJG6PwhFTn0mbfkdejwOrphZRu1&si=p80nNE9lcbzij4Eo', '_blank');
            onCloseMenu();
          }}
          className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
        >
          <Video className="w-3.5 h-3.5 shrink-0" /> Tuto
        </button>
        <button
          onClick={() => {
            window.open('/tutorial.html', '_blank');
            onCloseMenu();
          }}
          className="px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" /> Guide
        </button>
        <button
          onClick={() => {
            onToggleRightPanel('feedback');
            onMobileTabToggle?.('toada');
            onCloseMenu();
          }}
          className="px-2 py-1.5 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" /> {t('feedbackBtn')}
        </button>
        <button
          onClick={() => {
            handleShareApp();
            onCloseMenu();
          }}
          className="px-2 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer flex items-center justify-center gap-1 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 shrink-0" /> {lang === 'pt' ? 'Compartilhar o App' : "Partager l'application"}
        </button>
        <button
          onClick={() => {
            onViewModeToggle('landing');
            onCloseMenu();
          }}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer col-span-2 transition-colors"
        >
          <span>📜</span> {lang === 'pt' ? 'Sobre' : 'À propos'}
        </button>
        {onOpenWallpaperModal && (
          <button
            onClick={() => {
              onOpenWallpaperModal();
              onCloseMenu();
            }}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer col-span-2 transition-colors"
          >
            <XiloFanion size={14} className="shrink-0" /> {lang === 'pt' ? 'Papel de Parede' : 'Papier Peint'}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 border-t border-[var(--cordel-text)]/30 pt-2 mt-2">
        <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-[var(--cordel-text)]">
          <input
            type="checkbox"
            checked={ecoMode}
            onChange={toggleEcoMode}
            className="accent-[var(--cordel-text)] w-4 h-4 cursor-pointer"
          />
          🌱 Mode Éco {ecoMode ? '(On)' : '(Off)'}
        </label>
        <div className="text-xs opacity-80 leading-tight text-[var(--cordel-text)] font-sans">
          {lang === 'fr' ? 'Désactive les animations pour soulager la tablette.' : 'Desativa animações para aliviar o tablet.'}
        </div>
      </div>
    </div>
  );
};
