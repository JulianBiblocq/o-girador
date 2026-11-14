import React from 'react';
import { Globe, Monitor } from 'lucide-react';

interface SettingsSignalsBatchBarProps {
  lang: string;
  rhythmSignals: Array<{ id: string; isCloud: boolean }>;
  allSignalIds: string[];
  setSignalsBatch: (ids: string[], enable: boolean, allIds: string[]) => void;
}

export const SettingsSignalsBatchBar: React.FC<SettingsSignalsBatchBarProps> = ({
  lang,
  rhythmSignals,
  allSignalIds,
  setSignalsBatch,
}) => {
  const handleCloudBatch = (enable: boolean) => {
    const cloudIds = rhythmSignals.filter((s) => s.isCloud).map((s) => s.id);
    setSignalsBatch(cloudIds, enable, allSignalIds);
  };

  const handleLocalBatch = (enable: boolean) => {
    const localIds = rhythmSignals.filter((s) => !s.isCloud).map((s) => s.id);
    setSignalsBatch(localIds, enable, allSignalIds);
  };

  const btnStyle =
    'px-2.5 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition-colors';
  const btnDangerStyle =
    'px-2.5 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text-muted)] hover:bg-[var(--cordel-status-danger)] hover:text-[var(--cordel-on-accent)] cursor-pointer shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition-colors';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-2 border-[var(--cordel-border)] p-3 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
      <div className="flex flex-col gap-2">
        <span className="font-bold text-[10px] uppercase text-[var(--cordel-text)] flex items-center gap-1.5">
          <Globe size={13} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          <span>{lang === 'fr' ? 'Signaux Cloud' : 'Sinais Cloud'}</span>
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => handleCloudBatch(true)} className={btnStyle}>
            {lang === 'fr' ? 'Tout cocher' : 'Selecionar Todos'}
          </button>
          <button type="button" onClick={() => handleCloudBatch(false)} className={btnDangerStyle}>
            {lang === 'fr' ? 'Tout décocher' : 'Desmarcar Todos'}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-bold text-[10px] uppercase text-[var(--cordel-text)] flex items-center gap-1.5">
          <Monitor size={13} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          <span>{lang === 'fr' ? 'Signaux Locaux' : 'Sinais Locais'}</span>
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => handleLocalBatch(true)} className={btnStyle}>
            {lang === 'fr' ? 'Tout cocher' : 'Selecionar Todos'}
          </button>
          <button type="button" onClick={() => handleLocalBatch(false)} className={btnDangerStyle}>
            {lang === 'fr' ? 'Tout décocher' : 'Desmarcar Todos'}
          </button>
        </div>
      </div>
    </div>
  );
};
