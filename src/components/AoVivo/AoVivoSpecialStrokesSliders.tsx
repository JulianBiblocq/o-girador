import React from 'react';
import {
  CONFIG_ALFAIA_STICKS,
  updateAlfaiaSticksConfig,
} from '../../audio/animations/alfaiaKinematics';
import {
  CONFIG_CAIXA_STICKS,
  updateCaixaSticksConfig,
} from '../../audio/animations/caixaKinematics';

const S: React.FC<{
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
      type="range" min={min} max={max} step={step} value={v}
      onChange={(e) => cb(Number(e.target.value))}
      className="w-full h-1.5 accent-[var(--cordel-accent)] cursor-pointer"
    />
  </label>
);

export const AoVivoSpecialStrokesSliders: React.FC<{
  family: 'alfaia' | 'caixa';
  onFocusStroke?: (stroke: string) => void;
}> = ({ family, onFocusStroke }) => {
  const cfg = family === 'alfaia' ? CONFIG_ALFAIA_STICKS : CONFIG_CAIXA_STICKS;
  const upd = (patch: any, st?: string) => {
    if (family === 'alfaia') updateAlfaiaSticksConfig(patch);
    else updateCaixaSticksConfig(patch);
    if (st && onFocusStroke) onFocusStroke(st);
  };

  return (
    <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
      <div className="grid grid-cols-3 gap-1.5">
        <S label="Clic (C) Centre X" val={`${cfg.crossClickCenterX}px`} min={-200} max={200} step={2} v={cfg.crossClickCenterX} cb={(n) => upd({ crossClickCenterX: n }, 'C')} />
        <S label="Clic (C) Haut. Y" val={`${cfg.crossClickY}px`} min={-350} max={500} step={4} v={cfg.crossClickY} cb={(n) => upd({ crossClickY: n }, 'C')} />
        <S label="Clic (C) Crois. X" val={`${cfg.crossClickConvergeX}px`} min={-80} max={320} step={2} v={cfg.crossClickConvergeX} cb={(n) => upd({ crossClickConvergeX: n }, 'C')} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <S label="Clic (C) — Angle" val={`${cfg.crossClickAngleDeg}°`} min={-35} max={75} step={1} v={cfg.crossClickAngleDeg} cb={(n) => upd({ crossClickAngleDeg: n }, 'C')} />
        <S label="Clic (C) — Échelle Z" val={cfg.crossClickScaleZ.toFixed(2)} min={0.5} max={2.2} step={0.02} v={cfg.crossClickScaleZ} cb={(n) => upd({ crossClickScaleZ: n }, 'C')} />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <S label="Cerclage (X) — Impact Y" val={`${cfg.rimshotImpactY}px`} min={-350} max={850} step={4} v={cfg.rimshotImpactY} cb={(n) => upd({ rimshotImpactY: n }, 'X')} />
        <S label="Cerclage (X) — Déport X" val={`${cfg.rimshotOffsetX}px`} min={-320} max={320} step={4} v={cfg.rimshotOffsetX} cb={(n) => upd({ rimshotOffsetX: n }, 'X')} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <S label="Cerclage (X) — Angle" val={`${cfg.rimshotAngleDeg}°`} min={-65} max={65} step={1} v={cfg.rimshotAngleDeg} cb={(n) => upd({ rimshotAngleDeg: n }, 'X')} />
        <S label="Cerclage (X) — Échelle Z" val={cfg.rimshotScaleZ.toFixed(2)} min={0.4} max={1.8} step={0.02} v={cfg.rimshotScaleZ} cb={(n) => upd({ rimshotScaleZ: n }, 'X')} />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <S label="Barulho (B) — Hauteur Y" val={`${cfg.barulhoImpactY}px`} min={-300} max={500} step={4} v={cfg.barulhoImpactY} cb={(n) => upd({ barulhoImpactY: n }, 'B')} />
        <S label="Barulho (B) — Déphasage G/D" val={cfg.barulhoPhaseOffset.toFixed(2)} min={0} max={1} step={0.05} v={cfg.barulhoPhaseOffset} cb={(n) => upd({ barulhoPhaseOffset: n })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <S label="Barulho (B) — Amplitude" val={`${cfg.barulhoJitterPx}px`} min={1} max={35} step={1} v={cfg.barulhoJitterPx} cb={(n) => upd({ barulhoJitterPx: n })} />
        <S label="Barulho (B) — Rebonds" val={`${cfg.barulhoBounces}`} min={2} max={8} step={1} v={cfg.barulhoBounces} cb={(n) => upd({ barulhoBounces: n })} />
      </div>
    </div>
  );
};
