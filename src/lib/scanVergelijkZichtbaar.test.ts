import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { vorigeVanZelfdeSoort, voegToeAanHistoriek, wisselKeuze, zelfdeSoort, type HistoriekItem } from '@/lib/scanHistoriek';
import type { Product } from '@/lib/openfoodfacts';

const product = (barcode: string, categorieen: string[], naam = barcode): Product => ({ barcode, naam, additieven: [], categorieen });
const YOGHURT_A = product('1', ['en:dairies', 'en:fermented-foods', 'en:fermented-milk-products', 'en:yogurts', 'en:plain-yogurts']);
const YOGHURT_B = product('2', ['en:dairies', 'en:fermented-foods', 'en:fermented-milk-products', 'en:yogurts', 'en:whole-milk-yogurts']);
const MELK = product('3', ['en:dairies', 'en:milks', 'en:uht-milks']);
const COLA = product('4', ['en:beverages', 'en:carbonated-drinks', 'en:sodas', 'en:colas']);
const ENERGIE = product('5', ['en:beverages', 'en:energy-drinks']);
const COLA_ZERO = product('6', ['en:beverages', 'en:carbonated-drinks', 'en:sodas', 'en:diet-cola-soft-drink']);

function historiek(...producten: Product[]): HistoriekItem[] {
  // De eerste in de rij is de meest recente scan.
  return [...producten].reverse().reduce<HistoriekItem[]>((h, p, i) => voegToeAanHistoriek(h, p, new Date(2026, 10, 16, 12, i)), []);
}

describe('WEEK-313: dezelfde soort', () => {
  test('yoghurt en yoghurt: dezelfde soort', () => {
    assert.equal(zelfdeSoort(YOGHURT_A, YOGHURT_B), true);
  });
  test('enkel een algemene categorie gemeen (zuivel, dranken): niet dezelfde soort', () => {
    assert.equal(zelfdeSoort(YOGHURT_A, MELK), false);
    assert.equal(zelfdeSoort(COLA, ENERGIE), false);
  });
  test('cola en cola zero delen frisdrank: dezelfde soort', () => {
    assert.equal(zelfdeSoort(COLA_ZERO, COLA), true);
  });
  test('zonder categorieën: nooit dezelfde soort', () => {
    assert.equal(zelfdeSoort(product('7', []), YOGHURT_A), false);
    assert.equal(zelfdeSoort({ categorieen: undefined }, YOGHURT_A), false);
  });
});

describe('WEEK-313: vorige scan van dezelfde soort', () => {
  test('de meest recente andere yoghurt', () => {
    assert.equal(vorigeVanZelfdeSoort(historiek(YOGHURT_B, MELK, YOGHURT_A), YOGHURT_B)?.barcode, '1');
  });
  test('het product zelf telt niet mee, ook als het bovenaan de historiek staat', () => {
    assert.equal(vorigeVanZelfdeSoort(historiek(YOGHURT_A), YOGHURT_A), undefined);
  });
  test('ander soort product: geen balk', () => {
    assert.equal(vorigeVanZelfdeSoort(historiek(COLA, YOGHURT_A), COLA), undefined);
  });
  test('enkel binnen de laatste 5 andere scans', () => {
    const tussen = ['a', 'b', 'c', 'd', 'e'].map((b) => product(b, ['en:snacks']));
    assert.equal(vorigeVanZelfdeSoort(historiek(YOGHURT_B, ...tussen, YOGHURT_A), YOGHURT_B), undefined);
    assert.equal(vorigeVanZelfdeSoort(historiek(YOGHURT_B, ...tussen.slice(1), YOGHURT_A), YOGHURT_B)?.barcode, '1');
  });
  test('lege historiek', () => {
    assert.equal(vorigeVanZelfdeSoort([], YOGHURT_A), undefined);
  });
});

describe('regressie WEEK-302/303: historiek en keuze', () => {
  test('nieuwste bovenaan, geen dubbels', () => {
    const h = historiek(YOGHURT_A, MELK, YOGHURT_A);
    assert.deepEqual(h.map((i) => i.product.barcode), ['1', '3']);
  });
  test('voorgekozen product + een tweede = 2 gekozen', () => {
    assert.deepEqual(wisselKeuze(['1'], '3'), ['1', '3']);
  });
});
