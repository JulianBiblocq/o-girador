import React from 'react';
import { RotateCcw, ChevronRight } from 'lucide-react';
import { MixerKnob } from '../MixerKnob';
import { masterEQNode } from '../../hooks/useAudioSync';
import { safeRampGainDb } from '../../utils/audio/safeAudioParamRamp';
import { StudioRackModuleId } from './masterEffectsTypes';

interface MasterEqCompressorSectionProps {
  t: (key: string) => string;
  lang: string;
  isMobile?: boolean;
  isPracticeMode?: boolean;
  masterEQ: { low: number; mid: number; high: number };
  onMasterEQChange: (eq: { low: number; mid: number; high: number }) => void;
  onOpenStudioRack?: (module: StudioRackModuleId) => void;
}

export const MasterEqCompressorSection: React.FC<MasterEqCompressorSectionProps> = ({
  t,
  lang,
  isMobile = false,
  isPracticeMode = false,
  masterEQ,
  onMasterEQChange,
  onOpenStudioRack,
}) => {
  const showRackBtn = !isMobile && !isPracticeMode;
  const isModified = masterEQ.low !== 0 || masterEQ.mid !== 0 || masterEQ.high !== 0;

  const handleResetEq = () => {
    if (masterEQNode?.low) safeRampGainDb(masterEQNode.low, 0, 0.02);
    if (masterEQNode?.mid) safeRampGainDb(masterEQNode.mid, 0, 0.02);
    if (masterEQNode?.high) safeRampGainDb(masterEQNode.high, 0, 0.02);
    onMasterEQChange({ low: 0, mid: 0, high: 0 });
  };

  return (
    <div className="flex flex-col gap-1.5 w-full bg-black/5 dark:bg-white/5 p-1.5 rounded-[2px] border border-[var(--cordel-border)]/45 shrink-0">
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/35 pb-1">
        <span className="font-cactus text-[10px] font-extrabold tracking-wider uppercase text-[var(--cordel-text)]">
          {t('masterEqTitle')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="master-eq-reset"
            onClick={handleResetEq}
            title={lang === 'fr' ? 'Réinitialiser EQ (0.0 dB)' : 'Reiniciar EQ (0.0 dB)'}
            className={`p-0.5 rounded-[2px] transition-colors cursor-pointer ${
              isModified
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-parchment-bg)]'
                : 'text-[var(--cordel-text)]/65 hover:text-[var(--cordel-text)] hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            <RotateCcw size={11} />
          </button>
          {showRackBtn && (
            <button
              type="button"
              data-testid="master-eq-rack-btn"
              onClick={() => onOpenStudioRack?.('eq')}
              title={lang === 'fr' ? 'Ouvrir le Rack Studio EQ' : 'Abrir Rack Studio EQ'}
              className="p-0.5 rounded-[2px] text-[var(--cordel-text)]/75 hover:text-[var(--cordel-text)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 w-full justify-items-center pt-0.5">
        <MixerKnob
          value={masterEQ.low}
          min={-6}
          max={6}
          step={0.5}
          decimals={1}
          defaultValue={0}
          onAudioDrag={(val) => { if (masterEQNode?.low) safeRampGainDb(masterEQNode.low, val, 0.02); }}
          onChange={(val) => onMasterEQChange({ ...masterEQ, low: val })}
          label="LOW"
          unit="dB"
          size={38}
          color="var(--eq-low-color)"
        />
        <MixerKnob
          value={masterEQ.mid}
          min={-6}
          max={6}
          step={0.5}
          decimals={1}
          defaultValue={0}
          onAudioDrag={(val) => { if (masterEQNode?.mid) safeRampGainDb(masterEQNode.mid, val, 0.02); }}
          onChange={(val) => onMasterEQChange({ ...masterEQ, mid: val })}
          label="MID"
          unit="dB"
          size={38}
          color="var(--eq-mid-color)"
        />
        <MixerKnob
          value={masterEQ.high}
          min={-6}
          max={6}
          step={0.5}
          decimals={1}
          defaultValue={0}
          onAudioDrag={(val) => { if (masterEQNode?.high) safeRampGainDb(masterEQNode.high, val, 0.02); }}
          onChange={(val) => onMasterEQChange({ ...masterEQ, high: val })}
          label="HIGH"
          unit="dB"
          size={38}
          color="var(--eq-high-color)"
        />
      </div>
    </div>
  );
};
