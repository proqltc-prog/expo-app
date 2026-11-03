import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { DbRecept } from '@/lib/planner/db';
import { DbPoolRecept, maakDbPool, planUitDatabase, vervangDbDag } from '@/lib/planner/dbplan';
import { standaardProfiel } from '@/lib/profiel';
import type { PlanVerzoek } from '@/lib/planner/types';

const standaardProfielVerzoek = (): PlanVerzoek => ({
  kooktijden: [],
  stijlen: [],
  profiel: standaardProfiel(),
  taal: 'nl',
  seed: 1,
});

const dbRecept = (id: number, wijziging: Partial<DbRecept> = {}): DbRecept => ({
  id,
  porties: 1,
  kooktijdMin: 15,
  moment: 'avond',
  stijl: 'klassiek',
  soort: 'vegetarisch',
  basis: 'pasta',
  titels: { nl: `Recept ${id}` },
  ingredienten: [{ code: 'ui', categorie: 'groente', namen: { nl: 'ui' }, hoeveelheid: 100, eenheid: 'g' }],
  ...wijziging,
});

const pool = (...recepten: DbRecept[]): DbPoolRecept[] => maakDbPool(recepten, 'nl', { volwassenen: 1, kinderen: 0 });

const plan = (p: DbPoolRecept[], wijziging: Partial<PlanVerzoek> = {}) =>
  planUitDatabase({ ...standaardProfielVerzoek(), ...wijziging }, p);

describe('maakDbPool (WEEK-68)', () => {
  test('zet recepten om met moment, kooktijdklasse en stijl', () => {
    const [k] = pool(dbRecept(1, { kooktijdMin: 30, moment: 'avond', stijl: 'klassiek' }));
    assert.equal(k.moment, 'avond');
    assert.equal(k.kooktijd, 'gemiddeld');
    assert.deepEqual(k.stijlen, ['klassiek']);
    assert.equal(k.recept.id, 'db-1');
  });
  test('recepten zonder titel in de taal vallen weg', () => {
    assert.equal(maakDbPool([dbRecept(1, { titels: {} })], 'nl', { volwassenen: 1, kinderen: 0 }).length, 0);
  });
});

describe('planUitDatabase: dagen en momenten (WEEK-68)', () => {
  test('één recept per dag, het aantal dagen gaat tot 7', () => {
    const p = pool(...Array.from({ length: 10 }, (_, i) => dbRecept(i + 1)));
    assert.equal(plan(p, { aantalDagen: 3 })!.dagen.length, 3);
    assert.equal(plan(p, { aantalDagen: 10 })!.dagen.length, 7);
  });
  test('het plan is avondeten: het aantal dagen klopt met de avondrecepten', () => {
    const p = pool(dbRecept(1, { moment: 'avond' }), dbRecept(2, { moment: 'avond' }));
    const uit = plan(p, { aantalDagen: 1, momenten: ['avond'] })!;
    assert.equal(uit.dagen.length, 1);
  });
  test('zonder recepten is er geen plan', () => {
    assert.equal(plan([]), undefined);
  });
});

