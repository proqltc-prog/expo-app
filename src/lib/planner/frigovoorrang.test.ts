import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { RECEPTENBANK } from '@/data/receptenbank';
import { FrigoItem, trekFrigoAf, verdeelFrigo } from '@/lib/frigo';
import { itemsUitPlan, voegPlanToe } from '@/lib/lijst';
import { frigoScore, frigoScoreIngredienten, frigoScoreNamen, kiesEersteDag, markeerUitFrigo } from '@/lib/planner/frigovoorrang';
import { planLokaal } from '@/lib/planner/lokaal';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
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
const bank = (id: string) => RECEPTENBANK.find((r) => r.id === id)!;

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

describe('frigoScore en kiesEersteDag', () => {
  test('een recept dat meer en oudere frigo-producten gebruikt, scoort hoger', () => {
    const frigo = [f('spinazie', 200, 'g', 5), f('kokosmelk', 400, 'ml', 1)];
    const linzen = frigoScore(bank('linzencurry'), frigo, 'nl', NU);
    const kip = frigoScore(bank('kipcurry'), frigo, 'nl', NU);
    assert.ok(linzen > kip, `${linzen} > ${kip}`);
    assert.equal(frigoScore(bank('pasta-pesto'), frigo, 'nl', NU), 0);
  });
  test('herkent producten in elke taal, los van de taal van het plan (WEEK-206)', () => {
    assert.ok(frigoScore(bank('linzencurry'), [f('épinards', 200, 'g', 2)], 'fr', NU) > 0);
    assert.ok(frigoScore(bank('linzencurry'), [f('épinards', 200, 'g', 2)], 'nl', NU) > 0);
    assert.ok(frigoScore(bank('linzencurry'), [f('Spinat', 200, 'g', 2)], 'en', NU) > 0);
  });
  test('kiest het recept dat het meest opmaakt; niets in de frigo = geen keuze', () => {
    const r = kiesEersteDag(RECEPTENBANK, [f('spinazie', 200, 'g', 5), f('kokosmelk', 400, 'ml', 5), f('linzen', 500, 'g', 5)], 'nl', NU);
    assert.equal(r?.id, 'linzencurry');
    assert.equal(kiesEersteDag(RECEPTENBANK, [], 'nl', NU), undefined);
    assert.equal(kiesEersteDag(RECEPTENBANK, [f('kaviaar', 1, 'stuk', 1)], 'nl', NU), undefined);
  });
});

describe('planLokaal met frigo-voorrang', () => {
  const frigo = [f('spinazie', 200, 'g', 6), f('kokosmelk', 400, 'ml', 6), f('linzen', 500, 'g', 6)];
  test('dag 1 maakt op wat het langst in huis is en toont wat uit de frigo komt', () => {
    const plan = planLokaal(verzoek({ frigo }));
    assert.equal(plan.dagen[0].recept.id, 'linzencurry');
    assert.deepEqual(plan.dagen[0].uitFrigo, ['linzen', 'kokosmelk', 'spinazie']);
    assert.equal(new Set(plan.dagen.map((d) => d.recept.id)).size, plan.dagen.length, 'geen dubbel recept');
  });
  test('zonder frigo verandert er niets', () => {
    assert.deepEqual(planLokaal(verzoek({ frigo: [] })).dagen.map((d) => d.recept.id), planLokaal(verzoek()).dagen.map((d) => d.recept.id));
    assert.ok(planLokaal(verzoek()).dagen.every((d) => !d.uitFrigo));
  });
  test('uitFrigo blijft bewaard na opslaan en inlezen', () => {
    const plan = planLokaal(verzoek({ frigo }));
    assert.deepEqual(normaliseerWeekplan(JSON.parse(JSON.stringify(plan)))!.dagen[0].uitFrigo, plan.dagen[0].uitFrigo);
  });
});

describe('markeerUitFrigo', () => {
  test('wat dag 1 opmaakt, is er niet meer voor dag 2', () => {
    const dag = (d: PlanDag['dag']): PlanDag => ({ dag: d, recept: { id: d, naam: d, soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten: [
      { naam: 'spinazie', hoeveelheid: 200, eenheid: 'g', afdeling: 'groenten-fruit' },
    ] } });
    const gemarkeerd = markeerUitFrigo([dag('zondag'), dag('maandag')], [f('spinazie', 200, 'g', 3)]);
    assert.deepEqual(gemarkeerd.map((d) => d.uitFrigo), [['spinazie'], undefined]);
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
