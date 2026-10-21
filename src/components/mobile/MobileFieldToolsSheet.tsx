/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, FileText, Monitor, ChevronRight } from 'lucide-react';
import { useSequencer } from '../../contexts/SequencerContext';
import { MobileTopHeader } from './MobileTopHeader';
import { MusicalPhotoBoothModal } from '../signals/MusicalPhotoBoothModal';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { CloudRhythmSignal } from '../../types';

interface Props {
  onOpenPaperWorkshop: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  onToggleStudio: () => void;
  lang?: 'fr' | 'pt';
}

export const MobileFieldToolsSheet: React.FC<Props> = ({
  onOpenPaperWorkshop,
  onToggleStudio,
}) => {
  const { lang, metadata } = useSequencer();
  const [isPhotoBoothOpen, setIsPhotoBoothOpen] = useState(false);

  return (
    <div className="w-full h-dvh flex flex-col bg-[#121212] text-[var(--cordel-text)] overflow-hidden select-none font-sans relative">
      <MobileTopHeader
        songTitle={metadata?.toada || 'Éditeur & Scan'}
        onOpenSongPicker={() => {}}
        onOpenMenu={() => {}}
        lang={lang}
      />

      <div className="flex-1 min-h-0 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)] pb-2">
          <span className="font-cactus font-bold text-sm uppercase tracking-wider text-[#b94a2c]">
            {lang === 'pt' ? 'Ferramentas de Terreno & Edição' : 'Outils de Terrain & Scan'}
          </span>
          <span className="text-[10px] text-[#f4ecd8]/70 font-sans">
            {lang === 'pt'
              ? 'Capture sinais visuais dos Mestres e digitalize partituras em papel.'
              : 'Capturez les signes de Mestres et scannez des partitions papier sur le vif.'}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onOpenPaperWorkshop('scanner')}
            className="p-4 bg-[#1a1a1a] cordel-border flex items-center justify-between text-left shadow-[2px_2px_0_var(--cordel-border)] hover:border-[#b94a2c] active:translate-y-0.5 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#b94a2c] text-[#f4ecd8] flex items-center justify-center rounded-xs">
                <FileText size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-cactus font-bold text-xs uppercase tracking-wide">
                  {lang === 'pt' ? 'Escanear Partitura' : 'Scanner une Partition'}
                </span>
                <span className="text-[10px] font-sans opacity-70">
                  {lang === 'pt' ? 'Ateliê papel & importação visual' : 'Atelier papier & reconnaissance de grille'}
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#b94a2c]" />
          </button>

          <button
            onClick={() => setIsPhotoBoothOpen(true)}
            className="p-4 bg-[#1a1a1a] cordel-border flex items-center justify-between text-left shadow-[2px_2px_0_var(--cordel-border)] hover:border-[#b94a2c] active:translate-y-0.5 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#d4a017] text-black flex items-center justify-center rounded-xs font-bold">
                <Camera size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-cactus font-bold text-xs uppercase tracking-wide">
                  {lang === 'pt' ? 'Foto Booth dos Sinais' : 'Signes du Mestre (Photo)'}
                </span>
                <span className="text-[10px] font-sans opacity-70">
                  {lang === 'pt' ? 'Fotografar sinais ao vivo' : 'Prendre en photo un signe de direction'}
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#b94a2c]" />
          </button>

          <button
            onClick={onToggleStudio}
            className="p-4 bg-[#1a1a1a] cordel-border flex items-center justify-between text-left shadow-[2px_2px_0_var(--cordel-border)] hover:border-[#b94a2c] active:translate-y-0.5 cursor-pointer mt-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#121212] text-[#f4ecd8] border border-[var(--cordel-border)] flex items-center justify-center rounded-xs">
                <Monitor size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-cactus font-bold text-xs uppercase tracking-wide">
                  {lang === 'pt' ? 'Modo Studio Completo' : 'Interface Studio Complète'}
                </span>
                <span className="text-[10px] font-sans opacity-70">
                  {lang === 'pt' ? 'Timeline, Roda e Mixer detalhado' : 'Timeline, Roda et console séquenceur'}
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#b94a2c]" />
          </button>
        </div>
      </div>

      {isPhotoBoothOpen && (
        <MusicalPhotoBoothModal
          isOpen={isPhotoBoothOpen}
          onClose={() => setIsPhotoBoothOpen(false)}
          onSave={(sig) => {
            const list = useSequencerStore.getState().mestreSignals || [];
            const newSig: CloudRhythmSignal = { ...sig, id: `sig_${Date.now()}`, mestreId: 'local' };
            useSequencerStore.setState({ mestreSignals: [...list, newSig] });
            setIsPhotoBoothOpen(false);
          }}
          lang={lang}
        />
      )}
    </div>
  );
};
