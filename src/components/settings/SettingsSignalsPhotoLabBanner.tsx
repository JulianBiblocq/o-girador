import React, { useState } from 'react';
import { Camera, Images, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { isStudioPrivilegedProfile } from '../../utils/viewModeResolver';
import { uploadMestreSignal } from '../../cloudSignals';
import { notifyToast } from '../../utils/toastHelper';
import { MusicalPhotoBoothModal } from '../signals/MusicalPhotoBoothModal';

interface SettingsSignalsPhotoLabBannerProps {
  lang: 'fr' | 'pt';
  refreshMestreSignals?: () => void | Promise<void>;
}

export const SettingsSignalsPhotoLabBanner: React.FC<SettingsSignalsPhotoLabBannerProps> = ({
  lang,
  refreshMestreSignals,
}) => {
  const isPt = lang === 'pt';
  const { userProfile, isAdmin } = useAuth();
  const bpm = useSequencerStore((s) => s.bpm || 90);
  const [isLabOpen, setIsLabOpen] = useState(false);
  const [labTab, setLabTab] = useState<'capture' | 'gallery'>('capture');
  const [isSaving, setIsSaving] = useState(false);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const canCreateSignals = isLocalhost || isStudioPrivilegedProfile(userProfile, isAdmin);
  if (!canCreateSignals) return null;

  const openLab = (tab: 'capture' | 'gallery') => {
    setLabTab(tab);
    setIsLabOpen(true);
  };

  const handleSaveFromLab = async (signalData: any) => {
    setIsSaving(true);
    try {
      if (signalData.id) {
        await refreshMestreSignals?.();
        notifyToast(isPt ? 'Sinal atualizado!' : 'Signal mis à jour !', 'success');
        return;
      }
      const mestreId = userProfile?.mestreId || userProfile?.uid;
      if (mestreId) {
        const res = await uploadMestreSignal(
          mestreId, signalData.name, signalData.image, signalData.frames,
          signalData.beatsCount, signalData.mirrorHorizontal, signalData.rawFrames,
          signalData.cordelOptions, signalData.frameOverrides
        );
        if (res.success) {
          await refreshMestreSignals?.();
          notifyToast(isPt ? 'Sinal Cloud salvo!' : 'Signal Cloud enregistré !', 'success');
          return;
        }
      }
      const curMeta = useSequencerStore.getState().metadata || { toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] };
      const localEntry = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: signalData.name || (isPt ? 'Sinal' : 'Signal'),
        image: signalData.image,
        frames: signalData.frames,
        beatsCount: signalData.beatsCount,
      };
      useSequencerStore.getState().setMetadata({
        ...curMeta,
        rhythmSignals: [...(curMeta.rhythmSignals || []), localEntry],
      });
      notifyToast(isPt ? 'Sinal adicionado ao projeto!' : 'Signal ajouté au morceau !', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-3 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] shadow-[3px_3px_0_var(--cordel-shadow-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="min-w-0">
        <div className="font-cactus font-bold text-xs uppercase text-[var(--cordel-text)] flex items-center gap-1.5">
          <Camera size={14} className="shrink-0 text-[var(--cordel-accent-readable)]" />
          <span>{isPt ? 'Labo Foto & Gravura Cordel dos Sinais' : 'Labo Photo & Gravure Cordel des Signes'}</span>
          {isSaving && <Loader2 size={13} className="animate-spin text-[var(--cordel-accent-readable)]" />}
        </div>
        <p className="text-[11px] text-[var(--cordel-text-muted)] leading-snug mt-0.5">
          {isPt
            ? 'Fotografe novos gestos do Mestre ou edite / importe lotes sem sair d\'A Oficina.'
            : 'Capturez de nouveaux gestes du Mestre ou éditez / importez des lots directement depuis A Oficina.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => openLab('capture')}
          className="px-3 py-1.5 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] font-cactus font-bold text-[11px] uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_var(--cordel-shadow-color)]"
        >
          <Camera size={13} /> <span>{isPt ? 'Abrir Labo Foto' : 'Ouvrir le Labo Photo'}</span>
        </button>
        <button
          type="button"
          onClick={() => openLab('gallery')}
          className="px-3 py-1.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] font-cactus font-bold text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
        >
          <Images size={13} /> <span>{isPt ? 'Galeria & Lotes' : 'Galerie & Lots'}</span>
        </button>
      </div>
      <MusicalPhotoBoothModal
        isOpen={isLabOpen}
        onClose={() => setIsLabOpen(false)}
        onSave={(sig) => { void handleSaveFromLab(sig); }}
        initialBpm={bpm}
        initialTab={labTab}
        lang={lang}
      />
    </div>
  );
};
