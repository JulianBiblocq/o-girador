// @ts-ignore
import { describe, it, expect } from 'vitest';
import { instrumentsConfig } from '../../data';
import { getStrokesForInstrument } from '../../universes/maracatu/strokes';
import { resolveStrokePedagogy } from '../strokePedagogyCatalog';

describe('strokePedagogyCatalog — alignement SSOT complet FR / PT-BR', () => {
  const handednessModes = [false, true];
  const langs: Array<'fr' | 'pt'> = ['fr', 'pt'];

  for (const inst of instrumentsConfig) {
    for (const isLeftHanded of handednessModes) {
      for (const lang of langs) {
        it(`couvre chaque symbole SSOT de "${inst.id}" (lang=${lang}, leftHanded=${isLeftHanded})`, () => {
          const strokes = getStrokesForInstrument(inst.id, inst.type, lang, isLeftHanded);
          expect(strokes.length).toBeGreaterThan(0);

          for (const strokeDef of strokes) {
            // Gonguê n'utilise pas X en Maracatu (retiré définitivement au Volet D)
            if (inst.id === 'gongue' && strokeDef.symbol === 'X') continue;

            const entry = resolveStrokePedagogy(
              inst.id,
              inst.type,
              strokeDef.symbol,
              lang,
              isLeftHanded,
              true
            );

            expect(entry, `Entrée manquante pour ${inst.id}:${strokeDef.symbol} (${lang})`).not.toBeNull();
            expect(entry!.title.trim().length).toBeGreaterThan(3);
            expect(entry!.description.trim().length).toBeGreaterThan(20);
            expect(entry!.title.trim()).not.toBe(strokeDef.symbol);
          }
        });
      }
    }
  }

  it("rejette tout symbole inexistant sur Gonguê (aucun X ni M dans le catalogue)", () => {
    expect(resolveStrokePedagogy('gongue', 'gongue', 'X', 'fr', false)).toBeNull();
    expect(resolveStrokePedagogy('gongue', 'gongue', 'M', 'pt', false)).toBeNull();
  });

  it('adapte les libellés de main en mode gaucher sur Caixa et Alfaia', () => {
    const rimRight = resolveStrokePedagogy('caixa', 'hands', 'A', 'fr', false, false);
    const rimLeftMode = resolveStrokePedagogy('caixa', 'hands', 'A', 'fr', true, false);
    expect(rimRight?.visualSymbol).toBe('A');
    expect(rimRight?.title).toContain('Main Droite');
    expect(rimLeftMode?.visualSymbol).toBe('a');
    expect(rimLeftMode?.title).toContain('Main Gauche');
  });
});
