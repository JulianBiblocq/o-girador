/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { DragNumberBox } from '../DragNumberBox';
import { XiloDistortion } from '../XiloIcons';
import { masterDistortionVolumeNode, distortionNode } from '../../audio/effectsChain';
import { percentToDb, calcDistoOpacity } from './masterEffectsMath';
import { updateMasterEffectLabelContrast } from './masterEffectsThemeHelpers';
import type { MasterDistortionSectionProps } from './masterEffectsTypes';

export const MasterDistortionSection: React.FC<MasterDistortionSectionProps> = ({
  distortionDrive,
  returnVolume,
  isDistoActive,
  t,
  setMasterFxParam,
  setMasterFxVolume,
  toggleMasterEffectActive,
}) => {
  const distoBgRef = useRef<HTMLDivElement>(null);
  const distoBadgeRef = useRef<HTMLDivElement>(null);
  const distoLabelRef = useRef<HTMLSpanElement>(null);
  const currentDriveRef = useRef<number>(distortionDrive);
  currentDriveRef.current = distortionDrive;

  const syncContrast = useCallback((drive: number) => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const distOp = calcDistoOpacity(drive);
    updateMasterEffectLabelContrast(distoLabelRef.current, distOp, isLight, 'disto');
  }, []);

  useEffect(() => {
    const distOp = calcDistoOpacity(distortionDrive);
    if (distoBadgeRef.current) distoBadgeRef.current.style.opacity = String(distOp);
    if (distoBgRef.current) distoBgRef.current.style.opacity = String(distOp * 0.15);
    syncContrast(distortionDrive);

    const observer = new MutationObserver(() => syncContrast(currentDriveRef.current));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [distortionDrive, syncContrast]);

  const handleDistortionDrag = (val: number) => {
    const gain = val === 0 ? 0 : Tone.dbToGain(percentToDb(val));
    if (masterDistortionVolumeNode && isDistoActive) {
      masterDistortionVolumeNode.gain.rampTo(gain, 0.05);
    }
  };

  const handleDistortionDriveDrag = React.useCallback((val: number) => {
    currentDriveRef.current = val;
    if (distortionNode) {
      const distVal = val / 100;
      if (distortionNode.distortion !== distVal) {
        try { distortionNode.distortion = distVal; } catch (_) {}
      }
    }
    const opacity = calcDistoOpacity(val);
    if (distoBadgeRef.current) distoBadgeRef.current.style.opacity = String(opacity);
    if (distoBgRef.current) distoBgRef.current.style.opacity = String(opacity * 0.15);
    syncContrast(val);
  }, [syncContrast]);

  return (
    <div className="flex-1 flex flex-col relative z-10 py-0.5 overflow-hidden">
      <div 
        ref={distoBgRef} 
        className="absolute inset-0 bg-[var(--disto-color)] pointer-events-none transition-none"
        style={{ opacity: calcDistoOpacity(distortionDrive) * 0.15 }}
      />

      <div className="pb-0.5 flex justify-between items-center h-[22px] border-b border-[var(--cordel-border)]/20 relative z-10 px-1.5">
        <div className="relative flex items-center justify-center px-1.5 py-0.5 rounded-xs overflow-hidden border border-[#c25e1a]">
          <div 
            ref={distoBadgeRef}
            className="absolute inset-0 bg-[var(--disto-color)] pointer-events-none transition-none"
            style={{ opacity: calcDistoOpacity(distortionDrive) }}
          />
          <span
            ref={distoLabelRef}
            className="font-cactus font-bold text-[9px] tracking-wider flex items-center justify-center gap-1 relative z-10 transition-colors"
          >
            <XiloDistortion size={10} className="shrink-0" /> DISTO
          </span>
        </div>

        <button
          type="button"
          data-testid="master-power-disto"
          onClick={(e) => {
            e.stopPropagation();
            toggleMasterEffectActive('disto');
          }}
          className={`w-5 h-5 rounded-xs flex items-center justify-center font-bold text-[10px] transition-all cursor-pointer select-none relative z-20 ${
            isDistoActive
              ? 'bg-[#c25e1a] text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] hover:brightness-110 active:translate-x-[0.5px] active:translate-y-[0.5px]'
              : 'bg-[#ded3be] text-[#1a1a1a]/40 border border-[#1a1a1a]/30 shadow-none'
          }`}
          title={isDistoActive ? "Distorsion Master active (cliquer pour contourner / bypass)" : "Distorsion Master bypassée (cliquer pour activer)"}
        >
          
        </button>
      </div>

      <div data-testid="master-disto-settings" className={`px-1 py-0.5 flex flex-col gap-1 items-center mt-0.5 relative z-10 transition-opacity duration-150 ${
        isDistoActive ? '' : 'opacity-40 grayscale pointer-events-none'
      }`}>
        <DragNumberBox 
          label={t('distoDrive')}
          value={distortionDrive}
          defaultValue={0}
          onChange={(val) => setMasterFxParam('distortion', 'drive', val)}
          onAudioDrag={handleDistortionDriveDrag}
          fillColor="var(--disto-color)"
          className="w-20"
        />
        <DragNumberBox 
          label={t('distoVol')}
          value={returnVolume}
          defaultValue={0}
          onChange={(val) => setMasterFxVolume('distortion', val)}
          onAudioDrag={handleDistortionDrag}
          fillColor="var(--disto-color)"
          className="w-20"
        />
      </div>
    </div>
  );
};
