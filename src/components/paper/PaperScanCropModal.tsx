/**
 * Modale de rognage rapide et d'orientation Cordel avant analyse Vision (< 130 lignes).
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCw, Check, Maximize2, X, Crop } from 'lucide-react';
import { preprocessPaperImage } from '../../utils/paper/paperImagePreprocessor';
import { useCropInteraction, HandleType } from '../../hooks/paper/useCropInteraction';

interface Props {
  isOpen: boolean;
  imageSrc: string;
  title?: string;
  onConfirm: (processedDataUrl: string) => void;
  onCancel: () => void;
  lang: 'fr' | 'pt';
}

export const PaperScanCropModal: React.FC<Props> = ({
  isOpen, imageSrc, title, onConfirm, onCancel, lang,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { crop, containerRef, onPointerDown, onPointerMove, onPointerUp } = useCropInteraction();
  const isFr = lang === 'fr';

  if (!isOpen || !imageSrc) return null;

  const handleApply = async (useFullPage: boolean) => {
    try {
      setIsProcessing(true);
      const res = await preprocessPaperImage(imageSrc, useFullPage ? undefined : crop, rotation);
      onConfirm(res);
    } catch (err: any) {
      console.error('Erreur prétraitement image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const corners: HandleType[] = ['nw', 'ne', 'se', 'sw'];
  const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') || document.body : null;
  if (!modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 select-none">
      <div className="bg-[#f4ecd8] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[6px_6px_0px_#000] w-full max-w-2xl flex flex-col max-h-[95vh] overflow-hidden font-sans">
        {/* EN-TÊTE MODALE */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1a] text-[#f4ecd8] border-b-2 border-black">
          <div className="flex items-center gap-1.5 font-cactus font-bold text-xs uppercase text-[#d99b26] truncate">
            <Crop size={14} className="shrink-0" />
            <span className="truncate">{title || (isFr ? 'Cadrer avant analyse' : 'Enquadrar antes de analisar')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-2 py-0.5 bg-[#262220] hover:bg-[#383330] text-[#f4ecd8] border border-[#d99b26]/70 font-cactus text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              title={isFr ? 'Faire pivoter de 90°' : 'Girar 90°'}
            >
              <RotateCw size={11} className="text-[#d99b26]" />
              <span>{rotation}°</span>
            </button>
            <button type="button" onClick={onCancel} className="text-[#f4ecd8] hover:text-[#ef4444] p-0.5 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ZONE DE VISUALISATION & RECTANGLE DE ROGNAGE TACTILE (touch-none) */}
        <div
          ref={containerRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative flex-1 min-h-[260px] max-h-[55vh] bg-[#111] overflow-hidden flex items-center justify-center touch-none"
        >
          <img
            src={imageSrc}
            alt="Scan paper"
            style={{ transform: `rotate(${rotation}deg)` }}
            className="max-h-[55vh] max-w-full object-contain pointer-events-none transition-transform duration-150"
          />

          {/* CADRE DE SÉLECTION RECTANGULAIRE */}
          <div
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.width * 100}%`,
              height: `${crop.height * 100}%`,
            }}
            onPointerDown={(e) => onPointerDown(e, 'move')}
            className="absolute border-2 border-[#d99b26] shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] cursor-move touch-none flex items-center justify-center"
          >
            <div className="w-full h-full border border-dashed border-[#f4ecd8]/60 pointer-events-none" />
            {corners.map((pos) => (
              <div
                key={pos}
                onPointerDown={(e) => onPointerDown(e, pos)}
                className={`absolute w-5 h-5 bg-[#d99b26] border-2 border-black cursor-${pos}-resize touch-none ${
                  pos.includes('n') ? '-top-2.5' : '-bottom-2.5'
                } ${pos.includes('w') ? '-left-2.5' : '-right-2.5'}`}
              />
            ))}
          </div>
        </div>

        {/* PIED DE MODALE & ACTIONS CLAIRES */}
        <div className="p-2.5 bg-[#e6dec8] border-t-2 border-[#1a1a1a] flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleApply(true)}
            className="px-3 py-1.5 bg-[#f4ecd8] hover:bg-[#dcd1b5] text-[#1a1a1a] font-cactus font-bold text-xs uppercase border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Maximize2 size={13} />
            <span>{isFr ? 'Utiliser la page entière' : 'Usar página inteira'}</span>
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleApply(false)}
            className="px-4 py-1.5 bg-[#8b2a1a] hover:bg-[#a03220] text-[#f4ecd8] font-cactus font-bold text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:translate-y-0.5"
          >
            <Check size={14} />
            <span>{isProcessing ? (isFr ? 'Traitement...' : 'Processando...') : isFr ? 'Analyser la zone cadrée' : 'Analisar área selecionada'}</span>
          </button>
        </div>
      </div>
    </div>,
    modalRoot
  );
};
