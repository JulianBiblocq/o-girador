import React, { useState, useEffect, useMemo } from 'react';
import { CloudRhythmSignal } from '../../../types';
import { CordelOptions } from '../../../utils/cordelEffect';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useAuth } from '../../../contexts/AuthContext';
import { useSequencer } from '../../../contexts/SequencerContext';
import { fetchMestreSignals } from '../../../cloudSignals';
import { deleteMestreSignal } from '../../../services/cloud-signals/mestreSignalsMutations';
import { MobileMestreSignalCard, GallerySignalItem } from './MobileMestreSignalCard';

interface Props {
  onSelectSignal: (signal: GallerySignalItem) => void;
  onCopyStyle: (options: CordelOptions) => void;
  selectedSignalId?: string | null;
  lang?: 'fr' | 'pt';
}

export const MobileMestreSignalGallery: React.FC<Props> = ({
  onSelectSignal, onCopyStyle, selectedSignalId, lang = 'pt',
}) => {
  const sequencer = useSequencer();
  const storeSignals = useSequencerStore((s) => s.mestreSignals);
  const setStoreSignals = useSequencerStore((s) => s.setMestreSignals);
  const localRhythmSignals = useSequencerStore((s) => s.metadata?.rhythmSignals);
  const { userProfile, currentUser } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const mId = userProfile?.mestreId || currentUser?.uid || 'global';
    let cancelled = false;
    fetchMestreSignals(mId).then(({ signals }) => {
      if (cancelled || !signals?.length) return;
      const current = useSequencerStore.getState().mestreSignals || [];
      const map = new Map<string, CloudRhythmSignal>();
      [...signals, ...current].forEach((s) => { if (s?.id) map.set(s.id, s); });
      setStoreSignals(Array.from(map.values()));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [userProfile?.mestreId, currentUser?.uid, setStoreSignals]);

  const gallerySignals = useMemo<GallerySignalItem[]>(() => {
    const map = new Map<string, GallerySignalItem>();
    (localRhythmSignals || []).forEach((loc) => {
      if (!loc?.id) return;
      map.set(loc.id, {
        ...loc,
        mestreId: 'local',
        imageUrl: loc.image,
        createdAt: 0,
        isLocalSignal: true,
      });
    });
    (storeSignals || []).forEach((cloud) => {
      if (!cloud?.id) return;
      map.set(cloud.id, { ...cloud, isLocalSignal: false });
    });
    return Array.from(map.values());
  }, [localRhythmSignals, storeSignals]);

  const handleDelete = async (e: React.MouseEvent, sig: GallerySignalItem) => {
    e.stopPropagation();
    const promptMsg = lang === 'fr' ? `Supprimer "${sig.name}" ?` : `Excluir "${sig.name}"?`;
    const ok = sequencer?.confirmAsync ? await sequencer.confirmAsync(promptMsg) : true;
    if (!ok) return;

    if (sig.isLocalSignal) {
      const st = useSequencerStore.getState();
      if (st.metadata) {
        st.setMetadata({
          ...st.metadata,
          rhythmSignals: (st.metadata.rhythmSignals || []).filter((s) => s.id !== sig.id),
        });
      }
      return;
    }

    setStoreSignals((useSequencerStore.getState().mestreSignals || []).filter((s) => s.id !== sig.id));
    if (sig.mestreId && sig.mestreId !== 'local') {
      await deleteMestreSignal(sig.id, sig.mestreId);
    }
  };

  const handleCopy = (e: React.MouseEvent, sig: GallerySignalItem) => {
    e.stopPropagation();
    if (sig.cordelOptions) {
      onCopyStyle(sig.cordelOptions);
      setCopiedId(sig.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  if (!gallerySignals.length) {
    return (
      <div className="p-4 text-center text-xs text-[var(--cordel-text-muted)] font-cactus uppercase border-2 border-dashed border-[var(--cordel-border)] bg-[var(--cordel-surface)]">
        {lang === 'fr' ? 'Aucun signe enregistré (Local ou Cloud).' : 'Nenhum sinal salvo (Local ou Cloud).'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full select-none">
      {gallerySignals.map((sig) => (
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