describe('planUitDatabase: wensen en versoepelen (WEEK-68)', () => {
  test('kiest recepten die de gevraagde kooktijd en stijl hebben', () => {
    const p = pool(dbRecept(1, { kooktijdMin: 15, stijl: 'italiaans' }), dbRecept(2, { kooktijdMin: 60, stijl: 'aziatisch' }));
    const uit = plan(p, { aantalDagen: 1, kooktijden: ['snel'], stijlen: ['italiaans'] })!;
    assert.equal(uit.dagen[0].recept.id, 'db-1');
    assert.equal(uit.versoepeld, undefined);
  });
  test('versoepelt als er niets past, en zegt dat in het plan', () => {
    const p = pool(dbRecept(1, { kooktijdMin: 60, stijl: 'aziatisch' }));
    const uit = plan(p, { aantalDagen: 1, kooktijden: ['snel'] })!;
    assert.equal(uit.dagen.length, 1);
    assert.equal(uit.versoepeld, true);
  });
  test('herhaalt geen recept zolang er genoeg andere zijn', () => {
    const p = pool(...Array.from({ length: 5 }, (_, i) => dbRecept(i + 1)));
    const uit = plan(p, { aantalDagen: 5 })!;
    assert.equal(new Set(uit.dagen.map((d) => d.recept.id)).size, 5);
  });
  test('herhaalt wel als er te weinig recepten zijn', () => {
    const uit = plan(pool(dbRecept(1)), { aantalDagen: 3 })!;
    assert.equal(uit.dagen.length, 3);
    assert.ok(uit.dagen.every((d) => d.recept.id === 'db-1'));
  });
  test('met hetzelfde seed is het plan hetzelfde (zonder het moment van maken, dat per aanroep verschilt)', () => {
    const p = pool(...Array.from({ length: 8 }, (_, i) => dbRecept(i + 1)));
    const zonderTijd = (w: ReturnType<typeof plan>) => ({ ...w, gemaaktOp: '' });
    assert.deepEqual(zonderTijd(plan(p, { seed: 42 })), zonderTijd(plan(p, { seed: 42 })));
  });
  test('het plan is van bron db en bewaart de wensen', () => {
    const uit = plan(pool(dbRecept(1)), { aantalDagen: 1, kooktijden: ['snel'], stijlen: ['klassiek'] })!;
    assert.equal(uit.bron, 'db');
    assert.deepEqual(uit.kooktijden, ['snel']);
    assert.deepEqual(uit.stijlen, ['klassiek']);
  });
});

describe('vervangDbDag (WEEK-68)', () => {
  test('vervangt enkel die dag, door een recept dat nog niet op het plan staat', () => {
    const p = pool(...Array.from({ length: 4 }, (_, i) => dbRecept(i + 1)));
    const origineel = plan(p, { aantalDagen: 2, seed: 7 })!;
    const nieuw = vervangDbDag(origineel, 0, p, 99);
    assert.equal(nieuw.dagen[1].recept.id, origineel.dagen[1].recept.id);
    assert.notEqual(nieuw.dagen[0].recept.id, origineel.dagen[0].recept.id);
    assert.notEqual(nieuw.dagen[0].recept.id, nieuw.dagen[1].recept.id);
  });
  test('een ongeldige dag verandert niets', () => {
    const p = pool(dbRecept(1), dbRecept(2));
    const origineel = plan(p, { aantalDagen: 1 })!;
    assert.equal(vervangDbDag(origineel, 5, p, 1), origineel);
  });
  test('zonder andere recepten blijft het recept staan', () => {
    const p = pool(dbRecept(1));
    const origineel = plan(p, { aantalDagen: 1 })!;
    assert.equal(vervangDbDag(origineel, 0, p, 1).dagen[0].recept.id, 'db-1');
  });
  test('regressie WEEK-170: de pijl geeft nooit het huidige recept terug als er een ander recept is', () => {
    const p = pool(dbRecept(1), dbRecept(2));
    for (let seed = 1; seed <= 30; seed++) {
      const origineel = plan(p, { aantalDagen: 2, seed })!;
      const nieuw = vervangDbDag(origineel, 0, p, seed);
      assert.notEqual(nieuw.dagen[0].recept.id, origineel.dagen[0].recept.id, `seed ${seed}`);
    }
  });
  test('regressie WEEK-170: bij een kleine pool wisselt de pijl naar een recept dat al op een andere dag staat', () => {
    const p = pool(dbRecept(1), dbRecept(2), dbRecept(3));
    const origineel = plan(p, { aantalDagen: 2, seed: 4 })!;
    const nieuw = vervangDbDag(origineel, 0, p, 11);
    assert.notEqual(nieuw.dagen[0].recept.id, origineel.dagen[0].recept.id);
    assert.equal(nieuw.dagen[1].recept.id, origineel.dagen[1].recept.id);
  });
  test('wist de kooktoestand van de vervangen dag', () => {
    const p = pool(dbRecept(1), dbRecept(2));
    const origineel = { ...plan(p, { aantalDagen: 1 })!, dagen: [{ ...plan(p, { aantalDagen: 1 })!.dagen[0], gedaan: true }] };
    assert.equal(vervangDbDag(origineel, 0, p, 3).dagen[0].gedaan, undefined);
  });
});

