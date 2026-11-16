import React from 'react';
import { Cloud } from 'lucide-react';
import { useWizardStore } from '../../stores/useWizardStore';
import { Language } from '../../types';
import { WIZARD_RHYTHM_LABELS, WizardRhythmId } from './wizardRhythmPatterns';
import { useWizardCloudSections } from './useWizardCloudSections';
import { t } from './wizardConstants';

interface WizardStep2FoundationProps {
  wizardLang: Language;
}

export const WizardStep2Foundation: React.FC<WizardStep2FoundationProps> = ({ wizardLang }) => {
  const selectedBasePatternId = useWizardStore((s) => s.selectedBasePatternId);
  const setSelectedBasePatternId = useWizardStore((s) => s.setSelectedBasePatternId);
  const songInfo = useWizardStore((s) => s.songInfo);
  const updateSongInfo = useWizardStore((s) => s.updateSongInfo);
  const timeSig = useWizardStore((s) => s.timeSig);
  const setTimeSig = useWizardStore((s) => s.setTimeSig);
  const bpm = useWizardStore((s) => s.bpm);
  const setBpm = useWizardStore((s) => s.setBpm);

  const cloud = useWizardCloudSections();

  const handleSelectStudioRhythm = (val: string) => {
    setSelectedBasePatternId(val || null);
    const label = val ? WIZARD_RHYTHM_LABELS[val as WizardRhythmId] : '';
    const knownLabels = Object.values(WIZARD_RHYTHM_LABELS);
    if (label && (!songInfo.mainRythm || knownLabels.includes(songInfo.mainRythm))) {
      updateSongInfo('mainRythm', label);
    }
  };

  return (
    <div className="bg-[var(--cordel-surface)] border-3 border-[var(--cordel-border-strong)] p-4 md:p-5 shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col gap-3.5 rounded-sm">
      <h3 className="font-cactus text-base md:text-lg font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wider border-b border-[var(--cordel-border)] pb-1">
        {t[wizardLang].fondation}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[var(--cordel-text-muted)]">
            {t[wizardLang].rythmeClassique}
          </label>
          <select
            value={cloud.selectedCloudSectionId ? '' : selectedBasePatternId || ''}
            onChange={(e) => handleSelectStudioRhythm(e.target.value)}
            className="w-full bg-[var(--cordel-surface-elevated)] border-2 border-[var(--cordel-border-strong)] p-2 font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer focus:outline-none"
          >
            <option value="">{t[wizardLang].vierge}</option>
            <option value="luanda">Baque Luanda</option>
            <option value="trovao">Baque Trovão</option>
            <option value="martelo">Baque Martelo</option>
            <option value="arrasto">Baque Arrasto</option>
          </select>
        </div>

        {cloud.cloudSections.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[var(--cordel-text-muted)] flex items-center gap-1">
              <Cloud size={12} />
              <span>{t[wizardLang].sectionCloudLabel}</span>
            </label>
            <select
              value={cloud.selectedCloudSectionId || ''}
              disabled={cloud.loadingCloud}
              onChange={(e) => void cloud.selectCloudSection(e.target.value)}
              className="w-full bg-[var(--cordel-surface-elevated)] border-2 border-[var(--cordel-border-strong)] p-2 font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer focus:outline-none"
            >
              <option value="">{t[wizardLang].sectionCloudNone}</option>
              {cloud.cloudSections.map((sec) => (
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))}
            </select>
            {cloud.selectedCloudSectionData && (
              <span className="text-[10px] text-[var(--cordel-accent-readable)] font-bold">
                {wizardLang === 'pt'
                  ? `${cloud.matchedCount}/${cloud.placedCount} instrumentos (${cloud.selectedCloudSectionData.numMeasures} comp.)`
                  : `${cloud.matchedCount}/${cloud.placedCount} fûts reconnus (${cloud.selectedCloudSectionData.numMeasures} mes.)`}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[var(--cordel-text-muted)]">
            {t[wizardLang].signatureRythmique}
          </label>
          <select
            value={timeSig}
            onChange={(e) => setTimeSig(e.target.value)}
            className="w-full bg-[var(--cordel-surface-elevated)] border-2 border-[var(--cordel-border-strong)] p-2 font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer focus:outline-none"
          >
            {['4/4', '3/4', '2/4', '6/8', '12/8'].map((sig) => (
              <option key={sig} value={sig}>{sig}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[var(--cordel-text-muted)]">
              Tempo (BPM)
            </label>
            <input
              type="number"
              min={40}
              max={220}
              value={bpm}
              onChange={(e) => setBpm(Math.max(40, Math.min(220, Number(e.target.value) || 96)))}
              className="w-16 bg-[var(--cordel-surface-elevated)] border border-[var(--cordel-border-strong)] px-1.5 py-0.5 font-mono font-bold text-xs text-center text-[var(--cordel-text)]"
            />
          </div>
          <input
            type="range"
            min={40}
            max={220}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full h-1.5 bg-[var(--cordel-border)] rounded-lg appearance-none cursor-pointer accent-[var(--cordel-accent)] mt-1.5"
          />
        </div>
      </div>
    </div>
  );
};
