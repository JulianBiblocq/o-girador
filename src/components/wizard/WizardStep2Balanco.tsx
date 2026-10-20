import React from 'react';
import { useWizardStore } from '../../stores/useWizardStore';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { useAuth } from '../../contexts/AuthContext';
import { Language } from '../../types';
import { t } from './wizardConstants';

interface WizardStep2BalancoProps {
  wizardLang: Language;
}

export const WizardStep2Balanco: React.FC<WizardStep2BalancoProps> = ({ wizardLang }) => {
  const { userProfile } = useAuth();
  const balancoPresets = useBalancoStore((state) => state.presets);
  const selectedBalancoId = useWizardStore((state) => state.selectedBalancoId);
  const setSelectedBalancoId = useWizardStore((state) => state.setSelectedBalancoId);
  const swingIntensities = useWizardStore((state) => state.swingIntensities);
  const setSwingIntensity = useWizardStore((state) => state.setSwingIntensity);

  const myPresets = balancoPresets.filter((p) => userProfile?.uid && p.ownerId === userProfile.uid && !p.isFactory);
  const groupPresets = balancoPresets.filter((p) => p.visibility === 'mestre_group' && (!userProfile?.uid || p.ownerId !== userProfile.uid));
  const standardPresets = balancoPresets.filter((p) => p.isFactory || (p.visibility === 'public' && (!userProfile?.uid || p.ownerId !== userProfile.uid)));

  const slider = (key: keyof typeof swingIntensities, label: string) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]">
        <span>{label}</span>
        <span className="bg-[#1a1a1a] text-[#f4ecd8] px-1 py-0.5 rounded-sm text-[9px] font-cactus font-bold">{swingIntensities[key]}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={swingIntensities[key]}
        onChange={(e) => setSwingIntensity(key, Number(e.target.value))}
        className="w-full h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#8b2a1a] outline-none mt-1"
      />
    </div>
  );

  return (
    <div className="bg-[#f4ecd8] border-3 border-[#1a1a1a] p-4 md:p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col gap-4 rounded-sm">
      <h3 className="font-cactus text-lg md:text-xl font-bold text-[#8b2a1a] uppercase tracking-wider border-b border-[#1a1a1a]/20 pb-1">
        {t[wizardLang].ameBaque}
      </h3>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[#1a1a1a]/70">
          {t[wizardLang].styleSwing}
        </label>
        <select
          value={selectedBalancoId}
          onChange={(e) => setSelectedBalancoId(e.target.value)}
          className="w-full bg-[#fbf8f0] text-[#1a1a1a] border-2 border-[#1a1a1a] p-2.5 font-cactus font-bold text-xs uppercase tracking-wide cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-[#8b2a1a] transition-all"
        >
          {myPresets.length > 0 && (
            <optgroup label={t[wizardLang].mesBalancos}>
              {myPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          )}
          {groupPresets.length > 0 && (
            <optgroup label={t[wizardLang].groupeBalancos}>
              {groupPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          )}
          <optgroup label={t[wizardLang].standardsBalancos}>
            {standardPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {slider('alfaias', t[wizardLang].swingAlfaias)}
        {slider('caixas', t[wizardLang].swingCaixas)}
        {slider('sementes', t[wizardLang].swingSementes)}
        {slider('gongue', t[wizardLang].swingGongue)}
        {slider('timbal', t[wizardLang].swingTimbal)}
      </div>
    </div>
  );
};
