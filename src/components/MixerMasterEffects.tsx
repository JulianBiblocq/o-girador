import React from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { DragNumberBox } from './DragNumberBox';
import { MixerVolumeFader } from './MixerVolumeFader';
import { masterReverbVolumeNode, masterDistortionVolumeNode } from '../audio/effectsChain';

// Fonction de conversion quadratique-logarithmique
const percentToDb = (percent: number): number => {
  if (percent <= 0) return -Infinity;
  return 40 * Math.log10(percent / 100);
};

export const MixerMasterEffects: React.FC = () => {
  const masterFX = useSequencerStore(useShallow((state) => state.masterFX));
  const { setMasterFxVolume, setMasterFxParam, toggleMasterFxMute } = useSequencerStore();

  const handleReverbDrag = (val: number) => {
    if (masterFX.reverb.isMuted) return;
    const gain = val === 0 ? 0 : Tone.dbToGain(percentToDb(val));
    if (masterReverbVolumeNode) {
      masterReverbVolumeNode.gain.rampTo(gain, 0.05);
    }
  };

  const handleDistortionDrag = (val: number) => {
    if (masterFX.distortion.isMuted) return;
    const gain = val === 0 ? 0 : Tone.dbToGain(percentToDb(val));
    if (masterDistortionVolumeNode) {
      masterDistortionVolumeNode.gain.rampTo(gain, 0.05);
    }
  };

  return (
    <div className="flex w-full text-[var(--cordel-text)] overflow-hidden relative pb-1 transition-colors select-none">
      {/* Texture de fond discrète */}
      <div className="absolute inset-0 bg-[#d4af37]/5 pointer-events-none"></div>

      {/* Colonne REVERB */}
      <div className="flex-1 flex flex-col border-r border-[var(--cordel-border)]/20 relative z-10 py-1">
        {/* En-tête */}
        <div className="pb-1 flex justify-center items-center h-[24px] border-b border-[var(--cordel-border)]/20">
          <span className="font-cactus font-bold text-[9px] tracking-wider">🌊 REVERB</span>
        </div>

        {/* Paramètre decay */}
        <div className="p-1 flex justify-center border-b border-[var(--cordel-border)]/10">
          <DragNumberBox 
            label="Time"
            value={masterFX.reverb.time}
            onChange={(val) => setMasterFxParam('reverb', 'time', val)}
            className="w-full max-w-[50px]"
          />
        </div>

        {/* Fader et Mute */}
        <div className="flex justify-around items-center p-1 pt-2 gap-1.5 h-[155px]">
          <button
            onClick={() => toggleMasterFxMute('reverb')}
            className={`w-6 h-6 border font-bold text-[9px] flex items-center justify-center transition-all shrink-0 ${
              masterFX.reverb.isMuted 
                ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a]' 
                : 'bg-transparent border-[var(--cordel-border)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >
            M
          </button>
          <div className="h-[135px] flex items-center">
            <MixerVolumeFader
              value={masterFX.reverb.returnVolume}
              onChange={(val) => setMasterFxVolume('reverb', val)}
              onAudioDrag={handleReverbDrag}
            />
          </div>
        </div>
      </div>

      {/* Colonne DISTORTION */}
      <div className="flex-1 flex flex-col relative z-10 py-1">
        {/* En-tête */}
        <div className="pb-1 flex justify-center items-center h-[24px] border-b border-[var(--cordel-border)]/20">
          <span className="font-cactus font-bold text-[9px] tracking-wider">🔥 DISTO</span>
        </div>

        {/* Paramètre drive */}
        <div className="p-1 flex justify-center border-b border-[var(--cordel-border)]/10">
          <DragNumberBox 
            label="Drive"
            value={masterFX.distortion.drive}
            onChange={(val) => setMasterFxParam('distortion', 'drive', val)}
            className="w-full max-w-[50px]"
          />
        </div>

        {/* Fader et Mute */}
        <div className="flex justify-around items-center p-1 pt-2 gap-1.5 h-[155px]">
          <button
            onClick={() => toggleMasterFxMute('distortion')}
            className={`w-6 h-6 border font-bold text-[9px] flex items-center justify-center transition-all shrink-0 ${
              masterFX.distortion.isMuted 
                ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a]' 
                : 'bg-transparent border-[var(--cordel-border)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >
            M
          </button>
          <div className="h-[135px] flex items-center">
            <MixerVolumeFader
              value={masterFX.distortion.returnVolume}
              onChange={(val) => setMasterFxVolume('distortion', val)}
              onAudioDrag={handleDistortionDrag}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
