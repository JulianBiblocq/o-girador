import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { togglePresetShowcaseStatus } from '../../cloudLibrary';
import { isSuperAdminProfile } from '../../utils/userPreferencesStorage';
import { notifyToast } from '../../utils/toastHelper';

export function useShowcaseToggle(lang: 'fr' | 'pt') {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = isSuperAdminProfile(userProfile);

  const handleToggleShowcase = useCallback(
    async (presetId: string, currentShowcase: boolean) => {
      if (!isSuperAdmin || !presetId || presetId.startsWith('embedded:')) return;
      const nextShowcase = !currentShowcase;

      queryClient.setQueriesData({ queryKey: ['cloudPresets'] }, (oldData: unknown) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((p: any) =>
          p.id === presetId
            ? { ...p, isShowcase: nextShowcase, ...(nextShowcase ? { visibility: 'admin_global', isDraft: false } : {}) }
            : p
        );
      });

      try {
        await togglePresetShowcaseStatus(presetId, currentShowcase, userProfile);
        notifyToast(
          nextShowcase
            ? (lang === 'pt' ? 'Adicionado à Vitrine de Descoberta' : 'Ajouté à la Vitrine Découverte')
            : (lang === 'pt' ? 'Removido da Vitrine de Descoberta' : 'Retiré de la Vitrine Découverte'),
          'info'
        );
      } catch (err: any) {
        notifyToast(err?.message || (lang === 'pt' ? 'Erro ao atualizar Vitrine' : 'Erreur Vitrine Découverte'), 'error');
      } finally {
        await queryClient.invalidateQueries({ queryKey: ['cloudPresets'] });
      }
    },
    [isSuperAdmin, queryClient, userProfile, lang]
  );

  return { isSuperAdmin, handleToggleShowcase };
}
