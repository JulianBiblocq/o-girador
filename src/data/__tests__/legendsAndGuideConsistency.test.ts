// @ts-ignore
import { describe, it, expect } from 'vitest';
import { i18n } from '../../data';
import { getStrokesForRole, ALL_STROKE_LETTERS } from '../../utils/paper/paperPopoverStrokes';
import { DICTIONARY_ITEMS } from '../../utils/paper/paperDictionaryData';
import { PUPITRES_REGISTRY } from '../../utils/paper/paperLegendHelper';
import { renderMasterExampleHTML } from '../../utils/paper/paperLegendMasterExample';
import { renderLegendStrokesHTML } from '../../utils/paper/paperLegendStrokesHtml';
import { generateLegendHTML } from '../../utils/tablature/tablatureLegendHtml';
import { generateLegendTxt } from '../../utils/tablature/tablatureLegendTxt';
import { GUIDE_POLES } from '../guide';
import { PANORAMA_ECOSYSTEM, PANORAMA_TRACKS } from '../guide/pole0Panorama';

const RISKY_UNICODE_OR_EMOJI_RE = /[\u{1D100}-\u{1D1FF}\p{Extended_Pictographic}]/u;

describe('legendsAndGuideConsistency — alignement SSOT intégral & Mode d’Emploi sans placeholder', () => {
  it('verrouille les frappes SSOT de paperPopoverStrokes (zéro F/b/i sur Alfaia, zéro X sur Gonguê/Agbê/Mineiro/Timbal/Apito)', () => {
    for (const alRole of ['al', 'mc', 'me', 'rp']) {
      const cfg = getStrokesForRole(alRole);
      expect(cfg.strong).toEqual(['D', 'E', 'A', 'I', 'C', 'X', 'B']);
      expect(cfg.weak).toEqual(['d', 'e']);
      expect([...cfg.strong, ...cfg.weak]).not.toContain('F');
      expect([...cfg.strong, ...cfg.weak]).not.toContain('b');
      expect([...cfg.strong, ...cfg.weak]).not.toContain('i');
    }

    expect(getStrokesForRole('gg').strong).toEqual(['G', 'A', 'X', 'B']);
    expect(getStrokesForRole('gg').weak).toEqual(['g', 'a']);
    expect(getStrokesForRole('ab').strong).toEqual(['E', 'D', 'S', 'V', 'B']);
    expect(getStrokesForRole('ab').weak).toEqual(['e', 'd']);
    expect(getStrokesForRole('mi').strong).toEqual(['P', 'T', 'L', 'B']);
    expect(getStrokesForRole('mi').weak).toEqual(['p', 't']);
    expect(getStrokesForRole('tb').strong).toEqual(['G', 'A', 'S', 'T', 'D', 'P', 'F', 'V', 'C', 'B']);
    expect(getStrokesForRole('tb').weak).toEqual(['g', 'a', 's', 't', 'd', 'p', 'f', 'v']);
    expect(getStrokesForRole('ap').strong).toEqual(['L', 'C']);
    expect(getStrokesForRole('ap').weak).toEqual(['l']);
    expect(ALL_STROKE_LETTERS).not.toContain('i');
  });

  it('vérifie que le dictionnaire papier et l’exemple maître utilisent les vraies lettres d’Agbê, Mineiro et Timbal', () => {
    const miBase = DICTIONARY_ITEMS.find((d) => d.id === 'base_mineiro')!;
    const tbBase = DICTIONARY_ITEMS.find((d) => d.id === 'base_timbal')!;
    const miValid = new Set([0, ...getStrokesForRole('mi').strong, ...getStrokesForRole('mi').weak]);
    const tbValid = new Set([0, ...getStrokesForRole('tb').strong, ...getStrokesForRole('tb').weak]);
    miBase.patterns.mi?.forEach((s) => expect(miValid.has(s as any)).toBe(true));
    tbBase.patterns.tb?.forEach((s) => expect(tbValid.has(s as any)).toBe(true));

    const masterHtml = renderMasterExampleHTML('fr');
    expect(masterHtml).toContain('E paume / D retour');
  });

  it('aligne toutes les légendes FR / PT (i18n, Papier HTML, Tablature HTML & TXT) sans terme obsolète ni glyphe risqué', () => {
    expect(PUPITRES_REGISTRY.map((p) => p.code)).toEqual(['al', 'cx', 'gg', 'ab', 'mi', 'tb', 'ap', 'td']);

    for (const lang of ['fr', 'pt'] as const) {
      const blobs = [
        JSON.stringify(i18n[lang]),
        renderLegendStrokesHTML(lang),
        generateLegendHTML(false, lang),
        generateLegendTxt(lang),
      ];

      for (const txt of blobs) {
        expect(txt).not.toMatch(/deux cloches|duas campanas|petite campane|grande campane/i);
        expect(txt).not.toMatch(/Bord \/ Corps|Borda \/ Corpo|C4:Vou|legendGongueBord/i);
        expect(RISKY_UNICODE_OR_EMOJI_RE.test(txt)).toBe(false);
      }

      const fullLegendTxt = generateLegendTxt(lang);
      for (const inst of ['ALFAIAS', 'CAIXA', 'GONGUÊ', 'AGBÊ', 'MINEIRO', 'TIMBAL', 'APITO', 'TOADA']) {
        expect(fullLegendTxt).toContain(inst);
      }
      expect(fullLegendTxt).toContain('1ª VEZ');
    }
  });

  it('valide le Mode d’Emploi complet : Panorama Général + 20 fiches FR/PT sans imageSrc ni violation lexicale', () => {
    expect(GUIDE_POLES.map((p) => p.id)).toEqual(['panorama', 'pole-1', 'pole-2', 'pole-3', 'pole-4', 'pole-5']);
    expect(PANORAMA_TRACKS).toHaveLength(2);
    expect(PANORAMA_ECOSYSTEM.map((e) => e.appName)).toEqual([
      'Orquestrador',
      'Organizador & Mostrador',
      'Cantador',
      'Dançador',
    ]);

    const allCards = GUIDE_POLES.filter((p) => p.id !== 'panorama').flatMap((p) => p.cards);
    expect(allCards).toHaveLength(20);

    for (const c of allCards) {
      expect(c.imageSrc).toBeUndefined();
      expect(c.titleFr.length).toBeGreaterThan(10);
      expect(c.titlePt.length).toBeGreaterThan(10);
      expect(c.contextFr.length).toBeGreaterThan(30);
      expect(c.contextPt.length).toBeGreaterThan(30);
      expect(c.stepsFr.length).toBeGreaterThanOrEqual(4);
      expect(c.stepsPt.length).toBeGreaterThanOrEqual(4);
      expect(c.tipFr.length).toBeGreaterThan(20);
      expect(c.tipPt.length).toBeGreaterThan(20);

      const joined = [c.titleFr, c.titlePt, c.goalFr, c.goalPt, c.contextFr, c.contextPt, ...c.stepsFr, ...c.stepsPt, c.tipFr, c.tipPt].join(' ');
      expect(joined).not.toMatch(/\bBateria\b|\bIA\b/i);
      expect(RISKY_UNICODE_OR_EMOJI_RE.test(joined)).toBe(false);
    }
  });
});
