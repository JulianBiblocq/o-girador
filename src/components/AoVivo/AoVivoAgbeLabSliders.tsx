import React from 'react';
import {
  CONFIG_AGBE_LAB,
  updateAgbeLabConfig,
} from '../../audio/animations/agbeKeyframes';

export type AgbeLabTabId = 'pendulum' | 'salto_volta' | 'kinematics';

const S: React.FC<{
  label: string; val: string; min: number; max: number; step: number; v: number; cb: (n: number) => void;
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

export const AoVivoAgbeLabSliders: React.FC<{ activeTab: AgbeLabTabId; onFocusStroke?: (s: string) => void }> = ({ activeTab, onFocusStroke }) => {
  const c = CONFIG_AGBE_LAB;
  const upd = (patch: Partial<typeof c>, st?: string) => {
    updateAgbeLabConfig(patch);
    if (st && onFocusStroke) onFocusStroke(st);
  };

  if (activeTab === 'pendulum') {
    return (
      <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          <S label="Pivot pendulaire Y" val={`${c.pivotYPercent}%`} min={0} max={50} step={1} v={c.pivotYPercent} cb={(n) => upd({ pivotYPercent: n }, 'D')} />
          <S label="Choc inertie perles" val={`${c.beadInertiaPx}px`} min={0} max={20} step={1} v={c.beadInertiaPx} cb={(n) => upd({ beadInertiaPx: n })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Course Forte D/E" val={`${c.strongTranslateX}px`} min={10} max={160} step={2} v={c.strongTranslateX} cb={(n) => upd({ strongTranslateX: n }, 'D')} />
          <S label="Inclinaison Forte D/E" val={`${c.strongRotateZ}°`} min={0} max={45} step={1} v={c.strongRotateZ} cb={(n) => upd({ strongRotateZ: n }, 'D')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Course Faible d/e" val={`${c.weakTranslateX}px`} min={4} max={100} step={2} v={c.weakTranslateX} cb={(n) => upd({ weakTranslateX: n }, 'd')} />
          <S label="Inclinaison Faible d/e" val={`${c.weakRotateZ}°`} min={0} max={25} step={1} v={c.weakRotateZ} cb={(n) => upd({ weakRotateZ: n }, 'd')} />
        </div>
      </div>
    );
  }

  if (activeTab === 'salto_volta') {
    return (
      <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          <S label="Salto (S) — Saut Y" val={`${c.saltoJumpY}px`} min={-120} max={80} step={2} v={c.saltoJumpY} cb={(n) => upd({ saltoJumpY: n }, 'S')} />
          <S label="Salto (S) — Écrasement" val={c.saltoSquash.toFixed(2)} min={0.75} max={1.35} step={0.01} v={c.saltoSquash} cb={(n) => upd({ saltoSquash: n }, 'S')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Volta V — Chute Y" val={`${c.voltaDropY > 0 ? '+' : ''}${c.voltaDropY}px`} min={-60} max={140} step={2} v={c.voltaDropY} cb={(n) => upd({ voltaDropY: n }, 'V')} />
          <S label="Volta V — Écrasement" val={c.voltaSquash.toFixed(2)} min={0.75} max={1.45} step={0.01} v={c.voltaSquash} cb={(n) => upd({ voltaSquash: n }, 'V')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Volta V — Rotation" val={`${c.voltaRotationDeg}°`} min={0} max={45} step={1} v={c.voltaRotationDeg} cb={(n) => upd({ voltaRotationDeg: n }, 'V')} />
          <S label="Volta V — Zoom Z" val={c.voltaScaleZ.toFixed(2)} min={0.8} max={1.45} step={0.02} v={c.voltaScaleZ} cb={(n) => upd({ voltaScaleZ: n }, 'V')} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-2">
        <S label="Vitesse d'attaque" val={`${Math.round(c.attackOffset * 100)}%`} min={0.08} max={0.4} step={0.01} v={c.attackOffset} cb={(n) => upd({ attackOffset: n })} />
        <S label="Durée balancier" val={`${c.pendulumDurationMs}ms`} min={100} max={450} step={10} v={c.pendulumDurationMs} cb={(n) => upd({ pendulumDurationMs: n })} />
      </div>
      <S label="Anticipation coup N+1" val={`${Math.round(c.nextAnticipationRatio * 100)}%`} min={0} max={1} step={0.05} v={c.nextAnticipationRatio} cb={(n) => upd({ nextAnticipationRatio: n })} />
      <div className="grid grid-cols-2 gap-2">
        <S label="Barulho (B) — Ampl." val={`${c.barulhoJitterPx}px`} min={1} max={30} step={1} v={c.barulhoJitterPx} cb={(n) => upd({ barulhoJitterPx: n }, 'B')} />
        <S label="Barulho (B) — Fréq." val={`${c.barulhoFreq}`} min={2} max={10} step={1} v={c.barulhoFreq} cb={(n) => upd({ barulhoFreq: n })} />
      </div>
    </div>
  );
};

