import React, { useState } from 'react';
import { Camera, FileText, Video, X, ChevronUp } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { RightSidebarYouTubePreview } from '../right-sidebar/RightSidebarYouTubePreview';

interface Props {
  onOpenPaperWorkshop: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  onOpenPhotoBooth: () => void;
}

export const MobileFieldToolsSheet: React.FC<Props> = ({
  onOpenPaperWorkshop,
  onOpenPhotoBooth,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const metadata = useSequencerStore((s) => s.metadata);
  const letras = useSequencerStore((s) => s.letras);
  const lang = useSequencerStore((s) => s.lang);

  const youtubeUrl = (metadata as any)?.youtubeUrl || (metadata as any)?.link || '';

  if (!isOpen) {
    return (
      <div className="w-full px-3 py-1 flex justify-center bg-[var(--cordel-bg)] shrink-0">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-1.5 px-3 cordel-border-sm bg-black/5 text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 hover:bg-black/10 transition-colors"
        >
          <ChevronUp size={14} />
          <span>📸 Terrain & Médias (Scan Papier, Signes, Vidéo)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end backdrop-blur-xs select-none">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-t-4 border-[var(--cordel-border)] max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="p-3 border-b-2 border-[var(--cordel-border)] flex items-center justify-between bg-black/5">
          <span className="font-cactus font-bold text-base uppercase flex items-center gap-2">
            📸 Outils Terrain & Médias
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 cordel-border-sm bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-bold"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3 overflow-y-auto flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenPaperWorkshop('scanner');
              }}
              className="p-3 cordel-border-sm bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-left flex flex-col gap-1 transition-colors"
            >
              <div className="flex items-center gap-1.5 font-cactus font-bold text-sm">
                <Camera size={16} className="text-[#8b2a1a]" />
                <span>Scanner Partition</span>
              </div>
              <span className="text-[10px] opacity-75 leading-tight">
                Prendre en photo la fiche papier pour injecter les motifs.
              </span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenPhotoBooth();
              }}
              className="p-3 cordel-border-sm bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-left flex flex-col gap-1 transition-colors"
            >
              <div className="flex items-center gap-1.5 font-cactus font-bold text-sm">
                <Video size={16} className="text-[#d35400]" />
                <span>Signe de Mestre</span>
              </div>
              <span className="text-[10px] opacity-75 leading-tight">
                Photographier un signe corporel pour les repères.
              </span>
            </button>
          </div>

          {youtubeUrl && (
            <div className="cordel-border-sm p-2 bg-black/5 flex flex-col gap-1">
              <span className="font-cactus font-bold text-xs uppercase flex items-center gap-1">
                📹 Vidéo de référence
              </span>
              <RightSidebarYouTubePreview youtubeUrl={youtubeUrl} lang={lang} />
            </div>
          )}

          {letras && (
            <div className="cordel-border-sm p-2.5 bg-black/5 flex flex-col gap-1 max-h-40 overflow-y-auto">
              <span className="font-cactus font-bold text-xs uppercase flex items-center gap-1">
                <FileText size={13} /> Paroles de la Toada
              </span>
              <pre className="font-serif text-xs whitespace-pre-wrap opacity-90 leading-relaxed">
                {letras}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
