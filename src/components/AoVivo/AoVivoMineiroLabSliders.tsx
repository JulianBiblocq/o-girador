import React from 'react';
import {
  CONFIG_MINEIRO_LAB,
  updateMineiroLabConfig,
} from '../../audio/animations/mineiroKeyframes';

export type MineiroLabTabId = 'push' | 'pull_lado' | 'kinematics';

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

export const AoVivoMineiroLabSliders: React.FC<{ activeTab: MineiroLabTabId; onFocusStroke?: (s: string) => void }> = ({ activeTab, onFocusStroke }) => {
  const c = CONFIG_MINEIRO_LAB;
  const upd = (patch: Partial<typeof c>, st?: string) => {
    updateMineiroLabConfig(patch);
    if (st && onFocusStroke) onFocusStroke(st);
  };

  if (activeTab === 'push') {
    return (
      <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
        <div className="grid grid-cols-3 gap-1.5">
          <S label="Poussé P — Y" val={`${c.pushStrongY}px`} min={-140} max={0} step={2} v={c.pushStrongY} cb={(n) => upd({ pushStrongY: n }, 'P')} />
          <S label="Poussé P — Z" val={c.pushStrongScaleZ.toFixed(2)} min={0.65} max={1.15} step={0.01} v={c.pushStrongScaleZ} cb={(n) => upd({ pushStrongScaleZ: n }, 'P')} />
          <S label="Poussé P — °" val={`${c.pushStrongTiltDeg.toFixed(1)}°`} min={-15} max={15} step={0.5} v={c.pushStrongTiltDeg} cb={(n) => upd({ pushStrongTiltDeg: n }, 'P')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Poussé Faible p — Y" val={`${c.pushWeakY}px`} min={-80} max={0} step={2} v={c.pushWeakY} cb={(n) => upd({ pushWeakY: n }, 'p')} />
          <S label="Poussé Faible p — Z" val={c.pushWeakScaleZ.toFixed(2)} min={0.8} max={1.1} step={0.01} v={c.pushWeakScaleZ} cb={(n) => upd({ pushWeakScaleZ: n }, 'p')} />
        </div>
      </div>
    );
  }

  if (activeTab === 'pull_lado') {
    return (
      <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
        <div className="grid grid-cols-3 gap-1.5">
          <S label="Tiré T — Y" val={`${c.pullStrongY}px`} min={0} max={140} step={2} v={c.pullStrongY} cb={(n) => upd({ pullStrongY: n }, 'T')} />
          <S label="Tiré T — Z" val={c.pullStrongScaleZ.toFixed(2)} min={0.9} max={1.45} step={0.01} v={c.pullStrongScaleZ} cb={(n) => upd({ pullStrongScaleZ: n }, 'T')} />
          <S label="Tiré T — °" val={`${c.pullStrongTiltDeg.toFixed(1)}°`} min={-15} max={15} step={0.5} v={c.pullStrongTiltDeg} cb={(n) => upd({ pullStrongTiltDeg: n }, 'T')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Tiré Faible t — Y" val={`${c.pullWeakY}px`} min={0} max={80} step={2} v={c.pullWeakY} cb={(n) => upd({ pullWeakY: n }, 't')} />
          <S label="Tiré Faible t — Z" val={c.pullWeakScaleZ.toFixed(2)} min={0.95} max={1.2} step={0.01} v={c.pullWeakScaleZ} cb={(n) => upd({ pullWeakScaleZ: n }, 't')} />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <S label="Lado L — Latéral X" val={`${c.ladoOffsetX}px`} min={-160} max={160} step={2} v={c.ladoOffsetX} cb={(n) => upd({ ladoOffsetX: n }, 'L')} />
          <S label="Lado L — Inclin. °" val={`${c.ladoAngleDeg}°`} min={-45} max={45} step={1} v={c.ladoAngleDeg} cb={(n) => upd({ ladoAngleDeg: n }, 'L')} />
          <S label="Lado L — Torsion 3D" val={`${c.ladoTwistSkewDeg}°`} min={-35} max={35} step={1} v={c.ladoTwistSkewDeg} cb={(n) => upd({ ladoTwistSkewDeg: n }, 'L')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Lado L — Hauteur Y" val={`${c.ladoOffsetY}px`} min={-100} max={100} step={2} v={c.ladoOffsetY} cb={(n) => upd({ ladoOffsetY: n }, 'L')} />
          <S label="Lado L — Zoom Z" val={c.ladoScaleZ.toFixed(2)} min={0.75} max={1.4} step={0.01} v={c.ladoScaleZ} cb={(n) => upd({ ladoScaleZ: n }, 'L')} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
      <S label="Fluidité organique" val={`${Math.round(c.fluidity * 100)}%`} min={0} max={1} step={0.02} v={c.fluidity} cb={(n) => upd({ fluidity: n })} />
      <div className="grid grid-cols-2 gap-2">
        <S label="Retour élastique billes" val={`${Math.round(c.recoilReturnRatio * 100)}%`} min={0} max={0.85} step={0.02} v={c.recoilReturnRatio} cb={(n) => upd({ recoilReturnRatio: n })} />
        <S label="Douceur d'amorti" val={`${Math.round(c.dampingSoftness * 100)}%`} min={0.1} max={1} step={0.05} v={c.dampingSoftness} cb={(n) => upd({ dampingSoftness: n })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <S label="Offset impact billes" val={`${Math.round(c.beadImpactOffset * 100)}%`} min={0.08} max={0.45} step={0.01} v={c.beadImpactOffset} cb={(n) => upd({ beadImpactOffset: n })} />
        <S label="Durée du cycle" val={`${c.cycleDurationMs}ms`} min={80} max={380} step={5} v={c.cycleDurationMs} cb={(n) => upd({ cycleDurationMs: n })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <S label="Barulho (B) — Ampl." val={`${c.barulhoJitterPx}px`} min={1} max={25} step={1} v={c.barulhoJitterPx} cb={(n) => upd({ barulhoJitterPx: n }, 'B')} />
        <S label="Barulho (B) — Fréq." val={`${c.barulhoFreq}`} min={2} max={10} step={1} v={c.barulhoFreq} cb={(n) => upd({ barulhoFreq: n })} />
      </div>
    </div>
  );
};

