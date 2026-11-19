import React from 'react';

interface SpeedTrainerTocarJuntoOptionsProps {
  lang: string;
  t: (key: string) => string;
  isMutedOption: boolean;
  setIsMutedOption: (val: boolean) => void;
  hasFamilyGroup: boolean;
  selectedMuteScope: 'track' | 'family';
  setSelectedMuteScope: (scope: 'track' | 'family') => void;
  familyLabel: string;
  selectedBaseOnly?: boolean;
  setSelectedBaseOnly?: (val: boolean) => void;
  showAoVivoSticks: boolean;
  setShowAoVivoSticks: (val: boolean) => void;
}

export const SpeedTrainerTocarJuntoOptions: React.FC<SpeedTrainerTocarJuntoOptionsProps> = ({
  lang,
  t,
  isMutedOption,
  setIsMutedOption,
  hasFamilyGroup,
  selectedMuteScope,
  setSelectedMuteScope,
  familyLabel,
  showAoVivoSticks,
  setShowAoVivoSticks,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-ink-dark)]">
        {lang === 'fr' ? '2. Options de jeu :' : '2. Opções de treino :'}
      </label>
      <div className="p-3 bg-[var(--cordel-parchment-surface)] border-2 border-[var(--cordel-ink-dark)] flex flex-col gap-3 rounded-none shadow-[2px_2px_0px_var(--cordel-ink-dark)]">
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
            <div className="flex flex-col pr-2">
              <span className="font-cactus font-bold text-xs text-[var(--cordel-ink-dark)]">{t('tocarJuntoMuteInstrument')}</span>
              <span className="text-[10px] text-[var(--cordel-ink-dark)]/60 leading-tight">
                {lang === 'fr' ? 'Coupe l’audio de ce pupitre dans le batuque.' : 'Silencia o áudio deste naipe no batuque.'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={isMutedOption}
              onChange={(e) => setIsMutedOption(e.target.checked)}
              className="w-4 h-4 accent-[var(--cordel-accent)] cursor-pointer shrink-0"
            />
          </label>

          {isMutedOption && hasFamilyGroup && (
            <div className="mt-1 pl-3 border-l-2 border-[var(--cordel-accent)] flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setSelectedMuteScope('track')}
                className={`px-3 py-1.5 border-2 text-left flex items-center gap-2 cursor-pointer text-xs font-cactus ${
                  selectedMuteScope === 'track' ? 'border-[var(--cordel-ink-dark)] bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]' : 'border-[var(--cordel-ink-dark)]/40 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)]'
                }`}
              >
                <span className="font-bold">{t('muteScopeSingle')}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMuteScope('family')}
                className={`px-3 py-1.5 border-2 text-left flex items-center gap-2 cursor-pointer text-xs font-cactus ${
                  selectedMuteScope === 'family' ? 'border-[var(--cordel-ink-dark)] bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]' : 'border-[var(--cordel-ink-dark)]/40 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)]'
                }`}
              >
                <span className="font-bold">{t('muteScopeFamily')}{familyLabel ? ` (${familyLabel})` : ''}</span>
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--cordel-ink-dark)]/15" />

        <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
          <div className="flex flex-col pr-2">
            <span className="font-cactus font-bold text-xs text-[var(--cordel-ink-dark)]">{t('tocarJuntoShowAoVivo')}</span>
            <span className="text-[10px] text-[var(--cordel-ink-dark)]/60 leading-tight">
              {lang === 'fr' ? 'Affiche les baguettes animées en vue Roda.' : 'Exibe as baquetas animadas na Roda.'}
            </span>
          </div>
          <input
            type="checkbox"
            checked={showAoVivoSticks}
            onChange={(e) => setShowAoVivoSticks(e.target.checked)}
            className="w-4 h-4 accent-[var(--cordel-accent)] cursor-pointer shrink-0"
          />
        </label>
      </div>
    </div>
  );
};
