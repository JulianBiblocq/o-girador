import React, { useEffect, useRef } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { MixerKnob } from '../../MixerKnob';
import { masterEQNode } from '../../../hooks/useAudioSync';
import { masterBusWorkletManager } from '../../../audio/effectsChain';
import { subscribeVuMeter } from '../../controls/vuMeterTicker';
import { safeRampGainDb, safeRampTo } from '../../../utils/audio/safeAudioParamRamp';
import { SpeakerProfileId } from '../../../audio/effects/studioFxPresets';
import { StudioRackStrings } from './studioRackI18n';
import { SpeakerProfileIcon, StudioRackEqCurveSvg } from './StudioRackEqCurveSvg';

interface StudioRackEqOutTabProps {
  s: StudioRackStrings;
  isPlaying: boolean;
  masterEQ: { low: number; mid: number; high: number };
  onMasterEQChange: (eq: { low: number; mid: number; high: number }) => void;
}

const SPEAKER_PROFILES: { id: SpeakerProfileId; key: keyof StudioRackStrings }[] = [
  { id: 'headphones', key: 'spkHeadphones' },
  { id: 'usb_bt_speaker', key: 'spkBt' },
  { id: 'rehearsal_room', key: 'spkRehearsal' },
  { id: 'vocal_focus', key: 'spkVocal' },
];

