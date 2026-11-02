import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { aantalSheet, catalogus, inCatalogus, inReceptenbank, koppelBronnen, normaliseer, SHEET_ICOON, sheets, sheetThema, voegLosToe, voegPlannerToe, zoekCatalogus, zoekReceptenbank } from '@/lib/frigoSheets';
import { FrigoItem, voegZelfToe } from '@/lib/frigo';

const nu = new Date('2026-10-18T10:00:00.000Z');
const naam = (f: FrigoItem[]) => f.map((x) => x.naam);
// WEEK-162: planner-items zijn ingrediënten die de receptenbank kent (databankcode aanwezig).
const kendUIt = (code: string) => catalogus('nl').find((i) => i.code === code)!;

describe('normaliseren en zoeken', () => {
  test('accenten en hoofdletters tellen niet mee', () => {
    assert.equal(normaliseer('  Pâtes  Fraîches '), 'pates fraiches');
  });
  test('zoeken in het Frans vindt "pâte" ook als "pates" geschreven wordt', () => {
    assert.ok(zoekCatalogus('pate', 'fr').some((i) => i.naam.toLowerCase().includes('pâtes')));
  });
  test('een leeg zoekveld geeft de hele catalogus, alfabetisch', () => {
    const alles = zoekCatalogus('', 'nl');
    assert.equal(alles.length, catalogus('nl').length);
    const namen = alles.map((i) => i.naam);
    assert.deepEqual(namen, [...namen].sort((a, b) => a.localeCompare(b, 'nl')));
  });
  test('zoeken zonder treffer geeft een lege lijst', () => {
    assert.deepEqual(zoekCatalogus('xyzzy', 'nl'), []);
  });
});

describe('planner-frigo', () => {
  const tomaat = kendUIt('tomaten');

  test('een catalogus-ingrediënt komt in de planner-sheet', () => {
    const f = voegPlannerToe([], tomaat, nu);
    assert.equal(f.length, 1);
    assert.equal(sheets(f).planner.length, 1);
    assert.equal(sheets(f).los.length, 0);
    assert.equal(f[0].afdeling, tomaat.afdeling);
  });

  test('hetzelfde ingrediënt twee keer toevoegen geeft geen dubbele regel', () => {
    const een = voegPlannerToe([], tomaat, nu);
    assert.equal(voegPlannerToe(een, tomaat, nu).length, 1);
  });

  test('een los product met dezelfde naam blokkeert de planner-regel niet', () => {
    const los = voegLosToe([], 'tomaten', nu);
    const beide = voegPlannerToe(los, tomaat, nu);
    assert.equal(sheets(beide).planner.length, 1);
    assert.equal(sheets(beide).los.length, 1);
  });
});

describe('planner-frigo beperkt tot de receptenbank (WEEK-162)', () => {
  test('pasta, kaas en rijst kent de receptenbank niet: ze komen niet in de planner-frigo', () => {
    for (const code of ['pasta', 'kaas', 'rijst']) {
      assert.equal(inReceptenbank(code as never), false, code);
      const frigo: FrigoItem[] = [];
      assert.deepEqual(voegPlannerToe(frigo, kendUIt(code), nu), [], code);
    }
  });

  test('een ingrediënt uit de receptenbank komt er wel in', () => {
    assert.equal(inReceptenbank('tomaten'), true);
    assert.equal(voegPlannerToe([], kendUIt('tomaten'), nu).length, 1);
  });

  test('de zoekfunctie van de planner-frigo toont geen generieke items zonder receptenbank-code', () => {
    const treffers = zoekReceptenbank('pasta', 'nl');
    assert.equal(treffers.some((i) => i.code === 'pasta'), false);
    assert.equal(zoekReceptenbank('kaas', 'nl').some((i) => i.code === 'kaas'), false);
    assert.ok(zoekReceptenbank('tomat', 'nl').length > 0,'gewone receptenbank-ingrediënten blijven zoekbaar');
  });

  test('de algemene zoekfunctie (catalogus) blijft ongewijzigd: losse producten mogen alles', () => {
    assert.ok(zoekCatalogus('pasta', 'nl').some((i) => i.code === 'pasta'));
  });

  test('regressie: een los product "pasta" blijft mogelijk en telt niet mee voor de planner', () => {
    const f = voegLosToe([], 'pasta', nu);
    assert.equal(f[0].bron, 'los');
    assert.equal(sheets(f).planner.length, 0);
  });
});

