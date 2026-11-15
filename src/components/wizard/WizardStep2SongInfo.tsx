import React from 'react';
import { useWizardStore, SongInfo } from '../../stores/useWizardStore';
import { Language } from '../../types';
import { t } from './wizardConstants';

interface WizardStep2SongInfoProps {
  wizardLang: Language;
}

export const WizardStep2SongInfo: React.FC<WizardStep2SongInfoProps> = ({ wizardLang }) => {
  const songInfo = useWizardStore((state) => state.songInfo);
  const updateSongInfo = useWizardStore((state) => state.updateSongInfo);

  const fields: { key: keyof SongInfo; label: string; type?: string; placeholder?: string; span2?: boolean }[] = [
    { key: 'toadaName', label: t[wizardLang].toadaLabel, span2: true },
    { key: 'nacaoName', label: t[wizardLang].nacaoLabel },
    { key: 'composer', label: t[wizardLang].compositeurLabel },
    { key: 'mainRythm', label: t[wizardLang].ritmoLabel },
    { key: 'youtubeUrl', label: t[wizardLang].youtubeLabel, type: 'url', placeholder: 'https://...' },
  ];

  return (
    <div className="bg-[var(--cordel-surface)] border-3 border-[var(--cordel-border-strong)] p-4 md:p-5 shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col gap-3.5 rounded-sm">
      <div className="border-b border-[var(--cordel-border)] pb-1">
        <h3 className="font-cactus text-base md:text-lg font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wider">
          {t[wizardLang].identiteMorceau}
        </h3>
        <p className="text-[10px] md:text-xs text-[var(--cordel-text-muted)]">{t[wizardLang].espritMorceau}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {fields.map((f) => (
          <div key={f.key} className={`flex flex-col gap-1 ${f.span2 ? 'md:col-span-2' : ''}`}>
            <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[var(--cordel-text-muted)]">
              {f.label}
            </label>
            <input
              type={f.type || 'text'}
              value={songInfo[f.key]}
              onChange={(e) => updateSongInfo(f.key, e.target.value)}
              placeholder={f.placeholder || t[wizardLang].placeholderSaisir}
              className="w-full bg-[var(--cordel-surface-elevated)] border-2 border-[var(--cordel-border-strong)] p-2 font-sans text-xs text-[var(--cordel-text)] placeholder:text-[var(--cordel-text-muted)]/60 focus:outline-none focus:border-[var(--cordel-accent-readable)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] rounded-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
