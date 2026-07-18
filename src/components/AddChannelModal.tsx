/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Music, FolderOpen, Link, X, Search, Check } from 'lucide-react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencer } from '../contexts/SequencerContext';

interface AddChannelModalProps {
  onClose: () => void;
}

const translations: Record<string, Record<string, string>> = {
  fr: {
    title: "Ajouter un canal",
    tabAudio: "Piste Audio",
    tabSection: "Section (Bus)",
    tabLink: "Maître / Esclave",
    searchPlaceholder: "Rechercher un instrument...",
    noTracksBus: "Aucune piste individuelle dans le projet pour créer un bus. Ajoutez d'abord des pistes audio.",
    noTracksLink: "Aucune piste individuelle dans le projet pour créer une liaison. Ajoutez d'abord des pistes audio.",
    selectBusTracks: "Sélectionnez les pistes à regrouper dans le bus :",
    busNameLabel: "Nom du bus audio :",
    btnCreateBus: "Créer le bus",
    selectMaster: "Sélectionnez la piste Maître (1 seule) :",
    selectSlaves: "Sélectionnez les pistes Esclaves :",
    linkGroupNameLabel: "Nom du groupe de liaison :",
    btnCreateLink: "Créer la liaison",
    errorNoMaster: "Veuillez sélectionner une piste Maître.",
    errorNoSlaves: "Veuillez sélectionner au moins une piste Esclave.",
    errorNoBusTracks: "Veuillez sélectionner au moins une piste pour le bus.",
    errorNoBusName: "Veuillez saisir un nom pour le bus.",
    errorNoLinkName: "Veuillez saisir un nom pour la liaison.",
  },
  pt: {
    title: "Adicionar canal",
    tabAudio: "Pista de Áudio",
    tabSection: "Seção (Bus)",
    tabLink: "Mestre / Escravo",
    searchPlaceholder: "Buscar instrumento...",
    noTracksBus: "Nenhuma pista no projeto para criar um bus. Adicione pistas de áudio primeiro.",
    noTracksLink: "Nenhuma pista no projeto para criar um vínculo. Adicione pistas de áudio primeiro.",
    selectBusTracks: "Selecione as pistas para agrupar no bus:",
    busNameLabel: "Nome do bus de áudio:",
    btnCreateBus: "Criar bus",
    selectMaster: "Selecione a pista Mestre (apenas 1):",
    selectSlaves: "Selecione as pistas Escravas:",
    linkGroupNameLabel: "Nome do grupo de vínculo:",
    btnCreateLink: "Criar vínculo",
    errorNoMaster: "Selecione uma pista Mestre.",
    errorNoSlaves: "Selecione pelo menos uma pista Escrava.",
    errorNoBusTracks: "Selecione pelo menos uma pista para o bus.",
    errorNoBusName: "Digite um nome para o bus.",
    errorNoLinkName: "Digite um nome para o vínculo.",
  },
  en: {
    title: "Add Channel",
    tabAudio: "Audio Track",
    tabSection: "Section (Bus)",
    tabLink: "Master / Slave",
    searchPlaceholder: "Search instrument...",
    noTracksBus: "No tracks in the project to create a bus. Add audio tracks first.",
    noTracksLink: "No tracks in the project to create a link. Add audio tracks first.",
    selectBusTracks: "Select tracks to group in the bus:",
    busNameLabel: "Audio bus name:",
    btnCreateBus: "Create bus",
    selectMaster: "Select the Master track (only 1):",
    selectSlaves: "Select the Slave tracks:",
    linkGroupNameLabel: "Link group name:",
    btnCreateLink: "Create link",
    errorNoMaster: "Please select a Master track.",
    errorNoSlaves: "Please select at least one Slave track.",
    errorNoBusTracks: "Please select at least one track for the bus.",
    errorNoBusName: "Please enter a name for the bus.",
    errorNoLinkName: "Please enter a name for the link group.",
  }
};

