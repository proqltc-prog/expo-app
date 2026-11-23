// WEEK-329: betere herkenning bij het inlezen: richtwaarden voor klont, takje, sneetje en samengestelde woorden.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { koppelIngredient, ontleedRegel, verwerkRecept } from './receptLink';

const lees = (regels: string[], personen = 4) => verwerkRecept({ naam: 'x', personen, taal: 'nl', stappen: [], ingredienten: regels }, 'nl');

describe('WEEK-329: richtwaarden voor klont, takje en sneetje', () => {
  test('eenheden worden gram', () => {
    assert.deepEqual([ontleedRegel('1 klont boter').bron?.soort, ontleedRegel('1 klont boter').naam], ['g', 'boter']);
    assert.equal(ontleedRegel('6 takjes tijm').bron?.soort, 'g');
    assert.equal(ontleedRegel('2 sneetjes brood').bron?.soort, 'g');
  });
  test('het voorbeeld van de stoofpot: niets meer "Hoeveelheid invullen"', () => {
    const r = lees(['1 klont boter', '6 takjes tijm', '2 sneetjes brood (of ontbijtkoek)']);
    assert.deepEqual(r.nakijken.filter((n) => n.reden === 'hoeveelheid'), []);
    const per = Object.fromEntries(r.ingredienten.map((i) => [i.code, i.hoeveelheid]));
    assert.ok(per.boter! > 0 && per.boter! <= 5, `boter ${per.boter}`); // 10 g voor 4 personen
    assert.ok(per.tijm! > 0 && per.tijm! <= 2, `tijm ${per.tijm}`); // 6 g voor 4 personen
    assert.ok(per.brood! >= 10 && per.brood! <= 20, `brood ${per.brood}`); // 60 g voor 4 personen
  });
  test('regressie: bosje en zakje blijven "hoeveelheid invullen"', () => {
    assert.equal(ontleedRegel('1 bosje peterselie').bron?.soort, 'onbekend');
    assert.equal(ontleedRegel('1 zakje gist').bron?.soort, 'onbekend');
  });
});

describe('WEEK-329: samengestelde woorden', () => {
  for (const [naam, code] of [
    ['kastanjechampignons', 'champignons'],
    ['Dijonmosterd', 'mosterd'],
    ['bruine basterdsuiker', 'bruine_suiker'],
    ['trostomaten', 'tomaat'],
  ] as const) {
    test(`${naam} → ${code} (zeker)`, () => assert.deepEqual(koppelIngredient(naam, ['nl']), { code, zeker: true }));
  }
  test('zuivel blijft een voorstel (havermelk is geen melk)', () => assert.equal(koppelIngredient('havermelk', ['nl'])?.zeker, false));
  test('regressie: een eigen ingrediënt wint (amandelmelk, kokosmelk)', () => {
    assert.deepEqual(koppelIngredient('amandelmelk', ['nl']), { code: 'amandelmelk', zeker: true });
    assert.equal(koppelIngredient('kokosmelk', ['nl'])?.code, 'kokosmelk');
  });
  test('regressie: een extra woord ervoor blijft een voorstel ("verse kastanje champignons" met spatie)', () =>
    assert.equal(koppelIngredient('kastanje champignons', ['nl'])?.zeker, false));
});
