import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pasFrigoAan, type FrigoItem } from '@/lib/frigo';
import { voegPlanToe, type LijstItem } from '@/lib/lijst';
import { lijstNaFrigo, totaleHoeveelheid, verlaagReceptHoeveelheid } from '@/lib/lijstNaFrigo';
import { testPool } from '@/lib/planner/testrecepten';
import type { PlanDag } from '@/lib/planner/types';

const pool = testPool('nl', { volwassenen: 2, kinderen: 0 });
const curry = pool[0].recept; // Linzencurry met rijst: linzen, kokosmelk, currypasta, rijst, spinazie
const pasta = pool[1].recept; // Cacio e pepe: spaghetti, parmezaan, boter
const dagen: PlanDag[] = [
  { dag: 'vrijdag', recept: curry, bevestigd: true },
  { dag: 'zaterdag', recept: pasta, bevestigd: true },
];
const SLEUTEL = 'test';
const NU = new Date('2026-11-21T10:00:00.000Z');

const startLijst = () => voegPlanToe([], dagen, 'nl', undefined, SLEUTEL);
const vind = (lijst: readonly LijstItem[], naam: string) => lijst.find((i) => i.naam === naam && i.recept)!;

/** Vinkt de rijst af: zoals op de boodschappenlijst gaat ze dan naar In huis (met lijstId). */
function rijstGekocht() {
  const lijst = startLijst();
  const rijst = vind(lijst, 'rijst');
  const frigo = pasFrigoAan([], [rijst], true, NU);
  const afgevinkt = lijst.map((i) => (i.id === rijst.id ? { ...i, afgevinkt: true } : i));
  return { lijst: afgevinkt, frigo, rijst };
}

describe('WEEK-322: In huis gewijzigd → wat een bevestigd gerecht mist, komt terug op de lijst', () => {
  test('een gekocht ingrediënt verwijderd bij In huis: het staat weer open op de lijst, met melding', () => {
    const { lijst, frigo, rijst } = rijstGekocht();
    const na = frigo.filter((f) => f.lijstId !== rijst.id);
    const r = lijstNaFrigo(lijst, dagen, 'nl', na, SLEUTEL);
    const rijstNa = vind(r.lijst, 'rijst');
    assert.equal(rijstNa.afgevinkt, false);
    assert.equal(rijstNa.hoeveelheid, rijst.hoeveelheid);
    assert.deepEqual(r.terug, [{ naam: 'rijst', recept: curry.naam }]);
  });

  test('een lagere hoeveelheid: enkel het tekort komt open op de lijst', () => {
    const { lijst, frigo, rijst } = rijstGekocht();
    const ids = frigo.filter((f) => f.lijstId === rijst.id).map((f) => f.id);
    const na = verlaagReceptHoeveelheid(frigo, ids, 50);
    assert.equal(na[0].lijstId, undefined, 'het product telt als gewone voorraad');
    assert.equal(na[0].bron, 'planner');
    const r = lijstNaFrigo(lijst, dagen, 'nl', na, SLEUTEL);
    const rijstNa = vind(r.lijst, 'rijst');
    assert.equal(rijstNa.afgevinkt, false);
    assert.equal(rijstNa.hoeveelheid, (rijst.hoeveelheid ?? 0) - 50);
    assert.deepEqual(r.terug, [{ naam: 'rijst', recept: curry.naam }]);
  });

  test('een ingrediënt dat al in huis lag (niet via de lijst) verwijderd: het komt op de lijst', () => {
    const voorraad: FrigoItem[] = [{ id: 'f1', naam: 'boter', hoeveelheid: 500, eenheid: 'g', afdeling: 'zuivel-eieren', toegevoegdOp: NU.toISOString(), bron: 'planner', code: 'boter' }];
    const lijst = voegPlanToe([], dagen, 'nl', undefined, SLEUTEL).filter((i) => i.naam !== 'boter');
    const r = lijstNaFrigo(lijst, dagen, 'nl', [], SLEUTEL);
    assert.ok(vind(r.lijst, 'boter'), 'boter staat op de lijst');
    assert.deepEqual(r.terug, [{ naam: 'boter', recept: pasta.naam }]);
    // regressie: zolang de boter in huis ligt, komt ze niet op de lijst
    assert.equal(lijstNaFrigo(lijst, dagen, 'nl', voorraad, SLEUTEL).lijst.some((i) => i.naam === 'boter'), false);
  });

  test('regressie: niets gewijzigd bij In huis → geen melding en het vinkje blijft', () => {
    const { lijst, frigo, rijst } = rijstGekocht();
    const r = lijstNaFrigo(lijst, dagen, 'nl', frigo, SLEUTEL);
    assert.deepEqual(r.terug, []);
    assert.equal(vind(r.lijst, 'rijst').afgevinkt, true);
    assert.equal(vind(r.lijst, 'rijst').id, rijst.id);
  });

  test('regressie: losse producten op de lijst blijven ongewijzigd', () => {
    const { lijst, frigo, rijst } = rijstGekocht();
    const los: LijstItem = { id: 'los-1', naam: 'koffie', categorie: 'overig', afgevinkt: true };
    const r = lijstNaFrigo([...lijst, los], dagen, 'nl', frigo.filter((f) => f.lijstId !== rijst.id), SLEUTEL);
    assert.deepEqual(r.lijst.find((i) => i.id === 'los-1'), los);
    assert.equal(r.terug.some((t) => t.naam === 'koffie'), false);
  });

  test('regressie: een gekookt of niet-bevestigd gerecht komt niet op de lijst (de beller geeft enkel open bevestigde dagen)', () => {
    const r = lijstNaFrigo([], [dagen[0]], 'nl', [], SLEUTEL);
    assert.equal(r.lijst.some((i) => i.recept?.naam === pasta.naam), false);
  });


  test('totale hoeveelheid van een regel; onbekend als één exemplaar geen hoeveelheid heeft', () => {
    const a: FrigoItem = { id: 'a', naam: 'rijst', hoeveelheid: 100, eenheid: 'g', afdeling: 'droge-voeding', toegevoegdOp: NU.toISOString() };
    const b: FrigoItem = { ...a, id: 'b', hoeveelheid: 50 };
    assert.equal(totaleHoeveelheid([a, b], ['a', 'b']), 150);
    assert.equal(totaleHoeveelheid([a, { ...b, hoeveelheid: undefined }], ['a', 'b']), undefined);
  });

  test('verlagen maakt van de groep één item met de nieuwe hoeveelheid; andere producten blijven', () => {
    const a: FrigoItem = { id: 'a', naam: 'rijst', hoeveelheid: 100, eenheid: 'g', afdeling: 'droge-voeding', toegevoegdOp: NU.toISOString(), lijstId: 'x', houdbaarTot: '2026-12-01' };
    const b: FrigoItem = { ...a, id: 'b', hoeveelheid: 50, lijstId: 'y' };
    const c: FrigoItem = { ...a, id: 'c', naam: 'melk' };
    const na = verlaagReceptHoeveelheid([a, b, c], ['a', 'b'], 80);
    assert.deepEqual(na.map((f) => f.id), ['a', 'c']);
    assert.equal(na[0].hoeveelheid, 80);
    assert.equal(na[0].houdbaarTot, '2026-12-01');
    assert.equal(na[0].lijstId, undefined);
    assert.equal(na[1].lijstId, 'x');
  });
});
