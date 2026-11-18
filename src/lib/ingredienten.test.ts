// WEEK-307 (NOVA-redenen) en WEEK-308 (ingrediënten positief/negatief).
import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { beoordeelIngredient, beoordeelIngredienten, leesbaar, leesIngredienten, leesNovaRedenen, novaRedenTekst } from '@/lib/ingredienten';
import { zoekProduct } from '@/lib/openfoodfacts';

describe('NOVA-redenen (WEEK-307)', () => {
  const markers = {
    '3': [['ingredients', 'en:sugar']],
    '4': [['ingredients', 'en:milk-powder'], ['additives', 'en:e330'], ['categories', 'en:sodas'], ['ingredients', 'en:milk-powder'], ['raar', 'x'], 'kapot'],
  };
  test('enkel de redenen van de eigen groep, zonder dubbels of kapotte regels', () => {
    assert.deepEqual(leesNovaRedenen(markers, 4), [
      { soort: 'ingredient', id: 'en:milk-powder' },
      { soort: 'additief', id: 'en:e330' },
      { soort: 'categorie', id: 'en:sodas' },
    ]);
    assert.deepEqual(leesNovaRedenen(markers, 3), [{ soort: 'ingredient', id: 'en:sugar' }]);
  });
  test('zonder groep of zonder markers: geen redenen', () => {
    assert.deepEqual(leesNovaRedenen(markers, undefined), []);
    assert.deepEqual(leesNovaRedenen(undefined, 4), []);
    assert.deepEqual(leesNovaRedenen(markers, 1), []);
  });
  test('tekst: die van het etiket als we ze kennen, anders leesbaar gemaakt', () => {
    assert.equal(novaRedenTekst({ soort: 'ingredient', id: 'en:milk-powder' }, [{ id: 'en:milk-powder', tekst: 'lait en poudre' }]), 'lait en poudre');
    assert.equal(novaRedenTekst({ soort: 'ingredient', id: 'en:milk-powder' }), 'milk powder');
    assert.equal(leesbaar('fr:lait-ecreme'), 'lait ecreme');
  });
});

describe('ingrediënten lezen (WEEK-308)', () => {
  test('id, etikettekst en vermeld percentage (niet de schatting); kapotte regels vallen weg', () => {
    const lijst = leesIngredienten([
      { id: 'en:sugar', text: 'sucre', percent_estimate: 50 },
      { id: 'en:hazelnut', text: 'noisettes', percent: 13 },
      { id: 'en:cocoa', text: '' },
      null,
      { foo: 1 },
    ]);
    assert.deepEqual(lijst, [
      { id: 'en:sugar', tekst: 'sucre' },
      { id: 'en:hazelnut', tekst: 'noisettes', procent: 13 },
      { id: 'en:cocoa', tekst: 'cocoa' },
    ]);
    assert.deepEqual(leesIngredienten(undefined), []);
  });
  test('liggende streepjes rond allergenen vallen weg (steekproef WEEK-309)', () => {
    assert.equal(leesIngredienten([{ id: 'en:lactose', text: '_lactose_' }])[0].tekst, 'lactose');
  });
});

describe('ingrediënt beoordelen (WEEK-308)', () => {
  const soort = (id: string) => beoordeelIngredient(id).soort;
  test('negatief: suiker, siroop, zout, palmolie, gehard vet, additief', () => {
    for (const id of ['en:sugar', 'en:glucose-syrup', 'en:dextrose', 'en:salt', 'en:palm-oil', 'en:palm-kernel-fat', 'en:hydrogenated-vegetable-oil', 'en:e330', 'en:apple-juice-concentrate'])
      assert.equal(soort(id), 'negatief', id);
  });
  test('positief: groente, fruit, peulvruchten, noten, zaden, volkoren, goede olie', () => {
    for (const id of ['en:tomato', 'en:carrot', 'en:apple', 'en:lentils', 'en:chickpea', 'en:hazelnut', 'en:sunflower-seed', 'en:wholemeal-wheat-flour', 'en:oat-flakes', 'en:extra-virgin-olive-oil', 'en:rapeseed-oil'])
      assert.equal(soort(id), 'positief', id);
  });
  test('neutraal: melk, water, bloem, cacao', () => {
    for (const id of ['en:whole-milk', 'en:water', 'en:wheat-flour', 'en:cocoa', 'en:cream']) assert.equal(soort(id), 'neutraal', id);
  });
  test('negatief gaat voor positief (palmolie in een notenpasta, zoals Nutella)', () => {
    assert.equal(beoordeelIngredient('en:palm-oil').reden, 'palmolie');
  });
  test('NOVA 4-ingrediënt telt als ultrabewerkt; teller', () => {
    const b = beoordeelIngredienten(
      [{ id: 'en:whole-milk', tekst: 'lait entier' }, { id: 'en:milk-powder', tekst: 'lait en poudre' }, { id: 'en:hazelnut', tekst: 'noisettes' }],
      4,
      [{ soort: 'ingredient', id: 'en:milk-powder' }]
    );
    assert.deepEqual(b.lijst.map((i) => i.oordeel.soort), ['neutraal', 'negatief', 'positief']);
    assert.equal(b.lijst[1].oordeel.reden, 'ultrabewerkt');
    assert.deepEqual([b.positief, b.negatief], [1, 1]);
  });
  test('bij een andere NOVA-groep is een marker niet ultrabewerkt (regressie)', () => {
    const b = beoordeelIngredienten([{ id: 'en:milk-powder', tekst: 'x' }], 3, [{ soort: 'ingredient', id: 'en:milk-powder' }]);
    assert.equal(b.lijst[0].oordeel.soort, 'neutraal');
  });
});

describe('zoekProduct leest NOVA-redenen en ingrediënten (WEEK-307/308)', () => {
  const echt = globalThis.fetch;
  afterEach(() => { globalThis.fetch = echt; });
  test('velden gevraagd en ingelezen', async () => {
    let url = '';
    globalThis.fetch = (async (u: string) => {
      url = u;
      return { ok: true, json: async () => ({ status: 1, product: {
        product_name: 'Melk', nova_group: 4, ingredients_text: 'lait, lait en poudre',
        nova_groups_markers: { '4': [['ingredients', 'en:milk-powder']] },
        ingredients: [{ id: 'en:milk', text: 'lait' }, { id: 'en:milk-powder', text: 'lait en poudre' }], nutriments: {},
      } }) };
    }) as unknown as typeof fetch;
    const p = await zoekProduct('1', 'nl');
    assert.ok(url.includes('nova_groups_markers'));
    assert.match(url, /[,=]ingredients(,|$)/);
    assert.deepEqual(p?.novaRedenen, [{ soort: 'ingredient', id: 'en:milk-powder' }]);
    assert.equal(p?.ingredienten?.length, 2);
  });
});
