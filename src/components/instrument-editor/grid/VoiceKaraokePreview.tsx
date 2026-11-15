import React from 'react';
import { Pattern } from '../../../types';
import { cleanVoiceSyllableForDisplay, isKaraokeHiddenToken } from '../../../utils/musicTheory';

interface PreviewSyl {
  text: string;
  key: string;
  stepKeys: string[];
}

function buildPreviewWords(activeArr: any[], lyricsArr: string[], totalSteps: number, prefix: string): PreviewSyl[][] {
  const words: PreviewSyl[][] = [];
  let curWord: PreviewSyl[] = [];
  for (let idx = 0; idx < totalSteps; idx++) {
    const active = activeArr[idx] !== undefined && activeArr[idx] !== null && activeArr[idx] !== 0 && activeArr[idx] !== '0';
    const syl = lyricsArr[idx] || '';
    if (!active || !syl) continue;
    const trimmed = syl.trim();
    const stepKey = `${prefix}${idx}`;
    const isHold = trimmed === '───' || trimmed === '_' || trimmed === '—' || trimmed === '~' || trimmed === '-';
    if (isHold) {
      if (curWord.length > 0) {
        curWord[curWord.length - 1].stepKeys.push(stepKey);
        if (syl.endsWith(' ') || idx === totalSteps - 1) { words.push([...curWord]); curWord = []; }
      } else if (words.length > 0) {
        const lastW = words[words.length - 1];
        lastW[lastW.length - 1].stepKeys.push(stepKey);
      }
      continue;
    }
    if (isKaraokeHiddenToken(trimmed)) continue;
    const clean = cleanVoiceSyllableForDisplay(syl);
    if (!clean) continue;
    curWord.push({ text: clean, key: stepKey, stepKeys: [stepKey] });
    if (syl.endsWith(' ') || idx === totalSteps - 1) {
      words.push([...curWord]);
      curWord = [];
    }
  }
  if (curWord.length > 0) words.push(curWord);
  return words;
}

interface VoiceKaraokePreviewProps {
  pattern: Pattern;
  lang: string;
}

export const VoiceKaraokePreview: React.FC<VoiceKaraokePreviewProps> = ({ pattern, lang }) => {
  const preRollWords = buildPreviewWords(pattern?.preRollActiveSteps || [], pattern?.preRollLyrics || [], 16, 'pre-');
  const mainWords = buildPreviewWords(pattern?.activeSteps || [], pattern?.lyrics || [], pattern?.steps ?? 16, '');
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
                    data-word-steps={JSON.stringify(word.flatMap((item) => item.stepKeys))}
                    className="opacity-85 transition-colors duration-150 inline-flex"
                  >
                    {word.map((item, sIdx) => (
                      <span key={`pre-s-${sIdx}`} data-syl-index={item.key} data-syl-steps={JSON.stringify(item.stepKeys)}>
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
                data-word-steps={JSON.stringify(word.flatMap((item) => item.stepKeys))}
                className="opacity-85 transition-colors duration-150 inline-flex"
              >
                {word.map((item, sIdx) => (
                  <span key={`main-s-${sIdx}`} data-syl-index={item.key} data-syl-steps={JSON.stringify(item.stepKeys)}>
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
