import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DbRecept, kiesTekst, leesDbRecept, naarPlanRecept } from '@/lib/planner/db';
import { afdelingVoorCategorie } from '@/data/ingredienten';

const gezin1 = { volwassenen: 1, kinderen: 0 };
const gezin2k = { volwassenen: 2, kinderen: 2 };

const recept = (wijziging: Partial<DbRecept> = {}): DbRecept => ({
  id: 3,
  porties: 1,
  kooktijdMin: 20,
  moment: 'avond',
  stijl: 'aziatisch',
  soort: 'vlees',
  basis: 'rijst',
  titels: { nl: 'Kip wok', fr: 'Sauté de poulet', en: 'Chicken stir-fry' },
  ingredienten: [
    { code: 'kipfilet', categorie: 'vlees', namen: { nl: 'kipfilet', fr: 'filet de poulet', en: 'chicken fillet' }, hoeveelheid: 100, eenheid: 'g' },
    { code: 'knoflook', categorie: 'groente', namen: { nl: 'knoflook' }, hoeveelheid: 1, eenheid: 'teentje' },
  ],
  ...wijziging,
});

describe('kiesTekst: taal met terugval (WEEK-68)', () => {
  test('kiest de gevraagde taal', () => {
    assert.equal(kiesTekst({ nl: 'Kip', fr: 'Poulet' }, 'fr'), 'Poulet');
  });
  test('valt terug op nl als de taal ontbreekt', () => {
    assert.equal(kiesTekst({ nl: 'Kip' }, 'en'), 'Kip');
  });
  test('valt terug op de eerste beschikbare tekst, en lege teksten tellen niet', () => {
    assert.equal(kiesTekst({ fr: 'Poulet' }, 'en'), 'Poulet');
    assert.equal(kiesTekst({ nl: '  ', fr: 'Poulet' }, 'nl'), 'Poulet');
    assert.equal(kiesTekst({}, 'nl'), undefined);
  });
});

describe('afdelingVoorCategorie (WEEK-68)', () => {
  test('koppelt de databasecategorieën aan de afdelingen van de winkel', () => {
    assert.equal(afdelingVoorCategorie('groente'), 'groenten-fruit');
    assert.equal(afdelingVoorCategorie('vlees'), 'vlees-vis');
    assert.equal(afdelingVoorCategorie('vis'), 'vlees-vis');
    assert.equal(afdelingVoorCategorie('zuivel'), 'zuivel-eieren');
    assert.equal(afdelingVoorCategorie('ei'), 'zuivel-eieren');
    assert.equal(afdelingVoorCategorie('condiment'), 'conserven-sauzen');
    assert.equal(afdelingVoorCategorie('graan'), 'droge-voeding');
  });
  test('een onbekende categorie komt in droge voeding', () => {
    assert.equal(afdelingVoorCategorie('onbekend'), 'droge-voeding');
  });
});

describe('naarPlanRecept (WEEK-68)', () => {
  test('zet titel, soort, kooktijd, stijl en basis om', () => {
    const p = naarPlanRecept(recept(), 'nl', gezin1)!;
    assert.equal(p.id, 'db-3');
    assert.equal(p.naam, 'Kip wok');
    assert.equal(p.soort, 'vlees');
    assert.equal(p.minuten, 20);
    assert.deepEqual(p.stijlen, ['aziatisch']);
    assert.equal(p.basis, 'rijst');
  });

  test('gebruikt de taal van de gebruiker voor titel en ingrediënten', () => {
    const p = naarPlanRecept(recept(), 'fr', gezin1)!;
    assert.equal(p.naam, 'Sauté de poulet');
    assert.equal(p.ingredienten[0].naam, 'filet de poulet');
  });

  test('schaalt de hoeveelheden naar het gezin (1 per volwassene, 0,5 per kind)', () => {
    const p = naarPlanRecept(recept(), 'nl', gezin2k)!;
    // 2 volwassenen + 2 kinderen = factor 3: 100 g wordt 300 g.
    assert.equal(p.ingredienten[0].hoeveelheid, 300);
    assert.equal(p.ingredienten[0].eenheid, 'g');
  });

  test('een ingrediënt zonder vertaling valt terug op de code', () => {
    const p = naarPlanRecept(recept({ ingredienten: [{ code: 'tofu', categorie: 'eiwit', namen: {}, hoeveelheid: 200, eenheid: 'g' }] }), 'nl', gezin1)!;
    assert.equal(p.ingredienten[0].naam, 'tofu');
  });

  test('een recept zonder titel kan niet getoond worden', () => {
    assert.equal(naarPlanRecept(recept({ titels: {} }), 'nl', gezin1), undefined);
  });

  test('zonder basis blijft basis leeg', () => {
    assert.equal(naarPlanRecept(recept({ basis: null }), 'nl', gezin1)!.basis, undefined);
  });
});

