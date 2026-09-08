/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWizardStore, PlacedInstrument } from '../../stores/useWizardStore';
import { useDispositionStore } from '../../stores/useDispositionStore';
import { DispositionPreset } from '../../types/disposition.types';
import { formatDispositionSummary } from '../../utils/dispositionUtils';

interface LoadDispositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fr' | 'pt';
  onLoaded?: (presetName: string) => void;
}

type TabType = 'mine' | 'group' | 'public';

export const LoadDispositionModal: React.FC<LoadDispositionModalProps> = ({
  isOpen,
  onClose,
  lang,
  onLoaded,
}) => {
  const { userProfile, isAdmin, currentUser } = useAuth();
  const dispositions = useDispositionStore((state) => state.dispositions);
  const deleteDisposition = useDispositionStore((state) => state.deleteDisposition);
  const isLoadingCloud = useDispositionStore((state) => state.isLoadingCloud);
  const setPlacedInstruments = useWizardStore((state) => state.setPlacedInstruments);
  const setHasToada = useWizardStore((state) => state.setHasToada);

  const [activeTab, setActiveTab] = useState<TabType>('mine');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const userUid = userProfile?.uid || currentUser?.uid || 'local';
  const groupId = userProfile?.groupId ? String(userProfile.groupId).toLowerCase() : null;
  const isMestreOrAdmin =
    isAdmin ||
    userProfile?.role === 'mestre' ||
    (userProfile as any)?.dbRole === 'mestre';

  // Filtrage par onglet
  const filteredDispositions = dispositions.filter((d) => {
    if (activeTab === 'mine') {
      return d.ownerId === userUid || d.ownerId === 'local' || d.authorId === userUid;
    }
    if (activeTab === 'group') {
      const matchVisibility = d.visibility === 'mestre_group';
      const matchGroup = groupId && d.groupId && String(d.groupId).toLowerCase() === groupId;
      return matchVisibility || matchGroup;
    }
    if (activeTab === 'public') {
      return d.visibility === 'public' || d.visibility === 'admin_global';
    }
    return true;
  });

  const handleLoad = (preset: DispositionPreset) => {
    // Génération d'IDs uniques frais pour chaque instrument
    const freshInstruments: PlacedInstrument[] = preset.instruments.map((inst) => ({
      id: `${inst.instrumentType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      instrumentType: inst.instrumentType,
      x: inst.x,
      y: inst.y,
    }));

    setPlacedInstruments(freshInstruments);

    if (preset.hasToada !== undefined) {
      setHasToada(Boolean(preset.hasToada));
    }

    onLoaded?.(preset.name);
    onClose();
  };

  const handleDelete = async (e: React.MouseEvent, preset: DispositionPreset) => {
    e.stopPropagation();
    const confirmText =
      lang === 'fr'
        ? `Supprimer définitivement la disposition « ${preset.name} » ?`
        : `Excluir permanentemente a disposição « ${preset.name} »?`;

    if (window.confirm(confirmText)) {
      setDeletingId(preset.id);
      try {
        await deleteDisposition(preset.id);
      } catch (err) {
        console.error('Erreur lors de la suppression de la disposition:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const canDelete = (preset: DispositionPreset): boolean => {
    const isAuthor =
      preset.ownerId === userUid ||
      preset.authorId === userUid ||
      preset.ownerId === 'local';
    const isGroupMestre =
      isMestreOrAdmin &&
      groupId &&
      preset.groupId &&
      String(preset.groupId).toLowerCase() === groupId;
    return isAuthor || isGroupMestre;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-xl max-h-[85vh] bg-[#f4ecd8] border-3 border-[#1a1a1a] p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] text-[#1a1a1a] flex flex-col font-cactus overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📐</span>
            <div>
              <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wide leading-none">
                {lang === 'fr' ? 'Dispositions Enregistrées' : 'Disposições Salvas'}
              </h3>
              <p className="text-[10px] text-[#1a1a1a]/60 uppercase tracking-wider mt-0.5">
                {lang === 'fr'
                  ? 'Rappelez instantanément vos configurations de scène'
                  : 'Recupere instantaneamente suas configurações de palco'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 flex items-center justify-center border-2 border-[#1a1a1a] bg-[#8b2a1a] text-[#f4ecd8] font-bold text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Onglets */}
        <div className="flex border-b-2 border-[#1a1a1a] gap-2 pt-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`px-3 py-1.5 border-t-2 border-x-2 border-[#1a1a1a] text-xs font-bold uppercase cursor-pointer transition-all ${
              activeTab === 'mine'
                ? 'bg-[#8b2a1a] text-[#f4ecd8] translate-y-[2px]'
                : 'bg-[#ece4d0] text-[#1a1a1a] hover:bg-[#e2d8be]'
            }`}
          >
            {lang === 'fr' ? 'Mes Dispositions' : 'Minhas Disposições'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('group')}
            className={`px-3 py-1.5 border-t-2 border-x-2 border-[#1a1a1a] text-xs font-bold uppercase cursor-pointer transition-all ${
              activeTab === 'group'
                ? 'bg-[#8b2a1a] text-[#f4ecd8] translate-y-[2px]'
                : 'bg-[#ece4d0] text-[#1a1a1a] hover:bg-[#e2d8be]'
            }`}
          >
            {lang === 'fr' ? 'Mon Groupe' : 'Meu Grupo'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            className={`px-3 py-1.5 border-t-2 border-x-2 border-[#1a1a1a] text-xs font-bold uppercase cursor-pointer transition-all ${
              activeTab === 'public'
                ? 'bg-[#8b2a1a] text-[#f4ecd8] translate-y-[2px]'
                : 'bg-[#ece4d0] text-[#1a1a1a] hover:bg-[#e2d8be]'
            }`}
          >
            {lang === 'fr' ? 'Publiques' : 'Públicas'}
          </button>
        </div>

        {/* Liste des cartes */}
        <div className="flex-1 overflow-y-auto py-3 pr-1 flex flex-col gap-2.5 min-h-[220px]">
          {isLoadingCloud && (
            <div className="text-center py-2 text-xs text-[#8b2a1a] font-bold animate-pulse">
              {lang === 'fr' ? 'Synchronisation Cloud en cours...' : 'Sincronizando Nuvem...'}
            </div>
          )}

          {filteredDispositions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#1a1a1a]/60 gap-2 border-2 border-dashed border-[#1a1a1a]/30">
              <span className="text-3xl">📭</span>
              <p className="text-xs uppercase font-bold">
                {lang === 'fr'
                  ? 'Aucune disposition enregistrée dans cette catégorie'
                  : 'Nenhuma disposição salva nesta categoria'}
              </p>
              <p className="text-[10px]">
                {activeTab === 'mine'
                  ? lang === 'fr'
                    ? 'Placez des instruments sur La Place et cliquez sur "Enregistrer".'
                    : 'Coloque instrumentos no Palco e clique em "Salvar".'
                  : ''}
              </p>
            </div>
          ) : (
            filteredDispositions.map((preset) => {
              const dateStr = preset.createdAt
                ? new Date(preset.createdAt).toLocaleDateString(
                    lang === 'fr' ? 'fr-FR' : 'pt-BR',
                    { day: 'numeric', month: 'short', year: 'numeric' }
                  )
                : '';
              const summary = formatDispositionSummary(preset.instruments, lang);
              const isDeletable = canDelete(preset);

              return (
                <div
                  key={preset.id}
                  className="bg-[#fdfaf3] border-2 border-[#1a1a1a] p-3 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm md:text-base font-bold text-[#1a1a1a] uppercase leading-tight">
                        {preset.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-[#1a1a1a]/60 mt-0.5">
                        {dateStr && <span>📅 {dateStr}</span>}
                        {preset.authorName && (
                          <span>• ✍️ {preset.authorName}</span>
                        )}
                        {preset.visibility === 'public' && (
                          <span className="text-[#8b2a1a] font-bold">• 🌐 Public</span>
                        )}
                        {preset.visibility === 'mestre_group' && (
                          <span className="text-[#2e5339] font-bold">• 👥 Groupe</span>
                        )}
                      </div>
                    </div>

                    {/* Actions : Charger & Supprimer */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoad(preset)}
                        className="px-3 py-1 bg-[#2e5339] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer font-bold uppercase text-[11px] flex items-center gap-1"
                      >
                        <span>⚡</span>
                        {lang === 'fr' ? 'Charger' : 'Carregar'}
                      </button>

                      {isDeletable && (
                        <button
                          type="button"
                          disabled={deletingId === preset.id}
                          onClick={(e) => handleDelete(e, preset)}
                          title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                          className="w-7 h-7 flex items-center justify-center bg-[#8b2a1a]/10 hover:bg-[#8b2a1a] text-[#8b2a1a] hover:text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer text-xs disabled:opacity-50"
                        >
                          {deletingId === preset.id ? '...' : '🗑️'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Récapitulatif des instruments */}
                  <div className="text-[11px] text-[#1a1a1a]/80 bg-[#ece4d0]/60 p-2 border border-[#1a1a1a]/40 leading-snug">
                    <span className="font-bold text-[#8b2a1a]">
                      {lang === 'fr' ? 'Disposition :' : 'Disposição :'}
                    </span>{' '}
                    {summary}
                    {preset.hasToada && (
                      <span className="ml-2 inline-block text-[10px] text-[#2e5339] font-bold">
                        [+ {lang === 'fr' ? 'Chant / Toada' : 'Canto / Toada'}]
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-[#1a1a1a] pt-3 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#d7cfbb] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer uppercase font-bold text-xs"
          >
            {lang === 'fr' ? 'Fermer' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
};
