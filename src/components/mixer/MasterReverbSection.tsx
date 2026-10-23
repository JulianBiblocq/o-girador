/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { DragNumberBox } from '../DragNumberBox';
import { XiloReverb } from '../XiloIcons';
import { masterReverbVolumeNode, reverbNode } from '../../audio/effectsChain';
import { percentToDb, calcReverbOpacity } from './masterEffectsMath';
import { updateMasterEffectLabelContrast } from './masterEffectsThemeHelpers';
import type { MasterReverbSectionProps } from './masterEffectsTypes';

export const MasterReverbSection: React.FC<MasterReverbSectionProps> = ({
  reverbTime,
  returnVolume,
  isReverbActive,
  t,
  setMasterFxParam,
  setMasterFxVolume,
  toggleMasterEffectActive,
}) => {
  const reverbBgRef = useRef<HTMLDivElement>(null);
  const reverbBadgeRef = useRef<HTMLDivElement>(null);
  const reverbLabelRef = useRef<HTMLSpanElement>(null);
  const currentVolRef = useRef<number>(returnVolume);
  currentVolRef.current = returnVolume;

  const syncContrast = useCallback((vol: number) => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const revOp = calcReverbOpacity(vol);
    updateMasterEffectLabelContrast(reverbLabelRef.current, revOp, isLight, 'reverb');
  }, []);

  useEffect(() => {
    const revOp = calcReverbOpacity(returnVolume);
    if (reverbBadgeRef.current) reverbBadgeRef.current.style.opacity = String(revOp);
    if (reverbBgRef.current) reverbBgRef.current.style.opacity = String(revOp * 0.15);
    syncContrast(returnVolume);

    const observer = new MutationObserver(() => syncContrast(currentVolRef.current));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [returnVolume, syncContrast]);

  const handleReverbDrag = (val: number) => {
    currentVolRef.current = val;
    const gain = val === 0 ? 0 : Tone.dbToGain(percentToDb(val));
    if (masterReverbVolumeNode && isReverbActive) {
      masterReverbVolumeNode.gain.rampTo(gain, 0.05);
    }
    const opacity = calcReverbOpacity(val);
    if (reverbBadgeRef.current) reverbBadgeRef.current.style.opacity = String(opacity);
    if (reverbBgRef.current) reverbBgRef.current.style.opacity = String(opacity * 0.15);
    syncContrast(val);
  };

  const handleReverbTimeDrag = React.useCallback((val: number) => {
    if (reverbNode) {
      const decay = 0.5 + 7.5 * (val / 100);
      if (reverbNode.decay !== decay) {
        try { reverbNode.decay = decay; } catch (_) {}
      }
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col border-r border-[var(--cordel-border)]/20 relative z-10 py-0.5 overflow-hidden">
      <div 
        ref={reverbBgRef} 
        className="absolute inset-0 bg-[var(--reverb-color)] pointer-events-none transition-none"
        style={{ opacity: calcReverbOpacity(returnVolume) * 0.15 }}
      />

      <div className="pb-0.5 flex justify-between items-center h-[22px] border-b border-[var(--cordel-border)]/20 relative z-10 px-1.5">
        <div className="relative flex items-center justify-center px-1.5 py-0.5 rounded-xs overflow-hidden border border-[#2a5c8a]">
          <div 
            ref={reverbBadgeRef}
            className="absolute inset-0 bg-[var(--reverb-color)] pointer-events-none transition-none"
            style={{ opacity: calcReverbOpacity(returnVolume) }}
          />
          <span
            ref={reverbLabelRef}
            className="font-cactus font-bold text-[9px] tracking-wider flex items-center justify-center gap-1 relative z-10 transition-colors"
          >
            <XiloReverb size={11} className="shrink-0" /> REVERB
          </span>
        </div>

        <button
          type="button"
          data-testid="master-power-reverb"
          onClick={(e) => {
            e.stopPropagation();
            toggleMasterEffectActive('reverb');
          }}
          className={`w-5 h-5 rounded-xs flex items-center justify-center font-bold text-[10px] transition-all cursor-pointer select-none relative z-20 ${
            isReverbActive
              ? 'bg-[#2a5c8a] text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] hover:brightness-110 active:translate-x-[0.5px] active:translate-y-[0.5px]'
              : 'bg-[#ded3be] text-[#1a1a1a]/40 border border-[#1a1a1a]/30 shadow-none'
          }`}
          title={isReverbActive ? "Réverbe Master active (cliquer pour contourner / bypass)" : "Réverbe Master bypassée (cliquer pour activer)"}
        >
          
        </button>
      </div>

      <div data-testid="master-reverb-settings" className={`px-1 py-0.5 flex flex-col gap-1 items-center mt-0.5 relative z-10 transition-opacity duration-150 ${
        isReverbActive ? '' : 'opacity-40 grayscale pointer-events-none'
      }`}>
        <DragNumberBox 
          label={t('reverbTime')}
          value={reverbTime}
          defaultValue={50}
          onChange={(val) => setMasterFxParam('reverb', 'time', val)}
          onAudioDrag={handleReverbTimeDrag}
          fillColor="var(--reverb-color)"
          className="w-20"
        />
        <DragNumberBox 
          label={t('reverbVol')}
          value={returnVolume}
          defaultValue={0}
          onChange={(val) => setMasterFxVolume('reverb', val)}
          onAudioDrag={handleReverbDrag}
          fillColor="var(--reverb-color)"
          className="w-20"
        />
      </div>
    </div>
  );
};
