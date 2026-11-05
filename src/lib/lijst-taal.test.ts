import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { lijstInTaal, itemsUitPlan, LijstItem, voegPlanToe } from '@/lib/lijst';
import type { PlanDag } from '@/lib/planner/types';

/** Een databankrecept op maandag, met vaste codes en namen per taal (WEEK-154). */
const dagen: PlanDag[] = [
  {
    dag: 'maandag',
    recept: {
      id: 'db-42',
      naam: 'Risotto met champignons',
      soort: 'vegetarisch',
      minuten: 30,
      stijlen: [],
      titels: { nl: 'Risotto met champignons', fr: 'Risotto aux champignons' },
      ingredienten: [
        { naam: 'champignons', hoeveelheid: 300, eenheid: 'g', afdeling: 'groenten-fruit', code: 'champignons', namen: { nl: 'champignons', fr: 'champignons de Paris' } },
      ],
    },
  },
];

describe('itemsUitPlan met vaste codes', () => {
  test('het id volgt de code, niet de taalafhankelijke naam', () => {
    const [nl] = itemsUitPlan(dagen, 'x');
    const [fr] = itemsUitPlan([{ ...dagen[0], recept: { ...dagen[0].recept, ingredienten: [{ ...dagen[0].recept.ingredienten[0], naam: 'champignons de Paris' }] } }], 'x');
    assert.equal(nl.id, fr.id);
    assert.equal(nl.id, 'recept-x-maandag-champignons-g');
  });

  test('oude plannen zonder code houden het id op basis van de naam', () => {
    const oud: PlanDag[] = [{ dag: 'maandag', recept: { ...dagen[0].recept, ingredienten: [{ naam: 'Ui', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit' }] } }];
    assert.equal(itemsUitPlan(oud)[0].id, 'recept-maandag-ui-stuk');
  });
});

describe('voegPlanToe in de gekozen taal', () => {
  test('nieuwe items krijgen de ingrediëntnaam in de gekozen taal', () => {
    const [item] = voegPlanToe([], dagen, 'fr', undefined, 'x');
    assert.equal(item.naam, 'champignons de Paris');
    assert.equal(item.recept?.naam, 'Risotto met champignons', 'de opgeslagen recept-naam blijft de sleutel');
  });
});

describe('lijstInTaal', () => {
  const nl = itemsUitPlan(dagen, 'x');
  const afgevinkt: LijstItem[] = nl.map((i) => ({ ...i, afgevinkt: true, hoeveelheid: 250 }));

  test('zet de namen op de nieuwe taal en behoudt afvinkstatus en hoeveelheid', () => {
    const [item] = lijstInTaal(afgevinkt, dagen, 'fr', 'x');
    assert.equal(item.naam, 'champignons de Paris');
    assert.equal(item.afgevinkt, true);
    assert.equal(item.hoeveelheid, 250);
  });

  test('geeft dezelfde lijst terug als de namen al kloppen', () => {
    assert.equal(lijstInTaal(nl, dagen, 'nl', 'x'), nl);
  });

  test('raakt items van andere bronnen (vaste items, zonder recept) niet aan', () => {
    const vast: LijstItem = { id: 'fruit-appel', naam: 'Appel', categorie: 'fruit', afgevinkt: false };
    const [, andere] = lijstInTaal([...nl, vast], dagen, 'fr', 'x');
    assert.deepEqual(andere, vast);
  });

  test('verandert de bewaarde lijst niet: vertalen is enkel weergave (WEEK-207)', () => {
    const bewaard = nl.map((i) => ({ ...i }));
    const fr = lijstInTaal(nl, dagen, 'fr', 'x');
    assert.deepEqual(nl, bewaard);
    assert.notEqual(fr[0].naam, nl[0].naam);
  });

  test('een lijst in een andere taal dan het toestel blijft op zijn id koppelen (gezin met meerdere talen, WEEK-207)', () => {
    // Het andere toestel heeft de lijst in het Frans bewaard; dit toestel toont ze in het Nederlands, zonder te herschrijven.
    const fr = lijstInTaal(nl, dagen, 'fr', 'x');
    const terug = lijstInTaal(fr, dagen, 'nl', 'x');
    assert.deepEqual(terug.map((i) => [i.id, i.naam]), nl.map((i) => [i.id, i.naam]));
    assert.deepEqual(lijstInTaal(fr, dagen, 'fr', 'x'), fr);
  });
});
