/**
 * Hook de suppression directe d'un morceau du catalogue avec confirmation Cordel (< 65 lignes).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { deleteCloudPreset } from '../cloudPresetsStorage';
import { getActiveCloudPresetId, resetActiveCloudPresetId } from '../utils/cloudPresetState';

export function useCatalogPresetDeletion(lang: 'pt' | 'fr', canEditProp = false) {
  const { userProfile, isAdmin, currentUser } = useAuth();
  const sequencer = useSequencer();
  const queryClient = useQueryClient();
  const currentUid = userProfile?.uid || currentUser?.uid;

  const isMestre = Boolean(
    userProfile?.role === 'mestre' ||
    (userProfile as any)?.dbRole === 'mestre' ||
    userProfile?.uid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
    currentUser?.uid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1'
  );
  const isSuperMestre = Boolean(isAdmin || (userProfile?.role as string) === 'super-admin' || userProfile?.role === 'admin');
  const isEditor = Boolean(canEditProp || isSuperMestre || isMestre || userProfile?.canWriteSequenciador);

  const canDeletePreset = (preset: { id: string; ownerId?: string }) => {
    if (isEditor) return true;
    return Boolean(currentUid && preset.ownerId === currentUid);
  };

  const handleDeletePreset = async (preset: { id: string; name: string; audioUrl?: string | null }) => {
    const canDelete = isEditor || Boolean(currentUid && (preset as any).ownerId === currentUid);
    if (!canDelete) return;

    const confirmMsg = lang === 'pt'
      ? `Excluir definitivamente "${preset.name}" do catálogo?`
      : `Supprimer définitivement "${preset.name}" du catalogue ?`;

    const confirmed = sequencer.confirmAsync ? await sequencer.confirmAsync(confirmMsg) : true;
    if (!confirmed) return;

    try {
      await deleteCloudPreset(preset.id, preset.audioUrl, isEditor);
      if (getActiveCloudPresetId() === preset.id) {
        resetActiveCloudPresetId();
      }
      await queryClient.invalidateQueries({ queryKey: ['cloudPresets'] });
      const successMsg = lang === 'pt'
        ? `"${preset.name}" foi excluído com sucesso.`
        : `"${preset.name}" a été supprimé avec succès.`;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: successMsg } }));
    } catch (err: any) {
      console.error('[useCatalogPresetDeletion] Erreur suppression :', err);
      const errMsg = (lang === 'pt' ? 'Erro ao excluir : ' : 'Erreur lors de la suppression : ') + (err?.message || String(err));
      if (sequencer.alertAsync) await sequencer.alertAsync(errMsg);
      else window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: errMsg } }));
    }
  };

  return { canDeletePreset, handleDeletePreset };
}
