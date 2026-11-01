import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { FrigoItem } from '@/lib/frigo';
import { vervangDag, wisselGedaan, zelfdeDag } from '@/lib/planner/bijwerken';
import type { PlanDag, Weekplan } from '@/lib/planner/types';

const dag = (d: PlanDag['dag'], naam: string, ing = 'pasta'): PlanDag => ({
  dag: d, recept: { id: naam, naam, soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten: [{ naam: ing, hoeveelheid: 300, eenheid: 'g', afdeling: 'droge-voeding' }] },
});
const plan: Weekplan = {
  dagen: [dag('zondag', 'Pasta'), dag('maandag', 'Curry', 'rijst')],
  kooktijden: [], stijlen: [], taal: 'nl', porties: 3, bron: 'lokaal', gemaaktOp: '2026-10-10T10:00:00.000Z',
};
const frigo: FrigoItem[] = [{ id: 'p', naam: 'pasta', hoeveelheid: 500, eenheid: 'g', afdeling: 'droge-voeding', toegevoegdOp: '2026-10-09T10:00:00.000Z', bron: 'planner' }];
const verwacht = (i: number) => ({ gemaaktOp: plan.gemaaktOp, receptNaam: plan.dagen[i].recept.naam });

describe('zelfdeDag (WEEK-28)', () => {
  test('zelfde plan en recept = ja; nieuw plan of ander recept = nee', () => {
    assert.ok(zelfdeDag(plan, 0, verwacht(0)));
    assert.ok(!zelfdeDag({ ...plan, gemaaktOp: '2026-10-11T10:00:00.000Z' }, 0, verwacht(0)));
    assert.ok(!zelfdeDag({ ...plan, dagen: [dag('zondag', 'Soep'), plan.dagen[1]] }, 0, verwacht(0)));
    assert.ok(!zelfdeDag(plan, 5, verwacht(0)));
  });
});

describe('vervangDag: trage reset overschrijft niets anders', () => {
  test('enkel die dag wordt vervangen; wat intussen veranderde (andere dag gekookt) blijft', () => {
    const intussen: Weekplan = { ...plan, dagen: [plan.dagen[0], { ...plan.dagen[1], gedaan: true }] };
    const nieuw = vervangDag(intussen, 0, verwacht(0), dag('zondag', 'Omelet', 'eieren'));
    assert.equal(nieuw.dagen[0].recept.naam, 'Omelet');
    assert.equal(nieuw.dagen[1].gedaan, true);
  });
  test('is de dag intussen veranderd (nieuw plan, andere reset), dan gebeurt er niets', () => {
    const anderPlan = { ...plan, gemaaktOp: '2026-10-11T10:00:00.000Z' };
    assert.equal(vervangDag(anderPlan, 0, verwacht(0), dag('zondag', 'Omelet')), anderPlan);
  });
});

describe('wisselGedaan: dubbel tikken verbruikt niet twee keer', () => {
  test('twee tikken na elkaar op de nieuwste versie = gekookt en terug, frigo exact zoals in het begin', () => {
    const een = wisselGedaan(plan, frigo, 0, verwacht(0));
    assert.equal(een.plan.dagen[0].gedaan, true);
    assert.equal(een.frigo[0].hoeveelheid, 200);
    const twee = wisselGedaan(een.plan, een.frigo, 0, verwacht(0));
    assert.equal(twee.plan.dagen[0].gedaan, undefined);
    assert.deepEqual(twee.frigo, frigo);
  });
  test('ander recept op die dag intussen: niets verbruikt', () => {
    const anders: Weekplan = { ...plan, dagen: [dag('zondag', 'Soep'), plan.dagen[1]] };
    const r = wisselGedaan(anders, frigo, 0, verwacht(0));
    assert.equal(r.plan, anders);
    assert.deepEqual(r.frigo, frigo);
  });
});

