import { useSequencerStore } from '../../stores/useSequencerStore';
import { renderHandwritingGuideHTML } from '../paper/paperHandwritingGuide';
import { printViaInvisibleIframe } from '../print/printIframeHelper';

export const generateLegendHTML = (forcePageBreak: boolean = true, lang: string = 'fr'): string => {
  const isPt = lang === 'pt';
  const title = isPt ? 'Legenda das Tablaturas — Sequenciador' : 'Légende des Tablatures — Sequenciador';
  const subtitleStructure = isPt ? 'Estrutura Musical, Roda & Opacidade' : 'Structure Musicale, Roda & Opacité';
  const repeatDesc = isPt
    ? 'Barras de repetição indicando que a seção deve ser repetida.'
    : 'Barres de reprise indiquant la répétition de la section.';
  const pickupDesc = isPt
    ? 'Tocada prioritariamente no 1º compasso de cada novo bloco contínuo deste padrão; nos compassos seguintes do bloco, o padrão base ou os sorteios (%) assumem.'
    : 'Jouée prioritairement à la 1re mesure de chaque nouveau bloc contigu de ce motif ; sur les mesures suivantes du bloc, le motif principal ou les tirages (%) prennent le relais.';
  const masterSlaveDesc = isPt
    ? 'Em faixas Escravas [E] vinculadas a um Mestre [M], passos herdados aparecem atenuados (~42–45 %) enquanto variações próprias da escrava destacam-se a 100 % de opacidade.'
    : "Sur une piste Esclave [E] liée à un Maître [M], les pas hérités s'affichent atténués (~42–45 %) tandis que les variations propres de l'esclave ressortent à 100 % d'opacité.";
  const rodaModesDesc = isPt
    ? 'Varredura Progressiva (vassoura de palha defasada em 6h preparando o compasso seguinte) ou Por compasso (troca às 12h), mais Prancha A4 Eco-Tinta de 8 ou 12 Mini-Rodas.'
    : 'Balayage Progressif (balai de paille décalé de 6h préparant la mesure suivante) ou Par mesure (bascule à 12h), et Planche A4 Éco-Encre de 8 ou 12 Mini-Rodas.';

  return `
    <div style="${forcePageBreak ? 'page-break-before: always; ' : ''}font-family: sans-serif; padding-top: 16px; color: black; background: white;">
      <h2 style="font-family: 'Cactus', sans-serif; border-bottom: 2px solid #000; padding-bottom: 8px; font-size: 22px; margin-bottom: 14px;">${title}</h2>
      <div style="display: flex; flex-wrap: wrap; gap: 18px; margin-top: 6px;">
        <div style="width: 47%; margin-bottom: 10px;">
          <h3 style="font-size: 15px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Alfaias, Caixa &amp; Tarol</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0; font-size: 12.5px; line-height: 1.4;">
            <li><strong>D / d</strong> : ${isPt ? 'Mão Direita (Forte / Fraco)' : 'Main Droite (Fort / Faible)'}</li>
            <li><strong>E / e</strong> : ${isPt ? 'Mão Esquerda (e coloca a pele da Alfaia em vibração antes de D)' : 'Main Gauche (sur Alfaia, e met la peau en vibration avant D)'}</li>
            <li><strong>A / a</strong> : ${isPt ? 'Abafado desencostando antes do próximo (Alfaia) • Ataque Pele e Aro / Rimshot perto da borda D/E (Caixa/Tarol)' : 'Étouffé Abafado se décollant avant la suite (Alfaia) • Rimshot / Pele e Aro près du bord D/G (Caixa/Tarol)'}</li>
            <li><strong>I</strong> : ${isPt ? 'Bacalhau Igarassu (Alfaia — sem Fla na Alfaia)' : 'Bacalhau Igarassu (Alfaia — aucun Fla sur Alfaia)'}</li>
            <li><strong>R / r</strong> : ${isPt ? 'Rufada — rulo curto D/E (Caixa/Tarol)' : 'Rufada — roulement court D/G (Caixa/Tarol)'}</li>
            <li><strong>F / f</strong> : ${isPt ? 'Fla D/E (Caixa/Tarol)' : 'Fla D/G (Caixa/Tarol)'}</li>
            <li><strong>C</strong> : ${isPt ? 'Clique de baquetas no ar' : "Clic de baguettes entrechoquées en l'air"}</li>
            <li><strong>X</strong> : ${isPt ? 'Aro' : 'Cerclage (Aro)'}</li>
            <li><strong>B / b</strong> : ${isPt ? 'Barulho contínuo (B -> b -> / -> .)' : 'Barulho continu (B -> b -> / -> .)'}</li>
          </ul>
        </div>
        <div style="width: 47%; margin-bottom: 10px;">
          <h3 style="font-size: 15px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Gonguê, Agbê, Mineiro, Timbal, Apito &amp; Toada</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0; font-size: 12.5px; line-height: 1.4;">
            <li><strong>Gonguê</strong> (${isPt ? 'campana única de ferro forjado' : 'cloche unique en fer forgé'}) : ${isPt ? 'G/g (Grave — topo perto da boca), A/a (Agudo — base rígida), X (Parada / Toque abafado), B (Barulho)' : 'G/g (Grave — haut près de la bouche), A/a (Aigu — bas vers la base), X (Arrêt étouffé / Parada), B (Barulho)'}</li>
            <li><strong>Agbê</strong> : ${isPt ? 'E/e (cabaça na mão D indo à E, palma E), D/d (retorno para D), S (Salto), V (Volta), B (Barulho)' : 'E/e (calebasse main D vers G, paume G), D/d (retour vers D), S (Salto), V (Volta), B (Barulho)'}</li>
            <li><strong>Mineiro</strong> : ${isPt ? 'P/p (Projetar frente), T/t (Trazer trás), L (Lado), B (Barulho)' : 'P/p (Poussé avant), T/t (Tiré vers soi), L (Latéral), B (Barulho)'}</li>
            <li><strong>Timbal</strong> (${isPt ? 'MAI=Direita / min=Esquerda' : 'MAJ=Droite / min=Gauche'}) : ${isPt ? 'G/g (Grave), A/a (Aberto), S/s (Slap), T/t (Tapa aberto), D/d (Dedos), P/p (Preso), F/f, V/v, C (Palma), B (Barulho)' : 'G/g (Grave), A/a (Aberto), S/s (Slap), T/t (Slap ouvert), D/d (Doigts), P/p (Pressé), F/f, V/v, C (Clap), B (Barulho)'}</li>
            <li><strong>Apito</strong> : ${isPt ? 'L/l (Longo contínuo : L -> l -> / -> .), C (Curto)' : 'L/l (Long bouclé : L -> l -> / -> .), C (Court)'}</li>
            <li><strong>Toada (v2)</strong> : ${isPt ? 'P (Puxador), C (Coro), _ (melisma ligado), / (soldadura), 0 (silêncio vocal explícito)' : 'P (Puxador), C (Coro), _ (mélisme lié), / (soudure), 0 (silence vocal explicite)'}</li>
          </ul>
        </div>
      </div>
      <h3 style="font-size: 15px; margin-top: 12px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">${subtitleStructure}</h3>
      <ul style="list-style-type: none; padding-left: 0; margin: 0; font-size: 12.5px; line-height: 1.4;">
        <li style="margin-bottom: 4px;"><strong>||: &nbsp; &nbsp; :||</strong> : ${repeatDesc}</li>
        <li style="margin-bottom: 4px;"><strong>[1ª VEZ] (${isPt ? 'Entrada de Bloco Contínuo' : 'Entrée de Bloc Contigu'})</strong> : ${pickupDesc}</li>
        <li style="margin-bottom: 4px;"><strong>[M] / [E] (${isPt ? 'Opacidade Diferencial' : 'Opacité Différentielle'})</strong> : ${masterSlaveDesc}</li>
        <li style="margin-bottom: 4px;"><strong>${isPt ? 'Varredura da Roda & Prancha A4' : 'Balayage Roda & Planche A4'}</strong> : ${rodaModesDesc}</li>
      </ul>
      ${renderHandwritingGuideHTML(lang as 'fr' | 'pt')}
    </div>
  `;
};

export const printLegendOnly = (): void => {
  const lang = useSequencerStore.getState().lang || 'fr';
  const htmlContent = generateLegendHTML(false, lang);
  const title = lang === 'fr' ? 'Légende des Tablatures — Sequenciador' : 'Legenda das Tablaturas — Sequenciador';
  const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>body { margin: 0; padding: 20px; font-family: sans-serif; background: white; color: black; }
    @media print { @page { size: portrait; margin: 1cm; } body { padding: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    </style></head><body>${htmlContent}</body></html>`;
  printViaInvisibleIframe(fullHtml, title);
};
