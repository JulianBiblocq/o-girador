/**
 * ExportBaqueBounceButton.tsx
 * Bouton Cordel [ 🥁 Exporter Baque pour Cantador (.wav) ] (< 85 lignes).
 */
import React, { useState } from 'react';
import { Drum } from 'lucide-react';
import { renderBaqueCycleOffline } from '../utils/baqueBounceExporter';

interface ExportBaqueBounceButtonProps {
  lang?: 'fr' | 'pt';
  className?: string;
  compact?: boolean;
}

export const ExportBaqueBounceButton: React.FC<ExportBaqueBounceButtonProps> = ({
  lang = 'fr',
  className = '',
  compact = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportBounce = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { wavBlob, filename } = await renderBaqueCycleOffline();
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const msg = lang === 'fr'
        ? `Bounce du Baque exporté : ${filename}`
        : `Bounce do Baque exportado : ${filename}`;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } }));
    } catch (err: any) {
      console.error('[ExportBaqueBounceButton] Erreur export bounce Baque:', err);
      const errMsg = lang === 'fr'
        ? `Échec export Baque : ${err?.message || 'erreur'}`
        : `Falha ao exportar Baque : ${err?.message || 'erro'}`;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: errMsg } }));
    } finally {
      setIsExporting(false);
    }
  };

  const label = isExporting
    ? (lang === 'fr' ? 'Rendu du Baque...' : 'Renderizando Baque...')
    : compact
    ? (lang === 'fr' ? '🥁 Baque (.wav)' : '🥁 Baque (.wav)')
    : (lang === 'fr' ? '🥁 Exporter Baque pour Cantador (.wav)' : '🥁 Exportar Baque para Cantador (.wav)');

  const tooltip = lang === 'fr'
    ? 'Exporter hors-ligne un cycle du Baque (sans voix) calé sur M1•T1 pour Cantador (.wav)'
    : 'Exportar offline um ciclo do Baque (sem vozes) alinhado em M1•T1 para o Cantador (.wav)';

  return (
    <button
      type="button"
      disabled={isExporting}
      onClick={handleExportBounce}
      title={tooltip}
      className={`px-2.5 py-1.5 text-[11px] font-cactus font-bold flex items-center justify-center gap-1.5 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] bg-[#8b2a1a] hover:bg-[#722215] text-[#f4ecd8] transition-all cursor-pointer rounded-none select-none active:translate-y-[1px] active:shadow-none disabled:opacity-60 ${className}`}
    >
      <Drum className="w-3.5 h-3.5 shrink-0 text-amber-300" />
      <span>{label}</span>
    </button>
  );
};

