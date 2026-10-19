import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { KIND_PORTIE, porties, rondAf } from '@/lib/planner/hoeveelheid';
import { naarPlanRecept, planLokaal, soortenSchema, STANDAARD_AANTAL_DAGEN, toeval } from '@/lib/planner/lokaal';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import type { PlanVerzoek } from '@/lib/planner/types';
import { RECEPTENBANK } from '@/data/receptenbank';
import { Profiel, standaardProfiel } from '@/lib/profiel';

const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 2 };
const verzoek = (extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 42, ...extra,
});

describe('porties en afronden', () => {
  test('elk kind telt als een halve portie, het totaal wordt naar boven afgerond', () => {
    assert.equal(KIND_PORTIE, 0.5);
    assert.equal(porties(gezin), 3);
    assert.equal(porties({ ...standaardProfiel(), volwassenen: 2, kinderen: 1 }), 3);
    assert.equal(porties({ ...standaardProfiel(), volwassenen: 2 }), 2);
  });
  test('afronden naar winkelhoeveelheden', () => {
    assert.equal(rondAf(325, 'g'), 330);
    assert.equal(rondAf(48.75, 'g'), 50);
    assert.equal(rondAf(32, 'ml'), 30);
    assert.equal(rondAf(3, 'g'), 5);
    assert.equal(rondAf(0.5, 'stuk'), 1);
    assert.equal(rondAf(1.2, 'stuk'), 2);
    assert.equal(rondAf(1.625, 'stuk'), 2);
    assert.equal(rondAf(6.5, 'stuk'), 7);
    assert.equal(rondAf(0, 'g'), 0);
  });
});

describe('toeval', () => {
  test('is reproduceerbaar en ligt tussen 0 en 1', () => {
    const a = toeval(7), b = toeval(7);
    for (let i = 0; i < 20; i++) {
      const x = a();
      assert.equal(x, b());
      assert.ok(x >= 0 && x < 1);
    }
  });
});

