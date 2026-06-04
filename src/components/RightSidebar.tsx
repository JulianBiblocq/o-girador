/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrackGroup, Language, PresetMetadata } from '../types';
import { i18n, instrumentsConfig } from '../data';

interface RightSidebarProps {
  lang: Language;
  activePanel: 'legend' | 'letras' | null;
  onTogglePanel: (panel: 'legend' | 'letras') => void;
  tracks: TrackGroup[];
  letras: string;
  onLetrasChange: (val: string) => void;
  metadata?: PresetMetadata;
  onMetadataChange?: (val: PresetMetadata) => void;
  currentPlayState: {
    stepIndex: number;
    maxTicks: number;
    activePatternIdByInst: { [instIdx: number]: number | null };
  } | null;
  totalMeasures: number;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  lang,
  activePanel,
  onTogglePanel,
  tracks,
  letras,
  onLetrasChange,
  metadata,
  onMetadataChange,
  currentPlayState,
  totalMeasures,
}) => {
  const t = (key: string) => {
    const section = i18n[lang];
    return (section as any)[key] || key;
  };

  if (!activePanel) return null;

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    const videoId = match ? match[1] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  // Render localized HTML strings safely for the gold rule
  const goldRuleHtml = t('goldRule');

  return (
    <div
      id="right-sidebar-panel"
      className="w-[340px] min-w-[340px] bg-[var(--cordel-bg)] cordel-bg border-l-[3px] border-[var(--cordel-border)] flex flex-col h-full transition-all duration-300 relative z-10 text-[var(--cordel-text)]"
    >
      {/* --- LEGEND SECTION --- */}
      {activePanel === 'legend' && (
        <div className="flex flex-col p-5 h-full overflow-y-auto">
          <div className="flex justify-between items-center border-b-[3px] border-[var(--cordel-border)] pb-3 mb-4">
            <span className="font-cactus font-bold text-2xl text-[var(--cordel-text)] tracking-wider uppercase font-medium">
              {t('legend')}
            </span>
            <button
              onClick={() => onTogglePanel('legend')}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-2 py-1 text-sm font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
              title={t('toggleLegendBtn')}
            >
              ▶
            </button>
          </div>

          <div className="flex flex-col gap-1.5 pr-1 flex-grow">
            {/* Vocals */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('voiceLegendTitle')}
              </span>
              <div className="text-xs text-[var(--cordel-text)] leading-relaxed">
                <p dangerouslySetInnerHTML={{ __html: t('voiceLegend1') }} />
                <p dangerouslySetInnerHTML={{ __html: t('voiceLegend2') }} />
              </div>
            </div>

            {/* Gold Rule */}
            <div
              className="text-[11px] mt-2 mb-1 text-[var(--cordel-text)] font-bold leading-relaxed border-l-4 border-[var(--cordel-border)] pl-2"
              dangerouslySetInnerHTML={{ __html: goldRuleHtml }}
            />

            {/* Instruments Details */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('alfaiaCaixa')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">
                    D / d
                  </span>
                  <span>{t('mainDroite')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">
                    G / g
                  </span>
                  <span>{t('mainGauche')}</span>
                </div>
              </div>
            </div>

            {/* Alfaia Specific Strokes */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                🥁 Alfaia (Extras)
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-[18px] text-[9px] font-bold bg-[#4c1c1c] text-[#f4ecd8] mr-1">
                    b
                  </span>
                  <span>{t('legendAlfaiaBarulho')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-[18px] text-[9px] font-bold bg-[#8c7b7b] text-[#f4ecd8] mr-1">
                    x
                  </span>
                  <span>{t('legendAlfaiaCerclage')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-[18px] text-[9px] font-bold bg-[#ff8da1] text-[#1a1a1a] mr-1">
                    i
                  </span>
                  <span>{t('legendAlfaiaIguarassu')}</span>
                </div>
              </div>
            </div>

            {/* Caixa Specific Strokes */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                🥁 Caixa (Extras)
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-[18px] text-[9px] font-bold bg-[#a855f7] text-[#f4ecd8] mr-0.5">
                    rd
                  </span>
                  <span className="inline-flex items-center justify-center w-6 h-[18px] text-[9px] font-bold bg-[#d8b4fe] text-[#1a1a1a] mr-1">
                    rg
                  </span>
                  <span>{t('legendCaixaRufada')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-[18px] text-[9px] font-bold bg-[#7e7b8c] text-[#f4ecd8] mr-1">
                    x
                  </span>
                  <span>{t('legendCaixaCerclage')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-[18px] text-[9px] font-bold bg-[#d946ef] text-[#f4ecd8] mr-1">
                    f
                  </span>
                  <span>{t('legendCaixaFla')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-[18px] text-[9px] font-bold bg-[#4a044e] text-[#f4ecd8] mr-1">
                    b
                  </span>
                  <span>{t('legendCaixaBarulho')}</span>
                </div>
              </div>
            </div>

            {/* Gongue */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('gongueLegend')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">
                    G / g
                  </span>
                  <span>{t('gongueGrave')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">
                    A / a
                  </span>
                  <span>{t('gongueAigu')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#6d4c41] text-[#f4ecd8]">
                    b
                  </span>
                  <span>{t('gongueBarulho')}</span>
                </div>
              </div>
            </div>

            {/* Agbe */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('agbeLegend')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">
                    G / g
                  </span>
                  <span>{t('agbeG')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">
                    D / d
                  </span>
                  <span>{t('agbeD')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-[18px] text-[9px] font-bold bg-[#133816] text-[#f4ecd8] mr-1">
                    b
                  </span>
                  <span>{t('legendAgbeBarulho')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-[18px] text-[9px] font-bold bg-[#86efac] text-[#1a1a1a] mr-1">
                    s
                  </span>
                  <span>{t('legendAgbeSaut')}</span>
                </div>
              </div>
            </div>

            {/* Mineiro */}
            <div className="relative flex flex-col gap-1 bg-[var(--cordel-bg)] cordel-border-sm p-2">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                {t('mineiroLegend')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">
                    P / p
                  </span>
                  <span>{t('mineiroP')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">
                    T / t
                  </span>
                  <span>{t('mineiroT')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- LETRAS / TOADA SECTION --- */}
      {activePanel === 'letras' && (
        <div className="flex flex-col p-5 h-full overflow-hidden">
          <div className="flex justify-between items-center border-b-[3px] border-[var(--cordel-border)] pb-3 mb-4 shrink-0">
            <span className="font-cactus font-bold text-2xl text-[var(--cordel-text)] tracking-wider uppercase font-medium">
              {t('letrasTitle')}
            </span>
            <button
              onClick={() => onTogglePanel('letras')}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-2 py-1 text-sm font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
            >
              X
            </button>
          </div>

          {/* Metadata Frame */}
          {metadata && onMetadataChange && (
            <div className="flex flex-col gap-2 mb-4 p-3 bg-[var(--cordel-bg)] cordel-border-sm">
              <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1">
                {t('metaInfo')}
              </span>
              <input
                type="text"
                placeholder={t('metaToada')}
                value={metadata.toada}
                onChange={(e) => onMetadataChange({ ...metadata, toada: e.target.value })}
                className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
              />
              <input
                type="text"
                placeholder={t('metaNacao')}
                value={metadata.nacao}
                onChange={(e) => onMetadataChange({ ...metadata, nacao: e.target.value })}
                className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
              />
              <input
                type="text"
                placeholder={t('metaCompositor')}
                value={metadata.compositor}
                onChange={(e) => onMetadataChange({ ...metadata, compositor: e.target.value })}
                className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
              />
              <input
                type="text"
                placeholder={t('metaRitmo')}
                value={metadata.ritmo}
                onChange={(e) => onMetadataChange({ ...metadata, ritmo: e.target.value })}
                className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
              />
              <input
                type="text"
                placeholder={lang === 'pt' ? 'Link do YouTube' : 'Lien YouTube'}
                value={metadata.youtubeUrl || ''}
                onChange={(e) => onMetadataChange({ ...metadata, youtubeUrl: e.target.value })}
                className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
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
            </div>
          )}

          <div className="flex justify-end mb-2 shrink-0">
          {(() => {
            const voiceTracks = tracks.filter(t => instrumentsConfig[t.instrumentIdx]?.type === 'voice' && !t.isMute);
            if (voiceTracks.length === 0) return null;

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
                  const hasDash = lyric.endsWith('-');
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
              <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
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
              </div>
            );
          })()}
          </div>

          <div className="flex-grow" />

          {tracks.filter(t => instrumentsConfig[t.instrumentIdx]?.type === 'voice' && !t.isMute).length === 0 && (
              <div className="text-[var(--cordel-text)] font-sans font-bold text-sm text-center mt-10 italic opacity-70">
                Adicione uma faixa de Voz/Coro (não mutada) para ver a toada aqui.
              </div>
          )}
        </div>
      )}
    </div>
  );
};
