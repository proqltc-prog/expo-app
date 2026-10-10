import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { aantalReceptRegels, itemsUitPlan, LijstItem, samenvoegen, vasteItems, vinkAf, voegPlanToe } from '@/lib/lijst';
import { VASTE_ITEMS } from '@/data/vasteItems';
import type { PlanDag, PlanRecept } from '@/lib/planner/types';

const recept = (naam: string, ingredienten: PlanRecept['ingredienten']): PlanRecept => ({
  id: naam, naam, soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten,
});

const dagen: PlanDag[] = [
  { dag: 'zondag', recept: recept('Pasta pesto', [
    { naam: 'pasta', hoeveelheid: 300, eenheid: 'g', afdeling: 'droge-voeding' },
    { naam: 'ui', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit' },
  ]) },
  { dag: 'maandag', recept: recept('Pasta tonijn', [
    { naam: 'Pasta', hoeveelheid: 200, eenheid: 'g', afdeling: 'droge-voeding' },
    { naam: 'brood', hoeveelheid: 240, eenheid: 'g', afdeling: 'brood' },
  ]) },
];

const AANTAL_VAST = VASTE_ITEMS.flatMap((c) => c.items).length;

describe('itemsUitPlan', () => {
  test('één item per ingrediënt per recept, gekoppeld aan dag en recept', () => {
    const items = itemsUitPlan(dagen);
    assert.equal(items.length, 4);
    assert.deepEqual(items[0].recept, { dag: 'zondag', naam: 'Pasta pesto' });
    assert.equal(items[0].afdeling, 'droge-voeding');
    assert.ok(items.every((i) => i.categorie === 'avondeten' && !i.afgevinkt));
    assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  });
});

describe('voegPlanToe (WEEK-15)', () => {
  test('zet alle ingrediënten van het plan en de vaste items op een lege lijst', () => {
    const lijst = voegPlanToe([], dagen, 'nl');
    assert.equal(lijst.filter((i) => i.recept).length, 4);
    // "brood" zit in een recept, dus het vaste item brood komt er niet apart bij
    assert.equal(lijst.filter((i) => !i.recept).length, AANTAL_VAST - 1);
    assert.equal(lijst.filter((i) => i.naam === 'brood').length, 1);
  });

  test('opnieuw overzetten geeft geen dubbels en behoudt vinkjes', () => {
    const eerst = voegPlanToe([], dagen, 'nl');
    const afgevinkt = vinkAf(eerst, [eerst[0].id], true);
    const opnieuw = voegPlanToe(afgevinkt, dagen, 'nl');
    assert.equal(opnieuw.length, eerst.length);
    assert.equal(opnieuw.find((i) => i.id === eerst[0].id)?.afgevinkt, true);
  });

  test('een nieuw plan vervangt de items van het vorige plan', () => {
    const eerst = voegPlanToe([], dagen, 'nl');
    const ander: PlanDag[] = [{ dag: 'zondag', recept: recept('Soep', [{ naam: 'prei', hoeveelheid: 2, eenheid: 'stuk', afdeling: 'groenten-fruit' }]) }];
    const lijst = voegPlanToe(eerst, ander, 'nl');
    assert.deepEqual(lijst.filter((i) => i.recept).map((i) => i.naam), ['prei']);
    assert.ok(!lijst.some((i) => i.naam.toLowerCase() === 'pasta'));
    // brood zit niet meer in een recept: nu komt het vaste item terug
    assert.ok(lijst.some((i) => i.id === 'brood-beleg-brood'));
  });

  test('zelf toegevoegde en gescande items blijven staan, met hun vinkje', () => {
    const eigen: LijstItem[] = [
      { id: 'extra-1', naam: 'kaarsjes', categorie: 'extra', afgevinkt: false },
      { id: 'scan-1', naam: 'Yoghurt', categorie: 'gescand', afgevinkt: true },
    ];
    const lijst = voegPlanToe(eigen, dagen, 'nl');
    assert.ok(lijst.some((i) => i.id === 'extra-1' && !i.afgevinkt));
    assert.ok(lijst.some((i) => i.id === 'scan-1' && i.afgevinkt));
  });

  test('een afgevinkt vast item blijft afgevinkt en komt er niet nog eens bij', () => {
    const eerst = voegPlanToe([], dagen, 'nl');
    const appels = eerst.find((i) => i.id === 'fruit-appels')!;
    const lijst = voegPlanToe(vinkAf(eerst, [appels.id], true), dagen, 'nl');
    const alleAppels = lijst.filter((i) => i.id === 'fruit-appels');
    assert.equal(alleAppels.length, 1);
    assert.equal(alleAppels[0].afgevinkt, true);
  });

  test('items uit een oudere versie zonder receptkoppeling worden vervangen', () => {
    const oud: LijstItem[] = [{ id: 'avondeten-rijst|g', naam: 'rijst', categorie: 'avondeten', afgevinkt: false, hoeveelheid: 300, eenheid: 'g' }];
    const lijst = voegPlanToe(oud, dagen, 'nl');
    assert.ok(!lijst.some((i) => i.naam === 'rijst'));
  });

  test('vaste items in de taal van de gebruiker', () => {
    assert.ok(voegPlanToe([], [], 'fr').some((i) => i.categorie === 'fruit' && i.naam === 'pommes'));
    assert.ok(vasteItems('de').some((i) => i.naam === 'Zahnpasta'));
  });
});

describe('samenvoegen', () => {
  test('telt hetzelfde ingrediënt met dezelfde eenheid samen (hoofdletterongevoelig)', () => {
    const regels = samenvoegen(itemsUitPlan(dagen));
    const pasta = regels.filter((r) => r.naam.toLowerCase() === 'pasta');
    assert.equal(pasta.length, 1);
    assert.equal(pasta[0].hoeveelheid, 500);
    assert.deepEqual(pasta[0].recepten, ['Pasta pesto', 'Pasta tonijn']);
    assert.equal(pasta[0].ids.length, 2);
  });

  test('verschillende eenheden worden niet opgeteld', () => {
    const items: LijstItem[] = [
      { id: 'a', naam: 'melk', categorie: 'avondeten', afgevinkt: false, hoeveelheid: 200, eenheid: 'ml' },
      { id: 'b', naam: 'melk', categorie: 'avondeten', afgevinkt: false, hoeveelheid: 1, eenheid: 'stuk' },
    ];
    assert.equal(samenvoegen(items).length, 2);
  });

  test('een regel is pas afgevinkt als alle onderliggende items afgevinkt zijn', () => {
    const items = itemsUitPlan(dagen);
    const pastaIds = items.filter((i) => i.naam.toLowerCase() === 'pasta').map((i) => i.id);
    const half = vinkAf(items, [pastaIds[0]], true);
    assert.equal(samenvoegen(half).find((r) => r.naam === 'pasta')!.afgevinkt, false);
    const heel = vinkAf(items, pastaIds, true);
    assert.equal(samenvoegen(heel).find((r) => r.naam === 'pasta')!.afgevinkt, true);
  });
});

describe('aantalReceptRegels', () => {
  test('telt verschillende ingrediënten uit de recepten', () => {
    assert.equal(aantalReceptRegels(voegPlanToe([], dagen, 'nl')), 3);
  });
});
