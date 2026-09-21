import React, { useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { DragNumberBox } from './DragNumberBox';
import { XiloReverb, XiloDistortion } from './XiloIcons';
import { masterReverbVolumeNode, masterDistortionVolumeNode, reverbNode, distortionNode } from '../audio/effectsChain';
import { useSequencer } from '../contexts/SequencerContext';
import { i18n } from '../data';

// Fonction de conversion quadratique-logarithmique
const percentToDb = (percent: number): number => {
  if (percent <= 0) return -Infinity;
  return 40 * Math.log10(percent / 100);
};

// Fonctions d'opacité dynamique (GPU priority)
const calcReverbOpacity = (vol: number): number => {
  const clamped = Math.max(0, Math.min(100, vol));
  if (clamped <= 0) return 0.12;
  if (clamped <= 50) return 0.12 + (clamped / 50) * (0.50 - 0.12);
  if (clamped <= 70) return 0.50 + ((clamped - 50) / 20) * (0.85 - 0.50);
  return 0.85 + ((clamped - 70) / 30) * (1.0 - 0.85);
};

const calcDistoOpacity = (drive: number): number => {
  const clamped = Math.max(0, Math.min(100, drive));
  return 0.12 + (clamped / 100) * 0.88;
};

export const MixerMasterEffects: React.FC = () => {
  const { lang = 'pt' } = useSequencer();
  const t = (key: keyof typeof i18n['fr']) => i18n[lang]?.[key] || i18n['pt']?.[key] || key;
  const masterFX = useSequencerStore(useShallow((state) => state.masterFX));
  const { setMasterFxVolume, setMasterFxParam } = useSequencerStore();

  // Références directes DOM pour zéro render thrashing
  const reverbBgRef = useRef<HTMLDivElement>(null);
  const reverbBadgeRef = useRef<HTMLDivElement>(null);
  const distoBgRef = useRef<HTMLDivElement>(null);
  const distoBadgeRef = useRef<HTMLDivElement>(null);

  // Initialisation des opacités au montage et sur mise à jour du store
  useEffect(() => {
    const revOp = calcReverbOpacity(masterFX.reverb.returnVolume);
    if (reverbBadgeRef.current) reverbBadgeRef.current.style.opacity = String(revOp);
    if (reverbBgRef.current) reverbBgRef.current.style.opacity = String(revOp * 0.15);
  }, [masterFX.reverb.returnVolume]);

  useEffect(() => {
    const distOp = calcDistoOpacity(masterFX.distortion.drive);
    if (distoBadgeRef.current) distoBadgeRef.current.style.opacity = String(distOp);
    if (distoBgRef.current) distoBgRef.current.style.opacity = String(distOp * 0.15);
  }, [masterFX.distortion.drive]);

  const handleReverbDrag = (val: number) => {
    const gain = val === 0 ? 0 : Tone.dbToGain(percentToDb(val));
    if (masterReverbVolumeNode) {
      masterReverbVolumeNode.gain.rampTo(gain, 0.05);
    }
    // Mutation directe GPU sans re-rendu React
    const opacity = calcReverbOpacity(val);
    if (reverbBadgeRef.current) reverbBadgeRef.current.style.opacity = String(opacity);
    if (reverbBgRef.current) reverbBgRef.current.style.opacity = String(opacity * 0.15);
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
    // Mutation directe GPU sans re-rendu React
    const opacity = calcDistoOpacity(val);
    if (distoBadgeRef.current) distoBadgeRef.current.style.opacity = String(opacity);
    if (distoBgRef.current) distoBgRef.current.style.opacity = String(opacity * 0.15);
  }, []);

  return (
    <div className="flex w-full text-[var(--cordel-text)] overflow-hidden relative pb-0.5 transition-colors select-none">
      {/* Texture de fond discrète */}
      <div className="absolute inset-0 bg-[#d4af37]/5 pointer-events-none"></div>

      {/* Colonne REVERB */}
      <div className="flex-1 flex flex-col border-r border-[var(--cordel-border)]/20 relative z-10 py-0.5 overflow-hidden">
        {/* Voile d'ambiance réactif asservi au volume de réverbe */}
        <div 
          ref={reverbBgRef} 
          className="absolute inset-0 bg-[var(--reverb-color)] pointer-events-none transition-none"
          style={{ opacity: calcReverbOpacity(masterFX.reverb.returnVolume) * 0.15 }}
        />

        {/* En-tête avec pastille d'accent réactive */}
        <div className="pb-0.5 flex justify-center items-center h-[22px] border-b border-[var(--cordel-border)]/20 relative z-10">
          <div className="relative flex items-center justify-center px-1.5 py-0.5 rounded-xs overflow-hidden">
            <div 
              ref={reverbBadgeRef}
              className="absolute inset-0 bg-[var(--reverb-color)] pointer-events-none transition-none"
              style={{ opacity: calcReverbOpacity(masterFX.reverb.returnVolume) }}
            />
            <span className="font-cactus font-bold text-[9px] tracking-wider flex items-center justify-center gap-1 relative z-10 text-[#f4ecd8] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
              <XiloReverb size={11} className="shrink-0" /> REVERB
            </span>
          </div>
        </div>

        {/* Paramètres: Decay & Vol */}
        <div className="px-1 py-0.5 flex flex-col gap-1 items-center mt-0.5 relative z-10">
          <DragNumberBox 
            label={t('reverbTime')}
            value={masterFX.reverb.time}
            onChange={(val) => setMasterFxParam('reverb', 'time', val)}
            onAudioDrag={handleReverbTimeDrag}
            fillColor="var(--reverb-color)"
            className="w-20"
          />
          <DragNumberBox 
            label={t('reverbVol')}
            value={masterFX.reverb.returnVolume}
            onChange={(val) => setMasterFxVolume('reverb', val)}
            onAudioDrag={handleReverbDrag}
            fillColor="var(--reverb-color)"
            className="w-20"
          />
        </div>
      </div>

      {/* Colonne DISTORTION */}
      <div className="flex-1 flex flex-col relative z-10 py-0.5 overflow-hidden">
        {/* Voile d'ambiance réactif asservi au drive */}
        <div 
          ref={distoBgRef} 
          className="absolute inset-0 bg-[var(--disto-color)] pointer-events-none transition-none"
          style={{ opacity: calcDistoOpacity(masterFX.distortion.drive) * 0.15 }}
        />

        {/* En-tête avec pastille d'accent réactive */}
        <div className="pb-0.5 flex justify-center items-center h-[22px] border-b border-[var(--cordel-border)]/20 relative z-10">
          <div className="relative flex items-center justify-center px-1.5 py-0.5 rounded-xs overflow-hidden">
            <div 
              ref={distoBadgeRef}
              className="absolute inset-0 bg-[var(--disto-color)] pointer-events-none transition-none"
              style={{ opacity: calcDistoOpacity(masterFX.distortion.drive) }}
            />
            <span className="font-cactus font-bold text-[9px] tracking-wider flex items-center justify-center gap-1 relative z-10 text-[#f4ecd8] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
              <XiloDistortion size={10} className="shrink-0" /> DISTO
            </span>
          </div>
        </div>

        {/* Paramètres: Drive & Vol */}
        <div className="px-1 py-0.5 flex flex-col gap-1 items-center mt-0.5 relative z-10">
          <DragNumberBox 
            label={t('distoDrive')}
            value={masterFX.distortion.drive}
            onChange={(val) => setMasterFxParam('distortion', 'drive', val)}
            onAudioDrag={handleDistortionDriveDrag}
            fillColor="var(--disto-color)"
            className="w-20"
          />
          <DragNumberBox 
            label={t('distoVol')}
            value={masterFX.distortion.returnVolume}
            onChange={(val) => setMasterFxVolume('distortion', val)}
            onAudioDrag={handleDistortionDrag}
            fillColor="var(--disto-color)"
            className="w-20"
          />
        </div>
      </div>
    </div>
  );

};

