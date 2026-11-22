
import React from 'react';
import { X, GraduationCap } from 'lucide-react';
import { XiloLightning, XiloLock } from '../XiloIcons';
import { guardFeatureWithModal } from '../../utils/cloudWriteGuard';

export type SpeedTrainerTab = 'speedTrainer' | 'mestreChallenges';

interface SpeedTrainerHeaderProps {
  lang: string;
  t: (key: string) => string;
  activeTab: SpeedTrainerTab;
  setActiveTab: (tab: SpeedTrainerTab) => void;
  isMestre: boolean;
  isActive: boolean;
  currentTour: number;
  currentBpm: number;
  targetBpm: number;
  onClose: () => void;
}

export const SpeedTrainerHeader: React.FC<SpeedTrainerHeaderProps> = ({
  lang,
  t,
  activeTab,
  setActiveTab,
  isMestre,
  isActive,
  currentTour,
  currentBpm,
  targetBpm,
  onClose,
}) => {
  const titleText = t('speedTrainerModalTitle');
  const displayTitle = !titleText || titleText === 'speedTrainerModalTitle'
    ? (lang === 'fr' ? 'MODE ENTRAÎNEMENT' : 'MODO TREINO')
    : titleText;

  return (
    <>
      <div className="bg-[#1a1a1a] text-[#f4ecd8] px-5 py-3.5 flex items-center justify-between border-b-4 border-[#1a1a1a] shrink-0">
        <div className="flex items-center gap-2.5">
          <XiloLightning size={24} className="text-[#f4ecd8]" />
          <h2 className="font-cactus font-bold text-xl uppercase tracking-wider text-[#f4ecd8]">
            {displayTitle}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center border-2 border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] font-bold text-base transition-colors shadow-[2px_2px_0px_#1a1a1a] cursor-pointer text-[#1a1a1a]"
          title={lang === 'fr' ? 'Fermer (Échap)' : 'Fechar (Esc)'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] px-3 pt-2 gap-2 overflow-x-auto shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('speedTrainer')}
          className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase tracking-wide border-t-2 border-x-2 border-[var(--cordel-border-strong)] rounded-t-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'speedTrainer' ? 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] -mb-[2px] pb-2' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text-muted)] hover:text-[var(--cordel-text)]'
          }`}
        >
          <XiloLightning size={14} />
          {t('speedTrainerTabSpeed')}
        </button>

        <button
          type="button"
          onClick={() => {
            if (!isMestre && !guardFeatureWithModal('speed_trainer_create')) return;
            setActiveTab('mestreChallenges');
          }}
          className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase tracking-wide border-t-2 border-x-2 border-[var(--cordel-border-strong)] rounded-t-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'mestreChallenges' ? 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] -mb-[2px] pb-2' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text-muted)] hover:text-[var(--cordel-text)]'
          }`}
        >
          <GraduationCap size={14} />
          <span>{t('speedTrainerTabMestreChallenges')}</span>
          {!isMestre && <XiloLock size={12} className="shrink-0 opacity-70" />}
        </button>
      </div>

      {isActive && activeTab === 'speedTrainer' && (
        <div className="bg-amber-500/15 border-b-2 border-amber-600/50 p-2.5 px-4 flex items-center justify-between text-xs font-bold text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
            </span>
            <span>{t('speedTrainerActiveBanner')} : {t('speedTrainerTour')} {currentTour + 1}</span>
          </div>
          <span className="font-cactus text-sm">{currentBpm} / {targetBpm} BPM</span>
        </div>
      )}
    </>
  );
};
