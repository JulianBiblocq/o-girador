/**
 * BusDynamicsKnobsGrid.tsx — Grille des 7 Potentiomètres Experts du Compresseur de Bus (< 110 lignes).
 * Audio immédiat pendant le glissement + throttle Zustand (1 Undo par geste) + double-clic nominal par paramètre.
 */
import React, { useEffect, useRef } from 'react';
import { BUS_COMPRESSOR_ARCHETYPES } from '../../../audio/effects/busCompressorArchetypes';
import { previewBusCompressorParams } from '../../../audio/effects/busCompressorInsert';
import type { BusCompressorPresetArchetypeId, BusCompressorSettings } from '../../../audio/effects/busCompressorTypes';
import { MixerKnob } from '../../MixerKnob';
import {
  onBusKnobAudioDrag,
  onBusKnobCommit,
  type BusCompressorKnobKey,
  type KnobGestureSession,
} from './busDynamicsKnobLogic';
import type { BusDynamicsModalStrings } from './busDynamicsModalI18n';

interface BusDynamicsKnobsGridProps {
  trackId: number;
  settings: BusCompressorSettings;
  naturalArchetype: BusCompressorPresetArchetypeId;
  onUserTweak: () => void;
  s: BusDynamicsModalStrings;
}

interface KnobDef {
  key: BusCompressorKnobKey;
  labelKey: keyof BusDynamicsModalStrings;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  unit: string;
  isGain?: boolean;
}

const KNOB_DEFS: readonly KnobDef[] = [
  { key: 'thresholdDb', labelKey: 'knobThreshold', min: -40, max: 0, step: 0.5, decimals: 1, unit: 'dB' },
  { key: 'ratio', labelKey: 'knobRatio', min: 1, max: 10, step: 0.1, decimals: 1, unit: ':1' },
  { key: 'attackMs', labelKey: 'knobAttack', min: 1, max: 50, step: 1, unit: ' ms' },
  { key: 'releaseMs', labelKey: 'knobRelease', min: 30, max: 400, step: 5, unit: ' ms' },
  { key: 'sidechainHpfHz', labelKey: 'knobScHpf', min: 20, max: 250, step: 5, unit: ' Hz' },
  { key: 'makeupDb', labelKey: 'knobMakeup', min: -6, max: 12, step: 0.5, decimals: 1, unit: 'dB', isGain: true },
  { key: 'mixPct', labelKey: 'knobMix', min: 0, max: 100, step: 1, unit: '%' },
];

export const BusDynamicsKnobsGrid: React.FC<BusDynamicsKnobsGridProps> = ({
  trackId, settings, naturalArchetype, onUserTweak, s,
}) => {
  const sessionRef = useRef<KnobGestureSession>({
    activeKey: null, lastWriteMs: 0, pendingPatch: null, timer: null,
  });

  useEffect(() => () => {
    if (sessionRef.current.timer) clearTimeout(sessionRef.current.timer);
  }, []);

  const nominal = BUS_COMPRESSOR_ARCHETYPES[naturalArchetype];

  return (
    <div className="flex flex-col gap-1.5 select-none">
      <span className="text-[10px] font-cactus font-black uppercase tracking-wider opacity-85 px-0.5">
        {s.knobsSectionTitle}
      </span>
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] p-3 rounded-none justify-items-center items-center">
        {KNOB_DEFS.map((def) => (
          <MixerKnob
            key={def.key}
            value={settings[def.key]}
            min={def.min}
            max={def.max}
            step={def.step}
            decimals={def.decimals}
            defaultValue={nominal[def.key]}
            onAudioDrag={(v) => onBusKnobAudioDrag(sessionRef.current, trackId, def.key, v, onUserTweak, previewBusCompressorParams)}
            onChange={(v) => onBusKnobCommit(sessionRef.current, trackId, def.key, v, onUserTweak, previewBusCompressorParams)}
            label={s[def.labelKey]}
            unit={def.unit}
            size={38}
            color="var(--fx-comp-knob)"
            isGain={def.isGain}
          />
        ))}
      </div>
    </div>
  );
};
