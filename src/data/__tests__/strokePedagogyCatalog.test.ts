// @ts-ignore
import { describe, it, expect } from 'vitest';
import { instrumentsConfig } from '../../data';
import { getStrokePairs, getStrokesForInstrument } from '../../universes/maracatu/strokes';
import { resolveStrokePedagogy } from '../strokePedagogyCatalog';

describe('strokePedagogyCatalog — textes officiels Mestre FR / PT-BR & mode gaucher', () => {
  const handednessModes = [false, true];
  const langs: Array<'fr' | 'pt'> = ['fr', 'pt'];

  for (const inst of instrumentsConfig) {
    for (const isLeftHanded of handednessModes) {
      for (const lang of langs) {
        it(`couvre chaque symbole SSOT de "${inst.id}" (lang=${lang}, leftHanded=${isLeftHanded})`, () => {
          const strokes = getStrokesForInstrument(inst.id, inst.type, lang, isLeftHanded);
          expect(strokes.length).toBeGreaterThan(0);

          for (const strokeDef of strokes) {
            const entry = resolveStrokePedagogy(inst.id, inst.type, strokeDef.symbol, lang, isLeftHanded, true);
            expect(entry, `Entrée manquante pour ${inst.id}:${strokeDef.symbol} (${lang})`).not.toBeNull();
            expect(entry!.title.trim().length).toBeGreaterThanOrEqual(3);
            expect(entry!.description.trim().length).toBeGreaterThanOrEqual(18);
            expect(entry!.title.trim()).not.toBe(strokeDef.symbol);
          }
        });
      }
    }
  }

  it("décrit le Gonguê comme une cloche unique (Haut / Base / Arrêt étouffé X) sans jamais mentionner deux cloches ni M", () => {
    const gongueDefs = getStrokesForInstrument('gongue', 'gongue', 'fr', false).map((s) => s.symbol);
    const gonguePairIds = getStrokePairs('gongue', 'gongue', 'fr', false).map((p) => p.id);
    expect(gongueDefs).toEqual(['G', 'g', 'A', 'a', 'X', 'B', 'b', '/', '.']);
    expect(gonguePairIds).toEqual(['G', 'A', 'X', 'B']);

    const gFr = resolveStrokePedagogy('gongue', 'gongue', 'G', 'fr', false)!;
    const aFr = resolveStrokePedagogy('gongue', 'gongue', 'A', 'fr', false)!;
    const xFr = resolveStrokePedagogy('gongue', 'gongue', 'X', 'fr', false)!;
    const gPt = resolveStrokePedagogy('gongue', 'gongue', 'G', 'pt', false)!;
    const aPt = resolveStrokePedagogy('gongue', 'gongue', 'A', 'pt', false)!;
    const xPt = resolveStrokePedagogy('gongue', 'gongue', 'X', 'pt', false)!;
    expect(gFr.title).toContain('Haut de la cloche');
    expect(aFr.title).toContain('Base de la cloche');
    expect(xFr.title).toContain('Arrêt étouffé');
    expect(gPt.title).toContain('Topo da campana');
    expect(aPt.title).toContain('Base da campana');
    expect(xPt.title).toContain('Parada');
    for (const e of [gFr, aFr, xFr, gPt, aPt, xPt]) {
      expect(e.description).not.toMatch(/petite campane|grande campane|campana maior|campana menor/i);
    }
    expect(resolveStrokePedagogy('gongue', 'gongue', 'M', 'pt', false)).toBeNull();
  });

  it("inverse Droite <-> Gauche / Direita <-> Esquerda dans les titres ET les corps explicatifs en mode gaucher", () => {
    const rimRight = resolveStrokePedagogy('caixa', 'hands', 'A', 'fr', false, false)!;
    const rimLeft = resolveStrokePedagogy('caixa', 'hands', 'A', 'fr', true, false)!;
    expect(rimRight.visualSymbol).toBe('A');
    expect(rimRight.title).toContain('Droite');
    expect(rimLeft.visualSymbol).toBe('a');
    expect(rimLeft.title).toContain('Gauche');

    const alfaiaEFrLeft = resolveStrokePedagogy('marcante', 'hands', 'e', 'fr', true, false)!;
    const alfaiaEPtLeft = resolveStrokePedagogy('marcante', 'hands', 'e', 'pt', true, false)!;
    expect(alfaiaEFrLeft.title).toBe('Main droite (Coup faible)');
    expect(alfaiaEFrLeft.description).toContain('baguette droite');
    expect(alfaiaEFrLeft.description).toContain('main gauche');
    expect(alfaiaEPtLeft.title).toBe('Mão direita (Golpe fraco)');
    expect(alfaiaEPtLeft.description).toContain('baqueta direita');
    expect(alfaiaEPtLeft.description).toContain('mão esquerda');

    const alfaiaAbafLeft = resolveStrokePedagogy('marcante', 'hands', 'A', 'fr', true, false)!;
    const alfaiaBacLeft = resolveStrokePedagogy('repique', 'hands', 'I', 'pt', true, false)!;
    expect(alfaiaAbafLeft.description).toContain('Baguette droite');
    expect(alfaiaBacLeft.description).toContain('mão direita');

    const agbeEFrLeft = resolveStrokePedagogy('agbe', 'shaker', 'E', 'fr', true, false)!;
    const agbeEPtLeft = resolveStrokePedagogy('agbe', 'shaker', 'E', 'pt', true, false)!;
    expect(agbeEFrLeft.title).toBe('Droite (Fort)');
    expect(agbeEFrLeft.description).toContain('tenue par le col dans la main gauche, va vers la droite et la main droite la frappe de la paume');
    expect(agbeEPtLeft.title).toBe('Direita (Forte)');
    expect(agbeEPtLeft.description).toContain('segurada pelo pescoço na mão esquerda, vai para a direita e a mão direita bate nela com a palma');

    const timbalGLeft = resolveStrokePedagogy('timbal', 'hands', 'G', 'fr', true, false)!;
    const timbalgLeft = resolveStrokePedagogy('timbal', 'hands', 'g', 'pt', true, false)!;
    expect(timbalGLeft.title).toContain('Gauche G');
    expect(timbalgLeft.title).toContain('Direita g');
  });
});
