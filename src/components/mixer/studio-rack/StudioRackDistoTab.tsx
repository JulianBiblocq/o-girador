import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { MixerKnob } from '../../MixerKnob';
import { TubeSaturationCharacter } from '../../../audio/effects/studioFxPresets';
import { StudioRackStrings } from './studioRackI18n';
import { StudioRackBulbSvg } from './StudioRackBulbSvg';

interface StudioRackDistoTabProps {
  s: StudioRackStrings;
}

const CHARACTERS: { id: TubeSaturationCharacter; titleKey: keyof StudioRackStrings; descKey: keyof StudioRackStrings }[] = [
  { id: 'soft_tube', titleKey: 'charSoftTube', descKey: 'charSoftTubeDesc' },
  { id: 'biting_filament', titleKey: 'charFilament', descKey: 'charFilamentDesc' },
];

export const StudioRackDistoTab: React.FC<StudioRackDistoTabProps> = ({ s }) => {
  const disto = useSequencerStore(st => st.masterFX.distortion);
  const masterBus = useSequencerStore(st => st.masterFX.masterBus);
  const updateDisto = useSequencerStore(st => st.updateMasterDistortionConfig);
  const updateBus = useSequencerStore(st => st.updateMasterBusConfig);

  const character: TubeSaturationCharacter = disto.character ?? 'soft_tube';
  const drive = disto.drive ?? 20;
  const preHpfHz = disto.preHpfHz ?? 180;
  const toneKhz = Number(((disto.toneHz ?? 6500) / 1000).toFixed(1));
  const returnVolume = disto.returnVolume ?? 0;

  const transientAttackDb = masterBus?.transientAttackDb ?? 0;
  const transientSustainDb = masterBus?.transientSustainDb ?? 0;
  const hasTransient = transientAttackDb !== 0 || transientSustainDb !== 0;

  return (
    <div className="flex flex-col gap-3 w-full text-[var(--cordel-text)] select-none">
      {/* 2 Cartes de Caractère */}
      <div className="grid grid-cols-2 gap-2">
        {CHARACTERS.map((ch) => {
          const active = character === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              data-testid={`disto-char-${ch.id}`}
              onClick={() => updateDisto({ character: ch.id, presetId: '' })}
              className={`p-2.5 border-2 rounded-none flex flex-col gap-0.5 text-left transition-colors cursor-pointer ${
                active
                  ? 'bg-[var(--fx-disto-accent)] text-[var(--fx-active-text)] border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-ink-dark)]'
                  : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)]/50 hover:border-[var(--cordel-border)]'
              }`}
            >
              <span className="font-cactus font-black text-[11.5px] uppercase">{s[ch.titleKey]}</span>
              <span className="text-[10px] opacity-85 leading-tight">{s[ch.descKey]}</span>
            </button>
          );
        })}
      </div>

      {/* Visuel Ampoule à Filament & Bouclier Grave */}
      <StudioRackBulbSvg
        drive={drive}
        preHpfHz={preHpfHz}
        toneHz={disto.toneHz ?? 6500}
        character={character}
        bassShieldLabel={s.bassShieldLabel}
      />

      {/* 4 Potentiomètres Saturation */}
      <div className="grid grid-cols-4 gap-2 bg-[var(--cordel-surface)] border border-[var(--cordel-border)]/60 p-2.5 rounded-none justify-items-center">
        <MixerKnob value={drive} min={0} max={100} step={1} defaultValue={20} onChange={v => updateDisto({ drive: v, presetId: '' })} label={s.knobDrive} unit="%" size={42} color="var(--fx-disto-accent)" />
        <MixerKnob value={preHpfHz} min={60} max={300} step={5} defaultValue={180} onChange={v => updateDisto({ preHpfHz: v, presetId: '' })} label={s.knobLowCut} unit="Hz" size={42} color="var(--fx-disto-accent)" />
        <MixerKnob value={toneKhz} min={2.5} max={12} step={0.5} decimals={1} defaultValue={6.5} onChange={v => updateDisto({ toneHz: Math.round(v * 1000), presetId: '' })} label={s.knobToneLpf} unit="kHz" size={42} color="var(--fx-disto-accent)" />
        <MixerKnob value={returnVolume} min={0} max={100} step={1} defaultValue={0} onChange={v => updateDisto({ returnVolume: v })} label={s.knobLevel} unit="%" size={42} color="var(--fx-disto-accent)" />
      </div>

      {/* Encart inférieur : Punch Transitoire */}
      <div className="flex items-center justify-between gap-3 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-2.5 rounded-none">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-cactus font-black text-[11px] uppercase tracking-wider">{s.transientTitle}</span>
          <span className="text-[10px] opacity-80">{s.transientDesc}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => updateBus({ transientAttackDb: 0, transientSustainDb: 0 })}
            className={`px-2 py-1 border font-cactus font-bold text-[9.5px] uppercase rounded-none flex items-center gap-1 cursor-pointer ${
              hasTransient
                ? 'bg-[var(--fx-disto-accent)] text-[var(--fx-active-text)] border-[var(--cordel-border)]'
                : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)]/60 border-[var(--cordel-border)]/40'
            }`}
          >
            <RotateCcw size={11} />
            <span>0 dB</span>
          </button>

          <MixerKnob value={transientAttackDb} min={-6} max={6} step={0.5} decimals={1} defaultValue={0} onChange={v => updateBus({ transientAttackDb: v })} label={s.knobAttack} unit="dB" size={38} color="var(--fx-disto-accent)" />
          <MixerKnob value={transientSustainDb} min={-6} max={6} step={0.5} decimals={1} defaultValue={0} onChange={v => updateBus({ transientSustainDb: v })} label={s.knobSustain} unit="dB" size={38} color="var(--fx-disto-accent)" />
        </div>
      </div>
    </div>
  );
};

