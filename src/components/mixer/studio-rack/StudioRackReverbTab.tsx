import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { MixerKnob } from '../../MixerKnob';
import { ReverbSpaceType, ToadaSlapbackMode } from '../../../audio/effects/studioFxPresets';
import { mapReverbTimeKnobToDecaySec } from '../../../audio/effects/studioReverbImpulse';
import { StudioRackStrings } from './studioRackI18n';
import { ReverbSpaceIcon, StudioRackReverbSvg } from './StudioRackReverbSvg';

interface StudioRackReverbTabProps {
  s: StudioRackStrings;
}

const SPACES: { id: ReverbSpaceType; titleKey: keyof StudioRackStrings; descKey: keyof StudioRackStrings }[] = [
  { id: 'street', titleKey: 'spaceStreet', descKey: 'spaceStreetDesc' },
  { id: 'wood_studio', titleKey: 'spaceWood', descKey: 'spaceWoodDesc' },
  { id: 'great_hall', titleKey: 'spaceHall', descKey: 'spaceHallDesc' },
];

export const StudioRackReverbTab: React.FC<StudioRackReverbTabProps> = ({ s }) => {
  const reverb = useSequencerStore(st => st.masterFX.reverb);
  const masterBus = useSequencerStore(st => st.masterFX.masterBus);
  const updateReverb = useSequencerStore(st => st.updateMasterReverbConfig);
  const updateBus = useSequencerStore(st => st.updateMasterBusConfig);

  const spaceType: ReverbSpaceType = reverb.spaceType ?? 'wood_studio';
  const preDelayMs = reverb.preDelayMs ?? 12;
  const decaySec = mapReverbTimeKnobToDecaySec(reverb.time ?? 30);
  const lowCutHz = reverb.lowCutHz ?? 140;
  const dampKhz = Number(((reverb.dampHz ?? 7500) / 1000).toFixed(1));
  const stereoWidth = reverb.stereoWidth ?? 100;
  const returnVolume = reverb.returnVolume ?? 70;

  const slapMode: ToadaSlapbackMode = masterBus?.toadaSlapbackMode ?? 'off';
  const slapWet = masterBus?.toadaSlapbackWet ?? 0;
  const isSlapOn = slapMode !== 'off';

  const handleDecaySecChange = (sec: number) => {
    const timeKnob = Math.max(0, Math.min(100, Math.round(((sec - 0.4) / 3.6) * 100)));
    updateReverb({ time: timeKnob, presetId: '' });
  };

  return (
    <div className="flex flex-col gap-3 w-full text-[var(--cordel-text)] select-none">
      {/* 3 Cartes Lieux en Xylogravure */}
      <div className="grid grid-cols-3 gap-2">
        {SPACES.map((sp) => {
          const active = spaceType === sp.id;
          return (
            <button
              key={sp.id}
              type="button"
              data-testid={`reverb-space-${sp.id}`}
              onClick={() => updateReverb({ spaceType: sp.id, presetId: '' })}
              className={`p-2 border-2 rounded-none flex items-center gap-2 text-left transition-colors cursor-pointer ${
                active
                  ? 'bg-[var(--fx-reverb-accent)] text-[var(--fx-active-text)] border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-ink-dark)]'
                  : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)]/50 hover:border-[var(--cordel-border)]'
              }`}
            >
              <ReverbSpaceIcon spaceType={sp.id} />
              <div className="flex flex-col min-w-0">
                <span className="font-cactus font-black text-[11px] uppercase truncate">{s[sp.titleKey]}</span>
                <span className="text-[9.5px] opacity-85 leading-tight line-clamp-2">{s[sp.descKey]}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Schéma Acoustique Statique */}
      <StudioRackReverbSvg
        preDelayMs={preDelayMs}
        decaySec={decaySec}
        lowCutHz={lowCutHz}
        dampHz={reverb.dampHz ?? 7500}
        stereoWidth={stereoWidth}
        spaceType={spaceType}
      />

      {/* 6 Potentiomètres Réverbe */}
      <div className="grid grid-cols-6 gap-2 bg-[var(--cordel-surface)] border border-[var(--cordel-border)]/60 p-2.5 rounded-none justify-items-center">
        <MixerKnob value={preDelayMs} min={0} max={80} step={1} defaultValue={12} onChange={v => updateReverb({ preDelayMs: v, presetId: '' })} label={s.knobPreDelay} unit="ms" size={40} color="var(--fx-reverb-accent)" />
        <MixerKnob value={Number(decaySec.toFixed(1))} min={0.4} max={4.0} step={0.1} decimals={1} defaultValue={1.5} onChange={handleDecaySecChange} label={s.knobDecay} unit="s" size={40} color="var(--fx-reverb-accent)" />
        <MixerKnob value={lowCutHz} min={80} max={250} step={5} defaultValue={140} onChange={v => updateReverb({ lowCutHz: v, presetId: '' })} label={s.knobLowCut} unit="Hz" size={40} color="var(--fx-reverb-accent)" />
        <MixerKnob value={dampKhz} min={2.5} max={12} step={0.5} decimals={1} defaultValue={7.5} onChange={v => updateReverb({ dampHz: Math.round(v * 1000), presetId: '' })} label={s.knobDampHf} unit="kHz" size={40} color="var(--fx-reverb-accent)" />
        <MixerKnob value={stereoWidth} min={0} max={100} step={1} defaultValue={100} onChange={v => updateReverb({ stereoWidth: v, presetId: '' })} label={s.knobWidth} unit="%" size={40} color="var(--fx-reverb-accent)" />
        <MixerKnob value={returnVolume} min={0} max={100} step={1} defaultValue={70} onChange={v => updateReverb({ returnVolume: v })} label={s.knobReturn} unit="%" size={40} color="var(--fx-reverb-accent)" />
      </div>

      {/* Encart inférieur : Écho Vocal Toada */}
      <div className="flex items-center justify-between gap-3 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-2.5 rounded-none">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-cactus font-black text-[11px] uppercase tracking-wider">{s.toadaEchoTitle}</span>
          <span className="text-[10px] opacity-80">{s.toadaEchoDesc}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => updateBus({ toadaSlapbackMode: isSlapOn ? 'off' : 'short', toadaSlapbackWet: isSlapOn ? slapWet : Math.max(15, slapWet) })}
            className={`px-2.5 py-1 border-2 font-cactus font-black text-[10px] uppercase rounded-none cursor-pointer ${
              isSlapOn ? 'bg-[var(--fx-reverb-accent)] text-[var(--fx-active-text)] border-[var(--cordel-border)]' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)]/60 border-[var(--cordel-border)]/40'
            }`}
          >
            {isSlapOn ? 'ON' : 'OFF'}
          </button>

          <div className="flex border border-[var(--cordel-border)]">
            {(['short', 'wide'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => updateBus({ toadaSlapbackMode: m, toadaSlapbackWet: Math.max(12, slapWet) })}
                className={`px-2 py-1 font-cactus font-bold text-[9.5px] uppercase rounded-none cursor-pointer ${
                  slapMode === m ? 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)]' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)]/75'
                }`}
              >
                {m === 'short' ? s.toadaShort : s.toadaWide}
              </button>
            ))}
          </div>

          <MixerKnob
            value={slapWet}
            min={0}
            max={35}
            step={1}
            defaultValue={15}
            onChange={v => updateBus({ toadaSlapbackWet: v, toadaSlapbackMode: v > 0 && slapMode === 'off' ? 'short' : slapMode })}
            label={s.knobDosage}
            unit="%"
            size={36}
            color="var(--fx-reverb-accent)"
          />
        </div>
      </div>
    </div>
  );
};

