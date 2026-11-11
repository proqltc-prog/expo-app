import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { wijzigReceptHoeveelheid } from '@/lib/frigo';
import { aantalProducten, frigoItemUitLijst, FrigoItem, frigoSecties, herstel, hoortInFrigo, leesHoeveelheid, leesLosInvoer, leesProduct, MAX_LOS_HOEVEELHEID, normaliseerFrigo, pasFrigoAan, verbruik, verwijderUitFrigo, voegProductToe, voegZelfToe, wijzigLos, zetHoudbaarheid } from '@/lib/frigo';
import { beoordeel, type Product } from '@/lib/openfoodfacts';
import { LijstItem, samenvoegen, vinkAf } from '@/lib/lijst';

const nu = new Date('2026-10-10T18:00:00Z');
const later = new Date('2026-10-11T09:00:00Z');

const item = (id: string, naam: string, extra: Partial<LijstItem> = {}): LijstItem => ({
  id, naam, categorie: 'avondeten', afgevinkt: false, ...extra,
});

const pastaZo = item('recept-zondag-pasta-g', 'pasta', { hoeveelheid: 300, eenheid: 'g', afdeling: 'droge-voeding', recept: { dag: 'zondag', naam: 'Pasta pesto' } });
const pastaMa = item('recept-maandag-pasta-g', 'pasta', { hoeveelheid: 200, eenheid: 'g', afdeling: 'droge-voeding', recept: { dag: 'maandag', naam: 'Pasta tonijn' } });
const ui = item('recept-zondag-ui-stuk', 'ui', { hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit', recept: { dag: 'zondag', naam: 'Pasta pesto' } });
const wcPapier = item('huishouden-wc-papier', 'wc-papier', { categorie: 'huishouden' });
const appels = item('eigen-appels', 'appels', { categorie: 'fruit', afdeling: 'groenten-fruit' });

describe('hoortInFrigo', () => {
  test('voeding wel, huishoudproducten niet', () => {
    assert.ok(hoortInFrigo(pastaZo));
    assert.ok(hoortInFrigo(appels));
    assert.ok(hoortInFrigo(item('extra-1', 'chips', { categorie: 'extra' })));
    assert.ok(!hoortInFrigo(wcPapier));
    assert.ok(!hoortInFrigo(item('x', 'tandpasta', { categorie: 'Huishouden' })), 'oude categorienaam');
  });
});

describe('pasFrigoAan (WEEK-18)', () => {
  test('afvinken zet het product met hoeveelheid, eenheid en afdeling in de frigo', () => {
    const frigo = pasFrigoAan([], [pastaZo], true, nu);
    assert.equal(frigo.length, 1);
    assert.deepEqual(frigo[0], {
      id: `lijst:${pastaZo.id}`,
      naam: 'pasta',
      hoeveelheid: 300,
      eenheid: 'g',
      afdeling: 'droge-voeding',
      toegevoegdOp: nu.toISOString(),
      lijstId: pastaZo.id,
      bron: 'planner',
    });
  });

  test('items houden hun afdeling; zonder afdeling komen ze onder "overig"', () => {
    const frigo = pasFrigoAan([], [appels, item('extra-1', 'chips', { categorie: 'extra' })], true, nu);
    assert.deepEqual(frigo.map((f) => f.afdeling), ['groenten-fruit', 'overig']);
  });

  test('huishoudproducten komen niet in de frigo', () => {
    assert.deepEqual(pasFrigoAan([], [wcPapier], true, nu), []);
  });

  test('een samengestelde regel zet elk onderliggend item apart in de frigo (voor oudste-eerst)', () => {
    const frigo = pasFrigoAan([], [pastaZo, pastaMa], true, nu);
    assert.equal(frigo.length, 2);
    assert.equal(frigo.reduce((s, f) => s + (f.hoeveelheid ?? 0), 0), 500);
  });

  test('items die al afgevinkt waren, komen er niet nog eens bij', () => {
    const lijst = vinkAf([pastaZo, pastaMa], [pastaZo.id], true);
    let frigo = pasFrigoAan([], [lijst[0]].map((i) => ({ ...i, afgevinkt: false })), true, nu);
    // daarna de hele regel afvinken in de weergave per categorie: enkel maandag is nieuw
    frigo = pasFrigoAan(frigo, lijst, true, later);
    assert.equal(frigo.length, 2);
    assert.deepEqual(frigo.map((f) => f.lijstId), [pastaZo.id, pastaMa.id]);
  });

  test('geen dubbel als hetzelfde lijstitem om een of andere reden opnieuw afgevinkt wordt', () => {
    const frigo = pasFrigoAan([], [pastaZo], true, nu);
    assert.equal(pasFrigoAan(frigo, [pastaZo], true, later).length, 1);
  });

  test('vinkje ongedaan maken haalt het product weer uit de frigo', () => {
    const frigo = pasFrigoAan([], [pastaZo, ui], true, nu);
    const gekocht = [pastaZo, ui].map((i) => ({ ...i, afgevinkt: true }));
    const terug = pasFrigoAan(frigo, [gekocht[0]], false, later);
    assert.deepEqual(terug.map((f) => f.naam), ['ui']);
  });

  test('vinkje ongedaan maken laat zelf toegevoegde producten staan', () => {
    const frigo = voegZelfToe(pasFrigoAan([], [pastaZo], true, nu), 'pasta', nu);
    const terug = pasFrigoAan(frigo, [{ ...pastaZo, afgevinkt: true }], false, later);
    assert.equal(terug.length, 1);
    assert.equal(terug[0].lijstId, undefined);
  });

  test('werkt samen met de regels van de lijst', () => {
    const items = [pastaZo, pastaMa, ui];
    const [pasta] = samenvoegen(items, { overCategorieen: true });
    const onderliggend = items.filter((i) => pasta.ids.includes(i.id));
    assert.equal(pasFrigoAan([], onderliggend, !pasta.afgevinkt, nu).length, 2);
  });
});

describe('voegZelfToe', () => {
  test('voegt een product toe met de tijd van nu; lege naam doet niets', () => {
    const frigo = voegZelfToe([], '  eieren ', nu);
    assert.equal(frigo.length, 1);
    assert.equal(frigo[0].naam, 'eieren');
    assert.equal(frigo[0].afdeling, 'overig');
    assert.equal(frigo[0].toegevoegdOp, nu.toISOString());
    assert.deepEqual(voegZelfToe(frigo, '   ', nu), frigo);
  });
  test('twee keer hetzelfde product krijgt verschillende ids', () => {
    const frigo = voegZelfToe(voegZelfToe([], 'melk', nu), 'melk', nu);
    assert.equal(new Set(frigo.map((f) => f.id)).size, 2);
  });
});

describe('frigoSecties', () => {
  const frigo: FrigoItem[] = [
    ...pasFrigoAan([], [pastaMa], true, later),
    ...pasFrigoAan([], [ui, pastaZo, appels], true, nu),
    { id: 'zelf:1', naam: 'Pasta', afdeling: 'droge-voeding', toegevoegdOp: later.toISOString() },
  ];

  test('"overig" (nog niet ingedeeld) bovenaan, daarna de afdelingen in winkelvolgorde (WEEK-181)', () => {
    const secties = frigoSecties([...frigo, { id: 'zelf:2', naam: 'chips', afdeling: 'overig', toegevoegdOp: nu.toISOString() }]);
    assert.deepEqual(secties.map((s) => s.afdeling), ['overig', 'groenten-fruit', 'droge-voeding']);
  });

  test('hetzelfde product met dezelfde eenheid samengeteld, met het oudste tijdstip', () => {
    const droog = frigoSecties(frigo).find((s) => s.afdeling === 'droge-voeding')!;
    const pasta = droog.regels.find((r) => r.eenheid === 'g')!;
    assert.equal(pasta.hoeveelheid, 500);
    assert.equal(pasta.oudsteOp, nu.toISOString());
    assert.equal(pasta.ids.length, 2);
    // zonder eenheid blijft het een aparte regel
    assert.equal(droog.regels.length, 2);
  });

  test('alfabetisch binnen een afdeling; aantalProducten telt de regels', () => {
    const groenten = frigoSecties(frigo).find((s) => s.afdeling === 'groenten-fruit')!;
    assert.deepEqual(groenten.regels.map((r) => r.naam), ['appels', 'ui']);
    assert.equal(aantalProducten(frigo), 4);
    assert.equal(aantalProducten([]), 0);
  });
});

describe('normaliseerFrigo', () => {
  test('leest geldige items en slaat rommel over', () => {
    const ruw = [
      { id: 'a', naam: ' melk ', hoeveelheid: 1000, eenheid: 'ml', afdeling: 'zuivel-eieren', toegevoegdOp: nu.toISOString(), lijstId: 'l1' },
      { id: 'b', naam: 'raar', hoeveelheid: -3, afdeling: 'maan', toegevoegdOp: 'gisteren' },
      { id: 'c', naam: '' },
      { naam: 'zonder id' },
      'tekst',
      null,
    ];
    const frigo = normaliseerFrigo(ruw);
    assert.equal(frigo.length, 2);
    assert.deepEqual(frigo[0], { id: 'a', naam: 'melk', hoeveelheid: 1000, eenheid: 'ml', afdeling: 'zuivel-eieren', toegevoegdOp: nu.toISOString(), lijstId: 'l1' });
    assert.deepEqual(frigo[1], { id: 'b', naam: 'raar', afdeling: 'overig', toegevoegdOp: new Date(0).toISOString() });
  });
  test('geen lijst geeft een lege frigo', () => {
    assert.deepEqual(normaliseerFrigo(null), []);
    assert.deepEqual(normaliseerFrigo({}), []);
  });
});

describe('verbruik (WEEK-19)', () => {
  const f = (id: string, naam: string, hoeveelheid: number | undefined, eenheid: string | undefined, op: string): FrigoItem => ({
    id, naam, afdeling: 'droge-voeding', toegevoegdOp: op, bron: 'planner',
    ...(hoeveelheid !== undefined ? { hoeveelheid } : {}), ...(eenheid ? { eenheid } : {}),
  });
  const OUD = '2026-10-01T10:00:00.000Z';
  const NIEUW = '2026-10-08T10:00:00.000Z';

  test('trekt enkel af wat het recept nodig heeft', () => {
    const { frigo, verbruikt } = verbruik([f('a', 'pasta', 500, 'g', OUD)], [{ naam: 'pasta', hoeveelheid: 300, eenheid: 'g' }]);
    assert.equal(frigo[0].hoeveelheid, 200);
    assert.deepEqual(verbruikt, [f('a', 'pasta', 300, 'g', OUD)]);
  });

  test('de oudste producten gaan eerst op', () => {
    const { frigo } = verbruik([f('nieuw', 'pasta', 500, 'g', NIEUW), f('oud', 'pasta', 200, 'g', OUD)], [{ naam: 'pasta', hoeveelheid: 300, eenheid: 'g' }]);
    assert.deepEqual(frigo.map((x) => [x.id, x.hoeveelheid]), [['nieuw', 400]]);
  });

  test('een product dat helemaal opgaat, verdwijnt uit de frigo', () => {
    const { frigo } = verbruik([f('a', 'ui', 1, 'stuk', OUD)], [{ naam: 'ui', hoeveelheid: 1, eenheid: 'stuk' }]);
    assert.deepEqual(frigo, []);
  });

  test('te weinig in de frigo: alles wat er is gaat op, de rest blijft gewoon ontbreken', () => {
    const { frigo, verbruikt } = verbruik([f('a', 'pasta', 100, 'g', OUD)], [{ naam: 'pasta', hoeveelheid: 300, eenheid: 'g' }]);
    assert.deepEqual(frigo, []);
    assert.equal(verbruikt[0].hoeveelheid, 100);
  });

  test('onbekende hoeveelheid: het oudste passende product gaat er helemaal uit', () => {
    const zelf = f('zelf', 'Pasta', undefined, undefined, OUD);
    const { frigo, verbruikt } = verbruik([zelf, f('b', 'pasta', 500, 'g', NIEUW)], [{ naam: 'pasta', hoeveelheid: 300, eenheid: 'g' }]);
    assert.deepEqual(frigo.map((x) => x.id), ['b']);
    assert.deepEqual(verbruikt, [zelf]);
    // WEEK-160: het recept heeft geen hoeveelheid; een product met gekende hoeveelheid blijft staan (we weten niet wat er nodig is).
    const zonderHoeveelheid = verbruik([f('a', 'look', 3, 'teentje', OUD)], [{ naam: 'look' }]);
    assert.deepEqual(zonderHoeveelheid.frigo.map((x) => x.id), ['a']);
    assert.equal(zonderHoeveelheid.verbruikt.length, 0);
    // Een product zonder hoeveelheid gaat wel helemaal eruit, ook als het recept geen hoeveelheid heeft.
    const zelfZonder = verbruik([f('z', 'look', undefined, undefined, OUD)], [{ naam: 'look' }]);
    assert.deepEqual(zelfZonder.frigo, []);
  });

  test('een andere naam past niet; zonder eenheid past wel; stuk tegen gram past via het stukgewicht (WEEK-161)', () => {
    const frigo = [f('g', 'ui', 300, 'g', OUD), f('ander', 'prei', 1, 'stuk', OUD)];
    // 1 stuk ui = 150 g (het gemiddelde stukgewicht), dus er gaat 150 g af.
    assert.equal(verbruik(frigo, [{ naam: 'ui', hoeveelheid: 1, eenheid: 'stuk' }]).verbruikt[0].hoeveelheid, 150);
    assert.equal(verbruik(frigo, [{ naam: 'UI', hoeveelheid: 50 }]).verbruikt[0].hoeveelheid, 50);
    assert.equal(verbruik([f('x', 'pasta', 500, 'g', OUD)], [{ naam: 'pasta', hoeveelheid: 1, eenheid: 'stuk' }]).verbruikt.length, 0, 'pasta heeft geen stukgewicht');
  });

  test('ingrediÃ«nten die niet in de frigo zitten, veranderen niets', () => {
    const frigo = [f('a', 'pasta', 500, 'g', OUD)];
    const r = verbruik(frigo, [{ naam: 'zalm', hoeveelheid: 200, eenheid: 'g' }]);
    assert.deepEqual(r.frigo, frigo);
    assert.deepEqual(r.verbruikt, []);
  });

  test('de oorspronkelijke frigo wordt niet aangepast', () => {
    const frigo = [f('a', 'pasta', 500, 'g', OUD)];
    verbruik(frigo, [{ naam: 'pasta', hoeveelheid: 300, eenheid: 'g' }]);
    assert.equal(frigo[0].hoeveelheid, 500);
  });

  test('herstel zet precies terug wat verbruikt werd', () => {
    const begin = [f('a', 'pasta', 500, 'g', OUD), f('b', 'ui', 1, 'stuk', OUD), f('c', 'pesto', undefined, undefined, NIEUW)];
    const ingr = [{ naam: 'pasta', hoeveelheid: 300, eenheid: 'g' }, { naam: 'ui', hoeveelheid: 1, eenheid: 'stuk' }, { naam: 'pesto', hoeveelheid: 40, eenheid: 'g' }];
    const { frigo, verbruikt } = verbruik(begin, ingr);
    assert.deepEqual(frigo.map((x) => x.id), ['a']);
    const terug = herstel(frigo, verbruikt);
    assert.deepEqual([...terug].sort((x, y) => x.id.localeCompare(y.id)), begin);
  });

  test('verwijderUitFrigo haalt de gekozen producten weg', () => {
    const frigo = [f('a', 'pasta', 500, 'g', OUD), f('b', 'pasta', 200, 'g', NIEUW), f('c', 'ui', 1, 'stuk', OUD)];
    assert.deepEqual(verwijderUitFrigo(frigo, ['a', 'b']).map((x) => x.id), ['c']);
    assert.deepEqual(verwijderUitFrigo(frigo, []), frigo);
  });
});

describe('zelf toevoegen met details (WEEK-35)', () => {
  test('enkel een naam: afdeling overig', () => {
    const [f] = voegZelfToe([], '  kaas ', nu);
    assert.equal(f.naam, 'kaas');
    assert.equal(f.afdeling, 'overig');
    assert.equal(f.hoeveelheid, undefined);
    assert.equal(f.toegevoegdOp, nu.toISOString());
  });

  test('met details: hoeveelheid, eenheid en afdeling', () => {
    const [f] = voegZelfToe([], 'melk', nu, { hoeveelheid: 1000, eenheid: 'ml', afdeling: 'zuivel-eieren' });
    assert.deepEqual(
      { naam: f.naam, hoeveelheid: f.hoeveelheid, eenheid: f.eenheid, afdeling: f.afdeling },
      { naam: 'melk', hoeveelheid: 1000, eenheid: 'ml', afdeling: 'zuivel-eieren' }
    );
  });

  test('ongeldige details worden genegeerd', () => {
    const [a] = voegZelfToe([], 'x', nu, { hoeveelheid: -2, eenheid: 'g', afdeling: 'onzin' as never });
    assert.equal(a.hoeveelheid, undefined);
    assert.equal(a.eenheid, undefined, 'geen eenheid zonder hoeveelheid');
    assert.equal(a.afdeling, 'overig');
    assert.equal(voegZelfToe([], '   ', nu).length, 0);
  });

  test('blijft geldig na opslaan en inlezen, en telt mee op het frigo-scherm', () => {
    const frigo = voegZelfToe(voegZelfToe([], 'melk', nu, { hoeveelheid: 1000, eenheid: 'ml', afdeling: 'zuivel-eieren' }), 'melk', later, { hoeveelheid: 500, eenheid: 'ml', afdeling: 'zuivel-eieren' });
    assert.deepEqual(normaliseerFrigo(JSON.parse(JSON.stringify(frigo))), frigo);
    assert.notEqual(frigo[0].id, frigo[1].id);
  });

  test('hoeveelheid lezen zoals getypt', () => {
    assert.equal(leesHoeveelheid('250'), 250);
    assert.equal(leesHoeveelheid('1,5'), 1.5);
    assert.equal(leesHoeveelheid(' 2.5 '), 2.5);
    assert.equal(leesHoeveelheid(''), undefined);
    assert.equal(leesHoeveelheid('abc'), undefined);
    assert.equal(leesHoeveelheid('0'), undefined);
    assert.equal(leesHoeveelheid('-3'), undefined);
  });
});

// â”€â”€ Productdetails bij de frigo (WEEK-49) â”€â”€

const yoghurt: Product = {
  barcode: '5410188011234',
  naam: 'Yoghurt natuur',
  merk: 'Merk X',
  nutriscore: 'b',
  nova: 3,
  additieven: ['E330'],
  kcal: 61,
  suikers: 4.7,
  eiwitten: 3.5,
  vet: 3.3,
  zout: 0.1,
  categorieen: ['en:dairies'],
};

describe('voegProductToe (WEEK-49)', () => {
  test('koppelt de details aan het juiste item en laat de rest ongewijzigd', () => {
    const frigo = voegZelfToe(voegZelfToe([], 'melk', nu), 'yoghurt', nu);
    const [melk, yog] = frigo;
    const na = voegProductToe(frigo, yog.id, yoghurt);
    assert.deepEqual(na[1].product, yoghurt);
    assert.equal(na[0].product, undefined, 'ander item krijgt geen details');
    assert.deepEqual(na[0], melk);
  });

  test('onbekend id laat de frigo gelijk, en het origineel wordt nooit aangepast', () => {
    const frigo = voegZelfToe([], 'melk', nu);
    const na = voegProductToe(frigo, 'bestaat-niet', yoghurt);
    assert.deepEqual(na, frigo);
    assert.equal(frigo[0].product, undefined);
  });
});

describe('productdetails bij zelf toevoegen en opslag', () => {
  test('voegZelfToe bewaart meegegeven product', () => {
    const [f] = voegZelfToe([], 'yoghurt', nu, { product: yoghurt });
    assert.deepEqual(f.product, yoghurt);
  });

  test('regressie: zelf toevoegen zonder product heeft geen product-veld', () => {
    const [f] = voegZelfToe([], 'melk', nu, { hoeveelheid: 1, eenheid: 'stuk' });
    assert.equal('product' in f, false);
  });

  test('normaliseerFrigo bewaart een geldig product', () => {
    const [f] = normaliseerFrigo([{ id: 'zelf:1', naam: 'Yoghurt', afdeling: 'zuivel', toegevoegdOp: nu.toISOString(), product: yoghurt }]);
    assert.deepEqual(f.product, yoghurt);
  });

  test('regressie: oude frigo-items zonder product blijven zonder product', () => {
    const [f] = normaliseerFrigo([{ id: 'zelf:1', naam: 'Melk', afdeling: 'zuivel', toegevoegdOp: nu.toISOString() }]);
    assert.equal('product' in f, false);
    assert.equal(f.naam, 'Melk');
  });

  test('ongeldig product wordt weggelaten, het item blijft', () => {
    const [f] = normaliseerFrigo([{ id: 'zelf:1', naam: 'Melk', afdeling: 'zuivel', toegevoegdOp: nu.toISOString(), product: { naam: 'zonder barcode' } }]);
    assert.equal(f.naam, 'Melk');
    assert.equal('product' in f, false);
  });

  test('leesProduct laat ongeldige getallen en lijsten weg', () => {
    const p = leesProduct({ barcode: '1', naam: 'x', kcal: 'veel', suikers: Number.NaN, additieven: ['E1', 3, null], categorieen: 'nee' });
    assert.deepEqual(p, { barcode: '1', naam: 'x', additieven: ['E1'] });
  });

  test('leesProduct bewaart alle voedingswaarden van de scanner, ook verzadigd vet, koolhydraten en vezels (WEEK-220)', () => {
    const ruw = { barcode: '1', naam: 'x', additieven: [], nutriscore: 'e', nova: 4, kcal: 390, vet: 0.5, verzadigd: 0.1, koolhydraten: 92, suikers: 65, vezels: 0, eiwitten: 4, zout: 0.05 };
    assert.deepEqual(leesProduct(ruw), ruw);
  });

  test('regressie: een product uit de frigo geeft dezelfde score als op het scanscherm', () => {
    const ruw: Product = { barcode: '1', naam: 'x', additieven: [], vet: 2, verzadigd: 6, suikers: 1, zout: 0.1, vezels: 7, eiwitten: 10, kcal: 300 };
    assert.deepEqual(beoordeel(leesProduct(ruw)!), beoordeel(ruw));
  });

  test('leesProduct geeft niets voor geen object', () => {
    assert.equal(leesProduct(null), undefined);
    assert.equal(leesProduct('yoghurt'), undefined);
  });
});

describe('productdetails op het frigo-scherm', () => {
  test('een regel met Ã©Ã©n gescand exemplaar draagt de details', () => {
    const [f] = voegZelfToe([], 'yoghurt', nu, { product: yoghurt });
    const [regel] = frigoSecties([f])[0].regels;
    assert.deepEqual(regel.product, yoghurt);
  });

  test('samengetelde regel neemt de details over van het exemplaar dat ze heeft, ook als het niet het eerste is', () => {
    const eerste = voegZelfToe([], 'yoghurt', nu);
    const beide = voegZelfToe(eerste, 'yoghurt', later);
    const metDetails = voegProductToe(beide, beide[1].id, yoghurt);
    const [regel] = frigoSecties(metDetails)[0].regels;
    assert.equal(regel.ids.length, 2);
    assert.deepEqual(regel.product, yoghurt);
  });

  test('regressie: een regel zonder details heeft geen product', () => {
    const [regel] = frigoSecties(voegZelfToe([], 'melk', nu))[0].regels;
    assert.equal(regel.product, undefined);
  });
});

// â”€â”€ Houdbaarheid (WEEK-20) â”€â”€

describe('houdbaarheid op de frigo (WEEK-20)', () => {
  test('zetHoudbaarheid zet de datum op het juiste item en wist ze weer', () => {
    const frigo = voegZelfToe(voegZelfToe([], 'melk', nu), 'yoghurt', nu);
    const [melk, yog] = frigo;
    const met = zetHoudbaarheid(frigo, yog.id, '2026-10-25');
    assert.equal(met[1].houdbaarTot, '2026-10-25');
    assert.equal(met[0].houdbaarTot, undefined, 'ander item ongewijzigd');
    assert.deepEqual(met[0], melk);
    const gewist = zetHoudbaarheid(met, yog.id, undefined);
    assert.equal('houdbaarTot' in gewist[1], false);
  });

  test('onbekend id laat de frigo gelijk', () => {
    const frigo = voegZelfToe([], 'melk', nu);
    assert.deepEqual(zetHoudbaarheid(frigo, 'bestaat-niet', '2026-10-25'), frigo);
  });

  test('regressie: zelf toevoegen zonder datum heeft geen houdbaarTot-veld', () => {
    const [f] = voegZelfToe([], 'melk', nu, { hoeveelheid: 1, eenheid: 'stuk' });
    assert.equal('houdbaarTot' in f, false);
  });

  test('voegZelfToe bewaart een geldige datum en negeert een ongeldige', () => {
    const [geldig] = voegZelfToe([], 'melk', nu, { houdbaarTot: '2026-10-25' });
    const [ongeldig] = voegZelfToe([], 'melk', nu, { houdbaarTot: '31-02-2026' });
    assert.equal(geldig.houdbaarTot, '2026-10-25');
    assert.equal('houdbaarTot' in ongeldig, false);
  });

  test('normaliseerFrigo bewaart een geldige datum en laat een ongeldige weg', () => {
    const [a] = normaliseerFrigo([{ id: 'z:1', naam: 'Melk', afdeling: 'zuivel', toegevoegdOp: nu.toISOString(), houdbaarTot: '2026-10-25' }]);
    const [b] = normaliseerFrigo([{ id: 'z:2', naam: 'Melk', afdeling: 'zuivel', toegevoegdOp: nu.toISOString(), houdbaarTot: 'morgen' }]);
    assert.equal(a.houdbaarTot, '2026-10-25');
    assert.equal('houdbaarTot' in b, false);
  });

  test('een regel toont de vroegste datum van zijn exemplaren', () => {
    const a = zetHoudbaarheid(voegZelfToe([], 'melk', nu), voegZelfToe([], 'melk', nu)[0].id, '2026-11-01');
    const frigo = voegZelfToe(a, 'melk', later);
    const later2 = zetHoudbaarheid(frigo, frigo[1].id, '2026-10-25');
    const [regel] = frigoSecties(later2)[0].regels;
    assert.equal(regel.houdbaarTot, '2026-10-25');
  });

  test('regressie: een regel zonder datum heeft geen houdbaarTot', () => {
    const [regel] = frigoSecties(voegZelfToe([], 'melk', nu))[0].regels;
    assert.equal(regel.houdbaarTot, undefined);
  });
});

describe('los product bewerken (WEEK-181)', () => {
  const nu = new Date('2026-11-02T10:00:00Z');
  const basis: FrigoItem[] = [
    { id: 'a', naam: 'Ui', afdeling: 'overig', toegevoegdOp: nu.toISOString(), bron: 'los', hoeveelheid: 2, eenheid: 'stuk' },
    { id: 'b', naam: 'Ui', afdeling: 'overig', toegevoegdOp: nu.toISOString(), bron: 'los', eenheid: 'stuk' },
    { id: 'c', naam: 'Melk', afdeling: 'overig', toegevoegdOp: nu.toISOString(), bron: 'los' },
  ];

  test('wijzigt afdeling, eenheid en houdbaarheid van alle exemplaren van de regel', () => {
    const na = wijzigLos(basis, ['a', 'b'], { hoeveelheid: 5, eenheid: 'g', afdeling: 'zuivel-eieren', houdbaarTot: '2026-12-01' });
    assert.deepEqual(na.map((f) => [f.id, f.afdeling, f.eenheid, f.houdbaarTot]), [
      ['a', 'zuivel-eieren', 'g', '2026-12-01'],
      ['b', 'zuivel-eieren', 'g', '2026-12-01'],
      ['c', 'overig', undefined, undefined],
    ]);
  });

  test('de hoeveelheid is het totaal van de regel: die staat op het eerste exemplaar', () => {
    const na = wijzigLos(basis, ['a', 'b'], { hoeveelheid: 5, eenheid: 'stuk', afdeling: 'overig', houdbaarTot: undefined });
    assert.equal(na[0].hoeveelheid, 5);
    assert.equal(na[1].hoeveelheid, undefined);
  });

  test('leeg maken van hoeveelheid, eenheid en houdbaarheid', () => {
    const na = wijzigLos(basis, ['a'], { hoeveelheid: undefined, eenheid: undefined, afdeling: 'overig', houdbaarTot: undefined });
    assert.equal(na[0].hoeveelheid, undefined);
    assert.equal(na[0].eenheid, undefined);
    assert.equal(na[0].houdbaarTot, undefined);
  });

  test('de andere producten blijven ongewijzigd', () => {
    const na = wijzigLos(basis, ['a'], { hoeveelheid: 1, eenheid: 'g', afdeling: 'overig', houdbaarTot: undefined });
    assert.deepEqual(na[2], basis[2]);
  });

  test('de invoer: leeg is geldig, een echt getal en een echte datum worden gelezen', () => {
    assert.deepEqual(leesLosInvoer('', ''), { hoeveelheid: undefined, houdbaarTot: undefined });
    assert.deepEqual(leesLosInvoer('2,5', '10-12-2026'), { hoeveelheid: 2.5, houdbaarTot: '2026-12-10' });
  });

  test('een te grote of ongeldige hoeveelheid is een fout (de bug 211.000.100)', () => {
    assert.equal(MAX_LOS_HOEVEELHEID, 9999);
    assert.equal(leesLosInvoer('211000100', '').fout, 'hoeveelheid');
    assert.equal(leesLosInvoer('abc', '').fout, 'hoeveelheid');
    assert.equal(leesLosInvoer('0', '').fout, 'hoeveelheid');
  });

  test('een ongeldige datum is een fout; enkel een datum na het invullen is geldig', () => {
    assert.equal(leesLosInvoer('', '31-02-2026').fout, 'houdbaar');
    assert.equal(leesLosInvoer('', '2026-12-10').fout, 'houdbaar');
  });

  test('binnen een categorie alfabetisch, bij gelijke naam eerst de oudste houdbaarheid', () => {
    const f: FrigoItem[] = [
      { id: '1', naam: 'Yoghurt', afdeling: 'zuivel-eieren', toegevoegdOp: nu.toISOString(), bron: 'los' },
      { id: '2', naam: 'Kaas', afdeling: 'zuivel-eieren', toegevoegdOp: nu.toISOString(), bron: 'los', houdbaarTot: '2026-12-20' },
      { id: '3', naam: 'Kaas', afdeling: 'zuivel-eieren', toegevoegdOp: nu.toISOString(), bron: 'los', houdbaarTot: '2026-11-30', eenheid: 'g' },
    ];
    const [sectie] = frigoSecties(f);
    assert.deepEqual(sectie.regels.map((r) => r.houdbaarTot ?? r.naam), ['2026-11-30', '2026-12-20', 'Yoghurt']);
  });
});

describe('lijst naar frigo bij afvinken (WEEK-182)', () => {
  const nu = new Date('2026-11-02T10:00:00Z');
  test('een afgevinkt recept-ingrediÃ«nt komt in de planner-frigo', () => {
    const f = frigoItemUitLijst({ id: 'r1', naam: 'Ui', categorie: 'avondeten', afgevinkt: true, code: 'ui', recept: { dag: 'maandag', naam: 'Pasta' } }, nu);
    assert.equal(f.bron, 'planner');
  });
  test('een afgevinkt los product komt in de losse producten, niet in de planner-frigo', () => {
    const f = frigoItemUitLijst({ id: 'l1', naam: 'Chips', categorie: 'extra', afgevinkt: true }, nu);
    assert.equal(f.bron, 'los');
  });
  test('een databankproduct zonder recept (uit Recepten gekozen) komt in de planner-frigo', () => {
    const f = frigoItemUitLijst({ id: 'e1', naam: 'Melk', categorie: 'extra', afgevinkt: true, code: 'melk', eenheid: 'ml' }, nu);
    assert.equal(f.bron, 'planner');
  });
});

describe('receptingrediënt in de frigo aanpassen (WEEK-222)', () => {
  const nu = '2026-11-11T10:00:00.000Z';
  const tomaat = (id: string, h?: number): FrigoItem => ({ id, naam: 'tomaat', code: 'tomaat', hoeveelheid: h, eenheid: 'stuk', afdeling: 'groenten-fruit', toegevoegdOp: nu, bron: 'planner', lijstId: 'l-' + id, houdbaarTot: '2026-11-20' });

  test('3 tomaten worden er 6: de hoeveelheid komt op het eerste exemplaar, de rest blijft', () => {
    const uit = wijzigReceptHoeveelheid([tomaat('a', 3)], ['a'], 6);
    assert.deepEqual(uit, [{ ...tomaat('a', 6) }]);
  });

  test('code, categorie, bron, lijstkoppeling, houdbaarheid en eenheid blijven bewaard', () => {
    const [t] = wijzigReceptHoeveelheid([tomaat('a', 3)], ['a'], 5);
    assert.equal(t.code, 'tomaat');
    assert.equal(t.afdeling, 'groenten-fruit');
    assert.equal(t.bron, 'planner');
    assert.equal(t.lijstId, 'l-a');
    assert.equal(t.houdbaarTot, '2026-11-20');
    assert.equal(t.eenheid, 'stuk');
    assert.equal(t.hoeveelheid, 5);
  });

  test('WEEK-241: de eenheid van een ingrediënt is vast en verandert nooit', () => {
    const look: FrigoItem = { id: 'k', naam: 'knoflook', code: 'knoflook', hoeveelheid: 2, eenheid: 'teentje', afdeling: 'groenten-fruit', toegevoegdOp: nu, bron: 'planner' };
    const [k] = wijzigReceptHoeveelheid([look], ['k'], 4);
    assert.equal(k.eenheid, 'teentje');
    assert.equal(k.hoeveelheid, 4);
  });

  test('een regel met twee exemplaren: totaal op het eerste, het tweede zonder hoeveelheid', () => {
    const uit = wijzigReceptHoeveelheid([tomaat('a', 2), tomaat('b', 1)], ['a', 'b'], 6);
    assert.equal(uit[0].hoeveelheid, 6);
    assert.equal(uit[1].hoeveelheid, undefined);
    assert.equal(uit[1].eenheid, 'stuk');
  });

  test('andere producten blijven ongemoeid (regressie)', () => {
    const ander: FrigoItem = { id: 'x', naam: 'ui', hoeveelheid: 2, eenheid: 'stuk', afdeling: 'groenten-fruit', toegevoegdOp: nu, bron: 'planner' };
    const uit = wijzigReceptHoeveelheid([tomaat('a', 3), ander], ['a'], 6);
    assert.deepEqual(uit[1], ander);
  });
});
