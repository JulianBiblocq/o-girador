/**
 * MasterPanRadarStrip.tsx — Radar panoramique Master (`h-5`, Maîtres ◆, Esclaves liés & G/C/D FR vs E/C/D BR) (< 138 lignes).
 * Sélecteur Zustand 100 % primitif (`string`) : zéro allocation d'objet/tableau dans `getSnapshot`.
 */
import React, { useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import { isSectionEnsembleEligible } from '../../../constants/sectionEnsembleLimits';
import { instrumentsConfig } from '../../../data';
import { getEffectiveMuteState, useSequencerStore } from '../../../stores/useSequencerStore';
import type { TrackGroup } from '../../../types';
import { getLeftPanPrefix } from '../../controls/panKnobMath';
import { GlobalStagePlaceModal } from '../spatial/GlobalStagePlaceModal';

interface MasterPanRadarStripProps {
  lang: string;
  onOpenSaveTemplate: () => void;
}

export function serializeMasterRadarTicks(tracks: TrackGroup[]): string {
  const parts: string[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (!t || t.isBusFolder || t.isLinkFolder || t.isHidden || t.id === 999901) continue;
    if (getEffectiveMuteState(tracks, t.id)) continue;
    const inst = instrumentsConfig[t.instrumentIdx];
    const trackPan = Math.max(-100, Math.min(100, Math.round(t.panVal ?? t.pan ?? 0)));
    const hasLinkedSlaves = Boolean(t.isLinkMaster) || tracks.some((s) => s && !s.isHidden && String(s.linkedToTrackId || '') === String(t.id));
    const masterTrack = t.linkedToTrackId ? tracks.find((m) => String(m.id) === String(t.linkedToTrackId)) : undefined;
    const anchorPan = masterTrack ? Math.max(-100, Math.min(100, Math.round(masterTrack.panVal ?? masterTrack.pan ?? 0))) : trackPan;

    if (t.sectionPlayers && t.sectionPlayers.length > 1 && isSectionEnsembleEligible(inst?.id, inst?.type)) {
      for (let idx = 0; idx < t.sectionPlayers.length; idx++) {
        const p = t.sectionPlayers[idx];
        const own = typeof p.panVal === 'number' && Number.isFinite(p.panVal) ? p.panVal : Math.round((p.x - 50) * 2);
        const eff = Math.max(-100, Math.min(100, own + trackPan));
        const role = idx === 0 ? (hasLinkedSlaves ? 'L' : masterTrack ? 'S' : 'M') : 'P';
        parts.push(`${t.id}_${idx}:${eff}:${role}:${idx === 0 ? anchorPan : eff}`);
      }
    } else {
      const role = hasLinkedSlaves ? 'L' : masterTrack ? 'S' : 'M';
      parts.push(`${t.id}:${trackPan}:${role}:${anchorPan}`);
    }
  }
  return parts.join('|');
}

const selectRadarTicksKey = (s: { tracks: TrackGroup[] }): string => serializeMasterRadarTicks(s.tracks);

export const MasterPanRadarStrip: React.FC<MasterPanRadarStripProps> = ({ lang, onOpenSaveTemplate }) => {
  const [isPlaceOpen, setIsPlaceOpen] = useState(false);
  const radarKey = useSequencerStore(selectRadarTicksKey);
  const isFr = lang === 'fr';
  const leftPfx = getLeftPanPrefix(lang);

  const radarTicks = useMemo(() => {
    if (!radarKey) return [];
    return radarKey.split('|').map((entry) => {
      const [key, panStr, role = 'M', anchorStr] = entry.split(':');
      const panPct = Number(panStr) || 0;
      return { key, panPct, role, anchorPct: anchorStr !== undefined ? Number(anchorStr) || 0 : panPct };
    });
  }, [radarKey]);

  return (
    <div className="mt-2 pt-1.5 border-t border-[var(--cordel-border)]/45 flex flex-col gap-1.5 shrink-0">
      <div
        data-testid="master-pan-radar-strip"
        onClick={() => setIsPlaceOpen(true)}
        title={isFr ? 'Ouvrir La Place (Scène 140° bidirectionnelle)' : 'Abrir A Praça (Palco 140° bidirecional)'}
        className="w-full px-1.5 py-1 border border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-col gap-0.5 cursor-pointer hover:border-[var(--cordel-wood)] transition-colors"
      >
        <div className="flex justify-between text-[7px] font-mono font-bold opacity-75 leading-none tracking-tight">
          <span>{leftPfx}100</span>
          <span>{leftPfx}50</span>
          <span className="font-black text-[var(--cordel-wood)]">C</span>
          <span>D50</span>
          <span>D100</span>
        </div>
        <div className="relative w-full h-5 bg-[var(--cordel-bg)] border border-[var(--cordel-border)]/65 overflow-hidden">
          <div className="absolute left-1/4 top-0 bottom-0 w-px bg-[var(--cordel-border)]/20" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--cordel-border)]/50" />
          <div className="absolute left-3/4 top-0 bottom-0 w-px bg-[var(--cordel-border)]/20" />
          {radarTicks.map((tk) => {
            const leftPct = 50 + tk.panPct * 0.47;
            const ancPct = 50 + tk.anchorPct * 0.47;
            const spanLeft = Math.min(leftPct, ancPct);
            const spanW = Math.abs(leftPct - ancPct);
            return (
              <React.Fragment key={tk.key}>
                {tk.role === 'S' && spanW > 1 && (
                  <div
                    style={{ left: `${spanLeft}%`, width: `${spanW}%` }}
                    className="absolute top-1/2 -translate-y-1/2 h-px border-t border-dashed border-[var(--cordel-wood)]/70 pointer-events-none"
                  />
                )}
                <div
                  style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
                  className={`absolute ${
                    tk.role === 'L'
                      ? 'top-0.5 bottom-0.5 w-[2.5px] bg-[var(--cordel-wood)]'
                      : tk.role === 'M'
                        ? 'top-1 bottom-1 w-[2px] bg-[var(--cordel-wood)] opacity-90'
                        : tk.role === 'S'
                          ? 'top-1.5 bottom-1 w-[2px] bg-[var(--cordel-text)] opacity-85'
                          : 'top-1.5 bottom-1.5 w-px bg-[var(--cordel-text)] opacity-55'
                  }`}
                >
                  {tk.role === 'L' && <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 bg-[var(--cordel-wood)]" />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <button
        type="button" data-testid="open-global-la-place-btn" onClick={() => setIsPlaceOpen(true)}
        className="w-full min-h-[34px] py-1.5 px-2.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:brightness-110 border-2 border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] rounded-[2px] font-cactus font-extrabold text-[11px] tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <Compass className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{isFr ? 'La Place (140°)' : 'A Praça (140°)'}</span>
      </button>

      <button
        type="button" onClick={onOpenSaveTemplate}
        className="w-full min-h-[34px] py-1.5 px-2.5 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] border-2 border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] rounded-[2px] font-cactus font-extrabold text-[10.5px] tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        title={isFr ? 'Sauvegarder la disposition actuelle comme gabarit par défaut' : 'Salvar o layout atual como modelo padrão'}
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
        <span className="truncate">{isFr ? 'Gabarit du Baque' : 'Modelo do Baque'}</span>
      </button>

      {isPlaceOpen && <GlobalStagePlaceModal onClose={() => setIsPlaceOpen(false)} />}
    </div>
  );
};
