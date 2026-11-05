import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  afdelingVanEigen,
  bewaarEigen,
  EigenIngredient,
  EigenRecept,
  GEZIN_STIJL,
  isExactBekend,
  nieuweId,
  normaliseerEigen,
  valideer,
  verwijderEigen,
  zoekIngredienten,
} from '@/lib/eigenrecepten';

const ing = (naam: string, hoeveelheid = 100): EigenIngredient => ({ naam, hoeveelheid, eenheid: 'g' });
const geldig = {
  naam: '  Mijn stoofpot ',
  soort: 'vlees' as const,
  minuten: '45',
  stijlen: ['klassiek' as const],
  ingredienten: [ing('rundsvlees', 150)],
  stappen: ['Bak het vlees.', '  ', 'Laat sudderen.'],
};

const recept = (id: string, naam: string, ingredienten: EigenIngredient[] = [ing('tofu')]): EigenRecept => ({
  id,
  naam,
  soort: 'vegetarisch',
  minuten: 15,
  stijlen: ['italiaans'],
  ingredienten,
  stappen: ['Snijd.'],
  bijgewerkt: '2026-10-17T10:00:00.000Z',
});

// WEEK-192: de gezinsstijl, seizoenen en het normaliseren van opgeslagen eigen recepten.
describe('WEEK-192: gezinsstijl en seizoenen', () => {
  test('de gezinsstijl wordt een vlag, de andere stijlen blijven stijlen', () => {
    const r = valideer({ ...geldig, stijlen: [GEZIN_STIJL, 'italiaans'] });
    if (!r.ok) throw new Error('moet geldig zijn');
    assert.equal(r.waarden.gezinStijl, true);
    assert.deepEqual(r.waarden.stijlen, ['italiaans']);
  });

  test('alleen de gezinsstijl geeft een recept zonder vaste stijl', () => {
    const r = valideer({ ...geldig, stijlen: [GEZIN_STIJL] });
    if (!r.ok) throw new Error('moet geldig zijn');
    assert.equal(r.waarden.gezinStijl, true);
    assert.deepEqual(r.waarden.stijlen, []);
  });

  test('zonder de gezinsstijl is het recept geen gezinsrecept', () => {
    const r = valideer(geldig);
    if (!r.ok) throw new Error('moet geldig zijn');
    assert.notEqual(r.waarden.gezinStijl, true);
  });

  test('onbekende seizoenen worden weggelaten, bekende blijven', () => {
    const r = valideer({ ...geldig, seizoenen: ['zomer', 'bogus' as never] });
    if (!r.ok) throw new Error('moet geldig zijn');
    assert.deepEqual(r.waarden.seizoenen, ['zomer']);
  });

  test('normaliseerEigen geeft een lege lijst bij ongeldige opslag', () => {
    assert.deepEqual(normaliseerEigen(null), []);
    assert.deepEqual(normaliseerEigen('kapot'), []);
  });

  test('normaliseerEigen bewaart de gezinsstijl en de seizoenen van een opgeslagen recept', () => {
    const opgeslagen = { ...recept('g1', 'Ons stoofvlees'), gezinStijl: true, seizoenen: ['winter' as const] };
    const [terug] = normaliseerEigen([opgeslagen]);
    assert.equal(terug.id, 'g1');
    assert.equal(terug.gezinStijl, true);
    assert.deepEqual(terug.seizoenen, ['winter']);
  });
});

// WEEK-192: het zoeken hergebruikt de zoeklogica van de lijst en de frigo (zoekCatalogus).
import { catalogus } from '@/lib/frigoSheets';
import { standaardEenheid, EENHEDEN } from '@/lib/eigenrecepten';

describe('WEEK-192: zoeken naar ingrediënten zoals de lijst', () => {
  test('een zoekterm zonder accenten en hoofdletters vindt de databankingrediënten', () => {
    const eerste = catalogus('nl')[0];
    const gevonden = zoekIngredienten(eerste.naam.toUpperCase(), 'nl', []);
    assert.ok(gevonden.some((k) => k.code === eerste.code));
  });

  test('eigen ingrediënten zonder databankcode komen erbij, zonder dubbel', () => {
    const eigen: EigenRecept[] = [{ ...recept('x', 'Test'), ingredienten: [{ naam: 'Zeldzame kruid', hoeveelheid: 5, eenheid: 'g' }] }];
    assert.deepEqual(zoekIngredienten('zeldzame', 'nl', eigen), [{ naam: 'Zeldzame kruid' }]);
  });

  test('een ingrediënt dat exact bestaat, is niet opnieuw nodig', () => {
    const eerste = catalogus('nl')[0];
    const keuzes = zoekIngredienten(eerste.naam, 'nl', []);
    assert.equal(isExactBekend(eerste.naam.toUpperCase(), keuzes), true);
    assert.equal(isExactBekend('zzz-bestaat-niet', keuzes), false);
  });

  test('de standaardeenheid komt uit de databank en is altijd een toegestane eenheid', () => {
    const eerste = catalogus('nl')[0];
    assert.ok((EENHEDEN as readonly string[]).includes(standaardEenheid(eerste.code)));
    assert.equal(standaardEenheid(undefined), 'g');
  });
});

