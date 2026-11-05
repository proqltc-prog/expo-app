import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { FrigoItem, trekFrigoAf, verdeelFrigo } from '@/lib/frigo';
import { itemsUitPlan, voegPlanToe } from '@/lib/lijst';
import { naarPlanRecept } from '@/lib/planner/db';
import { planUitDatabase } from '@/lib/planner/dbplan';
import { frigoScoreIngredienten, frigoScoreNamen } from '@/lib/planner/frigovoorrang';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import { testPool, testRecept, TESTRECEPTEN } from '@/lib/planner/testrecepten';
import type { PlanDag, PlanVerzoek } from '@/lib/planner/types';
import { Profiel, standaardProfiel } from '@/lib/profiel';

const NU = new Date('2026-10-10T12:00:00Z');
const dagenGeleden = (n: number) => new Date(NU.getTime() - n * 24 * 3600 * 1000).toISOString();
const f = (naam: string, hoeveelheid: number | undefined, eenheid: string | undefined, dagen: number, extra: Partial<FrigoItem> = {}): FrigoItem => ({
  id: `${naam}-${dagen}`, naam, afdeling: 'groenten-fruit', toegevoegdOp: dagenGeleden(dagen), bron: 'planner',
  ...(hoeveelheid !== undefined ? { hoeveelheid } : {}), ...(eenheid ? { eenheid } : {}), ...extra,
});
const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 2 };
const verzoek = (extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 42, ...extra,
});

describe('verdeelFrigo (WEEK-12)', () => {
  test('geheel, deels of niet gedekt, de voorraad wordt verdeeld in volgorde', () => {
    const d = verdeelFrigo(
      [{ naam: 'pasta', hoeveelheid: 300, eenheid: 'g' }, { naam: 'pasta', hoeveelheid: 300, eenheid: 'g' }, { naam: 'zalm', hoeveelheid: 200, eenheid: 'g' }],
      [f('pasta', 500, 'g', 1)]
    );
    assert.deepEqual(d, [{ gedekt: 'geheel' }, { gedekt: 'deels', rest: 100 }, { gedekt: 'niet', rest: 200 }]);
  });
  test('een product zonder hoeveelheid dekt alles met die naam', () => {
    assert.deepEqual(verdeelFrigo([{ naam: 'Pasta', hoeveelheid: 300, eenheid: 'g' }, { naam: 'pasta', hoeveelheid: 200, eenheid: 'g' }], [f('pasta', undefined, undefined, 1)]),
      [{ gedekt: 'geheel' }, { gedekt: 'geheel' }]);
  });
  test('een eenheid die niet te herleiden is, dekt niets', () => {
    // Rijst heeft geen stukgewicht: 2 stuk rijst kan niet met 500 g gedekt worden (WEEK-161).
    assert.deepEqual(verdeelFrigo([{ naam: 'rijst', hoeveelheid: 2, eenheid: 'stuk' }], [f('rijst', 500, 'g', 1)]), [{ gedekt: 'niet', rest: 2 }]);
  });

  test('stuk tegen gram dekt via het stukgewicht: 2 stuk ui (300 g) is gedekt door 500 g (WEEK-161)', () => {
    assert.deepEqual(verdeelFrigo([{ naam: 'ui', hoeveelheid: 2, eenheid: 'stuk' }], [f('ui', 500, 'g', 1)]), [{ gedekt: 'geheel' }]);
  });
});