describe('losse producten', () => {
  test('een losse product komt in de los-sheet en telt niet mee voor de planner', () => {
    const f = voegLosToe([], 'Zelfgemaakte sambal', nu);
    assert.equal(sheets(f).los.length, 1);
    assert.equal(sheets(f).planner.length, 0);
  });
  test('een losse product krijgt bron los, ook als het een catalogus-naam heeft', () => {
    const f = voegLosToe([], 'pasta', nu);
    assert.equal(f[0].bron, 'los');
  });
});

describe('koppelen van bestaande items', () => {
  test('een item dat overeenkomt met de catalogus wordt planner-frigo', () => {
    const oud = voegZelfToe([], 'Tomaten', nu, {});
    assert.equal(koppelBronnen(oud)[0].bron, 'planner');
  });
  test('regressie WEEK-162: een item uit de catalogus zonder receptenbank-code (pasta) wordt los, niet planner', () => {
    const oud = voegZelfToe([], 'Pasta', nu, {});
    assert.equal(koppelBronnen(oud)[0].bron, 'los');
  });
  test('een item in een andere taal van de catalogus koppelt ook', () => {
    assert.ok(inCatalogus('pâtes') !== undefined);
  });
  test('een item dat niet overeenkomt wordt een los product', () => {
    const oud = voegZelfToe([], 'Mijn zelfgemaakte jam', nu, {});
    assert.equal(koppelBronnen(oud)[0].bron, 'los');
  });
  test('koppelen is idempotent', () => {
    const oud = voegZelfToe(voegZelfToe([], 'pasta', nu, {}), 'jam van oma', nu, {});
    const een = koppelBronnen(oud);
    assert.deepEqual(koppelBronnen(een), een);
  });
  test('koppelen verwijdert niets', () => {
    const oud = voegZelfToe(voegZelfToe([], 'pasta', nu, {}), 'jam van oma', nu, {});
    assert.equal(koppelBronnen(oud).length, oud.length);
    assert.deepEqual(naam(koppelBronnen(oud)), naam(oud));
  });
});

describe('niets verdwijnt automatisch (regressie)', () => {
  test('de twee sheets bevatten samen precies de hele frigo', () => {
    let f: FrigoItem[] = [];
    f = voegPlannerToe(f, kendUIt('tomaten'), nu);
    f = voegLosToe(f, 'los product', nu);
    f = voegLosToe(f, 'nog een los product', nu);
    const s = sheets(f);
    assert.equal(s.planner.length + s.los.length, f.length);
  });
});

