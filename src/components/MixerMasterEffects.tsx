import React from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { DragNumberBox } from './DragNumberBox';
import { XiloReverb, XiloDistortion } from './XiloIcons';
import { masterReverbVolumeNode, masterDistortionVolumeNode, reverbNode, distortionNode } from '../audio/effectsChain';

// Fonction de conversion quadratique-logarithmique
const percentToDb = (percent: number): number => {
  if (percent <= 0) return -Infinity;
  return 40 * Math.log10(percent / 100);
};

export const MixerMasterEffects: React.FC = () => {
  const masterFX = useSequencerStore(useShallow((state) => state.masterFX));
  const { setMasterFxVolume, setMasterFxParam } = useSequencerStore();

  const handleReverbDrag = (val: number) => {
    const gain = val === 0 ? 0 : Tone.dbToGain(percentToDb(val));
    if (masterReverbVolumeNode) {
      masterReverbVolumeNode.gain.rampTo(gain, 0.05);
    }
  };

  const handleDistortionDrag = (val: number) => {
    const gain = val === 0 ? 0 : Tone.dbToGain(percentToDb(val));
    if (masterDistortionVolumeNode) {
      masterDistortionVolumeNode.gain.rampTo(gain, 0.05);
    }
  };

  const handleReverbTimeDrag = React.useCallback((val: number) => {
    if (reverbNode) {
      const decay = 0.5 + 7.5 * (val / 100);
      if (reverbNode.decay !== decay) {
        try {
          reverbNode.decay = decay;
        } catch (_) {}
      }
    }
  }, []);

  const handleDistortionDriveDrag = React.useCallback((val: number) => {
    if (distortionNode) {
      const distVal = val / 100;
      if (distortionNode.distortion !== distVal) {
        try {
          distortionNode.distortion = distVal;
        } catch (_) {}
      }
    }
  }, []);

  return (
    <div className="flex w-full text-[var(--cordel-text)] overflow-hidden relative pb-1 transition-colors select-none">
      {/* Texture de fond discrète */}
      <div className="absolute inset-0 bg-[#d4af37]/5 pointer-events-none"></div>

      {/* Colonne REVERB */}
      <div className="flex-1 flex flex-col border-r border-[var(--cordel-border)]/20 relative z-10 py-1">
        {/* En-tête */}
        <div className="pb-1 flex justify-center items-center h-[24px] border-b border-[var(--cordel-border)]/20">
          <span className="font-cactus font-bold text-[9px] tracking-wider flex items-center justify-center gap-1"><XiloReverb size={12} className="shrink-0" /> REVERB</span>
        </div>

        {/* Paramètres: Decay & Vol */}
        <div className="p-1 flex flex-col gap-2 items-center mt-1">
          <DragNumberBox 
            label="Time"
            value={masterFX.reverb.time}
            onChange={(val) => setMasterFxParam('reverb', 'time', val)}
            onAudioDrag={handleReverbTimeDrag}
            className="w-20"
          />
          <DragNumberBox 
            label="Vol"
            value={masterFX.reverb.returnVolume}
            onChange={(val) => setMasterFxVolume('reverb', val)}
            onAudioDrag={handleReverbDrag}
            className="w-20"
          />
        </div>
      </div>

      {/* Colonne DISTORTION */}
      <div className="flex-1 flex flex-col relative z-10 py-1">
        {/* En-tête */}
        <div className="pb-1 flex justify-center items-center h-[24px] border-b border-[var(--cordel-border)]/20">
          <span className="font-cactus font-bold text-[9px] tracking-wider flex items-center justify-center gap-1"><XiloDistortion size={11} className="shrink-0" /> DISTO</span>
        </div>

        {/* Paramètres: Drive & Vol */}
        <div className="p-1 flex flex-col gap-2 items-center mt-1">
          <DragNumberBox 
            label="Drive"
            value={masterFX.distortion.drive}
            onChange={(val) => setMasterFxParam('distortion', 'drive', val)}
            onAudioDrag={handleDistortionDriveDrag}
            className="w-20"
          />
          <DragNumberBox 
            label="Vol"
            value={masterFX.distortion.returnVolume}
            onChange={(val) => setMasterFxVolume('distortion', val)}
            onAudioDrag={handleDistortionDrag}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
};
