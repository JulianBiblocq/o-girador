import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { MasterMonoCheckButton } from './MasterMonoCheckButton';
import { STUDIO_VU_GRADIENT_VERTICAL } from '../controls/vuMeterMath';

interface MasterCollapsedStripProps {
  lang: string;
  isMasterMono: boolean;
  onToggleMono: () => void;
  onExpand: () => void;
  vuMeterLeftRef: React.RefObject<HTMLDivElement | null>;
  vuMeterRightRef: React.RefObject<HTMLDivElement | null>;
  peakLeftRef: React.RefObject<HTMLDivElement | null>;
  peakRightRef: React.RefObject<HTMLDivElement | null>;
  clipLeftRef: React.RefObject<HTMLDivElement | null>;
  clipRightRef: React.RefObject<HTMLDivElement | null>;
  onClearClip: () => void;
}

export const MasterCollapsedStrip: React.FC<MasterCollapsedStripProps> = ({
  lang,
  isMasterMono,
  onToggleMono,
  onExpand,
  vuMeterLeftRef,
  vuMeterRightRef,
  peakLeftRef,
  peakRightRef,
  clipLeftRef,
  clipRightRef,
  onClearClip,
}) => {
  const expandTitle = lang === 'fr' ? 'Déplier la tranche Master' : 'Expandir a faixa Master';
  const clipTitle = lang === 'fr' ? 'Voyant Clip Master (cliquer pour acquitter)' : 'Indicador Clip Master (clicar para limpar)';

  return (
    <div className="flex flex-col items-center justify-between w-full h-full select-none">
      {/* En-tête : bouton déplier < + Mono Check compact */}
      <div className="w-full bg-[var(--master-header-bg)] text-[var(--master-header-text)] py-1.5 px-1 border-b-[3px] border-[var(--cordel-border)] flex flex-col items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onExpand}
          title={expandTitle}
          className="text-[var(--master-header-text)]/85 hover:text-[var(--master-header-text)] p-0.5 rounded transition-colors cursor-pointer flex items-center justify-center"
        >
          <ChevronLeft size={16} />
        </button>
        <MasterMonoCheckButton isMasterMono={isMasterMono} onToggle={onToggleMono} lang={lang} collapsed />
      </div>

      {/* Voyant Clip compact acquittable */}
      <button
        type="button"
        onClick={onClearClip}
        title={clipTitle}
        className="mt-1.5 px-1 py-0.5 text-[7.5px] font-mono font-black tracking-tighter uppercase rounded-[2px] border border-[var(--cordel-border)]/50 bg-black/20 text-[var(--cordel-text)]/75 hover:text-[var(--cordel-text)] cursor-pointer shrink-0"
      >
        CLIP
      </button>

      {/* Barres VU-mètres stéréo L / R sur toute la hauteur centrale */}
      <div className="flex-1 min-h-0 w-full py-2 px-1.5 flex items-stretch justify-center gap-1.5">
        <div className="w-2.5 h-full bg-[var(--vu-track-bg)] border border-[var(--cordel-border)] relative overflow-hidden rounded-[1px] flex flex-col">
          <div
            ref={clipLeftRef}
            onClick={onClearClip}
            className="w-full h-[4px] shrink-0 border-b border-[var(--cordel-border)]/40 cursor-pointer z-20"
            style={{ backgroundColor: 'var(--vu-level-clip)', opacity: 0.2 }}
          />
          <div className="relative flex-1 w-full overflow-hidden bg-[var(--vu-track-bg)]">
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ background: STUDIO_VU_GRADIENT_VERTICAL }} />
            <div
              ref={vuMeterLeftRef}
              className="absolute inset-0 bg-[var(--vu-track-bg)] w-full h-full pointer-events-none will-change-transform"
              style={{ transformOrigin: 'top', transform: 'scaleY(1)', transition: 'none' }}
            />
            <div
              ref={peakLeftRef}
              className="absolute inset-0 w-full h-full pointer-events-none will-change-transform z-10"
              style={{ opacity: 0, transform: 'translate3d(0, 100%, 0)' }}
            >
              <div className="w-full h-[2px] bg-[var(--cordel-parchment-bg)] shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
            </div>
          </div>
        </div>

        <div className="w-2.5 h-full bg-[var(--vu-track-bg)] border border-[var(--cordel-border)] relative overflow-hidden rounded-[1px] flex flex-col">
          <div
            ref={clipRightRef}
            onClick={onClearClip}
            className="w-full h-[4px] shrink-0 border-b border-[var(--cordel-border)]/40 cursor-pointer z-20"
            style={{ backgroundColor: 'var(--vu-level-clip)', opacity: 0.2 }}
          />
          <div className="relative flex-1 w-full overflow-hidden bg-[var(--vu-track-bg)]">
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ background: STUDIO_VU_GRADIENT_VERTICAL }} />
            <div
              ref={vuMeterRightRef}
              className="absolute inset-0 bg-[var(--vu-track-bg)] w-full h-full pointer-events-none will-change-transform"
              style={{ transformOrigin: 'top', transform: 'scaleY(1)', transition: 'none' }}
            />
            <div
              ref={peakRightRef}
              className="absolute inset-0 w-full h-full pointer-events-none will-change-transform z-10"
              style={{ opacity: 0, transform: 'translate3d(0, 100%, 0)' }}
            >
              <div className="w-full h-[2px] bg-[var(--cordel-parchment-bg)] shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Pied réduit : L / R + sigle MST */}
      <div className="w-full pb-2 px-1 flex flex-col items-center gap-1 shrink-0">
        <div className="flex justify-between w-full px-1.5 text-[9px] font-mono font-extrabold text-[var(--cordel-text)] opacity-90 leading-none">
          <span>L</span>
          <span>R</span>
        </div>
        <button
          type="button"
          onClick={onExpand}
          title={expandTitle}
          className="font-cactus font-black text-[10px] tracking-widest uppercase text-[var(--cordel-text)] opacity-85 hover:opacity-100 cursor-pointer"
        >
          MST
        </button>
      </div>
    </div>
  );
};

