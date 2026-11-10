import React from 'react';
import { DragNumberBox } from '../DragNumberBox';
import { MixerKnob } from '../MixerKnob';
import { XiloEQ, XiloCompressor } from '../XiloIcons';
import { masterEQNode, previewMasterCompressorSetting } from '../../audio/effectsChain';
import { safeRampGainDb } from '../../utils/audio/safeAudioParamRamp';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { MixerMasterEffects } from '../MixerMasterEffects';
import type { MasterEqCompressorSectionProps } from './masterEffectsTypes';

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
  const isMasterEqModified = masterEQ.low !== 0 || masterEQ.mid !== 0 || masterEQ.high !== 0;

  const handleMasterEqReset = () => {
    if (!isMasterEqModified) return;
    if (masterEQNode?.low) safeRampGainDb(masterEQNode.low, 0, 0.02);
    if (masterEQNode?.mid) safeRampGainDb(masterEQNode.mid, 0, 0.02);
    if (masterEQNode?.high) safeRampGainDb(masterEQNode.high, 0, 0.02);
    onMasterEQChange({ low: 0, mid: 0, high: 0 });
  };

  return (
    <div className="relative z-10 p-2 flex flex-col gap-2 shrink-0 border-b-2 border-[var(--master-border)] bg-[var(--cordel-ink-dark)]/5">
      {/* EQ Section */}
      <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)]/20 pb-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-cactus font-bold tracking-wider text-[var(--cordel-text)] opacity-85 flex items-center gap-1">
            <XiloEQ size={11} className="shrink-0" /> {t('eqTitle')}
          </span>
          <button
            type="button"
            data-testid="master-eq-reset"
            onClick={handleMasterEqReset}
            disabled={!isMasterEqModified}
            className={`w-4 h-4 flex items-center justify-center cordel-border-sm transition-colors rounded-sm cursor-pointer ${
              isMasterEqModified ? 'bg-[var(--cordel-wood)] text-[var(--cordel-parchment-bg)] border-[var(--cordel-wood)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/30 border-[var(--cordel-border)]/20 cursor-default opacity-55'
            }`}
            title={lang === 'fr' ? "Réinitialiser l'égaliseur Master" : 'Redefinir equalizador Master'}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.73-.73" /></svg>
          </button>
        </div>
        <div className="flex justify-between items-center w-full mt-0.5 px-0.5">
          <MixerKnob label={t('eqLow')} value={masterEQ.low} min={-6.0} max={6.0} step={0.5} decimals={1} defaultValue={0} unit="dB" size={40} color="var(--eq-low-color)" onChange={(val) => onMasterEQChange({ ...masterEQ, low: val })} onAudioDrag={(val) => { if (masterEQNode?.low) safeRampGainDb(masterEQNode.low, val, 0.02); }} />
          <MixerKnob label={t('eqMid')} value={masterEQ.mid} min={-6.0} max={6.0} step={0.5} decimals={1} defaultValue={0} unit="dB" size={40} color="var(--eq-mid-color)" onChange={(val) => onMasterEQChange({ ...masterEQ, mid: val })} onAudioDrag={(val) => { if (masterEQNode?.mid) safeRampGainDb(masterEQNode.mid, val, 0.02); }} />
          <MixerKnob label={t('eqHigh')} value={masterEQ.high} min={-6.0} max={6.0} step={0.5} decimals={1} defaultValue={0} unit="dB" size={40} color="var(--eq-high-color)" onChange={(val) => onMasterEQChange({ ...masterEQ, high: val })} onAudioDrag={(val) => { if (masterEQNode?.high) safeRampGainDb(masterEQNode.high, val, 0.02); }} />
        </div>
      </div>

      {/* Compressor Section */}
      <div className="flex flex-col gap-0.5 border border-[var(--comp-color)]/40 rounded-xs p-1.5 bg-[var(--master-comp-bg)] transition-colors shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-cactus font-extrabold tracking-wider text-[var(--comp-color)] flex items-center gap-1">
            <XiloCompressor size={11} className="shrink-0 text-[var(--comp-color)]" /> {t('compTitle')}
          </span>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <span className="text-[8px] font-mono font-bold px-1 rounded-xs bg-[var(--comp-dyn-bg)] text-[var(--comp-dyn-text)] border border-[var(--comp-dyn-border)] leading-tight">DYN</span>
            <button
              type="button"
              data-testid="master-power-compressor"
              onClick={(e) => {
                e.stopPropagation();
                toggleMasterEffectActive('compressor');
              }}
              className={`w-5 h-5 rounded-xs flex items-center justify-center font-bold text-[10px] transition-all cursor-pointer select-none ${
                isCompressorActive
                  ? 'bg-[var(--cordel-gold)] text-[var(--cordel-parchment-bg)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] hover:brightness-110'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/40 border border-[var(--cordel-border)]/30 shadow-none'
              }`}
              title={isCompressorActive ? (lang === 'fr' ? 'Compresseur Master actif' : 'Compressor Master ativo') : (lang === 'fr' ? 'Compresseur Master contourné' : 'Compressor Master desativado')}
            />
          </div>
        </div>
        <div data-testid="master-compressor-settings" className={`flex gap-2 justify-between mt-0.5 transition-opacity duration-150 ${isCompressorActive ? '' : 'opacity-40 grayscale pointer-events-none'}`}>
          <DragNumberBox label={t('compThreshold')} value={masterCompressor.threshold} defaultValue={-3} onChange={(val) => onMasterCompressorChange({ ...masterCompressor, threshold: val })} onAudioDrag={(val) => previewMasterCompressorSetting('threshold', val)} fillColor="var(--comp-color)" min={-60} max={0} step={1} className="flex-1" />
          <DragNumberBox label={t('compRatio')} value={masterCompressor.ratio} defaultValue={2} onChange={(val) => onMasterCompressorChange({ ...masterCompressor, ratio: val })} onAudioDrag={(val) => previewMasterCompressorSetting('ratio', val)} fillColor="var(--comp-color)" min={1} max={12} step={0.1} className="flex-1" />
        </div>
      </div>

      <MixerMasterEffects />
    </div>
  );
};