describe('trekFrigoAf', () => {
  const dagen: PlanDag[] = [{ dag: 'zondag', recept: { id: 'x', naam: 'Curry', soort: 'vegetarisch', minuten: 30, stijlen: [], ingredienten: [
    { naam: 'spinazie', hoeveelheid: 200, eenheid: 'g', afdeling: 'groenten-fruit' },
    { naam: 'rijst', hoeveelheid: 300, eenheid: 'g', afdeling: 'droge-voeding' },
    { naam: 'kokosmelk', hoeveelheid: 400, eenheid: 'ml', afdeling: 'conserven-sauzen' },
  ] } }];
  test('wat in huis is, komt niet of minder op de lijst', () => {
    const items = trekFrigoAf(itemsUitPlan(dagen), [f('spinazie', 250, 'g', 3), f('rijst', 100, 'g', 1)]);
    assert.deepEqual(items.map((i) => [i.naam, i.hoeveelheid]), [['rijst', 200], ['kokosmelk', 400]]);
  });
  test('producten gekocht uit precies deze lijstitems tellen niet mee', () => {
    const items = itemsUitPlan(dagen);
    const gekocht = f('spinazie', 200, 'g', 0, { lijstId: items[0].id });
    assert.equal(trekFrigoAf(items, [gekocht]).length, 3);
  });
  test('via voegPlanToe: aangepaste items op de lijst, vaste items blijven, vinkjes en namen blijven bewaard', () => {
    const eerst = voegPlanToe([], dagen, 'nl');
    const rijst = eerst.find((i) => i.naam === 'rijst')!;
    const gekocht = eerst.map((i) => (i.id === rijst.id ? { ...i, afgevinkt: true, afgevinktDoor: 'Pauline' } : i));
    const frigo = [f('spinazie', 500, 'g', 2), f('rijst', 300, 'g', 0, { lijstId: rijst.id })];
    const lijst = voegPlanToe(gekocht, dagen, 'nl', (items) => trekFrigoAf(items, frigo));
    const recept = lijst.filter((i) => i.recept);
    assert.deepEqual(recept.map((i) => [i.naam, i.afgevinkt]), [['rijst', true], ['kokosmelk', false]]);
    assert.equal(recept[0].afgevinktDoor, 'Pauline');
  });
});

/** De ingrediënten van een testrecept zoals de databankplanner ze scoort: naam in de taal en de vaste code. */
const ingredientenVan = (id: number, taal: 'nl' | 'fr' | 'en' = 'nl') =>
  naarPlanRecept(testRecept(id), taal, { volwassenen: 1, kinderen: 0 })!.ingredienten;

describe('frigoScoreIngredienten op databankrecepten', () => {
  test('een recept dat meer en oudere frigo-producten gebruikt, scoort hoger', () => {
    const frigo = [f('spinazie', 200, 'g', 5), f('kokosmelk', 400, 'ml', 1)];
    const linzen = frigoScoreIngredienten(ingredientenVan(1), frigo, NU); // linzencurry: spinazie + kokosmelk
    const kip = frigoScoreIngredienten(ingredientenVan(6), frigo, NU); // Thaise kipcurry: enkel kokosmelk
    assert.ok(linzen > kip, `${linzen} > ${kip}`);
    assert.equal(frigoScoreIngredienten(ingredientenVan(2), frigo, NU), 0); // cacio e pepe: niets uit de frigo
  });
  test('herkent producten in elke taal, los van de taal van het plan (WEEK-206)', () => {
    assert.ok(frigoScoreIngredienten(ingredientenVan(1, 'fr'), [f('épinards', 200, 'g', 2)], NU) > 0);
    assert.ok(frigoScoreIngredienten(ingredientenVan(1, 'nl'), [f('épinards', 200, 'g', 2)], NU) > 0);
    assert.ok(frigoScoreIngredienten(ingredientenVan(1, 'en'), [f('Spinat', 200, 'g', 2)], NU) > 0);
  });
  test('het recept dat het meest opmaakt, scoort het hoogst; niets in de frigo of een onbekend product scoort 0', () => {
    const frigo = [f('spinazie', 200, 'g', 5), f('kokosmelk', 400, 'ml', 5), f('linzen', 500, 'g', 5)];
    const scores = TESTRECEPTEN.map((r) => ({ id: r.id, score: frigoScoreIngredienten(ingredientenVan(r.id), frigo, NU) }));
    const beste = scores.reduce((a, b) => (b.score > a.score ? b : a));
    assert.equal(beste.id, 1);
    assert.ok(TESTRECEPTEN.every((r) => frigoScoreIngredienten(ingredientenVan(r.id), [], NU) === 0));
    assert.ok(TESTRECEPTEN.every((r) => frigoScoreIngredienten(ingredientenVan(r.id), [f('kaviaar', 1, 'stuk', 1)], NU) === 0));
  });
});

