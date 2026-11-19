import React from 'react';
import DOMPurify from 'dompurify';
import { MessageSquare } from 'lucide-react';
import { XiloLightning } from '../../XiloIcons';
import { ShortcutsPanoramaSection } from './ShortcutsPanoramaSection';

interface ShortcutsGeneralInfoProps {
  t: (key: string) => string;
  lang: string;
}

export const ShortcutsGeneralInfo: React.FC<ShortcutsGeneralInfoProps> = ({ t, lang }) => {
  const isFr = lang === 'fr';
  return (
    <>
      <ShortcutsPanoramaSection lang={lang} />

      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            {isFr ? 'Pistes Liées (Maître/Esclave) & Variations 1ª VEZ / %' : 'Faixas Vinculadas (Mestre/Escravo) & Variações 1ª VEZ / %'}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[10px] text-[var(--cordel-text)] leading-relaxed flex flex-col gap-1.5">
          <p>
            <strong>{isFr ? 'Opacité différentielle :' : 'Opacidade diferencial :'}</strong>{' '}
            {isFr
              ? "Sur une piste esclave liée à un Maître (ex. Meião/Repique liés à Marcante, ou Tarol lié à Caixa), un pas au fond atténué (~42 %) avec lettre nette indique qu'il hérite du motif Maître. Un tampon 100 % opaque signale une variation propre de l'esclave."
              : 'Em uma faixa escrava vinculada a um Mestre, um passo com fundo suave (~42 %) e letra nítida indica herança do Mestre. Um bloco 100 % opaco destaca uma variação própria da faixa.'}
          </p>
          <p>
            <strong>1ª VEZ &amp; % :</strong>{' '}
            {isFr
              ? 'La variation marquée 1ª VEZ est jouée prioritairement à chaque entrée dans un nouveau bloc contigu du motif. Sur les mesures suivantes du bloc où le dé est actif, le moteur tire au sort les variations selon leur probabilité (%).'
              : 'A variação marcada como 1ª VEZ toca prioritariamente a cada entrada em um novo bloco contínuo do padrão. Nos compassos seguintes com o dado ativo, o motor sorteia as variações conforme sua probabilidade (%).'}
          </p>
        </div>
      </details>

      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            {isFr ? 'Balayage Roda (Progressif / Mesure) & Planche A4 Éco-Encre' : 'Varredura da Roda & Prancha A4 Eco-Tinta'}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[10px] text-[var(--cordel-text)] leading-relaxed flex flex-col gap-1.5">
          <p>
            <strong>{isFr ? '2 Modes de Roda & Navigation quantifiée :' : '2 Modos da Roda & Navegação quantizada :'}</strong>{' '}
            {isFr
              ? 'En mode Progressif, le balai de paille (décalé de 6h) prépare les pas de la mesure suivante dans le sillage de la baguette. En mode Par mesure, la roue bascule au 1er temps (12h). Cliquer sur une autre mesure en lecture arme la transition pour le prochain 12h sans coupure. En Pause ou à l’Arrêt, les flèches ← et → explorent la Roda cran par cran avec le son du pas, le balai +180° et les baguettes Ao Vivo.'
              : 'No modo Progressivo, a vassoura de palha (defasada em 6h) prepara os passos do próximo compasso atrás da baqueta. No modo Por compasso, a roda muda às 12h. Clicar em outro compasso durante a reprodução agenda a transição para as próximas 12h sem corte. Em Pausa ou Stop, as setas ← e → exploram a Roda passo a passo com o som do golpe, a vassoura +180° e as baquetas Ao Vivo.'}
          </p>
          <p>
            <strong>{isFr ? 'Planche de Mini-Rodas A4 :' : 'Prancha de Mini-Rodas A4 :'}</strong>{' '}
            {isFr
              ? 'Dans Tablature / La Presse, imprimez 8 ou 12 Mini-Rodas par feuille A4 sur fond blanc éco-encre, en mode Condensé automatique (M.X–Y ×N) ou via le Panier de mesures à la carte.'
              : 'Em Tablatura / A Prensa, imprima 8 ou 12 Mini-Rodas por folha A4 em fundo branco eco-tinta, no modo Condensado automático (M.X–Y ×N) ou pela Cesta de compassos sob medida.'}
          </p>
        </div>
      </details>

      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            <XiloLightning size={16} className="shrink-0 text-[var(--cordel-gold)] fill-current" />
            {isFr ? 'Tocar Junto & Speed Trainer' : 'Tocar Junto & Treino de Andamento'}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[10px] text-[var(--cordel-text)] leading-relaxed">
          <p>
            {isFr
              ? "Tocar Junto rend votre instrument (ou toute sa famille) muet tout en gardant son guide visuel Ao Vivo actif pour jouer par-dessus le Batuque. Le Speed Trainer démarre après un décompte ralenti puis accélère par paliers (+1, +2, +4 BPM) jusqu'au tempo cible, avant de restaurer les réglages initiaux à l'arrêt."
              : 'Tocar Junto silencia seu instrumento (ou toda a família) mantendo o guia visual Ao Vivo ativo para tocar junto com o Batuque. O Speed Trainer inicia em andamento lento e acelera por patamares (+1, +2, +4 BPM) até o alvo, restaurando tudo ao parar.'}
          </p>
        </div>
      </details>

      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">{t('wavExportTitle')}</span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[10.5px] text-[var(--cordel-text)] leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('wavExportDesc')) }} />
        </div>
      </details>

      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">{t('pwaOfflineTitle')}</span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[10.5px] text-[var(--cordel-text)] leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('pwaOfflineDesc')) }} />
        </div>
      </details>

      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-[var(--cordel-surface-elevated)] transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">{t('feedbackTitle')}</span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-3 border-t border-[var(--cordel-border)]/20 text-center">
          <p className="text-[10px] text-[var(--cordel-text)] leading-relaxed mb-2">{isFr ? 'Une idée, un bug ou un retour ? Venez en discuter sur le forum !' : 'Uma ideia, um bug ou feedback? Venha conversar no fórum!'}</p>
          <button onClick={() => window.open('https://github.com/JulianBiblocq/o-girador/issues', '_blank')} className="bg-[var(--cordel-text)] text-[var(--cordel-bg)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] px-3 py-1.5 text-xs font-bold cordel-border-sm cursor-pointer mx-auto flex items-center gap-1.5 transition-colors">
            <MessageSquare size={13} className="shrink-0" />
            <span>{t('feedbackBtn')}</span>
          </button>
        </div>
      </details>
    </>
  );
};
