/**
 * AoVivoCaixaRimshotSliders.tsx — Curseurs dédiés au Rimshot (A / a — Peau & Cerclage) Caixa/Tarol (< 85L).
 */
import React from 'react';
import {
  CONFIG_CAIXA_STICKS,
  updateCaixaSticksConfig,
} from '../../audio/animations/caixaKinematics';

const RimSlider: React.FC<{
  label: string;
  val: string;
  min: number;
  max: number;
  step: number;
  v: number;
  cb: (n: number) => void;
}> = ({ label, val, min, max, step, v, cb }) => (
  <label className="block space-y-0.5">
    <div className="flex justify-between text-[10px] font-bold">
      <span>{label}</span>
      <span>{val}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={v}
      onChange={(e) => cb(Number(e.target.value))}
      className="w-full h-1.5 accent-[var(--cordel-accent)] cursor-pointer"
    />
  </label>
);

export const AoVivoCaixaRimshotSliders: React.FC<{
  activeTestStroke?: string;
  onFocusStroke?: (stroke: string) => void;
}> = ({ activeTestStroke, onFocusStroke }) => {
  const cfg = CONFIG_CAIXA_STICKS;
  const targetFocus = activeTestStroke === 'a' ? 'a' : 'A';
  const upd = (patch: Partial<typeof CONFIG_CAIXA_STICKS>, focus: string = targetFocus) => {
    updateCaixaSticksConfig(patch);
    onFocusStroke?.(focus);
  };

  return (
    <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-2">
        <RimSlider
          label="Rimshot (A/a) — Bord Y"
          val={`${cfg.rimshotSkinImpactY}px`}
          min={-140}
          max={160}
          step={2}
          v={cfg.rimshotSkinImpactY}
          cb={(n) => upd({ rimshotSkinImpactY: n })}
        />
        <RimSlider
          label="Rimshot (A/a) — Déport X"
          val={`${cfg.rimshotSkinOffsetX}px`}
          min={-120}
          max={80}
          step={2}
          v={cfg.rimshotSkinOffsetX}
          cb={(n) => upd({ rimshotSkinOffsetX: n })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <RimSlider
          label="Rimshot (A/a) — Angle"
          val={`${cfg.rimshotSkinAngleDeg}°`}
          min={-35}
          max={35}
          step={0.5}
          v={cfg.rimshotSkinAngleDeg}
          cb={(n) => upd({ rimshotSkinAngleDeg: n })}
        />
        <RimSlider
          label="Nuance (a) vs (A)"
          val={`${Math.round(cfg.rimshotWeakRatio * 100)}%`}
          min={0.7}
          max={1.1}
          step={0.02}
          v={cfg.rimshotWeakRatio}
          cb={(n) => upd({ rimshotWeakRatio: n }, 'a')}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <RimSlider
          label="Rimshot — Élan Z"
          val={cfg.rimshotWindUpScaleZ.toFixed(2)}
          min={0.85}
          max={2.2}
          step={0.02}
          v={cfg.rimshotWindUpScaleZ}
          cb={(n) => upd({ rimshotWindUpScaleZ: n })}
        />
        <RimSlider
          label="Rimshot — Impact Z"
          val={cfg.rimshotImpactScaleZ.toFixed(2)}
          min={0.45}
          max={1.35}
          step={0.01}
          v={cfg.rimshotImpactScaleZ}
          cb={(n) => upd({ rimshotImpactScaleZ: n })}
        />
      </div>
    </div>
  );
};
