export const generateLegendTxt = (lang: string = 'fr'): string => {
  if (lang === 'pt') {
    return `
--- LEGENDA DOS INSTRUMENTOS ---

ALFAIAS / CAIXA / TAROL
   D : Mão Direita (Forte)
   d : Mão Direita (Fraca)
   E : Mão Esquerda (Forte)
   e : Mão Esquerda (Fraca)
   C : Estalo (Batida das 2 baquetas uma contra a outra)
   X : Aro / Madeira
   R / r : Rufada (Rolamento)
   F : Flam
   I : Iguarassu / Bacalhau
   B : Barulho (Ruído / efeito)

GONGUÊ
   D : Grave (Forte)
   d : Grave (Fraco)
   E : Agudo (Forte)
   e : Agudo (Fraco)
   X : Borda
   B : Barulho

AGBÊ
   D / d : Direita (Forte / Fraca)
   E / e : Esquerda (Forte / Fraca)
   S : Salto / Lançamento
   V : Volta
   B : Barulho (Ruído / efeito)

MINEIRO
   P / p : Empurrar (Forte / Fraco)
   T / t : Puxar (Forte / Fraco)
   L : Lado (Batida de lado)
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
   C : Éclat (Frappe des 2 baguettes l'une contre l'autre)
   X : Cerclage / Bois
   R / r : Rufada (Roulement droit/gauche)
   F : Fla
   I : Iguarassu / Bacalhau
   B : Barulho (Bruit / effet)

GONGUÊ
   D : Grave (Forte)
   d : Grave (Faible)
   E : Aigu (Forte)
   e : Aigu (Faible)
   X : Borda (Bord)
   B : Barulho

AGBÊ
   D / d : Droite (Forte / Faible)
   E / e : Gauche (Forte / Faible)
   S : Salto / Lançamento (Lancer / Saut)
   V : Volta (Retour)
   B : Barulho (Bruit / effet)

MINEIRO
   P / p : Pousser (Forte / Faible)
   T / t : Tirer (Forte / Faible)
   L : Lado (Coup sur le côté)
   B : Barulho (Bruit / effet)

--- STRUCTURE MUSICALE & RODA ---
   ||:  ...  :|| : Barres de reprise. Répéter la section.
   [1ª VEZ] (Entrée de Bloc) : Phrase jouée à la 1ère mesure de chaque nouveau bloc contigu de ce motif (dans l'arrangement ou au 1er tour en boucle simple), puis remplacée par le motif principal.
   [M] / [E] (Maître / Esclave) : Lors d'une variation sur la Roda, la piste Maître [M] reste à 100 % d'opacité et les pistes Esclaves [E] passent à 45 %.
   Planche de Mini-Rodas (A4) : Impression circulaire éco-encre (8 ou 12 rodas/page) avec panier de mesures et variations 1ª VEZ.
`;
};
