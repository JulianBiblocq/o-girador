import React, { useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { DragNumberBox } from './DragNumberBox';
import { masterReverbVolumeNode, masterDistortionVolumeNode } from '../audio/effectsChain';

// Fonction de conversion quadratique-logarithmique
const percentToDb = (percent: number): number => {
  if (percent <= 0) return -Infinity;
  return 40 * Math.log10(percent / 100);
};

interface FaderProps {
  fxType: 'reverb' | 'distortion';
  value: number;
  isMuted: boolean;
  onChange: (val: number) => void;
}

const MasterVolumeFader: React.FC<FaderProps> = ({ fxType, value, isMuted, onChange }) => {
  const visualThumbRef = useRef<HTMLDivElement>(null);
  const valueTextRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);

  const containerHeight = 115;
  const faderHeight = 99;
  const thumbHeight = 20;
  const travelRange = faderHeight - thumbHeight; // 79px
  const topPadding = (containerHeight - faderHeight) / 2; // 8px

  const getTopPosition = (val: number) => {
    const ratio = 1 - val / 100;
    return ratio * travelRange + topPadding;
  };

  const updateAudioNode = (val: number) => {
    if (isMuted) return;
    const gain = val === 0 ? 0 : Tone.dbToGain(percentToDb(val));
    if (fxType === 'reverb' && masterReverbVolumeNode) {
      masterReverbVolumeNode.gain.rampTo(gain, 0.05);
    } else if (fxType === 'distortion' && masterDistortionVolumeNode) {
      masterDistortionVolumeNode.gain.rampTo(gain, 0.05);
    }
  };

  const handleDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.round(parseFloat(e.target.value));
    const topPx = getTopPosition(val);
    if (visualThumbRef.current) {
      visualThumbRef.current.style.top = `${topPx}px`;
    }
    if (valueTextRef.current) {
      valueTextRef.current.textContent = String(val);
    }
    updateAudioNode(val);
  };

  const handlePointerDown = () => {
    isDraggingRef.current = true;
  };

  const handleCommit = (e: React.SyntheticEvent) => {
    isDraggingRef.current = false;
    const val = Math.round(parseFloat((e.target as HTMLInputElement).value));
    updateAudioNode(val);
    onChange(val);
  };

  useEffect(() => {
    if (!isDraggingRef.current) {
      if (inputRef.current) {
        inputRef.current.value = String(value);
      }
      const topPx = getTopPosition(value);
      if (visualThumbRef.current) {
        visualThumbRef.current.style.top = `${topPx}px`;
      }
      if (valueTextRef.current) {
        valueTextRef.current.textContent = String(value);
      }
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1.5 h-full w-full select-none">
      <span className="text-[8px] font-cactus uppercase tracking-wider text-[var(--cordel-text)] opacity-60">
        Vol
      </span>
      <div 
        className="h-[115px] flex justify-center items-center relative w-10 cursor-ns-resize"
        style={{ touchAction: 'none' }}
      >
        {/* Rail visuel du fader */}
        <div className="absolute top-2 bottom-2 w-1.5 bg-[#d4af37]/20 border border-[var(--cordel-border)] pointer-events-none"></div>

        {/* Bouton de fader visuel manipulé directement en DOM */}
        <div 
          ref={visualThumbRef}
          className="absolute left-1/2 -translate-x-1/2 w-6 h-5 bg-[#d4af37] border-2 border-[var(--cordel-border)] pointer-events-none transition-shadow"
          style={{ top: `${getTopPosition(value)}px` }}
        >
          {/* Ligne médiane de repère */}
          <div className="w-full h-0.5 bg-[var(--cordel-border)] absolute top-1/2 -translate-y-1/2"></div>
        </div>

        {/* Input invisible glissant (Ghost Input pour performances 60 FPS) */}
        <input 
          ref={inputRef}
          type="range"
          min="0"
          max="100"
          step="1"
          defaultValue={value}
          onChange={handleDrag}
          onPointerDown={handlePointerDown}
          onPointerUp={handleCommit}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-ns-resize select-none"
          style={{ 
            writingMode: 'bt-lr',
            WebkitAppearance: 'slider-vertical'
          } as any}
        />
      </div>
      <span 
        ref={valueTextRef}
        className="text-[9px] font-cactus font-bold text-[var(--cordel-text)] leading-none text-center"
      >
        {value}
      </span>
    </div>
  );
};

export const MixerMasterEffects: React.FC = () => {
  const masterFX = useSequencerStore(useShallow((state) => state.masterFX));
  const { setMasterFxVolume, setMasterFxParam, toggleMasterFxMute } = useSequencerStore();

  return (
    <div 
      className="flex bg-[var(--cordel-bg)] shrink-0 text-[var(--cordel-text)] overflow-hidden relative pb-4 transition-colors select-none"
      style={{
        zIndex: 1,
        width: '160px',
        borderLeft: '4px double var(--cordel-border)',
        borderRight: '4px double var(--cordel-border)',
      }}
    >
      {/* Texture de fond discrète */}
      <div className="absolute inset-0 bg-[#d4af37]/5 pointer-events-none"></div>

      {/* Colonne REVERB */}
      <div className="flex-1 flex flex-col border-r border-[var(--cordel-border)]/20 relative z-10">
        {/* En-tête */}
        <div className="p-2 pb-1.5 flex justify-center items-center h-[52px] border-b-[3px] border-[var(--cordel-border)] bg-[var(--cordel-bg)]/80">
          <span className="font-cactus font-bold text-[10px] tracking-wider">🌊 REVERB</span>
        </div>

        {/* Paramètre decay */}
        <div className="p-2 pt-3 flex justify-center border-b border-[var(--cordel-border)]/10">
          <DragNumberBox 
            label="Time"
            value={masterFX.reverb.time}
            onChange={(val) => setMasterFxParam('reverb', 'time', val)}
            className="w-full max-w-[56px]"
          />
        </div>

        {/* Bouton Mute et Fader */}
        <div className="flex-1 flex flex-col justify-between items-center p-2 pt-3 gap-3">
          <button
            onClick={() => toggleMasterFxMute('reverb')}
            className={`w-6 h-6 border font-bold text-[9px] flex items-center justify-center transition-all ${
              masterFX.reverb.isMuted 
                ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a]' 
                : 'bg-transparent border-[var(--cordel-border)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >
            M
          </button>
          <div className="flex-1 flex items-end">
            <MasterVolumeFader
              fxType="reverb"
              value={masterFX.reverb.returnVolume}
              isMuted={masterFX.reverb.isMuted}
              onChange={(val) => setMasterFxVolume('reverb', val)}
            />
          </div>
        </div>
      </div>

      {/* Colonne DISTORTION */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* En-tête */}
        <div className="p-2 pb-1.5 flex justify-center items-center h-[52px] border-b-[3px] border-[var(--cordel-border)] bg-[var(--cordel-bg)]/80">
          <span className="font-cactus font-bold text-[10px] tracking-wider">🔥 DISTO</span>
        </div>

        {/* Paramètre drive */}
        <div className="p-2 pt-3 flex justify-center border-b border-[var(--cordel-border)]/10">
          <DragNumberBox 
            label="Drive"
            value={masterFX.distortion.drive}
            onChange={(val) => setMasterFxParam('distortion', 'drive', val)}
            className="w-full max-w-[56px]"
          />
        </div>

        {/* Bouton Mute et Fader */}
        <div className="flex-1 flex flex-col justify-between items-center p-2 pt-3 gap-3">
          <button
            onClick={() => toggleMasterFxMute('distortion')}
            className={`w-6 h-6 border font-bold text-[9px] flex items-center justify-center transition-all ${
              masterFX.distortion.isMuted 
                ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a]' 
                : 'bg-transparent border-[var(--cordel-border)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >
            M
          </button>
          <div className="flex-1 flex items-end">
            <MasterVolumeFader
              fxType="distortion"
              value={masterFX.distortion.returnVolume}
              isMuted={masterFX.distortion.isMuted}
              onChange={(val) => setMasterFxVolume('distortion', val)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