describe('planUitDatabase met frigo-voorrang (WEEK-188)', () => {
  const frigo = [f('spinazie', 200, 'g', 6), f('kokosmelk', 400, 'ml', 6), f('linzen', 500, 'g', 6)];
  const pool = testPool('nl', gezin);
  const planMet = (extra: Partial<PlanVerzoek> = {}) => {
    const plan = planUitDatabase(verzoek(extra), pool);
    if (!plan) throw new Error('er is een plan');
    return plan;
  };
  test('de recepten die opmaken wat in huis is, komen eerst; daarna de rest zonder dubbel recept', () => {
    const plan = planMet({ frigo });
    // Linzencurry (db-1) en Thaise kipcurry (db-6) gebruiken kokosmelk; die staan op de eerste twee dagen.
    assert.deepEqual(plan.dagen.slice(0, 2).map((d) => d.recept.id).sort(), ['db-1', 'db-6']);
    assert.equal(new Set(plan.dagen.map((d) => d.recept.id)).size, plan.dagen.length, 'geen dubbel recept');
  });
  test('zonder frigo verandert er niets', () => {
    assert.deepEqual(planMet({ frigo: [] }).dagen.map((d) => d.recept.id), planMet().dagen.map((d) => d.recept.id));
    assert.ok(planMet().dagen.every((d) => !d.uitFrigo));
  });
  test('uitFrigo blijft bewaard na opslaan en inlezen (oude plannen)', () => {
    const plan = planMet({ frigo });
    const metUitFrigo = { ...plan, dagen: plan.dagen.map((d, i) => (i === 0 ? { ...d, uitFrigo: ['linzen', 'kokosmelk', 'spinazie'] } : d)) };
    assert.deepEqual(normaliseerWeekplan(JSON.parse(JSON.stringify(metUitFrigo)))!.dagen[0].uitFrigo, ['linzen', 'kokosmelk', 'spinazie']);
  });
});

describe('frigoScoreIngredienten: vergelijkt op databankcode (WEEK-206)', () => {
  const frigo = [f('spinazie', 200, 'g', 3, { code: 'spinazie' })];
  test('een databankrecept in een andere taal herkent het product op zijn code', () => {
    assert.equal(frigoScoreIngredienten([{ naam: 'épinards', code: 'spinazie' }], frigo, NU), 4);
    assert.equal(frigoScoreIngredienten([{ naam: 'spinach', code: 'spinazie' }], frigo, NU), 4);
  });
  test('een oude catalogus-code en een naam in een andere taal koppelen ook (WEEK-205)', () => {
    const oud = [f('tomaten', 3, 'stuk', 2, { code: 'tomaten' })];
    assert.equal(frigoScoreIngredienten([{ naam: 'tomate', code: 'tomaat' }], oud, NU), 3);
    assert.equal(frigoScoreIngredienten([{ naam: 'Tomaat', code: 'tomaat' }], [f('tomate', 3, 'stuk', 2)], NU), 3);
  });
  test('verschillende codes met dezelfde naam tellen niet mee', () => {
    assert.equal(frigoScoreIngredienten([{ naam: 'spinazie', code: 'linzen' }], frigo, NU), 0);
  });
  test('zonder code blijft de naam het vangnet; een onbekende naam zonder product scoort 0', () => {
    assert.equal(frigoScoreIngredienten([{ naam: 'Mysterieus kruid' }], [f('mysterieus kruid', 1, 'stuk', 1)], NU), 2);
    assert.equal(frigoScoreIngredienten([{ naam: 'mysterieus kruid' }], [f('ander kruid', 1, 'stuk', 1)], NU), 0);
    assert.equal(frigoScoreNamen(['spinazie'], frigo, NU), 4);
  });
  test('losse producten tellen nooit mee (regressie WEEK-158)', () => {
    assert.equal(frigoScoreIngredienten([{ naam: 'spinazie', code: 'spinazie' }], [f('spinazie', 200, 'g', 3, { code: 'spinazie', bron: 'los' })], NU), 0);
  });
});
