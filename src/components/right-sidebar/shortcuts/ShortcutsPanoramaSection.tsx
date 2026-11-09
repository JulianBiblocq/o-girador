import React from 'react';

interface ShortcutsPanoramaSectionProps {
  lang: string;
}

interface PoleItem {
  num: string;
  titleFr: string;
  titlePt: string;
  descFr: string;
  descPt: string;
}

const PANORAMA_POLES: PoleItem[] = [
  {
    num: '1',
    titleFr: 'Double Vision Circulaire (Roda) & Linéaire (Timeline DAW)',
    titlePt: 'Dupla Visão Circular (Roda) & Linear (Timeline DAW)',
    descFr: 'Bascule instantanée entre la Roda concentrique (balayage Progressif au balai de paille ou Par mesure) et la Timeline multipiste à 3 niveaux de zoom continus.',
    descPt: 'Alternância instantânea entre a Roda concêntrica (varredura Progressiva com vassoura de palha ou Por compasso) e a Timeline multifaixa com 3 níveis de zoom.',
  },
  {
    num: '2',
    titleFr: 'Direction Ao Vivo, Mode Focus & Signes du Mestre',
    titlePt: 'Direção Ao Vivo, Modo Foco & Sinais do Mestre',
    descFr: 'Navigation quantifiée au 1er temps sans coupure audio, médaillon central des sections et signes gestuels, et écoute ciblée (Mon Instrument + Référence).',
    descPt: 'Navegação quantizada no 1º tempo sem corte de áudio, medalhão central de seções e sinais gestuais, e escuta focada (Meu Instrumento + Referência).',
  },
  {
    num: '3',
    titleFr: 'Liaisons Maître / Esclave & Variations Vivantes (1ª VEZ / %)',
    titlePt: 'Vínculos Mestre / Escravo & Variações Vivas (1ª VEZ / %)',
    descFr: 'Opacité différentielle (fond atténué = suit le Maître ; bloc 100 % opaque = variation propre de l’esclave). 1ª VEZ jouée à chaque entrée de bloc contigu, suivie des tirages %.',
    descPt: 'Opacidade diferencial (fundo suave = segue o Mestre ; bloco 100 % opaco = variação própria). 1ª VEZ tocada a cada entrada de bloco contínuo, seguida dos sorteios %.',
  },
  {
    num: '4',
    titleFr: 'Sculpture Sonore (70 %), Lutherie du Baque & Balanço',
    titlePt: 'Escultura Sonora (70 %), Lutheria do Baque & Balanço',
    descFr: 'Vélocité nominale calibrée à 70 % (+3,1 dB de réserve d’accent jusqu’à 100 %), accordage des peaux en demi-tons/Hz et moteur micro-temporel de Balanço.',
    descPt: 'Velocidade nominal calibrada em 70 % (+3,1 dB de margem até 100 %), afinação das peles em semitons/Hz e motor microtemporal de Balanço.',
  },
  {
    num: '5',
    titleFr: 'Console de Mixage & Bus de Pupitres',
    titlePt: 'Mesa de Som & Canais de Bus',
    descFr: 'Tranches par instrument avec contour coloré propre (ex. Tarol bleu lié à Caixa), bus de familles, égaliseur 3 bandes, compresseur, réverbération et écoute Mono.',
    descPt: 'Canais por instrumento com contorno colorido próprio (ex. Tarol azul ligado à Caixa), bus de naipes, EQ de 3 bandas, compressor, reverb e escuta Mono.',
  },
  {
    num: '6',
    titleFr: 'Chant Toada, Anacrouse (Pre-Roll) & Karaoké',
    titlePt: 'Canto Toada, Anacruse (Pré-Roll) & Karaokê',
    descFr: 'Dialogue responsorial Puxador et Coro synchronisé à la syllabe avec gestion des départs en levée vocale avant le premier temps du batuque.',
    descPt: 'Diálogo de pergunta e resposta entre Puxador e Coro sincronizado por sílaba com suporte a levadas vocais em anacruse.',
  },
  {
    num: '7',
    titleFr: 'Édition Papier, Scanner OCR & Planches de Mini-Rodas A4 Éco-Encre',
    titlePt: 'Edição em Papel, Scanner OCR & Pranchas de Mini-Rodas A4 Eco-Tinta',
    descFr: 'Tablature linéaire multi-mesures dynamique, feuilles vierges manuscrites avec import photo OCR, et planches A4 de 8 ou 12 Mini-Rodas (Auto condensé ou Panier à la carte).',
    descPt: 'Partitura linear multicompasso dinâmica, folhas manuscritas com scanner OCR e pranchas A4 de 8 ou 12 Mini-Rodas (Auto condensado ou Cesta sob medida).',
  },
  {
    num: '8',
    titleFr: 'Catalogue Cloud, Brouillons Hors-Ligne & Télécommande Mobile',
    titlePt: 'Catálogo Cloud, Rascunhos Offline & Controle Remoto Móvel',
    descFr: 'Répertoire Cloud public et privé de Nação/groupe, sauvegarde hors-ligne automatique, export audio Cloud Bounce et pilotage de répétition sur smartphone.',
    descPt: 'Repertório Cloud público e privado da Nação/grupo, salvamento offline automático, exportação Cloud Bounce e controle de ensaio pelo celular.',
  },
];

export const ShortcutsPanoramaSection: React.FC<ShortcutsPanoramaSectionProps> = ({ lang }) => {
  const isFr = lang === 'fr';
  return (
    <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1" open>
      <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#8b2a1a] dark:text-[#f59e0b] uppercase tracking-wider font-cactus">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2.2] shrink-0" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span>{isFr ? "Panorama Général des 8 Pôles d'O Girador" : 'Panorama Geral dos 8 Polos do O Girador'}</span>
        </span>
        <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="p-2.5 border-t border-[var(--cordel-border)]/20 flex flex-col gap-2 text-[10px] text-[var(--cordel-text)] leading-snug">
        {PANORAMA_POLES.map((pole) => (
          <div key={pole.num} className="border-l-2 border-[#8b2a1a] dark:border-[#f59e0b] pl-2 py-0.5">
            <div className="font-cactus font-bold uppercase text-[10px] text-[var(--cordel-text)]">
              {pole.num}. {isFr ? pole.titleFr : pole.titlePt}
            </div>
            <p className="text-[9.5px] opacity-85 mt-0.5">{isFr ? pole.descFr : pole.descPt}</p>
          </div>
        ))}
      </div>
    </details>
  );
};
