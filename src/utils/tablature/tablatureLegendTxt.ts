export const generateLegendTxt = (lang: string = 'fr'): string => {
  if (lang === 'pt') {
    return `
--- LEGENDA OFICIAL DOS INSTRUMENTOS (SEQUENCIADOR) ---

ALFAIAS (Marcante, Meião, Repique)
   D / d : Mão Direita maçaneta (Forte cheio / Fraco de rebote)
   E / e : Mão Esquerda baqueta (Forte / Fraco colocando a pele em vibração antes de D)
   A / a : Abafado — baqueta esquerda cortando a ressonância e desencostando antes do golpe seguinte
   I : Bacalhau (Igarassu — vareta fina e flexível na mão esquerda)
   C : Clique de baquetas batidas no ar
   X : Aro de madeira
   B : Barulho (Rulo contínuo) — Sem Fla na Alfaia

CAIXA & TAROL
   D / d : Mão Direita (Forte / Fraco)
   E / e : Mão Esquerda (Forte / Fraco)
   R / r : Rufada — rulo curto pressionado (Direita / Esquerda)
   F / f : Fla — ataque duplo próximo (Direita / Esquerda)
   A / a : Ataque Pele e Aro / Rimshot perto da borda (Direita / Esquerda)
   C : Clique de baquetas no ar
   X : Aro
   B / b : Barulho (Rulo contínuo da esteira : B -> b -> / -> .)

GONGUÊ (Campana única de ferro forjado)
   G / g : Grave — alto da campana, perto da boca (Forte / Fraco)
   A / a : Agudo — parte baixa perto da base rígida (Forte / Fraco)
   X : Parada / Toque abafado (baqueta presa na campana sem rebote)
   B : Barulho (Rulo contínuo)

AGBÊ
   E / e : Esquerda — cabaça segurada na mão direita indo à esquerda, batida pela palma esquerda
   D / d : Direita — retorno lateral para a direita estalando a malha de contas
   S : Salto (Impulso alto)
   V : Volta (Retorno firme para baixo)
   B : Barulho (Agitação contínua)

MINEIRO
   P / p : Projetar — para frente (Forte / Fraco)
   T / t : Trazer — para trás em direção ao corpo (Forte / Fraco)
   L : Lado (Inclinação lateral diagonal)
   B : Barulho (Agitação contínua)

TIMBAL (Regra: MAIÚSCULA = Mão Direita | minúscula = Mão Esquerda)
   G / g : Grave / Centro (D/E) • A / a : Aberto / Borda (D/E) • S / s : Slap / Estalo (D/E)
   D / d : Ponta de dedos / Fantasma (D/E) • P / p : Preso / Fechado (D/E)
   F / f : Fla aberto (D/E) • V / v : Fla slap (D/E) • C : Palma (Clap) • B : Barulho

APITO & TOADA (Gramática Vocal v2)
   Apito : L / l (Longo contínuo : L -> l -> / -> .) • C (Curto)
   Toada : P (Puxador) • C (Coro) • _ (Sustentação / melisma ligado sem novo ataque) • / (Soldadura) • 0 (Silêncio vocal explícito)

--- ESTRUTURA MUSICAL, RODA & PRANCHAS A4 ---
   ||: ... :|| : Barras de repetição da seção.
   [1ª VEZ] (Entrada de Bloco) : Tocada no 1º compasso de cada novo bloco contínuo do padrão, seguida pelo padrão base ou sorteios (%).
   [M] / [E] (Opacidade Diferencial) : Em faixas Escravas [E] vinculadas ao Mestre [M], passos herdados ficam atenuados (~42–45 %) e variações próprias ficam a 100 %.
   Varredura da Roda : Modo Progressivo (vassoura de palha em 6h preparando M+1) vs Por compasso (troca às 12h).
   Prancha de Mini-Rodas A4 : Impressão eco-tinta de 8 ou 12 rodas por folha (Auto condensado ou Cesta sob medida).
`;
  }
  return `
--- LÉGENDE OFFICIELLE DES INSTRUMENTS (SEQUENCIADOR) ---

ALFAIAS (Marcante, Meião, Repique)
   D / d : Main Droite mailloche (Fort plein / Faible rebond)
   E / e : Main Gauche baguette (Fort / Faible mettant la peau en vibration avant le coup fort D)
   A / a : Étouffé (Abafado) — baguette gauche coupant la résonance puis se décollant avant le coup suivant
   I : Bacalhau (Igarassu — baguette fine et souple fouettée en main gauche)
   C : Clic de baguettes entrechoquées en l'air
   X : Cerclage (Aro)
   B : Barulho (Roulement continu) — Aucun Fla sur Alfaia

CAIXA & TAROL
   D / d : Main Droite (Fort / Faible)
   E / e : Main Gauche (Fort / Faible)
   R / r : Rufada — roulement court pressé (Droite / Gauche)
   F / f : Fla — double attaque rapprochée (Droite / Gauche)
   A / a : Rimshot / Pele e Aro frappé près du bord (Droite / Gauche)
   C : Clic de baguettes en l'air
   X : Cerclage (Aro)
   B / b : Barulho (Roulement continu du timbre : B -> b -> / -> .)

GONGUÊ (Cloche unique en fer forgé)
   G / g : Grave — haut de la cloche, près de la bouche (Fort / Faible)
   A / a : Aigu — bas vers la base rigide de la cloche (Fort / Faible)
   X : Arrêt étouffé / Parada (baguette écrasée et plaquée sans rebond)
   B : Barulho (Roulement continu)

AGBÊ
   E / e : Gauche — calebasse tenue main droite allant vers la gauche, frappée par la paume gauche
   D / d : Droite — retour latéral vers la droite faisant claquer le filet de perles
   S : Salto (Lancer haut)
   V : Volta (Retour franc vers le bas)
   B : Barulho (Secouement continu)

MINEIRO
   P / p : Poussé avant — Projetar (Fort / Faible)
   T / t : Tiré vers soi — Trazer (Fort / Faible)
   L : Latéral — Lado (Bascule diagonale)
   B : Barulho (Secouement continu)

TIMBAL (Règle : MAJUSCULE = Main Droite | minuscule = Main Gauche)
   G / g : Grave / Basse (D/G) • A / a : Ton ouvert / Aberto (D/G) • S / s : Claqué / Slap (D/G)
   D / d : Doigts / Fantôme (D/G) • P / p : Pressé / Fermé (D/G)
   F / f : Fla ouvert (D/G) • V / v : Fla claqué (D/G) • C : Clap (Mains) • B : Barulho

APITO & TOADA (Grammaire Vocale v2)
   Apito : L / l (Long bouclé : L -> l -> / -> .) • C (Court)
   Toada : P (Puxador) • C (Coro) • _ (Tenue / mélisme lié sans ré-attaque) • / (Soudure de durée) • 0 (Silence vocal explicite)

--- STRUCTURE MUSICALE, RODA & PLANCHES A4 ---
   ||: ... :|| : Barres de reprise de la section.
   [1ª VEZ] (Entrée de Bloc) : Jouée à la 1re mesure de chaque nouveau bloc contigu du motif, suivie du motif principal ou des tirages (%).
   [M] / [E] (Opacité Différentielle) : Sur une piste Esclave [E] liée au Maître [M], les pas hérités sont atténués (~42–45 %) et les variations propres à 100 %.
   Balayage Roda : Mode Progressif (balai de paille à 6h préparant M+1) vs Par mesure (bascule à 12h).
   Planche de Mini-Rodas A4 : Impression éco-encre de 8 ou 12 roues par feuille (Auto condensé ou Panier à la carte).
`;
};
