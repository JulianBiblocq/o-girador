import React from 'react';
import {
  CONFIG_CAIXA_STICKS,
  updateCaixaProfile,
  updateCaixaSticksConfig,
} from '../../audio/animations/caixaKinematics';
import { AoVivoSpecialStrokesSliders } from './AoVivoSpecialStrokesSliders';
import { AoVivoTransitionSliders } from './AoVivoTransitionSliders';

export type CaixaLabTabId = 'stick' | 'rufada' | 'transitions' | 'motion' | 'special';

interface LabSliderProps {
  label: string;
  displayVal: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}

const LabSlider: React.FC<LabSliderProps> = ({ label, displayVal, min, max, step, value, onChange }) => (
  <label className="block space-y-0.5">
    <div className="flex justify-between text-[10px] font-bold">
      <span>{label}</span>
      <span>{displayVal}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 accent-[var(--cordel-accent)] cursor-pointer"
    />
  </label>
);

export const AoVivoCaixaLabSliders: React.FC<{ activeTab: CaixaLabTabId; onFocusStroke?: (s: string) => void }> = ({ activeTab, onFocusStroke }) => {
  const cfg = CONFIG_CAIXA_STICKS;
  if (activeTab === 'special') return <AoVivoSpecialStrokesSliders family="caixa" onFocusStroke={onFocusStroke} />;
  if (activeTab === 'transitions') return <AoVivoTransitionSliders family="caixa" />;

  if (activeTab === 'stick') {
    const p = cfg.stick;
    return (
      <div className="space-y-1.5 pt-0.5">
        <LabSlider label="Taille globale (Caixa/Tarol)" displayVal={`${Math.round(p.scale * 100)}%`} min={0.4} max={3.0} step={0.05} value={p.scale} onChange={(v) => updateCaixaProfile({ scale: v })} />
        <LabSlider label="Épaisseur manche noir" displayVal={`${Math.round(p.shaftWidth * 100)}%`} min={0.25} max={3.5} step={0.05} value={p.shaftWidth} onChange={(v) => updateCaixaProfile({ shaftWidth: v })} />
        <LabSlider label="Finesse du col" displayVal={`${Math.round(p.neckTaper * 100)}%`} min={0.2} max={1.4} step={0.02} value={p.neckTaper} onChange={(v) => updateCaixaProfile({ neckTaper: v })} />
        <LabSlider label="Largeur olive" displayVal={`${Math.round(p.oliveWidth * 100)}%`} min={0.25} max={4.0} step={0.05} value={p.oliveWidth} onChange={(v) => updateCaixaProfile({ oliveWidth: v })} />
        <LabSlider label="Longueur olive" displayVal={`${Math.round(p.oliveLength * 100)}%`} min={0.25} max={4.0} step={0.05} value={p.oliveLength} onChange={(v) => updateCaixaProfile({ oliveLength: v })} />
        <LabSlider label="Souplesse baguette" displayVal={`${Math.round(p.flexibility * 100)}%`} min={0.05} max={1.5} step={0.05} value={p.flexibility} onChange={(v) => updateCaixaProfile({ flexibility: v })} />
      </div>
    );
  }

  if (activeTab === 'rufada') {
    return (
      <div className="space-y-1.5 pt-0.5">
        <LabSlider label="Rufada — Nb de rebonds" displayVal={`${cfg.rufadaBounces}`} min={2} max={8} step={1} value={cfg.rufadaBounces} onChange={(v) => updateCaixaSticksConfig({ rufadaBounces: v })} />
        <LabSlider label="Rufada — Amplitude tremblement" displayVal={`${cfg.rufadaBouncePx}px`} min={1} max={35} step={1} value={cfg.rufadaBouncePx} onChange={(v) => updateCaixaSticksConfig({ rufadaBouncePx: v })} />
        <LabSlider label="Rufada — Pression peau (Z)" displayVal={cfg.rufadaPressScaleZ.toFixed(2)} min={0.5} max={1.05} step={0.02} value={cfg.rufadaPressScaleZ} onChange={(v) => updateCaixaSticksConfig({ rufadaPressScaleZ: v })} />
        <LabSlider label="Fla — Décalage appoggiature" displayVal={`${cfg.flaGraceDelayMs}ms`} min={10} max={90} step={2} value={cfg.flaGraceDelayMs} onChange={(v) => updateCaixaSticksConfig({ flaGraceDelayMs: v })} />
        <LabSlider label="Fla — Hauteur petite note" displayVal={cfg.flaGraceScaleZ.toFixed(2)} min={0.7} max={1.35} step={0.02} value={cfg.flaGraceScaleZ} onChange={(v) => updateCaixaSticksConfig({ flaGraceScaleZ: v })} />
        <div className="grid grid-cols-2 gap-2">
          <LabSlider label="Faibles (d/e) Élan" displayVal={cfg.ghostLiftScaleZ.toFixed(2)} min={0.7} max={1.25} step={0.02} value={cfg.ghostLiftScaleZ} onChange={(v) => updateCaixaSticksConfig({ ghostLiftScaleZ: v })} />
          <LabSlider label="Faibles Portée Y" displayVal={`${Math.round(cfg.ghostReachRatio * 100)}%`} min={0.6} max={1.15} step={0.02} value={cfg.ghostReachRatio} onChange={(v) => updateCaixaSticksConfig({ ghostReachRatio: v })} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pt-0.5 max-h-[250px] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Angle en V" displayVal={`${cfg.stickAngleDeg}°`} min={0} max={55} step={1} value={cfg.stickAngleDeg} onChange={(v) => updateCaixaSticksConfig({ stickAngleDeg: v })} />
        <LabSlider label="Écartement" displayVal={`${cfg.stickSpreadPx}px`} min={-40} max={360} step={2} value={cfg.stickSpreadPx} onChange={(v) => updateCaixaSticksConfig({ stickSpreadPx: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Hauteur repos" displayVal={`${cfg.restOffsetY}px`} min={-300} max={600} step={2} value={cfg.restOffsetY} onChange={(v) => updateCaixaSticksConfig({ restOffsetY: v })} />
        <LabSlider label="Portée impact Y" displayVal={`${cfg.impactReachY}px`} min={-500} max={400} step={2} value={cfg.impactReachY} onChange={(v) => updateCaixaSticksConfig({ impactReachY: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Convergence X" displayVal={`${cfg.impactConvergeX}px`} min={-120} max={220} step={2} value={cfg.impactConvergeX} onChange={(v) => updateCaixaSticksConfig({ impactConvergeX: v })} />
        <LabSlider label="Fouetté poignet" displayVal={`${cfg.wristWhipDeg.toFixed(1)}°`} min={0} max={25} step={0.5} value={cfg.wristWhipDeg} onChange={(v) => updateCaixaSticksConfig({ wristWhipDeg: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Élan Z (Visage)" displayVal={cfg.windUpScaleZ.toFixed(2)} min={0.6} max={2.5} step={0.02} value={cfg.windUpScaleZ} onChange={(v) => updateCaixaSticksConfig({ windUpScaleZ: v })} />
        <LabSlider label="Impact Z (Peau)" displayVal={cfg.impactScaleZ.toFixed(2)} min={0.4} max={1.6} step={0.02} value={cfg.impactScaleZ} onChange={(v) => updateCaixaSticksConfig({ impactScaleZ: v })} />
      </div>
      <LabSlider label="Vitesse d'attaque" displayVal={`${Math.round(cfg.attackSpeed * 100)}%`} min={0.04} max={0.45} step={0.01} value={cfg.attackSpeed} onChange={(v) => updateCaixaSticksConfig({ attackSpeed: v })} />
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Profondeur ombre" displayVal={`${cfg.shadowDepthPx}px`} min={0} max={90} step={1} value={cfg.shadowDepthPx} onChange={(v) => updateCaixaSticksConfig({ shadowDepthPx: v })} />
        <LabSlider label="Opacité ombre" displayVal={`${Math.round(cfg.shadowOpacity * 100)}%`} min={0} max={0.95} step={0.05} value={cfg.shadowOpacity} onChange={(v) => updateCaixaSticksConfig({ shadowOpacity: v })} />
      </div>
    </div>
  );
};
