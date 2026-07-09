import React, { useRef, useEffect, useState } from 'react';
import { Mic, Square, ChevronUp, ChevronDown, Play, Trash2 } from 'lucide-react';
import { useAudioStore } from '../stores/useAudioStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { vocalEngineService } from '../audio/vocalEngineService';
import { instrumentsConfig } from '../data';
import { useAudio } from '../contexts/AudioContext';
import * as Tone from 'tone';

export const VocalRecordingBar: React.FC = () => {
  const recordingStatus = useAudioStore((state) => state.recordingStatus);
  const targetPatternId = useAudioStore((state) => state.targetPatternId);
  const isVocalGuideEnabled = useAudioStore((state) => state.isVocalGuideEnabled);
  const setIsVocalGuideEnabled = useAudioStore((state) => state.setIsVocalGuideEnabled);
  const isExpanded = useAudioStore((state) => state.isVocalRecordingBarExpanded);
  const setIsExpanded = useAudioStore((state) => state.setIsVocalRecordingBarExpanded);

  const tracks = useSequencerStore((state) => state.tracks);
  const setTracks = useSequencerStore((state) => state.setTracks);
  const bpm = useSequencerStore((state) => state.bpm);
  const lang = useSequencerStore((state) => state.lang);

  const { isPlaying, handleTogglePlay, handleStop } = useAudio();
  const iconRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-expand bar when recording status goes active
  useEffect(() => {
    if (recordingStatus !== 'inactive') {
      setIsExpanded(true);
    }
  }, [recordingStatus, setIsExpanded]);

  // Find all voice tracks
  const voiceTracks = tracks.filter(t => {
    const inst = instrumentsConfig[t.instrumentIdx];
    return inst && inst.type === 'voice';
  });

  const globalSelectedPatternId = useAudioStore((state) => state.selectedVocalPatternId);

  const trackForGlobalPattern = globalSelectedPatternId
    ? tracks.find(t => t.patterns.some(p => p.id === globalSelectedPatternId))
    : null;

  const [selectedVoiceTrackId, setSelectedVoiceTrackId] = useState<string | number | null>(null);

  useEffect(() => {
    if (trackForGlobalPattern) {
      setSelectedVoiceTrackId(trackForGlobalPattern.id);
    }
  }, [trackForGlobalPattern]);

  const activeVoiceTrack = voiceTracks.find(t => t.id === selectedVoiceTrackId) || trackForGlobalPattern || voiceTracks[0];

  useEffect(() => {
    if (activeVoiceTrack && selectedVoiceTrackId !== activeVoiceTrack.id) {
      setSelectedVoiceTrackId(activeVoiceTrack.id);
    }
  }, [activeVoiceTrack, selectedVoiceTrackId]);

  const selectedPatternId = globalSelectedPatternId || activeVoiceTrack?.selectedPatternId || targetPatternId;
  const activePattern = activeVoiceTrack?.patterns.find(p => p.id === selectedPatternId);

  const hasRecording = useAudioStore((state) => !!selectedPatternId && !!state.vocalBlobs[selectedPatternId]);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Apply real-time animation speed based on current BPM
  useEffect(() => {
    if (iconRef.current) {
      if (recordingStatus === 'countdown') {
        const beatDurationSec = 60 / bpm;
        iconRef.current.style.animation = `cordel-spin ${beatDurationSec}s linear infinite`;
      } else if (recordingStatus === 'recording') {
        iconRef.current.style.animation = 'cordel-pulse 1s ease-in-out infinite';
      } else {
        iconRef.current.style.animation = '';
      }
    }
  }, [bpm, recordingStatus]);

  // Run entry animation on mount or when visibility changes (WAAPI)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.animate(
        [
          { transform: 'translateY(15px)', opacity: 0.7 },
          { transform: 'translateY(0)', opacity: 1 }
        ],
        {
          duration: 200,
          easing: 'ease-out',
          fill: 'both'
        }
      );
    }
  }, [isExpanded]);

  // Stop preview if sequencer starts playing
  useEffect(() => {
    if (isPlaying && isPlayingPreview && selectedPatternId) {
      vocalEngineService.stopVocalPattern(selectedPatternId);
      setIsPlayingPreview(false);
    }
  }, [isPlaying, isPlayingPreview, selectedPatternId]);

  // Cleanup preview playback on unmount
  useEffect(() => {
    return () => {
      if (selectedPatternId) {
        vocalEngineService.stopVocalPattern(selectedPatternId);
      }
    };
  }, [selectedPatternId]);

  if (!activeVoiceTrack || !selectedPatternId || !activePattern) return null;

  const t = (key: string) => {
    const dict: any = {
      fr: {
        ready: `Prêt à enregistrer le motif : "${activePattern.name}"`,
        arming: "🎤 Armement du micro...",
        countdown: "🥁 Préparez-vous...",
        recording: "🔴 ENREGISTREMENT EN COURS...",
        rec: "REC",
        stop: "STOP",
        guide: "Guide mélodique",
        chorus: "Chœur (Ensemble) :",
        expand: "Déplier l'enregistrement vocal",
        collapse: "Réduire",
        playPreview: "Écouter",
        stopPreview: "Arrêter",
      },
      pt: {
        ready: `Pronto para gravar o padrão: "${activePattern.name}"`,
        arming: "🎤 Configurando microfone...",
        countdown: "🥁 Prepare-se...",
        recording: "🔴 GRAVANDO...",
        rec: "GRAVAR",
        stop: "PARAR",
        guide: "Guia melódico",
        chorus: "Coro (Ensemble) :",
        expand: "Abrir gravação de voz",
        collapse: "Minimizar",
        playPreview: "Ouvir",
        stopPreview: "Parar",
      }
    };
    return dict[lang]?.[key] || dict['fr'][key];
  };

  const handleStartRec = () => {
    vocalEngineService.startRecording(selectedPatternId, {
      onStartSequencer: () => {
        if (!isPlaying) {
          handleTogglePlay();
        }
      },
      onError: (err) => {
        alert("Erreur d'accès au micro : " + err.message);
      }
    });
  };

  const handleStopRec = () => {
    vocalEngineService.stopRecording();
    handleStop();
  };

  const handlePlayPreview = async () => {
    if (isPlayingPreview) {
      vocalEngineService.stopVocalPattern(selectedPatternId);
      setIsPlayingPreview(false);
    } else {
      setIsPlayingPreview(true);
      await vocalEngineService.playVocalPattern(selectedPatternId, Tone.now(), () => {
        setIsPlayingPreview(false);
      });
    }
  };

  const handleDelete = async () => {
    const confirmMsg = lang === 'fr' 
      ? "Voulez-vous vraiment supprimer cet enregistrement ?" 
      : "Tem certeza de que deseja excluir esta gravação?";
    if (window.confirm(confirmMsg)) {
      await vocalEngineService.deleteVocalRecording(selectedPatternId);
    }
  };

  const handleExpand = () => {
    if (containerRef.current) {
      const anim = containerRef.current.animate(
        [
          { transform: 'translateY(0)', opacity: 1 },
          { transform: 'translateY(15px)', opacity: 0 }
        ],
        {
          duration: 150,
          easing: 'ease-in',
          fill: 'both'
        }
      );
      anim.onfinish = () => {
        setIsExpanded(true);
      };
    } else {
      setIsExpanded(true);
    }
  };

  const handleCollapse = () => {
    if (containerRef.current) {
      const anim = containerRef.current.animate(
        [
          { transform: 'translateY(0)', opacity: 1 },
          { transform: 'translateY(15px)', opacity: 0 }
        ],
        {
          duration: 150,
          easing: 'ease-in',
          fill: 'both'
        }
      );
      anim.onfinish = () => {
        setIsExpanded(false);
      };
    } else {
      setIsExpanded(false);
    }
  };

  const getStatusText = () => {
    switch (recordingStatus) {
      case 'arming':
        return t('arming');
      case 'countdown':
        return t('countdown');
      case 'recording':
        return t('recording');
      default:
        return t('ready');
    }
  };

  const getStatusBgColor = () => {
    switch (recordingStatus) {
      case 'recording':
        return '#8b2a1a'; // Red clay
      case 'countdown':
      case 'arming':
        return '#b89f74'; // Sandy wood
      default:
        return '#ece4d0'; // Old paper
    }
  };

  const getStatusTextColor = () => {
    if (recordingStatus === 'recording') return '#fdfaf2';
    return '#1a1a1a';
  };

  // Render Collapsed State
  if (!isExpanded) {
    return (
      <div 
        ref={containerRef}
        className="w-full shrink-0 z-[40] border-t-3 border-[#1a1a1a] bg-[#ece4d0] h-11 flex items-center justify-center font-sans select-none"
        style={{
          boxShadow: '0px -2px 0px rgba(26,26,26,0.1)',
        }}
      >
        <button
          onClick={handleExpand}
          className="cordel-btn px-4 py-1 bg-[#b89f74] text-[#1a1a1a] font-bold text-xs border border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] rounded-sm flex items-center gap-2 hover:opacity-95 cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{t('expand')}</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Render Expanded State
  return (
    <div 
      ref={containerRef}
      className="relative w-full shrink-0 z-[40] border-t-3 border-[#1a1a1a] py-3.5 px-6 flex flex-col md:flex-row items-center justify-between gap-4 font-sans select-none transition-colors duration-300"
      style={{
        backgroundColor: getStatusBgColor(),
        color: getStatusTextColor(),
        boxShadow: '0px -4px 0px rgba(26,26,26,0.1)',
      }}
    >
      {recordingStatus === 'inactive' && (
        <button
          onClick={handleCollapse}
          className="cordel-btn absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 bg-[#b89f74] text-[#1a1a1a] border border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] rounded-sm flex items-center justify-center hover:opacity-95 cursor-pointer z-50"
          title={t('collapse')}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      <style>{`
        @keyframes cordel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cordel-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .cordel-btn {
          font-family: 'Cactus', var(--font-cactus, serif);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .cordel-btn:active {
          transform: translate(2px, 2px);
          box-shadow: 1px 1px 0px #1a1a1a !important;
        }
      `}</style>

      {/* Left Area: Status & Spinner */}
      <div className="flex items-center gap-4 flex-1">
        {recordingStatus !== 'inactive' ? (
          <svg 
            ref={iconRef}
            className="w-10 h-10 shrink-0" 
            viewBox="0 0 100 100" 
            fill="none"
            stroke={recordingStatus === 'recording' ? '#fdfaf2' : '#1a1a1a'}
            strokeWidth="3.5"
          >
            <circle cx="50" cy="50" r="38" strokeDasharray="8 8" />
            <circle cx="50" cy="50" r="16" />
            <line x1="50" y1="12" x2="50" y2="88" />
            <line x1="12" y1="50" x2="88" y2="50" />
            <line x1="23" y1="23" x2="77" y2="77" />
            <line x1="23" y1="77" x2="77" y2="23" />
          </svg>
        ) : (
          <div className="w-10 h-10 rounded-full border-2 border-[#1a1a1a]/30 flex items-center justify-center shrink-0 opacity-55">
            <Mic className="w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">
            {lang === 'fr' ? "Enregistrement Vocal" : "Gravação de Voz"}
          </span>
          
          {recordingStatus === 'inactive' && voiceTracks.length > 0 ? (
            <div className="flex items-center gap-3 flex-wrap">
              {/* Voice Track Selector (Puxador / Coro) */}
              {voiceTracks.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-wide font-cactus uppercase">
                    {lang === 'fr' ? "Voix :" : "Voz :"}
                  </span>
                  <select
                    value={activeVoiceTrack.id}
                    onChange={(e) => {
                      const trackId = parseInt(e.target.value) || e.target.value;
                      setSelectedVoiceTrackId(trackId);
                    }}
                    className="bg-[#ece4d0] border border-[#1a1a1a]/40 font-cactus font-bold text-xs px-2.5 py-0.5 rounded-sm shadow-[1.5px_1.5px_0px_rgba(26,26,26,0.3)] focus:outline-none cursor-pointer text-[#1a1a1a] transition-all hover:bg-[#e2d8be]"
                  >
                    {voiceTracks.map((t) => {
                      const inst = instrumentsConfig[t.instrumentIdx];
                      return (
                        <option key={t.id} value={t.id}>
                          {inst?.name || `Voix ${t.id}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Pattern Selector */}
              {activeVoiceTrack.patterns.length > 1 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-wide font-cactus uppercase">
                    {lang === 'fr' ? "Motif :" : "Padrão :"}
                  </span>
                  <select
                    value={selectedPatternId || ''}
                    onChange={(e) => {
                      const newPatternId = parseInt(e.target.value);
                      setTracks(prev => prev.map(t => t.id === activeVoiceTrack.id ? { ...t, selectedPatternId: newPatternId } : t));
                    }}
                    className="bg-[#ece4d0] border border-[#1a1a1a]/40 font-cactus font-bold text-xs px-2.5 py-0.5 rounded-sm shadow-[1.5px_1.5px_0px_rgba(26,26,26,0.3)] focus:outline-none cursor-pointer text-[#1a1a1a] transition-all hover:bg-[#e2d8be]"
                  >
                    {activeVoiceTrack.patterns.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-sm font-bold tracking-wide font-cactus uppercase text-[#1a1a1a]">
                  {activePattern ? activePattern.name : ''}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold tracking-wide font-cactus uppercase">
              {getStatusText()}
            </span>
          )}
        </div>
      </div>

      {/* Middle Area: Options & Settings */}
      {recordingStatus === 'inactive' && (
        <div className="flex flex-wrap items-center gap-6 text-[#1a1a1a]">
          {/* Melodic guide check */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold select-none">
            <input 
              type="checkbox"
              checked={isVocalGuideEnabled}
              onChange={(e) => setIsVocalGuideEnabled(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#8b2a1a] cursor-pointer"
            />
            <span>{t('guide')}</span>
          </label>
        </div>
      )}

      {/* Right Area: Control Buttons */}
      <div className="flex items-center gap-4.5 shrink-0">
        {recordingStatus === 'inactive' && (
          <button
            onClick={handlePlayPreview}
            disabled={isPlaying || !hasRecording}
            className={`cordel-btn px-4.5 py-2.5 font-bold text-sm border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] rounded-sm flex items-center gap-2 cursor-pointer transition-colors ${
              isPlayingPreview
                ? 'bg-[#1a1a1a] text-[#fdfaf2] hover:opacity-90'
                : 'bg-[#ece4d0] text-[#1a1a1a] hover:opacity-95'
            } ${isPlaying || !hasRecording ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={isPlayingPreview ? t('stopPreview') : t('playPreview')}
          >
            {isPlayingPreview ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isPlayingPreview ? t('stopPreview') : t('playPreview')}</span>
          </button>
        )}

        {recordingStatus === 'inactive' && hasRecording && (
          <button
            onClick={handleDelete}
            disabled={isPlaying}
            className={`cordel-btn px-4.5 py-2.5 font-bold text-sm bg-red-700 text-[#fdfaf2] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] rounded-sm flex items-center gap-2 cursor-pointer hover:opacity-95 transition-colors ${
              isPlaying ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={lang === 'fr' ? "Supprimer l'enregistrement" : "Excluir gravação"}
          >
            <Trash2 className="w-4 h-4" />
            <span>{lang === 'fr' ? "Supprimer" : "Excluir"}</span>
          </button>
        )}

        {recordingStatus === 'inactive' ? (
          <button
            onClick={handleStartRec}
            className="cordel-btn px-6 py-2.5 bg-[#8b2a1a] text-[#fdfaf2] font-bold text-sm border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] rounded-sm flex items-center gap-2 hover:opacity-95 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            {t('rec')}
          </button>
        ) : (
          <button
            onClick={handleStopRec}
            className="cordel-btn px-6 py-2.5 bg-[#1a1a1a] text-[#fdfaf2] font-bold text-sm border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] rounded-sm flex items-center gap-2 hover:opacity-90 cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
            {t('stop')}
          </button>
        )}
      </div>
    </div>
  );
};
