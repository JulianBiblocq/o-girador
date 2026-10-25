/**
 * Hook de suppression directe d'un morceau du catalogue avec confirmation Cordel (< 65 lignes).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { deleteCloudPreset, SANCTUARIZED_PRESET_IDS } from '../cloudPresetsStorage';
import { getActiveCloudPresetId, resetActiveCloudPresetId } from '../utils/cloudPresetState';

export function useCatalogPresetDeletion(lang: 'pt' | 'fr') {
  const { userProfile, isAdmin } = useAuth();
  const sequencer = useSequencer();
  const queryClient = useQueryClient();
  const currentUid = userProfile?.uid;

  const canDeletePreset = (preset: { id: string; ownerId?: string }) => {
    if (SANCTUARIZED_PRESET_IDS.has(preset.id)) return false;
    return Boolean(isAdmin || (currentUid && preset.ownerId === currentUid));
  };

  const handleDeletePreset = async (preset: { id: string; name: string; audioUrl?: string | null }) => {
    if (SANCTUARIZED_PRESET_IDS.has(preset.id)) return;

    const confirmMsg = lang === 'pt'
      ? `Excluir definitivamente "${preset.name}" do catálogo?`
      : `Supprimer définitivement "${preset.name}" du catalogue ?`;

    const confirmed = sequencer.confirmAsync ? await sequencer.confirmAsync(confirmMsg) : true;
    if (!confirmed) return;

    try {
      await deleteCloudPreset(preset.id, preset.audioUrl);
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
