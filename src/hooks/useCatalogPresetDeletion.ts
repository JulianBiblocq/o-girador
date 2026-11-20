/**
 * Hook de suppression directe d'un morceau du catalogue avec confirmation Cordel (< 60 lignes).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { deleteCloudPreset } from '../cloudPresetsStorage';
import { getActiveCloudPresetId, resetActiveCloudPresetId } from '../utils/cloudPresetState';
import { isMestreOrAdminProfile, canDeleteCatalogPreset } from '../utils/presetPermissions';

export function useCatalogPresetDeletion(lang: 'pt' | 'fr', _canEditProp = false) {
  const { userProfile, isAdmin, currentUser } = useAuth();
  const sequencer = useSequencer();
  const queryClient = useQueryClient();

  const effectiveProfile = userProfile
    ? { ...userProfile, uid: userProfile.uid || currentUser?.uid || '' }
    : (currentUser ? { uid: currentUser.uid } : null);
  const isMestreOrAdmin = isMestreOrAdminProfile(effectiveProfile, isAdmin);

  const canDeletePreset = (preset: { id: string; ownerId?: string }) =>
    canDeleteCatalogPreset(preset, effectiveProfile);

  const handleDeletePreset = async (preset: { id: string; name: string; ownerId?: string; audioUrl?: string | null }) => {
    if (!canDeleteCatalogPreset(preset, effectiveProfile)) return;

    const confirmMsg = lang === 'pt'
      ? `Excluir definitivamente "${preset.name}" do catálogo?`
      : `Supprimer définitivement "${preset.name}" du catalogue ?`;

    const confirmed = sequencer.confirmAsync ? await sequencer.confirmAsync(confirmMsg) : true;
    if (!confirmed) return;

    try {
      await deleteCloudPreset(preset.id, preset.audioUrl, isMestreOrAdmin);
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
