/**
 * Bouton Mono Check Master avec micro-icônes SVG Cordel (< 60 lignes).
 */
import React from 'react';

interface Props {
  isMasterMono: boolean;
  onToggle: () => void;
  lang: string;
  collapsed?: boolean;
}

export const MasterMonoCheckButton: React.FC<Props> = ({ isMasterMono, onToggle, lang, collapsed = false }) => {
  const title = lang === 'fr'
    ? 'Écoute témoin Mono (vérifier la compatibilité enceinte Bluetooth)'
    : 'Escuta Mono (verificar compatibilidade caixa Bluetooth)';

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title={title}
        className={`p-1 rounded-[2px] cursor-pointer border transition-colors ${
          isMasterMono
            ? 'bg-[var(--fx-disto-accent)] text-[var(--fx-active-text)] border-[var(--fx-active-text)]'
            : 'bg-transparent text-[var(--master-header-text)]/60 hover:text-[var(--master-header-text)] border-transparent'
        }`}
      >
        {isMasterMono ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /></svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="8.5" cy="12" r="5.5" /><circle cx="15.5" cy="12" r="5.5" /></svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      className={`py-1 px-2 font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 transition-colors cursor-pointer rounded-[2px] ${
        isMasterMono
          ? 'bg-[var(--fx-disto-accent)] text-[var(--fx-active-text)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)]'
          : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:opacity-90 border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)]'
      }`}
    >
      {isMasterMono ? (
        <>
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /></svg>
          <span>MONO</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="8.5" cy="12" r="5.5" /><circle cx="15.5" cy="12" r="5.5" /></svg>
          <span>STÉRÉO</span>
        </>
      )}
    </button>
  );
};
