import React from 'react';
import { useWizardStore, SwingIntensities } from '../../stores/useWizardStore';
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
  const placedInstruments = useWizardStore((state) => state.placedInstruments);
  const selectedBalancoId = useWizardStore((state) => state.selectedBalancoId);
  const setSelectedBalancoId = useWizardStore((state) => state.setSelectedBalancoId);
  const swingIntensities = useWizardStore((state) => state.swingIntensities);
  const setSwingIntensity = useWizardStore((state) => state.setSwingIntensity);

  const myPresets = balancoPresets.filter((p) => userProfile?.uid && p.ownerId === userProfile.uid && !p.isFactory);
  const groupPresets = balancoPresets.filter(
    (p) => p.visibility === 'mestre_group' && (!userProfile?.uid || p.ownerId !== userProfile.uid)
  );
  const standardPresets = balancoPresets.filter(
    (p) => p.isFactory || (p.visibility === 'public' && (!userProfile?.uid || p.ownerId !== userProfile.uid))
  );

  const types = new Set(placedInstruments.map((i) => i.instrumentType));
  const showAll = types.size === 0;
  const families: { key: keyof SwingIntensities; label: string; visible: boolean }[] = [
    { key: 'alfaias', label: t[wizardLang].swingAlfaias, visible: showAll || types.has('marcante') || types.has('meiao') || types.has('repique') },
    { key: 'caixas', label: t[wizardLang].swingCaixas, visible: showAll || types.has('caixa') || types.has('tarol') },
    { key: 'sementes', label: t[wizardLang].swingSementes, visible: showAll || types.has('agbe') || types.has('mineiro') },
    { key: 'gongue', label: t[wizardLang].swingGongue, visible: showAll || types.has('gongue') },
    { key: 'timbal', label: t[wizardLang].swingTimbal, visible: showAll || types.has('timbal') },
  ];

  return (
    <div className="bg-[var(--cordel-surface)] border-3 border-[var(--cordel-border-strong)] p-4 md:p-5 shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col gap-4 rounded-sm">
      <h3 className="font-cactus text-base md:text-lg font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wider border-b border-[var(--cordel-border)] pb-1">
        {t[wizardLang].ameBaque}
      </h3>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[var(--cordel-text-muted)]">
          {t[wizardLang].styleSwing}
        </label>
        <select
          value={selectedBalancoId}
          onChange={(e) => setSelectedBalancoId(e.target.value)}
          className="w-full bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] p-2 font-cactus font-bold text-xs uppercase tracking-wide cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] focus:outline-none"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-1">
        {families.filter((f) => f.visible).map((fam) => (
          <div key={fam.key} className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] md:text-xs font-cactus font-bold uppercase text-[var(--cordel-text)]">
              <span>{fam.label}</span>
              <span className="bg-[var(--cordel-surface-elevated)] border border-[var(--cordel-border-strong)] text-[var(--cordel-accent-readable)] px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold">
                {swingIntensities[fam.key]}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={swingIntensities[fam.key]}
              onChange={(e) => setSwingIntensity(fam.key, Number(e.target.value))}
              className="w-full h-1.5 bg-[var(--cordel-border)] rounded-lg appearance-none cursor-pointer accent-[var(--cordel-accent)] mt-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
