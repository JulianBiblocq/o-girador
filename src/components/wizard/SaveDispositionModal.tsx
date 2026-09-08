/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWizardStore } from '../../stores/useWizardStore';
import { useDispositionStore } from '../../stores/useDispositionStore';
import { DispositionVisibility, PlacedInstrumentConfig } from '../../types/disposition.types';
import { formatDispositionSummary } from '../../utils/dispositionUtils';

interface SaveDispositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fr' | 'pt';
  onSuccess?: (presetName: string) => void;
}

export const SaveDispositionModal: React.FC<SaveDispositionModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSuccess,
}) => {
  const { userProfile, isAdmin, currentUser } = useAuth();
  const placedInstruments = useWizardStore((state) => state.placedInstruments);
  const hasToada = useWizardStore((state) => state.hasToada);
  const addDisposition = useDispositionStore((state) => state.addDisposition);

  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<DispositionVisibility>(() => {
    if (userProfile?.groupId) return 'mestre_group';
    return 'private';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMestreOrAdmin =
    isAdmin ||
    userProfile?.role === 'mestre' ||
    (userProfile as any)?.dbRole === 'mestre';

  const hasGroup = Boolean(userProfile?.groupId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg(
        lang === 'fr'
          ? 'Veuillez donner un nom à la disposition.'
          : 'Por favor, dê um nome à disposição.'
      );
      return;
    }

    if (placedInstruments.length === 0) {
      setErrorMsg(
        lang === 'fr'
          ? 'Aucun instrument placé sur la scène.'
          : 'Nenhum instrumento colocado no palco.'
      );
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
      const authorId = ownerId;
      const authorName = userProfile?.displayName || (ownerId === 'local' ? 'Local' : 'Mestre');
      const groupId = hasGroup ? userProfile?.groupId : null;

      await addDisposition(
        {
          name: trimmedName,
          ownerId,
          authorId,
          authorName,
          groupId,
          visibility,
          instruments: cleanedInstruments,
          hasToada: Boolean(hasToada),
        },
        userProfile?.role
      );

      setName('');
      onSuccess?.(trimmedName);
      onClose();
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde de la disposition:', err);
      setErrorMsg(
        err?.message ||
          (lang === 'fr'
            ? 'Une erreur est survenue lors de la sauvegarde.'
            : 'Ocorreu um erro ao salvar.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = formatDispositionSummary(
    placedInstruments.map((i) => ({ instrumentType: i.instrumentType, x: i.x, y: i.y })),
    lang
  );

  return (
    <div className="fixed inset-0 z-[10050] bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-md bg-[#f4ecd8] border-3 border-[#1a1a1a] p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] text-[#1a1a1a] flex flex-col gap-4 font-cactus"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-2">
          <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
            <span>💾</span>
            {lang === 'fr' ? 'Enregistrer la Disposition' : 'Salvar a Disposição'}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 flex items-center justify-center border-2 border-[#1a1a1a] bg-[#8b2a1a] text-[#f4ecd8] font-bold text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Nom */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-[#1a1a1a]">
              {lang === 'fr' ? 'Nom de la disposition :' : 'Nome da disposição :'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                lang === 'fr' ? 'Ex: Maracatu de Baque Virado' : 'Ex: Maracatu de Baque Virado'
              }
              autoFocus
              className="w-full bg-[#fdfaf3] text-[#1a1a1a] border-2 border-[#1a1a1a] px-3 py-2 text-sm font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] outline-none focus:bg-white"
            />
          </div>

          {/* Récapitulatif instantané */}
          <div className="p-2.5 bg-[#ece4d0] border-2 border-[#1a1a1a] text-[11px] flex flex-col gap-1">
            <span className="font-bold uppercase tracking-wider text-[#8b2a1a]">
              {lang === 'fr' ? 'Configuration actuelle :' : 'Configuração atual :'}
            </span>
            <span className="leading-tight text-[#1a1a1a]/80">{summary}</span>
            {hasToada && (
              <span className="text-[10px] text-[#2e5339] font-bold mt-0.5">
                ✓ {lang === 'fr' ? 'Chant / Toada inclus' : 'Canto / Toada incluído'}
              </span>
            )}
          </div>

          {/* Portée / Visibilité */}
          <div className="flex flex-col gap-2 p-3 bg-[#ece4d0] border-2 border-[#1a1a1a]">
            <label className="text-xs font-bold uppercase text-[#1a1a1a]">
              {lang === 'fr' ? 'Portée & Partage :' : 'Alcance e Compartilhamento :'}
            </label>

            <div className="flex flex-col gap-2 mt-1 text-xs">
              {/* Privé */}
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="radio"
                  name="dispositionVisibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  className="accent-[#8b2a1a] cursor-pointer"
                />
                <span>
                  {lang === 'fr'
                    ? '🔒 Privé (Mon compte / Mémoire locale)'
                    : '🔒 Privado (Minha conta / Memória local)'}
                </span>
              </label>

              {/* Mon Groupe */}
              <label
                className={`flex items-center gap-2 font-bold ${
                  hasGroup ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <input
                  type="radio"
                  name="dispositionVisibility"
                  value="mestre_group"
                  checked={visibility === 'mestre_group'}
                  onChange={() => setVisibility('mestre_group')}
                  disabled={!hasGroup}
                  className="accent-[#8b2a1a] cursor-pointer"
                />
                <span>
                  👥{' '}
                  {lang === 'fr'
                    ? `Mon Groupe (${userProfile?.groupName || userProfile?.groupId || 'Groupe'})`
                    : `Meu Grupo (${userProfile?.groupName || userProfile?.groupId || 'Grupo'})`}
                </span>
              </label>

              {/* Public */}
              <label
                className={`flex items-center gap-2 font-bold ${
                  isMestreOrAdmin ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <input
                  type="radio"
                  name="dispositionVisibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                  disabled={!isMestreOrAdmin}
                  className="accent-[#8b2a1a] cursor-pointer"
                />
                <span>
                  🌐{' '}
                  {lang === 'fr'
                    ? 'Catalogue Public (Accessible à tous)'
                    : 'Catálogo Público (Acessível a todos)'}
                </span>
              </label>
              {!isMestreOrAdmin && (
                <span className="text-[10px] text-[#1a1a1a]/60 italic ml-5">
                  {lang === 'fr'
                    ? '* Seul un Mestre ou Admin peut publier dans le catalogue public.'
                    : '* Apenas um Mestre ou Admin pode publicar no catálogo público.'}
                </span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-2 bg-[#8b2a1a]/10 border-2 border-[#8b2a1a] text-[#8b2a1a] text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-end gap-2 pt-2 border-t-2 border-[#1a1a1a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#d7cfbb] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer uppercase font-bold text-xs"
            >
              {lang === 'fr' ? 'Annuler' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || placedInstruments.length === 0}
              className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer uppercase font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? lang === 'fr'
                  ? 'Enregistrement...'
                  : 'Salvando...'
                : lang === 'fr'
                ? 'Enregistrer'
                : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
