// WEEK-340: het weekmenu kiest eerst wat In huis ligt (gewogen), dan het seizoen, dan de rest.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { FrigoItem } from '@/lib/frigo';
import { planUitDatabase, vervangDbDag } from '@/lib/planner/dbplan';
import { gebruikVoorraad, IN_HUIS_DREMPEL, inHuisGewicht, inHuisScore, maakVoorraad } from '@/lib/planner/frigovoorrang';
import { testPool } from '@/lib/planner/testrecepten';
import type { PlanVerzoek } from '@/lib/planner/types';
import { Profiel, standaardProfiel } from '@/lib/profiel';

const NU = new Date();
const f = (code: string, hoeveelheid?: number, eenheid?: string, extra: Partial<FrigoItem> = {}): FrigoItem => ({
  id: `${code}-${hoeveelheid ?? 'x'}`,
  naam: code,
  code,
  afdeling: 'groenten-fruit',
  toegevoegdOp: NU.toISOString(),
  bron: 'planner',
  ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
  ...(eenheid ? { eenheid } : {}),
  ...extra,
});
const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 2 };
const verzoek = (extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({ kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 7, ...extra });
const pool = testPool('nl', gezin);
const ids = (extra: Partial<PlanVerzoek> = {}, p = pool) => planUitDatabase(verzoek(extra), p)!.dagen.map((d) => d.recept.id);

describe('WEEK-340: gewicht per soort', () => {
  test('hoofdingrediënten tellen volledig, granen half, basisvoorraad bijna niet', () => {
    assert.equal(inHuisGewicht({ naam: 'spinazie', code: 'spinazie' }), 1);
    assert.equal(inHuisGewicht({ naam: 'witvis', code: 'witvis' }), 1);
    assert.equal(inHuisGewicht({ naam: 'rijst', code: 'rijst' }), 0.5);
    assert.equal(inHuisGewicht({ naam: 'olijfolie', code: 'olijfolie' }), 0.1);
    assert.equal(inHuisGewicht({ naam: 'kokosmelk', code: 'kokosmelk' }), 0.1);
    assert.equal(inHuisGewicht({ naam: 'bouillonblokje', code: 'bouillonblokje' }), 0.1);
  });
  test('onbekend ingrediënt zonder code telt als hoofdingrediënt', () => {
    assert.equal(inHuisGewicht({ naam: 'Mysterieus kruid' }), 1);
  });
});

describe('WEEK-340: score', () => {
  test('enkel basisvoorraad haalt de drempel niet', () => {
    const basis = [f('kokosmelk', 400, 'ml'), f('currypasta', 100, 'g'), f('olijfolie', 500, 'ml')];
    assert.ok(inHuisScore([{ naam: 'kokosmelk', code: 'kokosmelk' }, { naam: 'currypasta', code: 'currypasta' }], basis, NU) < IN_HUIS_DREMPEL);
  });
  test('bijna vervallen of al lang in huis weegt zwaarder', () => {
    const ing = [{ naam: 'prei', code: 'prei' }];
    const vers = inHuisScore(ing, [f('prei', 2, 'stuk')], NU);
    const vervalt = inHuisScore(ing, [f('prei', 2, 'stuk', { houdbaarTot: new Date(NU.getTime() + 24 * 3600e3).toISOString().slice(0, 10) })], NU);
    const oud = inHuisScore(ing, [f('prei', 2, 'stuk', { toegevoegdOp: new Date(NU.getTime() - 14 * 24 * 3600e3).toISOString() })], NU);
    assert.ok(vervalt > vers);
    assert.ok(oud > vers);
  });
  test('een ingrediënt dat al opgemaakt wordt, telt niet opnieuw; dubbele codes één keer', () => {
    const frigo = [f('prei', 1, 'stuk')];
    assert.equal(inHuisScore([{ naam: 'prei', code: 'prei' }], frigo, NU, new Set(['prei'])), 0);
    assert.equal(inHuisScore([{ naam: 'prei', code: 'prei' }, { naam: 'prei', code: 'prei' }], frigo, NU), inHuisScore([{ naam: 'prei', code: 'prei' }], frigo, NU));
  });
  test('regressie WEEK-158: losse producten tellen niet', () => {
    assert.equal(inHuisScore([{ naam: 'prei', code: 'prei' }], [f('prei', 1, 'stuk', { bron: 'los' })], NU), 0);
  });
});

describe('WEEK-340: voorraad per dag', () => {
  test('een grote zak rijst blijft meetellen, een kleine niet', () => {
    const verbruikt = new Set<string>();
    const voorraad = maakVoorraad([f('rijst', 1000, 'g')]);
    gebruikVoorraad(voorraad, [{ naam: 'rijst', code: 'rijst', hoeveelheid: 300, eenheid: 'g' }], verbruikt);
    assert.equal(verbruikt.has('rijst'), false);
    gebruikVoorraad(voorraad, [{ naam: 'rijst', code: 'rijst', hoeveelheid: 800, eenheid: 'g' }], verbruikt);
    assert.equal(verbruikt.has('rijst'), true);
  });
  test('kg en g worden samengeteld; onvergelijkbare eenheid = op', () => {
    const verbruikt = new Set<string>();
    const voorraad = maakVoorraad([f('rijst', 1, 'kg'), f('rijst', 500, 'g')]);
    gebruikVoorraad(voorraad, [{ naam: 'rijst', code: 'rijst', hoeveelheid: 1200, eenheid: 'g' }], verbruikt);
    assert.equal(verbruikt.has('rijst'), false);
    gebruikVoorraad(voorraad, [{ naam: 'rijst', code: 'rijst', hoeveelheid: 1, eenheid: 'stuk' }], verbruikt);
    assert.equal(verbruikt.has('rijst'), true);
  });
  test('basisvoorraad wordt niet afgeteld', () => {
    const verbruikt = new Set<string>();
    gebruikVoorraad(maakVoorraad([f('olijfolie', 10, 'ml')]), [{ naam: 'olijfolie', code: 'olijfolie', hoeveelheid: 500, eenheid: 'ml' }], verbruikt);
    assert.equal(verbruikt.size, 0);
  });
});

describe('WEEK-340: het weekmenu', () => {
  test('wat In huis ligt komt eerst (vis en prei → vispannetje)', () => {
    assert.equal(ids({ frigo: [f('witvis', 500, 'g'), f('prei', 2, 'stuk')] })[0], 'db-5');
  });
  test('twee gerechten met In huis-ingrediënten staan allebei vooraan', () => {
    const plan = ids({ frigo: [f('scampi', 600, 'g'), f('gehakt', 600, 'g')] });
    assert.deepEqual(plan.slice(0, 2).sort(), ['db-4', 'db-7']);
  });
  test('negatief: enkel basisvoorraad in huis verandert het weekmenu niet', () => {
    const basis = [f('kokosmelk', 400, 'ml'), f('currypasta', 100, 'g'), f('olijfolie', 500, 'ml'), f('bouillonblokje', 10, 'stuk')];
    assert.deepEqual(ids({ frigo: basis }), ids());
  });
  test('regressie: zonder In huis verandert er niets', () => {
    assert.deepEqual(ids({ frigo: [] }), ids());
  });
  test('negatief: de wensen gaan voor (stijl)', () => {
    const plan = planUitDatabase(verzoek({ stijlen: ['italiaans'], frigo: [f('witvis', 500, 'g'), f('prei', 2, 'stuk')] }), pool)!;
    assert.notEqual(plan.dagen[0].recept.id, 'db-5');
    assert.ok(plan.dagen[0].recept.stijlen.includes('italiaans'));
  });
  test('negatief: nooit een gerecht van een ander seizoen, ook al ligt alles in huis', () => {
    const zomer = pool.map((k) => (k.recept.id === 'db-5' ? { ...k, seizoenen: ['zomer' as const] } : k));
    const datums = ['2027-01-11', '2027-01-12', '2027-01-13'];
    const plan = ids({ datums, frigo: [f('witvis', 500, 'g'), f('prei', 2, 'stuk')] }, zomer);
    assert.ok(!plan.includes('db-5'));
  });
  test('geen dubbel gerecht', () => {
    const plan = ids({ frigo: [f('witvis', 500, 'g'), f('prei', 2, 'stuk'), f('scampi', 600, 'g')] });
    assert.equal(new Set(plan).size, plan.length);
  });
  test('een ander gerecht (pijltje) kiest ook eerst wat In huis ligt', () => {
    const plan = planUitDatabase(verzoek(), pool.filter((k) => k.recept.id !== 'db-5'))!;
    assert.ok(!plan.dagen.some((d) => d.recept.id === 'db-5'));
    const nieuw = vervangDbDag(plan, 0, pool, 3, [f('witvis', 500, 'g'), f('prei', 2, 'stuk')]);
    assert.equal(nieuw.dagen[0].recept.id, 'db-5');
  });
  test('regressie: zonder In huis kiest het pijltje gewoon een ander gerecht', () => {
    const plan = planUitDatabase(verzoek(), pool)!;
    const nieuw = vervangDbDag(plan, 0, pool, 3);
    assert.notEqual(nieuw.dagen[0].recept.id, plan.dagen[0].recept.id);
  });
});
