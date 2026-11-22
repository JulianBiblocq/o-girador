import React from 'react';
import { getPasteDisabledReason } from '../../../utils/patternPasteNormalizer';

export interface EditorPatternListFooterProps {
  isSlave: boolean;
  lang: 'fr' | 'pt';
  onAddPattern: () => void;
  canPaste: boolean;
  hasCopiedPattern: boolean;
  copiedInstId: string;
  onPasteAsNewPattern: () => void;
  copyAllTrackPatterns: (tId: number, name: string) => void;
  pasteAllTrackPatterns: (tId: number) => void;
  canPasteAll: boolean;
  hasBankClip: boolean;
  instrumentPatternsClipboard: any;
  effectiveTrackId: number;
  effectiveEditTrackId: number;
  instName: string;
}

export const EditorPatternListFooter: React.FC<EditorPatternListFooterProps> = React.memo((props) => {
  const {
    isSlave, lang, onAddPattern, canPaste, hasCopiedPattern, copiedInstId, onPasteAsNewPattern,
    copyAllTrackPatterns, pasteAllTrackPatterns, canPasteAll, hasBankClip,
    instrumentPatternsClipboard, effectiveTrackId, effectiveEditTrackId, instName,
  } = props;

  const pasteNewTitle = canPaste
    ? (lang === 'fr' ? 'Coller le motif copié comme nouveau motif' : 'Colar padrão copiado como novo padrão')
    : getPasteDisabledReason(hasCopiedPattern, canPaste, lang, copiedInstId);

  const sourceBankName = instrumentPatternsClipboard?.sourceName || instrumentPatternsClipboard?.instrumentName || '';
  const pasteAllTitle = canPasteAll
    ? (lang === 'fr' ? `Coller les motifs de "${sourceBankName}"` : `Colar padrões de "${sourceBankName}"`)
    : getPasteDisabledReason(hasBankClip, canPasteAll, lang, sourceBankName || instrumentPatternsClipboard?.sourceInstId);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-2 pointer-events-auto">
      {!isSlave && (
        <>
          <button
            type="button"
            onClick={() => onAddPattern?.()}
            className="self-start bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] cordel-border-sm cordel-button px-4 py-2 font-cactus font-bold text-sm cursor-pointer hover:bg-[var(--cordel-ink-dark)] hover:text-[var(--cordel-parchment-bg)] transition-colors"
          >
            + {lang === 'fr' ? 'Ajouter un motif' : 'Adicionar padrão'}
          </button>
          <button
            type="button"
            disabled={!canPaste}
            onClick={() => canPaste && onPasteAsNewPattern?.()}
            title={pasteNewTitle}
            className={`self-start bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] cordel-border-sm cordel-button px-4 py-2 font-cactus font-bold text-sm transition-colors ${canPaste ? 'cursor-pointer hover:bg-[var(--cordel-ink-dark)] hover:text-[var(--cordel-parchment-bg)]' : 'opacity-45 cursor-not-allowed'}`}
          >
            {lang === 'fr' ? 'Coller comme nouveau motif' : 'Colar como novo padrão'}
          </button>
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => copyAllTrackPatterns?.(effectiveTrackId, instName)}
          className="bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] cordel-border-sm cordel-button px-3 py-1.5 font-cactus font-bold text-xs cursor-pointer hover:bg-[var(--cordel-ink-dark)] hover:text-[var(--cordel-parchment-bg)] transition-colors"
          title={lang === 'fr' ? 'Copier tous les motifs' : 'Copiar todos'}
        >
          {lang === 'fr' ? 'Copier tous les motifs' : 'Copiar todos'}
        </button>
        <button
          type="button"
          disabled={!canPasteAll}
          onClick={() => canPasteAll && pasteAllTrackPatterns?.(effectiveEditTrackId)}
          title={pasteAllTitle}
          className={`bg-[var(--cordel-gold)] text-[var(--cordel-ink-dark)] cordel-border-sm cordel-button px-3 py-1.5 font-cactus font-bold text-xs transition-colors ${canPasteAll ? 'cursor-pointer hover:bg-[var(--cordel-ink-dark)] hover:text-[var(--cordel-parchment-bg)]' : 'opacity-45 cursor-not-allowed'}`}
        >
          {lang === 'fr'
            ? (sourceBankName ? `Coller banque "${sourceBankName}"` : 'Coller la banque')
            : (sourceBankName ? `Colar banco "${sourceBankName}"` : 'Colar banco')}
        </button>
      </div>
    </div>
  );
});

EditorPatternListFooter.displayName = 'EditorPatternListFooter';
