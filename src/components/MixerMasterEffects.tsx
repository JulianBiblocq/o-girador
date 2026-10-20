/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from '../contexts/SequencerContext';
import { i18n } from '../data';
import { MasterReverbSection } from './mixer/MasterReverbSection';
import { MasterDistortionSection } from './mixer/MasterDistortionSection';

export const MixerMasterEffects: React.FC = () => {
  const { lang = 'pt' } = useSequencer();
  const t = (key: keyof typeof i18n['fr']) => i18n[lang]?.[key] || i18n['pt']?.[key] || key;
  const masterFX = useSequencerStore(useShallow((state) => state.masterFX));
  const isReverbActive = useSequencerStore((state) => state.masterEffectsActive?.reverb ?? true);
  const isDistoActive = useSequencerStore((state) => state.masterEffectsActive?.disto ?? true);
  const { setMasterFxVolume, setMasterFxParam, toggleMasterEffectActive } = useSequencerStore();

  return (
    <div className="flex w-full text-[var(--cordel-text)] overflow-hidden relative pb-0.5 transition-colors select-none">
      <div className="absolute inset-0 bg-[#d4af37]/5 pointer-events-none" />

      <MasterReverbSection
        reverbTime={masterFX.reverb.time}
        returnVolume={masterFX.reverb.returnVolume}
        isReverbActive={isReverbActive}
        t={t}
        setMasterFxParam={setMasterFxParam}
        setMasterFxVolume={setMasterFxVolume}
        toggleMasterEffectActive={toggleMasterEffectActive}
      />

      <MasterDistortionSection
        distortionDrive={masterFX.distortion.drive}
        returnVolume={masterFX.distortion.returnVolume}
        isDistoActive={isDistoActive}
        t={t}
        setMasterFxParam={setMasterFxParam}
        setMasterFxVolume={setMasterFxVolume}
        toggleMasterEffectActive={toggleMasterEffectActive}
      />
    </div>
  );
};

export default MixerMasterEffects;
