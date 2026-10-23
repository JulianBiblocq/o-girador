import React from 'react';

interface SettingsPrensaPreviewProps {
  lang: string;
  metadata: any;
  liveText: string;
  bodyFontSize: number;
  onLiveTextChange: (val: string) => void;
  onFontSizeChange: (size: number) => void;
  onRefresh: () => void;
}

export const SettingsPrensaPreview: React.FC<SettingsPrensaPreviewProps> = ({
  lang,
  metadata,
  liveText,
  bodyFontSize,
  onLiveTextChange,
  onFontSizeChange,
  onRefresh,
}) => {
  return (
    <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-black/10 pb-2">
        <h3 className="font-cactus font-bold text-sm uppercase flex items-center gap-1.5">
          <span></span>
          <span>{lang === 'fr' ? 'Plan de Travail Partition (Édition Directe)' : 'Mesa de Trabalho da Partitura'}</span>
        </h3>
        <div className="flex items-center gap-2 bg-[#f4ecd8] border-2 border-black px-2.5 py-1 shadow-[1.5px_1.5px_0px_#000] text-[9px] font-bold uppercase select-none">
          <span>{lang === 'fr' ? 'Zoom Police :' : 'Zoom Fonte :'}</span>
          <span>{bodyFontSize}px</span>
          <input
            type="range"
            min="9"
            max="18"
            value={bodyFontSize}
            onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
            className="accent-black cursor-pointer w-20 h-1 bg-black/10"
          />
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase cursor-pointer hover:bg-[#8b2a1a] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all ml-2"
          >
            {lang === 'fr' ? "Régénérer depuis l'Atelier" : 'Gerar da Oficina'}
          </button>
        </div>
      </div>
      <p className="text-[10px] italic opacity-60 text-center border-b border-dashed border-black/15 pb-2">
        {lang === 'fr'
          ? "Consigne d'atelier : Vous pouvez modifier, aérer ou annoter directement la partition ci-dessous avant impression ou export."
          : 'Instrução de oficina: Você pode editar, espaçar ou anotar diretamente a partitura abaixo antes de imprimir ou exportar.'}
      </p>
      <div className="w-full p-4 md:p-8 bg-black/5 border border-black/10 rounded-md overflow-x-auto flex justify-center">
        <div className="w-[21cm] h-[29.7cm] shrink-0 bg-[#fbf8f0] p-12 md:p-16 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.15)] flex flex-col text-left overflow-hidden">
          <div className="text-center mb-1">
            <h2 className="font-cactus text-3xl md:text-4xl font-bold text-black uppercase tracking-wider text-center">
              {metadata.toada || (lang === 'fr' ? 'PARTITION SANS TITRE' : 'PARTITURA SEM TÍTULO')}
            </h2>
          </div>
          {(metadata.compositor || metadata.ritmo) && (
            <div className="text-right text-[10px] md:text-xs text-gray-700 font-sans mb-3 border-b border-dashed border-black/20 pb-2">
              {metadata.compositor && <div>{lang === 'fr' ? 'Mestre / Compositeur' : 'Mestre / Compositor'} : {metadata.compositor}</div>}
              {metadata.ritmo && <div>{lang === 'fr' ? 'Rythme' : 'Ritmo'} : {metadata.ritmo}</div>}
            </div>
          )}
          <textarea
            value={liveText}
            onChange={(e) => onLiveTextChange(e.target.value)}
            style={{ fontSize: `${bodyFontSize}px`, whiteSpace: 'pre', overflowX: 'auto' }}
            className="w-full flex-grow h-0 min-h-0 bg-transparent text-black font-mono whitespace-pre overflow-x-auto overflow-y-auto leading-relaxed outline-none resize-none custom-scrollbar text-[#1a1a1a]"
            placeholder={lang === 'fr' ? 'Générez ou tapez la partition ici...' : 'Gere ou digite a partitura aqui...'}
          />
        </div>
      </div>
    </div>
  );
};