export const AddChannelModal: React.FC<AddChannelModalProps> = ({ onClose }) => {
  const sequencer = useSequencer();
  const lang = useSequencerStore(state => state.lang);
  const tracks = useSequencerStore(state => state.tracks);
  const currentMeasure = useSequencerStore(state => state.currentMeasure);
  const handleCreateCustomBus = useSequencerStore(state => state.handleCreateCustomBus);
  const handleCreateCustomLinkGroup = useSequencerStore(state => state.handleCreateCustomLinkGroup);

  const t = (key: string) => {
    const dict = translations[lang] || translations.fr;
    return dict[key] || key;
  };

  const [activeTab, setActiveTab] = useState<'audio' | 'section' | 'link'>('audio');

  // --- Search state for instrument grid ---
  const [searchQuery, setSearchQuery] = useState('');

  // --- Section/Bus state ---
  const [selectedBusTrackIds, setSelectedBusTrackIds] = useState<number[]>([]);
  const [busName, setBusName] = useState('');
  const [isBusNameEdited, setIsBusNameEdited] = useState(false);

  // --- Link state ---
  const [masterTrackId, setMasterTrackId] = useState<number | null>(null);
  const [selectedSlaveTrackIds, setSelectedSlaveTrackIds] = useState<number[]>([]);
  const [linkGroupName, setLinkGroupName] = useState('');
  const [isLinkNameEdited, setIsLinkNameEdited] = useState(false);

  // Filter out tracks that are already folder/bus containers
  const individualTracks = useMemo(() => {
    return tracks.filter(track => !track.isBusFolder && !track.isLinkFolder);
  }, [tracks]);

  // List of tracks selectable to be grouped into a parent bus section
  const selectableTracks = useMemo(() => {
    // Allows selecting individual tracks and link folders. Excludes parent bus folders.
    return tracks.filter(track => !track.isBusFolder || track.isLinkFolder);
  }, [tracks]);

  // List of all available instruments for "Piste Audio"
  const availableInstruments = useMemo(() => {
    const list = instrumentsConfig
      .map((inst, idx) => ({ inst, idx }))
      .filter(({ inst }) => inst.id !== 'puxador' && inst.id !== 'coro');
    const apitoItem = list.find(item => item.inst.id === 'apito');
    const rest = list.filter(item => item.inst.id !== 'apito');
    const sorted = apitoItem ? [...rest, apitoItem] : list;

    if (!searchQuery.trim()) return sorted;
    const query = searchQuery.toLowerCase();
    return sorted.filter(({ inst }) => inst.name.toLowerCase().includes(query));
  }, [searchQuery]);

  // --- Auto-generate names ---
  useEffect(() => {
    if (activeTab === 'section') {
      if (selectedBusTrackIds.length === 0) {
        if (!isBusNameEdited) setBusName('');
        return;
      }
      if (!isBusNameEdited) {
        const selectedTracks = tracks.filter(t => selectedBusTrackIds.includes(t.id));
        const allAlfaia = selectedTracks.every(t => {
          const inst = instrumentsConfig[t.instrumentIdx];
          return inst?.name.toLowerCase().includes('alfaia');
        });

        if (allAlfaia) {
          setBusName('ALFAIAS');
        } else {
          const names = selectedTracks
            .map(t => {
              const inst = instrumentsConfig[t.instrumentIdx];
              return t.customName || inst?.name || '';
            })
            .filter(Boolean);
          setBusName(names.join(' & ').toUpperCase());
        }
      }
    }
  }, [selectedBusTrackIds, tracks, isBusNameEdited, activeTab]);

  useEffect(() => {
    if (activeTab === 'link') {
      if (masterTrackId === null) {
        if (!isLinkNameEdited) setLinkGroupName('');
        return;
      }
      if (!isLinkNameEdited) {
        const masterTrack = tracks.find(t => t.id === masterTrackId);
        if (masterTrack) {
          const inst = instrumentsConfig[masterTrack.instrumentIdx];
          const name = masterTrack.customName || inst?.name || '';
          const isAlfaia = name.toLowerCase().includes('alfaia');
          setLinkGroupName(isAlfaia ? 'ALFAIAS' : `${name.toUpperCase()}S`);
        }
      }
    }
  }, [masterTrackId, tracks, isLinkNameEdited, activeTab]);

  // --- Handlers ---
  const handleSelectAudioInstrument = (idx: number) => {
    sequencer.handleAddTrackInstrument(idx, currentMeasure);
    onClose();
  };

  const handleToggleBusTrack = (trackId: number) => {
    setSelectedBusTrackIds(prev => 
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    );
  };

  const handleToggleSlaveTrack = (trackId: number) => {
    setSelectedSlaveTrackIds(prev => 
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    );
  };

  const handleValidateBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBusTrackIds.length === 0) {
      alert(t('errorNoBusTracks'));
      return;
    }
    if (!busName.trim()) {
      alert(t('errorNoBusName'));
      return;
    }
    handleCreateCustomBus(selectedBusTrackIds, busName.trim());
    onClose();
  };

  const handleValidateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterTrackId === null) {
      alert(t('errorNoMaster'));
      return;
    }
    if (selectedSlaveTrackIds.length === 0) {
      alert(t('errorNoSlaves'));
      return;
    }
    if (!linkGroupName.trim()) {
      alert(t('errorNoLinkName'));
      return;
    }
    handleCreateCustomLinkGroup(masterTrackId, selectedSlaveTrackIds, linkGroupName.trim());
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-[#000000]/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] rounded-sm p-6 w-full max-w-2xl shadow-[8px_8px_0px_var(--cordel-border)] max-h-[90vh] overflow-y-auto flex flex-col relative transition-all"
        onClick={e => e.stopPropagation()}
        style={{
          boxShadow: '8px 8px 0px var(--cordel-border)',
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--cordel-text)] hover:text-[var(--cordel-wood)] transition-colors hover:scale-110 duration-200 cursor-pointer"
        >
          <X size={24} />
        </button>

        {/* Title */}
        <h2 className="font-cactus text-3xl font-bold uppercase tracking-wider mb-6 text-center select-none border-b-2 border-[var(--cordel-border)] pb-2 pr-8">
          {t('title')}
        </h2>

        {/* Tabs Bar */}
        <div className="flex gap-2 border-b border-[var(--cordel-border)]/20 pb-4 mb-6 overflow-x-auto select-none">
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase border-2 transition-all duration-200 cursor-pointer ${
              activeTab === 'audio'
                ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] shadow-none translate-y-[2px]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] shadow-[3px_3px_0px_var(--cordel-border)]'
            }`}
          >
            <Music size={14} />
            {t('tabAudio')}
          </button>
          <button
            onClick={() => setActiveTab('section')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase border-2 transition-all duration-200 cursor-pointer ${
              activeTab === 'section'
                ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] shadow-none translate-y-[2px]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] shadow-[3px_3px_0px_var(--cordel-border)]'
            }`}
          >
            <FolderOpen size={14} />
            {t('tabSection')}
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase border-2 transition-all duration-200 cursor-pointer ${
              activeTab === 'link'
                ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] shadow-none translate-y-[2px]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] shadow-[3px_3px_0px_var(--cordel-border)]'
            }`}
          >
            <Link size={14} />
            {t('tabLink')}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-grow flex flex-col min-h-0">
          
          {/* TAB 1: Piste Audio */}
          {activeTab === 'audio' && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="relative flex items-center w-full mb-4">
                <Search className="absolute left-3 text-[var(--cordel-text)]/50" size={16} />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)]/60 text-[var(--cordel-text)] placeholder-[var(--cordel-text)]/40 w-full focus:outline-none focus:border-[var(--cordel-border)] font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                {availableInstruments.map(({ inst, idx }) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectAudioInstrument(idx)}
                    className="flex items-center gap-2.5 p-2.5 border-2 border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] hover:bg-[var(--cordel-text)]/10 rounded-sm cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                  >
                    <img
                      src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                      alt={inst.name}
                      className="w-6 h-6 object-contain shrink-0"
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="font-cactus font-bold text-xs truncate uppercase tracking-wider">{inst.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Section (Bus Audio) */}
          {activeTab === 'section' && (
            <div className="flex flex-col h-full animate-fade-in">
              {selectableTracks.length === 0 ? (
                <p className="text-center py-6 text-sm text-[var(--cordel-text)]/60 italic">
                  {t('noTracksBus')}
                </p>
              ) : (
                <form onSubmit={handleValidateBus} className="flex flex-col gap-4">
                  <div>
                    <h4 className="text-xs uppercase font-bold text-[var(--cordel-text)]/70 mb-3 select-none">
                      {t('selectBusTracks')}
                    </h4>
                    <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto p-1 border-2 border-[var(--cordel-border)]/10 rounded-sm custom-scrollbar">
                      {selectableTracks.map((track, index) => {
                        const inst = instrumentsConfig[track.instrumentIdx];
                        const isSelected = selectedBusTrackIds.includes(track.id);
                        return (
                          <button
                            type="button"
                            key={track.id}
                            onClick={() => handleToggleBusTrack(track.id)}
                            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-2 transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] shadow-none translate-y-[2px]'
                                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-[1px]'
                            }`}
                          >
                            <img
                              src={`${ASSETS_BASE_URL}${inst?.iconImg}`}
                              alt={inst?.name}
                              className="w-4 h-4 object-contain shrink-0"
                              onError={e => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span>{track.isLinkFolder ? `🔗 ${track.customName || 'Liaison'}` : (track.customName || inst?.name)} ({index + 1})</span>
                            {isSelected && <Check size={12} className="ml-1 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase font-bold text-[var(--cordel-text)]/70">
                      {t('busNameLabel')}
                    </label>
                    <input
                      type="text"
                      value={busName}
                      onChange={e => {
                        setBusName(e.target.value);
                        setIsBusNameEdited(true);
                      }}
                      className="px-3 py-2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)]/60 text-[var(--cordel-text)] focus:outline-none focus:border-[var(--cordel-border)] font-bold text-xs"
                      placeholder="e.g. CAIXAS & TAROLS"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-2.5 bg-[var(--cordel-wood)] text-white font-bold uppercase tracking-wider border-2 border-[var(--cordel-border)] shadow-[4px_4px_0px_var(--cordel-border)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer text-xs"
                  >
                    {t('btnCreateBus')}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: Maître / Esclave (Liaison) */}
          {activeTab === 'link' && (
            <div className="flex flex-col h-full animate-fade-in">
              {individualTracks.length === 0 ? (
                <p className="text-center py-6 text-sm text-[var(--cordel-text)]/60 italic">
                  {t('noTracksLink')}
                </p>
              ) : (
                <form onSubmit={handleValidateLink} className="flex flex-col gap-4">
                  {/* MASTER SELECT */}
                  <div>
                    <h4 className="text-xs uppercase font-bold text-[var(--cordel-text)]/70 mb-2 select-none">
                      {t('selectMaster')}
                    </h4>
                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 border-2 border-[var(--cordel-border)]/10 rounded-sm custom-scrollbar">
                      {individualTracks.map((track, index) => {
                        const inst = instrumentsConfig[track.instrumentIdx];
                        const isMaster = masterTrackId === track.id;
                        return (
                          <button
                            type="button"
                            key={track.id}
                            onClick={() => {
                              setMasterTrackId(track.id);
                              // Remove Master from slave selections if it was there
                              setSelectedSlaveTrackIds(prev => prev.filter(id => id !== track.id));
                            }}
                            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-2 transition-all duration-150 cursor-pointer ${
                              isMaster
                                ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] shadow-none translate-y-[2px]'
                                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)]'
                            }`}
                          >
                            <img
                              src={`${ASSETS_BASE_URL}${inst?.iconImg}`}
                              alt={inst?.name}
                              className="w-4 h-4 object-contain shrink-0"
                              onError={e => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span>{track.customName || inst?.name} ({index + 1})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SLAVES SELECT */}
                  <div>
                    <h4 className="text-xs uppercase font-bold text-[var(--cordel-text)]/70 mb-2 select-none">
                      {t('selectSlaves')}
                    </h4>
                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 border-2 border-[var(--cordel-border)]/10 rounded-sm custom-scrollbar">
                      {individualTracks
                        .filter(t => t.id !== masterTrackId)
                        .map((track, index) => {
                          const inst = instrumentsConfig[track.instrumentIdx];
                          const isSelected = selectedSlaveTrackIds.includes(track.id);
                          return (
                            <button
                              type="button"
                              key={track.id}
                              onClick={() => handleToggleSlaveTrack(track.id)}
                              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-2 transition-all duration-150 cursor-pointer ${
                                isSelected
                                  ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] shadow-none translate-y-[2px]'
                                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)]'
                              }`}
                            >
                              <img
                                src={`${ASSETS_BASE_URL}${inst?.iconImg}`}
                                alt={inst?.name}
                                className="w-4 h-4 object-contain shrink-0"
                                onError={e => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <span>{track.customName || inst?.name} ({tracks.findIndex(t => t.id === track.id) + 1})</span>
                              {isSelected && <Check size={12} className="ml-1 shrink-0" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* LINK GROUP NAME */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase font-bold text-[var(--cordel-text)]/70">
                      {t('linkGroupNameLabel')}
                    </label>
                    <input
                      type="text"
                      value={linkGroupName}
                      onChange={e => {
                        setLinkGroupName(e.target.value);
                        setIsLinkNameEdited(true);
                      }}
                      className="px-3 py-2 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)]/60 text-[var(--cordel-text)] focus:outline-none focus:border-[var(--cordel-border)] font-bold text-xs"
                      placeholder="e.g. CAIXAS LINKED"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-2.5 bg-[var(--cordel-wood)] text-white font-bold uppercase tracking-wider border-2 border-[var(--cordel-border)] shadow-[4px_4px_0px_var(--cordel-border)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] transition-all cursor-pointer text-xs"
                  >
                    {t('btnCreateLink')}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
