import React from 'react';
import { Sliders, FolderOpen } from 'lucide-react';

export interface VocalClipInspectorSectionProps {
  isFr: boolean;
  hasVocalRecording: boolean;
  onOpenAlignment?: () => void;
  onImportAudio?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const VocalClipInspectorSection: React.FC<VocalClipInspectorSectionProps> = React.memo(({
  isFr, hasVocalRecording, onOpenAlignment, onImportAudio,
}) => {
  return (
    <div className="flex flex-col gap-2 p-2.5 bg-[var(--cordel-parchment-bg)] border-2 border-[var(--cordel-ink-dark)] rounded-sm shadow-[2px_2px_0px_var(--cordel-ink-dark)] select-none mb-3">
      <div className="flex items-center justify-between border-b border-[var(--cordel-ink-dark)]/15 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-ink-dark)]/70">
          {isFr ? 'Audio du motif' : 'Áudio do padrão'}
        </span>
        <span className="text-[10px] font-mono font-bold text-[var(--cordel-wood)]">
          {hasVocalRecording ? (isFr ? 'Enregistré' : 'Gravado') : (isFr ? 'Aucun' : 'Nenhum')}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {hasVocalRecording ? (
          <button
            type="button"
            onClick={onOpenAlignment}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-[var(--cordel-parchment-bg)] hover:bg-[var(--cordel-parchment-surface)] border-2 border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] rounded text-xs font-bold font-cactus text-[var(--cordel-ink-dark)] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
            title={isFr ? 'Ajuster le calage, trim et tempo du sample audio' : 'Ajustar alinhamento, trim e andamento'}
          >
            <Sliders size={13} className="text-[var(--cordel-wood)]" />
            <span>{isFr ? 'Ajuster le calage' : 'Ajustar alinhamento'}</span>
          </button>
        ) : (
          <label className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-[var(--cordel-parchment-bg)] hover:bg-[var(--cordel-parchment-surface)] border-2 border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] rounded text-xs font-bold font-cactus text-[var(--cordel-ink-dark)] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5">
            <FolderOpen size={13} className="text-[var(--cordel-wood)]" />
            <span>{isFr ? 'Importer un audio' : 'Importar áudio'}</span>
            <input type="file" accept="audio/*" onChange={onImportAudio} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
});

VocalClipInspectorSection.displayName = 'VocalClipInspectorSection';
