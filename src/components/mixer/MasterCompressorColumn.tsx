import React from 'react';
import { ChevronRight } from 'lucide-react';
import { MixerKnob } from '../MixerKnob';
import { masterCompressorNode } from '../../hooks/useAudioSync';
import { masterBusWorkletManager } from '../../audio/effectsChain';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';
import { MasterEffectsActiveState } from '../../stores/useSequencerStore';
import { getPowerBtnClass, getPowerBtnStyle, getLedClass } from './masterEffectsThemeHelpers';
import { StudioRackModuleId } from './masterEffectsTypes';

interface MasterCompressorColumnProps {
  t: (key: string) => string;
  lang: string;
  isMobile?: boolean;
  isPracticeMode?: boolean;
  masterCompressor: { threshold: number; ratio: number };
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
  masterEffectsActive: MasterEffectsActiveState;
  onToggleEffect: (effect: keyof MasterEffectsActiveState) => void;
  onOpenStudioRack?: (module: StudioRackModuleId) => void;
  grMeterRef?: React.RefObject<HTMLDivElement | null>;
}

export const MasterCompressorColumn: React.FC<MasterCompressorColumnProps> = ({
  t, lang, isMobile = false, isPracticeMode = false,
  masterCompressor, onMasterCompressorChange,
  masterEffectsActive, onToggleEffect, onOpenStudioRack, grMeterRef,
}) => {
  const showRackBtn = !isMobile && !isPracticeMode;

  return (
    <div
      data-testid="master-compressor-settings"
      className="flex flex-col items-center justify-between gap-1.5 p-1.5 rounded-[2px] border border-[var(--cordel-border)]/45 bg-black/5 dark:bg-white/5 w-full"
    >
      <div className="flex items-center justify-between w-full border-b border-[var(--cordel-border)]/30 pb-0.5">
        <span className="font-cactus font-bold text-[9.5px] uppercase tracking-wider text-[var(--cordel-text)]">COMP.</span>
        {showRackBtn && (
          <button
            type="button"
            data-testid="master-compressor-rack-btn"
            onClick={() => onOpenStudioRack?.('compressor')}
            title={lang === 'fr' ? 'Réglages Studio Compresseur & Bus' : 'Ajustes Studio Compressor & Bus'}
            className="p-0.5 rounded-[2px] text-[var(--cordel-text)]/70 hover:text-[var(--cordel-text)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ChevronRight size={11} />
          </button>
        )}
      </div>

      <button
        type="button"
        data-testid="master-power-compressor"
        onClick={() => onToggleEffect('compressor')}
        className={getPowerBtnClass(masterEffectsActive.compressor)}
        style={getPowerBtnStyle(masterEffectsActive.compressor, 'var(--fx-comp-accent)', 'var(--fx-comp-active-text)')}
        title={t('tooltipMasterComp')}
      >
        <span className={getLedClass(masterEffectsActive.compressor, true)} />
        <span>{masterEffectsActive.compressor ? 'ON' : 'OFF'}</span>
      </button>

      <div className={`flex items-stretch justify-between gap-1 w-full transition-opacity ${masterEffectsActive.compressor ? 'opacity-100' : 'opacity-40'}`}>
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <MixerKnob
            value={masterCompressor.threshold}
            min={-40} max={0} step={1} defaultValue={-6}
            onAudioDrag={(val) => {
              if (masterEffectsActive.compressor) {
                const safeThresh = Math.max(-100, Math.min(0, val));
                masterBusWorkletManager?.updateParams({ thresholdDb: safeThresh });
                if (masterCompressorNode) safeRampTo(masterCompressorNode.threshold, safeThresh, 0.02, -100, 0);
              }
            }}
            onChange={(val) => onMasterCompressorChange({ ...masterCompressor, threshold: val })}
            label={lang === 'fr' ? 'Seuil' : 'Limiar'}
            unit="dB" size={26} color="var(--fx-comp-knob)"
          />
          <MixerKnob
            value={masterCompressor.ratio}
            min={1} max={10} step={0.5} decimals={1} defaultValue={2}
            onAudioDrag={(val) => {
              if (masterEffectsActive.compressor) {
                const safeRatio = Math.max(1, Math.min(20, val));
                masterBusWorkletManager?.updateParams({ ratio: safeRatio });
                if (masterCompressorNode) safeRampTo(masterCompressorNode.ratio, safeRatio, 0.02, 1, 20);
              }
            }}
            onChange={(val) => onMasterCompressorChange({ ...masterCompressor, ratio: val })}
            label="Ratio" unit=":1" size={26} color="var(--fx-comp-knob)"
          />
        </div>

        {/* Jauge verticale GR (Gain Reduction 0 -> -12 dB descendant du haut vers le bas) */}
        <div
          className="flex flex-col items-center justify-between py-0.5 pl-0.5 shrink-0 select-none"
          title={lang === 'fr' ? 'Réduction de Gain (0 à -12 dB)' : 'Redução de Ganho (0 a -12 dB)'}
        >
          <span className="text-[7px] font-mono font-black uppercase tracking-tighter text-[var(--cordel-text)]/80 leading-none mb-0.5">GR</span>
          <div className="w-2 flex-1 min-h-[60px] bg-black/30 dark:bg-black/50 border border-[var(--cordel-border)]/50 rounded-[1px] relative overflow-hidden">
            <div
              ref={grMeterRef}
              data-testid="master-gr-meter-bar"
              className="absolute inset-0 w-full h-full pointer-events-none will-change-transform"
              style={{
                background: 'linear-gradient(to bottom, var(--vu-level-warn) 0%, var(--vu-level-clip) 100%)',
                transformOrigin: 'top',
                transform: 'scaleY(0)',
              }}
            />
          </div>
          <span className="text-[7px] font-mono font-bold text-[var(--cordel-text)]/70 leading-none mt-1">-12</span>
        </div>
      </div>
    </div>
  );
};
