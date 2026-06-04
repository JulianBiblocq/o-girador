/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Circle, Language, PresetMetadata } from '../types';
import { i18n, instrumentsConfig } from '../data';

interface RightSidebarProps {
  lang: Language;
  activePanel: 'legend' | 'letras' | null;
  onTogglePanel: (panel: 'legend' | 'letras') => void;
  circles: Circle[];
  letras: string;
  onLetrasChange: (val: string) => void;
  metadata?: PresetMetadata;
  onMetadataChange?: (val: PresetMetadata) => void;
  currentPlayState: {
    stepIndex: number;
    maxTicks: number;
    activeCircleIdByInst: { [instIdx: number]: number | null };
  } | null;
  onExtractLyrics: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  lang,
  activePanel,
  onTogglePanel,
  circles,
  letras,
  onLetrasChange,
  metadata,
  onMetadataChange,
  currentPlayState,
  onExtractLyrics,
}) => {
  const t = (key: string) => {
    const section = i18n[lang];
    return (section as any)[key] || key;
  };

  if (!activePanel) return null;

  // Render localized HTML strings safely for the gold rule
  const goldRuleHtml = t('goldRule');

  return (
    <div
      id="right-sidebar-panel"
      className="w-[340px] min-w-[340px] bg-gradient-to-b from-[#1c1815] to-[#120e0c] border-l-2 border-[#eaddcf] flex flex-col h-full transition-all duration-300 relative z-10"
    >
      {/* --- LEGEND SECTION --- */}
      {activePanel === 'legend' && (
        <div className="flex flex-col p-5 h-full overflow-y-auto">
          <div className="flex justify-between items-center border-b border-[#333] pb-3 mb-4">
            <span className="font-cactus text-2xl text-[#eaddcf] tracking-wider uppercase font-medium">
              {t('legend')}
            </span>
            <button
              onClick={() => onTogglePanel('legend')}
              className="bg-[#333] text-[#eaddcf] border border-[#eaddcf] px-2 py-1 text-sm font-bold hover:bg-[#eaddcf] hover:text-black transition-colors"
              title={t('toggleLegendBtn')}
            >
              ▶
            </button>
          </div>

          <div className="flex flex-col gap-1.5 pr-1 flex-grow">
            {/* Vocals */}
            <div className="relative flex flex-col gap-1 bg-[#181818] p-2 border border-[#eaddcf] after:absolute after:top-0.5 after:left-0.5 after:right-0.5 after:bottom-0.5 after:border after:border-dashed after:border-[#eaddcf]/30 after:pointer-events-none">
              <span className="text-[10px] font-bold text-[#f1c40f] uppercase tracking-wider relative z-[2]">
                {t('voiceLegendTitle')}
              </span>
              <div className="text-xs text-[#f5f5f5] leading-relaxed relative z-[2]">
                <p dangerouslySetInnerHTML={{ __html: t('voiceLegend1') }} />
                <p dangerouslySetInnerHTML={{ __html: t('voiceLegend2') }} />
              </div>
            </div>

            {/* Gold Rule */}
            <div
              className="text-[11px] mt-2 mb-1 text-[#f1c40f] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: goldRuleHtml }}
            />

            {/* Instruments Details */}
            <div className="relative flex flex-col gap-1 bg-[#181818] p-2 border border-[#eaddcf] after:absolute after:top-0.5 after:left-0.5 after:right-0.5 after:bottom-0.5 after:border after:border-dashed after:border-[#eaddcf]/30 after:pointer-events-none">
              <span className="text-[10px] font-bold text-[#f1c40f] uppercase tracking-wider relative z-[2]">
                {t('alfaiaCaixa')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[#f5f5f5] relative z-[2]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#8b0000] text-white border border-white/10">
                    D / d
                  </span>
                  <span>{t('mainDroite')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#f39c12] text-[#121212] border border-white/10">
                    G / g
                  </span>
                  <span>{t('mainGauche')}</span>
                </div>
              </div>
            </div>

            {/* Gongue */}
            <div className="relative flex flex-col gap-1 bg-[#181818] p-2 border border-[#eaddcf] after:absolute after:top-0.5 after:left-0.5 after:right-0.5 after:bottom-0.5 after:border after:border-dashed after:border-[#eaddcf]/30 after:pointer-events-none">
              <span className="text-[10px] font-bold text-[#f1c40f] uppercase tracking-wider relative z-[2]">
                {t('gongueLegend')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[#f5f5f5] relative z-[2]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#222] text-white border border-white/10">
                    G / g
                  </span>
                  <span>{t('gongueGrave')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#bdc3c7] text-black border border-white/10">
                    A / a
                  </span>
                  <span>{t('gongueAigu')}</span>
                </div>
              </div>
            </div>

            {/* Agbe */}
            <div className="relative flex flex-col gap-1 bg-[#181818] p-2 border border-[#eaddcf] after:absolute after:top-0.5 after:left-0.5 after:right-0.5 after:bottom-0.5 after:border after:border-dashed after:border-[#eaddcf]/30 after:pointer-events-none">
              <span className="text-[10px] font-bold text-[#f1c40f] uppercase tracking-wider relative z-[2]">
                {t('agbeLegend')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[#f5f5f5] relative z-[2]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#1b5e20] text-white border border-white/10">
                    G / g
                  </span>
                  <span>{t('agbeG')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#4caf50] text-[#121212] border border-white/10">
                    D / d
                  </span>
                  <span>{t('agbeD')}</span>
                </div>
              </div>
            </div>

            {/* Mineiro */}
            <div className="relative flex flex-col gap-1 bg-[#181818] p-2 border border-[#eaddcf] after:absolute after:top-0.5 after:left-0.5 after:right-0.5 after:bottom-0.5 after:border after:border-dashed after:border-[#eaddcf]/30 after:pointer-events-none">
              <span className="text-[10px] font-bold text-[#f1c40f] uppercase tracking-wider relative z-[2]">
                {t('mineiroLegend')}
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[#f5f5f5] relative z-[2]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#1b5e20] text-white border border-white/10">
                    P / p
                  </span>
                  <span>{t('mineiroP')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#4caf50] text-[#121212] border border-white/10">
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
          <div className="flex justify-between items-center border-b border-[#333] pb-3 mb-4 shrink-0">
            <span className="font-cactus text-2xl text-[#eaddcf] tracking-wider uppercase font-medium">
              {t('letrasTitle')}
            </span>
            <button
              onClick={() => onTogglePanel('letras')}
              className="bg-[#333] text-[#eaddcf] border border-[#eaddcf] px-2 py-1 text-sm font-bold hover:bg-[#eaddcf] hover:text-black transition-colors"
            >
              X
            </button>
          </div>

          {/* Metadata Frame */}
          {metadata && onMetadataChange && (
            <div className="flex flex-col gap-2 mb-4 p-3 border border-[#444] bg-[#221e1a] rounded">
              <span className="text-[#f1c40f] text-sm font-bold uppercase tracking-wider mb-1">
                {t('metaInfo')}
              </span>
              <input
                type="text"
                placeholder={t('metaToada')}
                value={metadata.toada}
                onChange={(e) => onMetadataChange({ ...metadata, toada: e.target.value })}
                className="bg-[#121212] border border-[#444] text-[#eaddcf] text-xs p-1.5 focus:border-[#eaddcf] outline-none w-full"
              />
              <input
                type="text"
                placeholder={t('metaNacao')}
                value={metadata.nacao}
                onChange={(e) => onMetadataChange({ ...metadata, nacao: e.target.value })}
                className="bg-[#121212] border border-[#444] text-[#eaddcf] text-xs p-1.5 focus:border-[#eaddcf] outline-none w-full"
              />
              <input
                type="text"
                placeholder={t('metaCompositor')}
                value={metadata.compositor}
                onChange={(e) => onMetadataChange({ ...metadata, compositor: e.target.value })}
                className="bg-[#121212] border border-[#444] text-[#eaddcf] text-xs p-1.5 focus:border-[#eaddcf] outline-none w-full"
              />
              <input
                type="text"
                placeholder={t('metaRitmo')}
                value={metadata.ritmo}
                onChange={(e) => onMetadataChange({ ...metadata, ritmo: e.target.value })}
                className="bg-[#121212] border border-[#444] text-[#eaddcf] text-xs p-1.5 focus:border-[#eaddcf] outline-none w-full"
              />
            </div>
          )}

          <div className="flex justify-end mb-2 shrink-0">
          {(() => {
            const voiceCircles = circles.filter(c => instrumentsConfig[c.instrumentIdx]?.type === 'voice' && !c.isMute);
            if (voiceCircles.length === 0) return null;

            // For each voice circle, build tokens: { circleId, stepIdx, displayText, hasDash, color, instIdx }
            type Token = { circleId: number; stepIdx: number; displayText: string; hasDash: boolean; color: string; instIdx: number; };
            const allTokens: Token[] = [];
            voiceCircles.forEach(c => {
              const inst = instrumentsConfig[c.instrumentIdx];
              for (let i = 0; i < c.steps; i++) {
                const state = c.activeSteps[i];
                const lyric = c.lyrics[i]?.trim();
                if (!state || state === 0 || !lyric) continue;
                const isPux = state === 'P';
                const color = isPux ? inst.colors['P'] : inst.colors['C'];
                const hasDash = lyric.endsWith('-');
                const displayText = lyric.replace(/-$/g, '');
                allTokens.push({ circleId: c.id, stepIdx: i, displayText, hasDash, color, instIdx: c.instrumentIdx });
              }
            });

            // Determine which circle is active per instrument (for karaoke turn)
            const activeByInst = currentPlayState?.activeCircleIdByInst ?? {};

            return (
              <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-[#111] border border-[#333] p-3 rounded-sm">
                  <div className="flex flex-wrap gap-y-2 leading-loose text-base">
                    {(() => {
                      const words: Token[][] = [];
                      let currentWord: Token[] = [];
                      allTokens.forEach(tok => {
                        currentWord.push(tok);
                        if (!tok.hasDash) {
                          words.push(currentWord);
                          currentWord = [];
                        }
                      });
                      if (currentWord.length > 0) words.push(currentWord);

                      return words.map((word, wordIdx) => (
                        <span key={`word-${wordIdx}`} className="whitespace-nowrap inline-flex">
                          {word.map((tok, idx) => {
                            const c = voiceCircles.find(x => x.id === tok.circleId);
                            if (!c) return null;

                            const groupActiveId = activeByInst[tok.instIdx];
                            const isThisCircleActive = currentPlayState !== null && (groupActiveId === tok.circleId || groupActiveId === undefined || groupActiveId === null);
                            const currentStep = (isThisCircleActive && currentPlayState)
                              ? Math.floor((currentPlayState.stepIndex / currentPlayState.maxTicks) * c.steps)
                              : -1;
                            const isHighlighted = isThisCircleActive && currentStep === tok.stepIdx;

                            return (
                              <span
                                key={`${tok.circleId}-${tok.stepIdx}-${idx}`}
                                className={`py-0.5 transition-all duration-100 font-bold ${
                                  isHighlighted ? 'bg-[#f1c40f] text-black font-extrabold scale-110 shadow-[0_0_8px_#f1c40f] rounded-sm' : ''
                                }`}
                                style={{
                                  color: isHighlighted ? '#000' : tok.color,
                                  backgroundColor: isHighlighted ? '#f1c40f' : 'transparent',
                                  marginRight: tok.hasDash ? '0px' : '6px',
                                }}
                              >
                                {tok.displayText}
                              </span>
                            );
                          })}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            );
          })()}
          </div>

          <div className="flex-grow" />

          {circles.filter(c => instrumentsConfig[c.instrumentIdx]?.type === 'voice' && !c.isMute).length === 0 && (
              <div className="text-[#666] text-sm text-center mt-10 italic">
                Adicione uma faixa de Voz/Coro (não mutada) para ver a toada aqui.
              </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-[#333]">
             <textarea
              className="flex-grow w-full bg-[#1c1815] text-[#eaddcf] border border-[#444] p-3 font-mono text-sm resize-none focus:outline-none focus:border-[#f1c40f]"
              placeholder={t('letrasPlaceholder')}
              value={letras}
              onChange={(e) => onLetrasChange(e.target.value)}
            />
            <button
              onClick={onExtractLyrics}
              className="w-full bg-[#2c3e50] text-[#eaddcf] border border-[#eaddcf]/50 px-3 py-1.5 font-bold hover:bg-[#eaddcf] hover:text-black transition-all duration-200 mt-2 text-xs flex items-center justify-center gap-2"
            >
              🔄 {t('extractBtn')} (Texto Simples)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
