/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { GlobalSwing, Language } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { saveBalancoToCloud } from '../../cloudBalancos';
import { BalancoPreset } from '../../types/balanco.types';
import { BalancoCaptureModal } from './BalancoCaptureModal';

interface BalancoEditorPanelProps {
  globalSwing: GlobalSwing;
  setGlobalSwing: (gs: GlobalSwing) => void;
  lang: Language;
  compact?: boolean;
}

export const BalancoEditorPanel: React.FC<BalancoEditorPanelProps> = ({
  globalSwing,
  setGlobalSwing,
  lang,
  compact = false
}) => {
  const { userProfile } = useAuth();
  const presets = useBalancoStore((state) => state.presets);
  const addLocalPreset = useBalancoStore((state) => state.addLocalPreset);
  const updateLocalPreset = useBalancoStore((state) => state.updateLocalPreset);
  const deleteLocalPreset = useBalancoStore((state) => state.deleteLocalPreset);
  const syncCloudPresets = useBalancoStore((state) => state.syncCloudPresets);
  const isLoadingCloud = useBalancoStore((state) => state.isLoadingCloud);

  const [customName, setCustomName] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('maracatu-trad');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState<boolean>(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'factory' | 'my' | 'group'>('all');
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [presetToDelete, setPresetToDelete] = useState<BalancoPreset | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Synchronisation Cloud automatique à la connexion / changement d'utilisateur
  useEffect(() => {
    if (userProfile?.uid) {
      syncCloudPresets(userProfile.uid, userProfile.groupId, userProfile.role, userProfile.mestreId);
    }
  }, [userProfile?.uid, userProfile?.groupId, userProfile?.role, userProfile?.mestreId, syncCloudPresets]);

  // Force le mode à ne jamais être 'off'
  const activeMode: 'maracatu' | 'custom' = globalSwing.mode === 'custom' ? 'custom' : 'maracatu';

  const currentBpm = useSequencerStore((state) => state.measureBpms[0] || 100);
  const bpmRef = useRef(currentBpm);
  const customOffsetsRef = useRef(globalSwing.customOffsets);
  const swingIntensityRef = useRef(globalSwing.swingIntensity ?? 100);
  const timerRef = useRef<number | null>(null);
  const activeOscsRef = useRef<OscillatorNode[]>([]);
  const nextStepTimeRef = useRef<number>(0);
  const stepIndexRef = useRef<number>(0);

  useEffect(() => {
    bpmRef.current = currentBpm;
  }, [currentBpm]);

  useEffect(() => {
    customOffsetsRef.current = globalSwing.customOffsets;
    swingIntensityRef.current = globalSwing.swingIntensity ?? 100;
  }, [globalSwing.customOffsets, globalSwing.swingIntensity]);

  // Helper : vérification des droits de modification / suppression
  const canManagePreset = (p: BalancoPreset | undefined | null): boolean => {
    if (!p || p.isFactory) return false;
    if (!userProfile) {
      return p.ownerId === 'local';
    }
    if (p.ownerId === userProfile.uid || p.ownerId === 'local') return true;
    const role = userProfile.role || '';
    if (role === 'admin' || role === 'super-admin') return true;
    if ((role === 'mestre' || role === 'mestri') && p.groupId && userProfile.groupId) {
      return String(p.groupId).toLowerCase() === String(userProfile.groupId).toLowerCase();
    }
    return false;
  };

  const selectedPreset = useMemo(() => {
    return presets.find((p) => p.id === selectedPresetId) || presets[0];
  }, [presets, selectedPresetId]);

  const editingPreset = useMemo(() => {
    return editingPresetId ? presets.find((p) => p.id === editingPresetId) || null : null;
  }, [presets, editingPresetId]);

  // Badge d'origine du preset
  const getPresetBadge = (p: BalancoPreset) => {
    if (p.isFactory) {
      return {
        label: lang === 'fr' ? '★ Usine' : '★ Fábrica',
        className: 'bg-[#d5c3b0] text-[#1a1a1a] border-[#1a1a1a]'
      };
    }
    const isMy = p.ownerId === 'local' || (userProfile?.uid && p.ownerId === userProfile.uid);
    if (isMy) {
      return {
        label: lang === 'fr' ? '👤 Mon Balanço' : '👤 Meu Balanço',
        className: 'bg-[#1b4332] text-[#f4ecd8] border-[#1b4332]'
      };
    }
    const isGroup =
      userProfile?.groupId &&
      p.groupId &&
      String(p.groupId).toLowerCase() === String(userProfile.groupId).toLowerCase();
    if (isGroup) {
      return {
        label: lang === 'fr' ? '👥 Groupe' : '👥 Grupo',
        className: 'bg-[#2b4c7e] text-[#f4ecd8] border-[#2b4c7e]'
      };
    }
    return {
      label: lang === 'fr' ? '🌐 Public' : '🌐 Público',
      className: 'bg-[#5c4033] text-[#f4ecd8] border-[#5c4033]'
    };
  };

  // Filtrage des presets dans la modale Bibliothèque
  const filteredLibraryPresets = useMemo(() => {
    return presets.filter((p) => {
      if (libraryFilter === 'factory' && !p.isFactory) return false;
      if (libraryFilter === 'my') {
        const isMy = p.ownerId === 'local' || (userProfile?.uid && p.ownerId === userProfile.uid);
        if (!isMy) return false;
      }
      if (libraryFilter === 'group') {
        if (!userProfile?.groupId || !p.groupId) return false;
        if (String(p.groupId).toLowerCase() !== String(userProfile.groupId).toLowerCase()) return false;
      }

      if (librarySearch.trim()) {
        const term = librarySearch.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(term);
        const matchAuthor = p.authorName?.toLowerCase().includes(term);
        if (!matchName && !matchAuthor) return false;
      }

      return true;
    });
  }, [presets, libraryFilter, librarySearch, userProfile]);

  const factoryCount = useMemo(() => presets.filter((p) => p.isFactory).length, [presets]);
  const myCount = useMemo(
    () => presets.filter((p) => p.ownerId === 'local' || (userProfile?.uid && p.ownerId === userProfile.uid)).length,
    [presets, userProfile]
  );
  const groupCount = useMemo(
    () =>
      userProfile?.groupId
        ? presets.filter(
            (p) => p.groupId && String(p.groupId).toLowerCase() === String(userProfile.groupId).toLowerCase()
          ).length
        : 0,
    [presets, userProfile]
  );

  const schedulePreviewBeep = (
    ctx: AudioContext,
    timeSec: number,
    frequency: number,
    durationSec: number,
    gainLevel: number
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, timeSec);

    gain.gain.setValueAtTime(gainLevel, timeSec);
    gain.gain.exponentialRampToValueAtTime(0.0001, timeSec + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(timeSec);
    osc.stop(timeSec + durationSec + 0.01);

    activeOscsRef.current.push(osc);
    osc.onended = () => {
      const idx = activeOscsRef.current.indexOf(osc);
      if (idx !== -1) activeOscsRef.current.splice(idx, 1);
    };
  };

  const stopPreview = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    activeOscsRef.current.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (_) {}
    });
    activeOscsRef.current = [];
    setIsPreviewPlaying(false);
  };

  const startPreview = async () => {
    stopPreview();

    const rawCtx = Tone.getContext().rawContext as AudioContext;
    if (rawCtx.state === 'suspended') {
      try {
        await rawCtx.resume();
      } catch (_) {}
    }

    const now = rawCtx.currentTime;
    nextStepTimeRef.current = now + 0.05;
    stepIndexRef.current = 0;
    setIsPreviewPlaying(true);

    const timer = window.setInterval(() => {
      const ctx = Tone.getContext().rawContext as AudioContext;
      const currentTime = ctx.currentTime;
      const bpm = bpmRef.current > 0 ? bpmRef.current : 100;
      const stepSec = (60 / bpm) / 4;

      while (nextStepTimeRef.current < currentTime + 0.12) {
        const step = stepIndexRef.current % 16;
        const posInGroup = step % 4;

        // 1. Sur chaque temps (noire 0, 1, 2, 3) : bip neutre de référence (600 Hz)
        if (posInGroup === 0) {
          schedulePreviewBeep(ctx, nextStepTimeRef.current, 600, 0.035, 0.25);
        }

        // 2. Sur chaque double croche : tic percussif (1200 Hz) décalé selon le fader actif
        const offsetPct = customOffsetsRef.current[posInGroup] ?? 0;
        const intensityRatio = (swingIntensityRef.current ?? 100) / 100;
        const offsetSec = (offsetPct / 100) * (stepSec * 0.5) * intensityRatio;
        const ticTime = Math.max(currentTime, nextStepTimeRef.current + offsetSec);

        schedulePreviewBeep(ctx, ticTime, 1200, 0.025, 0.35);

        nextStepTimeRef.current += stepSec;
        stepIndexRef.current = (stepIndexRef.current + 1) % 16;
      }
    }, 25);

    timerRef.current = timer;
  };

  const togglePreview = () => {
    if (isPreviewPlaying) {
      stopPreview();
    } else {
      startPreview();
    }
  };

  // Coupures automatiques du son de test
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  useEffect(() => {
    if (activeMode !== 'custom' && isPreviewPlaying) {
      stopPreview();
    }
  }, [activeMode, isPreviewPlaying]);

  useEffect(() => {
    if (isCaptureModalOpen && isPreviewPlaying) {
      stopPreview();
    }
  }, [isCaptureModalOpen, isPreviewPlaying]);

  const handleModeChange = (mode: 'maracatu' | 'custom') => {
    setGlobalSwing({
      ...globalSwing,
      mode
    });
  };

  const handleIntensityChange = (val: number) => {
    setGlobalSwing({
      ...globalSwing,
      swingIntensity: val
    });
  };

  const handleCustomOffsetChange = (index: number, val: number) => {
    const newOffsets = [...globalSwing.customOffsets] as [number, number, number, number];
    newOffsets[index] = val;
    setGlobalSwing({
      ...globalSwing,
      mode: 'custom',
      customOffsets: newOffsets
    });
  };

  // Nudge groupé : translate l'ensemble des 4 pas en bloc avec clamp [-100, 100]
  const handleNudgeGroup = (delta: number) => {
    const newOffsets = globalSwing.customOffsets.map((val) =>
      Math.max(-100, Math.min(100, val + delta))
    ) as [number, number, number, number];

    setGlobalSwing({
      ...globalSwing,
      mode: 'custom',
      customOffsets: newOffsets
    });
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const target = presets.find((p) => p.id === presetId);
    if (target && target.offsets.length >= 4) {
      const offsets = [
        target.offsets[0] ?? 0,
        target.offsets[1] ?? 0,
        target.offsets[2] ?? 0,
        target.offsets[3] ?? 0
      ] as [number, number, number, number];

      setGlobalSwing({
        ...globalSwing,
        mode: 'maracatu',
        customOffsets: offsets
      });
    }
  };

  const handleLoadToCustom = (presetToLoad: BalancoPreset) => {
    const offsets = [
      presetToLoad.offsets[0] ?? 0,
      presetToLoad.offsets[1] ?? 0,
      presetToLoad.offsets[2] ?? 0,
      presetToLoad.offsets[3] ?? 0
    ] as [number, number, number, number];

    setGlobalSwing({
      ...globalSwing,
      mode: 'custom',
      customOffsets: offsets
    });

    setCustomName(presetToLoad.name);

    if (canManagePreset(presetToLoad)) {
      setEditingPresetId(presetToLoad.id);
    } else {
      setEditingPresetId(null);
    }
  };

  const handleResetCustom = () => {
    setGlobalSwing({
      ...globalSwing,
      customOffsets: [0, 8, -29, -58]
    });
  };

  // Sauvegarde ou mise à jour d'un preset
  const handleSaveCustomPreset = async (saveAsNew: boolean = false) => {
    const isEditingExisting =
      !saveAsNew &&
      Boolean(editingPresetId) &&
      canManagePreset(presets.find((p) => p.id === editingPresetId));

    const targetId = isEditingExisting && editingPresetId ? editingPresetId : `custom-${Date.now()}`;
    const existingPreset = isEditingExisting ? presets.find((p) => p.id === targetId) : null;

    const defaultName = isEditingExisting
      ? existingPreset?.name || (lang === 'fr' ? 'Balanço Personnalisé' : 'Balanço Personalizado')
      : lang === 'fr'
      ? 'Balanço Personnalisé'
      : 'Balanço Personalizado';
    const finalName = customName.trim() || defaultName;

    const presetData: BalancoPreset = {
      id: targetId,
      name: finalName,
      ownerId: existingPreset?.ownerId || userProfile?.uid || 'local',
      authorName:
        existingPreset?.authorName ||
        userProfile?.displayName ||
        (lang === 'fr' ? 'Utilisateur' : 'Usuário'),
      groupId: existingPreset?.groupId !== undefined ? existingPreset.groupId : userProfile?.groupId || null,
      visibility: existingPreset?.visibility || 'private',
      division: 16,
      offsets: [...globalSwing.customOffsets],
      isFactory: false,
      createdAt: existingPreset?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    if (isEditingExisting) {
      updateLocalPreset(targetId, {
        name: finalName,
        offsets: [...globalSwing.customOffsets]
      });
    } else {
      addLocalPreset(presetData);
      setSelectedPresetId(targetId);
    }

    if (userProfile?.uid) {
      setIsSaving(true);
      try {
        const docIdToUpdate =
          isEditingExisting && !targetId.startsWith('custom-') ? targetId : undefined;
        const cloudId = await saveBalancoToCloud(presetData, docIdToUpdate, userProfile.role);

        if (cloudId && cloudId !== targetId) {
          deleteLocalPreset(targetId);
          addLocalPreset({ ...presetData, id: cloudId });
          setSelectedPresetId(cloudId);
          if (isEditingExisting) setEditingPresetId(cloudId);
        }

        setStatusFeedback({
          type: 'success',
          title: isEditingExisting
            ? lang === 'fr'
              ? 'Balanço Mis à Jour !'
              : 'Balanço Atualizado!'
            : lang === 'fr'
            ? 'Balanço Enregistré !'
            : 'Balanço Salvo!',
          message:
            lang === 'fr'
              ? `Le preset « ${finalName} » est bien synchronisé dans votre collection Cloud (/balancos).`
              : `O preset « ${finalName} » foi sincronizado na sua coleção Nuvem (/balancos).`
        });
      } catch (err: any) {
        setStatusFeedback({
          type: 'error',
          title: lang === 'fr' ? 'Erreur de Synchronisation' : 'Erro de Sincronização',
          message:
            (lang === 'fr'
              ? `Le preset « ${finalName} » a été conservé localement, mais l'envoi vers le Cloud a échoué : `
              : `O preset « ${finalName} » foi mantido localmente, mas o envio para a Nuvem falhou: `) +
            err.message
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      setStatusFeedback({
        type: 'info',
        title: isEditingExisting
          ? lang === 'fr'
            ? 'Mise à Jour Locale'
            : 'Atualizado Localmente'
          : lang === 'fr'
          ? 'Sauvegarde Locale'
          : 'Salvo Localmente',
        message:
          lang === 'fr'
            ? `Le preset « ${finalName} » a été enregistré dans la mémoire locale de votre navigateur. Connectez-vous pour le synchroniser sur le Cloud.`
            : `O preset « ${finalName} » foi salvo na memória do navegador. Conecte-se para sincronizá-lo na Nuvem.`
      });
    }

    if (!isEditingExisting) {
      setCustomName('');
    }
  };

  // Suppression confirmée d'un preset
  const handleConfirmDelete = async () => {
    if (!presetToDelete) return;
    const deletedId = presetToDelete.id;
    const deletedName = presetToDelete.name;

    try {
      await deleteLocalPreset(deletedId);

      if (editingPresetId === deletedId) {
        setEditingPresetId(null);
        setCustomName('');
      }

      if (selectedPresetId === deletedId) {
        const fallback =
          presets.find((p) => p.id === 'maracatu-trad' && p.id !== deletedId) || presets[0];
        if (fallback) {
          setSelectedPresetId(fallback.id);
          if (fallback.offsets && fallback.offsets.length >= 4) {
            setGlobalSwing({
              ...globalSwing,
              mode: 'maracatu',
              customOffsets: [
                fallback.offsets[0] ?? 0,
                fallback.offsets[1] ?? 0,
                fallback.offsets[2] ?? 0,
                fallback.offsets[3] ?? 0
              ]
            });
          }
        }
      }

      setPresetToDelete(null);

      setStatusFeedback({
        type: 'info',
        title: lang === 'fr' ? 'Balanço Supprimé' : 'Balanço Excluído',
        message:
          lang === 'fr'
            ? `Le preset « ${deletedName} » a été définitivement supprimé de votre collection.`
            : `O preset « ${deletedName} » foi excluído definitivamente da sua coleção.`
      });
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        title: lang === 'fr' ? 'Erreur de suppression' : 'Erro ao excluir',
        message: err.message || String(err)
      });
    }
  };

  const handleRefreshCloud = async () => {
    if (!userProfile?.uid) {
      setStatusFeedback({
        type: 'info',
        title: lang === 'fr' ? 'Connexion requise' : 'Login necessário',
        message:
          lang === 'fr'
            ? 'Connectez-vous avec votre compte pour synchroniser vos balanços avec la base de données Cloud.'
            : 'Conecte-se com sua conta para sincronizar seus balanços com o banco de dados na Nuvem.'
      });
      return;
    }
    await syncCloudPresets(userProfile.uid, userProfile.groupId, userProfile.role, userProfile.mestreId);
  };

  return (
    <div className="flex flex-col gap-4 text-left select-none">
      {/* 1. Sélecteur de Mode (Presets d'Usine vs Personnalisé) */}
      <div className="flex flex-col gap-2">
        <label className={`font-bold uppercase ${compact ? 'text-[10px]' : 'text-xs text-[#1a1a1a]'}`}>
          {lang === 'fr' ? 'Mode de Balanço :' : 'Modo de Balanço :'}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleModeChange('maracatu')}
            className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors flex-1 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              activeMode === 'maracatu'
                ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#d5c3b0]'
            }`}
          >
            ⚖️ Balanço
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('custom')}
            className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors flex-1 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              activeMode === 'custom'
                ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#d5c3b0]'
            }`}
          >
            🛠️ {lang === 'fr' ? 'Atelier' : 'Ateliê'}
          </button>
        </div>
      </div>

      {/* 2. Mode Balanço : Sélection, Fiche détaillée, Bibliothèque et Actualisation */}
      {activeMode === 'maracatu' && (
        <div className="flex flex-col gap-2.5 bg-[#eaddcf]/40 p-3 border border-black/15 rounded-sm">
          <div className="flex items-center justify-between gap-2">
            <label className="font-bold text-[10px] uppercase text-[#1a1a1a]">
              {lang === 'fr' ? 'Sélectionner un Balanço :' : 'Selecionar um Balanço :'}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRefreshCloud}
                disabled={isLoadingCloud}
                className="px-2 py-0.5 bg-white border border-black text-[10px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] flex items-center gap-1 disabled:opacity-50"
                title={lang === 'fr' ? 'Actualiser les presets Cloud' : 'Atualizar balanços da Nuvem'}
              >
                <span className={isLoadingCloud ? 'animate-spin inline-block' : ''}>🔄</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLibraryModalOpen(true)}
                className="px-2 py-0.5 bg-white border border-black text-[10px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] flex items-center gap-1"
                title={lang === 'fr' ? 'Consulter la bibliothèque complète' : 'Ver biblioteca completa'}
              >
                📚 {lang === 'fr' ? 'Bibliothèque' : 'Biblioteca'} ({presets.length})
              </button>
            </div>
          </div>

          <select
            value={selectedPresetId}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="w-full bg-[#f4ecd8] border-2 border-black px-2 py-1.5 text-xs font-bold text-[#1a1a1a] shadow-[1.5px_1.5px_0px_#000] outline-none cursor-pointer"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.isFactory ? '★' : p.ownerId === userProfile?.uid || p.ownerId === 'local' ? '👤' : '👥'}
              </option>
            ))}
          </select>

          {/* Fiche détaillée du preset sélectionné */}
          {selectedPreset && (
            <div className="flex flex-col gap-2 bg-[#f4ecd8] p-2.5 border border-black/20 rounded-sm shadow-[1px_1px_0px_#000]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-cactus font-bold text-sm text-[#1a1a1a]">
                      {selectedPreset.name}
                    </span>
                    {(() => {
                      const badge = getPresetBadge(selectedPreset);
                      return (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 border rounded-xs uppercase tracking-wider ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  {!selectedPreset.isFactory && selectedPreset.authorName && (
                    <span className="text-[10px] text-[#1a1a1a]/70 font-semibold">
                      {lang === 'fr' ? 'Par ' : 'Por '} {selectedPreset.authorName}
                    </span>
                  )}
                </div>

                {/* Boutons d'action pour le preset sélectionné */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleLoadToCustom(selectedPreset)}
                    className="px-2 py-1 bg-white text-[#1a1a1a] border border-black text-[10px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] flex items-center gap-1 whitespace-nowrap"
                    title={
                      lang === 'fr'
                        ? "Charger dans l'Atelier pour modifier ou dupliquer"
                        : "Carregar no Ateliê para editar ou duplicar"
                    }
                  >
                    ✏️ {lang === 'fr' ? "Modifier dans l'Atelier" : "Editar no Ateliê"}
                  </button>
                  {canManagePreset(selectedPreset) && (
                    <button
                      type="button"
                      onClick={() => setPresetToDelete(selectedPreset)}
                      className="px-1.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border border-black text-[10px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
                      title={lang === 'fr' ? 'Supprimer ce preset' : 'Excluir este preset'}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* Aperçu condensé des décalages */}
              <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold bg-[#eaddcf]/60 px-2 py-1 border border-black/10 rounded-xs overflow-x-auto">
                <span className="text-[#1a1a1a]/60 uppercase text-[8px] font-sans">
                  {lang === 'fr' ? 'Offsets :' : 'Offsets :'}
                </span>
                {selectedPreset.offsets.map((val, idx) => (
                  <span
                    key={idx}
                    className={`px-1 py-0.2 rounded-xs border ${
                      val === 0
                        ? 'bg-white/70 border-black/15 text-stone-700'
                        : val > 0
                        ? 'bg-amber-100/90 border-amber-400 text-amber-900'
                        : 'bg-emerald-100/90 border-emerald-400 text-emerald-900'
                    }`}
                  >
                    P{idx + 1}: {val > 0 ? `+${val}%` : `${val}%`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Mode Personnalisé (Atelier) : Nommage, Mise à jour / Création, et Nudge Groupé */}
      {activeMode === 'custom' && (
        <div className="flex flex-col gap-3 bg-[#eaddcf]/40 p-3 border border-black/15 rounded-sm">
          {/* Bandeau d'information si un preset existant est en cours de modification */}
          {editingPresetId && editingPreset && (
            <div className="flex items-center justify-between gap-2 bg-[#f4ecd8] px-2.5 py-1.5 border-2 border-[#8b2a1a] rounded-sm text-xs font-bold text-[#1a1a1a]">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[#8b2a1a]">✏️</span>
                <span className="truncate">
                  {lang === 'fr' ? 'Édition en cours : ' : 'Editando : '}
                  <span className="text-[#8b2a1a] font-cactus text-sm">« {editingPreset.name} »</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPresetId(null);
                  setCustomName('');
                }}
                className="px-1.5 py-0.5 bg-white text-[9px] font-bold border border-black hover:bg-black hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                title={lang === 'fr' ? "Quitter le mode édition et repasser en création vierge" : "Sair do modo de edição"}
              >
                ✕ {lang === 'fr' ? 'Quitter édition' : 'Sair da edição'}
              </button>
            </div>
          )}

          {/* Nom du preset et actions de sauvegarde */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[10px] uppercase text-[#1a1a1a]">
              {editingPresetId
                ? lang === 'fr'
                  ? 'Nom du preset en édition :'
                  : 'Nome do preset em edição :'
                : lang === 'fr'
                ? 'Nom du preset à sauvegarder :'
                : 'Nome do preset a salvar :'}
            </label>
            <div className="flex gap-1.5 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={lang === 'fr' ? 'Ex: Nagô Samambaia, Trovão Pesado...' : 'Ex: Nagô Samambaia, Trovão Pesado...'}
                className="flex-1 min-w-[140px] bg-white border border-black px-2 py-1 text-xs font-bold text-[#1a1a1a] outline-none shadow-[1px_1px_0px_#000]"
              />
              <button
                type="button"
                onClick={() => setIsCaptureModalOpen(true)}
                className="px-2 py-1 bg-white text-[#1a1a1a] border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] flex items-center gap-1 whitespace-nowrap"
                title={
                  lang === 'fr'
                    ? "Capturer le balanço au jeu (pad tactile, clavier ou MIDI)"
                    : "Capturar o balanço ao vivo (pad, teclado ou MIDI)"
                }
              >
                🎙️ {lang === 'fr' ? 'Capturer au jeu' : 'Capturar'}
              </button>

              {/* Boutons contextuels : Mise à jour ou Enregistrer sous */}
              {editingPresetId && canManagePreset(editingPreset) ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSaveCustomPreset(false)}
                    disabled={isSaving}
                    className="px-2.5 py-1 bg-[#1b4332] text-[#f4ecd8] border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] disabled:opacity-50 whitespace-nowrap"
                    title={lang === 'fr' ? 'Enregistrer les modifications sur ce preset' : 'Salvar alterações neste preset'}
                  >
                    💾 {isSaving ? (lang === 'fr' ? 'Envoi...' : 'Salvando...') : (lang === 'fr' ? 'Mettre à jour' : 'Atualizar')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveCustomPreset(true)}
                    disabled={isSaving}
                    className="px-2 py-1 bg-[#8b2a1a] text-[#f4ecd8] border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] disabled:opacity-50 whitespace-nowrap"
                    title={lang === 'fr' ? 'Créer un nouveau preset distinct avec ces réglages' : 'Criar novo preset com essas configurações'}
                  >
                    ➕ {lang === 'fr' ? 'Enregistrer sous...' : 'Salvar como...'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSaveCustomPreset(false)}
                  disabled={isSaving}
                  className="px-2.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] disabled:opacity-50 whitespace-nowrap"
                >
                  💾 {isSaving ? (lang === 'fr' ? 'Sauvegarde...' : 'Salvando...') : (lang === 'fr' ? 'Enregistrer' : 'Salvar')}
                </button>
              )}
            </div>
          </div>

          {/* Rangée de boutons de Décalage Groupé (Nudge) & Bouton Pré-écoute */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/10 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[10px] uppercase text-[#1a1a1a]">
                ⚡ {lang === 'fr' ? 'Nudge Groupé :' : 'Nudge em Bloco :'}
              </span>
              <div className="flex gap-1">
                {[-5, -1, 1, 5].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => handleNudgeGroup(delta)}
                    className="px-2 py-0.5 bg-white border border-black text-[10px] font-bold text-[#1a1a1a] hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
                    title={
                      lang === 'fr'
                        ? `Décaler l'ensemble des 4 pas de ${delta > 0 ? `+${delta}` : delta}%`
                        : `Deslocar os 4 passos em ${delta > 0 ? `+${delta}` : delta}%`
                    }
                  >
                    {delta > 0 ? `+${delta}%` : `${delta}%`}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={togglePreview}
              className={`px-2.5 py-1 text-xs font-bold border border-black cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1 transition-all ${
                isPreviewPlaying
                  ? 'bg-[#8b2a1a] text-[#f4ecd8] animate-pulse ring-1 ring-[#8b2a1a]'
                  : 'bg-white text-[#1a1a1a] hover:bg-black hover:text-white'
              }`}
              title={lang === 'fr' ? 'Pré-écouter la boucle de groove' : 'Ouvir o loop de groove'}
            >
              {isPreviewPlaying ? '⏹' : '▶'}{' '}
              {lang === 'fr'
                ? isPreviewPlaying
                  ? 'Arrêter'
                  : 'Tester le groove'
                : isPreviewPlaying
                ? 'Parar'
                : 'Testar o groove'}
            </button>
          </div>
        </div>
      )}

      {/* 4. Visualisation & Faders des 4 Doubles-Croches (autorisant valeurs positives et négatives, y compris le pas 0) */}
      <div className="flex flex-col gap-4 bg-[#eaddcf]/50 p-3 border border-black/15 rounded-sm">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-[10px] uppercase text-[#1a1a1a]">
            {lang === 'fr' ? 'Micro-timing des 4 doubles croches' : 'Micro-timing das 4 semicolcheias'}
          </span>
          {activeMode === 'custom' && (
            <button
              type="button"
              onClick={handleResetCustom}
              className="px-2 py-0.5 bg-white border border-black text-[9px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              {lang === 'fr' ? 'Réinitialiser' : 'Redefinir'}
            </button>
          )}
        </div>

        <div className="flex gap-2 justify-around w-full">
          {globalSwing.customOffsets.map((offset, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 flex-1">
              {/* Visuel du carré mobile */}
              <div className="relative w-full h-12 flex items-center justify-center">
                <div className="absolute top-0 bottom-0 left-1/2 w-0 border-l border-dashed border-black/20 -translate-x-1/2 z-0" />
                <div
                  className="flex items-center justify-center bg-[#f4ecd8] border border-black shadow-[1.5px_1.5px_0px_#000] z-10 w-8 h-8 font-cactus font-black text-xs transition-transform duration-100"
                  style={{
                    transform: `translateX(${(offset / 100) * 16}px)`
                  }}
                >
                  {idx + 1}
                </div>
              </div>

              {/* Slider horizontal bidirectionnel (-100% à +100%) */}
              <div className="w-full relative flex items-center">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={offset}
                  disabled={activeMode !== 'custom'}
                  onChange={(e) => handleCustomOffsetChange(idx, parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-black/20 rounded-full appearance-none cursor-pointer outline-none slider-horizontal accent-[#8b2a1a] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Valeur numérique */}
              <div className="text-center font-bold text-[10px] text-[#1a1a1a]">
                {offset > 0 ? `+${offset}%` : `${offset}%`}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[9px] opacity-75 text-center leading-tight">
          {lang === 'fr'
            ? 'Axe central = pulsation stricte. Droite : Retard (+). Gauche : Anticipation / Avance (-).'
            : 'Eixo central = pulso estrito. Direita: Atraso (+). Esquerda: Antecipação / Avanço (-).'}
        </p>
      </div>

      {/* 5. Dosage d'intensité globale */}
      <div className="flex flex-col gap-1.5 bg-[#eaddcf]/30 p-3 border border-black/15 rounded-sm">
        <div className="flex justify-between items-center">
          <span className="font-bold text-[10px] uppercase flex items-center gap-1 text-[#1a1a1a]">
            🎚️ {lang === 'fr' ? 'Intensité du Balanço :' : 'Intensidade do Balanço :'}
          </span>
          <span className="font-bold text-[#8b2a1a] text-xs">
            {globalSwing.swingIntensity !== undefined ? globalSwing.swingIntensity : 100}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={globalSwing.swingIntensity !== undefined ? globalSwing.swingIntensity : 100}
          onChange={(e) => handleIntensityChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-black/15 rounded-full appearance-none cursor-pointer outline-none"
          style={{ accentColor: '#8b2a1a' }}
        />
      </div>

      {/* Modale de capture en direct */}
      <BalancoCaptureModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        lang={lang}
        onCaptureComplete={(newOffsets) => {
          setGlobalSwing({
            ...globalSwing,
            mode: 'custom',
            customOffsets: newOffsets
          });
        }}
      />

      {/* 6. Modale Bibliothèque complète des Balanços */}
      {isLibraryModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[75] flex items-center justify-center p-3 sm:p-4 select-none"
          onClick={() => setIsLibraryModalOpen(false)}
        >
          <div
            className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-4 sm:p-5 max-w-xl w-full max-h-[85vh] rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-3 text-[#1a1a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📚</span>
                <div>
                  <h4 className="font-cactus text-xl font-bold uppercase leading-tight">
                    {lang === 'fr' ? 'Bibliothèque des Balanços' : 'Biblioteca de Balanços'}
                  </h4>
                  <span className="text-[10px] text-[#1a1a1a]/70 font-bold">
                    {presets.length} {lang === 'fr' ? 'presets disponibles' : 'presets disponíveis'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLibraryModalOpen(false)}
                className="text-lg font-bold hover:text-[#8b2a1a] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recherche & Filtres */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder={lang === 'fr' ? '🔍 Rechercher un balanço, auteur...' : '🔍 Buscar balanço, autor...'}
                className="w-full bg-white border border-black px-2.5 py-1.5 text-xs font-bold text-[#1a1a1a] outline-none shadow-[1px_1px_0px_#000]"
              />

              {/* Onglets Filtres */}
              <div className="flex gap-1 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setLibraryFilter('all')}
                  className={`px-2.5 py-1 text-[10px] font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000] whitespace-nowrap transition-colors ${
                    libraryFilter === 'all'
                      ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                      : 'bg-white text-[#1a1a1a] hover:bg-[#eaddcf]'
                  }`}
                >
                  {lang === 'fr' ? 'Tous' : 'Todos'} ({presets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryFilter('factory')}
                  className={`px-2.5 py-1 text-[10px] font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000] whitespace-nowrap transition-colors ${
                    libraryFilter === 'factory'
                      ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                      : 'bg-white text-[#1a1a1a] hover:bg-[#eaddcf]'
                  }`}
                >
                  ★ {lang === 'fr' ? 'Usine' : 'Fábrica'} ({factoryCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryFilter('my')}
                  className={`px-2.5 py-1 text-[10px] font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000] whitespace-nowrap transition-colors ${
                    libraryFilter === 'my'
                      ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                      : 'bg-white text-[#1a1a1a] hover:bg-[#eaddcf]'
                  }`}
                >
                  👤 {lang === 'fr' ? 'Mes Balanços' : 'Meus Balanços'} ({myCount})
                </button>
                {userProfile?.groupId && (
                  <button
                    type="button"
                    onClick={() => setLibraryFilter('group')}
                    className={`px-2.5 py-1 text-[10px] font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000] whitespace-nowrap transition-colors ${
                      libraryFilter === 'group'
                        ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                        : 'bg-white text-[#1a1a1a] hover:bg-[#eaddcf]'
                    }`}
                  >
                    👥 {lang === 'fr' ? 'Mon Groupe' : 'Meu Grupo'} ({groupCount})
                  </button>
                )}
              </div>
            </div>

            {/* Liste scrollable des Presets */}
            <div className="flex-1 overflow-y-auto max-h-[50vh] flex flex-col gap-2 pr-1">
              {filteredLibraryPresets.length === 0 ? (
                <div className="text-center py-8 font-bold text-xs text-[#1a1a1a]/60 bg-[#eaddcf]/30 border border-black/10 rounded-sm">
                  {lang === 'fr' ? 'Aucun balanço ne correspond à votre recherche.' : 'Nenhum balanço encontrado.'}
                </div>
              ) : (
                filteredLibraryPresets.map((p) => {
                  const badge = getPresetBadge(p);
                  const isCurrentActive = selectedPresetId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-2 p-2.5 border rounded-sm transition-colors ${
                        isCurrentActive
                          ? 'bg-[#eaddcf] border-[#8b2a1a] shadow-[2px_2px_0px_#8b2a1a]'
                          : 'bg-white border-black/20 hover:border-black shadow-[1px_1px_0px_#000]'
                      }`}
                    >
                      {/* Informations du preset */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-cactus font-bold text-sm text-[#1a1a1a] truncate">
                            {p.name}
                          </span>
                          <span
                            className={`text-[8px] font-bold px-1.5 py-0.2 border rounded-xs uppercase tracking-wider ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        {!p.isFactory && p.authorName && (
                          <span className="text-[9px] text-[#1a1a1a]/70 font-semibold truncate">
                            {lang === 'fr' ? 'Par ' : 'Por '} {p.authorName}
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-[8px] font-mono mt-1 flex-wrap">
                          {p.offsets.map((val, idx) => (
                            <span
                              key={idx}
                              className={`px-1 py-0.2 rounded-xs border ${
                                val === 0
                                  ? 'bg-[#f4ecd8] border-black/15 text-stone-700'
                                  : val > 0
                                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              }`}
                            >
                              P{idx + 1}:{val > 0 ? `+${val}%` : `${val}%`}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            handlePresetSelect(p.id);
                            setIsLibraryModalOpen(false);
                          }}
                          className={`px-2 py-1 border border-black text-[10px] font-bold cursor-pointer shadow-[1px_1px_0px_#000] transition-colors ${
                            isCurrentActive
                              ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                              : 'bg-white text-[#1a1a1a] hover:bg-black hover:text-white'
                          }`}
                          title={lang === 'fr' ? 'Charger ce preset pour le jeu' : 'Carregar este preset'}
                        >
                          {isCurrentActive
                            ? lang === 'fr'
                              ? '✓ Actif'
                              : '✓ Ativo'
                            : lang === 'fr'
                            ? '▶ Charger'
                            : '▶ Carregar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadToCustom(p);
                            setIsLibraryModalOpen(false);
                          }}
                          className="px-2 py-1 bg-white border border-black text-[10px] font-bold text-[#1a1a1a] hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
                          title={lang === 'fr' ? "Ouvrir dans l'Atelier" : "Abrir no Ateliê"}
                        >
                          ✏️
                        </button>
                        {canManagePreset(p) && (
                          <button
                            type="button"
                            onClick={() => setPresetToDelete(p)}
                            className="px-1.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border border-black text-[10px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
                            title={lang === 'fr' ? 'Supprimer définitivement' : 'Excluir definitivamente'}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-[#1a1a1a]/20">
              <button
                type="button"
                onClick={handleRefreshCloud}
                disabled={isLoadingCloud}
                className="px-2.5 py-1 bg-white border border-black text-xs font-bold text-[#1a1a1a] hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className={isLoadingCloud ? 'animate-spin inline-block' : ''}>🔄</span>
                {lang === 'fr' ? 'Synchroniser Cloud' : 'Sincronizar Nuvem'}
              </button>
              <button
                type="button"
                onClick={() => setIsLibraryModalOpen(false)}
                className="px-4 py-1.5 bg-[#1a1a1a] text-[#f4ecd8] font-cactus font-bold text-xs border border-black shadow-[2px_2px_0px_#000] hover:bg-[#8b2a1a] transition-colors cursor-pointer"
              >
                {lang === 'fr' ? 'Fermer' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modale de confirmation de suppression style Cordel */}
      {presetToDelete && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[85] flex items-center justify-center p-4 select-none"
          onClick={() => setPresetToDelete(null)}
        >
          <div
            className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-5 max-w-sm w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-4 text-[#1a1a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <h4 className="font-cactus text-xl font-bold uppercase text-[#8b2a1a]">
                  {lang === 'fr' ? 'Supprimer ce Balanço ?' : 'Excluir este Balanço?'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPresetToDelete(null)}
                className="text-lg font-bold hover:text-[#8b2a1a] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Corps */}
            <div className="flex flex-col gap-2 text-xs font-bold bg-[#eaddcf]/50 p-3 border border-black/15 rounded-sm">
              <p>
                {lang === 'fr'
                  ? 'Êtes-vous sûr de vouloir supprimer définitivement le preset suivant :'
                  : 'Tem certeza de que deseja excluir definitivamente o seguinte preset:'}
              </p>
              <div className="p-2 bg-white border border-black text-center font-cactus text-base font-bold text-[#8b2a1a]">
                « {presetToDelete.name} »
              </div>
              <p className="text-[10px] opacity-80 leading-tight">
                {lang === 'fr'
                  ? 'Cette action supprimera le preset de votre mémoire locale et de la collection Cloud (/balancos). Cette action est irréversible.'
                  : 'Esta ação excluirá o preset da sua memória local e da coleção Nuvem (/balancos). Esta ação é irreversível.'}
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPresetToDelete(null)}
                className="px-3 py-1.5 bg-white border-2 border-black font-cactus font-bold text-xs shadow-[1.5px_1.5px_0px_#000] hover:bg-[#eaddcf] transition-colors cursor-pointer"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white transition-colors cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                🗑️ {lang === 'fr' ? 'Supprimer définitivement' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Fenêtre de feedback style Cordel */}
      {statusFeedback && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4 select-none"
          onClick={() => setStatusFeedback(null)}
        >
          <div
            className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-5 max-w-sm w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-4 text-[#1a1a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête Cordel */}
            <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {statusFeedback.type === 'success' ? '⚖️' : statusFeedback.type === 'error' ? '⚠️' : 'ℹ️'}
                </span>
                <h4 className="font-cactus text-xl font-bold uppercase">
                  {statusFeedback.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setStatusFeedback(null)}
                className="text-lg font-bold hover:text-[#8b2a1a] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Corps du message */}
            <p className="text-xs leading-relaxed font-bold bg-[#eaddcf]/50 p-3 border border-black/15 rounded-sm">
              {statusFeedback.message}
            </p>

            {/* Bouton d'action */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setStatusFeedback(null)}
                className="px-4 py-1.5 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-sm border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white transition-colors cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                {lang === 'fr' ? 'D’accord' : 'Entendi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
