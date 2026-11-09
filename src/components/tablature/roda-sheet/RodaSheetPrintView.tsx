import React from 'react';
import { MiniRodaPrintCard } from './MiniRodaPrintCard';
import { RodaSheetDensity, RodaSheetMeasureItem, RodaSheetTrackInfo } from './rodaSheetTypes';

interface RodaSheetPrintViewProps {
  items: RodaSheetMeasureItem[];
  selectedTracks: RodaSheetTrackInfo[];
  density: RodaSheetDensity;
  songTitle: string;
  ritmo?: string;
  bpm: number;
  isLeftHanded?: boolean;
  lang: 'fr' | 'pt';
}

export const RodaSheetPrintView: React.FC<RodaSheetPrintViewProps> = ({
  items, selectedTracks, density, songTitle, ritmo, bpm, isLeftHanded = false, lang,
}) => {
  const isFr = lang === 'fr';
  const pages: RodaSheetMeasureItem[][] = [];
  for (let i = 0; i < items.length; i += density) {
    pages.push(items.slice(i, i + density));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <div id="roda-sheet-print-root" className="flex flex-col gap-5 items-center w-full py-2">
      {pages.map((pageItems, pIdx) => (
        <div
          key={`a4-page-${pIdx}`}
          className="roda-a4-page bg-white text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-4 flex flex-col justify-between w-full max-w-[210mm]"
          style={{
            backgroundColor: '#ffffff',
            color: '#1a1a1a',
            pageBreakAfter: pIdx < pages.length - 1 ? 'always' : 'auto',
            breakAfter: pIdx < pages.length - 1 ? 'page' : 'auto',
          }}
        >
          {/* En-tête compact A4 : Titre, Rythme, BPM & Légende des Instruments (Extérieur -> Intérieur) */}
          <div className="border-b-2 border-[#1a1a1a] pb-2 mb-3 flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-cactus font-black text-base uppercase tracking-wider text-[#1a1a1a]">
                  {songTitle}
                </span>
                {ritmo && (
                  <span className="font-mono font-bold text-[11px] uppercase px-1.5 py-0.5 border border-[#1a1a1a] text-[#1a1a1a]">
                    {ritmo}
                  </span>
                )}
                <span className="font-mono font-bold text-[11px] text-[#1a1a1a]">
                  {bpm} BPM
                </span>
              </div>
              <span className="font-mono font-bold text-[10px] text-[#57534e] shrink-0">
                {isFr ? 'Planche A4' : 'Prancha A4'} • {pIdx + 1}/{pages.length}
              </span>
            </div>

            {/* Légende couleur de l'extérieur vers l'intérieur */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-bold text-[#1a1a1a]">
              <span className="font-mono uppercase text-[9px] text-[#57534e]">
                {isFr ? 'Orbites (Ext. → Int.) :' : 'Órbitas (Ext. → Int.) :'}
              </span>
              {selectedTracks.map((tInfo, idx) => (
                <span key={tInfo.track.id} className="inline-flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-white inline-block shrink-0"
                    style={{ border: `2.5px solid ${tInfo.color}`, boxShadow: '0 0 0 0.8px #1a1a1a' }}
                  />
                  <span>
                    {tInfo.displayIndex}. {tInfo.displayName}
                    {idx < selectedTracks.length - 1 ? ' •' : ''}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Grille A4 des Mini-Rodas (2x4 ou 3x4) */}
          {pageItems.length === 0 ? (
            <div className="py-16 text-center font-cactus font-bold text-sm text-[#57534e]">
              {isFr
                ? 'Aucune mesure sélectionnée dans le panier. Cliquez sur les mesures ci-dessus pour les ajouter.'
                : 'Nenhum compasso selecionado na cesta. Clique nos compassos acima para adicioná-los.'}
            </div>
          ) : (
            <div className={`grid gap-2.5 ${density === 12 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {pageItems.map((item) => (
                <MiniRodaPrintCard
                  key={item.key}
                  item={item}
                  tracks={selectedTracks}
                  isLeftHanded={isLeftHanded}
                  compact={density === 12}
                />
              ))}
            </div>
          )}

          {/* Pied de page discret */}
          <div className="mt-2 pt-1 border-t border-[#d6d3d1] flex justify-between items-center text-[9px] font-mono text-[#57534e]">
            <span>O Girador — Séquenciad&apos;Or</span>
            <span>{isFr ? 'Tampons Éco-Encre (Fond blanc • Coup fort = trait épais)' : 'Carimbos Eco-Tinta (Fundo branco • Toque forte = traço grosso)'}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
