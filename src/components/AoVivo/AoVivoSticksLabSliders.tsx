import React from 'react';
import {
  CONFIG_ALFAIA_STICKS,
  updateAlfaiaSticksConfig,
  updateBacalhauProfile,
  updateFinaProfile,
  updateMacanetaProfile,
} from '../../audio/animations/alfaiaKinematics';
import { AoVivoSpecialStrokesSliders } from './AoVivoSpecialStrokesSliders';
import { AoVivoTransitionSliders } from './AoVivoTransitionSliders';

export type AlfaiaLabTabId = 'macaneta' | 'fina' | 'bacalhau' | 'transitions' | 'motion' | 'special';

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

export const AoVivoSticksLabSliders: React.FC<{ activeTab: AlfaiaLabTabId; onFocusStroke?: (s: string) => void }> = ({ activeTab, onFocusStroke }) => {
  const cfg = CONFIG_ALFAIA_STICKS;
  if (activeTab === 'special') return <AoVivoSpecialStrokesSliders family="alfaia" onFocusStroke={onFocusStroke} />;
  if (activeTab === 'transitions') return <AoVivoTransitionSliders family="alfaia" />;

  if (activeTab === 'macaneta') {
    const p = cfg.macaneta;
    return (
      <div className="space-y-1.5 pt-0.5">
        <LabSlider label="Taille globale (Grosse)" displayVal={`${Math.round(p.scale * 100)}%`} min={0.4} max={3.0} step={0.05} value={p.scale} onChange={(v) => updateMacanetaProfile({ scale: v })} />
        <LabSlider label="Épaisseur manche noir" displayVal={`${Math.round(p.shaftWidth * 100)}%`} min={0.4} max={3.5} step={0.05} value={p.shaftWidth} onChange={(v) => updateMacanetaProfile({ shaftWidth: v })} />
        <LabSlider label="Largeur olive rouge" displayVal={`${Math.round(p.oliveWidth * 100)}%`} min={0.4} max={4.0} step={0.05} value={p.oliveWidth} onChange={(v) => updateMacanetaProfile({ oliveWidth: v })} />
        <LabSlider label="Longueur olive rouge" displayVal={`${Math.round(p.oliveLength * 100)}%`} min={0.4} max={4.0} step={0.05} value={p.oliveLength} onChange={(v) => updateMacanetaProfile({ oliveLength: v })} />
        <LabSlider label="Souplesse Grosse" displayVal={`${Math.round(p.flexibility * 100)}%`} min={0.05} max={1.5} step={0.05} value={p.flexibility} onChange={(v) => updateMacanetaProfile({ flexibility: v })} />
      </div>
    );
  }

  if (activeTab === 'fina') {
    const p = cfg.fina;
    return (
      <div className="space-y-1.5 pt-0.5">
        <LabSlider label="Taille globale (Fine)" displayVal={`${Math.round(p.scale * 100)}%`} min={0.4} max={3.0} step={0.05} value={p.scale} onChange={(v) => updateFinaProfile({ scale: v })} />
        <LabSlider label="Épaisseur manche noir" displayVal={`${Math.round(p.shaftWidth * 100)}%`} min={0.25} max={3.0} step={0.05} value={p.shaftWidth} onChange={(v) => updateFinaProfile({ shaftWidth: v })} />
        <LabSlider label="Largeur olive rouge" displayVal={`${Math.round(p.oliveWidth * 100)}%`} min={0.2} max={3.5} step={0.05} value={p.oliveWidth} onChange={(v) => updateFinaProfile({ oliveWidth: v })} />
        <LabSlider label="Longueur olive rouge" displayVal={`${Math.round(p.oliveLength * 100)}%`} min={0.2} max={3.5} step={0.05} value={p.oliveLength} onChange={(v) => updateFinaProfile({ oliveLength: v })} />
        <LabSlider label="Souplesse Fine" displayVal={`${Math.round(p.flexibility * 100)}%`} min={0.05} max={1.5} step={0.05} value={p.flexibility} onChange={(v) => updateFinaProfile({ flexibility: v })} />
      </div>
    );
  }

  if (activeTab === 'bacalhau') {
    const b = cfg.bacalhau;
    return (
      <div className="space-y-1.5 pt-0.5">
        <LabSlider label="Taille / Longueur" displayVal={`${Math.round(b.scale * 100)}%`} min={0.4} max={3.0} step={0.05} value={b.scale} onChange={(v) => updateBacalhauProfile({ scale: v })} />
        <LabSlider label="Épaisseur baguette blanche" displayVal={`${Math.round(b.shaftWidth * 100)}%`} min={0.2} max={2.5} step={0.05} value={b.shaftWidth} onChange={(v) => updateBacalhauProfile({ shaftWidth: v })} />
        <LabSlider label="Finesse pointe" displayVal={`${Math.round(b.tipTaper * 100)}%`} min={0.2} max={1.5} step={0.05} value={b.tipTaper} onChange={(v) => updateBacalhauProfile({ tipTaper: v })} />
        <LabSlider label="Courbure à l'impact" displayVal={`${b.impactBendDeg}°`} min={0} max={45} step={1} value={b.impactBendDeg} onChange={(v) => updateBacalhauProfile({ impactBendDeg: v })} />
        <LabSlider label="Écrasement sur la peau" displayVal={`${Math.round(b.impactSquashX * 100)}%`} min={0.8} max={1.8} step={0.02} value={b.impactSquashX} onChange={(v) => updateBacalhauProfile({ impactSquashX: v })} />
        <LabSlider label="Durée du claqué" displayVal={`${b.bendSnapMs}ms`} min={20} max={240} step={5} value={b.bendSnapMs} onChange={(v) => updateBacalhauProfile({ bendSnapMs: v })} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pt-0.5 max-h-[250px] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Angle en V" displayVal={`${cfg.stickAngleDeg}°`} min={0} max={55} step={1} value={cfg.stickAngleDeg} onChange={(v) => updateAlfaiaSticksConfig({ stickAngleDeg: v })} />
        <LabSlider label="Écartement" displayVal={`${cfg.stickSpreadPx}px`} min={-40} max={360} step={2} value={cfg.stickSpreadPx} onChange={(v) => updateAlfaiaSticksConfig({ stickSpreadPx: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Hauteur repos" displayVal={`${cfg.restOffsetY}px`} min={-300} max={600} step={2} value={cfg.restOffsetY} onChange={(v) => updateAlfaiaSticksConfig({ restOffsetY: v })} />
        <LabSlider label="Portée impact Y" displayVal={`${cfg.impactReachY}px`} min={-500} max={400} step={2} value={cfg.impactReachY} onChange={(v) => updateAlfaiaSticksConfig({ impactReachY: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Convergence X" displayVal={`${cfg.impactConvergeX}px`} min={-120} max={220} step={2} value={cfg.impactConvergeX} onChange={(v) => updateAlfaiaSticksConfig({ impactConvergeX: v })} />
        <LabSlider label="Fouetté poignet" displayVal={`${cfg.wristWhipDeg.toFixed(1)}°`} min={0} max={25} step={0.5} value={cfg.wristWhipDeg} onChange={(v) => updateAlfaiaSticksConfig({ wristWhipDeg: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Élan Z (Visage)" displayVal={cfg.windUpScaleZ.toFixed(2)} min={0.6} max={2.5} step={0.02} value={cfg.windUpScaleZ} onChange={(v) => updateAlfaiaSticksConfig({ windUpScaleZ: v })} />
        <LabSlider label="Impact Z (Peau)" displayVal={cfg.impactScaleZ.toFixed(2)} min={0.4} max={1.6} step={0.02} value={cfg.impactScaleZ} onChange={(v) => updateAlfaiaSticksConfig({ impactScaleZ: v })} />
      </div>
      <LabSlider label="Vitesse d'attaque" displayVal={`${Math.round(cfg.attackSpeed * 100)}%`} min={0.04} max={0.45} step={0.01} value={cfg.attackSpeed} onChange={(v) => updateAlfaiaSticksConfig({ attackSpeed: v })} />
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Profondeur ombre" displayVal={`${cfg.shadowDepthPx}px`} min={0} max={90} step={1} value={cfg.shadowDepthPx} onChange={(v) => updateAlfaiaSticksConfig({ shadowDepthPx: v })} />
        <LabSlider label="Opacité ombre" displayVal={`${Math.round(cfg.shadowOpacity * 100)}%`} min={0} max={0.9} step={0.05} value={cfg.shadowOpacity} onChange={(v) => updateAlfaiaSticksConfig({ shadowOpacity: v })} />
      </div>
    </div>
  );
};
