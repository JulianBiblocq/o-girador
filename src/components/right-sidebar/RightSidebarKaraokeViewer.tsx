/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language, TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';

type Token = { trackId: number; patternId: number; stepIdx: number; displayText: string; hasSpace: boolean; color: string; instIdx: number; role: 'puxador' | 'coro'; isBreak?: boolean };

function extractRoleTokens(track: TrackGroup | undefined, role: 'puxador' | 'coro'): Token[][] {
  if (!track) return [];
  const allTokens: Token[] = [];

  track.patterns.forEach((ptn: any) => {
    let added = false;
    if (ptn.preRollActiveSteps && ptn.preRollLyrics) {
      for (let i = 0; i < 16; i++) {
        const state = ptn.preRollActiveSteps[i];
        const lyric = ptn.preRollLyrics[i];
        if (!state || state === 0 || !lyric || lyric.trim() === '' || lyric.trim() === '-') continue;
        allTokens.push({ trackId: track.id, patternId: ptn.id, stepIdx: i - 16, displayText: lyric.replace(/-$/, '').trim(), hasSpace: lyric.endsWith(' ') || lyric.endsWith('  '), color: role === 'puxador' ? '#c25e38' : '#1e40af', instIdx: track.instrumentIdx, role });
        added = true;
      }
    }
    for (let i = 0; i < ptn.steps; i++) {
      const state = ptn.activeSteps[i];
      const lyric = ptn.lyrics[i];
      if (!state || state === 0 || !lyric || lyric.trim() === '' || lyric.trim() === '-') continue;
      allTokens.push({ trackId: track.id, patternId: ptn.id, stepIdx: i, displayText: lyric.replace(/-$/, '').trim(), hasSpace: lyric.endsWith(' ') || lyric.endsWith('  '), color: role === 'puxador' ? '#c25e38' : '#1e40af', instIdx: track.instrumentIdx, role });
      added = true;
    }
    if (added) allTokens.push({ trackId: track.id, patternId: ptn.id, stepIdx: -1, displayText: '', hasSpace: false, color: '', instIdx: track.instrumentIdx, role, isBreak: true });
  });

  const words: Token[][] = [];
  let currentWord: Token[] = [];
  allTokens.forEach(tok => {
    if (tok.isBreak) {
      if (currentWord.length > 0) { words.push(currentWord); currentWord = []; }
      words.push([tok]);
      return;
    }
    currentWord.push(tok);
    if (tok.hasSpace) { words.push(currentWord); currentWord = []; }
  });
  if (currentWord.length > 0) words.push(currentWord);
  return words;
}

export const RightSidebarKaraokeViewer: React.FC<{ tracks: TrackGroup[]; lang: Language; containerRef: React.RefObject<HTMLDivElement | null> }> = ({ tracks, lang, containerRef }) => {
  const voiceTracks = tracks.filter(t => instrumentsConfig[t.instrumentIdx]?.type === 'voice' && !t.isMute);
  if (voiceTracks.length === 0) {
    return <div className="text-[var(--cordel-text)] font-sans font-bold text-xs text-center mt-6 italic opacity-70">{lang === 'fr' ? 'Ajoutez une piste de voix (non mutée) pour voir la letra.' : 'Adicione uma faixa de Voz/Coro (não mutada) para ver a letra.'}</div>;
  }
  const puxWords = extractRoleTokens(voiceTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador'), 'puxador');
  const coroWords = extractRoleTokens(voiceTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro'), 'coro');

  if (puxWords.length === 0 && coroWords.length === 0) {
    return <div className="text-[var(--cordel-text)] font-sans font-bold text-xs text-center mt-6 italic opacity-70">{lang === 'fr' ? 'Saisissez des paroles sur le Puxador ou le Coro.' : 'Digite letras no Puxador ou no Coro.'}</div>;
  }

  const renderBlock = (words: Token[][], role: 'puxador' | 'coro', label: string, badgeBg: string, borderColor: string) => {
    if (words.length === 0) return null;
    return (
      <div data-role-block={role} className={`transition-opacity duration-200 border-2 ${borderColor} bg-[#f4ecd8]/60 p-2.5 rounded-sm flex flex-col gap-1.5 mb-2.5 cordel-shadow-sm`}>
        <div className="flex items-center justify-between border-b border-black/10 pb-1">
          <span className={`${badgeBg} text-white text-[9px] font-cactus font-bold uppercase px-2 py-0.5 rounded-xs tracking-wider shadow-xs`}>{label}</span>
          <span className="text-[9px] font-cactus font-bold uppercase opacity-60">{role === 'puxador' ? 'Solo' : (lang === 'fr' ? 'Chœur' : 'Coro')}</span>
        </div>
        <div className="flex flex-wrap gap-y-1.5 gap-x-2 text-sm md:text-base font-bold font-sans leading-relaxed">
          {words.map((w, wIdx) => w[0].isBreak ? <div key={`b-${role}-${wIdx}`} className="w-full h-1" /> : (
            <span key={`w-${role}-${wIdx}`} className="inline">
              {w.map((tok, i) => (
                <span key={`${tok.trackId}-${tok.patternId}-${tok.stepIdx}-${i}`} data-karaoke-token="true" data-role={tok.role} data-inst-idx={tok.instIdx} data-pattern-id={tok.patternId} data-step-idx={tok.stepIdx} className="transition-all duration-75 font-bold rounded-xs px-0.5 inline-block" style={{ backgroundColor: 'transparent', color: 'var(--cordel-text)', marginRight: tok.hasSpace ? '5px' : '0px' }}>
                  {tok.displayText}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex-grow overflow-y-auto min-h-0 pr-1 custom-scrollbar">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm p-2 font-sans flex flex-col gap-1">
        {renderBlock(puxWords, 'puxador', 'PUXADOR', 'bg-[#c25e38]', 'border-[#c25e38]/30')}
        {renderBlock(coroWords, 'coro', 'CORO', 'bg-[#1e40af]', 'border-[#1e40af]/30')}
      </div>
    </div>
  );
};
