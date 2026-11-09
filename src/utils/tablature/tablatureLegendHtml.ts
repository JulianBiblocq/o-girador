import { useSequencerStore } from '../../stores/useSequencerStore';
import { renderHandwritingGuideHTML } from '../paper/paperHandwritingGuide';

export const generateLegendHTML = (forcePageBreak: boolean = true, lang: string = 'fr'): string => {
  const isPt = lang === 'pt';
  const title = isPt ? 'Legenda das Tablaturas' : 'Légende des Tablatures';
  const subtitleDrums = isPt ? 'Alfaias, Caixa, Tarol' : 'Alfaias, Caixa, Tarol';
  const subtitleStructure = isPt ? 'Estrutura Musical e Repetições' : 'Structure Musicale et Répétitions';
  const repeatDesc = isPt
    ? 'Barras de repetição. Indica que a seção deve ser repetida.'
    : 'Barres de reprise. Indique qu\'il faut répéter la section.';
  const pickupDesc = isPt
    ? 'Tocada na 1ª medida de cada novo bloco contíguo deste motivo (na linha do tempo ou na 1ª volta em loop simples), depois substituída pelo motivo principal nas medidas seguintes.'
    : 'Jouée à la 1ère mesure de chaque nouveau bloc contigu de ce motif (dans l\'arrangement ou au 1er tour en boucle simple), puis remplacée par le motif principal sur les mesures suivantes.';
  const masterSlaveDesc = isPt
    ? 'Na Roda e nas Pranchas A4, as pistas Mestras [M] que conduzem a chamada são exibidas com opacidade total (100 %), enquanto as pistas Escravas [E] ficam atenuadas (45 %) para destacar a pergunta-resposta.'
    : 'Sur la Roda et les Planches A4, les pistes Maîtres [M] qui lancent l\'appel s\'affichent en pleine opacité (100 %), tandis que les pistes Esclaves [E] sont atténuées (45 %) pour mettre en évidence le dialogue appel/réponse.';
  const rodaSheetDesc = isPt
    ? 'Modo de impressão circular (8 ou 12 rodas por página A4) com seleção de medidas no cesto e resolução exata das variações 1ª VEZ e chamadas.'
    : 'Mode d\'impression circulaire (8 ou 12 rodas par page A4) avec panier de sélection de mesures et résolution exacte des variations 1ª VEZ et appels.';

  return `
    <div style="${forcePageBreak ? 'page-break-before: always; ' : ''}font-family: sans-serif; padding-top: 20px; color: black; background: white;">
      <h2 style="font-family: 'Cactus', sans-serif; border-bottom: 2px solid #000; padding-bottom: 10px; font-size: 24px; margin-bottom: 20px;">${title}</h2>
      <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 10px;">
        <div style="width: 45%; margin-bottom: 15px;">
          <h3 style="font-size: 16px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">${subtitleDrums}</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0; font-size: 14px;">
            <li style="margin-bottom: 4px;"><strong>D</strong> : ${isPt ? 'Mão Direita (Forte)' : 'Main Droite (Forte)'}</li>
            <li style="margin-bottom: 4px;"><strong>d</strong> : ${isPt ? 'Mão Direita (Fraca)' : 'Main Droite (Faible)'}</li>
            <li style="margin-bottom: 4px;"><strong>E</strong> : ${isPt ? 'Mão Esquerda (Forte)' : 'Main Gauche (Forte)'}</li>
            <li style="margin-bottom: 4px;"><strong>e</strong> : ${isPt ? 'Mão Esquerda (Fraca)' : 'Main Gauche (Faible)'}</li>
            <li style="margin-bottom: 4px;"><strong>C</strong> : ${isPt ? 'Estalo' : 'Éclat'}</li>
            <li style="margin-bottom: 4px;"><strong>X</strong> : ${isPt ? 'Aro / Madeira' : 'Cerclage / Bois'}</li>
            <li style="margin-bottom: 4px;"><strong>R / r</strong> : ${isPt ? 'Rufada' : 'Rufada (Roulement)'}</li>
            <li style="margin-bottom: 4px;"><strong>F</strong> : ${isPt ? 'Flam' : 'Fla'}</li>
            <li style="margin-bottom: 4px;"><strong>I</strong> : Bacalhau</li>
            <li style="margin-bottom: 4px;"><strong>B</strong> : Barulho</li>
          </ul>
        </div>
        <div style="width: 45%; margin-bottom: 15px;">
          <h3 style="font-size: 16px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">Gonguê, Agbê, Mineiro</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0; font-size: 14px;">
            <li style="margin-bottom: 4px;"><strong>Gonguê</strong> : D/d (Grave), E/e (Agudo), X (Borda)</li>
            <li style="margin-bottom: 4px;"><strong>Agbê</strong> : D/d, E/e, S (Saut/Salto), V (Volta)</li>
            <li style="margin-bottom: 4px;"><strong>Mineiro</strong> : P/p (Empurrar/Pousser), T/t (Tirer), L (Lado)</li>
          </ul>
        </div>
      </div>
      <h3 style="font-size: 16px; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">${subtitleStructure}</h3>
      <ul style="list-style-type: none; padding-left: 0; font-size: 14px;">
        <li style="margin-bottom: 8px;"><strong>||: &nbsp; &nbsp; :||</strong> : ${repeatDesc}</li>
        <li style="margin-bottom: 8px;"><strong>[1ª VEZ] (${isPt ? 'Entrada de Bloco' : 'Entrée de Bloc'})</strong> : ${pickupDesc}</li>
        <li style="margin-bottom: 8px;"><strong>[M] / [E] (${isPt ? 'Mestre 100% / Escravo 45%' : 'Maître 100% / Esclave 45%'})</strong> : ${masterSlaveDesc}</li>
        <li style="margin-bottom: 8px;"><strong>${isPt ? 'Prancha de Mini-Rodas (A4 Eco-Tinta)' : 'Planche de Mini-Rodas (A4 Éco-Encre)'}</strong> : ${rodaSheetDesc}</li>
      </ul>
      ${renderHandwritingGuideHTML(lang as any)}
    </div>
  `;
};

import { printViaInvisibleIframe } from '../print/printIframeHelper';

export const printLegendOnly = (): void => {
  const lang = useSequencerStore.getState().lang || 'fr';
  const htmlContent = generateLegendHTML(false, lang);
  const title = lang === 'fr' ? 'Légende des Tablatures' : 'Legenda das Tablaturas';
  const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>body { margin: 0; padding: 20px; font-family: sans-serif; background: white; color: black; }
    @media print { @page { size: portrait; margin: 1cm; } body { padding: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    </style></head><body>${htmlContent}</body></html>`;
  printViaInvisibleIframe(fullHtml, title);
};
