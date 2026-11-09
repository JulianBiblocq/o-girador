import React, { useEffect, useRef } from 'react';

interface SettingsPrensaPreviewProps {
  lang: string;
  metadata: any;
  liveText: string;
  bodyFontSize: number;
  onLiveTextChange: (val: string) => void;
  onFontSizeChange: (size: number) => void;
  onRefresh: () => void;
  onContainerWidthChange?: (widthPx: number) => void;
}

export const SettingsPrensaPreview: React.FC<SettingsPrensaPreviewProps> = ({
  lang,
  metadata,
  liveText,
  bodyFontSize,
  onLiveTextChange,
  onFontSizeChange,
  onRefresh,
  onContainerWidthChange,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !onContainerWidthChange) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 250) onContainerWidthChange(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [onContainerWidthChange]);

  return (
    <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white text-[#1a1a1a] shadow-[3px_3px_0px_#000] flex flex-col gap-4">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-black/10 pb-2">
        <h3 className="font-cactus font-bold text-sm uppercase text-[#1a1a1a] flex items-center gap-1.5">
          <span>{lang === 'fr' ? 'Plan de Travail Partition (Édition Directe)' : 'Mesa de Trabalho da Partitura'}</span>
        </h3>
        <div className="flex items-center gap-2.5 bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] px-3 py-1.5 shadow-[1.5px_1.5px_0px_#000] select-none">
          <span className="text-[#1a1a1a] font-bold text-xs whitespace-nowrap uppercase">
            {lang === 'fr' ? `TAILLE TEXTE : ${bodyFontSize}px` : `TAMANHO : ${bodyFontSize}px`}
          </span>
          <input
            type="range"
            min="9"
            max="18"
            value={bodyFontSize}
            onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
            className="accent-[#8b2a1a] cursor-pointer w-24 h-1.5 bg-black/15"
          />
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1 bg-[#1a1a1a] !text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase cursor-pointer hover:bg-[#8b2a1a] hover:!text-[#f4ecd8] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all ml-1"
          >
            {lang === 'fr' ? "Régénérer depuis l'Atelier" : 'Gerar da Oficina'}
          </button>
        </div>
      </div>
      <p className="text-[11px] italic font-semibold text-[#44403c] text-center border-b border-dashed border-black/15 pb-2">
        {lang === 'fr'
          ? "Consigne d'atelier : Le nombre de mesures par ligne s'adapte dynamiquement à la taille de police. Vous pouvez aussi annoter directement le texte ci-dessous."
          : 'Instrução de oficina: O número de compassos por linha adapta-se dinamicamente ao tamanho da fonte. Você também pode editar diretamente o texto abaixo.'}
      </p>
      <div className="w-full p-4 md:p-8 bg-black/5 border border-black/10 rounded-md overflow-x-auto flex justify-center">
        <div
          ref={sheetRef}
          className="w-[21cm] h-[29.7cm] shrink-0 bg-[#fbf8f0] text-[#1a1a1a] px-6 py-10 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.15)] flex flex-col text-left overflow-hidden"
        >
          <div className="text-center mb-1">
            <h2 className="font-cactus text-3xl md:text-4xl font-bold text-[#1a1a1a] uppercase tracking-wider text-center">
              {metadata.toada || (lang === 'fr' ? 'PARTITION SANS TITRE' : 'PARTITURA SEM TÍTULO')}
            </h2>
          </div>
          {(metadata.compositor || metadata.ritmo) && (
            <div className="text-right text-[10px] md:text-xs text-[#44403c] font-sans mb-3 border-b border-dashed border-black/20 pb-2">
              {metadata.compositor && <div>{lang === 'fr' ? 'Mestre / Compositeur' : 'Mestre / Compositor'} : {metadata.compositor}</div>}
              {metadata.ritmo && <div>{lang === 'fr' ? 'Rythme' : 'Ritmo'} : {metadata.ritmo}</div>}
            </div>
          )}
          <textarea
            value={liveText}
            onChange={(e) => onLiveTextChange(e.target.value)}
            style={{ fontSize: `${bodyFontSize}px`, whiteSpace: 'pre', overflowX: 'auto' }}
            className="w-full flex-grow h-0 min-h-0 bg-transparent text-[#1a1a1a] placeholder:text-[#57534e] font-mono whitespace-pre overflow-x-auto overflow-y-auto leading-relaxed outline-none resize-none custom-scrollbar"
            placeholder={lang === 'fr' ? 'Générez ou tapez la partition ici...' : 'Gere ou digite a partitura aqui...'}
          />
        </div>
      </div>
    </div>
  );
};