// WEEK-199: een eigen recept duurt, zoals elk recept in de app, nooit langer dan een uur.
describe('WEEK-199: kooktijd van een eigen recept tot 60 minuten', () => {
  test('60 minuten is geldig, 61 en 600 niet meer', () => {
    assert.equal(valideer({ ...geldig, minuten: '60' }).ok, true);
    const teLang = valideer({ ...geldig, minuten: '61' });
    assert.equal(teLang.ok, false);
    if (!teLang.ok) assert.deepEqual(teLang.fouten, ['minuten']);
    assert.equal(valideer({ ...geldig, minuten: '600' }).ok, false);
  });

  test('regressie: een lege, nul- of niet-gehele kooktijd blijft een fout', () => {
    for (const m of ['', '0', '12,5', 'abc']) assert.equal(valideer({ ...geldig, minuten: m }).ok, false, m);
  });

  test('regressie: de minuten worden als getal bewaard', () => {
    const r = valideer({ ...geldig, minuten: ' 45 ' });
    if (!r.ok) throw new Error('moet geldig zijn');
    assert.equal(r.waarden.minuten, 45);
  });
});

// WEEK-201: de winkelafdeling van een eigen ingrediënt, voor de lijst en de frigo.
describe('WEEK-201: afdeling van een eigen ingrediënt', () => {
  test('met code geldt de afdeling van de ingrediëntenlijst, ook als er een andere keuze bij staat', () => {
    const eerste = catalogus('nl')[0];
    assert.equal(afdelingVanEigen({ code: eerste.code, afdeling: 'dranken' }), eerste.afdeling);
  });

  test('zonder code geldt de gekozen afdeling; zonder keuze of met een onbekende waarde geen afdeling (overig)', () => {
    assert.equal(afdelingVanEigen({ afdeling: 'zuivel-eieren' }), 'zuivel-eieren');
    assert.equal(afdelingVanEigen({}), undefined);
    assert.equal(afdelingVanEigen({ afdeling: 'onzin' as never }), undefined);
  });

  test('valideer bewaart de afdeling van een eigen ingrediënt en laat ze weg bij een ingrediënt met code', () => {
    const eerste = catalogus('nl')[0];
    const r = valideer({
      ...geldig,
      ingredienten: [
        { naam: 'Zeldzaam kruid', hoeveelheid: 5, eenheid: 'g', afdeling: 'zuivel-eieren' },
        { code: eerste.code, naam: eerste.naam, hoeveelheid: 100, eenheid: 'g', afdeling: 'dranken' },
        { naam: 'Onbekend', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'onzin' as never },
      ],
    });
    if (!r.ok) throw new Error('moet geldig zijn');
    assert.deepEqual(r.waarden.ingredienten[0], { naam: 'Zeldzaam kruid', hoeveelheid: 5, eenheid: 'g', afdeling: 'zuivel-eieren' });
    assert.equal('afdeling' in r.waarden.ingredienten[1], false);
    assert.equal('afdeling' in r.waarden.ingredienten[2], false);
  });

  test('regressie: een opgeslagen recept met een afdeling bij een ingrediënt blijft leesbaar', () => {
    const [terug] = normaliseerEigen([{ ...recept('a1', 'Ons', [{ naam: 'Zeldzaam kruid', hoeveelheid: 5, eenheid: 'g', afdeling: 'zuivel-eieren' }]) }]);
    assert.equal(terug.ingredienten[0].afdeling, 'zuivel-eieren');
  });
});

// WEEK-204: een oud of gesynchroniseerd eigen recept met ontbrekende velden mag de app niet laten vastlopen.
describe('WEEK-204: normaliseerEigen vult ontbrekende velden in', () => {
  test('zonder stijlen en seizoenen, met vreemde soort en minuten: bruikbaar recept', async () => {
    const [terug] = normaliseerEigen([{ id: 'x', naam: 'Oud', ingredienten: [], stappen: ['Doe iets.'], soort: 'onzin', minuten: 'veel' }]);
    assert.deepEqual(terug.stijlen, []);
    assert.equal(terug.seizoenen, undefined);
    assert.equal(terug.soort, 'vegetarisch');
    assert.equal(terug.minuten, 30);
    // en de planner kan ermee werken zonder TypeError
    const { kiesbareEigenRecepten, eigenNaarPlanRecept } = await import('@/lib/planner/kies');
    const { standaardProfiel } = await import('@/lib/profiel');
    assert.doesNotThrow(() => kiesbareEigenRecepten([terug], { moment: 'avond', kooktijden: [], stijlen: [], vermijd: [], enkelVegetarisch: false, zoek: '', taal: 'nl' }));
    assert.doesNotThrow(() => eigenNaarPlanRecept(terug, standaardProfiel()));
  });

  test('regressie: een geldig recept blijft ongewijzigd', () => {
    const r = { ...recept('g1', 'Ons stoofvlees'), gezinStijl: true, seizoenen: ['winter' as const] };
    assert.deepEqual(normaliseerEigen([r]), [r]);
  });

  test('ongeldige stijlen en seizoenen vallen weg, geldige blijven', () => {
    const [terug] = normaliseerEigen([{ ...recept('g2', 'Test'), stijlen: ['italiaans', 'bogus'], seizoenen: ['zomer', 'nooit'] }]);
    assert.deepEqual(terug.stijlen, ['italiaans']);
    assert.deepEqual(terug.seizoenen, ['zomer']);
  });
});
