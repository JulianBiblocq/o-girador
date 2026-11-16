import React, { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import { GuideActionCard } from '../../data/guide/guideTypes';

interface GuideActionCardViewProps {
  card: GuideActionCard;
  isFr: boolean;
  isHighlighted?: boolean;
}

export const GuideActionCardView: React.FC<GuideActionCardViewProps> = ({
  card,
  isFr,
  isHighlighted = false,
}) => {
  const [imgState, setImgState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    setImgState('loading');
  }, [card.screenshotWebp]);

  const title = isFr ? card.titleFr : card.titlePt;
  const goal = isFr ? card.goalFr : card.goalPt;
  const steps = isFr ? card.stepsFr : card.stepsPt;
  const tip = isFr ? card.tipFr : card.tipPt;
  const levelLabel = card.level === 'practice' ? (isFr ? 'Pratique' : 'Prática') : (isFr ? 'Studio' : 'Estúdio');

  return (
    <article
      id={`guide-card-${card.id}`}
      className={`border-2 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col justify-between overflow-hidden transition-colors ${
        isHighlighted ? 'border-[var(--cordel-accent-readable)] ring-2 ring-[var(--cordel-accent-readable)]' : 'border-[var(--cordel-border-strong)]'
      }`}
    >
      <div>
        <div className="px-3.5 py-2 bg-[var(--cordel-surface-elevated)] border-b-2 border-[var(--cordel-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold text-[10px] uppercase px-1.5 py-0.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] shrink-0">
              {card.id.toUpperCase()}
            </span>
            <span className="font-cactus font-bold text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text-muted)] shrink-0">
              {levelLabel}
            </span>
          </div>
          {card.shortcut && (
            <kbd className="font-mono font-bold text-[10px] px-1.5 py-0.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border-strong)] shadow-[1px_1px_0px_var(--cordel-shadow-color)] shrink-0">
              {card.shortcut}
            </kbd>
          )}
        </div>

        <div className="relative aspect-video w-full bg-[var(--cordel-surface-muted)] border-b-2 border-[var(--cordel-border)] overflow-hidden flex items-center justify-center">
          {imgState !== 'missing' && (
            <img
              src={card.screenshotWebp}
              alt={title}
              loading="lazy"
              onLoad={() => setImgState('ready')}
              onError={() => setImgState('missing')}
              className={`w-full h-full object-cover transition-opacity duration-200 ${imgState === 'ready' ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
            />
          )}
          {imgState !== 'ready' && (
            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-[var(--cordel-text-muted)] select-none">
              <svg viewBox="0 0 120 68" className="w-28 h-16 stroke-current fill-none opacity-65" strokeWidth="1.6">
                <rect x="3" y="3" width="114" height="62" rx="2" strokeDasharray="4 3" />
                <circle cx="38" cy="34" r="20" />
                <circle cx="38" cy="34" r="11" strokeDasharray="2 2" />
                <circle cx="38" cy="34" r="3" fill="currentColor" />
                <line x1="68" y1="20" x2="106" y2="20" />
                <line x1="68" y1="34" x2="102" y2="34" />
                <line x1="68" y1="48" x2="96" y2="48" />
              </svg>
              <span className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                {card.screenshotWebp.replace('/guide/', '')}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-2.5">
          <h3 className="font-cactus font-bold text-sm sm:text-base text-[var(--cordel-text)] leading-snug">
            {title}
          </h3>
          <p className="text-xs font-semibold text-[var(--cordel-accent-readable)] leading-snug">
            {goal}
          </p>
          <ol className="flex flex-col gap-1.5 mt-0.5">
            {steps.map((st, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-[var(--cordel-text)] leading-relaxed">
                <span className="w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center font-mono font-bold text-[10px] bg-[var(--cordel-bg)] border border-[var(--cordel-border-strong)] text-[var(--cordel-accent-readable)]">
                  {idx + 1}
                </span>
                <span>{st}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mx-4 mb-4 p-2.5 bg-[var(--cordel-bg)] border-l-4 border-l-[var(--cordel-wood)] border border-[var(--cordel-border)] flex items-start gap-2">
        <Lightbulb size={14} className="shrink-0 mt-0.5 text-[var(--cordel-accent-readable)]" />
        <p className="text-[11px] text-[var(--cordel-text-muted)] leading-snug">{tip}</p>
      </div>
    </article>
  );
};
