import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { gerechtDetails } from '@/lib/planner/gerecht';
import type { FrigoItem } from '@/lib/frigo';
import type { LijstItem } from '@/lib/lijst';
import type { Product } from '@/lib/openfoodfacts';

const recept = { dag: 'zondag' as const, naam: 'Pasta pesto' };
const andere = { dag: 'maandag' as const, naam: 'Pasta tonijn' };

const item = (id: string, naam: string, extra: Partial<LijstItem> = {}): LijstItem => ({
  id, naam, categorie: 'avondeten', afgevinkt: true, eenheid: 'g', hoeveelheid: 100, recept, ...extra,
});

const pasta: Product = { barcode: '1', naam: 'Pasta', additieven: ['E300'], kcal: 350, suikers: 3, eiwitten: 12, vet: 1.5, zout: 0.01 };
const pesto: Product = { barcode: '2', naam: 'Pesto', additieven: ['E300', 'E330'], kcal: 400, suikers: 2, eiwitten: 5, vet: 40, zout: 1 };

/** Een frigo-item dat hoort bij een afgevinkt lijstitem met (optioneel) productdetails. */
const frigoVoor = (i: LijstItem, product?: Product): FrigoItem => ({
  id: `lijst:${i.id}`, naam: i.naam, afdeling: 'overig', toegevoegdOp: '2026-10-17T10:00:00Z', lijstId: i.id,
  ...(product ? { product } : {}),
});

describe('gerechtDetails (WEEK-50)', () => {
  test('rekent per 100 g × hoeveelheid voor het hele gezin', () => {
    const pa = item('recept-z-pasta-g', 'pasta', { hoeveelheid: 200 });
    const pe = item('recept-z-pesto-g', 'pesto', { hoeveelheid: 40 });
    const d = gerechtDetails([pa, pe], [frigoVoor(pa, pasta), frigoVoor(pe, pesto)], 'zondag', recept.naam);
    assert.ok(d);
    assert.equal(d.totaal.kcal, 700 + 160);
    assert.equal(d.totaal.vet, 3 + 16);
    assert.deepEqual(d.nietBerekend, []);
  });

  test('additieven van alle producten, zonder dubbels', () => {
    const pa = item('a', 'pasta');
    const pe = item('b', 'pesto');
    const d = gerechtDetails([pa, pe], [frigoVoor(pa, pasta), frigoVoor(pe, pesto)], 'zondag', recept.naam);
    assert.deepEqual(d?.additieven, ['E300', 'E330']);
  });

  test('niets terug zolang niet alle ingrediënten gescand zijn', () => {
    const pa = item('a', 'pasta');
    const pe = item('b', 'pesto');
    assert.equal(gerechtDetails([pa, pe], [frigoVoor(pa, pasta)], 'zondag', recept.naam), undefined, 'pesto niet gescand');
  });

  test('niets terug als een ingrediënt handmatig afgevinkt is (geen productdetails)', () => {
    const pa = item('a', 'pasta');
    const pe = item('b', 'pesto');
    assert.equal(gerechtDetails([pa, pe], [frigoVoor(pa, pasta), frigoVoor(pe)], 'zondag', recept.naam), undefined);
  });

  test('niets terug als een ingrediënt nog niet afgevinkt is, ook met details', () => {
    const pa = item('a', 'pasta');
    const pe = item('b', 'pesto', { afgevinkt: false });
    assert.equal(gerechtDetails([pa, pe], [frigoVoor(pa, pasta), frigoVoor(pe, pesto)], 'zondag', recept.naam), undefined);
  });

  test('niets terug voor een recept zonder ingrediënten op de lijst', () => {
    assert.equal(gerechtDetails([], [], 'zondag', recept.naam), undefined);
  });

  test('stuk-ingrediënt telt niet mee in het totaal maar staat wel bij niet berekend', () => {
    const pa = item('a', 'pasta', { hoeveelheid: 100 });
    const ui = item('b', 'ui', { eenheid: 'stuk', hoeveelheid: 1 });
    const d = gerechtDetails([pa, ui], [frigoVoor(pa, pasta), frigoVoor(ui, pesto)], 'zondag', recept.naam);
    assert.equal(d?.totaal.kcal, 350);
    assert.deepEqual(d?.nietBerekend, ['ui']);
  });

  test('ml telt mee zoals gram (benadering)', () => {
    const melk = item('a', 'melk', { eenheid: 'ml', hoeveelheid: 250 });
    const d = gerechtDetails([melk], [frigoVoor(melk, { ...pasta, kcal: 60 })], 'zondag', recept.naam);
    assert.equal(d?.totaal.kcal, 150);
  });

  test('ontbrekende voedingswaarde maakt dat totaal onbekend, andere waarden blijven', () => {
    const pa = item('a', 'pasta');
    const pe = item('b', 'pesto');
    const zonderVet: Product = { ...pesto, vet: undefined };
    const d = gerechtDetails([pa, pe], [frigoVoor(pa, pasta), frigoVoor(pe, zonderVet)], 'zondag', recept.naam);
    assert.equal(d?.totaal.vet, undefined);
    assert.equal(d?.totaal.kcal, 350 + 400);
  });

  test('regressie: ingrediënten van een ander recept of zonder recept tellen niet mee', () => {
    const pa = item('a', 'pasta');
    const tonijn = item('t', 'tonijn', { recept: andere, hoeveelheid: 500 });
    const vast = item('v', 'brood', { recept: undefined, categorie: 'ontbijt' });
    const d = gerechtDetails([pa, tonijn, vast], [frigoVoor(pa, pasta), frigoVoor(tonijn, pesto), frigoVoor(vast, pesto)], 'zondag', recept.naam);
    assert.equal(d?.totaal.kcal, 350);
  });
});
