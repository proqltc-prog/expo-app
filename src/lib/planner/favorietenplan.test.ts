import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { StijlCode, Soort } from '@/data/receptenbank';
import type { Favoriet } from '@/lib/favorieten';
import type { FrigoItem } from '@/lib/frigo';
import { passendeFavorieten, planUitFavorieten, resetDagUitFavorieten } from '@/lib/planner/favorietenplan';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import type { PlanVerzoek } from '@/lib/planner/types';
import { Profiel, standaardProfiel } from '@/lib/profiel';

const fav = (naam: string, extra: { soort?: Soort; minuten?: number; stijlen?: StijlCode[]; ingredienten?: string[] } = {}): Favoriet => ({
  id: `fav:${naam}`, naam, soort: extra.soort ?? 'vegetarisch', stijlen: extra.stijlen ?? ['klassiek'], minuten: extra.minuten ?? 25,
  ingredienten: (extra.ingredienten ?? ['ui']).map((n) => ({ naam: n, hoeveelheid: 300, eenheid: 'g', afdeling: 'groenten-fruit' as const })),
  personen: 4, porties: 3, opgeslagenOp: '2026-10-01T10:00:00.000Z',
});
const kookboek = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((n) => fav(n));
const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: [7, 4] }; // 3 porties
const verzoek = (extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  opdracht: '', kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 7, ...extra,
});
const namen = (p: { dagen: { recept: { naam: string } }[] } | null) => (p?.dagen ?? []).map((d) => d.recept.naam);

