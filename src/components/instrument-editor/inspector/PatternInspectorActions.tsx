import React from 'react';
import { Copy, Download, CloudUpload, FolderOpen } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { getPasteDisabledReason } from '../../../utils/patternPasteNormalizer';
import { ImportToadaButton } from '../../ImportToadaButton';
import { AtelierVocalButton } from '../../AtelierVocalButton';
import { ExportBaqueBounceButton } from '../../ExportBaqueBounceButton';

export interface PatternInspectorActionsProps {
  isFr: boolean;
  activePattern: any;
  canPaste: boolean;
  isVoice?: boolean;
  onCopyPattern?: () => void;
  onPastePattern?: () => void;
  onSavePattern?: () => void;
  onLoadPattern?: () => void;
}

const BTN_ACTIVE_CLS = 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)]/10 active:scale-95 cursor-pointer';
const BTN_DISABLED_CLS = 'bg-[var(--cordel-parchment-panel)] text-[var(--cordel-text-muted)] border-[var(--cordel-ink-dark)]/30 cursor-not-allowed opacity-50';

export const PatternInspectorActions: React.FC<PatternInspectorActionsProps> = React.memo(({
  isFr, activePattern, canPaste, isVoice = false, onCopyPattern, onPastePattern, onSavePattern, onLoadPattern,
}) => {
  const hasCopiedPattern = useSequencerStore((s) => Boolean(s.copiedPattern && s.copiedPattern.steps > 0));
  const copiedInstId = useSequencerStore((s) => s.copiedPattern?.sourceInstId || '');
  const isPasteEnabled = Boolean(canPaste && activePattern);
  const pasteTitle = isPasteEnabled
    ? (isFr ? 'Coller le motif copié' : 'Colar o padrão copiado')
    : (getPasteDisabledReason(hasCopiedPattern, canPaste, isFr ? 'fr' : 'pt', copiedInstId) || (isFr ? 'Coller le motif copié' : 'Colar o padrão copiado'));

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        onClick={onCopyPattern}
        disabled={!activePattern}
        className={`flex items-center justify-center gap-1.5 px-2 py-1 border text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_var(--cordel-ink-dark)] transition-all ${activePattern ? BTN_ACTIVE_CLS : BTN_DISABLED_CLS}`}
        title={isFr ? 'Copier ce motif' : 'Copiar este padrão'}
      >
        <Copy size={12} />
        <span>{isFr ? 'Copier' : 'Copiar'}</span>
      </button>

      <button
        type="button"
        onClick={onPastePattern}
        disabled={!isPasteEnabled}
        className={`flex items-center justify-center gap-1.5 px-2 py-1 text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_var(--cordel-ink-dark)] border transition-all ${
          isPasteEnabled ? BTN_ACTIVE_CLS : BTN_DISABLED_CLS
        }`}
        title={pasteTitle}
      >
        <Download size={12} />
        <span>{isFr ? 'Coller' : 'Colar'}</span>
      </button>

      {isVoice ? (
        <>
          <ImportToadaButton lang={isFr ? 'fr' : 'pt'} className="w-full justify-center" />
          <AtelierVocalButton lang={isFr ? 'fr' : 'pt'} className="w-full justify-center" />
          <ExportBaqueBounceButton lang={isFr ? 'fr' : 'pt'} className="col-span-2 w-full justify-center" />
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onSavePattern}
            disabled={!activePattern}
            className={`flex items-center justify-center gap-1.5 px-2 py-1 border text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_var(--cordel-ink-dark)] transition-all ${activePattern ? BTN_ACTIVE_CLS : BTN_DISABLED_CLS}`}
            title={isFr ? 'Sauvegarder ce motif dans le catalogue cloud' : 'Salvar este padrão no catálogo nuvem'}
          >
            <CloudUpload size={12} />
            <span>{isFr ? 'Sauvegarder' : 'Salvar'}</span>
          </button>

          <button
            type="button"
            onClick={onLoadPattern}
            disabled={!activePattern}
            className={`flex items-center justify-center gap-1.5 px-2 py-1 border text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_var(--cordel-ink-dark)] transition-all ${activePattern ? BTN_ACTIVE_CLS : BTN_DISABLED_CLS}`}
            title={isFr ? 'Charger un motif depuis le catalogue' : 'Carregar padrão do catálogo'}
          >
            <FolderOpen size={12} />
            <span>{isFr ? 'Charger' : 'Carregar'}</span>
          </button>
        </>
      )}
    </div>
  );
});

PatternInspectorActions.displayName = 'PatternInspectorActions';
