import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AFDELINGEN, afdelingVan, eenheidVan, INGREDIENT_CODES, ingredientNaam, isIngredient } from '@/data/ingredienten';
import { STIJLEN } from '@/data/recept';
import { TESTRECEPTEN } from '@/lib/planner/testrecepten';
import { TALEN } from '@/i18n';

// Vroeger stonden deze tests bij de ingebouwde receptenbank; sinds WEEK-208 gaat het enkel om de ingrediëntenlijst van de databank.
describe('ingrediëntenlijst van de databank (WEEK-205)', () => {
  test('elk ingrediënt heeft een geldige afdeling en een naam in elke taal', () => {
    for (const code of INGREDIENT_CODES) {
      assert.ok(AFDELINGEN.includes(afdelingVan(code)), code);
      for (const taal of TALEN) assert.ok(ingredientNaam(code, taal).trim(), `${code}/${taal}`);
    }
  });

  test('codes zijn uniek en isIngredient herkent enkel bekende codes', () => {
    assert.equal(new Set(INGREDIENT_CODES).size, INGREDIENT_CODES.length);
    assert.equal(isIngredient('spinazie'), true);
    assert.equal(isIngredient('bestaat-niet'), false);
  });

  test('vertaalt namen (namen uit de databank)', () => {
    assert.equal(ingredientNaam('aardappel', 'fr'), 'pomme de terre');
    assert.equal(ingredientNaam('kipfilet', 'en'), 'chicken breast');
  });

  test('elk ingrediënt van de testrecepten staat in de ingrediëntenlijst en heeft een positieve hoeveelheid', () => {
    for (const r of TESTRECEPTEN) {
      assert.ok(r.ingredienten.length >= 3, `${r.id}: te weinig ingrediënten`);
      for (const i of r.ingredienten) {
        assert.ok(isIngredient(i.code), `${r.id}: ${i.code}`);
        assert.ok(i.hoeveelheid > 0, `${r.id}: ${i.code}`);
      }
    }
  });
});

describe('nieuwe ingrediënten van de receptenbatch (WEEK-214)', () => {
  const NIEUW: [string, string, string][] = [
    ['mierikswortel', 'g', 'mierikswortel (pot)'], ['zalm_blik', 'g', 'zalm in blik'], ['ansjovis', 'g', 'ansjovisfilets'],
    ['pindakaas', 'g', 'pindakaas'], ['vegetarische_kipstukjes', 'g', 'vegetarische kipstukjes'], ['snijbonen', 'g', 'snijbonen'],
    ['karwijzaad', 'g', 'karwijzaad'], ['nasigroente', 'g', 'nasigroente'], ['hacheekruiden', 'g', 'hacheekruiden'],
    ['groene_pepersaus', 'ml', 'groene pepersaus'], ['woksaus', 'ml', 'woksaus sesam-soja'], ['beschuit', 'stuk', 'beschuit'],
  ];

  test('staan in de lijst met de juiste eenheid en naam', () => {
    for (const [code, eenheid, naam] of NIEUW) {
      assert.ok(isIngredient(code), code);
      assert.equal(eenheidVan(code), eenheid, code);
      assert.equal(ingredientNaam(code, 'nl'), naam, code);
    }
  });

  test('vis komt in de visafdeling, groente bij de groenten (regressie op afdelingVoorCategorie)', () => {
    assert.equal(afdelingVan('zalm_blik'), afdelingVan('zalm'));
    assert.equal(afdelingVan('snijbonen'), afdelingVan('sperziebonen'));
  });

  test('bestaande ingrediënten blijven bestaan (regressie: enkel toevoegingen)', () => {
    for (const code of ['aardappel', 'kipfilet', 'zalm', 'spinazie', 'maïs', 'zwarte_peper']) assert.ok(isIngredient(code), code);
    assert.ok(INGREDIENT_CODES.length >= 329);
  });
});

describe('stijlen (WEEK-78)', () => {
  test('de verwijderde stijlen licht en comfort bestaan niet meer', () => {
    assert.ok(!STIJLEN.includes('licht' as never) && !STIJLEN.includes('comfort' as never));
    assert.ok(TESTRECEPTEN.every((r) => STIJLEN.includes(r.stijl)), 'elk testrecept heeft een bekende stijl');
  });
});
