import React from 'react';
import * as Tone from 'tone';
import { ChevronRight } from 'lucide-react';
import { MixerKnob } from '../MixerKnob';
import { masterReverbVolumeNode, reverbNode } from '../../hooks/useAudioSync';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';
import { MasterEffectsActiveState } from '../../stores/useSequencerStore';
import { percentToDb } from './masterEffectsMath';
import { getPowerBtnClass, getPowerBtnStyle, getLedClass } from './masterEffectsThemeHelpers';
import { StudioRackModuleId } from './masterEffectsTypes';

interface MasterReverbSectionProps {
  t: (key: string) => string;
  lang: string;
  isMobile?: boolean;
  isPracticeMode?: boolean;
  reverbVol: number;
  reverbTime: number;
  masterEffectsActive: MasterEffectsActiveState;
  onToggleEffect: (effect: keyof MasterEffectsActiveState) => void;
  setMasterFxVolume: (fx: 'reverb' | 'distortion', val: number) => void;
  setMasterFxParam: (fx: 'reverb' | 'distortion', param: 'time' | 'drive', val: number) => void;
  onOpenStudioRack?: (module: StudioRackModuleId) => void;
}

export const MasterReverbSection: React.FC<MasterReverbSectionProps> = ({
  t, lang, isMobile = false, isPracticeMode = false,
  reverbVol, reverbTime, masterEffectsActive, onToggleEffect,
  setMasterFxVolume, setMasterFxParam, onOpenStudioRack,
}) => {
  const showRackBtn = !isMobile && !isPracticeMode;
  const durationSec = Number((0.4 + (Math.max(0, Math.min(100, reverbTime)) / 100) * 3.6).toFixed(1));
  const secToPct = (sec: number) => Math.max(0, Math.min(100, Math.round(((sec - 0.4) / 3.6) * 100)));

  return (
    <div
      data-testid="master-reverb-settings"
      className="flex flex-col items-center justify-between gap-1.5 p-1.5 rounded-[2px] border border-[var(--cordel-border)]/45 bg-black/5 dark:bg-white/5 w-full"
    >
      <div className="flex items-center justify-between w-full border-b border-[var(--cordel-border)]/30 pb-0.5">
        <span className="font-cactus font-bold text-[9.5px] uppercase tracking-wider text-[var(--cordel-text)]">REV.</span>
        {showRackBtn && (
          <button
            type="button"
            data-testid="master-reverb-rack-btn"
            onClick={() => onOpenStudioRack?.('reverb')}
            title={lang === 'fr' ? 'Réglages Studio Réverbe' : 'Ajustes Studio Reverb'}
            className="p-0.5 rounded-[2px] text-[var(--cordel-text)]/70 hover:text-[var(--cordel-text)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ChevronRight size={11} />
          </button>
        )}
      </div>

      <button
        type="button"
        data-testid="master-power-reverb"
        onClick={() => onToggleEffect('reverb')}
        className={getPowerBtnClass(masterEffectsActive.reverb)}
        style={getPowerBtnStyle(masterEffectsActive.reverb, 'var(--fx-reverb-accent)')}
        title={t('tooltipMasterReverb')}
      >
        <span className={getLedClass(masterEffectsActive.reverb)} />
        <span>{masterEffectsActive.reverb ? 'ON' : 'OFF'}</span>
      </button>

      <div className={`flex flex-col items-center gap-1.5 w-full transition-opacity ${masterEffectsActive.reverb ? 'opacity-100' : 'opacity-40'}`}>
        <MixerKnob
          value={durationSec}
          min={0.4} max={4.0} step={0.1} decimals={1} defaultValue={1.4}
          onAudioDrag={(sec) => {
            if (reverbNode) {
              try { reverbNode.decay = Math.max(0.4, Math.min(4.0, sec)); } catch (_) {}
            }
          }}
          onChange={(sec) => setMasterFxParam('reverb', 'time', secToPct(sec))}
          label={lang === 'fr' ? 'Durée' : 'Tempo'}
          unit="s" size={26} color="var(--fx-reverb-accent)"
        />
        <MixerKnob
          value={reverbVol}
          min={0} max={100} step={1} defaultValue={22}
          onAudioDrag={(val) => {
            if (masterReverbVolumeNode && masterEffectsActive.reverb) {
              const gain = val <= 0 ? 0 : Tone.dbToGain(percentToDb(val));
              safeRampTo(masterReverbVolumeNode.gain, gain, 0.02, 0, 2);
            }
          }}
          onChange={(val) => setMasterFxVolume('reverb', val)}
          label="Niv." unit="%" size={26} color="var(--fx-reverb-accent)"
        />
      </div>
    </div>
  );
};
