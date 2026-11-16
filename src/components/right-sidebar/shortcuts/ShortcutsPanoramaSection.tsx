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
    titleFr: 'Roda 360° & Vue Pistes (100 % Lecture + Popover)',
    titlePt: 'Roda 360° & Visão Pistas (100 % Leitura + Popover)',
    descFr: 'Balayage Progressif (balai de paille à 6h) ou Par mesure (12h), clic pédagogique d’écoute isolée sur chaque pas et Timeline multipiste à 3 zooms.',
    descPt: 'Varredura Progressiva (vassoura em 6h) ou Por compasso (12h), clique pedagógico de escuta isolada em cada passo e Timeline multifaixa com 3 zooms.',
  },
  {
    num: '2',
    titleFr: 'Éditeur Détail Plein Écran, Plages & MIDI Learn',
    titlePt: 'Editor Detalhado em Tela Cheia, Trechos & MIDI Learn',
    descFr: 'Peinture clic gauche glissé, gomme clic droit glissé (1 Undo), Ciseau [a, b], sélection de plage Ctrl+C/X/V/D, sculpture dynamique et pads MIDI USB.',
    descPt: 'Pintura com arrasto esquerdo, borracha com arrasto direito (1 Undo), Tesoura [a, b], seleção Ctrl+C/X/V/D, escultura dinâmica e pads MIDI USB.',
  },
  {
    num: '3',
    titleFr: 'Liaisons Maître / Esclave & Règle 1ª VEZ / %',
    titlePt: 'Vínculos Mestre / Escravo & Regra 1ª VEZ / %',
    descFr: 'Opacité différentielle (pas hérité ~42 % vs variation propre 100 %). Variation 1ª VEZ jouée à chaque entrée de bloc contigu, suivie des tirages %.',
    descPt: 'Opacidade diferencial (passo herdado ~42 % vs variação própria 100 %). 1ª VEZ tocada a cada entrada de bloco contínuo, seguida dos sorteios %.',
  },
  {
    num: '4',
    titleFr: 'Lutherie 48 kHz, Balanço, Mixeur & Poste 2 ÉCRANS',
    titlePt: 'Lutheria 48 kHz, Balanço, Mixador & Estação 2 TELAS',
    descFr: 'Accordage des fûts (diapason referencePitchHz), Balanço organique, Bus de pupitres, écoute Mono et Fenêtre Satellite sur 2e moniteur.',
    descPt: 'Afinação das peles (referencePitchHz), Balanço orgânico, Canais de Bus, escuta Mono e Janela Satélite no 2º monitor.',
  },
  {
    num: '5',
    titleFr: 'Toada (Grammaire v2), Anacrouse & Pont Cantador',
    titlePt: 'Toada (Gramática v2), Anacruse & Ponte Cantador',
    descFr: 'Dialogue Puxador (P) / Coro (C), tenues liées (_), soudures (/), silences explicites (0), levée Pre-Roll, karaoké et échange direct avec Cantador.',
    descPt: 'Diálogo Puxador (P) / Coro (C), sustentações ligadas (_), soldaduras (/), silêncios (0), Pré-Roll em anacruse, karaokê e ponte com Cantador.',
  },
  {
    num: '6',
    titleFr: 'Tocar Junto, Speed Trainer & Signaux du Mestre',
    titlePt: 'Tocar Junto, Speed Trainer & Sinais do Mestre',
    descFr: 'Coupure ciblée de son pupitre pour jouer par-dessus le Batuque, accélération par paliers BPM et gestes du Mestre détourés au centre de la Roda.',
    descPt: 'Silenciamento do próprio naipe para tocar junto com o Batuque, aceleração por patamares de BPM e sinais do Mestre no centro da Roda.',
  },
  {
    num: '7',
    titleFr: 'La Presse A4 Éco-Encre, Mini-Rodas & Scan Papier',
    titlePt: 'A Prensa A4 Eco-Tinta, Mini-Rodas & Scan em Papel',
    descFr: 'Partitions linéaires dynamiques, planches A4 de 8 ou 12 Mini-Rodas sur fond blanc éco-encre et détection optique de feuilles manuscrites.',
    descPt: 'Partituras lineares dinâmicas, pranchas A4 de 8 ou 12 Mini-Rodas em fundo branco eco-tinta e detecção óptica de folhas manuscritas.',
  },
  {
    num: '8',
    titleFr: 'Sauvegarde 100 % Cloud & Écosystème O Girador',
    titlePt: 'Salvamento 100 % em Nuvem & Ecossistema O Girador',
    descFr: 'Catalogue Cloud sans fichier local, brouillons hors-ligne PWA et passerelles vers Orquestrador, Organizador, Cantador et Dançador.',
    descPt: 'Catálogo em Nuvem sem arquivos locais, rascunhos offline PWA e pontes com Orquestrador, Organizador, Cantador e Dançador.',
  },
];

export const ShortcutsPanoramaSection: React.FC<ShortcutsPanoramaSectionProps> = ({ lang }) => {
  const isFr = lang === 'fr';
  return (
    <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1" open>
      <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wider font-cactus">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2.2] shrink-0" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <span>{isFr ? 'Panorama Général — Sequenciador & O Girador' : 'Panorama Geral — Sequenciador & O Girador'}</span>
        </span>
        <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="p-2.5 border-t border-[var(--cordel-border)]/20 flex flex-col gap-2 text-[10px] text-[var(--cordel-text)] leading-snug">
        {PANORAMA_POLES.map((pole) => (
          <div key={pole.num} className="border-l-2 border-[var(--cordel-wood)] pl-2 py-0.5">
            <div className="font-cactus font-bold uppercase text-[10px] text-[var(--cordel-text)]">
              {pole.num}. {isFr ? pole.titleFr : pole.titlePt}
            </div>
            <p className="text-[9.5px] text-[var(--cordel-text-muted)] mt-0.5">{isFr ? pole.descFr : pole.descPt}</p>
          </div>
        ))}
      </div>
    </details>
  );
};
