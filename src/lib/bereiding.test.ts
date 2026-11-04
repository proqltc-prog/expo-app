import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bereidingVoor, ingredientenMetFrigo, ingredientenVoor, toonBereidingsIcoon } from '@/lib/bereiding';
import { BEREIDINGEN } from '@/data/bereidingen';
import { RECEPTENBANK } from '@/data/receptenbank';
import type { EigenRecept } from '@/lib/eigenrecepten';
import type { Weekplan } from '@/lib/planner/types';
import type { FrigoItem } from '@/lib/frigo';

const eigen: EigenRecept = {
  id: 'eigen:abc',
  naam: 'Oma’s soep',
  soort: 'vegetarisch',
  minuten: 30,
  stijlen: ['klassiek'],
  ingredienten: [{ naam: 'wortel', hoeveelheid: 2, eenheid: 'stuk' }],
  stappen: ['Schil de wortel.', 'Kook alles 30 minuten.'],
  bijgewerkt: '2026-10-18T10:00:00.000Z',
};

const bank = RECEPTENBANK.find((r) => r.id === 'pasta-pesto')!;

describe('bereidingVoor (WEEK-81)', () => {
  test('een ingebouwd recept geeft de stappen in de taal van de gebruiker', () => {
    const stappen = bereidingVoor({ id: bank.id, naam: bank.namen[1] }, [], 'fr');
    assert.deepEqual(stappen, BEREIDINGEN['pasta-pesto'].fr);
  });

  test('een ingebouwd recept zoekt ook op naam, als het id ontbreekt; een taal buiten de app valt terug op Engels', () => {
    const stappen = bereidingVoor({ id: 'onbekend', naam: bank.namen[3] }, [], 'es' as never);
    assert.deepEqual(stappen, BEREIDINGEN['pasta-pesto'].en);
  });

  test('het Nederlands geeft de Nederlandse stappen, ook als de naam in een andere taal staat', () => {
    assert.deepEqual(bereidingVoor({ id: bank.id, naam: bank.namen[3] }, [], 'nl'), BEREIDINGEN['pasta-pesto'].nl);
  });

  test('een eigen recept geeft zijn eigen stappen, op id', () => {
    assert.deepEqual(bereidingVoor({ id: 'eigen:abc', naam: 'iets anders' }, [eigen], 'fr'), eigen.stappen);
  });

  test('een eigen recept wordt ook op naam gevonden', () => {
    assert.deepEqual(bereidingVoor({ id: 'eigen:ander', naam: 'Oma’s soep' }, [eigen], 'nl'), eigen.stappen);
  });

  test('een eigen recept gaat voor een ingebouwd recept met dezelfde naam', () => {
    const naamGelijk: EigenRecept = { ...eigen, naam: bank.namen[0], stappen: ['Eigen stap.'] };
    assert.deepEqual(bereidingVoor({ id: 'eigen:abc', naam: bank.namen[0] }, [naamGelijk], 'nl'), ['Eigen stap.']);
  });

  test('een AI-recept zonder bekende stappen geeft null', () => {
    assert.equal(bereidingVoor({ id: 'ai-123', naam: 'Iets van de AI' }, [], 'nl'), null);
  });

  test('de teruggegeven lijst is een kopie, zodat de bron niet verandert', () => {
    const stappen = bereidingVoor({ id: 'eigen:abc', naam: 'x' }, [eigen], 'nl');
    stappen?.push('extra');
    assert.equal(eigen.stappen.length, 2);
  });
});

describe('icoon bereidingsstappen (WEEK-113)', () => {
  test('een bevestigd gerecht toont altijd het icoon', () => {
    assert.equal(toonBereidingsIcoon(true), true);
  });

  test('een niet-bevestigd gerecht toont het icoon niet', () => {
    assert.equal(toonBereidingsIcoon(false), false);
  });

  test('een gerecht zonder bevestigd-vlag (undefined) toont het icoon niet', () => {
    assert.equal(toonBereidingsIcoon(undefined), false);
  });

  test('regressie: een gerecht zonder bekende stappen geeft null (de pagina Bereiding toont dan de melding)', () => {
    assert.equal(bereidingVoor({ id: 'onbekend-xyz', naam: 'Onbekend gerecht' }, [], 'nl'), null);
  });
});

