import React, { useState } from 'react';
import { Check, Copy, RotateCcw } from 'lucide-react';
import {
  AoVivoMobileFamily,
  InstrumentMobileOffset,
  MOBILE_OFFSETS,
  resetMobileOffsets,
  updateMobileOffset,
} from '../../audio/animations/aoVivoMobileOffsets';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';

const MOBILE_FAMILIES: { id: AoVivoMobileFamily; label: string }[] = [
  { id: 'alfaia', label: 'Alfaia' },
  { id: 'caixa', label: 'Caixa' },
  { id: 'tarol', label: 'Tarol' },
  { id: 'gongue', label: 'Gonguê' },
  { id: 'timbal', label: 'Timbal' },
  { id: 'agbe', label: 'Agbê' },
  { id: 'mineiro', label: 'Mineiro' },
];

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

export const AoVivoMobilePositionSliders: React.FC<{
  activeMobFam: AoVivoMobileFamily;
  onSelectMobFam: (fam: AoVivoMobileFamily) => void;
}> = ({ activeMobFam, onSelectMobFam }) => {
  const [copiedMob, setCopiedMob] = useState(false);
  const cfg = MOBILE_OFFSETS[activeMobFam];

  const handleSelectInstrument = (fam: AoVivoMobileFamily) => {
    onSelectMobFam(fam);
    const st = useSequencerStore.getState();
    const match = (st.tracks || []).find((t: any) => {
      const id = instrumentsConfig[t.instrumentIdx]?.id;
      if (fam === 'alfaia') return id === 'marcante' || id === 'meiao' || id === 'repique';
      return id === fam;
    });
    if (match) {
      st.setActiveAoVivoTrackId(match.id);
      if (st.setFocusTrackId) st.setFocusTrackId(match.id);
    }
  };

  const upd = (patch: Partial<InstrumentMobileOffset>) => updateMobileOffset(activeMobFam, patch);

  const handleCopyMobileJson = () => {
    navigator.clipboard?.writeText(JSON.stringify(MOBILE_OFFSETS, null, 2)).catch(() => {});
    setCopiedMob(true);
    setTimeout(() => setCopiedMob(false), 1800);
  };

  return (
    <div className="space-y-1.5 pt-0.5 pr-0.5">
      <div className="grid grid-cols-7 gap-0.5">
        {MOBILE_FAMILIES.map((f) => (
          <button
            key={f.id} type="button" onClick={() => handleSelectInstrument(f.id)}
            className="py-0.5 px-0.5 border rounded text-[8.5px] font-bold truncate cursor-pointer"
            style={{
              borderColor: 'var(--cordel-border)',
              backgroundColor: activeMobFam === f.id ? 'var(--cordel-wood)' : 'var(--cordel-surface)',
              color: activeMobFam === f.id ? 'var(--cordel-parchment-bg)' : 'var(--cordel-text)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <S label="Hauteur Y Mobile" val={`${cfg.offsetY > 0 ? '+' : ''}${cfg.offsetY}px`} min={-350} max={350} step={2} v={cfg.offsetY} cb={(n) => upd({ offsetY: n })} />
        <S label="Centrage X Mobile" val={`${cfg.offsetX > 0 ? '+' : ''}${cfg.offsetX}px`} min={-200} max={200} step={2} v={cfg.offsetX} cb={(n) => upd({ offsetX: n })} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <S label="Taille Mobile" val={`${Math.round(cfg.scaleMult * 100)}%`} min={0.4} max={1.8} step={0.02} v={cfg.scaleMult} cb={(n) => upd({ scaleMult: n })} />
        <S label="Écartement G/D" val={`${cfg.spreadDeltaPx > 0 ? '+' : ''}${cfg.spreadDeltaPx}px`} min={-120} max={120} step={2} v={cfg.spreadDeltaPx} cb={(n) => upd({ spreadDeltaPx: n })} />
        <S label="Portée Y Peau" val={`${cfg.reachDeltaY > 0 ? '+' : ''}${cfg.reachDeltaY}px`} min={-200} max={200} step={2} v={cfg.reachDeltaY} cb={(n) => upd({ reachDeltaY: n })} />
      </div>
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <button
          type="button" onClick={() => resetMobileOffsets(activeMobFam)}
          className="flex items-center gap-1 px-2 py-0.5 border rounded text-[9.5px] font-bold cursor-pointer"
          style={{ borderColor: 'var(--cordel-border)', backgroundColor: 'var(--cordel-surface)', color: 'var(--cordel-text)' }}
        >
          <RotateCcw className="w-3 h-3" /><span>Reset ({activeMobFam})</span>
        </button>
        <button
          type="button" onClick={handleCopyMobileJson}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-0.5 border rounded text-[9.5px] font-bold cursor-pointer"
          style={{ borderColor: 'var(--cordel-border)', backgroundColor: 'var(--cordel-accent)', color: 'var(--cordel-parchment-bg)' }}
        >
          {copiedMob ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span>{copiedMob ? 'JSON Mobile Copié !' : 'Copier JSON Mobile (Tous)'}</span>
        </button>
      </div>
    </div>
  );
};

