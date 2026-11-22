import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useWizardStore } from '../../../stores/useWizardStore';
import { useDispositionStore } from '../../../stores/useDispositionStore';
import { DispositionVisibility, PlacedInstrumentConfig } from '../../../types/disposition.types';
import { isLegacySamambaiaGroup } from '../../../utils/tenantGroupHelpers';
import { guardFeatureWithModal } from '../../../utils/cloudWriteGuard';

interface UseSaveDispositionParams {
  lang: 'fr' | 'pt';
  onSuccess?: (presetName: string) => void;
  onClose: () => void;
}

export function useSaveDispositionAction({ lang, onSuccess, onClose }: UseSaveDispositionParams) {
  const { userProfile, isAdmin, currentUser } = useAuth();
  const placedInstruments = useWizardStore((state) => state.placedInstruments);
  const hasToada = useWizardStore((state) => state.hasToada);
  const addDisposition = useDispositionStore((state) => state.addDisposition);

  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<DispositionVisibility>(() => {
    if (userProfile?.groupId || (userProfile as any)?.canWriteSequenciador) return 'mestre_group';
    return 'private';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMestreOrAdmin =
    isAdmin ||
    userProfile?.role === 'mestre' ||
    (userProfile as any)?.dbRole === 'mestre' ||
    Boolean((userProfile as any)?.canWriteSequenciador);

  const hasGroup = Boolean(userProfile?.groupId || (userProfile as any)?.canWriteSequenciador);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardFeatureWithModal('cloud_library', userProfile, Boolean(currentUser || userProfile?.uid))) {
      onClose();
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg(lang === 'fr' ? 'Veuillez donner un nom à la disposition.' : 'Por favor, dê um nome à disposição.');
      return;
    }
    if (placedInstruments.length === 0) {
      setErrorMsg(lang === 'fr' ? 'Aucun instrument placé sur la scène.' : 'Nenhum instrumento colocado no palco.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const cleanedInstruments: PlacedInstrumentConfig[] = placedInstruments.map((inst) => ({
        instrumentType: inst.instrumentType,
        x: Math.round(inst.x * 10) / 10,
        y: Math.round(inst.y * 10) / 10,
      }));

      const ownerId = userProfile?.uid || currentUser?.uid || 'local';
      const authorName = userProfile?.displayName || (ownerId === 'local' ? 'Local' : 'Mestre');
      const canWrite = Boolean((userProfile as any)?.canWriteSequenciador);
      const rawGroupId = userProfile?.groupId ? String(userProfile.groupId).trim() : null;
      const groupId = rawGroupId
        ? (isLegacySamambaiaGroup(rawGroupId) ? 'samambaia' : rawGroupId.toLowerCase())
        : null;

      await addDisposition(
        {
          name: trimmedName,
          ownerId,
          authorId: ownerId,
          authorName,
          groupId,
          visibility,
          instruments: cleanedInstruments,
          hasToada: Boolean(hasToada),
        },
        userProfile?.role,
        canWrite
      );

      setName('');
      onSuccess?.(trimmedName);
      onClose();
    } catch (err: any) {
      console.error('Erreur sauvegarde disposition:', err);
      setErrorMsg(err?.message || (lang === 'fr' ? 'Une erreur est survenue lors de la sauvegarde.' : 'Ocorreu um erro ao salvar.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    name, setName, visibility, setVisibility, isSubmitting, errorMsg,
    handleSave, hasGroup, isMestreOrAdmin, userProfile, placedInstruments, hasToada,
  };
}
