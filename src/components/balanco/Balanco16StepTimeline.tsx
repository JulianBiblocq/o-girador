import React, { useMemo } from 'react';
import { Lock } from 'lucide-react';
import { GlobalSwing, Language, Pattern, TrackGroup } from '../../types';
import { computeStepBalancoPercent, getBalancoOffsetSec } from '../../utils/balancoUtils';

interface Balanco16StepTimelineProps {
  lang: Language;
  bpm: number;
  globalSwing: GlobalSwing;
  track: TrackGroup | null;
  pattern: Pattern | null;
  scopeTitle: string;
}

interface ComputedTimelineStep {
  stepIdx: number;
  beatIdx: number;
  subIdx: number;
  label: string;
  isLocked: boolean;
  percent: number;
  offsetMs: number;
  translatePx: number;
}

const formatSignedPct = (pct: number): string => {
  const rounded = Math.round(pct);
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
};

const formatSignedMs = (ms: number): string => {
  if (Math.abs(ms) < 0.05) return '0.0 ms';
  return ms > 0 ? `+${ms.toFixed(1)} ms` : `${ms.toFixed(1)} ms`;
};

export const Balanco16StepTimeline: React.FC<Balanco16StepTimelineProps> = ({
  lang, bpm, globalSwing, track, pattern, scopeTitle,
}) => {
  const isFr = lang === 'fr';
  const safeBpm = bpm > 0 ? bpm : 100;
  const sixteenthDurationMs = (60 / safeBpm / 4) * 1000;

  const stepsData = useMemo<ComputedTimelineStep[]>(() => {
    const beatResolutions = pattern && pattern.steps === 16 ? pattern.beatResolutions : undefined;
    return Array.from({ length: 16 }, (_, stepIdx) => {
      const beatIdx = Math.floor(stepIdx / 4);
      const subIdx = stepIdx % 4;
      const isLocked = stepIdx === 0;
      const rawPct = computeStepBalancoPercent({ stepIdx, steps: 16, beatResolutions, track, pattern, globalSwing });
      const percent = isLocked ? 0 : rawPct;
      const offsetMs = getBalancoOffsetSec({
        stepIdx, steps: 16, beatResolutions, track, pattern, globalSwing, bpm: safeBpm, isPreRoll: false, ignoreLiveMorph: true,
      }) * 1000;
      const translatePx = Math.max(-16, Math.min(16, (percent / 100) * 16));
      return { stepIdx, beatIdx, subIdx, label: `${beatIdx + 1}.${subIdx + 1}`, isLocked, percent, offsetMs, translatePx };
    });
  }, [safeBpm, globalSwing, track, pattern]);

  return (
    <div
      data-testid="balanco-16step-timeline"
      className="flex flex-col gap-3 p-3.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] rounded-sm shadow-[3px_3px_0px_var(--cordel-shadow-color)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cordel-border)] pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-cactus font-bold text-sm uppercase text-[var(--cordel-text)]">
            {isFr ? 'Règle Temporelle Studio — 16 Pas' : 'Régua Temporal Studio — 16 Passos'}
          </h4>
          <span className="text-[11px] font-bold text-[var(--cordel-accent-readable)]">• {scopeTitle}</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-[var(--cordel-text-muted)]">
          @ {safeBpm} BPM (1/16 = {sixteenthDurationMs.toFixed(1)} ms)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {[0, 1, 2, 3].map((beatIdx) => {
          const beatSteps = stepsData.slice(beatIdx * 4, beatIdx * 4 + 4);
          const beatBg = beatIdx % 2 === 0 ? 'bg-[var(--cordel-beat-odd)]' : 'bg-[var(--cordel-beat-even)]';
          return (
            <div key={beatIdx} className={`flex flex-col gap-2 p-2 border border-[var(--cordel-border)] rounded-sm ${beatBg}`}>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[var(--cordel-text-muted)]">
                <span>{isFr ? `Temps ${beatIdx + 1}` : `Tempo ${beatIdx + 1}`}</span>
                {beatIdx === 0 && (
                  <span className="text-[9px] text-[var(--cordel-accent-readable)] flex items-center gap-1">
                    <Lock size={9} className="shrink-0" /> T1.1 = 0.0 ms
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {beatSteps.map((st) => {
                  const markerTone = st.isLocked
                    ? 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-accent-readable)] border-[var(--cordel-border-strong)]'
                    : st.percent > 0.2
                    ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
                    : st.percent < -0.2
                    ? 'bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]'
                    : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text-muted)] border-[var(--cordel-border)]';
                  return (
                    <div key={st.stepIdx} className="flex flex-col items-center gap-1 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-[var(--cordel-text)] flex items-center gap-0.5">
                        {st.isLocked && <Lock size={10} className="text-[var(--cordel-accent-readable)] shrink-0" />}
                        <span>{st.label}</span>
                      </span>
                      <div className="relative w-full h-8 flex items-center justify-center bg-[var(--cordel-surface-muted)] border border-[var(--cordel-border)] rounded-xs overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-1/2 w-0 border-l border-dashed border-[var(--cordel-border)] -translate-x-1/2" />
                        <div
                          className={`z-10 w-5 h-5 rounded-xs border flex items-center justify-center text-[9px] font-mono font-bold transition-transform duration-100 will-change-transform ${markerTone}`}
                          style={{ transform: `translateX(${st.translatePx}px)` }}
                        >
                          {st.isLocked ? <Lock size={10} /> : st.subIdx + 1}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-[var(--cordel-text)] leading-none">{formatSignedPct(st.percent)}</span>
                      <span className="font-mono text-[9px] font-semibold text-[var(--cordel-accent-readable)] leading-none whitespace-nowrap">{formatSignedMs(st.offsetMs)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