describe('planLokaal', () => {
  test('standaard 6 dagen, zondag tot vrijdag', () => {
    const plan = planLokaal(verzoek());
    assert.equal(plan.dagen.length, STANDAARD_AANTAL_DAGEN);
    assert.deepEqual(plan.dagen.map((d) => d.dag), ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']);
    assert.equal(plan.bron, 'lokaal');
    assert.equal(plan.porties, 3);
  });

  test('volgt het gevraagde aantal dagen', () => {
    assert.equal(planLokaal(verzoek({ aantalDagen: 4 })).dagen.length, 4);
    assert.equal(planLokaal(verzoek()).dagen.length, 6);
    assert.equal(planLokaal(verzoek({ aantalDagen: 14 })).dagen.length, 7);
  });

  test('gevarieerd: geen recept dubbel en niet twee dagen na elkaar dezelfde basis', () => {
    for (let seed = 0; seed < 50; seed++) {
      const plan = planLokaal(verzoek({ seed }));
      const ids = plan.dagen.map((d) => d.recept.id);
      assert.equal(new Set(ids).size, ids.length, `seed ${seed}: dubbel recept`);
      for (let i = 1; i < plan.dagen.length; i++) {
        assert.notEqual(plan.dagen[i].recept.basis, plan.dagen[i - 1].recept.basis, `seed ${seed}: ${ids.join(',')}`);
      }
      const perBasis = new Map<string, number>();
      plan.dagen.forEach((d) => perBasis.set(d.recept.basis!, (perBasis.get(d.recept.basis!) ?? 0) + 1));
      assert.ok([...perBasis.values()].every((n) => n <= 2), `seed ${seed}: basis te vaak`);
    }
  });

  test('is reproduceerbaar met dezelfde seed', () => {
    const ids = (seed: number) => planLokaal(verzoek({ seed })).dagen.map((d) => d.recept.id);
    assert.deepEqual(ids(11), ids(11));
  });

  test('recepten en ingrediënten in de gekozen taal', () => {
    const plan = planLokaal(verzoek({ taal: 'de' }));
    const bank = RECEPTENBANK.find((r) => r.id === plan.dagen[0].recept.id)!;
    assert.equal(plan.dagen[0].recept.naam, bank.namen[2]);
  });
});

describe('naarPlanRecept', () => {
  test('rekent hoeveelheden om voor het gezin en rondt af', () => {
    const bolognaise = RECEPTENBANK.find((r) => r.id === 'bolognaise')!;
    const r = naarPlanRecept(bolognaise, 'nl', 3.25);
    const spaghetti = r.ingredienten.find((i) => i.naam === 'spaghetti')!;
    assert.equal(spaghetti.hoeveelheid, 330); // 100 g × 3,25 = 325 → 330
    assert.equal(spaghetti.afdeling, 'droge-voeding');
    const ui = r.ingredienten.find((i) => i.naam === 'ui')!;
    assert.equal(ui.hoeveelheid, 2); // 0,5 × 3,25 = 1,625 → 2
  });
});

describe('normaliseerWeekplan', () => {
  test('een gemaakt plan overleeft opslaan en inlezen', () => {
    const plan = planLokaal(verzoek());
    assert.deepEqual(normaliseerWeekplan(JSON.parse(JSON.stringify(plan))), plan);
  });
  test('de limietmelding (terugval + aiLimiet) blijft bewaard', () => {
    const plan = { ...planLokaal(verzoek()), terugval: true, aiLimiet: true };
    assert.deepEqual(normaliseerWeekplan(JSON.parse(JSON.stringify(plan))), plan);
  });
  test('onbruikbare data geeft null', () => {
    assert.equal(normaliseerWeekplan(null), null);
    assert.equal(normaliseerWeekplan({ dagen: [] }), null);
    assert.equal(normaliseerWeekplan({ dagen: [{ dag: 'maandag', recept: { naam: 'x', soort: 'vlees', ingredienten: [] } }] }), null);
  });
  test('slaat ongeldige dagen over en vult standaarden in', () => {
    const plan = normaliseerWeekplan({
      dagen: [
        { dag: 'maandag', recept: { naam: 'Soep', soort: 'vegetarisch', ingredienten: [{ naam: 'prei', hoeveelheid: 2, eenheid: 'stuk', afdeling: 'onbekend' }] } },
        { dag: 'blursday', recept: { naam: 'x', soort: 'vis', ingredienten: [{ naam: 'y' }] } },
      ],
    });
    assert.ok(plan);
    assert.equal(plan.dagen.length, 1);
    assert.equal(plan.dagen[0].recept.minuten, 30);
    assert.equal(plan.dagen[0].recept.ingredienten[0].afdeling, 'droge-voeding');
    assert.equal(plan.taal, 'nl');
  });
});

describe('kooktijd en stijl (WEEK-10)', () => {
  test('kooktijdVan: snel tot 20, gemiddeld tot 40, daarna uitgebreid', async () => {
    const { kooktijdVan } = await import('@/lib/planner/types');
    assert.equal(kooktijdVan(15), 'snel');
    assert.equal(kooktijdVan(20), 'snel');
    assert.equal(kooktijdVan(21), 'gemiddeld');
    assert.equal(kooktijdVan(40), 'gemiddeld');
    assert.equal(kooktijdVan(41), 'uitgebreid');
  });

  test('alleen "snel" geeft enkel recepten van maximaal 20 minuten', () => {
    for (let seed = 0; seed < 20; seed++) {
      const plan = planLokaal(verzoek({ seed, kooktijden: ['snel'] }));
      assert.ok(plan.dagen.every((d) => d.recept.minuten <= 20), `seed ${seed}`);
      assert.equal(plan.versoepeld, undefined);
      assert.deepEqual(plan.kooktijden, ['snel']);
    }
  });

  test('meerdere kooktijden tegelijk', () => {
    const plan = planLokaal(verzoek({ kooktijden: ['snel', 'uitgebreid'] }));
    assert.ok(plan.dagen.every((d) => d.recept.minuten <= 20 || d.recept.minuten > 40));
  });

  test('stijl: elk recept heeft minstens één gekozen stijl als er genoeg zijn', () => {
    for (let seed = 0; seed < 20; seed++) {
      const plan = planLokaal(verzoek({ seed, stijlen: ['italiaans', 'mediterraan'] }));
      assert.ok(plan.dagen.every((d) => d.recept.stijlen.some((s) => s === 'italiaans' || s === 'mediterraan')), `seed ${seed}`);
      assert.equal(plan.versoepeld, undefined);
    }
  });

  test('filterOpKeuzes vult eerst aan met recepten die de kooktijd halen', async () => {
    const { filterOpKeuzes } = await import('@/lib/planner/lokaal');
    const { recepten, versoepeld } = filterOpKeuzes([...RECEPTENBANK], ['snel'], ['mediterraan'], 5);
    assert.ok(versoepeld);
    assert.equal(recepten.length, 5);
    assert.ok(recepten.every((r) => r.minuten <= 20));
  });

  test('zonder keuzes geldt alles en wordt niets versoepeld', async () => {
    const { filterOpKeuzes } = await import('@/lib/planner/lokaal');
    const { recepten, versoepeld } = filterOpKeuzes([...RECEPTENBANK], [], [], 7);
    assert.equal(recepten.length, RECEPTENBANK.length);
    assert.equal(versoepeld, false);
  });

  test('bewaarde keuzes worden veilig ingelezen', async () => {
    const { normaliseerKeuzes } = await import('@/lib/planner/normaliseer');
    // 'licht' is verwijderd (WEEK-78): een bewaarde keuze 'licht' valt weg, net als de onbekende 'thai'.
    assert.deepEqual(normaliseerKeuzes({ kooktijden: ['uitgebreid', 'x', 'snel'], stijlen: ['licht', 'thai'] }), {
      kooktijden: ['snel', 'uitgebreid'],
      stijlen: [],
      vermijd: [],
      aantalDagen: 6,
      momenten: ['avond'],
    });
    assert.deepEqual(normaliseerKeuzes(null), { kooktijden: [], stijlen: [], vermijd: [], aantalDagen: 6, momenten: ['avond'] });
  });
});

describe('oude plannen na het verwijderen van favorieten (WEEK-72)', () => {
  test('een opgeslagen plan met bron favorieten blijft leesbaar en valt terug op lokaal', () => {
    const plan = planLokaal({ kooktijden: [], stijlen: [], profiel: { ...standaardProfiel(), volwassenen: 2 }, taal: 'nl', seed: 3 });
    const oud = { ...JSON.parse(JSON.stringify(plan)), bron: 'favorieten' };
    const gelezen = normaliseerWeekplan(oud);
    assert.ok(gelezen, 'het plan wordt niet weggegooid');
    assert.equal(gelezen.bron, 'lokaal');
    assert.equal(gelezen.dagen.length, plan.dagen.length);
  });
});
