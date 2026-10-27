/**
 * ImportToadaButton.tsx
 * Bouton Cordel [ Charger Toada ] et pont Cloud direct vers Cantador (< 125 lignes).
 * Supporte la sélection visuelle (CloudToadaPickerModal) et les deep links ?loadToadaId=...
 */
import React, { useState } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { importToadaPackIntoSequencer } from '../utils/toadaPackImporter';
import { CloudToadaPickerModal } from './CloudToadaPickerModal';
import { ToadaImportModal } from './ToadaImportModal';
import { Cloud } from 'lucide-react';

interface ImportToadaButtonProps {
  lang?: 'fr' | 'pt';
  className?: string;
}

export const ImportToadaButton: React.FC<ImportToadaButtonProps> = ({ lang = 'fr', className = '' }) => {
  const totalMeasures = useSequencerStore((state) => state.totalMeasures);
  const [isLoading, setIsLoading] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPack, setPendingPack] = useState<any>(null);

  const handleSelectCloudPack = (pack: any) => {
    setPendingPack(pack);
    setIsModalOpen(true);
  };

  const handleConfirmImport = async (startMeasureIdx: number | null) => {
    if (!pendingPack) return;
    setIsModalOpen(false);
    setIsLoading(true);
    try {
      await importToadaPackIntoSequencer(null, { deployStartMeasureIdx: startMeasureIdx, pack: pendingPack });
    } catch (err: any) {
      console.error('[ImportToadaButton] Erreur import toada:', err);
      const errMsg = lang === 'fr' ? `Échec import Toada : ${err?.message || 'erreur'}` : `Falha ao importar Toada : ${err?.message || 'erro'}`;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: errMsg } }));
    } finally {
      setIsLoading(false);
      setPendingPack(null);
    }
  };

  const label = isLoading
    ? (lang === 'fr' ? 'Chargement...' : 'Carregando...')
    : (lang === 'fr' ? 'Charger Toada' : 'Carregar Toada');

  return (
    <>
      <button
        type="button"
        disabled={isLoading}
        onClick={() => setIsPickerOpen(true)}
        title={lang === 'fr' ? 'Charger une Toada depuis Cantador (Cloud)' : 'Carregar Toada de Cantador (Nuvem)'}
        className={`px-2.5 py-1 text-[11px] font-cactus font-bold flex items-center gap-1.5 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] transition-all cursor-pointer rounded-none select-none ${
          isLoading
            ? 'bg-[#c25e38] text-white opacity-80 cursor-wait'
            : 'bg-[#9a3412] hover:bg-[#802a0e] text-white active:translate-y-[1px] active:shadow-none'
        } ${className}`}
      >
        <Cloud className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
      </button>

      {isPickerOpen && (
        <CloudToadaPickerModal
          isOpen={isPickerOpen}
          onSelectToada={handleSelectCloudPack}
          onClose={() => setIsPickerOpen(false)}
          lang={lang}
        />
      )}

      {isModalOpen && pendingPack && (
        <ToadaImportModal
          isOpen={isModalOpen}
          toadaTitle={pendingPack.project?.title || pendingPack.metadata?.title || pendingPack.title || 'Toada Cloud'}
          patternsCount={pendingPack.patterns?.length || 0}
          totalMeasures={totalMeasures}
          onConfirm={handleConfirmImport}
          onClose={() => { setIsModalOpen(false); setPendingPack(null); }}
          lang={lang}
        />
      )}
    </>
  );
};
