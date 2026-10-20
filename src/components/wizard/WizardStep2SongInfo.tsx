import React from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
import { Language } from '../../types';
import { t } from './wizardConstants';

interface WizardStep2SongInfoProps {
  wizardLang: Language;
  onGenerate: () => void;
}

export const WizardStep2SongInfo: React.FC<WizardStep2SongInfoProps> = ({
  wizardLang,
  onGenerate,
}) => {
  const songInfo = useWizardStore((state) => state.songInfo);
  const updateSongInfo = useWizardStore((state) => state.updateSongInfo);

  return (
    <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-4 rounded-sm">
      <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider border-b border-[#1a1a1a]/20 pb-1">
        {t[wizardLang].identiteMorceau}
      </h3>
      <span className="text-[11px] md:text-xs text-[#1a1a1a] font-cactus font-bold uppercase -mt-2">
        {t[wizardLang].espritMorceau}
      </span>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
            {t[wizardLang].rodaLabel}
          </label>
          <input
            type="text"
            value={songInfo.rodaName}
            onChange={(e) => updateSongInfo('rodaName', e.target.value)}
            placeholder={t[wizardLang].placeholderSaisir}
            className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
            {t[wizardLang].toadaLabel}
          </label>
          <input
            type="text"
            value={songInfo.toadaName}
            onChange={(e) => updateSongInfo('toadaName', e.target.value)}
            placeholder={t[wizardLang].placeholderSaisir}
            className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
            {t[wizardLang].nacaoLabel}
          </label>
          <input
            type="text"
            value={songInfo.nacaoName}
            onChange={(e) => updateSongInfo('nacaoName', e.target.value)}
            placeholder={t[wizardLang].placeholderSaisir}
            className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
            {t[wizardLang].compositeurLabel}
          </label>
          <input
            type="text"
            value={songInfo.composer}
            onChange={(e) => updateSongInfo('composer', e.target.value)}
            placeholder={t[wizardLang].placeholderSaisir}
            className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
            {t[wizardLang].ritmoLabel}
          </label>
          <input
            type="text"
            value={songInfo.mainRythm}
            onChange={(e) => updateSongInfo('mainRythm', e.target.value)}
            placeholder={t[wizardLang].placeholderSaisir}
            className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
            {t[wizardLang].youtubeLabel}
          </label>
          <input
            type="url"
            value={songInfo.youtubeUrl}
            onChange={(e) => updateSongInfo('youtubeUrl', e.target.value)}
            placeholder="https://..."
            className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-sans text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
          />
        </div>
      </div>

      <button
        onClick={onGenerate}
        className="w-full mt-4 py-4 bg-[#8b2a1a] text-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] active:scale-[0.98] transition-all cursor-pointer font-cactus font-bold uppercase text-base md:text-lg tracking-wider"
      >
        {t[wizardLang].faireSonner}
      </button>
    </div>
  );
};