export const StudioRackEqOutTab: React.FC<StudioRackEqOutTabProps> = ({ s, isPlaying, masterEQ, onMasterEQChange }) => {
  const masterBus = useSequencerStore(st => st.masterFX.masterBus);
  const updateBus = useSequencerStore(st => st.updateMasterBusConfig);
  const speakerProfile = useSequencerStore(st => st.speakerProfile);
  const setSpeakerProfile = useSequencerStore(st => st.setSpeakerProfile);

  const eqMidFreqHz = masterBus?.eqMidFreqHz ?? 1000;
  const eqMidQMode = masterBus?.eqMidQMode ?? 'wide';
  const bassMonoEnabled = masterBus?.bassMonoEnabled ?? true;
  const bassMonoCrossoverHz = masterBus?.bassMonoCrossoverHz ?? 110;
  const ceilingDb = masterBus?.ceilingDb ?? -0.3;

  const clipLedRef = useRef<HTMLButtonElement>(null);
  const clipHeldUntilRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) return;
    return subscribeVuMeter(() => {
      const tel = masterBusWorkletManager?.latestTelemetry;
      const peak = tel ? Math.max(tel.peakL, tel.peakR) : 0;
      const now = performance.now();
      if (peak >= 0.9885) clipHeldUntilRef.current = now + 2500;
      if (clipLedRef.current) clipLedRef.current.style.opacity = now < clipHeldUntilRef.current ? '1' : '0.3';
    });
  }, [isPlaying]);

  return (
    <div className="flex flex-col gap-2.5 w-full text-[var(--cordel-text)] select-none">
      <StudioRackEqCurveSvg
        lowDb={masterEQ.low} midDb={masterEQ.mid} midFreqHz={eqMidFreqHz}
        midQMode={eqMidQMode} highDb={masterEQ.high}
        bassMonoEnabled={bassMonoEnabled} bassMonoCrossoverHz={bassMonoCrossoverHz}
      />

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-7 bg-[var(--cordel-surface)] border border-[var(--cordel-border)]/60 p-2 rounded-none flex items-center justify-around gap-1.5">
          <MixerKnob value={masterEQ.low} min={-12} max={12} step={0.5} decimals={1} defaultValue={0} onAudioDrag={v => { if (masterEQNode?.low) safeRampGainDb(masterEQNode.low, v, 0.02); }} onChange={v => onMasterEQChange({ ...masterEQ, low: v })} label={s.knobBass} unit="dB" size={38} color="var(--eq-low-color)" />
          <MixerKnob value={masterEQ.mid} min={-12} max={12} step={0.5} decimals={1} defaultValue={0} onAudioDrag={v => { if (masterEQNode?.mid) safeRampGainDb(masterEQNode.mid, v, 0.02); }} onChange={v => onMasterEQChange({ ...masterEQ, mid: v })} label={s.knobMid} unit="dB" size={38} color="var(--eq-mid-color)" />
          <div className="flex flex-col items-center gap-1">
            <MixerKnob value={eqMidFreqHz} min={250} max={4000} step={25} defaultValue={1000} onAudioDrag={v => { if (masterEQNode?.midFreq) safeRampTo(masterEQNode.midFreq, v, 0.02); }} onChange={v => updateBus({ eqMidFreqHz: v, eqPresetId: '' })} label={s.knobMidFreq} unit="Hz" size={34} color="var(--eq-mid-color)" />
            <div className="flex border border-[var(--cordel-border)]">
              {(['wide', 'narrow'] as const).map(qm => (
                <button
                  key={qm} type="button"
                  onClick={() => { if (masterEQNode?.midQ) safeRampTo(masterEQNode.midQ, qm === 'narrow' ? 2.5 : 0.7, 0.02); updateBus({ eqMidQMode: qm, eqPresetId: '' }); }}
                  className={`px-1.5 py-0.5 text-[8px] font-cactus font-bold uppercase rounded-none cursor-pointer ${eqMidQMode === qm ? 'bg-[var(--eq-mid-color)] text-[var(--cordel-ink-dark)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/70'}`}
                >
                  {qm === 'wide' ? s.qWide : s.qNarrow}
                </button>
              ))}
            </div>
          </div>
          <MixerKnob value={masterEQ.high} min={-12} max={12} step={0.5} decimals={1} defaultValue={0} onAudioDrag={v => { if (masterEQNode?.high) safeRampGainDb(masterEQNode.high, v, 0.02); }} onChange={v => onMasterEQChange({ ...masterEQ, high: v })} label={s.knobTreble} unit="dB" size={38} color="var(--eq-high-color)" />
        </div>

        <div className="col-span-5 grid grid-cols-2 gap-2">
          <div className="bg-[var(--cordel-surface)] border border-[var(--cordel-border)]/60 p-2 rounded-none flex flex-col items-center justify-between gap-1">
            <div className="flex items-center justify-between w-full">
              <span className="font-cactus font-bold text-[9.5px] uppercase truncate">{s.bassMonoTitle}</span>
              <button
                type="button" onClick={() => updateBus({ bassMonoEnabled: !bassMonoEnabled })}
                className={`px-1.5 py-0.5 text-[8.5px] font-mono font-bold border rounded-none cursor-pointer ${bassMonoEnabled ? 'bg-[var(--eq-low-color)] text-[var(--fx-active-text)] border-[var(--cordel-border)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/60 border-[var(--cordel-border)]/40'}`}
              >
                {bassMonoEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <MixerKnob value={bassMonoCrossoverHz} min={60} max={160} step={5} defaultValue={110} onChange={v => updateBus({ bassMonoCrossoverHz: v })} label={s.knobCrossover} unit="Hz" size={36} color="var(--eq-low-color)" />
          </div>

          <div className="bg-[var(--cordel-surface)] border border-[var(--cordel-border)]/60 p-2 rounded-none flex flex-col items-center justify-between gap-1">
            <div className="flex items-center justify-between w-full">
              <span className="font-cactus font-bold text-[9.5px] uppercase truncate">{s.limiterTitle}</span>
              <button
                ref={clipLedRef} type="button" title={s.clipLedAck}
                onClick={() => { clipHeldUntilRef.current = 0; if (clipLedRef.current) clipLedRef.current.style.opacity = '0.3'; }}
                className="px-1.5 py-0.5 text-[8px] font-mono font-black border border-[var(--cordel-border)] rounded-none cursor-pointer"
                style={{ backgroundColor: 'var(--vu-level-clip)', color: 'var(--fx-active-text)', opacity: 0.3 }}
              >
                CLIP
              </button>
            </div>
            <MixerKnob value={ceilingDb} min={-3.0} max={-0.1} step={0.1} decimals={1} defaultValue={-0.3} onChange={v => updateBus({ ceilingDb: v })} label={s.knobCeiling} unit="dB" size={36} color="var(--vu-level-clip)" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-2.5 rounded-none">
        <div className="flex items-center justify-between gap-2">
          <span className="font-cactus font-black text-[11px] uppercase tracking-wider">{s.speakerTitle}</span>
          <span className="text-[9.5px] opacity-80 italic">{s.speakerNotice}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SPEAKER_PROFILES.map(sp => {
            const active = speakerProfile === sp.id;
            return (
              <button
                key={sp.id} type="button" data-testid={`speaker-profile-${sp.id}`} onClick={() => setSpeakerProfile(sp.id)}
                className={`py-1.5 px-2 border-2 rounded-none flex items-center justify-center gap-1.5 font-cactus font-bold text-[10px] uppercase transition-colors cursor-pointer ${active ? 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)]' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)]/80 border-[var(--cordel-border)]/50 hover:border-[var(--cordel-border)]'}`}
              >
                <SpeakerProfileIcon profileId={sp.id} />
                <span className="truncate">{s[sp.key]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
