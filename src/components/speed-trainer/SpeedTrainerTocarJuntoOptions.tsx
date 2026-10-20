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
  selectedBaseOnly: boolean;
  setSelectedBaseOnly: (val: boolean) => void;
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
  selectedBaseOnly,
  setSelectedBaseOnly,
  showAoVivoSticks,
  setShowAoVivoSticks,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#1a1a1a]">
        {lang === 'fr' ? '2. Options de jeu :' : '2. Opções de treino :'}
      </label>
      <div className="p-3 bg-white/60 border-2 border-[#1a1a1a] flex flex-col gap-3 rounded-none shadow-[2px_2px_0px_#1a1a1a]">
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
            <div className="flex flex-col pr-2">
              <span className="font-cactus font-bold text-xs text-[#1a1a1a]">{t('tocarJuntoMuteInstrument')}</span>
              <span className="text-[10px] text-black/60 leading-tight">
                {lang === 'fr' ? 'Coupe l’audio de ce pupitre dans le batuque.' : 'Silencia o áudio deste naipe no batuque.'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={isMutedOption}
              onChange={(e) => setIsMutedOption(e.target.checked)}
              className="w-4 h-4 accent-[#c25e38] cursor-pointer shrink-0"
            />
          </label>

          {isMutedOption && hasFamilyGroup && (
            <div className="mt-1 pl-3 border-l-2 border-[#c25e38] flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setSelectedMuteScope('track')}
                className={`px-3 py-1.5 border-2 text-left flex items-center gap-2 cursor-pointer text-xs font-cactus ${
                  selectedMuteScope === 'track' ? 'border-[#1a1a1a] bg-[#c25e38] text-white' : 'border-[#1a1a1a]/40 bg-white/80 text-[#1a1a1a]'
                }`}
              >
                <span className="font-bold">{t('muteScopeSingle')}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMuteScope('family')}
                className={`px-3 py-1.5 border-2 text-left flex items-center gap-2 cursor-pointer text-xs font-cactus ${
                  selectedMuteScope === 'family' ? 'border-[#1a1a1a] bg-[#c25e38] text-white' : 'border-[#1a1a1a]/40 bg-white/80 text-[#1a1a1a]'
                }`}
              >
                <span className="font-bold">{t('muteScopeFamily')}{familyLabel ? ` (${familyLabel})` : ''}</span>
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-black/15" />

        <div className="flex flex-col gap-1.5">
          <span className="font-cactus font-bold text-xs text-[#1a1a1a]">{t('tocarJuntoVariationMode')}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedBaseOnly(true)}
              className={`p-2 border-2 text-left flex flex-col gap-0.5 cursor-pointer ${
                selectedBaseOnly ? 'border-[#1a1a1a] bg-[var(--cordel-wood)] text-white' : 'border-[#1a1a1a]/30 bg-white/70 text-[#1a1a1a]'
              }`}
            >
              <span className="font-cactus font-bold text-xs">🔒 {t('tocarJuntoBasePure')}</span>
              <span className="text-[10px] opacity-80 leading-tight">{t('tocarJuntoBasePureDesc')}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedBaseOnly(false)}
              className={`p-2 border-2 text-left flex flex-col gap-0.5 cursor-pointer ${
                !selectedBaseOnly ? 'border-[#1a1a1a] bg-[var(--cordel-wood)] text-white' : 'border-[#1a1a1a]/30 bg-white/70 text-[#1a1a1a]'
              }`}
            >
              <span className="font-cactus font-bold text-xs">🎲 {t('tocarJuntoFreeGame')}</span>
              <span className="text-[10px] opacity-80 leading-tight">{t('tocarJuntoFreeGameDesc')}</span>
            </button>
          </div>
        </div>

        <div className="border-t border-black/15" />

        <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
          <div className="flex flex-col pr-2">
            <span className="font-cactus font-bold text-xs text-[#1a1a1a]">{t('tocarJuntoShowAoVivo')}</span>
            <span className="text-[10px] text-black/60 leading-tight">
              {lang === 'fr' ? 'Affiche les baguettes animées en vue Roda.' : 'Exibe as baquetas animadas na Roda.'}
            </span>
          </div>
          <input
            type="checkbox"
            checked={showAoVivoSticks}
            onChange={(e) => setShowAoVivoSticks(e.target.checked)}
            className="w-4 h-4 accent-[#c25e38] cursor-pointer shrink-0"
          />
        </label>
      </div>
    </div>
  );
};