describe('ingredientenVoor (WEEK-146)', () => {
  const plan = {
    dagen: [
      { dag: 'zondag', recept: { id: 'db-1', naam: 'Pasta', soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten: [{ naam: 'Pasta', hoeveelheid: 400, eenheid: 'g', afdeling: 'droogwaren' }, { naam: 'Tomaat', hoeveelheid: 3, eenheid: 'stuk', afdeling: 'groenten-fruit' }] } },
      { dag: 'maandag', recept: { id: 'db-2', naam: 'Soep', soort: 'vegetarisch', minuten: 30, stijlen: [], ingredienten: [{ naam: 'Ui', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit' }] } },
    ],
  } as unknown as Weekplan;

  test('geeft de ingrediënten van het gerecht uit het plan, met de hoeveelheden voor het gezin', () => {
    assert.deepEqual(ingredientenVoor(plan, 'db-1'), [
      { naam: 'Pasta', hoeveelheid: 400, eenheid: 'g' },
      { naam: 'Tomaat', hoeveelheid: 3, eenheid: 'stuk' },
    ]);
  });

  test('een ander gerecht geeft enkel zijn eigen ingrediënten', () => {
    assert.deepEqual(ingredientenVoor(plan, 'db-2'), [{ naam: 'Ui', hoeveelheid: 1, eenheid: 'stuk' }]);
  });

  test('een gerecht dat niet in het plan staat, of geen plan, geeft een lege lijst', () => {
    assert.deepEqual(ingredientenVoor(plan, 'db-999'), []);
    assert.deepEqual(ingredientenVoor(null, 'db-1'), []);
  });
});

describe('ingredientenMetFrigo (WEEK-147)', () => {
  const ingredienten = [
    { naam: 'Pasta', hoeveelheid: 400, eenheid: 'g' },
    { naam: 'Tomaat', hoeveelheid: 3, eenheid: 'stuk' },
    { naam: 'Ui', hoeveelheid: 1, eenheid: 'stuk' },
  ];
  const frigo = [
    { id: '1', naam: 'pasta', hoeveelheid: 500, eenheid: 'g', afdeling: 'droogwaren', toegevoegdOp: '2026-10-01T10:00:00Z', bron: 'planner' },
    { id: '2', naam: 'Tomaat', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit', toegevoegdOp: '2026-10-01T10:00:00Z', bron: 'planner' },
  ] as unknown as FrigoItem[];

  test('geheel gedekt, deels gedekt en niet in de frigo worden onderscheiden', () => {
    assert.deepEqual(
      ingredientenMetFrigo(ingredienten, frigo).map((i) => i.dekking),
      ['geheel', 'deels', 'niet'],
    );
  });

  test('behoudt naam, hoeveelheid en eenheid van het ingrediënt', () => {
    assert.deepEqual(ingredientenMetFrigo(ingredienten, frigo)[0], { naam: 'Pasta', hoeveelheid: 400, eenheid: 'g', dekking: 'geheel' });
  });

  test('zonder frigo is niets gedekt (regressie)', () => {
    assert.deepEqual(
      ingredientenMetFrigo(ingredienten, []).map((i) => i.dekking),
      ['niet', 'niet', 'niet'],
    );
  });
});

describe('ingredientenVoor in de gekozen taal (WEEK-154)', () => {
  test('de ingrediënten krijgen de naam in de gekozen taal en behouden hun hoeveelheid', () => {
    const plan = {
      gemaaktOp: '2026-10-20T10:00:00Z',
      dagen: [{ dag: 'zondag', recept: { id: 'db-7', naam: 'Pasta', soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten: [{ naam: 'Tomaat', hoeveelheid: 3, eenheid: 'stuk', afdeling: 'groenten-fruit', code: 'tomaat', namen: { nl: 'Tomaat', fr: 'Tomate' } }] } }],
    } as unknown as Parameters<typeof ingredientenVoor>[0];
    assert.deepEqual(ingredientenVoor(plan, 'db-7', 'fr'), [{ naam: 'Tomate', hoeveelheid: 3, eenheid: 'stuk' }]);
    assert.deepEqual(ingredientenVoor(plan, 'db-7'), [{ naam: 'Tomaat', hoeveelheid: 3, eenheid: 'stuk' }]);
  });
});

