/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useWorkspaceTemplateStore } from '../stores/useWorkspaceTemplateStore';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import { instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { WorkspaceTemplateOptions, WorkspaceTemplateTrack } from '../types';
import { Language } from '../types';
import { XiloScroll } from './XiloIcons';

interface SaveWorkspaceTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const SaveWorkspaceTemplateModal: React.FC<SaveWorkspaceTemplateModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const { userProfile } = useAuth();
  const audio = useAudio();
  const tracks = useSequencerStore((state) => state.tracks);
  const rodaTrackOrder = useSequencerStore((state) => state.rodaTrackOrder);
  const existingTemplates = useWorkspaceTemplateStore((state) => state.templates);

  const baseDefaultName = lang === 'pt' ? 'Modelo Batuque' : 'Gabarit Batuque';

  const computedDefaultName = React.useMemo(() => {
    if (!existingTemplates.some((t) => t.name.toLowerCase() === baseDefaultName.toLowerCase())) {
      return baseDefaultName;
    }
    let counter = 1;
    while (existingTemplates.some((t) => t.name.toLowerCase() === `${baseDefaultName.toLowerCase()} ${counter}`)) {
      counter++;
    }
    return `${baseDefaultName} ${counter}`;
  }, [existingTemplates, baseDefaultName]);

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cases à cocher modulaires (toutes cochées par défaut)
  const [options, setOptions] = useState<WorkspaceTemplateOptions>({
    includeStructure: true,
    includeDisplayOrder: true,
    includeVolumePan: true,
    includeEQ: true,
    includeFX: true,
  });

  if (!isOpen) return null;

  const toggleOption = (key: keyof WorkspaceTemplateOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || computedDefaultName;
    if (isSaving) return;

    setIsSaving(true);

    try {
      // 1. Préparer les pistes du snapshot (SANS données de notes / patterns)
      const templateTracks: WorkspaceTemplateTrack[] = tracks.map((t) => {
        const item: WorkspaceTemplateTrack = {
          id: t.id,
          instrumentIdx: t.instrumentIdx,
          customName: t.customName,
          isBusFolder: t.isBusFolder,
          isLinkFolder: t.isLinkFolder,
          isLinkMaster: t.isLinkMaster,
          busId: t.busId,
          linkedToTrackId: t.linkedToTrackId,
        };

        if (options.includeVolumePan) {
          item.volumeVal = t.volumeVal;
          item.pan = t.pan;
          item.panVal = t.panVal;
        }

        if (options.includeEQ) {
          item.eqBands = t.eqBands;
          item.lowCut = t.lowCut;
        }

        if (options.includeFX) {
          item.reverbVal = t.reverbVal;
          item.fxSends = t.fxSends;
        }

        return item;
      });

      // 2. Extraire les réglages Master si FX / EQ inclus
      const currentMasterFX = useSequencerStore.getState().masterFX;
      const masterSettings = {
        masterVol: audio?.masterVol,
        masterEQ: options.includeEQ ? audio?.masterEQ : undefined,
        masterCompressor: audio?.masterCompressor,
        reverbDecay: options.includeFX ? audio?.reverbDecay : undefined,
        masterReverbVol: options.includeFX ? audio?.masterReverbVol : undefined,
        masterFX: options.includeFX && currentMasterFX ? JSON.parse(JSON.stringify(currentMasterFX)) : undefined,
      };

      const ownerId = userProfile?.uid || 'local';
      const authorName = userProfile?.displayName || (ownerId === 'local' ? 'Local' : 'Utilisateur');

      await useWorkspaceTemplateStore.getState().addTemplate(
        {
          name: finalName,
          ownerId,
          authorName,
          options,
          tracks: templateTracks,
          rodaTrackOrder: options.includeDisplayOrder ? [...rodaTrackOrder] : tracks.map((t) => t.id),
          masterSettings,
        },
        userProfile?.role
      );

      setSuccessMessage(
        lang === 'pt' ? 'Modelo salvo com sucesso!' : 'Gabarit mémorisé avec succès !'
      );
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(lang === 'pt' ? `Erro ao salvar: ${err.message}` : `Erreur lors de la sauvegarde : ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const modalRoot = document.getElementById('modal-root') || document.body;

  // Liste des instruments uniques pour l'aperçu
  const visibleInstruments = tracks
    .filter((t) => !t.isBusFolder || t.isLinkFolder)
    .map((t) => instrumentsConfig[t.instrumentIdx])
    .filter(Boolean);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[250] flex items-center justify-center p-4 select-none font-sans"
      onClick={onClose}
    >
      <div
        className="bg-[#f4ecd8] border-4 border-[#1a1a1a] p-6 md:p-8 max-w-xl w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-5 relative text-[#1a1a1a] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#1a1a1a] hover:text-[#8b2a1a] font-bold text-2xl hover:scale-110 duration-200 cursor-pointer"
          aria-label="Fermer"
        >
          ✕
        </button>

        {/* En-tête Livret Cordel */}
        <div className="border-b-4 border-[#1a1a1a] pb-3 pr-8">
          <h3 className="font-cactus text-2xl md:text-3xl font-bold uppercase tracking-wider flex items-center gap-2">
            <XiloScroll size={26} className="shrink-0" />
            <span>
              {lang === 'pt' ? 'Salvar Modelo de Batuque' : 'Mémoriser le Gabarit de Batuque'}
            </span>
          </h3>
          <p className="text-[#1a1a1a]/70 text-xs md:text-sm mt-1 font-cactus font-bold tracking-wide uppercase">
            {lang === 'pt'
              ? 'Guarda a configuração de mixagem sem incluir as notas'
              : 'Enregistre la configuration de mixage sans inclure les notes'}
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Champ nom */}
          <div className="flex flex-col gap-1">
            <label className="font-cactus font-bold text-xs uppercase tracking-wider">
              {lang === 'pt' ? 'Nome do Modelo' : 'Nom du Gabarit'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={computedDefaultName}
              className="bg-white border-2 border-[#1a1a1a] p-2 text-sm font-cactus font-bold tracking-wider outline-none focus:bg-[#fbf8f0] transition-colors"
              autoFocus
            />
            <span className="text-[10px] text-[#1a1a1a]/60">
              {lang === 'pt'
                ? `Padrão : "${computedDefaultName}" (ex: Samambaia, Batuque Nação...)`
                : `Par défaut : "${computedDefaultName}" (ex: Samambaia, Batuque Nação...)`}
            </span>
          </div>

          {/* Aperçu des instruments */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[#1a1a1a]/70">
              {lang === 'pt'
                ? `Instrumentos detectados (${visibleInstruments.length}) :`
                : `Instruments détectés (${visibleInstruments.length}) :`}
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar p-1.5 bg-white/40 border border-[#1a1a1a]/20">
              {visibleInstruments.map((inst, i) => (
                <div
                  key={`${inst.id}-${i}`}
                  className="flex items-center gap-1 bg-white px-2 py-0.5 border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] text-[10px] font-cactus font-bold"
                >
                  <img
                    src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                    alt={inst.name}
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span>{inst.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cases à cocher modulaires */}
          <div className="flex flex-col gap-2 border-t-2 border-[#1a1a1a]/20 pt-3">
            <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[#1a1a1a]/80">
              {lang === 'pt' ? 'Elementos a incluir :' : 'Éléments à inclure :'}
            </span>

            {/* 1. Structure & Bus */}
            <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85">
              <input
                type="checkbox"
                checked={options.includeStructure}
                onChange={() => toggleOption('includeStructure')}
                className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
              />
              <span className="font-medium">
                {lang === 'pt'
                  ? 'Estrutura do batuque & Bus (links mestre/escravos, subgrupos)'
                  : 'Structure du batuque & Bus (liens maître/esclaves, sous-groupes)'}
              </span>
            </label>

            {/* 2. Ordres d'affichage */}
            <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85">
              <input
                type="checkbox"
                checked={options.includeDisplayOrder}
                onChange={() => toggleOption('includeDisplayOrder')}
                className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
              />
              <span className="font-medium">
                {lang === 'pt'
                  ? 'Ordens de exibição (mesa de mixagem & Roda)'
                  : 'Ordres d\'affichage (table de mixage & Roda)'}
              </span>
            </label>

            {/* 3. Niveaux de volume & Pan */}
            <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85">
              <input
                type="checkbox"
                checked={options.includeVolumePan}
                onChange={() => toggleOption('includeVolumePan')}
                className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
              />
              <span className="font-medium">
                {lang === 'pt'
                  ? 'Níveis de volume & Panoramas'
                  : 'Niveaux de volume & Panoramiques'}
              </span>
            </label>

            {/* 4. Égalisations */}
            <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85">
              <input
                type="checkbox"
                checked={options.includeEQ}
                onChange={() => toggleOption('includeEQ')}
                className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
              />
              <span className="font-medium">
                {lang === 'pt'
                  ? 'Equalizações (pistas individuais & Master EQ)'
                  : 'Égalisations (pistes individuelles & Master EQ)'}
              </span>
            </label>

            {/* 5. Départs & retours d'effets */}
            <label className="flex items-center gap-2 text-xs font-sans cursor-pointer hover:opacity-85">
              <input
                type="checkbox"
                checked={options.includeFX}
                onChange={() => toggleOption('includeFX')}
                className="w-4 h-4 accent-[#8b2a1a] cursor-pointer"
              />
              <span className="font-medium">
                {lang === 'pt'
                  ? 'Efeitos (envios das pistas & Master FX Rack)'
                  : 'Effets (départs des pistes & Master FX Rack)'}
              </span>
            </label>
          </div>

          {/* Message de succès */}
          {successMessage && (
            <div className="bg-emerald-100 border-2 border-emerald-800 text-emerald-900 px-3 py-2 text-xs font-bold text-center shadow-[2px_2px_0px_#065f46]">
              {successMessage}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-end gap-3 mt-3 pt-3 border-t-2 border-[#1a1a1a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-[#1a1a1a] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase shadow-[3px_3px_0px_#1a1a1a] hover:bg-[#1a1a1a]/5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
            >
              {lang === 'pt' ? 'Cancelar' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase shadow-[3px_3px_0px_#1a1a1a] hover:bg-[#a83220] cursor-pointer disabled:opacity-50 active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
            >
              <XiloScroll size={14} className="shrink-0" />
              <span>
                {isSaving
                  ? (lang === 'pt' ? 'Salvando...' : 'Enregistrement...')
                  : (lang === 'pt' ? 'Salvar Modelo' : 'Mémoriser le gabarit')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    modalRoot
  );
};
