import React from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { MixerMasterEffectsProps } from './mixer/masterEffectsTypes';
import { MasterEqCompressorSection } from './mixer/MasterEqCompressorSection';
import { MasterReverbSection } from './mixer/MasterReverbSection';
import { MasterDistortionSection } from './mixer/MasterDistortionSection';
import { MasterCompressorColumn } from './mixer/MasterCompressorColumn';
import { MasterPresetAndMonoBar } from './mixer/MasterPresetAndMonoBar';

export type { MixerMasterEffectsProps };

export const MixerMasterEffects: React.FC<MixerMasterEffectsProps> = ({
  t,
  lang,
  isMobile = false,
  isPracticeMode = false,
  masterEQ,
  onMasterEQChange,
  masterCompressor,
  onMasterCompressorChange,
  masterEffectsActive,
  onToggleEffect,
  onOpenStudioRack,
  grMeterRef,
}) => {
  const reverbVol = useSequencerStore(s => s.masterFX?.reverb?.returnVolume ?? 70);
  const reverbTime = useSequencerStore(s => s.masterFX?.reverb?.time ?? 30);
  const distoVol = useSequencerStore(s => s.masterFX?.distortion?.returnVolume ?? 0);
  const distoDrive = useSequencerStore(s => s.masterFX?.distortion?.drive ?? 20);
  const setMasterFxVolume = useSequencerStore(s => s.setMasterFxVolume);
  const setMasterFxParam = useSequencerStore(s => s.setMasterFxParam);

  return (
    <div className="flex flex-col gap-1.5 w-full shrink-0">
      <MasterEqCompressorSection
        t={t}
        lang={lang}
        isMobile={isMobile}
        isPracticeMode={isPracticeMode}
        masterEQ={masterEQ}
        onMasterEQChange={onMasterEQChange}
        onOpenStudioRack={onOpenStudioRack}
      />

      <div className="grid grid-cols-3 gap-1 w-full items-stretch">
        <MasterReverbSection
          t={t}
          lang={lang}
          isMobile={isMobile}
          isPracticeMode={isPracticeMode}
          reverbVol={reverbVol}
          reverbTime={reverbTime}
          masterEffectsActive={masterEffectsActive}
          onToggleEffect={onToggleEffect}
          setMasterFxVolume={setMasterFxVolume}
          setMasterFxParam={setMasterFxParam}
          onOpenStudioRack={onOpenStudioRack}
        />

        <MasterDistortionSection
          t={t}
          lang={lang}
          isMobile={isMobile}
          isPracticeMode={isPracticeMode}
          distoVol={distoVol}
          distoDrive={distoDrive}
          masterEffectsActive={masterEffectsActive}
          onToggleEffect={onToggleEffect}
          setMasterFxVolume={setMasterFxVolume}
          setMasterFxParam={setMasterFxParam}
          onOpenStudioRack={onOpenStudioRack}
        />

        <MasterCompressorColumn
          t={t}
          lang={lang}
          isMobile={isMobile}
          isPracticeMode={isPracticeMode}
          masterCompressor={masterCompressor}
          onMasterCompressorChange={onMasterCompressorChange}
          masterEffectsActive={masterEffectsActive}
          onToggleEffect={onToggleEffect}
          onOpenStudioRack={onOpenStudioRack}
          grMeterRef={grMeterRef}
        />
      </div>

      <MasterPresetAndMonoBar
        lang={lang}
        onMasterCompressorChange={onMasterCompressorChange}
        onMasterEQChange={onMasterEQChange}
      />
    </div>
  );
};
