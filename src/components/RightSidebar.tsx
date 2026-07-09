/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../types';
import { i18n, instrumentsConfig, getMaxTicks } from '../data';
// import { parseCordelFormatting } from '../utils/cordelFormatter';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { PresetMetadata, CloudRhythmSignal } from '../types';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';

const ShortcutsGuide = React.lazy(() => import('./right-sidebar/ShortcutsGuide').then(m => ({ default: m.ShortcutsGuide })));
const PresetManagerSection = React.lazy(() => import('./right-sidebar/PresetManagerSection').then(m => ({ default: m.PresetManagerSection })));
const CloudLibraryTab = React.lazy(() => import('./right-sidebar/CloudLibraryTab').then(m => ({ default: m.CloudLibraryTab })));
const FeedbackSection = React.lazy(() => import('./right-sidebar/FeedbackSection').then(m => ({ default: m.FeedbackSection })));

interface RightSidebarProps {
  activePanel: 'legend' | 'letras' | 'info' | 'feedback' | null;
  onTogglePanel: (panel: 'legend' | 'letras' | 'info' | 'feedback', force?: boolean) => void;
  isMobile: boolean;
  mestreSignals?: CloudRhythmSignal[];
  refreshMestreSignals?: () => void;
  hideGlobalSignals?: boolean;
  onToggleHideGlobalSignals?: () => void;
  visible?: boolean;
}

const EMPTY_ARRAY: any[] = [];

