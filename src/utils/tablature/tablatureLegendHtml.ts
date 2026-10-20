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
    ? 'Frase introdutória tocada apenas na primeira iteração do loop.'
    : 'Indique une phrase de transition à jouer juste avant d\'entrer dans une variation.';

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
        <li style="margin-bottom: 8px;"><strong>(${isPt ? 'Levada / 1ª vez apenas' : 'Levée / 1ère fois uniquement'})</strong> : ${pickupDesc}</li>
      </ul>
      ${renderHandwritingGuideHTML(lang as any)}
    </div>
  `;
};

export const printLegendOnly = (): void => {
  const lang = useSequencerStore.getState().lang || 'fr';
  const htmlContent = generateLegendHTML(false, lang);
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert(lang === 'fr' ? "Veuillez autoriser l'ouverture des pop-ups pour imprimer la légende." : "Por favor, autorize os pop-ups para imprimir a legenda.");
    return;
  }
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>${lang === 'fr' ? 'Légende des Tablatures' : 'Legenda das Tablaturas'}</title>
    <style>body { margin: 0; padding: 20px; font-family: sans-serif; background: white; color: black; }
    @media print { @page { size: portrait; margin: 1cm; } body { padding: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    </style></head><body>${htmlContent}</body></html>
  `);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 250);
};
