/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pattern } from '../../../types';

interface VoiceKaraokePreviewProps {
  pattern: Pattern;
  lang: string;
}

export const VoiceKaraokePreview: React.FC<VoiceKaraokePreviewProps> = ({ pattern, lang }) => {
  const preRollWords: Array<Array<{ text: string; key: string }>> = [];
  let curPreWord: Array<{ text: string; key: string }> = [];
  const preRollActive = pattern?.preRollActiveSteps || [];
  const preRollLyrics = pattern?.preRollLyrics || [];

  for (let idx = 0; idx < 16; idx++) {
    const active = preRollActive[idx] !== undefined && preRollActive[idx] !== null && preRollActive[idx] !== 0 && preRollActive[idx] !== '0';
    const syl = preRollLyrics[idx] || '';
    if (active && syl) {
      curPreWord.push({ text: syl, key: `pre-${idx}` });
      if (syl.endsWith(' ') || idx === 15) {
        preRollWords.push([...curPreWord]);
        curPreWord = [];
      }
    }
  }
  if (curPreWord.length > 0) preRollWords.push(curPreWord);

  const mainWords: Array<Array<{ text: string; key: string }>> = [];
  let currentWord: Array<{ text: string; key: string }> = [];
  const totalSteps = pattern?.steps ?? 16;
  for (let idx = 0; idx < totalSteps; idx++) {
    const active = pattern?.activeSteps?.[idx] !== undefined && pattern?.activeSteps?.[idx] !== null && pattern?.activeSteps?.[idx] !== 0 && pattern?.activeSteps?.[idx] !== '0';
    const syl = pattern?.lyrics?.[idx] || '';
    if (active && syl) {
      currentWord.push({ text: syl, key: `${idx}` });
      if (syl.endsWith(' ') || idx === totalSteps - 1) {
        mainWords.push([...currentWord]);
        currentWord = [];
      }
    }
  }
  if (currentWord.length > 0) mainWords.push(currentWord);

  const hasAnyLyrics = preRollWords.length > 0 || mainWords.length > 0;

  return (
    <div className="mt-3 p-3 bg-[#ece4d0] border border-[#1a1a1a]/25 cordel-border-sm flex flex-col gap-1.5 w-full text-[#1a1a1a]">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase opacity-65 tracking-wider select-none">
          {lang === 'fr' ? 'Paroles (Letra en direct)' : 'Letras (Letra ao vivo)'}
        </span>
        {preRollWords.length > 0 && (
          <span className="text-[9px] font-bold bg-[#8b2a1a] text-[#f4ecd8] px-1.5 py-0.2 rounded-full uppercase tracking-wider select-none">
            + {lang === 'fr' ? 'Anacrouse incluse' : 'Anacruse inclusa'}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm font-bold font-cactus leading-relaxed">
        {!hasAnyLyrics ? (
          <span className="italic text-[#666]">
            {lang === 'fr' ? 'Saisissez des syllabes dans la grille...' : 'Digite sílabas na grade...'}
          </span>
        ) : (
          <>
            {preRollWords.length > 0 && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#8b2a1a]/10 border border-[#8b2a1a]/25 text-[#8b2a1a] mr-1 select-none">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                  ⤹ {lang === 'fr' ? 'Anacrouse :' : 'Anacruse :'}
                </span>
                {preRollWords.map((word, wIdx) => (
                  <span
                    key={`pre-w-${wIdx}`}
                    data-word-steps={JSON.stringify(word.map(item => item.key))}
                    className="opacity-85 transition-colors duration-150 inline-flex"
                  >
                    {word.map((item, sIdx) => (
                      <span key={`pre-s-${sIdx}`} data-syl-index={item.key}>
                        {item.text}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            )}
            {mainWords.map((word, wIdx) => (
              <span
                key={`main-w-${wIdx}`}
                data-word-steps={JSON.stringify(word.map(item => item.key))}
                className="opacity-85 transition-colors duration-150 inline-flex"
              >
                {word.map((item, sIdx) => (
                  <span key={`main-s-${sIdx}`} data-syl-index={item.key}>
                    {item.text}
                  </span>
                ))}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
