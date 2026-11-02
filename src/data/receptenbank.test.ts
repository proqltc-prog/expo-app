import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { RECEPTENBANK, STIJLEN } from '@/data/receptenbank';
import { AFDELINGEN, afdelingVan, INGREDIENT_CODES, ingredientNaam, isIngredient } from '@/data/ingredienten';
import { KEUZE_TALEN, TALEN } from '@/i18n';

describe('receptenbank', () => {
  test('ids zijn uniek', () => {
    const ids = RECEPTENBANK.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('elk recept heeft een naam in elke taal, ingrediënten en een kooktijd', () => {
    for (const r of RECEPTENBANK) {
      assert.equal(r.namen.length, KEUZE_TALEN.length, r.id);
      r.namen.forEach((n) => assert.ok(n.trim(), `${r.id}: lege naam`));
      assert.ok(r.ingredienten.length >= 3, `${r.id}: te weinig ingrediënten`);
      assert.ok(r.minuten > 0 && r.minuten <= 240, r.id);
      assert.ok(r.stijlen.length >= 1 && r.stijlen.every((s) => STIJLEN.includes(s)), r.id);
    }
  });

  test('alle ingrediënten bestaan en hebben een positieve hoeveelheid', () => {
    for (const r of RECEPTENBANK) {
      for (const [code, hoeveelheid] of r.ingredienten) {
        assert.ok(isIngredient(code), `${r.id}: ${code}`);
        assert.ok(hoeveelheid > 0, `${r.id}: ${code}`);
      }
    }
  });

  test('genoeg keuze per soort en per stijl om een gevarieerde week te maken', () => {
    for (const soort of ['vlees', 'vegetarisch', 'vis'] as const) {
      assert.ok(RECEPTENBANK.filter((r) => r.soort === soort).length >= 7, soort);
    }
    for (const stijl of STIJLEN) {
      assert.ok(RECEPTENBANK.filter((r) => r.stijlen.includes(stijl)).length >= 3, stijl);
    }
  });

  test('alle kooktijden zijn vertegenwoordigd (snel, gemiddeld, uitgebreid)', () => {
    assert.ok(RECEPTENBANK.some((r) => r.minuten <= 20));
    assert.ok(RECEPTENBANK.some((r) => r.minuten > 20 && r.minuten <= 40));
    assert.ok(RECEPTENBANK.some((r) => r.minuten > 40));
  });
});

describe('ingrediënten', () => {
  test('elk ingrediënt heeft een geldige afdeling en een naam in elke taal', () => {
    for (const code of INGREDIENT_CODES) {
      assert.ok(AFDELINGEN.includes(afdelingVan(code)), code);
      for (const taal of TALEN) assert.ok(ingredientNaam(code, taal).trim(), `${code}/${taal}`);
    }
  });

  test('elk ingrediënt wordt in minstens één recept gebruikt', () => {
    const gebruikt = new Set(RECEPTENBANK.flatMap((r) => r.ingredienten.map(([c]) => c)));
    for (const code of INGREDIENT_CODES) assert.ok(gebruikt.has(code), code);
  });

  test('vertaalt namen', () => {
    assert.equal(ingredientNaam('aardappelen', 'fr'), 'pommes de terre');
    assert.equal(ingredientNaam('kipfilet', 'en'), 'chicken breast');
  });
});

describe('stijlen zonder licht en comfort (WEEK-78)', () => {
  test('geen recept gebruikt de verwijderde stijlen licht of comfort', () => {
    for (const r of RECEPTENBANK) {
      assert.ok(!r.stijlen.includes('licht' as never) && !r.stijlen.includes('comfort' as never), r.id);
    }
  });

  test('de vijf recepten die enkel licht of comfort hadden, hebben nu een stijl', () => {
    for (const id of ['mac-kaas', 'havermout-fruit', 'yoghurt-muesli', 'avocado-ei', 'tonijnsalade']) {
      const r = RECEPTENBANK.find((x) => x.id === id);
      assert.ok(r && r.stijlen.length >= 1, id);
    }
  });
});