describe('planUitFavorieten (WEEK-14)', () => {
  test('een week uit het kookboek: standaard 6 dagen, geen herhaling, bron favorieten', () => {
    const plan = planUitFavorieten(kookboek, verzoek())!;
    assert.equal(plan.dagen.length, 6);
    assert.equal(new Set(namen(plan)).size, 6);
    assert.ok(namen(plan).every((n) => kookboek.some((f) => f.naam === n)));
    assert.equal(plan.bron, 'favorieten');
    assert.deepEqual(plan.dagen.map((d) => d.dag), ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']);
  });

  test('willekeurig, maar reproduceerbaar met dezelfde seed', () => {
    assert.deepEqual(namen(planUitFavorieten(kookboek, verzoek({ seed: 1 }))), namen(planUitFavorieten(kookboek, verzoek({ seed: 1 }))));
    const varianten = new Set([1, 2, 3, 4, 5].map((seed) => namen(planUitFavorieten(kookboek, verzoek({ seed }))).join()));
    assert.ok(varianten.size > 1);
  });

  test('aantal dagen uit de opdracht', () => {
    assert.equal(planUitFavorieten(kookboek, verzoek({ opdracht: '3 dagen' }))!.dagen.length, 3);
  });

  test('niet hetzelfde als vorige week', () => {
    const vorige = planUitFavorieten(kookboek, verzoek({ opdracht: '4 dagen', seed: 3 }));
    const deze = planUitFavorieten(kookboek, verzoek({ opdracht: '4 dagen', seed: 9 }), vorige)!;
    assert.ok(namen(deze).every((n) => !namen(vorige).includes(n)), `${namen(deze)} vs ${namen(vorige)}`);
    assert.equal(deze.herhaald, undefined);
  });

  test('te weinig andere favorieten: toch herhalen, met melding', () => {
    const vorige = planUitFavorieten(kookboek, verzoek({ seed: 3 }));
    const deze = planUitFavorieten(kookboek, verzoek({ seed: 9 }), vorige)!;
    assert.equal(deze.dagen.length, 6);
    assert.equal(new Set(namen(deze)).size, 6, 'binnen de week nooit dubbel');
    assert.equal(deze.herhaald, true);
    // eerst de twee die vorige week niet op het menu stonden
    const nieuw = kookboek.map((f) => f.naam).filter((n) => !namen(vorige).includes(n));
    assert.ok(nieuw.every((n) => namen(deze).includes(n)));
  });

  test('te weinig favorieten voor de week: minder dagen, met melding', () => {
    const plan = planUitFavorieten(kookboek.slice(0, 2), verzoek())!;
    assert.equal(plan.dagen.length, 2);
    assert.equal(plan.kort, true);
  });

  test('geen enkele passende favoriet = geen plan', () => {
    assert.equal(planUitFavorieten([], verzoek()), null);
    assert.equal(planUitFavorieten([fav('Stoofvlees', { soort: 'vlees' })], verzoek({ opdracht: 'geen vlees' })), null);
  });

  test('harde wensen: geen vlees of vis betekent nooit vlees of vis', () => {
    const boek = [...kookboek.slice(0, 3), fav('Steak', { soort: 'vlees' }), fav('Zalm', { soort: 'vis' })];
    const plan = planUitFavorieten(boek, verzoek({ opdracht: 'geen vlees en geen vis' }))!;
    assert.ok(namen(plan).every((n) => n !== 'Steak' && n !== 'Zalm'));
  });

  test('kooktijd en stijl filteren; te weinig = eerst stijl en dan kooktijd loslaten, met melding', () => {
    const boek = [
      fav('Snel Italiaans', { minuten: 15, stijlen: ['italiaans'] }),
      fav('Snel Aziatisch', { minuten: 15, stijlen: ['aziatisch'] }),
      fav('Traag Italiaans', { minuten: 90, stijlen: ['italiaans'] }),
    ];
    const precies = planUitFavorieten(boek, verzoek({ opdracht: '1 dag', kooktijden: ['snel'], stijlen: ['italiaans'] }))!;
    assert.deepEqual(namen(precies), ['Snel Italiaans']);
    assert.equal(precies.versoepeld, undefined);
    const ruimer = passendeFavorieten(boek, { opdracht: '', kooktijden: ['snel'], stijlen: ['italiaans'] }, 3);
    assert.deepEqual(ruimer.favorieten.map((f) => f.naam), ['Snel Italiaans', 'Snel Aziatisch', 'Traag Italiaans']);
    assert.equal(ruimer.versoepeld, true);
  });

  test('frigo-voorrang: de favoriet die het meest opmaakt van wat het langst in huis is, op dag 1', () => {
    const boek = [...kookboek, fav('Spinaziecurry', { ingredienten: ['spinazie', 'kokosmelk'] })];
    const frigo: FrigoItem[] = [
      { id: 's', naam: 'spinazie', hoeveelheid: 300, eenheid: 'g', afdeling: 'groenten-fruit', toegevoegdOp: new Date(Date.now() - 5 * 864e5).toISOString() },
    ];
    for (const seed of [1, 2, 3, 4]) {
      const plan = planUitFavorieten(boek, verzoek({ seed, frigo }))!;
      assert.equal(plan.dagen[0].recept.naam, 'Spinaziecurry');
      assert.deepEqual(plan.dagen[0].uitFrigo, ['spinazie']);
    }
  });

  test('hoeveelheden herrekend naar het huidige gezin', () => {
    const klein: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: [] }; // 2 porties i.p.v. 3
    const plan = planUitFavorieten([fav('A')], verzoek({ profiel: klein, opdracht: '1 dag' }))!;
    assert.equal(plan.dagen[0].recept.ingredienten[0].hoeveelheid, 200);
    assert.equal(plan.porties, 2);
  });

  test('bron, herhaald en kort blijven bewaard na opslaan en inlezen', () => {
    const plan = planUitFavorieten(kookboek.slice(0, 2), verzoek())!;
    const gelezen = normaliseerWeekplan(JSON.parse(JSON.stringify({ ...plan, herhaald: true })))!;
    assert.equal(gelezen.bron, 'favorieten');
    assert.equal(gelezen.kort, true);
    assert.equal(gelezen.herhaald, true);
  });
});

describe('resetDagUitFavorieten', () => {
  test('een andere passende favoriet die nog niet in de week staat; rest blijft staan', () => {
    const plan = planUitFavorieten(kookboek, verzoek({ opdracht: '4 dagen' }))!;
    const nieuw = resetDagUitFavorieten(plan, 1, kookboek, 5);
    assert.notEqual(nieuw.dagen[1].recept.naam, plan.dagen[1].recept.naam);
    assert.ok(!namen(plan).includes(nieuw.dagen[1].recept.naam));
    assert.deepEqual([0, 2, 3].map((i) => nieuw.dagen[i]), [0, 2, 3].map((i) => plan.dagen[i]));
  });
  test('geen andere favoriet = plan ongewijzigd', () => {
    const plan = planUitFavorieten(kookboek.slice(0, 2), verzoek())!;
    assert.equal(resetDagUitFavorieten(plan, 0, kookboek.slice(0, 2), 5), plan);
  });
});
