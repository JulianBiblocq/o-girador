/**
 * CloudToadaPickerModal.tsx
 * Modale Cordel pour sélectionner une Toada publiée depuis Cantador (< 130 lignes).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, Search, Music, X, Loader2, ArrowRight } from 'lucide-react';
import { fetchCloudToadas, fetchCloudToadaById, type CloudToadaSummary } from '../services/cloudToadas';

interface CloudToadaPickerModalProps {
  isOpen: boolean;
  onSelectToada: (pack: any) => void;
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

export const CloudToadaPickerModal: React.FC<CloudToadaPickerModalProps> = ({
  isOpen,
  onSelectToada,
  onClose,
  lang = 'fr',
}) => {
  const [toadas, setToadas] = useState<CloudToadaSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetchCloudToadas()
      .then((res) => setToadas(res))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return toadas;
    return toadas.filter((t) => t.title.toLowerCase().includes(q) || (t.nacao && t.nacao.toLowerCase().includes(q)));
  }, [toadas, search]);

  const handlePick = async (summary: CloudToadaSummary) => {
    setLoadingId(summary.id);
    try {
      const full = await fetchCloudToadaById(summary.id);
      if (full) {
        onSelectToada(full);
        onClose();
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-xs select-none p-4" onClick={onClose}>
      <div
        className="w-full max-w-[520px] bg-[var(--cordel-bg,#f4ecd8)] text-[var(--cordel-text,#1a1a1a)] border-2 border-[var(--cordel-border,#1a1a1a)] shadow-[6px_6px_0px_var(--cordel-border,#1a1a1a)] font-cactus p-5 flex flex-col gap-3.5 max-h-[85vh] animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border,#1a1a1a)] pb-2">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#9a3412]" />
            <h2 className="text-base font-black uppercase tracking-wider">
              {lang === 'fr' ? 'Toadas Cloud (Cantador)' : 'Toadas na Nuvem (Cantador)'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-[#1a1a1a]/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'fr' ? 'Rechercher une Toada...' : 'Buscar Toada...'}
            className="w-full pl-8 pr-3 py-1.5 text-xs font-cactus bg-transparent border border-[var(--cordel-border,#1a1a1a)] outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-[180px] max-h-[380px] pr-1 cordel-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 opacity-70">
              <Loader2 className="w-6 h-6 animate-spin text-[#9a3412]" />
              <span className="text-xs">{lang === 'fr' ? 'Chargement des toadas...' : 'Carregando toadas...'}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 opacity-60 text-xs">
              {lang === 'fr' ? 'Aucune toada trouvée dans le Cloud.' : 'Nenhuma toada encontrada na nuvem.'}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={loadingId !== null}
                onClick={() => handlePick(item)}
                className="w-full text-left p-2.5 border border-[var(--cordel-border,#1a1a1a)] bg-[#1a1a1a]/5 hover:bg-[#9a3412]/15 transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-[#9a3412] shrink-0" />
                    <span className="font-bold text-xs truncate uppercase tracking-wide group-hover:text-[#9a3412]">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] opacity-75">
                    {item.bpm && <span>{item.bpm} BPM</span>}
                    <span>• {item.patternsCount} {lang === 'fr' ? 'patterns' : 'padrões'}</span>
                    {item.nacao && <span>• {item.nacao}</span>}
                  </div>
                </div>
                {loadingId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#9a3412] shrink-0" />
                ) : (
                  <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
