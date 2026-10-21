/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSequencerStore, isSequencerVisibleTrack } from '../../stores/useSequencerStore';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { instrumentsConfig } from '../../data';
import { getEnsembleVocabulary } from '../../universes/styleVocabularyConfig';
import { MOBILE_FAMILIES } from './mobileFamilyConfig';
import { MobilePercTrackSelector } from './MobilePercTrackSelector';
import { Users } from 'lucide-react';
import { Track } from '../../types';

interface Props {
  primaryTrackId: number | null;
  setPrimaryTrackId: (id: number) => void;
  referenceTrackId: number | null;
  setReferenceTrackId: (id: number | null) => void;
  isLetraActive: boolean;
  lang?: 'fr' | 'pt';
}

export const MobilePercControls: React.FC<Props> = ({
  primaryTrackId, setPrimaryTrackId, referenceTrackId, setReferenceTrackId, isLetraActive, lang = 'pt',
}) => {
  const tracks = useSequencerStore((s) => s.tracks);
  const setTracks = useSequencerStore((s) => s.setTracks);
  const getInstrumentLabel = useNomenclatureStore((s) => s.getInstrumentLabel);
  const [isFamilyMuted, setIsFamilyMuted] = useState(false);
  const [isRestMuted, setIsRestMuted] = useState(false);

  const eligibleRodaTracks = tracks.filter((t) => {
    if (t.isHidden || !isSequencerVisibleTrack(t, tracks)) return false;
    if (t.isBusFolder && !t.isLinkFolder) return false;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst || inst.id === 'apito') return false;
    if (inst.type === 'voice' || inst.id === 'puxador' || inst.id === 'coro' || inst.id === 'toada') return false;
    return true;
  });

  const primaryTrack = tracks.find((t) => t.id === primaryTrackId);
  const referenceTrack = tracks.find((t) => t.id === referenceTrackId);
  const primaryInst = primaryTrack ? instrumentsConfig[primaryTrack.instrumentIdx] : null;
  const primaryFam = primaryInst ? MOBILE_FAMILIES.find((f) => f.instrumentIds.includes(primaryInst.id)) : null;

  useEffect(() => {
    if (referenceTrackId !== null && !eligibleRodaTracks.some((t) => t.id === referenceTrackId && t.id !== primaryTrackId)) {
      setReferenceTrackId(null);
    }
  }, [eligibleRodaTracks, referenceTrackId, primaryTrackId, setReferenceTrackId]);

  const getTrackName = (t: any) => getInstrumentLabel(t) || t?.name || '';

  const toggleMute = (trackId: number | null) => {
    if (trackId === null) return;
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, isMute: !t.isMute } : t)));
  };

  const toggleFamilyMute = () => {
    if (!primaryFam) return;
    const nextState = !isFamilyMuted;
    setIsFamilyMuted(nextState);
    setTracks((prev) =>
      prev.map((t) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (inst && primaryFam.instrumentIds.includes(inst.id)) return { ...t, isMute: nextState };
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
    <div className="w-full bg-[#121212] px-2 py-1 flex flex-col gap-1 border-b border-[var(--cordel-border)] shrink-0 select-none">
      <div className="grid grid-cols-2 gap-1.5">
        <MobilePercTrackSelector
          label={lang === 'pt' ? 'Meu Instrumento' : 'Mon Pupitre'}
          labelColorClass="text-[#b94a2c]"
          selectedTrackId={primaryTrackId}
          onSelectTrackId={(id) => {
            if (id !== null) {
              setPrimaryTrackId(id);
              try { localStorage.setItem('sequenciador_perc_primary_track', String(id)); } catch (_) {}
            }
          }}
          trackOptions={eligibleRodaTracks}
          getTrackName={getTrackName}
          currentTrack={primaryTrack}
          onToggleMute={() => toggleMute(primaryTrackId)}
        />
        <MobilePercTrackSelector
          label={lang === 'pt' ? 'Repère : [ Guia ]' : 'Repère : [ Guide ]'}
          selectedTrackId={referenceTrackId}
          onSelectTrackId={setReferenceTrackId}
          trackOptions={eligibleRodaTracks.filter((t) => t.id !== primaryTrackId)}
          getTrackName={getTrackName}
          allowNone
          noneLabel={lang === 'pt' ? 'Nenhum' : 'Aucun'}
          currentTrack={referenceTrack}
          onToggleMute={() => toggleMute(referenceTrackId)}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={toggleFamilyMute}
          disabled={!primaryFam}
          className={`h-7 px-1.5 cordel-border-sm font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_var(--cordel-border)] active:translate-y-0.5 ${
            !primaryFam ? 'opacity-30' : isFamilyMuted ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#f4ecd8]' : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
          }`}
          title="Couper le son de toute la famille de mon instrument"
        >
          <Users size={12} />
          <span className="truncate">{lang === 'pt' ? 'Mudo Família' : 'Muet Famille'} : {isFamilyMuted ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={toggleRestOfEnsembleMute}
          className={`h-7 px-1.5 cordel-border-sm font-cactus font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0_var(--cordel-border)] active:translate-y-0.5 ${
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
