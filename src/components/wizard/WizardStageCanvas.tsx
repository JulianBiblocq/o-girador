import React from 'react';
import { PlacedInstrument } from '../../stores/useWizardStore';
import { AVAILABLE_INSTRUMENTS, t } from './wizardConstants';
import { Language } from '../../types';

interface WizardStageCanvasProps {
  placeRef: React.RefObject<HTMLDivElement | null>;
  placeSize: { width: number; height: number };
  placedInstruments: PlacedInstrument[];
  wizardLang: Language;
  onPlacedPointerDown: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
}

export const WizardStageCanvas: React.FC<WizardStageCanvasProps> = ({
  placeRef,
  placeSize,
  placedInstruments,
  wizardLang,
  onPlacedPointerDown,
}) => {
  const W = placeSize.width;
  const H = placeSize.height;

  return (
    <div
      ref={placeRef}
      className="flex-1 relative bg-[#ece4d0] border-4 border-[#1a1a1a] shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-sm min-h-[250px] touch-none overflow-hidden select-none"
    >
      {W > 0 && H > 0 && (
        <svg className="absolute inset-0 pointer-events-none select-none z-0" width={W} height={H}>
          <line x1={W / 2} y1={H} x2={W / 2} y2={0} stroke="#1a1a1a" strokeWidth="1.2" strokeOpacity="0.12" strokeDasharray="4 4" />
          {(() => {
            const len = Math.max(W, H) * 1.5;
            const xLeft = W / 2 + len * Math.cos((5 * Math.PI) / 6);
            const yLeft = H - len * Math.sin((5 * Math.PI) / 6);
            const xRight = W / 2 + len * Math.cos(Math.PI / 6);
            const yRight = H - len * Math.sin(Math.PI / 6);
            return (
              <>
                <line x1={W / 2} y1={H} x2={xLeft} y2={yLeft} stroke="#1a1a1a" strokeWidth="1.8" strokeOpacity="0.25" />
                <line x1={W / 2} y1={H} x2={xRight} y2={yRight} stroke="#1a1a1a" strokeWidth="1.8" strokeOpacity="0.25" />
              </>
            );
          })()}
          {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
            const r = H * ratio;
            const cos30 = Math.cos(Math.PI / 6);
            const sin30 = Math.sin(Math.PI / 6);
            const cos150 = Math.cos((5 * Math.PI) / 6);
            const sin150 = Math.sin((5 * Math.PI) / 6);
            const x1 = W / 2 + r * cos30;
            const y1 = H - r * sin30;
            const x2 = W / 2 + r * cos150;
            const y2 = H - r * sin150;
            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`}
                fill="none"
                stroke="#1a1a1a"
                strokeWidth={ratio === 1.0 ? '2' : '1'}
                strokeOpacity={ratio === 1.0 ? '0.35' : '0.15'}
                strokeDasharray={ratio === 1.0 ? '0' : '3 3'}
              />
            );
          })}
        </svg>
      )}

      {placedInstruments.map((inst) => {
        const config = AVAILABLE_INSTRUMENTS.find((i) => i.id === inst.instrumentType);
        return (
          <div
            key={inst.id}
            onPointerDown={(e) => onPlacedPointerDown(e, inst.id)}
            className="absolute flex flex-col items-center justify-center cursor-move p-1 rounded-full border-3 shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none bg-[#f4ecd8] active:scale-95 duration-100 touch-none text-center z-10"
            style={{
              left: `${inst.x}%`,
              top: `${inst.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '52px',
              height: '52px',
              borderColor: config?.color || '#1a1a1a',
            }}
          >
            <div className="remove-cross absolute inset-0 bg-[#8b2a1a]/10 rounded-full flex items-center justify-center text-3xl font-bold text-[#1a1a1a] opacity-0 transition-opacity duration-150 pointer-events-none select-none z-30 font-mono">
              
            </div>
            <img src={config?.iconImg} className="w-6 h-6 object-contain pointer-events-none p-0.5 rounded-full bg-[#1a1a1a]/5" alt="" />
            <span className="text-[7px] font-cactus font-bold uppercase truncate max-w-[44px] leading-none mt-0.5 text-[#1a1a1a]">
              {config?.label || inst.instrumentType}
            </span>
          </div>
        );
      })}

      <div
        className="absolute flex flex-col items-center justify-center p-2 rounded-full border-3 border-[#8b2a1a] bg-[#f4ecd8] shadow-[3px_3px_0px_rgba(139,42,26,0.3)] pointer-events-none select-none text-center z-20"
        style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)', width: '64px', height: '64px' }}
      >
        <img src="icones/apito.svg" className="w-7 h-7 object-contain opacity-90" alt="" />
        <span className="text-[7px] font-cactus font-bold uppercase text-[#8b2a1a] leading-none mt-0.5">
          {t[wizardLang].mestre}
        </span>
        <span className="text-[5px] uppercase font-bold text-[#8b2a1a]/60 leading-none">
          {t[wizardLang].auditeur}
        </span>
      </div>
    </div>
  );
};