describe('leesDbRecept: ruwe rijen uit Supabase (WEEK-68)', () => {
  const rij = {
    id: 7,
    porties: 1,
    kooktijd_min: 15,
    moment: 'middag',
    stijl: 'klassiek',
    soort: 'vegetarisch',
    basis: null,
    recept_vertalingen: [
      { taal: 'nl', titel: 'Linzensalade' },
      { taal: 'fr', titel: 'Salade de lentilles' },
      { taal: 'de', titel: 'ongeldige taal' },
    ],
    recept_ingredienten: [
      { hoeveelheid: 300, eenheid: 'g', optioneel: false, ingredienten: { code: 'linzen', categorie: 'peulvrucht', ingredient_vertalingen: [{ taal: 'nl', naam: 'linzen' }] } },
    ],
  };

  test('leest titels en ingrediënten, en negeert onbekende talen', () => {
    const r = leesDbRecept(rij)!;
    assert.equal(r.id, 7);
    assert.equal(r.kooktijdMin, 15);
    assert.deepEqual(r.titels, { nl: 'Linzensalade', fr: 'Salade de lentilles' });
    assert.equal(r.ingredienten[0].code, 'linzen');
    assert.equal(r.ingredienten[0].namen.nl, 'linzen');
  });

  test('onbruikbare invoer geeft undefined', () => {
    assert.equal(leesDbRecept(null), undefined);
    assert.equal(leesDbRecept({ id: 'x' }), undefined);
    assert.equal(leesDbRecept({ id: 1 }), undefined);
  });

  test('ingrediënten zonder ingrediënt-gegevens worden overgeslagen', () => {
    const r = leesDbRecept({ ...rij, recept_ingredienten: [{ hoeveelheid: 1, eenheid: 'stuk', ingredienten: null }] })!;
    assert.equal(r.ingredienten.length, 0);
  });
});

describe('WEEK-253: recepten zonder ingrediëntnamen in de download', () => {
  const rij = {
    id: 8,
    porties: 1,
    kooktijd_min: 20,
    moment: 'avond',
    stijl: 'klassiek',
    soort: 'vegetarisch',
    basis: null,
    recept_vertalingen: [{ taal: 'nl', titel: 'Witloofgratin' }],
    recept_ingredienten: [{ hoeveelheid: 1, eenheid: 'stuk', optioneel: false, ingredienten: { code: 'witlof', categorie: 'groente' } }],
  };

  test('de namen komen in alle 4 de talen uit de ingrediëntenlijst', () => {
    const r = leesDbRecept(rij)!;
    assert.deepEqual(r.ingredienten[0].namen, { nl: 'witlof', fr: 'endive', de: 'Chicorée', en: 'Belgian endive' });
    assert.equal(naarPlanRecept(r, 'fr', gezin1)!.ingredienten[0].naam, 'endive');
  });

  test('een code die de app (nog) niet kent, valt terug op de code', () => {
    const r = leesDbRecept({ ...rij, recept_ingredienten: [{ hoeveelheid: 1, eenheid: 'stuk', ingredienten: { code: 'onbekend_iets', categorie: 'fruit' } }] })!;
    assert.deepEqual(r.ingredienten[0].namen, {});
    assert.equal(naarPlanRecept(r, 'nl', gezin1)!.ingredienten[0].naam, 'onbekend_iets');
  });

  test('regressie: een rij met eigen vertalingen (oude vorm) gebruikt die nog altijd', () => {
    const oud = { ...rij, recept_ingredienten: [{ hoeveelheid: 1, eenheid: 'stuk', ingredienten: { code: 'witlof', categorie: 'groente', ingredient_vertalingen: [{ taal: 'nl', naam: 'witloof' }] } }] };
    assert.deepEqual(leesDbRecept(oud)!.ingredienten[0].namen, { nl: 'witloof' });
  });
});
