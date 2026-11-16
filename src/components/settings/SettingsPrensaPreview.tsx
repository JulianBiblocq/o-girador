import React, { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

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
    <div className="border-2 border-[var(--cordel-border)] rounded-[3px_6px_4px_8px] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col gap-4">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[var(--cordel-border)]/35 pb-2.5">
        <h3 className="font-cactus font-bold text-sm uppercase text-[var(--cordel-text)] flex items-center gap-1.5">
          <span>{lang === 'fr' ? 'Plan de Travail Partition (Édition Directe)' : 'Mesa de Trabalho da Partitura'}</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] px-3 py-1.5 shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] select-none">
          <span className="text-[var(--cordel-text)] font-bold text-xs whitespace-nowrap uppercase">
            {lang === 'fr' ? `TAILLE TEXTE : ${bodyFontSize}px` : `TAMANHO : ${bodyFontSize}px`}
          </span>
          <input
            type="range"
            min="9"
            max="18"
            value={bodyFontSize}
            onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
            className="accent-[var(--cordel-wood)] cursor-pointer w-24 h-1.5"
          />
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors ml-1 flex items-center gap-1.5"
          >
            <RefreshCw size={12} className="shrink-0" />
            <span>{lang === 'fr' ? "Régénérer depuis l'Atelier" : 'Gerar da Oficina'}</span>
          </button>
        </div>
      </div>

      <p className="text-[11px] italic font-semibold text-[var(--cordel-text-muted)] text-center border-b border-dashed border-[var(--cordel-border)]/40 pb-2">
        {lang === 'fr'
          ? "Consigne d'atelier : Le nombre de mesures par ligne s'adapte dynamiquement à la taille de police. Vous pouvez aussi annoter directement le texte ci-dessous."
          : 'Instrução de oficina: O número de compassos por linha adapta-se dinamicamente ao tamanho da fonte. Você também pode editar diretamente o texto abaixo.'}
      </p>

      <div className="w-full p-4 md:p-8 bg-[var(--cordel-surface-muted)] border border-[var(--cordel-border)]/50 rounded-md overflow-x-auto flex justify-center">
        <div
          ref={sheetRef}
          className="w-[21cm] h-[29.7cm] shrink-0 bg-[var(--cordel-paper-surface)] text-[var(--cordel-paper-ink)] px-6 py-10 border-4 border-[var(--cordel-paper-ink)] shadow-[8px_8px_0px_var(--cordel-shadow-color)] flex flex-col text-left overflow-hidden"
        >
          <div className="text-center mb-1">
            <h2 className="font-cactus text-3xl md:text-4xl font-bold text-[var(--cordel-paper-ink)] uppercase tracking-wider text-center">
              {metadata.toada || (lang === 'fr' ? 'PARTITION SANS TITRE' : 'PARTITURA SEM TÍTULO')}
            </h2>
          </div>
          {(metadata.compositor || metadata.ritmo) && (
            <div className="text-right text-[10px] md:text-xs text-[var(--cordel-paper-ink)]/80 font-sans mb-3 border-b border-dashed border-[var(--cordel-paper-ink)]/30 pb-2">
              {metadata.compositor && <div>{lang === 'fr' ? 'Mestre / Compositeur' : 'Mestre / Compositor'} : {metadata.compositor}</div>}
              {metadata.ritmo && <div>{lang === 'fr' ? 'Rythme' : 'Ritmo'} : {metadata.ritmo}</div>}
            </div>
          )}
          <textarea
            value={liveText}
            onChange={(e) => onLiveTextChange(e.target.value)}
            style={{ fontSize: `${bodyFontSize}px`, whiteSpace: 'pre', overflowX: 'auto' }}
            className="w-full flex-grow h-0 min-h-0 bg-transparent text-[var(--cordel-paper-ink)] placeholder:text-[var(--cordel-paper-ink)]/55 font-mono whitespace-pre overflow-x-auto overflow-y-auto leading-relaxed outline-none resize-none custom-scrollbar"
            placeholder={lang === 'fr' ? 'Générez ou tapez la partition ici...' : 'Gere ou digite a partitura aqui...'}
          />
        </div>
      </div>
    </div>
  );
};
