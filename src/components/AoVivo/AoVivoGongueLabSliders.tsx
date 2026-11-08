import React from 'react';
import {
  CONFIG_GONGUE_STICK,
  updateGongueHandConfig,
  updateGongueStickConfig,
  updateGongueTipConfig,
} from '../../audio/animations/gongueKinematics';

export type GongueLabTabId = 'hand' | 'grave' | 'aigu' | 'metal';

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

export const AoVivoGongueLabSliders: React.FC<{ activeTab: GongueLabTabId }> = ({ activeTab }) => {
  const cfg = CONFIG_GONGUE_STICK;
  const h = cfg.hand;
  const t = cfg.tip;

  if (activeTab === 'hand') {
    return (
      <div className="space-y-1.5 pt-0.5 max-h-[250px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          <LabSlider label="Décalage global X (Ext.)" displayVal={`${cfg.globalOffsetX}px`} min={-150} max={260} step={2} value={cfg.globalOffsetX} onChange={(v) => updateGongueStickConfig({ globalOffsetX: v })} />
          <LabSlider label="Décalage global Y" displayVal={`${cfg.globalOffsetY}px`} min={-160} max={160} step={2} value={cfg.globalOffsetY} onChange={(v) => updateGongueStickConfig({ globalOffsetY: v })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LabSlider label="Main Grave X" displayVal={`${h.graveX}px`} min={-50} max={360} step={2} value={h.graveX} onChange={(v) => updateGongueHandConfig({ graveX: v }, 'grave_impact')} />
          <LabSlider label="Main Grave Y" displayVal={`${h.graveY}px`} min={-220} max={220} step={2} value={h.graveY} onChange={(v) => updateGongueHandConfig({ graveY: v }, 'grave_impact')} />
        </div>
        <LabSlider label="Main Grave — Grossissement" displayVal={h.graveScale.toFixed(2)} min={0.4} max={2.2} step={0.02} value={h.graveScale} onChange={(v) => updateGongueHandConfig({ graveScale: v }, 'grave_impact')} />
        <div className="grid grid-cols-2 gap-2">
          <LabSlider label="Main Aigu X" displayVal={`${h.aiguX}px`} min={-50} max={360} step={2} value={h.aiguX} onChange={(v) => updateGongueHandConfig({ aiguX: v }, 'aigu_impact')} />
          <LabSlider label="Main Aigu Y" displayVal={`${h.aiguY}px`} min={-220} max={220} step={2} value={h.aiguY} onChange={(v) => updateGongueHandConfig({ aiguY: v }, 'aigu_impact')} />
        </div>
        <LabSlider label="Main Aigu — Grossissement" displayVal={h.aiguScale.toFixed(2)} min={0.4} max={2.2} step={0.02} value={h.aiguScale} onChange={(v) => updateGongueHandConfig({ aiguScale: v }, 'aigu_impact')} />
        <div className="grid grid-cols-2 gap-2">
          <LabSlider label="Élan Main Levée Y" displayVal={`${h.windUpLiftY}px`} min={-60} max={80} step={1} value={h.windUpLiftY} onChange={(v) => updateGongueHandConfig({ windUpLiftY: v }, 'grave_windup')} />
          <LabSlider label="Élan Main Scale" displayVal={h.windUpScaleMult.toFixed(2)} min={0.8} max={1.8} step={0.02} value={h.windUpScaleMult} onChange={(v) => updateGongueHandConfig({ windUpScaleMult: v }, 'grave_windup')} />
        </div>
        <LabSlider label="Épaisseur base Main" displayVal={`${h.baseWidth}px`} min={10} max={70} step={1} value={h.baseWidth} onChange={(v) => updateGongueHandConfig({ baseWidth: v })} />
      </div>
    );
  }

  if (activeTab === 'grave') {
    return (
      <div className="space-y-1.5 pt-0.5">
        <div className="grid grid-cols-2 gap-2">
          <LabSlider label="Bout Grave X" displayVal={`${t.graveX}px`} min={-220} max={220} step={2} value={t.graveX} onChange={(v) => updateGongueTipConfig({ graveX: v }, 'grave_impact')} />
          <LabSlider label="Bout Grave Y (Haut)" displayVal={`${t.graveY}px`} min={-320} max={60} step={2} value={t.graveY} onChange={(v) => updateGongueTipConfig({ graveY: v }, 'grave_impact')} />
        </div>
        <LabSlider label="Hauteur levée à l'élan" displayVal={`${t.graveWindUpLiftY}px`} min={-120} max={140} step={2} value={t.graveWindUpLiftY} onChange={(v) => updateGongueTipConfig({ graveWindUpLiftY: v }, 'grave_windup')} />
        <div className="grid grid-cols-2 gap-2">
          <LabSlider label="Grossissement Élan" displayVal={t.graveWindUpScale.toFixed(2)} min={0.5} max={2.8} step={0.02} value={t.graveWindUpScale} onChange={(v) => updateGongueTipConfig({ graveWindUpScale: v }, 'grave_windup')} />
          <LabSlider label="Grossissement Impact" displayVal={t.graveImpactScale.toFixed(2)} min={0.3} max={1.8} step={0.02} value={t.graveImpactScale} onChange={(v) => updateGongueTipConfig({ graveImpactScale: v }, 'grave_impact')} />
        </div>
        <LabSlider label="Largeur base Bout plat" displayVal={`${t.baseWidth}px`} min={8} max={70} step={1} value={t.baseWidth} onChange={(v) => updateGongueTipConfig({ baseWidth: v })} />
      </div>
    );
  }

  if (activeTab === 'aigu') {
    return (
      <div className="space-y-1.5 pt-0.5">
        <div className="grid grid-cols-2 gap-2">
          <LabSlider label="Bout Aigu X" displayVal={`${t.aiguX}px`} min={-220} max={220} step={2} value={t.aiguX} onChange={(v) => updateGongueTipConfig({ aiguX: v }, 'aigu_impact')} />
          <LabSlider label="Bout Aigu Y (Bas)" displayVal={`${t.aiguY}px`} min={-60} max={320} step={2} value={t.aiguY} onChange={(v) => updateGongueTipConfig({ aiguY: v }, 'aigu_impact')} />
        </div>
        <LabSlider label="Hauteur levée à l'élan" displayVal={`${t.aiguWindUpLiftY}px`} min={-120} max={140} step={2} value={t.aiguWindUpLiftY} onChange={(v) => updateGongueTipConfig({ aiguWindUpLiftY: v }, 'aigu_windup')} />
        <div className="grid grid-cols-2 gap-2">
          <LabSlider label="Grossissement Élan" displayVal={t.aiguWindUpScale.toFixed(2)} min={0.5} max={2.8} step={0.02} value={t.aiguWindUpScale} onChange={(v) => updateGongueTipConfig({ aiguWindUpScale: v }, 'aigu_windup')} />
          <LabSlider label="Grossissement Impact" displayVal={t.aiguImpactScale.toFixed(2)} min={0.3} max={1.8} step={0.02} value={t.aiguImpactScale} onChange={(v) => updateGongueTipConfig({ aiguImpactScale: v }, 'aigu_impact')} />
        </div>
        <LabSlider label="Ratio Coups Faibles (g/a)" displayVal={`${Math.round(cfg.weakStrokeRatio * 100)}%`} min={0.1} max={1.0} step={0.04} value={cfg.weakStrokeRatio} onChange={(v) => updateGongueStickConfig({ weakStrokeRatio: v })} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pt-0.5 max-h-[250px] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Durée frappe (ms)" displayVal={`${cfg.strikeDurationMs}ms`} min={25} max={350} step={5} value={cfg.strikeDurationMs} onChange={(v) => updateGongueStickConfig({ strikeDurationMs: v })} />
        <LabSlider label="Vitesse retour" displayVal={`${cfg.returnSpeedMult.toFixed(2)}x`} min={0.25} max={2.5} step={0.05} value={cfg.returnSpeedMult} onChange={(v) => updateGongueStickConfig({ returnSpeedMult: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Maintien bas (→g/a)" displayVal={`${Math.round(cfg.stayLowBeforeWeakRatio * 100)}%`} min={0.05} max={0.8} step={0.02} value={cfg.stayLowBeforeWeakRatio} onChange={(v) => updateGongueStickConfig({ stayLowBeforeWeakRatio: v })} />
        <LabSlider label="Armé haut (→G/A)" displayVal={`${Math.round(cfg.liftHighBeforeStrongMult * 100)}%`} min={0.8} max={2.0} step={0.05} value={cfg.liftHighBeforeStrongMult} onChange={(v) => updateGongueStickConfig({ liftHighBeforeStrongMult: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Flanc (X) — Déport X" displayVal={`${cfg.flancOffsetX}px`} min={-160} max={200} step={2} value={cfg.flancOffsetX} onChange={(v) => updateGongueStickConfig({ flancOffsetX: v })} />
        <LabSlider label="Flanc (X) — Déport Y" displayVal={`${cfg.flancOffsetY}px`} min={-260} max={220} step={2} value={cfg.flancOffsetY} onChange={(v) => updateGongueStickConfig({ flancOffsetY: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LabSlider label="Écrasement métal" displayVal={`${cfg.metalCrushMs}ms`} min={0} max={200} step={4} value={cfg.metalCrushMs} onChange={(v) => updateGongueStickConfig({ metalCrushMs: v })} />
        <LabSlider label="Rebond métal" displayVal={`${Math.round(cfg.reboundRatio * 100)}%`} min={0} max={0.6} step={0.02} value={cfg.reboundRatio} onChange={(v) => updateGongueStickConfig({ reboundRatio: v })} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <LabSlider label="Tranche bout" displayVal={`${cfg.flatBevelPx}px`} min={0} max={14} step={1} value={cfg.flatBevelPx} onChange={(v) => updateGongueStickConfig({ flatBevelPx: v })} />
        <LabSlider label="Prof. ombre" displayVal={`${cfg.shadowDepthPx}px`} min={0} max={120} step={2} value={cfg.shadowDepthPx} onChange={(v) => updateGongueStickConfig({ shadowDepthPx: v })} />
        <LabSlider label="Opac. ombre" displayVal={`${Math.round(cfg.shadowOpacity * 100)}%`} min={0} max={0.95} step={0.05} value={cfg.shadowOpacity} onChange={(v) => updateGongueStickConfig({ shadowOpacity: v })} />
      </div>
    </div>
  );
};
