import React, { useEffect, useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { MasterMonoCheckButton } from './MasterMonoCheckButton';
import { STUDIO_MASTER_AMBIANCES, StudioMasterAmbianceId } from '../../audio/effects/studioMasterAmbiances';
import {
  loadStudioFxUserPresets,
  StudioRackModuleKey,
  StudioUserPresetsStore,
} from '../../audio/effects/studioFxUserPresets';
import {
  applyGlobalMasterAmbiance,
  applyStudioModulePresetSelection,
} from '../../audio/effects/studioFxPresetApplyHelper';

interface MasterPresetAndMonoBarProps {
  lang: string;
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
  onMasterEQChange?: (eq: { low: number; mid: number; high: number }) => void;
}

const MODULE_PREFIX: Record<StudioRackModuleKey, { fr: string; pt: string }> = {
  reverb: { fr: 'REV', pt: 'REV' },
  saturation: { fr: 'DIST', pt: 'DIST' },
  compressor: { fr: 'COMP', pt: 'COMP' },
  eq: { fr: 'EQ', pt: 'EQ' },
};

export const MasterPresetAndMonoBar: React.FC<MasterPresetAndMonoBarProps> = ({
  lang,
  onMasterCompressorChange,
  onMasterEQChange,
}) => {
  const isMasterMono = useSequencerStore(s => s.isMasterMono);
  const toggleMasterMono = useSequencerStore(s => s.toggleMasterMono);
  const applyStudioFxPreset = useSequencerStore(s => s.applyStudioFxPreset);
  const updateReverb = useSequencerStore(s => s.updateMasterReverbConfig);
  const updateDisto = useSequencerStore(s => s.updateMasterDistortionConfig);
  const updateBus = useSequencerStore(s => s.updateMasterBusConfig);

  const [selectedValue, setSelectedValue] = useState<string>('');
  const [userStore, setUserStore] = useState<StudioUserPresetsStore>(() => loadStudioFxUserPresets());

  useEffect(() => {
    const refresh = () => setUserStore(loadStudioFxUserPresets());
    window.addEventListener('girador-studio-user-presets-changed', refresh);
    return () => window.removeEventListener('girador-studio-user-presets-changed', refresh);
  }, []);

  const allUserPresets = (['reverb', 'saturation', 'compressor', 'eq'] as const).flatMap(
    mod => (userStore[mod] || []).map(item => ({ ...item, module: mod }))
  );

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedValue(val);
    const cb = {
      applyStudioFxPreset, updateReverb, updateDisto, updateBus, onMasterCompressorChange, onMasterEQChange,
    };

    if (applyGlobalMasterAmbiance(val as StudioMasterAmbianceId, cb)) return;

    const foundUser = allUserPresets.find(u => u.id === val);
    if (foundUser) {
      applyStudioModulePresetSelection(foundUser.module, foundUser.id, foundUser, cb);
    }
  };

  return (
    <div className="flex items-center justify-between gap-1.5 w-full pt-0.5 shrink-0">
      <select
        data-testid="master-fx-preset-select"
        value={selectedValue}
        onChange={handleSelect}
        aria-label="Preset FX"
        className="flex-1 min-w-0 py-1 px-1.5 font-cactus font-bold text-[9.5px] uppercase tracking-wider bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] rounded-[2px] cursor-pointer outline-none truncate"
      >
        <option value="" disabled>
          {lang === 'fr' ? 'PRESET FX ▾' : 'PRESET FX ▾'}
        </option>
        <optgroup label={lang === 'fr' ? 'Ambiances Studio' : 'Ambiências de Estúdio'}>
          {STUDIO_MASTER_AMBIANCES.map(p => (
            <option key={p.id} value={p.id}>
              {lang === 'fr' ? p.labelFr : p.labelPt}
            </option>
          ))}
        </optgroup>
        {allUserPresets.length > 0 && (
          <optgroup label={lang === 'fr' ? 'Mes Presets' : 'Meus Presets'}>
            {allUserPresets.map(u => {
              const pfx = lang === 'fr' ? MODULE_PREFIX[u.module].fr : MODULE_PREFIX[u.module].pt;
              return (
                <option key={u.id} value={u.id}>
                  [{pfx}] {u.name}
                </option>
              );
            })}
          </optgroup>
        )}
      </select>

      <MasterMonoCheckButton
        isMasterMono={isMasterMono}
        onToggle={toggleMasterMono}
        lang={lang}
      />
    </div>
  );
};
