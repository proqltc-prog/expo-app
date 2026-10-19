// Bereidingsstappen van databankrecepten (WEEK-121).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bereidingVoor } from '@/lib/bereiding';
import { bereidingVoorDbRecept, DbRecept, leesBereidingen, leesDbRecept } from '@/lib/planner/db';

const stappenNl = ['Kook de rijst.', 'Bak de kip.'];
const stappenFr = ['Faites cuire le riz.', 'Faites dorer le poulet.'];

const recept = (wijziging: Partial<DbRecept> = {}): DbRecept => ({
  id: 246,
  porties: 1,
  kooktijdMin: 30,
  moment: 'avond',
  stijl: 'klassiek',
  soort: 'vlees',
  basis: null,
  titels: { nl: 'Stamppot' },
  ingredienten: [],
  bereidingen: { nl: stappenNl, fr: stappenFr },
  ...wijziging,
});

describe('leesBereidingen: stappen uit recept_bereidingen (WEEK-121)', () => {
  test('leest een rij per taal naar een map met stappen', () => {
    const uit = leesBereidingen([
      { taal: 'nl', stappen: stappenNl },
      { taal: 'fr', stappen: stappenFr },
    ]);
    assert.deepEqual(uit, { nl: stappenNl, fr: stappenFr });
  });

  test('een onbekende taal, een lege lijst of lege tekst vallen weg', () => {
    const uit = leesBereidingen([
      { taal: 'it', stappen: ['Cuocere.'] },
      { taal: 'de', stappen: [] },
      { taal: 'en', stappen: ['   ', ''] },
      { taal: 'es', stappen: ['  Cocina el arroz.  '] },
    ]);
    assert.deepEqual(uit, { es: ['Cocina el arroz.'] });
  });

  test('zonder rijen (of ongeldige invoer) is de map leeg', () => {
    assert.deepEqual(leesBereidingen(undefined), {});
    assert.deepEqual(leesBereidingen('kapot'), {});
    assert.deepEqual(leesBereidingen([null, 3, { taal: 'nl' }]), {});
  });
});

describe('leesDbRecept neemt de bereidingen mee (WEEK-121)', () => {
  const rij = {
    id: 246,
    kooktijd_min: 30,
    moment: 'avond',
    stijl: 'klassiek',
    soort: 'vlees',
    basis: null,
    recept_vertalingen: [{ taal: 'nl', titel: 'Stamppot' }],
    recept_ingredienten: [],
  };

  test('recept_bereidingen wordt omgezet naar bereidingen', () => {
    const r = leesDbRecept({ ...rij, recept_bereidingen: [{ taal: 'nl', stappen: stappenNl }] })!;
    assert.deepEqual(r.bereidingen, { nl: stappenNl });
  });

  test('regressie: zonder recept_bereidingen blijft het recept geldig, met lege stappen', () => {
    const r = leesDbRecept(rij)!;
    assert.deepEqual(r.bereidingen, {});
    assert.equal(r.titels.nl, 'Stamppot');
  });
});

describe('bereidingVoorDbRecept: stappen in de taal van de gebruiker (WEEK-121)', () => {
  test('geeft de stappen in de gekozen taal', () => {
    assert.deepEqual(bereidingVoorDbRecept(recept(), 'fr'), stappenFr);
  });

  test('valt terug op nl als de taal ontbreekt', () => {
    assert.deepEqual(bereidingVoorDbRecept(recept(), 'pt'), stappenNl);
  });

  test('valt terug op de eerste beschikbare taal als ook nl ontbreekt', () => {
    assert.deepEqual(bereidingVoorDbRecept(recept({ bereidingen: { es: ['Cocina.'] } }), 'de'), ['Cocina.']);
  });

  test('geeft null zonder stappen', () => {
    assert.equal(bereidingVoorDbRecept(recept({ bereidingen: {} }), 'nl'), null);
    assert.equal(bereidingVoorDbRecept(recept({ bereidingen: undefined }), 'nl'), null);
  });

  test('geeft een kopie, zodat de bron niet wijzigt', () => {
    const r = recept();
    const uit = bereidingVoorDbRecept(r, 'nl')!;
    uit.push('extra');
    assert.deepEqual(r.bereidingen?.nl, stappenNl);
  });
});

describe('bereidingVoor met databankrecepten (WEEK-121)', () => {
  test('een db-recept wordt op id gevonden in de databankrijen', () => {
    assert.deepEqual(bereidingVoor({ id: 'db-246', naam: 'Stamppot' }, [], 'fr', [recept()]), stappenFr);
  });

  test('een db-recept dat niet in de lijst zit geeft null, ook niet bij een gelijke naam', () => {
    assert.equal(bereidingVoor({ id: 'db-999', naam: 'Stamppot' }, [], 'nl', [recept()]), null);
  });

  test('zonder databankrijen geeft een db-recept null (oude gedrag blijft werken)', () => {
    assert.equal(bereidingVoor({ id: 'db-246', naam: 'Stamppot' }, [], 'nl'), null);
  });

  test('regressie: ingebouwde recepten blijven zoeken zoals voorheen, ook met een databanklijst', () => {
    const stappen = bereidingVoor({ id: 'pasta-pesto', naam: 'Pasta pesto' }, [], 'nl', [recept()]);
    assert.ok(stappen && stappen.length > 0);
  });
});
