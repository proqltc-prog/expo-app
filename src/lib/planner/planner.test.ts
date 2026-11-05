import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { rondAf } from '@/lib/planner/hoeveelheid';
import { KIND_FACTOR, schaalFactor } from '@/lib/schaal';
import { toeval } from '@/lib/planner/toeval';
import { naarPlanRecept } from '@/lib/planner/db';
import { maakDbPool, planUitDatabase } from '@/lib/planner/dbplan';
import { PERIODE_STANDAARD } from '@/lib/planner/periode';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import type { PlanVerzoek } from '@/lib/planner/types';
import { testPool, testRecept, TESTRECEPTEN } from '@/lib/planner/testrecepten';
import { Profiel, standaardProfiel } from '@/lib/profiel';

const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 2 };
const verzoek = (extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 42, ...extra,
});
const pool = testPool('nl', gezin);
const planVan = (extra: Partial<PlanVerzoek> = {}) => {
  const plan = planUitDatabase(verzoek(extra), maakDbPool([...TESTRECEPTEN], extra.taal ?? 'nl', extra.profiel ?? gezin));
  if (!plan) throw new Error('er is een plan');
  return plan;
};

describe('porties en afronden', () => {
  test('elk kind telt als een halve portie, de factor wordt niet naar boven afgerond (WEEK-119)', () => {
    assert.equal(KIND_FACTOR, 0.5);
    assert.equal(schaalFactor(gezin), 3);
    assert.equal(schaalFactor({ ...standaardProfiel(), volwassenen: 2, kinderen: 1 }), 2.5);
    assert.equal(schaalFactor({ ...standaardProfiel(), volwassenen: 2 }), 2);
  });
  test('een databankrecept wordt per ingrediënt met de gezinsfactor geschaald en afgerond (WEEK-119)', () => {
    const profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 1 };
    const recept = TESTRECEPTEN[0];
    const plan = naarPlanRecept(recept, 'nl', profiel)!;
    recept.ingredienten.forEach(({ code, hoeveelheid, eenheid }, i) => {
      assert.equal(plan.ingredienten[i].hoeveelheid, rondAf(hoeveelheid * 2.5, eenheid), `ingrediënt ${code}`);
    });
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

describe('planUitDatabase (WEEK-208: de enige planner)', () => {
  test('standaard 6 dagen, zondag tot vrijdag, bron db en porties voor het gezin', () => {
    const plan = planVan();
    assert.equal(plan.dagen.length, PERIODE_STANDAARD);
    assert.deepEqual(plan.dagen.map((d) => d.dag), ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']);
    assert.equal(plan.bron, 'db');
    assert.equal(plan.porties, 3);
  });

  test('volgt het gevraagde aantal dagen', () => {
    assert.equal(planVan({ aantalDagen: 4 }).dagen.length, 4);
    assert.equal(planVan().dagen.length, 6);
    assert.equal(planVan({ aantalDagen: 14 }).dagen.length, 7);
  });

  test('gevarieerd: geen recept dubbel zolang er genoeg recepten zijn', () => {
    for (let seed = 0; seed < 50; seed++) {
      const plan = planVan({ seed });
      const ids = plan.dagen.map((d) => d.recept.id);
      assert.equal(new Set(ids).size, ids.length, `seed ${seed}: dubbel recept`);
    }
  });

  test('is reproduceerbaar met dezelfde seed', () => {
    const ids = (seed: number) => planVan({ seed }).dagen.map((d) => d.recept.id);
    assert.deepEqual(ids(11), ids(11));
  });

  test('recepten en ingrediënten in de gekozen taal', () => {
    const plan = planVan({ taal: 'de' });
    const db = testRecept(Number(plan.dagen[0].recept.id.replace('db-', '')));
    assert.equal(plan.dagen[0].recept.naam, db.titels.de);
    assert.equal(plan.dagen[0].recept.ingredienten[0].naam, db.ingredienten[0].namen.de);
  });

  test('zonder recepten is er geen plan', () => {
    assert.equal(planUitDatabase(verzoek(), []), undefined);
  });
});

describe('naarPlanRecept (databank)', () => {
  test('rekent hoeveelheden om voor het gezin en rondt af', () => {
    const bolognaise = testRecept(7);
    const r = naarPlanRecept(bolognaise, 'nl', { volwassenen: 3, kinderen: 0 })!;
    const spaghetti = r.ingredienten.find((i) => i.code === 'pasta_spaghetti')!;
    assert.equal(spaghetti.naam, 'spaghetti');
    assert.equal(spaghetti.hoeveelheid, 300); // 100 g × 3
    assert.equal(spaghetti.afdeling, 'droge-voeding');
    const ui = r.ingredienten.find((i) => i.code === 'ui')!;
    assert.equal(ui.hoeveelheid, 2); // 0,5 × 3 = 1,5 → 2
    assert.equal(ui.afdeling, 'groenten-fruit');
  });
});

describe('normaliseerWeekplan', () => {
  test('een gemaakt plan overleeft opslaan en inlezen', () => {
    const plan = planVan();
    // Velden zonder waarde (vermijd, versoepeld) vallen bij het opslaan weg; al de rest komt onveranderd terug.
    const opgeslagen = JSON.parse(JSON.stringify(plan));
    assert.deepEqual(normaliseerWeekplan(opgeslagen), opgeslagen);
    assert.deepEqual(normaliseerWeekplan(opgeslagen)?.dagen, plan.dagen);
  });
  test('oude AI-vlaggen (terugval, aiLimiet) en bron ai worden niet meer bewaard (WEEK-116)', () => {
    const oud = { ...planVan(), bron: 'ai', terugval: true, aiLimiet: true };
    const gelezen = normaliseerWeekplan(JSON.parse(JSON.stringify(oud)));
    assert.equal(gelezen?.bron, 'lokaal');
    assert.ok(!('terugval' in (gelezen ?? {})));
    assert.ok(!('aiLimiet' in (gelezen ?? {})));
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
    // WEEK-201: een onbekende afdeling blijft weg; het ingrediënt komt dan onder "overig" (voorheen droge voeding).
    assert.equal(plan.dagen[0].recept.ingredienten[0].afdeling, undefined);
    assert.equal('afdeling' in plan.dagen[0].recept.ingredienten[0], false);
    assert.equal(plan.taal, 'nl');
  });
});

describe('kooktijd en stijl (WEEK-10)', () => {
  test('kooktijdVan: snel tot 30, gemiddeld tot 45, daarna uitgebreid (WEEK-199)', async () => {
    const { kooktijdVan } = await import('@/lib/planner/types');
    assert.equal(kooktijdVan(15), 'snel');
    assert.equal(kooktijdVan(30), 'snel');
    assert.equal(kooktijdVan(31), 'gemiddeld');
    assert.equal(kooktijdVan(45), 'gemiddeld');
    assert.equal(kooktijdVan(46), 'uitgebreid');
    assert.equal(kooktijdVan(60), 'uitgebreid');
  });

  test('alleen "snel" geeft enkel recepten van maximaal 30 minuten zolang er genoeg zijn', () => {
    // Zes snelle testrecepten: genoeg voor zes dagen zonder versoepelen.
    for (let seed = 0; seed < 20; seed++) {
      const plan = planVan({ seed, kooktijden: ['snel'] });
      assert.ok(plan.dagen.every((d) => d.recept.minuten <= 30), `seed ${seed}`);
      assert.equal(plan.versoepeld, undefined);
      assert.deepEqual(plan.kooktijden, ['snel']);
    }
  });

  test('meerdere kooktijden tegelijk', () => {
    const plan = planVan({ kooktijden: ['snel', 'uitgebreid'] });
    assert.ok(plan.dagen.every((d) => d.recept.minuten <= 30 || d.recept.minuten > 45));
  });

  test('WEEK-199: een recept van meer dan een uur komt nooit in de pool, en dus nooit op het weekmenu', () => {
    const teLang = { ...testRecept(8), id: 99, kooktijdMin: 61 };
    const pool = maakDbPool([...TESTRECEPTEN, teLang], 'nl', gezin);
    assert.ok(pool.every((k) => k.recept.id !== 'db-99'));
    for (let seed = 0; seed < 20; seed++) {
      const plan = planUitDatabase(verzoek({ seed, kooktijden: ['uitgebreid'] }), pool)!;
      assert.ok(plan.dagen.every((d) => d.recept.minuten <= 60), `seed ${seed}`);
    }
  });

  test('stijl: elk recept heeft minstens één gekozen stijl als er genoeg zijn', () => {
    // Italiaans + mediterraan: vier testrecepten, genoeg voor vier dagen.
    for (let seed = 0; seed < 20; seed++) {
      const plan = planVan({ seed, aantalDagen: 4, stijlen: ['italiaans', 'mediterraan'] });
      assert.ok(plan.dagen.every((d) => d.recept.stijlen.some((s) => s === 'italiaans' || s === 'mediterraan')), `seed ${seed}`);
      assert.equal(plan.versoepeld, undefined);
    }
  });

  test('te weinig recepten voor de wensen: de planner versoepelt eerst de stijl en houdt de kooktijd aan', () => {
    // Snel + mediterraan: één testrecept (couscous). De andere dagen krijgen snelle recepten van een andere stijl.
    const plan = planVan({ aantalDagen: 5, kooktijden: ['snel'], stijlen: ['mediterraan'] });
    assert.equal(plan.versoepeld, true);
    assert.equal(plan.dagen.length, 5);
    assert.ok(plan.dagen.every((d) => d.recept.minuten <= 30));
    assert.ok(plan.dagen.some((d) => d.recept.stijlen.includes('mediterraan')));
  });

  test('zonder keuzes geldt alles en wordt niets versoepeld', () => {
    const plan = planVan({ aantalDagen: 7 });
    assert.equal(plan.versoepeld, undefined);
    assert.equal(plan.dagen.length, 7);
    assert.equal(pool.length, TESTRECEPTEN.length);
  });

  test('bewaarde keuzes worden veilig ingelezen', async () => {
    const { normaliseerKeuzes } = await import('@/lib/planner/normaliseer');
    // 'licht' is verwijderd (WEEK-78): een bewaarde keuze 'licht' valt weg, net als de onbekende 'thai'.
    // WEEK-199: de oude kooktijd 'verfijnd' wordt gemiddeld en uitgebreid.
    assert.deepEqual(normaliseerKeuzes({ kooktijden: ['verfijnd'], stijlen: [] }).kooktijden, ['gemiddeld', 'uitgebreid']);
    assert.deepEqual(normaliseerKeuzes({ kooktijden: ['uitgebreid', 'x', 'snel'], stijlen: ['licht', 'thai'] }), {
      kooktijden: ['snel', 'uitgebreid'],
      stijlen: [],
      vermijd: [],
      enkelVegetarisch: false,
      aantalDagen: 6,
      momenten: ['avond'],
      datums: [],
      uitgesloten: [],
    });
    assert.deepEqual(normaliseerKeuzes(null), { kooktijden: [], stijlen: [], vermijd: [], enkelVegetarisch: false, aantalDagen: 6, momenten: ['avond'], datums: [], uitgesloten: [] });
  });
});

describe('oude plannen na het verwijderen van favorieten (WEEK-72) en de lokale planner (WEEK-208)', () => {
  test('een opgeslagen plan met bron favorieten of lokaal blijft leesbaar en krijgt bron lokaal', () => {
    const plan = planVan({ profiel: { ...standaardProfiel(), volwassenen: 2 }, seed: 3 });
    for (const bron of ['favorieten', 'lokaal']) {
      const oud = { ...JSON.parse(JSON.stringify(plan)), bron };
      const gelezen = normaliseerWeekplan(oud);
      assert.ok(gelezen, 'het plan wordt niet weggegooid');
      assert.equal(gelezen.bron, 'lokaal');
      assert.equal(gelezen.dagen.length, plan.dagen.length);
    }
  });
});