const spek: DbRecept['ingredienten'] = [{ code: 'spek', categorie: 'vlees', namen: { nl: 'spek' }, hoeveelheid: 100, eenheid: 'g' }];

describe('vermijden en moment worden nooit overtreden (WEEK-116)', () => {
  test('een vermeden ingrediënt komt niet op het plan, ook niet bij aanvullen', () => {
    const p = pool(dbRecept(1, { ingredienten: spek, titels: { nl: 'Spaghetti carbonara' } }), dbRecept(2, { basis: 'rijst' }));
    const plan = planUitDatabase({ ...standaardProfielVerzoek(), vermijd: ['varkensvlees'] }, p);
    assert.ok(plan);
    assert.ok(plan!.dagen.every((d) => d.recept.naam !== 'Spaghetti carbonara'));
  });

  test('regressie: is het enige recept vermeden, dan komt er geen plan met dat recept', () => {
    const p = pool(dbRecept(1, { ingredienten: spek }));
    const plan = planUitDatabase({ ...standaardProfielVerzoek(), vermijd: ['varkensvlees'] }, p);
    assert.equal(plan, undefined);
  });

  test('regressie: een avondrecept komt op het avondplan', () => {
    const p = pool(dbRecept(1, { moment: 'avond' }));
    const plan = planUitDatabase({ ...standaardProfielVerzoek(), momenten: ['avond'] }, p);
    assert.ok(plan);
    assert.equal(plan!.dagen[0].recept.id, 'db-1');
  });

  test('een vervangen dag respecteert de vermijd-lijst van het plan', () => {
    const p = pool(dbRecept(1, { ingredienten: spek }), dbRecept(2), dbRecept(3, { basis: 'rijst' }));
    const origineel = planUitDatabase({ ...standaardProfielVerzoek(), vermijd: ['varkensvlees'], aantalDagen: 2 }, p);
    assert.ok(origineel);
    const nieuw = vervangDbDag(origineel!, 0, p, 7);
    assert.ok(nieuw.dagen.every((d) => !d.recept.ingredienten.some((i) => i.naam === 'spek')));
  });
});

describe('planUitDatabase: aanvullen kiest korte recepten (WEEK-122)', () => {
  test('bij aanvullen komt een recept van 290 minuten niet op het plan als er een korter recept is', () => {
    const p = pool(dbRecept(1, { kooktijdMin: 290 }), dbRecept(2, { kooktijdMin: 25 }));
    const uit = plan(p, { aantalDagen: 1, kooktijden: ['snel'] })!;
    assert.equal(uit.dagen[0].recept.id, 'db-2');
    assert.equal(uit.versoepeld, true);
  });
  test('regressie: over veel seeds kiest het plan nooit het langste recept als een korter beschikbaar is', () => {
    const p = pool(dbRecept(1, { kooktijdMin: 290 }), dbRecept(2, { kooktijdMin: 25 }), dbRecept(3, { kooktijdMin: 30 }));
    for (let seed = 1; seed <= 20; seed++) {
      const uit = plan(p, { aantalDagen: 1, kooktijden: ['snel'], seed })!;
      assert.notEqual(uit.dagen[0].recept.id, 'db-1', `seed ${seed}`);
    }
  });
  test('regressie: een recept dat wel bij de gekozen kooktijd past, gaat voor op een korter recept', () => {
    const p = pool(dbRecept(1, { kooktijdMin: 60 }), dbRecept(2, { kooktijdMin: 15 }));
    const uit = plan(p, { aantalDagen: 1, kooktijden: ['uitgebreid'] })!;
    assert.equal(uit.dagen[0].recept.id, 'db-1');
    assert.equal(uit.versoepeld, undefined);
  });
});

