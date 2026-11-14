export const generateLegendTxt = (lang: string = 'fr'): string => {
  if (lang === 'pt') {
    return `
--- LEGENDA DOS INSTRUMENTOS ---

ALFAIAS / CAIXA / TAROL
   D : Mão Direita (Forte)
   d : Mão Direita (Fraca)
   E : Mão Esquerda (Forte)
   e : Mão Esquerda (Fraca)
   A / a : Ataque Pele e Aro Direita / Esquerda (Caixa & Tarol) • Abafado Esquerda (Alfaia)
   C : Estalo (Batida das 2 baquetas uma contra a outra)
   X : Aro / Madeira
   R / r : Rufada (Rolamento)
   F / f : Flam
   I : Iguarassu / Bacalhau
   B : Barulho (Ruído / efeito)

GONGUÊ
   G / g : Grave (Forte / Fraco)
   A / a : Agudo (Forte / Fraco)
   X : Borda
   B : Barulho

AGBÊ
   D / d : Direita (Forte / Fraca)
   E / e : Esquerda (Forte / Fraca)
   S : Salto / Lançamento
   V : Volta
   B : Barulho (Ruído / efeito)

MINEIRO
   P / p ↑ : Projetar — Para frente (Forte / Fraco)
   T / t ↓ : Trazer — Para trás (Forte / Fraco)
   L : Lado (Batida lateral)
   B : Barulho (Ruído / efeito)

--- ESTRUTURA MUSICAL E RODA ---
   ||:  ...  :|| : Barras de repetição. Repetir a seção.
   [1ª VEZ] (Entrada de Bloco) : Frase tocada na 1ª medida de cada novo bloco contíguo deste motivo (na linha do tempo ou na 1ª volta em loop simples), depois substituída pelo motivo principal.
   [M] / [E] (Mestre / Escravo) : Nas variações da Roda, a pista Mestra [M] fica 100% visível e as Escravas [E] a 45% de opacidade.
   Prancha de Mini-Rodas (A4) : Impressão circular eco-tinta (8 ou 12 rodas/página) com cesto de medidas e variações 1ª VEZ.
`;
  }
  return `
--- LÉGENDE DES INSTRUMENTS ---

ALFAIAS / CAIXA / TAROL
   D : Main Droite (Forte)
   d : Main Droite (Faible)
   E : Main Gauche (Forte)
   e : Main Gauche (Faible)
   A / a : Attaque Cerclage+Peau Droite / Gauche — Rimshot (Caixa & Tarol) • Étouffé Gauche Abafado (Alfaia)
   C : Éclat (Frappe des 2 baguettes l'une contre l'autre)
   X : Cerclage / Bois
   R / r : Rufada (Roulement droit/gauche)
   F / f : Fla
   I : Iguarassu / Bacalhau
   B : Barulho (Bruit / effet)

GONGUÊ
   G / g : Grave (Fort / Faible)
   A / a : Aigu (Fort / Faible)
   X : Corps / Flanc
   B : Barulho

AGBÊ
   D / d : Droite (Forte / Faible)
   E / e : Gauche (Forte / Faible)
   S : Salto / Lançamento (Lancer / Saut)
   V : Volta (Retour)
   B : Barulho (Bruit / effet)

MINEIRO
   P / p ↑ : Pousser — Avant (Fort / Faible)
   T / t ↓ : Tirer — Vers soi (Fort / Faible)
   L : Lado (Secousse latérale)
   B : Barulho (Bruit / effet)

--- STRUCTURE MUSICALE & RODA ---
   ||:  ...  :|| : Barres de reprise. Répéter la section.
   [1ª VEZ] (Entrée de Bloc) : Phrase jouée à la 1ère mesure de chaque nouveau bloc contigu de ce motif (dans l'arrangement ou au 1er tour en boucle simple), puis remplacée par le motif principal.
   [M] / [E] (Maître / Esclave) : Lors d'une variation sur la Roda, la piste Maître [M] reste à 100 % d'opacité et les pistes Esclaves [E] passent à 45 %.
   Planche de Mini-Rodas (A4) : Impression circulaire éco-encre (8 ou 12 rodas/page) avec panier de mesures et variations 1ª VEZ.
`;
};
