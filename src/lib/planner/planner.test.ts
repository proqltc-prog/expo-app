import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { leesOpdracht } from '@/lib/planner/opdracht';
import { KIND_PORTIE, porties, rondAf } from '@/lib/planner/hoeveelheid';
import { naarPlanRecept, planLokaal, soortenSchema, STANDAARD_AANTAL_DAGEN, toeval } from '@/lib/planner/lokaal';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import type { PlanVerzoek } from '@/lib/planner/types';
import { RECEPTENBANK } from '@/data/receptenbank';
import { Profiel, standaardProfiel } from '@/lib/profiel';

const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 2 };
const verzoek = (opdracht: string, extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  opdracht, kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 42, ...extra,
});

describe('leesOpdracht', () => {
  test('aantal dagen in cijfers en woorden, in verschillende talen', () => {
    assert.equal(leesOpdracht('Plan 5 dagen').aantalDagen, 5);
    assert.equal(leesOpdracht('vijf dagen graag').aantalDagen, 5);
    assert.equal(leesOpdracht('Plan for 4 days').aantalDagen, 4);
    assert.equal(leesOpdracht('trois jours sans viande').aantalDagen, 3);
    assert.equal(leesOpdracht('für 7 Tage').aantalDagen, 7);
    assert.equal(leesOpdracht('para cinco días').aantalDagen, 5);
    assert.equal(leesOpdracht('para quatro dias').aantalDagen, 4);
  });
  test('aantal dagen wordt begrensd tot 1–7', () => {
    assert.equal(leesOpdracht('14 dagen').aantalDagen, 7);
    assert.equal(leesOpdracht('0 dagen').aantalDagen, 1);
    assert.equal(leesOpdracht('lekker eten').aantalDagen, undefined);
  });
  test('geen vlees / vegetarisch in alle talen', () => {
    for (const t of ['geen vlees', 'vegetarisch', 'no meat', 'vegetarian week', 'sans viande', 'végétarien', 'ohne Fleisch', 'sin carne', 'sem carne']) {
      assert.ok(leesOpdracht(t).zonderVlees, t);
    }
    assert.ok(!leesOpdracht('veel vlees').zonderVlees);
  });
  test('zonder vis, meer vis, snel, gezond, goedkoop', () => {
    assert.ok(leesOpdracht('geen vis aub').zonderVis);
    assert.ok(leesOpdracht('ohne Fisch').zonderVis);
    assert.ok(leesOpdracht('wat meer vis deze week').meerVis);
    assert.ok(leesOpdracht('snel klaar').snel);
    assert.ok(leesOpdracht('quick dinners').snel);
    assert.ok(leesOpdracht('let op de Nutri-score').gezond);
    assert.ok(leesOpdracht('gezond en gevarieerd').gezond);
    assert.ok(leesOpdracht('goedkoop').goedkoop);
    assert.ok(leesOpdracht('pas cher').goedkoop);
  });
});

