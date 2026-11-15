/**
 * LutherieGongueAlignBar.tsx — Barre Cordel « Aligner sur le Gonguê du groupe (Afinador) » (< 120 lignes).
 * Lit le profil Firestore `/associations/{id}.afinador` (si groupId actif) ou le repli local `414.5 Hz` (Sol#4).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Cloud } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  AfinadorGroupTuningProfile, computeGongueAlignedTunings, DEFAULT_GONGUE_STUDIO_HZ,
  fetchGroupAfinadorCloudProfile, GongueAlignColor, GONGUE_CHROMATIC_OPTIONS,
  loadLocalAfinadorProfile, saveLocalAfinadorProfile,
} from '../../utils/audio/afinadorGroupAligner';
import { getDrumPitchNoteInfo } from '../../utils/audio/drumPitchToNote';
import { LutherieDrumRole } from '../../utils/audio/lutheriePresetsStorage';

export interface LutherieGongueAlignBarProps {
  lang: string;
  currentTunings: Record<LutherieDrumRole, number>;
  onApplyTunings: (tunings: Record<LutherieDrumRole, number>) => void;
}

const ALIGNED_ROLES: LutherieDrumRole[] = ['marcante', 'meiao', 'repique', 'gongue'];

export const LutherieGongueAlignBar: React.FC<LutherieGongueAlignBarProps> = React.memo(({
  lang, currentTunings, onApplyTunings,
}) => {
  const isFr = lang === 'fr';
  const { userProfile } = useAuth();
  const groupId = userProfile?.groupId || null;

  const [localInit] = useState(() => loadLocalAfinadorProfile());
  const [cloudProfile, setCloudProfile] = useState<AfinadorGroupTuningProfile | null>(null);
  const [targetHz, setTargetHz] = useState<number>(localInit.gongueHz ?? DEFAULT_GONGUE_STUDIO_HZ);
  const [color, setColor] = useState<GongueAlignColor>(localInit.mode ?? 'major');

  useEffect(() => {
    let mounted = true;
    if (!groupId) { setCloudProfile(null); return; }
    fetchGroupAfinadorCloudProfile(groupId).then((prof) => {
      if (!mounted || !prof) return;
      setCloudProfile(prof);
      if (typeof prof.gongueHz === 'number' && prof.gongueHz > 20) setTargetHz(prof.gongueHz);
      setColor(prof.drumsHz ? 'exact' : (prof.mode === 'minor' ? 'minor' : 'major'));
    });
    return () => { mounted = false; };
  }, [groupId]);

  const alignment = useMemo(() => computeGongueAlignedTunings(targetHz, color, cloudProfile?.drumsHz), [targetHz, color, cloudProfile]);
  const gongueNote = getDrumPitchNoteInfo('gongue', alignment.tunings.gongue, lang);
  const triadNotes = (['marcante', 'meiao', 'repique'] as const).map((r) => getDrumPitchNoteInfo(r, alignment.tunings[r], lang).noteLabel).join(' • ');
  const isAligned = ALIGNED_ROLES.every((r) => Math.abs((currentTunings[r] ?? 0) - alignment.tunings[r]) <= 0.05);
  const nearestOpt = GONGUE_CHROMATIC_OPTIONS.reduce((best, o) => (Math.abs(o.hz - targetHz) < Math.abs(best.hz - targetHz) ? o : best), GONGUE_CHROMATIC_OPTIONS[6]);

  const handleSelectHz = (hz: number) => { setTargetHz(hz); saveLocalAfinadorProfile({ gongueHz: hz }); };
  const handleSelectColor = (next: GongueAlignColor) => {
    setColor(next);
    if (next === 'major' || next === 'minor') saveLocalAfinadorProfile({ mode: next });
  };

  const modeBtnCls = (active: boolean) =>
    `px-2 py-1 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] cursor-pointer transition-colors ${
      active ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
    }`;

  return (
    <div data-testid="lutherie-gongue-align-bar" className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)] p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shadow-[3px_3px_0px_var(--cordel-shadow-color)] select-none">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-cactus font-bold uppercase text-[10px] md:text-xs text-[var(--cordel-text)] flex items-center gap-1.5 shrink-0">
          <Bell size={13} className="text-[var(--cordel-accent-readable)]" />
          <span>{isFr ? 'Gonguê du groupe :' : 'Gonguê do grupo :'}</span>
        </span>

        {cloudProfile ? (
          <span data-testid="afinador-cloud-badge" className="px-2 py-0.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1">
            <Cloud size={11} /><span>Afinador Cloud • {gongueNote.noteLabel} ({alignment.effectiveGongueHz} Hz)</span>
          </span>
        ) : (
          <select
            aria-label={isFr ? 'Note du Gonguê du groupe' : 'Nota do Gonguê do grupo'}
            data-testid="lutherie-gongue-note-select"
            value={nearestOpt.hz}
            onChange={(e) => handleSelectHz(Number(e.target.value))}
            className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] font-mono font-bold text-[10px] cursor-pointer outline-none"
          >
            {GONGUE_CHROMATIC_OPTIONS.map((opt) => (
              <option key={opt.midi} value={opt.hz}>{`${isFr ? opt.labelFr : opt.labelPt} (${opt.intl}) • ${opt.hz} Hz`}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => handleSelectColor('major')} className={modeBtnCls(color === 'major')}>{isFr ? 'Majeur' : 'Maior'}</button>
          <button type="button" onClick={() => handleSelectColor('minor')} className={modeBtnCls(color === 'minor')}>{isFr ? 'Mineur' : 'Menor'}</button>
          {cloudProfile?.drumsHz && (
            <button type="button" onClick={() => handleSelectColor('exact')} className={modeBtnCls(color === 'exact')}>Afinador</button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-1 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-mono font-bold text-[10px]">
          {`${isFr ? alignment.keyLabelFr : alignment.keyLabelPt} : ${triadNotes} + ${gongueNote.noteLabel}`}
        </span>
        <button
          type="button" data-testid="lutherie-align-gongue-btn" onClick={() => onApplyTunings(alignment.tunings)}
          className={`px-3 py-1.5 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] md:text-xs flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] transition-colors ${
            isAligned ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'
          }`}
        >
          {isAligned ? <Check size={13} /> : <Bell size={13} />}
          <span>{isFr ? 'Aligner sur le Gonguê du groupe' : 'Alinhar no Gonguê do grupo'}</span>
        </button>
      </div>
    </div>
  );
});

LutherieGongueAlignBar.displayName = 'LutherieGongueAlignBar';
