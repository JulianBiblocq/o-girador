import React from 'react';
import * as Tone from 'tone';
import { ChevronRight } from 'lucide-react';
import { MixerKnob } from '../MixerKnob';
import { masterDistortionVolumeNode, distortionNode } from '../../hooks/useAudioSync';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';
import { MasterEffectsActiveState } from '../../stores/useSequencerStore';
import { percentToDb } from './masterEffectsMath';
import { getPowerBtnClass, getPowerBtnStyle, getLedClass } from './masterEffectsThemeHelpers';
import { StudioRackModuleId } from './masterEffectsTypes';

interface MasterDistortionSectionProps {
  t: (key: string) => string;
  lang: string;
  isMobile?: boolean;
  isPracticeMode?: boolean;
  distoVol: number;
  distoDrive: number;
  masterEffectsActive: MasterEffectsActiveState;
  onToggleEffect: (effect: keyof MasterEffectsActiveState) => void;
  setMasterFxVolume: (fx: 'reverb' | 'distortion', val: number) => void;
  setMasterFxParam: (fx: 'reverb' | 'distortion', param: 'time' | 'drive', val: number) => void;
  onOpenStudioRack?: (module: StudioRackModuleId) => void;
}

export const MasterDistortionSection: React.FC<MasterDistortionSectionProps> = ({
  t, lang, isMobile = false, isPracticeMode = false,
  distoVol, distoDrive, masterEffectsActive, onToggleEffect,
  setMasterFxVolume, setMasterFxParam, onOpenStudioRack,
}) => {
  const showRackBtn = !isMobile && !isPracticeMode;

  return (
    <div
      data-testid="master-disto-settings"
      className="flex flex-col items-center justify-between gap-1.5 p-1.5 rounded-[2px] border border-[var(--cordel-border)]/45 bg-black/5 dark:bg-white/5 w-full"
    >
      <div className="flex items-center justify-between w-full border-b border-[var(--cordel-border)]/30 pb-0.5">
        <span className="font-cactus font-bold text-[9.5px] uppercase tracking-wider text-[var(--cordel-text)]">DIST.</span>
        {showRackBtn && (
          <button
            type="button"
            data-testid="master-disto-rack-btn"
            onClick={() => onOpenStudioRack?.('saturation')}
            title={lang === 'fr' ? 'Réglages Studio Saturation' : 'Ajustes Studio Saturação'}
            className="p-0.5 rounded-[2px] text-[var(--cordel-text)]/70 hover:text-[var(--cordel-text)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ChevronRight size={11} />
          </button>
        )}
      </div>

      <button
        type="button"
        data-testid="master-power-disto"
        onClick={() => onToggleEffect('disto')}
        className={getPowerBtnClass(masterEffectsActive.disto)}
        style={getPowerBtnStyle(masterEffectsActive.disto, 'var(--fx-disto-accent)')}
        title={t('tooltipMasterDisto')}
      >
        <span className={getLedClass(masterEffectsActive.disto)} />
        <span>{masterEffectsActive.disto ? 'ON' : 'OFF'}</span>
      </button>

      <div className={`flex flex-col items-center gap-1.5 w-full transition-opacity ${masterEffectsActive.disto ? 'opacity-100' : 'opacity-40'}`}>
        <MixerKnob
          value={distoDrive}
          min={0} max={100} step={1} defaultValue={20}
          onAudioDrag={(val) => {
            if (distortionNode) {
              try { distortionNode.distortion = (val / 100) * 0.8; } catch (_) {}
            }
          }}
          onChange={(val) => setMasterFxParam('distortion', 'drive', val)}
          label={lang === 'fr' ? 'Grain' : 'Drive'}
          unit="%" size={26} color="var(--fx-disto-accent)"
        />
        <MixerKnob
          value={distoVol}
          min={0} max={100} step={1} defaultValue={0}
          onAudioDrag={(val) => {
            if (masterDistortionVolumeNode && masterEffectsActive.disto) {
              const gain = val <= 0 ? 0 : Tone.dbToGain(percentToDb(val));
              safeRampTo(masterDistortionVolumeNode.gain, gain, 0.02, 0, 2);
            }
          }}
          onChange={(val) => setMasterFxVolume('distortion', val)}
          label="Niv." unit="%" size={26} color="var(--fx-disto-accent)"
        />
      </div>
    </div>
  );
};
