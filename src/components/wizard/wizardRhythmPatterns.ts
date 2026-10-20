import { instrumentAudioConfigs } from '../../data/audioConfig';

export const getBasePatternForInstrument = (rhythmId: string, instType: string): (string | number)[] => {
  const isLuanda = rhythmId === 'luanda';
  const isTrovao = rhythmId === 'trovao';
  const isMartelo = rhythmId === 'martelo';

  let rawPattern: (string | number)[] = Array(16).fill(0);

  if (isLuanda) {
    if (instType === 'marcante') rawPattern = ['D', 0, 0, 'd', 'E', 0, 'D', 0, 'e', 'D', 0, 'd', 'E', 0, 0, 0];
    else if (instType === 'meiao') rawPattern = [0, 0, 'D', 0, 0, 'e', 0, 'D', 0, 0, 'D', 0, 0, 'e', 0, 0];
    else if (instType === 'repique') rawPattern = [0, 'd', 0, 0, 0, 'D', 0, 0, 0, 'd', 0, 0, 0, 'D', 0, 0];
    else if (instType === 'caixa' || instType === 'tarol') rawPattern = ['D', 'D', 'e', 'D', 'D', 'e', 'D', 'e', 'D', 'D', 'e', 'D', 'D', 'e', 'D', 'e'];
    else if (instType === 'gongue') rawPattern = [0, 'G', 0, 0, 'G', 0, 'G', 0, 0, 'G', 0, 0, 'G', 0, 'G', 0];
    else if (instType === 'agbe' || instType === 'mineiro') rawPattern = ['E', 0, 'd', 'e', 'D', 0, 'e', 'd', 'E', 0, 'd', 'e', 'D', 0, 'e', 'd'];
    else if (instType === 'timbal') rawPattern = ['g', 0, 'D', 'd', 'S', 0, 's', 0, 'g', 0, 'D', 'd', 'S', 0, 's', 0];
  } else if (isTrovao) {
    if (instType === 'marcante') rawPattern = ['D', 0, 'D', 0, 'E', 0, 'D', 0, 'D', 0, 'D', 0, 'E', 0, 0, 0];
    else if (instType === 'meiao') rawPattern = [0, 'D', 0, 0, 'E', 0, 0, 'D', 0, 'D', 0, 0, 'E', 0, 0, 0];
    else if (instType === 'repique') rawPattern = [0, 0, 'd', 'D', 0, 'e', 'D', 0, 0, 0, 'd', 'D', 0, 'e', 'D', 0];
    else if (instType === 'caixa' || instType === 'tarol') rawPattern = ['D', 'e', 'd', 'D', 'e', 'd', 'D', 'e', 'D', 'e', 'd', 'D', 'e', 'd', 'D', 'e'];
    else if (instType === 'gongue') rawPattern = ['G', 0, 'G', 0, 0, 'G', 0, 0, 'G', 0, 'G', 0, 0, 'G', 0, 0];
    else if (instType === 'agbe' || instType === 'mineiro') rawPattern = ['E', 0, 'e', 0, 'D', 0, 'd', 0, 'E', 0, 'e', 0, 'D', 0, 'd', 0];
    else if (instType === 'timbal') rawPattern = ['g', 'G', 'd', 0, 'S', 's', 0, 0, 'g', 'G', 'd', 0, 'S', 's', 0, 0];
  } else if (isMartelo) {
    if (instType === 'marcante') rawPattern = ['D', 0, 0, 0, 'E', 0, 0, 0, 'D', 0, 0, 0, 'E', 0, 0, 0];
    else if (instType === 'meiao') rawPattern = [0, 0, 'D', 0, 0, 0, 'E', 0, 0, 0, 'D', 0, 0, 0, 'E', 0];
    else if (instType === 'repique') rawPattern = [0, 'd', 0, 0, 0, 'e', 0, 0, 0, 'd', 0, 0, 0, 'e', 0, 0];
    else if (instType === 'caixa' || instType === 'tarol') rawPattern = ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
    else if (instType === 'gongue') rawPattern = ['G', 0, 0, 0, 'G', 0, 0, 0, 'G', 0, 0, 0, 'G', 0, 0, 0];
    else if (instType === 'agbe' || instType === 'mineiro') rawPattern = ['E', 0, 'E', 0, 'E', 0, 'E', 0, 'E', 0, 'E', 0, 'E', 0, 'E', 0];
    else if (instType === 'timbal') rawPattern = ['S', 0, 'S', 0, 's', 0, 's', 0, 'S', 0, 'S', 0, 's', 0, 's', 0];
  }

  const instConfig = instrumentAudioConfigs.find((c) => c.id === instType);
  if (!instConfig) return Array(16).fill(0);
  const validStrokes = new Set(instConfig.strokes.map((s) => s.symbol));
  return rawPattern.map((step) => {
    if (step === 0 || step === '0' || step === '') return 0;
    if (validStrokes.has(String(step))) return step;
    return 0;
  });
};