describe('sheetkleuren (WEEK-75)', () => {
  test('planner-frigo is petrol en losse producten oranje', () => {
    assert.equal(sheetThema('planner').accent, '#0F6B66');
    assert.equal(sheetThema('los').accent, '#E8680F');
  });
  test('de twee sheets hebben verschillende accentkleuren', () => {
    assert.notEqual(sheetThema('planner').accent, sheetThema('los').accent);
  });
  test('elke accentkleur heeft een zachte variant die anders is', () => {
    for (const sheet of ['planner', 'los'] as const) {
      const t = sheetThema(sheet);
      assert.match(t.accent, /^#[0-9A-F]{6}$/);
      assert.match(t.accentZacht, /^#[0-9A-F]{6}$/);
      assert.notEqual(t.accent, t.accentZacht);
    }
  });
  test('regressie: de sheet-indeling blijft gelijk na de kleurwijziging', () => {
    const f = voegLosToe(voegPlannerToe([], kendUIt('tomaten'), nu), 'los product', nu);
    assert.equal(sheets(f).planner.length, 1);
    assert.equal(sheets(f).los.length, 1);
  });
});

describe('teller per sheet (WEEK-96)', () => {
  test('de tab en de teller tellen dezelfde producten: dubbele regels tellen één keer', () => {
    const nu = new Date('2026-10-19T10:00:00');
    let frigo: FrigoItem[] = [];
    // Zelfde ingrediënt twee keer toegevoegd: twee frigo-items, één product op het scherm.
    frigo = voegPlannerToe(frigo, kendUIt('tomaten'), nu);
    frigo = [...frigo, { ...frigo[0], id: 'dubbel' }];
    assert.equal(sheets(frigo).planner.length, 2);
    assert.equal(aantalSheet(frigo, 'planner'), 1);
  });

  test('de sheets tellen elk enkel hun eigen producten', () => {
    const nu = new Date('2026-10-19T10:00:00');
    let frigo: FrigoItem[] = voegPlannerToe([], kendUIt('tomaten'), nu);
    frigo = voegLosToe(frigo, 'Yoghurt', nu);
    assert.equal(aantalSheet(frigo, 'planner'), 1);
    assert.equal(aantalSheet(frigo, 'los'), 1);
  });

  test('elke sheet heeft een lijnicoontje van Ionicons', () => {
    assert.equal(SHEET_ICOON.planner, 'calendar-outline');
    assert.equal(SHEET_ICOON.los, 'cube-outline');
  });
});

// ── WEEK-180: losse producten wijzigen, rubriek Algemeen en sortering ──
import { geldigeLosHoeveelheid, LOS_RUBRIEKEN, losSecties, MAX_LOS_HOEVEELHEID, wijzigLos } from '@/lib/frigoSheets';
import { frigoSecties } from '@/lib/frigo';

const los = (naam: string, extra: Partial<FrigoItem> = {}, id = naam): FrigoItem => ({ id, naam, afdeling: 'overig', toegevoegdOp: '2026-11-01T10:00:00.000Z', bron: 'los', ...extra });

describe('losse producten wijzigen (WEEK-180)', () => {
  test('een nieuw los product (enkel een naam) komt in de rubriek Algemeen (overig)', () => {
    const f = voegLosToe([], 'Test', nu);
    assert.equal(f[0].afdeling, 'overig');
    assert.equal(f[0].hoeveelheid, undefined);
    assert.equal(losSecties(f)[0].afdeling, 'overig');
  });

  test('hoeveelheid, eenheid, rubriek en houdbaarheid worden bewaard', () => {
    const na = wijzigLos([los('Test')], 'Test', { hoeveelheid: 2, eenheid: 'stuk', afdeling: 'diepvries', houdbaarTot: '2026-12-01' });
    assert.deepEqual(
      { h: na[0].hoeveelheid, e: na[0].eenheid, a: na[0].afdeling, d: na[0].houdbaarTot },
      { h: 2, e: 'stuk', a: 'diepvries', d: '2026-12-01' }
    );
  });

  test('zonder hoeveelheid vallen hoeveelheid en eenheid weg; een lege datum wist de houdbaarheid', () => {
    const voor = [los('Kaas', { hoeveelheid: 300, eenheid: 'g', houdbaarTot: '2026-11-10', afdeling: 'zuivel-eieren' })];
    const na = wijzigLos(voor, 'Kaas', { afdeling: 'zuivel-eieren' });
    assert.equal(na[0].hoeveelheid, undefined);
    assert.equal(na[0].eenheid, undefined);
    assert.equal(na[0].houdbaarTot, undefined);
    assert.equal(na[0].afdeling, 'zuivel-eieren');
  });

  test('te grote, nul- of negatieve hoeveelheden worden niet bewaard (geen 211.000.100 meer)', () => {
    assert.equal(geldigeLosHoeveelheid(211000100), false);
    assert.equal(geldigeLosHoeveelheid(0), false);
    assert.equal(geldigeLosHoeveelheid(-1), false);
    assert.equal(geldigeLosHoeveelheid(MAX_LOS_HOEVEELHEID), true);
    assert.equal(wijzigLos([los('Test')], 'Test', { hoeveelheid: 211000100, eenheid: 'stuk', afdeling: 'overig' })[0].hoeveelheid, undefined);
  });

  test('onbekende eenheid wordt stuk, onbekende rubriek wordt Algemeen, ongeldige datum valt weg', () => {
    const na = wijzigLos([los('Test')], 'Test', { hoeveelheid: 1.234, eenheid: 'kg', afdeling: 'onzin' as never, houdbaarTot: '2026-02-31' });
    assert.equal(na[0].hoeveelheid, 1.23);
    assert.equal(na[0].eenheid, 'stuk');
    assert.equal(na[0].afdeling, 'overig');
    assert.equal(na[0].houdbaarTot, undefined);
  });

  test('regressie: planner-producten en andere producten blijven ongewijzigd', () => {
    const planner = los('Ui', { bron: 'planner', hoeveelheid: 3, eenheid: 'stuk', afdeling: 'groenten-fruit' });
    const ander = los('Melk', { hoeveelheid: 1, eenheid: 'ml' });
    const voor = [planner, ander, los('Test')];
    const na = wijzigLos(voor, 'Ui', { hoeveelheid: 9, eenheid: 'g', afdeling: 'diepvries' });
    assert.deepEqual(na, voor);
    const na2 = wijzigLos(voor, 'Test', { hoeveelheid: 2, eenheid: 'stuk', afdeling: 'diepvries' });
    assert.deepEqual(na2[0], planner);
    assert.deepEqual(na2[1], ander);
  });
});

describe('losse producten ordenen (WEEK-180)', () => {
  test('Algemeen staat bovenaan, daarna de winkelafdelingen in winkelvolgorde', () => {
    assert.equal(LOS_RUBRIEKEN[0], 'overig');
    const secties = losSecties([los('Erwten', { afdeling: 'diepvries' }), los('Zeep'), los('Appel', { afdeling: 'groenten-fruit' })]);
    assert.deepEqual(secties.map((s) => s.afdeling), ['overig', 'groenten-fruit', 'diepvries']);
  });

  test('binnen een rubriek alfabetisch, daarna houdbaarheid (oudste datum eerst, zonder datum achteraan)', () => {
    const items = [
      los('yoghurt', {}, 'y1'),
      los('Melk', { houdbaarTot: '2026-11-20' }, 'm1'),
      los('Melk', { houdbaarTot: '2026-11-05' }, 'm2'),
      los('melk', {}, 'm3'),
      los('Appel', {}, 'a1'),
    ];
    assert.deepEqual(losSecties(items)[0].regels.map((r) => r.sleutel), ['a1', 'm2', 'm1', 'm3', 'y1']);
  });

  test('elk los product is een eigen regel met zijn eigen hoeveelheid en houdbaarheid', () => {
    const regels = losSecties([los('Melk', { hoeveelheid: 1, eenheid: 'stuk', houdbaarTot: '2026-11-05' }, 'm1'), los('Melk', { hoeveelheid: 2, eenheid: 'stuk' }, 'm2')])[0].regels;
    assert.equal(regels.length, 2);
    assert.deepEqual(regels.map((r) => [r.ids, r.hoeveelheid, r.houdbaarTot]), [[['m1'], 1, '2026-11-05'], [['m2'], 2, undefined]]);
  });

  test('regressie: de recepten-frigo blijft samentellen per naam, met overig achteraan', () => {
    const p = (naam: string, afdeling: FrigoItem['afdeling'], id: string): FrigoItem => ({ id, naam, afdeling, toegevoegdOp: '2026-11-01T10:00:00.000Z', bron: 'planner', hoeveelheid: 1, eenheid: 'stuk' });
    const secties = frigoSecties([p('Ui', 'overig', '1'), p('Ui', 'overig', '2'), p('Wortel', 'groenten-fruit', '3')]);
    assert.deepEqual(secties.map((s) => s.afdeling), ['groenten-fruit', 'overig']);
    assert.equal(secties[1].regels[0].hoeveelheid, 2);
  });
});
