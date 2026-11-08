import React from 'react';
import { CONFIG_TIMBAL_HANDS, updateTimbalAnatomyConfig, updateTimbalHandsConfig, updateTimbalStrokesConfig, updateTimbalTransitions } from '../../audio/animations/timbalKinematics';
import { AoVivoTransitionSliders } from './AoVivoTransitionSliders';

export type TimbalLabTabId = 'anatomy' | 'grave_aberto' | 'slap_preso' | 'transitions' | 'flas_physics';

const S: React.FC<{ label: string; val: string; min: number; max: number; step: number; v: number; cb: (n: number) => void }> = ({ label, val, min, max, step, v, cb }) => (
  <label className="block space-y-0.5">
    <div className="flex justify-between text-[10px] font-bold"><span>{label}</span><span>{val}</span></div>
    <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => cb(Number(e.target.value))} className="w-full h-1.5 accent-[var(--cordel-accent)] cursor-pointer" />
  </label>
);

export const AoVivoTimbalLabSliders: React.FC<{ activeTab: TimbalLabTabId; onFocusStroke?: (s: string) => void }> = ({ activeTab, onFocusStroke }) => {
  const cfg = CONFIG_TIMBAL_HANDS, a = cfg.anatomy, s = cfg.strokes, tr = cfg.transitions;
  if (activeTab === 'transitions') return <AoVivoTransitionSliders family="timbal" />;

  if (activeTab === 'anatomy') {
    return (
      <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          <S label="Taille main" val={`${Math.round(a.handScale * 100)}%`} min={0.4} max={3.5} step={0.05} v={a.handScale} cb={(n) => updateTimbalAnatomyConfig({ handScale: n })} />
          <S label="Poignet noir" val={`${Math.round(a.forearmWidth * 100)}%`} min={0.3} max={3.0} step={0.05} v={a.forearmWidth} cb={(n) => updateTimbalAnatomyConfig({ forearmWidth: n })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Largeur paume" val={`${Math.round(a.palmWidth * 100)}%`} min={0.3} max={3.0} step={0.05} v={a.palmWidth} cb={(n) => updateTimbalAnatomyConfig({ palmWidth: n })} />
          <S label="Longueur paume" val={`${Math.round(a.palmLength * 100)}%`} min={0.3} max={3.0} step={0.05} v={a.palmLength} cb={(n) => updateTimbalAnatomyConfig({ palmLength: n })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Longueur doigts" val={`${Math.round(a.fingerLength * 100)}%`} min={0.3} max={3.0} step={0.05} v={a.fingerLength} cb={(n) => updateTimbalAnatomyConfig({ fingerLength: n })} />
          <S label="Épaisseur doigts" val={`${Math.round(a.fingerWidth * 100)}%`} min={0.3} max={3.0} step={0.05} v={a.fingerWidth} cb={(n) => updateTimbalAnatomyConfig({ fingerWidth: n })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Ouverture pouce" val={`${a.thumbSpreadDeg}°`} min={-15} max={65} step={1} v={a.thumbSpreadDeg} cb={(n) => updateTimbalAnatomyConfig({ thumbSpreadDeg: n })} />
          <S label="Angle en V" val={`${a.vShapeAngleDeg}°`} min={-20} max={65} step={1} v={a.vShapeAngleDeg} cb={(n) => updateTimbalAnatomyConfig({ vShapeAngleDeg: n })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Écartement mains" val={`${a.handSpreadPx}px`} min={-100} max={600} step={4} v={a.handSpreadPx} cb={(n) => updateTimbalAnatomyConfig({ handSpreadPx: n })} />
          <S label="Hauteur repos Y" val={`${a.restOffsetY}px`} min={-500} max={1400} step={4} v={a.restOffsetY} cb={(n) => updateTimbalAnatomyConfig({ restOffsetY: n }, 'rest')} />
        </div>
      </div>
    );
  }

  if (activeTab === 'grave_aberto') {
    return (
      <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          <S label="Grave — Impact Y" val={`${s.graveImpactY}px`} min={-500} max={1400} step={4} v={s.graveImpactY} cb={(n) => updateTimbalStrokesConfig({ graveImpactY: n }, 'grave')} />
          <S label="Grave — Conv. X" val={`${s.graveConvergeX}px`} min={-250} max={350} step={4} v={s.graveConvergeX} cb={(n) => updateTimbalStrokesConfig({ graveConvergeX: n }, 'grave')} />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <S label="Grave Élan Z" val={s.graveWindUpScaleZ.toFixed(2)} min={0.3} max={3.0} step={0.02} v={s.graveWindUpScaleZ} cb={(n) => updateTimbalStrokesConfig({ graveWindUpScaleZ: n }, 'grave')} />
          <S label="Grave Imp. Z" val={s.graveImpactScaleZ.toFixed(2)} min={0.3} max={3.0} step={0.02} v={s.graveImpactScaleZ} cb={(n) => updateTimbalStrokesConfig({ graveImpactScaleZ: n }, 'grave')} />
          <S label="Étalement" val={s.gravePalmSquash.toFixed(2)} min={0.85} max={1.6} step={0.02} v={s.gravePalmSquash} cb={(n) => updateTimbalStrokesConfig({ gravePalmSquash: n }, 'grave')} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <S label="Aberto — Impact Y" val={`${s.abertoImpactY}px`} min={-500} max={1400} step={4} v={s.abertoImpactY} cb={(n) => updateTimbalStrokesConfig({ abertoImpactY: n }, 'aberto')} />
          <S label="Aberto — Conv. X" val={`${s.abertoConvergeX}px`} min={-250} max={350} step={4} v={s.abertoConvergeX} cb={(n) => updateTimbalStrokesConfig({ abertoConvergeX: n }, 'aberto')} />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <S label="Aberto Élan Z" val={s.abertoWindUpScaleZ.toFixed(2)} min={0.3} max={3.0} step={0.02} v={s.abertoWindUpScaleZ} cb={(n) => updateTimbalStrokesConfig({ abertoWindUpScaleZ: n }, 'aberto')} />
          <S label="Aberto Imp. Z" val={s.abertoImpactScaleZ.toFixed(2)} min={0.3} max={3.0} step={0.02} v={s.abertoImpactScaleZ} cb={(n) => updateTimbalStrokesConfig({ abertoImpactScaleZ: n }, 'aberto')} />
          <S label="Flex doigts" val={s.abertoFingerFlex.toFixed(2)} min={0.3} max={1.8} step={0.02} v={s.abertoFingerFlex} cb={(n) => updateTimbalStrokesConfig({ abertoFingerFlex: n }, 'aberto')} />
        </div>
      </div>
    );
  }

  if (activeTab === 'slap_preso') {
    return (
      <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
        <div className="grid grid-cols-3 gap-1.5">
          <S label="Slap Imp. Y" val={`${s.slapImpactY}px`} min={-500} max={1400} step={4} v={s.slapImpactY} cb={(n) => updateTimbalStrokesConfig({ slapImpactY: n }, 'slap')} />
          <S label="Slap Conv. X" val={`${s.slapConvergeX}px`} min={-250} max={350} step={4} v={s.slapConvergeX} cb={(n) => updateTimbalStrokesConfig({ slapConvergeX: n }, 'slap')} />
          <S label="Recul Élan Y" val={`${s.slapWindUpLiftY}px`} min={-200} max={350} step={4} v={s.slapWindUpLiftY} cb={(n) => updateTimbalStrokesConfig({ slapWindUpLiftY: n }, 'slap')} />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <S label="Rot. Main S" val={`${s.slapHandRotateDeg}°`} min={-55} max={55} step={1} v={s.slapHandRotateDeg} cb={(n) => updateTimbalStrokesConfig({ slapHandRotateDeg: n }, 'slap')} />
          <S label="Pouce Haut" val={`${Math.round(s.slapThumbLift * 100)}%`} min={-0.5} max={0.8} step={0.02} v={s.slapThumbLift} cb={(n) => updateTimbalStrokesConfig({ slapThumbLift: n }, 'slap')} />
          <S label="Élan Ext. X" val={`${s.slapEntryOutsideX}px`} min={-150} max={260} step={4} v={s.slapEntryOutsideX} cb={(n) => updateTimbalStrokesConfig({ slapEntryOutsideX: n }, 'slap')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Slap Élan Z" val={s.slapWindUpScaleZ.toFixed(2)} min={0.3} max={3.0} step={0.02} v={s.slapWindUpScaleZ} cb={(n) => updateTimbalStrokesConfig({ slapWindUpScaleZ: n }, 'slap')} />
          <S label="Slap Impact Z" val={s.slapImpactScaleZ.toFixed(2)} min={0.3} max={3.0} step={0.02} v={s.slapImpactScaleZ} cb={(n) => updateTimbalStrokesConfig({ slapImpactScaleZ: n }, 'slap')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <S label="Écartement doigts Slap" val={`${s.slapFingerSplayDeg}°`} min={0} max={35} step={0.5} v={s.slapFingerSplayDeg} cb={(n) => updateTimbalStrokesConfig({ slapFingerSplayDeg: n }, 'slap')} />
          <S label="Vitesse retrait éclair" val={`${s.slapSnapBackMs}ms`} min={10} max={250} step={2} v={s.slapSnapBackMs} cb={(n) => updateTimbalStrokesConfig({ slapSnapBackMs: n }, 'slap')} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <S label="Preso (P) — Maintien" val={`${s.presoHoldMs}ms`} min={30} max={240} step={5} v={s.presoHoldMs} cb={(n) => updateTimbalStrokesConfig({ presoHoldMs: n })} />
          <S label="Fantôme (D) — Ampl." val={`${s.ghostAmplitudePx}px`} min={0} max={80} step={1} v={s.ghostAmplitudePx} cb={(n) => updateTimbalStrokesConfig({ ghostAmplitudePx: n })} />
        </div>
      </div>
    );
  }

  const updClap = (patch: Partial<typeof s>) => {
    updateTimbalStrokesConfig(patch);
    if (onFocusStroke) onFocusStroke('C');
  };

  return (
    <div className="space-y-1.5 pt-0.5 max-h-[245px] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-2">
        <S label="Clap (C) — Hauteur Y" val={`${s.clapImpactY}px`} min={-350} max={800} step={4} v={s.clapImpactY} cb={(n) => updClap({ clapImpactY: n })} />
        <S label="Clap (C) — Conv. X" val={`${s.clapConvergeX}px`} min={-200} max={280} step={4} v={s.clapConvergeX} cb={(n) => updClap({ clapConvergeX: n })} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <S label="Clap Profil X" val={s.clapProfileScaleX.toFixed(2)} min={0.25} max={1.0} step={0.02} v={s.clapProfileScaleX} cb={(n) => updClap({ clapProfileScaleX: n })} />
        <S label="Clap Inclin. °" val={`${s.clapVerticalTiltDeg}°`} min={0} max={90} step={1} v={s.clapVerticalTiltDeg} cb={(n) => updClap({ clapVerticalTiltDeg: n })} />
        <S label="Clap Rebond" val={`${s.clapRecoilPx}px`} min={0} max={80} step={2} v={s.clapRecoilPx} cb={(n) => updClap({ clapRecoilPx: n })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <S label="Anticipation zone N+1" val={`${Math.round(tr.zoneAnticipationRatio * 100)}%`} min={0} max={1} step={0.05} v={tr.zoneAnticipationRatio} cb={(n) => updateTimbalTransitions({ zoneAnticipationRatio: n })} />
        <S label="Ratio coup léger" val={`${Math.round(s.weakStrokeRatio * 100)}%`} min={0.2} max={1.0} step={0.05} v={s.weakStrokeRatio} cb={(n) => updateTimbalStrokesConfig({ weakStrokeRatio: n })} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <S label="Flas Décal." val={`${s.flaGraceDelayMs}ms`} min={10} max={90} step={2} v={s.flaGraceDelayMs} cb={(n) => updateTimbalStrokesConfig({ flaGraceDelayMs: n })} />
        <S label="Vit. attaque" val={`${Math.round(cfg.attackSpeed * 100)}%`} min={0.05} max={0.38} step={0.01} v={cfg.attackSpeed} cb={(n) => updateTimbalHandsConfig({ attackSpeed: n })} />
        <S label="Fouetté °" val={`${cfg.wristWhipDeg}°`} min={0} max={20} step={0.5} v={cfg.wristWhipDeg} cb={(n) => updateTimbalHandsConfig({ wristWhipDeg: n })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <S label="Profondeur ombre" val={`${cfg.shadowDepthPx}px`} min={0} max={90} step={1} v={cfg.shadowDepthPx} cb={(n) => updateTimbalHandsConfig({ shadowDepthPx: n })} />
        <S label="Opacité ombre" val={`${Math.round(cfg.shadowOpacity * 100)}%`} min={0} max={0.95} step={0.05} v={cfg.shadowOpacity} cb={(n) => updateTimbalHandsConfig({ shadowOpacity: n })} />
      </div>
    </div>
  );
};
