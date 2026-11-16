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
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [card.imageSrc]);

  const title = isFr ? card.titleFr : card.titlePt;
  const goal = isFr ? card.goalFr : card.goalPt;
  const context = isFr ? card.contextFr : card.contextPt;
  const steps = isFr ? card.stepsFr : card.stepsPt;
  const tip = isFr ? card.tipFr : card.tipPt;
  const levelLabel = card.level === 'practice' ? (isFr ? 'Pratique' : 'Prática') : (isFr ? 'Studio' : 'Estúdio');
  const showImage = Boolean(card.imageSrc && card.imageSrc.trim()) && !imgFailed;

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

        {showImage && (
          <div className="relative aspect-video w-full bg-[var(--cordel-surface-muted)] border-b-2 border-[var(--cordel-border)] overflow-hidden">
            <img
              src={card.imageSrc}
              alt={title}
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover block"
            />
          </div>
        )}

        <div className="p-4 flex flex-col gap-3">
          <h3 className="font-cactus font-bold text-sm sm:text-base text-[var(--cordel-text)] leading-snug">
            {title}
          </h3>

          <div className="p-2.5 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] border-l-[3px] border-l-[var(--cordel-accent)] flex flex-col gap-1">
            <p className="text-xs font-bold text-[var(--cordel-accent-readable)] leading-snug">
              {goal}
            </p>
            <p className="text-[11.5px] text-[var(--cordel-text-muted)] leading-relaxed">
              {context}
            </p>
          </div>

          <ol className="flex flex-col gap-2 mt-0.5">
            {steps.map((st, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--cordel-text)] leading-relaxed">
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
        <p className="text-[11px] text-[var(--cordel-text-muted)] leading-snug">
          <strong className="font-cactus uppercase text-[10px] text-[var(--cordel-accent-readable)] mr-1">
            {isFr ? 'Conseil du Mestre :' : 'Conselho do Mestre :'}
          </strong>
          {tip}
        </p>
      </div>
    </article>
  );
};
