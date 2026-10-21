import React, { useState, useEffect } from 'react';
import { Pencil, Copy, Trash2, Check } from 'lucide-react';
import { CloudRhythmSignal } from '../../../types';
import { CordelOptions } from '../../../utils/cordelEffect';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchMestreSignals } from '../../../cloudSignals';
import { deleteMestreSignal } from '../../../services/cloud-signals/mestreSignalsMutations';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  onSelectSignal: (signal: CloudRhythmSignal) => void;
  onCopyStyle: (options: CordelOptions) => void;
  selectedSignalId?: string | null;
  lang?: 'fr' | 'pt';
}

export const MobileMestreSignalGallery: React.FC<Props> = ({
  onSelectSignal, onCopyStyle, selectedSignalId, lang = 'pt',
}) => {
  const storeSignals = useSequencerStore((s) => s.mestreSignals);
  const setStoreSignals = useSequencerStore((s) => s.setMestreSignals);
  const { userProfile, currentUser } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const mId = userProfile?.mestreId || currentUser?.uid;
    if (!mId) return;
    fetchMestreSignals(mId).then(({ signals }) => {
      if (signals?.length) {
        const map = new Map<string, CloudRhythmSignal>();
        [...signals, ...storeSignals].forEach((s) => map.set(s.id, s));
        setStoreSignals(Array.from(map.values()));
      }
    });
  }, [userProfile?.mestreId, currentUser?.uid]);

  const handleDelete = async (e: React.MouseEvent, sig: CloudRhythmSignal) => {
    e.stopPropagation();
    if (!window.confirm(lang === 'fr' ? `Supprimer "${sig.name}" ?` : `Excluir "${sig.name}"?`)) return;
    setStoreSignals(storeSignals.filter((s) => s.id !== sig.id));
    if (sig.mestreId) await deleteMestreSignal(sig.id, sig.mestreId);
  };

  const handleCopy = (e: React.MouseEvent, sig: CloudRhythmSignal) => {
    e.stopPropagation();
    if (sig.cordelOptions) {
      onCopyStyle(sig.cordelOptions); setCopiedId(sig.id); setTimeout(() => setCopiedId(null), 1500);
    }
  };

  if (!storeSignals.length) {
    return (
      <div className="p-4 text-center text-xs opacity-60 font-cactus uppercase border border-dashed border-[var(--cordel-border)]">
        {lang === 'fr' ? 'Aucun signe enregistré.' : 'Nenhum sinal salvo.'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full select-none">
      {storeSignals.map((sig) => {
        const isSelected = selectedSignalId === sig.id;
        const framesCount = sig.frames?.length || sig.beatsCount || 1;
        const imgSrc = !imgErrors[sig.id] ? (sig.frames?.[0] || sig.image || sig.imageUrl) : '';

        return (
          <div
            key={sig.id}
            onClick={() => onSelectSignal(sig)}
            className={`p-1.5 flex flex-col gap-1 bg-[var(--cordel-surface)] border-2 transition-all cursor-pointer shadow-[2px_2px_0px_var(--cordel-border)] ${
              isSelected ? 'border-[#8b2a1a] ring-2 ring-[#8b2a1a]/30' : 'border-[var(--cordel-border)] hover:border-[#8b2a1a]'
            }`}
          >
            {/* Miniature carrée */}
            <div className="relative aspect-square w-full bg-[var(--cordel-card-btn-bg)] border border-[var(--cordel-border)] overflow-hidden flex items-center justify-center">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={sig.name}
                  onError={() => setImgErrors((p) => ({ ...p, [sig.id]: true }))}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="font-cactus font-bold text-lg text-[var(--cordel-text)] opacity-40">
                  {sig.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              {/* Badge 1T / 4T */}
              <span className="absolute top-1 left-1 px-1 py-0.5 font-mono font-bold text-[9px] bg-black/75 text-white">
                {framesCount > 1 ? `${framesCount}T` : '1T'}
              </span>
            </div>

            {/* Nom du signe */}
            <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-text)] truncate">
              {sig.name}
            </span>

            {/* Actions rapides */}
            <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-[var(--cordel-border)]/30">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelectSignal(sig); }}
                className="flex-1 py-0.5 px-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 hover:border-[#8b2a1a]"
                title={tMobile(lang, 'editSignal')}
              >
                <Pencil size={10} /> <span>{tMobile(lang, 'editSignal')}</span>
              </button>

              {sig.cordelOptions && (
                <button
                  type="button"
                  onClick={(e) => handleCopy(e, sig)}
                  className={`p-1 border border-[var(--cordel-border)] cursor-pointer ${
                    copiedId === sig.id ? 'bg-[#15803d] text-white' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:border-[#8b2a1a]'
                  }`}
                  title={copiedId === sig.id ? tMobile(lang, 'styleApplied') : tMobile(lang, 'copyStyle')}
                >
                  {copiedId === sig.id ? <Check size={11} /> : <Copy size={11} />}
                </button>
              )}

              <button
                type="button"
                onClick={(e) => handleDelete(e, sig)}
                className="p-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:text-red-600 border border-[var(--cordel-border)] cursor-pointer"
                title="Supprimer"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
