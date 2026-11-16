import React from 'react';
import { GroupedSignalItem } from '../../utils/signals/batchPhotoProcessor';

interface PhotoBatchImporterFooterProps {
  lang: 'fr' | 'pt';
  processedSignals: GroupedSignalItem[];
  onClose: () => void;
  onSaveBatch: (signals: GroupedSignalItem[]) => void;
}

export const PhotoBatchImporterFooter: React.FC<PhotoBatchImporterFooterProps> = ({
  lang,
  processedSignals,
  onClose,
  onSaveBatch,
}) => (
  <div className="flex flex-col">
    {processedSignals.length > 0 && (
      <div className="px-4 pb-3 flex flex-col gap-2">
        <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-accent-readable)]">
          {processedSignals.length} {lang === 'fr' ? 'signaux prêts :' : 'sinais prontos :'}
        </span>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 bg-[var(--cordel-surface-muted)] border border-[var(--cordel-border)]">
          {processedSignals.map((s, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 bg-[var(--cordel-bg)] p-1 border border-[var(--cordel-border)]">
              <img src={s.image} alt={s.name} className="w-14 h-14 object-cover border border-[var(--cordel-border)]" />
              <span className="text-[9px] font-bold truncate max-w-full">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="p-3 bg-[var(--cordel-surface-muted)] border-t-2 border-[var(--cordel-border-strong)] flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-1.5 font-bold uppercase border border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-surface-elevated)] cursor-pointer"
      >
        {lang === 'fr' ? 'Annuler' : 'Cancelar'}
      </button>
      {processedSignals.length > 0 && (
        <button
          type="button"
          onClick={() => { onSaveBatch(processedSignals); onClose(); }}
          className="px-4 py-1.5 font-cactus font-bold uppercase border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)]"
        >
          {lang === 'fr' ? `Valider l'import (${processedSignals.length})` : `Confirmar importação (${processedSignals.length})`}
        </button>
      )}
    </div>
  </div>
);
