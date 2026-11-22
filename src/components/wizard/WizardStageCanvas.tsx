import React from 'react';
import { Mic, X } from 'lucide-react';
import { PlacedInstrument } from '../../stores/useWizardStore';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { ASSETS_BASE_URL } from '../../data';
import { AVAILABLE_INSTRUMENTS, t } from './wizardConstants';
import { CONE_MAX_RAD, CONE_MIN_RAD } from './wizardStageGeometry';
import { Language } from '../../types';

interface WizardStageCanvasProps {
  placeRef: React.RefObject<HTMLDivElement | null>;
  placeSize: { width: number; height: number };
  placedInstruments: PlacedInstrument[];
  hasToada: boolean;
  wizardLang: Language;
  onPlacedPointerDown: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
  onRemovePlaced: (id: string) => void;
}

export const WizardStageCanvas: React.FC<WizardStageCanvasProps> = ({
  placeRef, placeSize, placedInstruments, hasToada, wizardLang, onPlacedPointerDown, onRemovePlaced,
}) => {
  const resolveLabel = useInstrumentLabel();
  const W = placeSize.width;
  const H = placeSize.height;
  const coneLen = Math.max(W, H) * 1.5;

  return (
    <div
      ref={placeRef}
      className="flex-1 relative bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] shadow-[6px_6px_0px_var(--cordel-shadow-color)] rounded-sm min-h-[250px] touch-none overflow-hidden select-none"
    >
      {W > 0 && H > 0 && (
        <svg className="absolute inset-0 pointer-events-none select-none z-0 text-[var(--cordel-text)]" width={W} height={H}>
          <line x1={W / 2} y1={H} x2={W / 2} y2={0} stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.18" strokeDasharray="4 4" />
          <line x1={W / 2} y1={H} x2={W / 2 + coneLen * Math.cos(CONE_MAX_RAD)} y2={H - coneLen * Math.sin(CONE_MAX_RAD)} stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.3" />
          <line x1={W / 2} y1={H} x2={W / 2 + coneLen * Math.cos(CONE_MIN_RAD)} y2={H - coneLen * Math.sin(CONE_MIN_RAD)} stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.3" />
          {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
            const r = H * ratio;
            const x1 = W / 2 + r * Math.cos(CONE_MIN_RAD);
            const y1 = H - r * Math.sin(CONE_MIN_RAD);
            const x2 = W / 2 + r * Math.cos(CONE_MAX_RAD);
            const y2 = H - r * Math.sin(CONE_MAX_RAD);
            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={ratio === 1.0 ? '2' : '1'}
                strokeOpacity={ratio === 1.0 ? '0.4' : '0.18'}
                strokeDasharray={ratio === 1.0 ? '0' : '3 3'}
              />
            );
          })}
        </svg>
      )}

      {placedInstruments.length === 0 && !hasToada && (
        <div className="absolute inset-x-6 top-1/3 -translate-y-1/2 pointer-events-none flex justify-center z-0">
          <div className="max-w-sm px-4 py-2.5 border-2 border-dashed border-[var(--cordel-border)] bg-[var(--cordel-bg)]/80 text-center text-xs font-cactus font-bold text-[var(--cordel-text-muted)]">
            {t[wizardLang].emptyStageHint}
          </div>
        </div>
      )}

      {placedInstruments.map((inst) => {
        const config = AVAILABLE_INSTRUMENTS.find((i) => i.id === inst.instrumentType);
        const label = resolveLabel(inst.instrumentType) || config?.label || inst.instrumentType;
        return (
          <div
            key={inst.id}
            onPointerDown={(e) => onPlacedPointerDown(e, inst.id)}
            className="group absolute flex flex-col items-center justify-center cursor-move p-1 rounded-full border-3 shadow-[2px_2px_0px_var(--cordel-shadow-color)] select-none bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] active:scale-95 duration-100 touch-none text-center z-10"
            style={{ left: `${inst.x}%`, top: `${inst.y}%`, transform: 'translate(-50%, -50%)', width: '56px', height: '56px', borderColor: config?.color || 'var(--cordel-border-strong)' }}
          >
            <div className="remove-cross absolute inset-0 bg-[var(--cordel-status-danger)]/90 text-[var(--cordel-on-accent)] rounded-full flex items-center justify-center opacity-0 transition-opacity duration-150 pointer-events-none select-none z-30">
              <X size={22} strokeWidth={3} />
            </div>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onRemovePlaced(inst.id); }}
              aria-label="Retirer"
              className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] flex items-center justify-center cursor-pointer z-20"
            >
              <X size={10} strokeWidth={3} />
            </button>
            <img src={config?.iconImg} className="w-6 h-6 object-contain pointer-events-none p-0.5 rounded-full bg-[var(--cordel-paper-surface)]" alt="" />
            <span className="text-[7px] font-cactus font-bold uppercase truncate max-w-[46px] leading-none mt-0.5 text-[var(--cordel-text)]">{label}</span>
          </div>
        );
      })}

      {hasToada && (
        <div
          className="absolute flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] pointer-events-none select-none z-20"
          style={{ left: '50%', top: '87%', transform: 'translate(-50%, -50%)' }}
        >
          <Mic size={11} />
          <span className="text-[9px] font-cactus font-bold uppercase tracking-wider">Toada</span>
        </div>
      )}

      <div
        className="absolute flex flex-col items-center justify-center p-2 rounded-full border-3 border-[var(--cordel-wood)] bg-[var(--cordel-paper-surface)] text-[var(--cordel-paper-ink)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] pointer-events-none select-none text-center z-20"
        style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)', width: '64px', height: '64px' }}
      >
        <img src={`${ASSETS_BASE_URL}icones/apito.svg`} className="w-7 h-7 object-contain opacity-90" alt="" />
        <span className="text-[7px] font-cactus font-bold uppercase text-[var(--cordel-wood)] leading-none mt-0.5">{t[wizardLang].mestre}</span>
        <span className="text-[5px] uppercase font-bold text-[var(--cordel-paper-ink)]/70 leading-none">{t[wizardLang].auditeur}</span>
      </div>
    </div>
  );
};