describe('alle recepten gekookt: producten van de lijst uit de frigo (WEEK-141)', () => {
  const w141Ing = (naam: string, hoeveelheid: number) => ({ naam, hoeveelheid, eenheid: 'g', afdeling: 'droge-voeding' as const });
  const w141Recept = (naam: string, ingredienten: ReturnType<typeof w141Ing>[]) => ({ id: naam, naam, soort: 'vegetarisch' as const, minuten: 20, stijlen: ['italiaans' as const], ingredienten });
  const w141Dag = (d: 'maandag' | 'dinsdag', r: ReturnType<typeof w141Recept>): PlanDag => ({ dag: d, recept: r, bevestigd: true });
  const w141Plan = (dagen: PlanDag[]): Weekplan => ({ dagen, kooktijden: [], stijlen: [], taal: 'nl', porties: 1, bron: 'db', gemaaktOp: '2026-10-20T08:00:00.000Z' });
  const w141Product = (id: string, naam: string, hoeveelheid: number, bron: 'planner' | 'los'): FrigoItem => ({ id, naam, hoeveelheid, eenheid: 'g', afdeling: 'groenten-fruit', toegevoegdOp: '2026-10-19T10:00:00.000Z', bron });
  const w141Verwacht = (p: Weekplan, i: number) => ({ gemaaktOp: p.gemaaktOp, receptNaam: p.dagen[i].recept.naam });
  const r1 = w141Recept('Risotto', [w141Ing('champignons', 300)]);
  const r2 = w141Recept('Parmezaan-pasta', [w141Ing('parmezaan', 50)]);

  test('één recept gekookt: de producten van de lijst blijven in de frigo', () => {
    const p = w141Plan([w141Dag('maandag', r1), w141Dag('dinsdag', r2)]);
    const frigo = [w141Product('c', 'champignons', 1200, 'planner'), w141Product('p', 'parmezaan', 310, 'planner')];
    assert.equal(wisselGedaan(p, frigo, 0, w141Verwacht(p, 0)).frigo.length, 2);
  });

  // WEEK-159: de week-brede leegmaak is vervallen. Enkel de ingrediënten van het gekookte recept gaan uit de frigo;
  // restjes van gekochte voorraad blijven staan.
  test('alle recepten gekookt: enkel de ingrediënten van de recepten gaan uit de frigo, restjes blijven (WEEK-159)', () => {
    const p = w141Plan([w141Dag('maandag', r1), w141Dag('dinsdag', r2)]);
    const frigo = [w141Product('c', 'champignons', 1200, 'planner'), w141Product('p', 'parmezaan', 310, 'planner')];
    const eerst = wisselGedaan(p, frigo, 0, w141Verwacht(p, 0));
    const laatste = wisselGedaan(eerst.plan, eerst.frigo, 1, w141Verwacht(eerst.plan, 1));
    assert.deepEqual(laatste.frigo.map((f) => [f.naam, f.hoeveelheid]), [['champignons', 900], ['parmezaan', 260]]);
    assert.deepEqual(laatste.plan.dagen.map((d) => d.verbruikt === undefined), [false, false]);
  });

  test('losse producten blijven staan als alle recepten gekookt zijn', () => {
    const p = w141Plan([w141Dag('maandag', r1)]);
    const frigo = [w141Product('c', 'champignons', 1200, 'planner'), w141Product('los', 'rijst', 500, 'los')];
    // WEEK-159: het gekookte deel (300 g) is verbruikt, de restjes van de planner-producten en het los product blijven.
    assert.deepEqual(wisselGedaan(p, frigo, 0, w141Verwacht(p, 0)).frigo.map((f) => f.id), ['c', 'los']);
  });

  test('ontkoken na koken: het verbruikte deel komt weer terug in de frigo (WEEK-159)', () => {
    const p = w141Plan([w141Dag('maandag', r1)]);
    const gekookt = wisselGedaan(p, [w141Product('c', 'champignons', 1200, 'planner')], 0, w141Verwacht(p, 0));
    assert.deepEqual(gekookt.frigo.map((f) => f.hoeveelheid), [900]);
    const teruggezet = wisselGedaan(gekookt.plan, gekookt.frigo, 0, w141Verwacht(gekookt.plan, 0));
    assert.equal(teruggezet.frigo.reduce((som, f) => som + (f.hoeveelheid ?? 0), 0), 1200);
  });
});
