// WEEK-302 t/m 306: historiek, vergelijken, delen, allergenen en gezonder alternatief bij de scanner.
import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Product } from '@/lib/openfoodfacts';
import { alternatiefUrl, leesAlternatieven, productLink, specifiekeCategorie, zoekProduct, zoektAlternatief } from '@/lib/openfoodfacts';
import { allergeenCodes, allergeenNaam, allergenenStatus } from '@/lib/allergenen';
import { leesHistoriek, MAX_HISTORIEK, voegToeAanHistoriek, wisselKeuze } from '@/lib/scanHistoriek';
import { telWinst, vergelijk } from '@/lib/vergelijk';
import { deelTekst } from '@/lib/scanDelen';

const product = (barcode: string, extra: Partial<Product> = {}): Product => ({
  barcode, naam: `Product ${barcode}`, additieven: [], ingredientenBekend: true, allergenen: [], sporen: [], ...extra,
});

describe('allergenen (WEEK-305)', () => {
  test('zet tags van Open Food Facts om naar EU-codes, in vaste volgorde, zonder dubbels of andere tags', () => {
    assert.deepEqual(allergeenCodes(['en:milk', 'en:gluten', 'fr:truc', 'en:milk', 'en:none', 3]), ['gluten', 'milk']);
    assert.deepEqual(allergeenCodes(undefined), []);
  });

  test('namen in de taal van het toestel', () => {
    assert.equal(allergeenNaam('nuts', 'nl'), 'noten');
    assert.equal(allergeenNaam('nuts', 'fr'), 'fruits à coque');
    assert.equal(allergeenNaam('sesame-seeds', 'de'), 'Sesamsamen');
  });

  test('bevat, met sporen apart (een allergeen in beide staat enkel bij bevat)', () => {
    const s = allergenenStatus(product('1', { allergenen: ['milk'], sporen: ['nuts', 'milk'] }));
    assert.deepEqual(s, { soort: 'bevat', bevat: ['milk'], sporen: ['nuts'] });
  });

  test('geen allergenen met een ingrediëntenlijst: "geen"; zonder lijst: niet gekend', () => {
    assert.equal(allergenenStatus(product('1')).soort, 'geen');
    assert.equal(allergenenStatus(product('1', { ingredientenBekend: false })).soort, 'onbekend');
  });

  test('oud bewaard product zonder allergeneninfo: niet gekend (regressie, geen "geen allergenen")', () => {
    const oud: Product = { barcode: '1', naam: 'oud', additieven: [], ingredientenBekend: true };
    assert.equal(allergenenStatus(oud).soort, 'onbekend');
  });
});

describe('zoekProduct leest allergenen en sporen (WEEK-305)', () => {
  const echt = globalThis.fetch;
  afterEach(() => { globalThis.fetch = echt; });

  test('vraagt allergens_tags en traces_tags op en zet ze om', async () => {
    let gevraagd = '';
    globalThis.fetch = (async (url: string) => {
      gevraagd = url;
      return { ok: true, json: async () => ({ status: 1, product: { product_name: 'Koekjes', allergens_tags: ['en:gluten', 'en:eggs'], traces_tags: ['en:nuts'], ingredients_text: 'bloem, ei', nutriments: {} } }) };
    }) as unknown as typeof fetch;
    const p = await zoekProduct('123', 'nl');
    assert.ok(gevraagd.includes('allergens_tags') && gevraagd.includes('traces_tags'));
    assert.deepEqual(p?.allergenen, ['gluten', 'eggs']);
    assert.deepEqual(p?.sporen, ['nuts']);
    assert.equal(p?.naam, 'Koekjes', 'de rest blijft werken (regressie)');
  });
});

describe('historiek (WEEK-302)', () => {
  const nu = new Date('2026-11-15T10:00:00Z');
  test('nieuwste bovenaan, zonder dubbels', () => {
    let h = voegToeAanHistoriek([], product('a'), nu);
    h = voegToeAanHistoriek(h, product('b'), nu);
    h = voegToeAanHistoriek(h, product('a', { naam: 'nieuwer' }), nu);
    assert.deepEqual(h.map((x) => x.product.barcode), ['a', 'b']);
    assert.equal(h[0].product.naam, 'nieuwer');
    assert.equal(h[0].gescandOp, nu.toISOString());
  });

  test(`hoogstens ${MAX_HISTORIEK} producten`, () => {
    let h = voegToeAanHistoriek([], product('0'), nu);
    for (let i = 1; i <= MAX_HISTORIEK + 5; i++) h = voegToeAanHistoriek(h, product(String(i)), nu);
    assert.equal(h.length, MAX_HISTORIEK);
    assert.equal(h[0].product.barcode, String(MAX_HISTORIEK + 5));
  });

  test('kapotte bewaarde gegevens vallen weg', () => {
    assert.deepEqual(leesHistoriek(null), []);
    assert.deepEqual(leesHistoriek('x'), []);
    const goed = { product: product('a'), gescandOp: nu.toISOString() };
    assert.deepEqual(leesHistoriek([goed, { product: {} }, null, { gescandOp: 'x' }]), [goed]);
  });

  test('kiezen voor vergelijken: aan/uit en hoogstens twee', () => {
    assert.deepEqual(wisselKeuze([], 'a'), ['a']);
    assert.deepEqual(wisselKeuze(['a'], 'a'), []);
    assert.deepEqual(wisselKeuze(['a', 'b'], 'c'), ['b', 'c']);
  });
});

