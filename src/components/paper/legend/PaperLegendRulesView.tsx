/**
 * Vue 2 : Règles d'écriture des carreaux, variations, conducteur et Toada v2 (< 105 lignes).
 */
import React from 'react';

interface Props {
  lang: 'fr' | 'pt';
}

export const PaperLegendRulesView: React.FC<Props> = ({ lang }) => {
  const isFr = lang === 'fr';

  const cellRules = [
    { code: '[   ]', label: isFr ? 'Case vide' : 'Casa vazia', desc: isFr ? 'Silence standard (0)' : 'Silêncio padrão (0)' },
    { code: 'D/E', label: isFr ? 'Double coup' : 'Toque duplo', desc: isFr ? 'Pas scindé en 2 (Ra : D/E, d/I)' : 'Passo dividido em 2 (Rá : D/E, d/I)' },
    { code: '||', label: isFr ? 'Double barre' : 'Barra dupla', desc: isFr ? 'Arrêt net (fin de phrase)' : 'Fim e corte imediato' },
    { code: '...', label: isFr ? 'Trois points' : 'Três pontos', desc: isFr ? 'Reste de mesure silencieux' : 'Resto do compasso em silêncio' },
    { code: '↳', label: isFr ? 'Sous-ligne var.' : 'Sublinha var.', desc: isFr ? 'Vide = hérite du maître │ - = silence forcé' : 'Vazio = herda │ - = silêncio forçado' },
    { code: '6 / 3', label: isFr ? 'Subdivision' : 'Subdivisão', desc: isFr ? '6 = sextolet │ 3 = triolet │ 4 = doubles' : '6 = sextina │ 3 = tercina │ 4 = semi' },
  ];

  const conductorRules = [
    { code: 'x4', label: isFr ? 'Multiplicateur' : 'Multiplicador', desc: isFr ? 'Répète 4 mesures (ex: Luanda x4)' : 'Repete 4 compassos' },
    { code: '||: ... :||', label: isFr ? 'Reprise' : 'Repetição', desc: isFr ? 'Répète le bloc délimité x2' : 'Repete o bloco x2' },
    { code: '[1. / [2.', label: 'Volta', desc: isFr ? 'Boîtes 1re et 2e fois' : 'Caixas 1ª e 2ª volta' },
    { code: 'Coda', label: 'Coda & D.C.', desc: isFr ? 'To Coda saute au bloc final │ D.S. / D.C.' : 'To Coda salta para Coda final' },
    { code: '+Var', label: isFr ? 'Dé variation' : 'Dado variação', desc: isFr ? 'Active tirage % │ (v2) force v2' : 'Sorteio % │ (v2) fixa v2' },
    { code: 'P/C _ / 0', label: 'Toada v2', desc: isFr ? 'P/C rôles │ _ lié │ / soudure │ 0 silence │ + levée' : 'P/C vozes │ _ ligado │ / soldadura │ 0 pausa' },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 text-[var(--cordel-text)]">
      <div className="flex flex-col gap-1.5">
        <h4 className="font-cactus font-bold text-xs uppercase text-[var(--cordel-accent-readable)] m-0 border-b border-[var(--cordel-border)] pb-0.5">
          {isFr ? '1. Conventions des Carreaux & Variations (↳)' : '1. Convenções de Casas & Variações (↳)'}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {cellRules.map((r, i) => (
            <div key={i} className="flex items-center gap-2 p-1.5 bg-[var(--cordel-surface)] border border-[var(--cordel-border-strong)] shadow-[1px_1px_0px_var(--cordel-shadow-color)]">
              <span className="w-16 py-0.5 bg-[var(--cordel-bg)] border border-[var(--cordel-border-strong)] font-mono font-black text-center text-[var(--cordel-accent-readable)] text-[11px] shrink-0">
                {r.code}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[10px] text-[var(--cordel-text)] uppercase truncate">{r.label}</span>
                <span className="text-[9.5px] text-[var(--cordel-text-muted)] truncate">{r.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h4 className="font-cactus font-bold text-xs uppercase text-[var(--cordel-accent-readable)] m-0 border-b border-[var(--cordel-border)] pb-0.5">
          {isFr ? '2. Syntaxe du Conducteur & Toada (Grammaire v2)' : '2. Sintaxe do Condutor & Toada (Gramática v2)'}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {conductorRules.map((r, i) => (
            <div key={i} className="flex items-center gap-2 p-1.5 bg-[var(--cordel-surface)] border border-[var(--cordel-border-strong)] shadow-[1px_1px_0px_var(--cordel-shadow-color)]">
              <span className="w-16 py-0.5 bg-[var(--cordel-bg)] border border-[var(--cordel-border-strong)] font-mono font-black text-center text-[var(--cordel-accent-readable)] text-[10.5px] shrink-0">
                {r.code}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[10px] text-[var(--cordel-text)] uppercase truncate">{r.label}</span>
                <span className="text-[9.5px] text-[var(--cordel-text-muted)] truncate">{r.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-2.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-wood)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
        <div className="font-cactus font-bold text-xs uppercase text-[var(--cordel-accent-readable)] mb-1">
          {isFr ? 'Les 5 Règles d’Or du Scan Papier' : 'As 5 Regras de Ouro do Scan Papel'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[9.5px] text-[var(--cordel-text)] leading-tight">
          <div>• <strong>{isFr ? '1. Barres de temps :' : '1. Barras de tempo :'}</strong> {isFr ? 'Tracer les' : 'Traçar os'} <code>|</code> {isFr ? 'plus longues en haut/bas.' : 'mais longos acima e abaixo.'}</div>
          <div>• <strong>{isFr ? '2. Double barre du "I" :' : '2. Barra dupla do "I" :'}</strong> {isFr ? 'Deux barres horizontales sur le' : 'Duas barras horizontais no'} <code>I</code> (Bacalhau).</div>
          <div>• <strong>{isFr ? '3. Traversée du "t" :' : '3. Cruzamento do "t" :'}</strong> {isFr ? 'Bien croiser la barre horizontale du' : 'Cruzar bem a barra horizontal do'} <code>t</code> (Mineiro).</div>
          <div>• <strong>{isFr ? '4. Fermeture :' : '4. Fechamento :'}</strong> {isFr ? 'Toujours borner la fin de motif par' : 'Sempre delimitar o fim do padrão com'} <code>|</code> {isFr ? 'ou' : 'ou'} <code>||</code>.</div>
          <div className="sm:col-span-2">• <strong>{isFr ? '5. Doubles coups :' : '5. Toques duplos :'}</strong> {isFr ? 'Écrire' : 'Escrever'} <code>d/I</code> {isFr ? 'ou' : 'ou'} <code>D/E</code> {isFr ? 'avec un slash (pas de | dans un carreau).' : 'com barra inclinada (sem | dentro da casa).'}</div>
        </div>
      </div>

      <div className="p-2.5 bg-[var(--cordel-surface-elevated)] border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
        <div className="font-cactus font-bold text-xs uppercase text-[var(--cordel-accent-readable)] mb-1">
          {isFr ? '3. Détection Automatique des Signatures & Subdivisions' : '3. Detecção Automática de Compasso & Subdivisões'}
        </div>
        <p className="text-[10px] text-[var(--cordel-text)] leading-snug m-0">
          {isFr
            ? "L'application déduit la signature et les subdivisions en comptant les carreaux entre les barres | et || : 4×4 = 4/4 (16p), 8×4 = 2 mes. 4/4 (32p), 2×4 = 2/4 (8p), 3×4 = 3/4 (12p), 4×3 = 12/8 (12p), 4×6 = 24p (sextolets), 6+6+4+4 = 20p (mixte)."
            : 'O aplicativo deduz o compasso e as subdivisões contando as casas entre as barras | e || : 4×4 = 4/4 (16p), 8×4 = 2 comp. 4/4 (32p), 2×4 = 2/4 (8p), 3×4 = 3/4 (12p), 4×3 = 12/8 (12p), 4×6 = 24p (sextinas), 6+6+4+4 = 20p (misto).'}
        </p>
      </div>
    </div>
  );
};