describe('porties en afronden', () => {
  test('elk kind telt als een halve portie, het totaal wordt naar boven afgerond', () => {
    assert.equal(KIND_PORTIE, 0.5);
    assert.equal(porties(gezin), 3);
    assert.equal(porties({ ...standaardProfiel(), volwassenen: 2, kinderen: 1 }), 3);
    assert.equal(porties(standaardProfiel()), 2);
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

describe('soortenSchema', () => {
  test('wisselt vlees, vegetarisch en vis af', () => {
    assert.deepEqual(soortenSchema(leesOpdracht(''), 6), ['vlees', 'vegetarisch', 'vis', 'vlees', 'vegetarisch', 'vis']);
  });
  test('geen vlees en geen vis laat enkel vegetarisch over', () => {
    assert.deepEqual(soortenSchema(leesOpdracht('geen vlees en geen vis'), 3), ['vegetarisch', 'vegetarisch', 'vegetarisch']);
  });
  test('meer vis zet vis vaker in het schema', () => {
    const schema = soortenSchema(leesOpdracht('meer vis'), 8);
    assert.equal(schema.filter((s) => s === 'vis').length, 4);
  });
});

describe('planLokaal', () => {
  test('standaard 6 dagen, zondag tot vrijdag', () => {
    const plan = planLokaal(verzoek(''));
    assert.equal(plan.dagen.length, STANDAARD_AANTAL_DAGEN);
    assert.deepEqual(plan.dagen.map((d) => d.dag), ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']);
    assert.equal(plan.bron, 'lokaal');
    assert.equal(plan.porties, 3);
  });

  test('volgt het gevraagde aantal dagen', () => {
    assert.equal(planLokaal(verzoek('plan 4 dagen')).dagen.length, 4);
    assert.equal(planLokaal(verzoek('7 days please')).dagen.length, 7);
  });

  test('nooit vlees als de opdracht "geen vlees" zegt', () => {
    for (let seed = 0; seed < 30; seed++) {
      const plan = planLokaal(verzoek('7 dagen geen vlees', { seed }));
      assert.ok(plan.dagen.every((d) => d.recept.soort !== 'vlees'), `seed ${seed}`);
    }
  });

  test('nooit vis als de opdracht "geen vis" zegt', () => {
    for (let seed = 0; seed < 30; seed++) {
      const plan = planLokaal(verzoek('geen vis', { seed }));
      assert.ok(plan.dagen.every((d) => d.recept.soort !== 'vis'), `seed ${seed}`);
    }
  });

  test('gevarieerd: geen recept dubbel en niet twee dagen na elkaar dezelfde basis', () => {
    for (let seed = 0; seed < 50; seed++) {
      const plan = planLokaal(verzoek('7 dagen', { seed }));
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

  test('"snel" kiest vooral recepten van maximaal 20 minuten', () => {
    const plan = planLokaal(verzoek('snel klaar', { seed: 3 }));
    const snel = plan.dagen.filter((d) => d.recept.minuten <= 20).length;
    assert.ok(snel >= 4, `slechts ${snel} snelle recepten`);
    assert.ok(plan.dagen.every((d) => d.recept.minuten <= 30));
  });

  test('"goedkoop" vermijdt dure ingrediënten', () => {
    for (let seed = 0; seed < 20; seed++) {
      const plan = planLokaal(verzoek('goedkoop', { seed }));
      const namen = plan.dagen.flatMap((d) => d.recept.ingredienten.map((i) => i.naam));
      assert.ok(!namen.includes('stoofvlees') && !namen.includes('zalmfilet'), `seed ${seed}`);
    }
  });

  test('is reproduceerbaar met dezelfde seed', () => {
    const ids = (seed: number) => planLokaal(verzoek('', { seed })).dagen.map((d) => d.recept.id);
    assert.deepEqual(ids(11), ids(11));
  });

  test('recepten en ingrediënten in de gekozen taal', () => {
    const plan = planLokaal(verzoek('', { taal: 'de' }));
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
    const plan = planLokaal(verzoek('5 dagen'));
    assert.deepEqual(normaliseerWeekplan(JSON.parse(JSON.stringify(plan))), plan);
  });
  test('de limietmelding (terugval + aiLimiet) blijft bewaard', () => {
    const plan = { ...planLokaal(verzoek('2 dagen')), terugval: true, aiLimiet: true };
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
      const plan = planLokaal(verzoek('', { seed, kooktijden: ['snel'] }));
      assert.ok(plan.dagen.every((d) => d.recept.minuten <= 20), `seed ${seed}`);
      assert.equal(plan.versoepeld, undefined);
      assert.deepEqual(plan.kooktijden, ['snel']);
    }
  });

  test('meerdere kooktijden tegelijk', () => {
    const plan = planLokaal(verzoek('7 dagen', { kooktijden: ['snel', 'uitgebreid'] }));
    assert.ok(plan.dagen.every((d) => d.recept.minuten <= 20 || d.recept.minuten > 40));
  });

  test('stijl: elk recept heeft minstens één gekozen stijl als er genoeg zijn', () => {
    for (let seed = 0; seed < 20; seed++) {
      const plan = planLokaal(verzoek('', { seed, stijlen: ['italiaans', 'mediterraan'] }));
      assert.ok(plan.dagen.every((d) => d.recept.stijlen.some((s) => s === 'italiaans' || s === 'mediterraan')), `seed ${seed}`);
      assert.equal(plan.versoepeld, undefined);
    }
  });

  test('te strenge keuze: planner versoepelt, meldt het, maar houdt "geen vlees" altijd aan', () => {
    const plan = planLokaal(verzoek('7 dagen geen vlees', { kooktijden: ['uitgebreid'], stijlen: ['mexicaans'] }));
    assert.equal(plan.dagen.length, 7);
    assert.equal(plan.versoepeld, true);
    assert.ok(plan.dagen.every((d) => d.recept.soort !== 'vlees'));
  });

  test('filterOpKeuzes vult eerst aan met recepten die de kooktijd halen', async () => {
    const { filterOpKeuzes } = await import('@/lib/planner/lokaal');
    const { recepten, versoepeld } = filterOpKeuzes([...RECEPTENBANK], ['snel'], ['comfort'], 4);
    assert.ok(versoepeld);
    assert.equal(recepten.length, 4);
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
    assert.deepEqual(normaliseerKeuzes({ kooktijden: ['uitgebreid', 'x', 'snel'], stijlen: ['licht', 'thai'] }), {
      kooktijden: ['snel', 'uitgebreid'],
      stijlen: ['licht'],
    });
    assert.deepEqual(normaliseerKeuzes(null), { kooktijden: [], stijlen: [] });
  });
});
