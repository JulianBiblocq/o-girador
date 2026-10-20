/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { CloudPattern, CatalogVisibility, Pattern } from '../../types';

export interface UseInstrumentEditorCloudActionsParams {
  inst: { id: string };
  displayedPatterns: Pattern[];
  currentBpm: number;
  currentTimeSig: string;
  lang: string;
  sequencer: any;
  genererEtUploaderCloudBounce: (docId: string, savedPattern: any, bpm: number, sig: any) => Promise<any>;
  onLoadLibraryPattern?: (targetPatternId: number, libraryPattern: any) => void;
}

export function useInstrumentEditorCloudActions({
  inst, displayedPatterns, currentBpm, currentTimeSig, lang,
  sequencer, genererEtUploaderCloudBounce, onLoadLibraryPattern,
}: UseInstrumentEditorCloudActionsParams) {
  const { userProfile } = useAuth();
  const syncCloudPresets = useBalancoStore((state) => state.syncCloudPresets);
  const [cloudPatterns, setCloudPatterns] = useState<CloudPattern[]>([]);
  const [isSavingPattern, setIsSavingPattern] = useState(false);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
  const isGroupMember = Boolean(userProfile?.canWriteSequenciador || userProfile?.role === 'mestre' || userProfile?.groupId?.toLowerCase().includes('samambaia'));
  const [savePatternVisibility, setSavePatternVisibility] = useState<CatalogVisibility>(isGroupMember ? 'mestre_group' : 'private');
  const [saveModalPatternId, setSaveModalPatternId] = useState<number | null>(null);
  const [savePatternName, setSavePatternName] = useState('');
  const [savePatternFolder, setSavePatternFolder] = useState('');
  const [autoGeneratePatternAudio, setAutoGeneratePatternAudio] = useState(true);
  const [loadModalPatternId, setLoadModalPatternId] = useState<number | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showVisitorModal, setShowVisitorModal] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    setIsLoadingPatterns(true);
    import('../../cloudPatterns').then(({ fetchCloudPatterns }) => {
      fetchCloudPatterns(userProfile.uid, userProfile.role, userProfile.mestreId || null, userProfile.groupId || null, userProfile.canWriteSequenciador)
        .then(setCloudPatterns).catch(console.error).finally(() => setIsLoadingPatterns(false));
    });
    syncCloudPresets(userProfile.uid, userProfile.groupId, userProfile.role, userProfile.mestreId, userProfile.canWriteSequenciador);
  }, [userProfile, syncCloudPresets]);

  const existingLibraryPatterns = cloudPatterns.filter((p) => p.instrumentId === inst.id);
  const existingFolders = Array.from(new Set(existingLibraryPatterns.map((p) => p.folder))).filter(Boolean);
  const toggleFolder = (folder: string) => setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));

  const handleSavePatternToLibrary = useCallback(async () => {
    if (!userProfile) { setShowVisitorModal(true); return; }
    if (saveModalPatternId === null || !savePatternName.trim()) return;
    const ptn = displayedPatterns.find((p) => p.id === saveModalPatternId);
    if (!ptn) return;

    const existing = existingLibraryPatterns.find((p) => p.name.trim() === savePatternName.trim() && p.ownerId === userProfile.uid);
    let targetDocId = existing?.id;
    if (existing && !(await sequencer.confirmAsync(lang === 'fr' ? `Remplacer "${savePatternName.trim()}" ?` : `Substituir "${savePatternName.trim()}"?`))) return;

    setIsSavingPattern(true);
    try {
      const savedPattern = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        instrumentId: inst.id, name: savePatternName.trim(), folder: savePatternFolder.trim() || 'Général',
        steps: [...ptn.activeSteps], variations: JSON.parse(JSON.stringify(ptn.variations || [])),
        volumes: ptn.volumes ? [...ptn.volumes] : undefined, decays: ptn.decays ? [...ptn.decays] : undefined,
        microtimings: ptn.microtimings ? [...ptn.microtimings] : undefined, createdAt: Date.now(),
      };
      const mestreId = (userProfile.role === 'mestre' || (userProfile.dbRole as any) === 'mestre') ? userProfile.uid : (userProfile.mestreId || undefined);
      const { savePatternToCloud, fetchCloudPatterns } = await import('../../cloudPatterns');
      const docId = await savePatternToCloud(savedPattern, userProfile.uid, savePatternVisibility, mestreId, targetDocId, userProfile.role, userProfile.groupId || undefined, userProfile.canWriteSequenciador);
      if (autoGeneratePatternAudio) await genererEtUploaderCloudBounce(docId, savedPattern, currentBpm, currentTimeSig).catch(console.error);
      const updated = await fetchCloudPatterns(userProfile.uid, userProfile.role, userProfile.mestreId || null, userProfile.groupId || null, userProfile.canWriteSequenciador);
      setCloudPatterns(updated);
      setSaveModalPatternId(null);
      setToastMessage(lang === 'fr' ? 'Sauvegardé !' : 'Salvo !');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) { alert((lang === 'fr' ? 'Erreur: ' : 'Erro: ') + (err.message || String(err))); }
    finally { setIsSavingPattern(false); }
  }, [userProfile, saveModalPatternId, savePatternName, savePatternFolder, savePatternVisibility, autoGeneratePatternAudio, displayedPatterns, existingLibraryPatterns, inst.id, currentBpm, currentTimeSig, lang, sequencer, genererEtUploaderCloudBounce]);

  const handleLoadPatternFromLibrary = useCallback(async (libraryPatternId: string) => {
    if (loadModalPatternId === null) return;
    const libPtn = existingLibraryPatterns.find((p) => p.id === libraryPatternId);
    if (!libPtn) return;
    if (await sequencer.confirmAsync(lang === 'fr' ? 'Remplacer la phrase en cours ?' : 'Substituir o padrão atual?')) {
      onLoadLibraryPattern?.(loadModalPatternId, libPtn);
      setLoadModalPatternId(null);
    }
  }, [loadModalPatternId, existingLibraryPatterns, sequencer, lang, onLoadLibraryPattern]);

  const handleDeleteCloudPattern = useCallback(async (pId: string) => {
    if (await sequencer.confirmAsync(lang === 'fr' ? 'Supprimer définitivement ce motif ?' : 'Excluir permanentemente este padrão?')) {
      try {
        const { deleteCloudPattern } = await import('../../cloudPatterns');
        await deleteCloudPattern(pId);
        setCloudPatterns((prev) => prev.filter((p) => p.id !== pId));
      } catch (err) { alert(lang === 'fr' ? 'Erreur lors de la suppression.' : 'Erro ao excluir.'); }
    }
  }, [sequencer, lang]);

  return {
    cloudPatterns, setCloudPatterns, isSavingPattern, isLoadingPatterns,
    savePatternVisibility, setSavePatternVisibility, saveModalPatternId, setSaveModalPatternId,
    savePatternName, setSavePatternName, savePatternFolder, setSavePatternFolder,
    autoGeneratePatternAudio, setAutoGeneratePatternAudio, loadModalPatternId, setLoadModalPatternId,
    expandedFolders, toggleFolder, toastMessage, showVisitorModal, setShowVisitorModal,
    existingLibraryPatterns, existingFolders, handleSavePatternToLibrary,
    handleLoadPatternFromLibrary, handleDeleteCloudPattern,
  };
}
