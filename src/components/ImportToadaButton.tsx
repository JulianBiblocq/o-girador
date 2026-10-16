/**
 * ImportToadaButton.tsx
 * Bouton Cordel securise pour importer une Toada (.json) dans Sequenciador.
 * Visible uniquement en dev local (localhost) ou pour le Mestre / editeur autorise.
 * Strictement < 150 lignes.
 */
import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { importToadaPackIntoSequencer } from '../utils/toadaPackImporter';
import { ToadaImportModal } from './ToadaImportModal';
import { Download } from 'lucide-react';

interface ImportToadaButtonProps {
  lang?: 'fr' | 'pt';
  className?: string;
}

export const ImportToadaButton: React.FC<ImportToadaButtonProps> = ({ lang = 'fr', className = '' }) => {
  const { userProfile } = useAuth();
  const totalMeasures = useSequencerStore((state) => state.totalMeasures);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPack, setPendingPack] = useState<any>(null);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const canImport = isLocalhost || Boolean(
    userProfile?.canWriteSequenciador ||
    userProfile?.role === 'mestre' ||
    userProfile?.role === 'admin' ||
    (userProfile as any)?.isSystemAdmin
  );

  if (!canImport) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const pack = JSON.parse(text);
      if (!pack?.patterns || !Array.isArray(pack.patterns)) {
        throw new Error(lang === 'fr' ? 'Fichier Toada sans patterns valides' : 'Arquivo Toada sem padrões válidos');
      }
      setPendingFile(file);
      setPendingPack(pack);
      setIsModalOpen(true);
    } catch (err: any) {
      console.error('Erreur lecture toada:', err);
      const errMsg = lang === 'fr' ? `Échec import Toada : ${err?.message || 'fichier invalide'}` : `Falha ao importar Toada : ${err?.message || 'arquivo inválido'}`;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: errMsg } }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async (startMeasureIdx: number | null) => {
    if (!pendingFile || !pendingPack) return;
    setIsModalOpen(false);
    setIsLoading(true);
    try {
      await importToadaPackIntoSequencer(pendingFile, { deployStartMeasureIdx: startMeasureIdx, pack: pendingPack });
    } catch (err: any) {
      console.error('Erreur import toada:', err);
      const errMsg = lang === 'fr' ? `Échec import Toada : ${err?.message || 'erreur inconnue'}` : `Falha ao importar Toada : ${err?.message || 'erro desconhecido'}`;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: errMsg } }));
    } finally {
      setIsLoading(false);
      setPendingFile(null);
      setPendingPack(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPendingFile(null);
    setPendingPack(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const label = isLoading
    ? (lang === 'fr' ? 'Importation...' : 'Importando...')
    : (lang === 'fr' ? 'Importer Toada (.json)' : 'Importar Toada (.json)');

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={isLoading}
        onClick={() => fileInputRef.current?.click()}
        title={lang === 'fr' ? 'Importer une Toada (Puxador, Coro, Audio et Conducteur)' : 'Importar Toada (Puxador, Coro, Áudio e Linha de Regência)'}
        className={`px-2.5 py-1 text-[11px] font-cactus font-bold flex items-center gap-1.5 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] transition-all cursor-pointer rounded-none select-none ${
          isLoading
            ? 'bg-[#c25e38] text-white opacity-80 cursor-wait'
            : 'bg-[#9a3412] hover:bg-[#802a0e] text-white active:translate-y-[1px] active:shadow-none'
        } ${className}`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
      </button>

      {isModalOpen && pendingPack && (
        <ToadaImportModal
          isOpen={isModalOpen}
          toadaTitle={pendingPack.project?.title || pendingFile?.name?.replace(/\.json$/i, '') || ''}
          patternsCount={pendingPack.patterns?.length || 0}
          totalMeasures={totalMeasures}
          onConfirm={handleConfirmImport}
          onClose={handleCloseModal}
          lang={lang}
        />
      )}
    </>
  );
};