describe('vergelijken (WEEK-303)', () => {
  const a = product('a', { nutriscore: 'b', nova: 4, kcal: 100, suikers: 5, vezels: 3, eiwitten: 2, additieven: ['E330'], allergenen: ['milk'] });
  const b = product('b', { nutriscore: 'd', nova: 1, kcal: 100, suikers: 10, vezels: 1, eiwitten: 6, additieven: [] });

  test('per regel het beste product; gelijk of onbekend: geen winnaar', () => {
    const r = Object.fromEntries(vergelijk(a, b).map((x) => [x.sleutel, x.beste]));
    assert.equal(r.nutriscore, 'a');
    assert.equal(r.nova, 'b');
    assert.equal(r.kcal, null, 'gelijk');
    assert.equal(r.suikers, 'a');
    assert.equal(r.vezels, 'a', 'meer vezels is beter');
    assert.equal(r.eiwitten, 'b', 'meer eiwitten is beter');
    assert.equal(r.zout, null, 'niet gekend');
    assert.equal(r.additieven, 'b');
    assert.equal(r.allergenen, null, 'allergenen enkel ter info');
  });

  test('additieven zonder ingrediëntenlijst zijn niet gekend, niet 0', () => {
    const zonder = product('c', { ingredientenBekend: false });
    const rij = vergelijk(a, zonder).find((x) => x.sleutel === 'additieven')!;
    assert.equal(rij.b, undefined);
    assert.equal(rij.beste, null);
  });

  test('telWinst', () => {
    assert.deepEqual(telWinst(vergelijk(a, b)), { a: 3, b: 3 });
  });
});

describe('delen (WEEK-304)', () => {
  test('naam, scores, additieven, allergenen en de link naar Open Food Facts', () => {
    const tekst = deelTekst(product('5449000000996', { merk: 'Cola', naam: 'Zero', nutriscore: 'b', nova: 4, additieven: ['E150D'], allergenen: ['milk'] }), 'nl');
    assert.match(tekst, /^Cola – Zero/);
    assert.match(tekst, /Nutri-Score: B/);
    assert.match(tekst, /NOVA: 4/);
    assert.match(tekst, /Additieven: E150D/);
    assert.match(tekst, /Allergenen: melk/);
    assert.ok(tekst.includes(productLink('5449000000996')));
  });

  test('onbekende gegevens: "niet gekend" en geen regels die we niet weten', () => {
    const tekst = deelTekst(product('1', { ingredientenBekend: false }), 'fr');
    assert.match(tekst, /Nutri-Score : inconnu/);
    assert.doesNotMatch(tekst, /Additifs|Allergènes/);
  });
});

describe('gezonder alternatief (WEEK-306)', () => {
  const cola = product('1', { nutriscore: 'e', categorieen: ['en:beverages', 'en:sodas', 'en:colas', 'pt:bebidas'] });

  test('enkel bij een gekende C, D of E en een gekende categorie', () => {
    assert.equal(zoektAlternatief(cola), true);
    assert.equal(zoektAlternatief({ ...cola, nutriscore: 'b' }), false);
    assert.equal(zoektAlternatief({ ...cola, nutriscore: undefined }), false);
    assert.equal(zoektAlternatief({ ...cola, categorieen: [] }), false);
  });

  test('de meest specifieke Engelse categorie', () => {
    assert.equal(specifiekeCategorie(cola.categorieen), 'en:colas');
  });

  test('zoekvraag: zelfde categorie, België, enkel betere Nutri-Scores', () => {
    const q = decodeURIComponent(alternatiefUrl({ ...cola, nutriscore: 'c' })!);
    assert.ok(q.includes('categories_tags:"en:colas"'));
    assert.ok(q.includes('nutrition_grades:(a OR b)'));
    assert.ok(q.includes('countries_tags:"en:belgium"'));
  });

  test('leest het antwoord: zonder naam, niet beter of hetzelfde product valt weg; hoogstens 3', () => {
    const hits = [
      { code: '1', product_name: 'zelfde', nutrition_grades: 'a' },
      { code: '2', product_name: 'Cola zero', brands: ['Merk'], nutrition_grades: 'b' },
      { code: '3', product_name: '', nutrition_grades: 'a' },
      { code: '4', product_name: 'even slecht', nutrition_grades: 'e' },
      { code: '5', product_name: 'Water', nutrition_grades: 'a' },
      { code: '2', product_name: 'dubbel', nutrition_grades: 'b' },
      { code: '6', product_name: 'Thee', nutrition_grades: 'a' },
      { code: '7', product_name: 'Te veel', nutrition_grades: 'a' },
    ];
    const alt = leesAlternatieven({ hits }, cola);
    assert.deepEqual(alt.map((a) => a.barcode), ['2', '5', '6']);
    assert.deepEqual(alt[0], { barcode: '2', naam: 'Cola zero', merk: 'Merk', nutriscore: 'b' });
    assert.deepEqual(leesAlternatieven({ fout: true }, cola), []);
  });
});