const RightSidebarComponent: React.FC<RightSidebarProps> = ({
  activePanel,
  onTogglePanel,
  isMobile,
  mestreSignals = [],
  refreshMestreSignals,
  hideGlobalSignals,
  onToggleHideGlobalSignals,
  visible = true,
}) => {
  const sequencer = useSequencer();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const toadaInputRef = React.useRef<HTMLInputElement>(null);
  const nacaoInputRef = React.useRef<HTMLInputElement>(null);
  const compositorInputRef = React.useRef<HTMLInputElement>(null);
  const ritmoInputRef = React.useRef<HTMLInputElement>(null);
  const youtubeInputRef = React.useRef<HTMLInputElement>(null);
  const letrasRef = React.useRef<HTMLTextAreaElement>(null);
  const tracks = useSequencerStore(state => {
    if (!visible) return EMPTY_ARRAY;
    return state.tracks;
  });
  const { userProfile } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(-1);
  React.useEffect(() => {
    if (!visible) return;

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number }) => {
      if (useSequencerStore.getState().isEcoMode) {
        setCurrentStepIndex(-1);
        return;
      }
      setCurrentStepIndex(detail.step);
    };
    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, [visible]);
  const audio = useAudio();

  const {
    lang,
    
    letras,
    setLetras: onLetrasChange,
    metadata,
    bpm = 120,
    timeSig,
    handleExtractLyrics: onExtractLyrics,
  } = sequencer;

  const {
    isPlaying = false,
    
    handleTogglePlay: onTogglePlay,
  } = audio;

  const currentMeasure = useSequencerStore(state => visible ? state.currentMeasure : 0);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);

  const beatsPerMeasure = parseInt(timeSig.split('/')[0]) || 4;

  const onMetadataChange = (newMeta: PresetMetadata) => {
    sequencer.setMetadata(newMeta);
    if (newMeta.rhythmSignals !== sequencer.metadata?.rhythmSignals) {
      const validIds = new Set((newMeta.rhythmSignals || []).map(s => s.id));
      sequencer.setMeasureSignals(prev => prev.map(id => (id && validIds.has(id)) ? id : null));
    }
  };

  const currentPlayState = isPlaying ? {
    stepIndex: currentStepIndex,
    maxTicks: getMaxTicks(timeSig),
    activePatternIdByInst: (() => {
      const result: { [instIdx: number]: number | null } = {};
      tracks.forEach(t => {
        if (result[t.instrumentIdx] === undefined) {
          if (isPlaying) {
            const activePattern = t.patterns.find(p => p.measureAssignments[currentMeasure]);
            result[t.instrumentIdx] = activePattern ? activePattern.id : null;
          } else {
            result[t.instrumentIdx] = t.selectedPatternId;
          }
        }
      });
      return result;
    })(),
  } : null;
  const [subTab, setSubTab] = React.useState<'toada' | 'info' | 'legendes' | 'sinais' | 'feedback'>('info');

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [metadata?.description, subTab]);

  // Synchronize uncontrolled inputs when metadata or letras change (e.g. on preset load or file import)
  React.useEffect(() => {
    if (metadata) {
      if (toadaInputRef.current) toadaInputRef.current.value = metadata.toada || '';
      if (nacaoInputRef.current) nacaoInputRef.current.value = metadata.nacao || '';
      if (compositorInputRef.current) compositorInputRef.current.value = metadata.compositor || '';
      if (ritmoInputRef.current) ritmoInputRef.current.value = metadata.ritmo || '';
      if (youtubeInputRef.current) youtubeInputRef.current.value = metadata.youtubeUrl || '';
      if (textareaRef.current) {
        textareaRef.current.value = metadata.description || '';
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }
  }, [metadata]);

  React.useEffect(() => {
    if (letrasRef.current) {
      letrasRef.current.value = letras || '';
    }
  }, [letras]);

  const t = (key: string) => {
    const section = i18n[lang];
    return (section as any)[key] || key;
  };


  if (isMobile && !activePanel) return null;

  React.useEffect(() => {
    if (activePanel) {
      if (activePanel === 'legend') setSubTab('legendes');
      else if (activePanel === 'letras') setSubTab('toada');
      else if (activePanel === 'info') setSubTab('info');
      else if (activePanel === 'feedback') setSubTab('feedback');
    }
  }, [activePanel]);  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    const videoId = match ? match[1] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  return (
    <>
      <div
        id="right-sidebar-panel"
        style={{ display: visible ? 'flex' : 'none' }}
        className="w-[340px] min-w-[340px] bg-[var(--cordel-bg)] cordel-bg border-l-[3px] border-[var(--cordel-border)] flex flex-col h-full transition-all duration-300 relative z-10 text-[var(--cordel-text)]"
      >
        <div className="flex flex-col p-5 h-full overflow-hidden">
          {/* Sub-tab Selector & Mobile Close Button aligned side-by-side */}
          <div className="flex gap-2 items-center mb-4 shrink-0 mt-1">
            <div className="flex-grow relative">
              <select
                value={subTab}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setSubTab(val);
                  
                  // Synchronize local select with parent state, forcing it to prevent toggles
                  let mappedPanel: 'legend' | 'letras' | 'info' | 'feedback' = 'info';
                  if (val === 'legendes') mappedPanel = 'legend';
                  else if (val === 'toada') mappedPanel = 'letras';
                  else if (val === 'feedback') mappedPanel = 'feedback';
                  else if (val === 'info') mappedPanel = 'info';
                  else if (val === 'sinais') mappedPanel = 'info'; // Map sinais to info view
                  
                  onTogglePanel(mappedPanel, true);
                }}
                className="w-full py-2 pl-3 pr-10 font-cactus font-bold text-[14px] uppercase cordel-border-sm cursor-pointer bg-[var(--cordel-bg)] text-[var(--cordel-text)] focus:outline-none appearance-none"
              >
                <option value="info">ℹ️ {lang === 'fr' ? 'Informations' : 'Informações'}</option>
                <option value="toada">📝 Toada</option>
                <option value="sinais">🎨 {lang === 'fr' ? 'Signes' : 'Sinais'}</option>
                <option value="legendes">📖 {t('legend')}</option>
                <option value="feedback">💬 {lang === 'fr' ? 'Note & Avis' : 'Nota & Opinião'}</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--cordel-text)] font-extrabold text-[12px]">
                ▼
              </span>
            </div>
            {isMobile && (
              <button
                onClick={() => onTogglePanel('letras')}
                className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-3 py-2 text-sm font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors h-full flex items-center justify-center shrink-0"
              >
                ✖
              </button>
            )}
          </div>

          {/* TAB 4: Légendes */}
          {subTab === 'legendes' && (
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0">
              <React.Suspense fallback={null}>
                <div className="xilo-feedback-container flex flex-col gap-2">
                  <ShortcutsGuide
                    lang={lang}
                    t={t}
                  />
                </div>
              </React.Suspense>
            </div>
          )}
{subTab === 'toada' && (
            <div className="flex flex-col flex-grow overflow-hidden min-h-0">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus mb-1 shrink-0 text-left">
                {lang === 'fr' ? 'Paroles de la Toada' : 'Letra da Toada'}
              </span>
              
              <div className="xilo-feedback-container flex flex-col flex-grow overflow-hidden min-h-0 p-4 gap-2 mb-1">
                <textarea
                  ref={letrasRef}
                  id="letras-textarea"
                  placeholder={t('letrasPlaceholder')}
                  defaultValue={letras}
                  onBlur={(e) => {
                    if (e.target.value !== letras) {
                      onLetrasChange(e.target.value);
                    }
                  }}
                  className="xilo-textarea h-[120px] min-h-[80px] mb-3 shrink-0"
                />
                
                {onExtractLyrics && (
                  <button
                    onClick={onExtractLyrics}
                    className="w-full py-1.5 bg-[#8b2a1a] text-[#f4ecd8] text-xs font-bold cordel-border-sm hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer mb-3 shrink-0 flex items-center justify-center gap-1.5"
                    title={t('extractBtn')}
                  >
                    <span>{t('extractBtn')}</span>
                  </button>
                )}
                
                <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus mb-1 shrink-0 text-left">
                  🎤 Karaokê
                </span>

                {/* Karaoke Viewer Container */}
                <div className="flex-grow overflow-y-auto min-h-0 pr-1 custom-scrollbar">
                {(() => {
                  const voiceTracks = tracks.filter(t => instrumentsConfig[t.instrumentIdx]?.type === 'voice' && !t.isMute);
                  if (voiceTracks.length === 0) {
                    return (
                      <div className="text-[var(--cordel-text)] font-sans font-bold text-xs text-center mt-6 italic opacity-70">
                        {lang === 'fr' 
                          ? 'Ajoutez une piste de voix (non mutée) pour voir le karaoké.'
                          : 'Adicione uma faixa de Voz/Coro (não mutada) para ver o karaokê.'}
                      </div>
                    );
                  }

                  // Determine which pattern is active per instrument (for karaoke turn)
                  const activeByInst = currentPlayState?.activePatternIdByInst ?? {};

                  type Token = { trackId: number; patternId: number; stepIdx: number; displayText: string; hasSpace: boolean; color: string; instIdx: number; isBreak?: boolean };
                  const allTokens: Token[] = [];
                  voiceTracks.forEach(t => {
                    const inst = instrumentsConfig[t.instrumentIdx];
                    t.patterns.forEach(ptn => {
                      let addedTokensForPattern = false;
                      for (let i = 0; i < ptn.steps; i++) {
                        const state = ptn.activeSteps[i];
                        const lyric = ptn.lyrics[i];
                        if (!state || state === 0 || !lyric || lyric.trim() === '') continue;
                        const isPux = state === 'P';
                        const color = isPux ? inst.colors['P'] : inst.colors['C'];
                        
                        // Respect user's explicit trailing spaces
                        const hasSpace = lyric.endsWith(' ');
                        const displayText = lyric.replace(/-$/, '').trim();
                        
                        allTokens.push({ trackId: t.id, patternId: ptn.id, stepIdx: i, displayText, hasSpace, color, instIdx: t.instrumentIdx });
                        addedTokensForPattern = true;
                      }
                      if (addedTokensForPattern) {
                        allTokens.push({ trackId: t.id, patternId: ptn.id, stepIdx: -1, displayText: '', hasSpace: false, color: '', instIdx: t.instrumentIdx, isBreak: true });
                      }
                    });
                  });

                  return (
                    <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm p-3 font-sans">
                      <div className="flex flex-wrap gap-y-2 leading-loose text-base">
                        {(() => {
                          const words: Token[][] = [];
                          let currentWord: Token[] = [];
                          allTokens.forEach(tok => {
                            if (tok.isBreak) {
                              if (currentWord.length > 0) {
                                words.push(currentWord);
                                currentWord = [];
                              }
                              words.push([tok]);
                              return;
                            }
                            currentWord.push(tok);
                            if (tok.hasSpace) {
                              words.push(currentWord);
                              currentWord = [];
                            }
                          });
                          if (currentWord.length > 0) words.push(currentWord);

                          return words.map((word, wordIdx) => {
                            if (word[0].isBreak) {
                              return <div key={`break-${wordIdx}`} className="w-full h-1" />;
                            }
                            return (
                              <span key={`word-${wordIdx}`} className="inline">
                                {word.map((tok, idx) => {
                                  const t = voiceTracks.find(x => x.id === tok.trackId);
                                  if (!t) return null;

                                  const groupActiveId = activeByInst[tok.instIdx];
                                  const isThisPatternActive = currentPlayState !== null && (groupActiveId === tok.patternId || groupActiveId === undefined || groupActiveId === null);
                                  const activePattern = t.patterns.find(p => p.id === tok.patternId);
                                  if (!activePattern) return null;

                                  const currentStep = (isThisPatternActive && currentPlayState)
                                    ? Math.floor((currentPlayState.stepIndex / currentPlayState.maxTicks) * activePattern.steps)
                                    : -1;
                                  
                                  const isHighlighted = isThisPatternActive && currentStep === tok.stepIdx;

                                  return (
                                    <span
                                      key={`${tok.trackId}-${tok.patternId}-${tok.stepIdx}-${idx}`}
                                      className={`transition-all duration-100 font-bold ${
                                        isHighlighted ? 'scale-110 cordel-border-sm px-1' : ''
                                      }`}
                                      style={{
                                        backgroundColor: isHighlighted ? 'var(--cordel-text)' : 'transparent',
                                        color: isHighlighted ? 'var(--cordel-bg)' : 'var(--cordel-text)',
                                        marginRight: tok.hasSpace ? '6px' : '0px',
                                      }}
                                    >
                                      {tok.displayText}
                                    </span>
                                  );
                                })}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </div>
              </div>
            </div>
          )}

          {/* Tab 2: Informations */}
          {subTab === 'info' && (
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0">
              {metadata && onMetadataChange ? (
                <div className="xilo-feedback-container flex flex-col gap-2">
                  <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1">
                    {t('metaInfo')}
                  </span>
                  <input
                    ref={toadaInputRef}
                    type="text"
                    placeholder={t('metaToada')}
                    defaultValue={metadata.toada}
                    onBlur={(e) => {
                      if (e.target.value !== metadata.toada) {
                        onMetadataChange({ ...metadata, toada: e.target.value });
                      }
                    }}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    ref={nacaoInputRef}
                    type="text"
                    placeholder={t('metaNacao')}
                    defaultValue={metadata.nacao}
                    onBlur={(e) => {
                      if (e.target.value !== metadata.nacao) {
                        onMetadataChange({ ...metadata, nacao: e.target.value });
                      }
                    }}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    ref={compositorInputRef}
                    type="text"
                    placeholder={t('metaCompositor')}
                    defaultValue={metadata.compositor}
                    onBlur={(e) => {
                      if (e.target.value !== metadata.compositor) {
                        onMetadataChange({ ...metadata, compositor: e.target.value });
                      }
                    }}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    ref={ritmoInputRef}
                    type="text"
                    placeholder={t('metaRitmo')}
                    defaultValue={metadata.ritmo}
                    onBlur={(e) => {
                      if (e.target.value !== metadata.ritmo) {
                        onMetadataChange({ ...metadata, ritmo: e.target.value });
                      }
                    }}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    ref={youtubeInputRef}
                    type="text"
                    placeholder={lang === 'pt' ? 'Link do YouTube' : 'Lien YouTube'}
                    defaultValue={metadata.youtubeUrl || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (metadata.youtubeUrl || '')) {
                        onMetadataChange({ ...metadata, youtubeUrl: e.target.value });
                      }
                    }}
                    className="bg-transparent border-b border-[var(--cordel-border)]/30 text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  {metadata.youtubeUrl && getYouTubeEmbedUrl(metadata.youtubeUrl) && (
                    <div className="mt-2 aspect-video w-full rounded-none overflow-hidden cordel-border-sm">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={getYouTubeEmbedUrl(metadata.youtubeUrl)} 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                      />
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    placeholder={lang === 'pt' ? 'Descrição / História do ritmo...' : 'Description / Histoire du rythme...'}
                    defaultValue={metadata.description || ''}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== (metadata.description || '')) {
                        onMetadataChange({ ...metadata, description: e.target.value });
                      }
                    }}
                    rows={1}
                    className="xilo-textarea mt-2 overflow-hidden"
                    style={{ minHeight: '32px' }}
                  />
                </div>
              ) : (
                <div className="text-[var(--cordel-text)] font-sans font-bold text-xs text-center mt-10 italic opacity-70">
                  {lang === 'fr' 
                    ? 'Aucune métadonnée disponible pour ce rythme.' 
                    : 'Nenhuma informação disponível para este ritmo.'}
                </div>
              )}
            </div>
          )}

          {/* Tab: Sinais */}
          {subTab === 'sinais' && (
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0 flex flex-col gap-2">
              <div className="xilo-feedback-container flex flex-col gap-2">
                <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                  🥁 {lang === 'fr' ? 'Signes du rythme' : 'Sinais do ritmo'}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] text-[var(--cordel-text)] opacity-60 leading-tight">
                    {lang === 'fr'
                      ? 'Ces images s\'affichent en transparence dans la Roda et peuvent être assignées à des mesures dans la Timeline.'
                      : 'Estas imagens aparecem em transparência na Roda e podem ser atribuídas a compassos na Timeline.'}
                  </span>
                  {onToggleHideGlobalSignals && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none mt-1">
                      <input 
                        type="checkbox" 
                        checked={hideGlobalSignals || false} 
                        onChange={onToggleHideGlobalSignals}
                        className="w-3 h-3 cursor-pointer"
                      />
                      <span className="text-[10px] text-[var(--cordel-text)] font-bold">
                        {lang === 'fr' ? '🙈 Masquer les signaux officiels globaux' : '🙈 Ocultar sinais oficiais globais'}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <React.Suspense fallback={null}>
                <PresetManagerSection
                  metadata={metadata!}
                  onMetadataChange={onMetadataChange!}
                  lang={lang}
                  userProfile={userProfile}
                />
              </React.Suspense>

              <React.Suspense fallback={null}>
                <CloudLibraryTab
                  mestreSignals={mestreSignals || []}
                  refreshMestreSignals={refreshMestreSignals}
                  userProfile={userProfile}
                  lang={lang}
                />
              </React.Suspense>
            </div>
          )}

          {subTab === 'feedback' && (
            <React.Suspense fallback={null}>
              <FeedbackSection />
            </React.Suspense>
          )}

        </div>
    </div>

    </>
  );
};

export const RightSidebar = React.memo(RightSidebarComponent);