describe('vervangDbDag met afgewezen recepten (WEEK-184)', () => {
  test('een eerder vervangen recept komt niet terug, ook niet op een andere dag', () => {
    const p = pool(dbRecept(1), dbRecept(2), dbRecept(3), dbRecept(4));
    for (let seed = 1; seed <= 20; seed++) {
      const origineel = { ...plan(p, { aantalDagen: 2, seed })!, afgewezen: ['db-3', 'db-4'] };
      const nieuw = vervangDbDag(origineel, 0, p, seed);
      assert.ok(!['db-3', 'db-4'].includes(nieuw.dagen[0].recept.id), `seed ${seed}`);
    }
  });
});

describe('planUitDatabase: frigo eerst, dan de rest van de databank (WEEK-188)', () => {
  const ui = (id: number, wijziging: Partial<DbRecept> = {}) => dbRecept(id, wijziging);
  const wortel = (id: number, wijziging: Partial<DbRecept> = {}) =>
    dbRecept(id, { ingredienten: [{ code: 'wortel', categorie: 'groente', namen: { nl: 'wortel' }, hoeveelheid: 100, eenheid: 'g' }], ...wijziging });
  // Een product uit een weekplanner-recept (bron 'planner'); losse producten tellen niet mee (WEEK-182).
  const frigoUi = [{ id: 'f1', naam: 'ui', afdeling: 'overig' as const, toegevoegdOp: new Date().toISOString(), bron: 'planner' as const }];

  test('een recept dat uit de frigo maakt, komt voor een recept zonder frigo-product', () => {
    const p = pool(wortel(1), ui(2));
    for (let seed = 1; seed <= 20; seed++) {
      const uit = plan(p, { aantalDagen: 1, frigo: frigoUi, seed })!;
      assert.equal(uit.dagen[0].recept.id, 'db-2', `seed ${seed}`);
    }
  });

  test('de frigo-voorrang breekt de kooktijd van de weekplanner niet', () => {
    const p = pool(ui(1, { kooktijdMin: 60 }), wortel(2, { kooktijdMin: 15 }));
    const uit = plan(p, { aantalDagen: 1, kooktijden: ['snel'], frigo: frigoUi })!;
    assert.equal(uit.dagen[0].recept.id, 'db-2');
  });

  test('zonder recepten die uit de frigo maken, kiest de planner gewoon uit de databank', () => {
    const p = pool(wortel(1), wortel(2));
    const uit = plan(p, { aantalDagen: 1, frigo: frigoUi })!;
    assert.ok(uit.dagen[0].recept.id.startsWith('db-'));
  });

  test('zonder frigo verandert er niets aan de keuze', () => {
    const p = pool(ui(1), wortel(2));
    const zonder = plan(p, { aantalDagen: 2, seed: 7 })!;
    const leeg = plan(p, { aantalDagen: 2, seed: 7, frigo: [] })!;
    assert.deepEqual(zonder.dagen.map((d) => d.recept.id), leeg.dagen.map((d) => d.recept.id));
  });

  test('een los frigo-product geeft geen voorrang aan een recept', () => {
    const p = pool(wortel(1), ui(2));
    const los = [{ id: 'f2', naam: 'ui', afdeling: 'overig' as const, toegevoegdOp: new Date().toISOString(), bron: 'los' as const }];
    const uit = plan(p, { aantalDagen: 1, frigo: los, seed: 3 })!;
    assert.ok(uit.dagen[0].recept.id.startsWith('db-'));
  });
});
