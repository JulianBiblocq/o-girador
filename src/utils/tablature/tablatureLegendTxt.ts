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

--- ESTRUTURA MUSICAL ---
   ||:  ...  :|| : Barras de repetição. Repetir a seção.
   (Levada / 1ª vez apenas) : Frase introdutória tocada apenas na primeira iteração do loop.
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

--- STRUCTURE MUSICALE ---
   ||:  ...  :|| : Barres de reprise. Répéter la section.
   (Levée / 1ère fois uniquement) : Phrase d'introduction jouée uniquement à la première itération du loop.
`;
};
