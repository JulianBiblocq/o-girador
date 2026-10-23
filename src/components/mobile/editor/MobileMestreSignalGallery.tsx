import React, { useState, useEffect } from 'react';
import { CloudRhythmSignal } from '../../../types';
import { CordelOptions } from '../../../utils/cordelEffect';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useAuth } from '../../../contexts/AuthContext';
import { useSequencer } from '../../../contexts/SequencerContext';
import { fetchMestreSignals } from '../../../cloudSignals';
import { deleteMestreSignal } from '../../../services/cloud-signals/mestreSignalsMutations';
import { MobileMestreSignalCard } from './MobileMestreSignalCard';

interface Props {
  onSelectSignal: (signal: CloudRhythmSignal) => void;
  onCopyStyle: (options: CordelOptions) => void;
  selectedSignalId?: string | null;
  lang?: 'fr' | 'pt';
}

export const MobileMestreSignalGallery: React.FC<Props> = ({
  onSelectSignal, onCopyStyle, selectedSignalId, lang = 'pt',
}) => {
  const { confirmAsync } = useSequencer();
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
    const promptMsg = lang === 'fr' ? `Supprimer "${sig.name}" ?` : `Excluir "${sig.name}"?`;
    const ok = confirmAsync ? await confirmAsync(promptMsg) : true;
    if (!ok) return;
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
      {storeSignals.map((sig) => (
        <MobileMestreSignalCard
          key={sig.id}
          sig={sig}
          isSelected={selectedSignalId === sig.id}
          imgSrc={!imgErrors[sig.id] ? (sig.frames?.[0] || sig.image || sig.imageUrl || '') : ''}
          copiedId={copiedId}
          lang={lang}
          onSelectSignal={onSelectSignal}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onImgError={() => setImgErrors((p) => ({ ...p, [sig.id]: true }))}
        />
      ))}
    </div>
  );
};
