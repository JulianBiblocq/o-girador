import React, { useRef } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { MixerKnob } from '../../MixerKnob';
import { previewMasterCompressorSetting } from '../../../audio/effectsChain';
import { StudioRackStrings } from './studioRackI18n';
import { StudioRackNeedleVu } from './StudioRackNeedleVu';

interface StudioRackCompTabProps {
  s: StudioRackStrings;
  isPlaying: boolean;
  masterCompressor: { threshold: number; ratio: number };
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
}

export const StudioRackCompTab: React.FC<StudioRackCompTabProps> = ({
  s,
  isPlaying,
  masterCompressor,
  onMasterCompressorChange,
}) => {
  const masterBus = useSequencerStore(st => st.masterFX.masterBus);
  const updateBus = useSequencerStore(st => st.updateMasterBusConfig);

  const duckBarRef = useRef<HTMLDivElement>(null);
  const duckTextRef = useRef<HTMLSpanElement>(null);

  const attackMs = masterBus?.attackMs ?? 15;
  const releaseMs = masterBus?.releaseMs ?? 120;
  const scHpfHz = masterBus?.scHpfHz ?? 95;
  const compMixPct = masterBus?.compMixPct ?? 75;
  const duckingDb = masterBus?.duckingDb ?? 1.5;
  const isScOff = scHpfHz < 60;

  return (
    <div className="flex flex-col gap-3 w-full text-[var(--cordel-text)] select-none">
      {/* Tandem Bobines de Bande Magnétique + VU-mètre Analogique à Aiguille */}
      <StudioRackNeedleVu
        isPlaying={isPlaying}
        compVuLabel={s.compVuLabel}
        duckBarRef={duckBarRef}
        duckTextRef={duckTextRef}
      />

      {/* 6 Potentiomètres Compresseur Glue */}
      <div className="grid grid-cols-6 gap-2 bg-[var(--cordel-surface)] border border-[var(--cordel-border)]/60 p-2.5 rounded-none justify-items-center items-center">
        <MixerKnob
          value={masterCompressor.threshold}
          min={-40}
          max={0}
          step={1}
          defaultValue={-6}
          onAudioDrag={v => previewMasterCompressorSetting('threshold', v)}
          onChange={v => onMasterCompressorChange({ ...masterCompressor, threshold: v })}
          label={s.knobThreshold}
          unit="dB"
          size={40}
          color="var(--fx-comp-knob)"
        />
        <MixerKnob
          value={masterCompressor.ratio}
          min={1}
          max={10}
          step={0.5}
          decimals={1}
          defaultValue={2}
          onAudioDrag={v => previewMasterCompressorSetting('ratio', v)}
          onChange={v => onMasterCompressorChange({ ...masterCompressor, ratio: v })}
          label={s.knobRatio}
          unit=":1"
          size={40}
          color="var(--fx-comp-knob)"
        />
        <MixerKnob value={attackMs} min={1} max={50} step={1} defaultValue={15} onChange={v => updateBus({ attackMs: v, compPresetId: '' })} label={s.knobAttack} unit="ms" size={40} color="var(--fx-comp-knob)" />
        <MixerKnob value={releaseMs} min={40} max={500} step={5} defaultValue={120} onChange={v => updateBus({ releaseMs: v, compPresetId: '' })} label={s.knobRelease} unit="ms" size={40} color="var(--fx-comp-knob)" />

        <div className="flex flex-col items-center gap-1">
          <MixerKnob
            value={isScOff ? 60 : scHpfHz}
            min={60}
            max={150}
            step={5}
            defaultValue={95}
            onChange={v => updateBus({ scHpfHz: v, compPresetId: '' })}
            label={s.knobScHpf}
            unit={isScOff ? 'OFF' : 'Hz'}
            size={36}
            color="var(--fx-comp-knob)"
          />
          <button
            type="button"
            onClick={() => updateBus({ scHpfHz: isScOff ? 95 : 0, compPresetId: '' })}
            className={`px-1.5 py-0.5 text-[8.5px] font-mono font-bold uppercase border rounded-none cursor-pointer ${
              !isScOff ? 'bg-[var(--fx-comp-accent)] text-[var(--fx-comp-active-text)] border-[var(--cordel-border)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/60 border-[var(--cordel-border)]/40'
            }`}
          >
            {isScOff ? 'SC: OFF' : `SC: ${scHpfHz}Hz`}
          </button>
        </div>

        <MixerKnob value={compMixPct} min={0} max={100} step={1} defaultValue={75} onChange={v => updateBus({ compMixPct: v, compPresetId: '' })} label={s.knobParallelMix} unit="%" size={40} color="var(--fx-comp-knob)" />
      </div>

      {/* Encart inférieur : Ducking Vocal Toada */}
      <div className="flex items-center justify-between gap-3 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-2.5 rounded-none">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="font-cactus font-black text-[11px] uppercase tracking-wider">{s.duckingTitle}</span>
          <span className="text-[10px] opacity-80">{s.duckingDesc}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9.5px] font-mono font-bold opacity-80">{s.duckWitnessLabel}</span>
            <div className="w-28 h-2.5 bg-[var(--vu-track-bg)] border border-[var(--cordel-border)] relative overflow-hidden">
              <div
                ref={duckBarRef}
                className="absolute inset-0 bg-[var(--vu-level-warn)] origin-left will-change-transform"
                style={{ transform: 'scaleX(0)' }}
              />
            </div>
            <span ref={duckTextRef} className="text-[9.5px] font-mono font-bold tabular-nums">0.0 dB</span>
          </div>
        </div>

        <MixerKnob value={duckingDb} min={0} max={4} step={0.1} decimals={1} defaultValue={1.5} onChange={v => updateBus({ duckingDb: v })} label={s.knobDucking} unit="dB" size={40} color="var(--fx-comp-knob)" />
      </div>
    </div>
  );
};

