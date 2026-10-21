/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { instrumentsConfig } from '../../data';
import { getEnsembleVocabulary } from '../../universes/styleVocabularyConfig';
import { MOBILE_FAMILIES } from './mobileFamilyConfig';
import { Volume2, VolumeX, Users } from 'lucide-react';

interface Props {
  primaryTrackId: number | null;
  setPrimaryTrackId: (id: number) => void;
  referenceTrackId: number | null;
  setReferenceTrackId: (id: number | null) => void;
  isLetraActive: boolean;
  lang?: 'fr' | 'pt';
}

type PupilMuteState = 'audible' | 'mute_self' | 'mute_family';

export const MobilePercControls: React.FC<Props> = ({
  primaryTrackId, setPrimaryTrackId, referenceTrackId, setReferenceTrackId, isLetraActive, lang = 'pt',
}) => {
  const tracks = useSequencerStore((s) => s.tracks);
  const setTracks = useSequencerStore((s) => s.setTracks);
  const getInstrumentLabel = useNomenclatureStore((s) => s.getInstrumentLabel);
  const [pupilMute, setPupilMute] = useState<PupilMuteState>('audible');
  const [isRestMuted, setIsRestMuted] = useState(false);

  const percTracks = tracks.filter((t) => {
    const inst = instrumentsConfig[t.instrumentIdx];
    return inst && inst.type !== 'voice' && inst.id !== 'puxador' && inst.id !== 'coro';
  });
  const primaryTrack = tracks.find((t) => t.id === primaryTrackId);
  const primaryInst = primaryTrack ? instrumentsConfig[primaryTrack.instrumentIdx] : null;
  const primaryFam = primaryInst ? MOBILE_FAMILIES.find((f) => f.instrumentIds.includes(primaryInst.id)) : null;

  const getTrackName = (t: any) => getInstrumentLabel(t) || t.name;

  const cyclePupilMute = () => {
    if (!primaryTrack) return;
    const nextState: PupilMuteState = pupilMute === 'audible' ? 'mute_self' : pupilMute === 'mute_self' ? 'mute_family' : 'audible';
    setPupilMute(nextState);

    setTracks((prev) =>
      prev.map((t) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (nextState === 'audible' && t.id === primaryTrack.id) return { ...t, isMute: false };
        if (nextState === 'mute_self') return t.id === primaryTrack.id ? { ...t, isMute: true } : t;
        if (nextState === 'mute_family') {
          const inSameFam = primaryFam && inst && primaryFam.instrumentIds.includes(inst.id);
          return inSameFam ? { ...t, isMute: true } : t;
        }
        return t;
      })
    );
  };

  const toggleRestOfEnsembleMute = () => {
    const nextState = !isRestMuted;
    setIsRestMuted(nextState);

    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === primaryTrackId || t.id === referenceTrackId) return t;
        const inst = instrumentsConfig[t.instrumentIdx];
        const isVocal = inst && (inst.type === 'voice' || inst.id === 'puxador' || inst.id === 'coro');
        if (isVocal && isLetraActive) return { ...t, isMute: false };
        return { ...t, isMute: nextState };
      })
    );
  };

  const vocab = getEnsembleVocabulary('maracatu', lang);

  return (
    <div className="w-full bg-[#121212] px-2 py-1.5 flex flex-col gap-1.5 border-b border-[var(--cordel-border)] shrink-0 select-none">
      {/* 1. Sélection Pupitre élève & Instrument de Repère */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] font-mono uppercase text-[#b94a2c] font-bold truncate">
            {lang === 'pt' ? 'Meu Instrumento' : 'Mon Pupitre'}
          </label>
          <select
            value={primaryTrackId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              setPrimaryTrackId(id);
              try { localStorage.setItem('sequenciador_perc_primary_track', String(id)); } catch (_) {}
            }}
            className="w-full bg-[#1a1a1a] text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase px-1.5 py-1 cordel-border-sm cursor-pointer shadow-[1px_1px_0_var(--cordel-border)] focus:outline-none"
          >
            {percTracks.map((t) => (<option key={t.id} value={t.id}>{getTrackName(t)}</option>))}
          </select>
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] font-mono uppercase text-[var(--cordel-text)]/70 font-bold truncate">
            {lang === 'pt' ? 'Repère : [ Guia ]' : 'Repère : [ Guide ]'}
          </label>
          <select
            value={referenceTrackId ?? ''}
            onChange={(e) => setReferenceTrackId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-[#1a1a1a] text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase px-1.5 py-1 cordel-border-sm cursor-pointer shadow-[1px_1px_0_var(--cordel-border)] focus:outline-none"
          >
            <option value="">{lang === 'pt' ? 'Nenhum' : 'Aucun'}</option>
            {percTracks.filter((t) => t.id !== primaryTrackId).map((t) => (<option key={t.id} value={t.id}>{getTrackName(t)}</option>))}
          </select>
        </div>
      </div>

      {/* 2. Contrôles Audio Rapides */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={cyclePupilMute}
          className={`h-8 px-2 cordel-border-sm font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors shadow-[1px_1px_0_var(--cordel-border)] active:translate-y-0.5 ${
            pupilMute === 'audible' ? 'bg-[#1a1a1a] text-[#27ae60] border-[#27ae60]/60' : pupilMute === 'mute_self' ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#d4af37] text-black border-black font-extrabold'
          }`}
          title="Basculer Audible / Muet Seul / Muet Famille"
        >
          {pupilMute === 'audible' ? <Volume2 size={13} /> : pupilMute === 'mute_self' ? <VolumeX size={13} /> : <Users size={13} />}
          <span className="truncate">
            {pupilMute === 'audible' ? 'Audible' : pupilMute === 'mute_self' ? (lang === 'pt' ? 'Mudo (Só)' : 'Muet (Seul)') : (lang === 'pt' ? 'Mudo (Família)' : 'Muet (Famille)')}
          </span>
        </button>

        <button
          onClick={toggleRestOfEnsembleMute}
          className={`h-8 px-2 cordel-border-sm font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_var(--cordel-border)] active:translate-y-0.5 ${
            isRestMuted ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
          }`}
          title={`Muter / Démuter le ${vocab.restOfEnsemble}`}
        >
          <span className="truncate">{vocab.restOfEnsemble} : {isRestMuted ? 'OFF' : 'ON'}</span>
        </button>
      </div>
    </div>
  );
};
