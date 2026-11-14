import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { aantalSheet, catalogus, IN_HUIS_ICOON, legeTabUitleg, toonSchakelaarIcoon, inCatalogus, inDatabank, koppelBronnen, normaliseer, SHEET_ICOON, sheets, sheetThema, voegLosToe, voegPlannerToe, zoekCatalogus, zoekDatabank } from '@/lib/frigoSheets';
import { FrigoItem, voegZelfToe } from '@/lib/frigo';
import { vertaal } from '@/i18n';

const nu = new Date('2026-10-18T10:00:00.000Z');
const naam = (f: FrigoItem[]) => f.map((x) => x.naam);
// WEEK-162: planner-items zijn ingrediënten die de databank kent (databankcode aanwezig).
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
  const tomaat = kendUIt('tomaat');

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
    const los = voegLosToe([], 'tomaat', nu);
    const beide = voegPlannerToe(los, tomaat, nu);
    assert.equal(sheets(beide).planner.length, 1);
    assert.equal(sheets(beide).los.length, 1);
  });
});

describe('planner-frigo en de ingrediëntenlijst (WEEK-162, sinds WEEK-205 één lijst uit de databank)', () => {
  test('elk ingrediënt uit de lijst zit in de databank, ook algemene producten als pasta, kaas en rijst', () => {
    for (const code of ['pasta', 'kaas_geraspt', 'rijst', 'tomaat'] as const) {
      assert.equal(inDatabank(code), true, code);
      assert.equal(voegPlannerToe([], kendUIt(code), nu).length, 1, code);
    }
  });

  test('een oude catalogus-code (kaas, tomaten) telt als zijn databankcode', () => {
    assert.equal(inDatabank('kaas' as never), true);
    assert.equal(inDatabank('tomaten' as never), true);
    assert.equal(inDatabank('bestaat-niet' as never), false);
  });

  test('de zoekfunctie van de planner-frigo is dezelfde als de algemene zoekfunctie', () => {
    assert.ok(zoekDatabank('pasta', 'nl').some((i) => i.code === 'pasta'));
    assert.ok(zoekDatabank('toma', 'nl').some((i) => i.code === 'tomaat'));
    assert.deepEqual(zoekDatabank('gember', 'nl').map((i) => i.code), zoekCatalogus('gember', 'nl').map((i) => i.code));
  });

  test('de algemene zoekfunctie vindt ook ingrediënten die vroeger enkel in de databank zaten', () => {
    assert.ok(zoekCatalogus('shiitake', 'nl').some((i) => i.code === 'shiitake'));
    assert.ok(zoekCatalogus('Ingwer', 'de').some((i) => i.code === 'gember'));
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
  test('een item dat overeenkomt met de ingrediëntenlijst wordt planner-frigo', () => {
    const oud = voegZelfToe([], 'Tomaat', nu, {});
    assert.equal(koppelBronnen(oud)[0].bron, 'planner');
  });
  test('WEEK-205: ook een algemeen product als pasta staat in de databank en wordt planner (voorheen los, WEEK-162)', () => {
    const oud = voegZelfToe([], 'Pasta', nu, {});
    assert.equal(koppelBronnen(oud)[0].bron, 'planner');
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
    f = voegPlannerToe(f, kendUIt('tomaat'), nu);
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
    const f = voegLosToe(voegPlannerToe([], kendUIt('tomaat'), nu), 'los product', nu);
    assert.equal(sheets(f).planner.length, 1);
    assert.equal(sheets(f).los.length, 1);
  });
});

describe('teller per sheet (WEEK-96)', () => {
  test('de tab en de teller tellen dezelfde producten: dubbele regels tellen één keer', () => {
    const nu = new Date('2026-10-19T10:00:00');
    let frigo: FrigoItem[] = [];
    // Zelfde ingrediënt twee keer toegevoegd: twee frigo-items, één product op het scherm.
    frigo = voegPlannerToe(frigo, kendUIt('tomaat'), nu);
    frigo = [...frigo, { ...frigo[0], id: 'dubbel' }];
    assert.equal(sheets(frigo).planner.length, 2);
    assert.equal(aantalSheet(frigo, 'planner'), 1);
  });

  test('de sheets tellen elk enkel hun eigen producten', () => {
    const nu = new Date('2026-10-19T10:00:00');
    let frigo: FrigoItem[] = voegPlannerToe([], kendUIt('tomaat'), nu);
    frigo = voegLosToe(frigo, 'Yoghurt', nu);
    assert.equal(aantalSheet(frigo, 'planner'), 1);
    assert.equal(aantalSheet(frigo, 'los'), 1);
  });

  test('elke sheet heeft een lijnicoontje van Ionicons', () => {
    assert.equal(SHEET_ICOON.planner, 'calendar-outline');
    assert.equal(SHEET_ICOON.los, 'cube-outline');
  });
});

// WEEK-204: wat via de boodschappenlijst uit een recept kwam, blijft in de planner-frigo, ook zonder lokale catalogusnaam.
describe('WEEK-204: koppelBronnen laat lijst- en code-items met rust', () => {
  const uitLijst = (naam: string, code?: string, bron: 'planner' | 'los' = 'planner'): FrigoItem => ({
    id: `lijst:${naam}`,
    naam,
    afdeling: 'overig',
    toegevoegdOp: nu.toISOString(),
    lijstId: `l-${naam}`,
    bron,
    ...(code ? { code } : {}),
  });

  test('een receptingrediënt van de lijst dat niet in de lokale catalogus staat, blijft planner', () => {
    const f = [uitLijst('gember', 'gember'), uitLijst('shiitake', 'shiitake'), uitLijst('lente-ui', 'lente-ui')];
    assert.deepEqual(koppelBronnen(f).map((x) => x.bron), ['planner', 'planner', 'planner']);
  });

  test('een los product van de lijst blijft los, ook als de naam in de catalogus staat', () => {
    const f = [uitLijst('ui', undefined, 'los')];
    assert.equal(koppelBronnen(f)[0].bron, 'los');
  });

  test('een item met code dat eerder verkeerd als los stond, wordt hersteld naar planner', () => {
    const f = [uitLijst('gember', 'gember', 'los'), { ...uitLijst('shiitake', 'shiitake', 'los'), lijstId: undefined }];
    assert.deepEqual(koppelBronnen(f).map((x) => x.bron), ['planner', 'planner']);
  });

  test('een oud lijstitem zonder bron wordt planner (afgeleid van lijstId)', () => {
    const { bron: _weg, ...zonder } = uitLijst('gember', 'gember');
    assert.equal(koppelBronnen([zonder])[0].bron, 'planner');
  });

  test('regressie: vrije items zonder lijst of code worden nog altijd op naam ingedeeld', () => {
    const oud = voegZelfToe(voegZelfToe([], 'Pasta', nu, {}), 'jam van oma', nu, {});
    assert.deepEqual(koppelBronnen(oud).map((x) => x.bron), ['planner', 'los']);
    assert.equal(koppelBronnen(voegZelfToe([], kendUIt('ui').naam, nu, {}))[0].bron, 'planner');
  });
});

// WEEK-205: één ingrediëntenlijst. Oude catalogus-codes in bewaarde gegevens worden bij het inlezen databankcodes.
describe('WEEK-205: oude codes worden bij het inlezen databankcodes', () => {
  test('lijst: een bewaard item met code tomaten krijgt code tomaat', async () => {
    const { leesLijstItem } = await import('@/lib/lijst');
    assert.equal(leesLijstItem({ id: 'x', naam: 'Tomaten', categorie: 'extra', afgevinkt: false, code: 'tomaten' })?.code, 'tomaat');
    assert.equal(leesLijstItem({ id: 'y', naam: 'Gember', categorie: 'extra', afgevinkt: false, code: 'gember' })?.code, 'gember');
  });

  test('frigo: een bewaard item met code look krijgt code knoflook', async () => {
    const { normaliseerFrigo } = await import('@/lib/frigo');
    const [f] = normaliseerFrigo([{ id: 'a', naam: 'look', afdeling: 'groenten-fruit', toegevoegdOp: nu.toISOString(), code: 'look' }]);
    assert.equal(f.code, 'knoflook');
  });

  test('weekplan: een bewaard ingrediënt met code kaas krijgt code kaas_geraspt', async () => {
    const { normaliseerWeekplan } = await import('@/lib/planner/normaliseer');
    const plan = normaliseerWeekplan({
      dagen: [{ dag: 'maandag', recept: { id: 'r', naam: 'Test', soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten: [{ naam: 'kaas', hoeveelheid: 50, eenheid: 'g', code: 'kaas' }] } }],
      kooktijden: [], stijlen: [], taal: 'nl', porties: 2, bron: 'lokaal', gemaaktOp: nu.toISOString(),
    });
    assert.equal(plan?.dagen[0].recept.ingredienten[0].code, 'kaas_geraspt');
  });

  test('eigen recept: een bewaard ingrediënt met code wortelen krijgt code wortel; een onbekende code valt weg', async () => {
    const { normaliseerEigen } = await import('@/lib/eigenrecepten');
    const [r] = normaliseerEigen([{ id: 'e', naam: 'Soep', soort: 'vegetarisch', minuten: 30, stijlen: [], stappen: ['Kook.'], ingredienten: [
      { code: 'wortelen', naam: 'wortelen', hoeveelheid: 2, eenheid: 'stuk' },
      { code: 'bestaat-niet', naam: 'Geheim kruid', hoeveelheid: 5, eenheid: 'g' },
    ] }]);
    assert.equal(r.ingredienten[0].code, 'wortel');
    assert.equal(r.ingredienten[1].code, undefined);
    assert.equal(r.ingredienten[1].naam, 'Geheim kruid');
  });

  test('de ingrediëntenlijst bevat de databank: 285 ingrediënten, elk met naam in vier talen en een afdeling', async () => {
    const { INGREDIENT_CODES, ingredientNaam, afdelingVan, AFDELINGEN } = await import('@/data/ingredienten');
    assert.ok(INGREDIENT_CODES.length >= 285);
    for (const code of INGREDIENT_CODES) {
      for (const taal of ['nl', 'fr', 'de', 'en'] as const) assert.ok(ingredientNaam(code, taal).trim().length > 0, `${code} ${taal}`);
      assert.ok((AFDELINGEN as string[]).includes(afdelingVan(code)), code);
    }
  });
});

describe('lege tab en In huis (WEEK-239)', () => {
  test('WEEK-288: een lege tab toont één korte regel per pagina, zoals de teller', () => {
    assert.equal(legeTabUitleg('lijst'), 'leeg.lijst');
    assert.equal(legeTabUitleg('huis'), 'leeg.huis');
    for (const taal of ['nl', 'fr', 'de', 'en'] as const) {
      for (const k of ['leeg.lijst', 'leeg.huis'] as const) assert.ok(vertaal(taal, k).length <= 32, taal + ' ' + k + ' is kort');
    }
  });
  test('op een smal scherm (320, 375 px) valt het icoon in de schakelaar weg, op een tablet niet', () => {
    assert.equal(toonSchakelaarIcoon(320), false);
    assert.equal(toonSchakelaarIcoon(375), false);
    assert.equal(toonSchakelaarIcoon(768), true);
  });
  test('In huis is een doos, niet meer de sneeuwvlok, en verschilt van het icoon van Andere producten', () => {
    assert.equal(IN_HUIS_ICOON, 'archive-outline');
    assert.notEqual(IN_HUIS_ICOON, SHEET_ICOON.los);
  });
});
