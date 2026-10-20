import React from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
import { Language } from '../../types';
import { t } from './wizardConstants';

interface WizardStep2FoundationProps {
  wizardLang: Language;
}

export const WizardStep2Foundation: React.FC<WizardStep2FoundationProps> = ({ wizardLang }) => {
  const selectedBasePatternId = useWizardStore((state) => state.selectedBasePatternId);
  const setSelectedBasePatternId = useWizardStore((state) => state.setSelectedBasePatternId);
  const timeSig = useWizardStore((state) => state.timeSig);
  const setTimeSig = useWizardStore((state) => state.setTimeSig);
  const bpm = useWizardStore((state) => state.bpm);
  const setBpm = useWizardStore((state) => state.setBpm);

  return (
    <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-3 rounded-sm">
      <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider border-b border-[#1a1a1a]/20 pb-1">
        {t[wizardLang].fondation}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
            {t[wizardLang].rythmeClassique}
          </label>
          <select
            value={selectedBasePatternId || ''}
            onChange={(e) => setSelectedBasePatternId(e.target.value || null)}
            className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] p-2.5 font-cactus font-bold text-xs uppercase tracking-wider text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] cursor-pointer"
          >
            <option value="">{t[wizardLang].vierge}</option>
            <option value="luanda">Baque Luanda</option>
            <option value="trovao">Baque Trovão</option>
            <option value="martelo">Baque Martelo</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
            {t[wizardLang].signatureRythmique}
          </label>
          <select
            value={timeSig}
            onChange={(e) => setTimeSig(e.target.value)}
            className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2.5 font-cactus font-bold text-xs uppercase tracking-wider text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] cursor-pointer"
          >
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="2/4">2/4</option>
            <option value="6/8">6/8</option>
            <option value="12/8">12/8</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
            Tempo (BPM)
          </label>
          <input
            type="number"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full bg-[#ece4d0] border-2 border-[#1a1a1a] p-2 font-cactus font-bold text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8b2a1a] shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-sm"
          />
        </div>
      </div>
    </div>
  );
};
