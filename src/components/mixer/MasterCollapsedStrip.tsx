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
  rmsVeilLeftRef?: React.RefObject<HTMLDivElement | null>;
  rmsVeilRightRef?: React.RefObject<HTMLDivElement | null>;
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
  rmsVeilLeftRef,
  rmsVeilRightRef,
  peakLeftRef,
  peakRightRef,
  clipLeftRef,
  clipRightRef,
  onClearClip,
}) => {
  const expandTitle = lang === 'fr' ? 'Déplier la tranche Master' : 'Expandir a faixa Master';
  const clipTitle = lang === 'fr' ? 'Voyant Peak/Clip Master (cliquer pour acquitter)' : 'Indicador Peak/Clip Master (clicar para limpar)';

  return (
    <div className="flex flex-col items-center justify-between w-full h-full select-none">
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

      <button
        type="button"
        onClick={onClearClip}
        title={clipTitle}
        className="mt-1.5 px-1 py-0.5 text-[7.5px] font-mono font-black tracking-tighter uppercase rounded-[2px] border border-[var(--cordel-border)]/50 bg-black/20 text-[var(--cordel-text)]/75 hover:text-[var(--cordel-text)] cursor-pointer shrink-0"
      >
        CLIP
      </button>

      <div className="flex-1 min-h-0 w-full py-2 px-1.5 flex items-stretch justify-center gap-1.5">
        {/* Canal L : Voyant O détaché + mb-1 + Colonne H */}
        <div className="w-3 h-full flex flex-col items-center">
          <div
            ref={clipLeftRef}
            onClick={onClearClip}
            title={clipTitle}
            className="w-full h-[8px] mb-1 shrink-0 rounded-[1.5px] border border-[var(--cordel-border-strong)] cursor-pointer z-20 transition-colors"
            style={{ backgroundColor: 'var(--vu-led-off-bg)', opacity: 0.85 }}
          />
          <div className="relative flex-1 w-full min-h-0 overflow-hidden rounded-[1px] border border-[var(--cordel-border)] bg-[var(--vu-track-bg)]">
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ background: STUDIO_VU_GRADIENT_VERTICAL }} />
            <div
              ref={rmsVeilLeftRef}
              className="absolute inset-0 bg-[var(--vu-track-bg)] opacity-[0.42] w-full h-full pointer-events-none will-change-transform"
              style={{ transformOrigin: 'top', transform: 'scaleY(1)', transition: 'none' }}
            />
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
              <div className="w-full h-[2.5px] bg-[var(--vu-peak-tick-color)] shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
            </div>
          </div>
        </div>

        {/* Canal R : Voyant O détaché + mb-1 + Colonne H */}
        <div className="w-3 h-full flex flex-col items-center">
          <div
            ref={clipRightRef}
            onClick={onClearClip}
            title={clipTitle}
            className="w-full h-[8px] mb-1 shrink-0 rounded-[1.5px] border border-[var(--cordel-border-strong)] cursor-pointer z-20 transition-colors"
            style={{ backgroundColor: 'var(--vu-led-off-bg)', opacity: 0.85 }}
          />
          <div className="relative flex-1 w-full min-h-0 overflow-hidden rounded-[1px] border border-[var(--cordel-border)] bg-[var(--vu-track-bg)]">
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ background: STUDIO_VU_GRADIENT_VERTICAL }} />
            <div
              ref={rmsVeilRightRef}
              className="absolute inset-0 bg-[var(--vu-track-bg)] opacity-[0.42] w-full h-full pointer-events-none will-change-transform"
              style={{ transformOrigin: 'top', transform: 'scaleY(1)', transition: 'none' }}
            />
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
              <div className="w-full h-[2.5px] bg-[var(--vu-peak-tick-color)] shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
            </div>
          </div>
        </div>
      </div>

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
