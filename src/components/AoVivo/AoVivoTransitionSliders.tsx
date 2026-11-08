import React from 'react';
import {
  CONFIG_ALFAIA_STICKS,
  updateAlfaiaTransitions,
} from '../../audio/animations/alfaiaKinematics';
import {
  CONFIG_CAIXA_STICKS,
  updateCaixaTransitions,
} from '../../audio/animations/caixaKinematics';
import {
  CONFIG_TIMBAL_HANDS,
  updateTimbalStrokesConfig,
  updateTimbalTransitions,
} from '../../audio/animations/timbalKinematics';
import { HandTransitionConfig } from '../../audio/animations/handTransitionEngine';

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

export const AoVivoTransitionSliders: React.FC<{
  family: 'alfaia' | 'caixa' | 'timbal';
}> = ({ family }) => {
  const tr: HandTransitionConfig =
    family === 'alfaia'
      ? CONFIG_ALFAIA_STICKS.transitions
      : family === 'caixa'
        ? CONFIG_CAIXA_STICKS.transitions
        : CONFIG_TIMBAL_HANDS.transitions;

  const upd = (patch: Partial<HandTransitionConfig>) => {
    if (family === 'alfaia') updateAlfaiaTransitions(patch);
    else if (family === 'caixa') updateCaixaTransitions(patch);
    else updateTimbalTransitions(patch);
  };

  return (
    <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-2">
        <S label="Maintien bas Y (→Faible)" val={`${tr.stayLowAfterStrongY}px`} min={-350} max={100} step={2} v={tr.stayLowAfterStrongY} cb={(n) => upd({ stayLowAfterStrongY: n })} />
        <S label="Échelle Z maintien bas" val={tr.stayLowScaleZ.toFixed(2)} min={0.5} max={1.2} step={0.02} v={tr.stayLowScaleZ} cb={(n) => upd({ stayLowScaleZ: n })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <S label="Armé haut Y (→Fort)" val={`${tr.liftHighAfterWeakY}px`} min={-100} max={350} step={2} v={tr.liftHighAfterWeakY} cb={(n) => upd({ liftHighAfterWeakY: n })} />
        <S label="Échelle Z armé haut" val={tr.liftHighScaleZ.toFixed(2)} min={0.9} max={2.3} step={0.02} v={tr.liftHighScaleZ} cb={(n) => upd({ liftHighScaleZ: n })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <S label="Fouetté d'armé poignet" val={`${tr.liftWhipDeg}°`} min={0} max={25} step={0.5} v={tr.liftWhipDeg} cb={(n) => upd({ liftWhipDeg: n })} />
        <S label="Courbe de remontée" val={`${Math.round(tr.transitionRiseCurve * 100)}%`} min={0.1} max={1.0} step={0.05} v={tr.transitionRiseCurve} cb={(n) => upd({ transitionRiseCurve: n })} />
      </div>
      {family === 'timbal' && (
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <S
            label="Anticipation zone N+1"
            val={`${Math.round(CONFIG_TIMBAL_HANDS.transitions.zoneAnticipationRatio * 100)}%`}
            min={0} max={1} step={0.05}
            v={CONFIG_TIMBAL_HANDS.transitions.zoneAnticipationRatio}
            cb={(n) => updateTimbalTransitions({ zoneAnticipationRatio: n })}
          />
          <S
            label="Barulho (B) Déphasage"
            val={CONFIG_TIMBAL_HANDS.strokes.barulhoPhaseOffset.toFixed(2)}
            min={0} max={1} step={0.05}
            v={CONFIG_TIMBAL_HANDS.strokes.barulhoPhaseOffset}
            cb={(n) => updateTimbalStrokesConfig({ barulhoPhaseOffset: n })}
          />
        </div>
      )}
    </div>
  );
};
