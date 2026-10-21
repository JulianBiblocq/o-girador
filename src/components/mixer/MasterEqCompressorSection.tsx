import React from 'react';
import { DragNumberBox } from '../DragNumberBox';
import { MixerKnob } from '../MixerKnob';
import { XiloEQ, XiloCompressor } from '../XiloIcons';
import { masterEQNode, masterCompressorNode, syncMasterCompressorBypass } from '../../audio/effectsChain';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { MixerMasterEffects } from '../MixerMasterEffects';

interface MasterEqCompressorSectionProps {
  t: (key: string) => string;
  lang: string;
  masterEQ: { low: number; mid: number; high: number };
  onMasterEQChange: (eq: { low: number; mid: number; high: number }) => void;
  masterCompressor: { threshold: number; ratio: number };
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
}

export const MasterEqCompressorSection: React.FC<MasterEqCompressorSectionProps> = ({
  t,
  lang,
  masterEQ,
  onMasterEQChange,
  masterCompressor,
  onMasterCompressorChange,
}) => {
  const isCompressorActive = useSequencerStore(state => state.masterEffectsActive?.compressor ?? true);
  const toggleMasterEffectActive = useSequencerStore(state => state.toggleMasterEffectActive);

  return (
    <div className="relative z-10 p-2 flex flex-col gap-2 shrink-0 border-b-2 border-[var(--master-border)] bg-[#1a1a1a]/5">
      {/* EQ Section */}
      <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)]/20 pb-1.5">
        <span className="text-[10px] font-cactus font-bold tracking-wider text-[var(--cordel-text)] opacity-85 flex items-center gap-1">
          <XiloEQ size={11} className="shrink-0" /> {t('eqTitle')}
        </span>
        <div className="flex justify-between items-center w-full mt-0.5 px-0.5">
          <MixerKnob
            label={t('eqLow')}
            value={masterEQ.low}
            min={-6.0}
            max={6.0}
            step={0.5}
            decimals={1}
            defaultValue={0}
            unit="dB"
            size={40}
            color="var(--eq-low-color)"
            onChange={(val) => onMasterEQChange({ ...masterEQ, low: val })}
            onAudioDrag={(val) => { if (masterEQNode?.low) masterEQNode.low.rampTo(val, 0.02); }}
          />
          <MixerKnob
            label={t('eqMid')}
            value={masterEQ.mid}
            min={-6.0}
            max={6.0}
            step={0.5}
            decimals={1}
            defaultValue={0}
            unit="dB"
            size={40}
            color="var(--eq-mid-color)"
            onChange={(val) => onMasterEQChange({ ...masterEQ, mid: val })}
            onAudioDrag={(val) => { if (masterEQNode?.mid) masterEQNode.mid.rampTo(val, 0.02); }}
          />
          <MixerKnob
            label={t('eqHigh')}
            value={masterEQ.high}
            min={-6.0}
            max={6.0}
            step={0.5}
            decimals={1}
            defaultValue={0}
            unit="dB"
            size={40}
            color="var(--eq-high-color)"
            onChange={(val) => onMasterEQChange({ ...masterEQ, high: val })}
            onAudioDrag={(val) => { if (masterEQNode?.high) masterEQNode.high.rampTo(val, 0.02); }}
          />
        </div>
      </div>

      {/* Compressor Section */}
      <div className="flex flex-col gap-0.5 border border-[var(--comp-color,#d4af37)]/40 rounded-xs p-1.5 bg-[var(--master-comp-bg)] transition-colors shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-cactus font-extrabold tracking-wider text-[var(--comp-color,#d4af37)] flex items-center gap-1">
            <XiloCompressor size={11} className="shrink-0 text-[var(--comp-color,#d4af37)]" /> {t('compTitle')}
          </span>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <span className="text-[8px] font-mono font-bold px-1 rounded-xs bg-[var(--comp-dyn-bg,rgba(212,175,55,0.15))] text-[var(--comp-dyn-text,#d4af37)] border border-[var(--comp-dyn-border,rgba(212,175,55,0.3))] leading-tight">DYN</span>
            <button
              type="button"
              data-testid="master-power-compressor"
              onClick={(e) => {
                e.stopPropagation();
                const nextActive = !isCompressorActive;
                toggleMasterEffectActive('compressor');
                syncMasterCompressorBypass(!nextActive, masterCompressor);
              }}
              className={`w-5 h-5 rounded-xs flex items-center justify-center font-bold text-[10px] transition-all cursor-pointer select-none ${
                isCompressorActive
                  ? 'bg-[#c88b2a] text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] hover:brightness-110'
                  : 'bg-[#ded3be] text-[#1a1a1a]/40 border border-[#1a1a1a]/30 shadow-none'
              }`}
              title={isCompressorActive ? (lang === 'fr' ? 'Compresseur Master actif' : 'Compressor Master ativo') : (lang === 'fr' ? 'Compresseur Master contourné' : 'Compressor Master desativado')}
            >
              ⏻
            </button>
          </div>
        </div>
        <div data-testid="master-compressor-settings" className={`flex gap-2 justify-between mt-0.5 transition-opacity duration-150 ${isCompressorActive ? '' : 'opacity-40 grayscale pointer-events-none'}`}>
          <DragNumberBox
            label={t('compThreshold')}
            value={masterCompressor.threshold}
            defaultValue={-20}
            onChange={(val) => onMasterCompressorChange({ ...masterCompressor, threshold: val })}
            onAudioDrag={(val) => { try { if (masterCompressorNode?.threshold) masterCompressorNode.threshold.rampTo(val, 0.02); } catch (_) {} }}
            fillColor="var(--comp-color, #d4af37)"
            min={-60}
            max={0}
            step={1}
            className="flex-1"
          />
          <DragNumberBox
            label={t('compRatio')}
            value={masterCompressor.ratio}
            defaultValue={4}
            onChange={(val) => onMasterCompressorChange({ ...masterCompressor, ratio: val })}
            onAudioDrag={(val) => { try { if (masterCompressorNode?.ratio) masterCompressorNode.ratio.rampTo(val, 0.02); } catch (_) {} }}
            fillColor="var(--comp-color, #d4af37)"
            min={1}
            max={12}
            step={0.1}
            className="flex-1"
          />
        </div>
      </div>

      <MixerMasterEffects />
    </div>
  );
};
