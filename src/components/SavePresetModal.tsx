import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSequencer } from '../contexts/SequencerContext';
import { CatalogVisibility, Preset } from '../types';
import { useCloudAudioBounce } from '../hooks/useCloudAudioBounce';
import { useQueryClient } from '@tanstack/react-query';
import { useSequencerStore } from '../stores/useSequencerStore';

interface SavePresetModalProps {
  presetData: Preset;
  defaultName: string;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const SavePresetModal: React.FC<SavePresetModalProps> = ({ presetData, defaultName, onClose, lang }) => {
  const { userProfile, isAdmin } = useAuth();
  const sequencer = useSequencer();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState(defaultName || '');
  const [visibility, setVisibility] = useState<CatalogVisibility>('mestre_group');
  const [isSaving, setIsSaving] = useState(false);
  const [autoGenerateAudio, setAutoGenerateAudio] = useState(true);

  const { genererEtUploaderPresetCloudBounce, isBouncingCloud } = useCloudAudioBounce();

  const handleSave = async () => {
    if (!name.trim()) return;
    if (!userProfile) {
      useSequencerStore.getState().openVisitorAuthModal();
      return;
    }
    setIsSaving(true);
    
    try {
      const presetName = name.trim();
      const myGroupMestreId = (userProfile.role === 'mestre' || (userProfile.dbRole as any) === 'mestre')
        ? userProfile.uid
        : (userProfile.mestreId || null);
      const myGroupId = userProfile.groupId || undefined;

      const { savePresetToCloud, fetchCloudPresets } = await import('../cloudLibrary');
      const existingPresets = await fetchCloudPresets(userProfile.uid, userProfile.role, userProfile.mestreId || null, userProfile.groupId || null);
      
      // Look for existing preset: first check own presets, then group presets
      let existingPreset = existingPresets.find(p => p.name.trim() === presetName && p.ownerId === userProfile.uid);
      
      if (!existingPreset && myGroupMestreId) {
        // Also check if a preset with the same name exists in the group catalogue
        existingPreset = existingPresets.find(p => 
          p.name.trim() === presetName && 
          (p.mestreId === myGroupMestreId || p.ownerId === myGroupMestreId)
        );
      }
      
      const isFree = !userProfile || (!isAdmin && userProfile.role !== 'mestre');
      if (isFree && !existingPreset) {
        const ownedCount = existingPresets.filter(p => p.ownerId === userProfile.uid).length;
        if (ownedCount >= 3 && !userProfile.email?.includes('@ogirador.com')) {
          await sequencer.alertAsync(lang === 'fr' 
            ? 'Vous avez atteint la limite de 3 morceaux cloud pour un compte gratuit. Mettez à niveau votre compte via Orchestrador pour sauvegarder en illimité.' 
            : 'Você atingiu o limite de 3 músicas na nuvem para uma conta gratuita. Atualize sua conta via Orchestrador para salvar ilimitado.');
          setIsSaving(false);
          return;
        }
      }

      let targetDocId: string | undefined = undefined;

      if (existingPreset) {
        const isOwnPreset = existingPreset.ownerId === userProfile.uid;
        let confirmMessage: string;
        if (isOwnPreset) {
          confirmMessage = lang === 'fr' 
            ? `Le preset "${presetName}" existe déjà. Voulez-vous le remplacer ?` 
            : `O preset "${presetName}" já existe. Deseja substituí-lo?`;
        } else {
          confirmMessage = lang === 'fr' 
            ? `⚠️ Attention : Le preset "${presetName}" a été créé par quelqu'un d'autre (le Mestre ou un autre éditeur). Voulez-vous vraiment le modifier ? Cette action écrasera la version actuelle.` 
            : `⚠️ Atenção: O preset "${presetName}" foi criado por outra pessoa (o Mestre ou outro editor). Deseja realmente modificá-lo? Esta ação substituirá a versão atual.`;
        }
        const confirmReplace = await sequencer.confirmAsync(confirmMessage);
        if (!confirmReplace) {
          setIsSaving(false);
          return;
        }
        targetDocId = existingPreset.id;
      }

      // Update the metadata name
      const finalPresetData = { ...presetData };
      finalPresetData.metadata = { ...finalPresetData.metadata, toada: presetName } as any;

      let finalVisibility = visibility;
      if (isAdmin && visibility === 'public') {
          finalVisibility = 'admin_global';
      }

      const presetId = await savePresetToCloud(
        presetName,
        finalPresetData,
        userProfile.uid,
        finalVisibility,
        undefined,
        undefined,
        targetDocId,
        myGroupMestreId || undefined,
        myGroupId
      );

      if (autoGenerateAudio) {
        try {
          const audioUrl = await genererEtUploaderPresetCloudBounce(presetId, finalPresetData, finalPresetData.bpm || 100);
          // Updating the preset with the audio URL (null if upload failed)
          await savePresetToCloud(
            presetName,
            finalPresetData,
            userProfile.uid,
            finalVisibility,
            undefined,
            audioUrl ?? null,
            presetId, // pass presetId to overwrite with audio URL
            myGroupMestreId || undefined,
            myGroupId
          );
        } catch (audioErr) {
          console.warn("[SavePresetModal] Échec non bloquant de l'audio cloud, preset conservé avec audioUrl: null :", audioErr);
        }
      }

      // Persister l'ID du preset dans l'URL et localStorage pour survie au F5
      // Impact CPU: zéro reflow — replaceState et localStorage sont synchrones et hors DOM
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('loadPreset', presetId);
        window.history.replaceState(null, '', url.toString());
        localStorage.setItem('girador_last_loaded_preset_id', presetId);
      } catch (_e) { /* ignore navigation errors in iframes */ }

      // Mettre à jour le store courant avec le nouveau nom et le nouvel ID
      const newMeta = {
        toada: finalPresetData.metadata?.toada || presetName,
        nacao: finalPresetData.metadata?.nacao || '',
        compositor: finalPresetData.metadata?.compositor || '',
        ritmo: finalPresetData.metadata?.ritmo || '',
        ...finalPresetData.metadata,
        morceauId: presetId
      };
      useSequencerStore.getState().setMetadata(newMeta);
      if (sequencer.setMetadata) {
        sequencer.setMetadata(newMeta);
      }

      // Forcer un autosave immédiat vers IndexedDB pour synchroniser l'état complet
      window.dispatchEvent(new Event('force-autosave'));

      queryClient.invalidateQueries({ queryKey: ['cloudPresets'] });
      window.dispatchEvent(new Event('refresh-cloud-presets'));
      await sequencer.alertAsync(lang === 'pt' ? '✅ Salvo na nuvem!' : '✅ Sauvegardé dans le cloud !');
      onClose();
    } catch (err: any) {
      console.error(err);
      await sequencer.alertAsync((lang === 'fr' ? 'Erreur lors de la sauvegarde : ' : 'Erro ao salvar : ') + (err.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#f4ecd8] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 max-w-md w-full flex flex-col gap-6 relative">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-[#1a1a1a] uppercase leading-none mb-1">
              {lang === 'fr' ? 'Sauvegarder Preset Cloud' : 'Salvar Preset na Nuvem'}
            </h2>
            <p className="text-sm text-[#1a1a1a]/80 font-bold">
              {lang === 'fr' ? '🌟 En publiant dans le catalogue public, vous faites grandir la grande Roda. Partagez votre Baque avec le monde, inspirez d\'autres nations de Maracatu et gagnez des points d\'Axé pour débloquer des avantages dans la boutique !' : '🌟 Ao publicar no catálogo público, você faz a grande Roda crescer. Compartilhe seu Baque com o mundo, inspire outras nações de Maracatu e ganhe pontos de Axé para desbloquear vantagens na loja!'}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl hover:scale-110 transition-transform font-bold leading-none">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-[#1a1a1a]">
              {lang === 'fr' ? 'Nom du Preset' : 'Nome do Preset'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Opanijé"
              className="w-full bg-white text-[#1a1a1a] border-2 border-[#1a1a1a] px-3 py-2 text-sm font-bold outline-none focus:bg-[#1a1a1a]/5"
            />
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-1 p-3 bg-black/5 border-2 border-[#1a1a1a]">
            <label className="text-xs font-bold uppercase text-[#1a1a1a]">
              {lang === 'fr' ? 'Destination' : 'Destino'}
            </label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-[#1a1a1a] flex items-center gap-1.5">
                🔒 {lang === 'fr' ? `Catalogue ${userProfile?.groupName || userProfile?.displayName || 'Cloud'} (Privé)` : `Catálogo ${userProfile?.groupName || userProfile?.displayName || 'Cloud'} (Privado)`}
              </span>
            </div>
          </div>

          {/* Audio Checkbox */}
          <div className="flex items-center gap-2 p-3 bg-[#1a1a1a]/5 border-2 border-[#1a1a1a]">
            <input
              type="checkbox"
              id="autoGenerateAudio"
              checked={autoGenerateAudio}
              onChange={(e) => setAutoGenerateAudio(e.target.checked)}
              disabled={isSaving || isBouncingCloud}
              className="w-4 h-4 accent-[#8b2a1a]"
            />
            <label htmlFor="autoGenerateAudio" className="text-sm font-bold text-[#1a1a1a] cursor-pointer">
              {lang === 'fr' ? 'Générer l\'aperçu audio (☁️)' : 'Gerar áudio (☁️)'}
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-[#1a1a1a] hover:bg-[#1a1a1a]/10 transition-colors"
            disabled={isSaving || isBouncingCloud}
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving || isBouncingCloud || !userProfile}
            className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] font-bold disabled:opacity-50 hover:bg-[#6b1e11] transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center min-w-[120px]"
            title={!userProfile ? (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Conecte-se para salvar') : ''}
          >
            {(isSaving || isBouncingCloud) ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {lang === 'fr' ? 'En cours...' : 'Salvando...'}
              </span>
            ) : (lang === 'fr' ? 'Sauvegarder' : 'Salvar')}
          </button>
        </div>
      </div>
    </div>
  );
};
