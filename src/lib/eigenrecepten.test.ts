import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bewaarEigen,
  EigenIngredient,
  EigenRecept,
  GEZIN_STIJL,
  isExactBekend,
  nieuweId,
  normaliseerEigen,
  valideer,
  verwijderEigen,
  zoekIngredienten,
} from '@/lib/eigenrecepten';

const ing = (naam: string, hoeveelheid = 100): EigenIngredient => ({ naam, hoeveelheid, eenheid: 'g' });
const geldig = {
  naam: '  Mijn stoofpot ',
  soort: 'vlees' as const,
  minuten: '45',
  stijlen: ['klassiek' as const],
  ingredienten: [ing('rundsvlees', 150)],
  stappen: ['Bak het vlees.', '  ', 'Laat sudderen.'],
};

const recept = (id: string, naam: string, ingredienten: EigenIngredient[] = [ing('tofu')]): EigenRecept => ({
  id,
  naam,
  soort: 'vegetarisch',
  minuten: 15,
  stijlen: ['italiaans'],
  ingredienten,
  stappen: ['Snijd.'],
  bijgewerkt: '2026-10-17T10:00:00.000Z',
});

// WEEK-192: de gezinsstijl, seizoenen en het normaliseren van opgeslagen eigen recepten.
describe('WEEK-192: gezinsstijl en seizoenen', () => {
  test('de gezinsstijl wordt een vlag, de andere stijlen blijven stijlen', () => {
    const r = valideer({ ...geldig, stijlen: [GEZIN_STIJL, 'italiaans'] });
    if (!r.ok) throw new Error('moet geldig zijn');
    assert.equal(r.waarden.gezinStijl, true);
    assert.deepEqual(r.waarden.stijlen, ['italiaans']);
  });

  test('alleen de gezinsstijl geeft een recept zonder vaste stijl', () => {
    const r = valideer({ ...geldig, stijlen: [GEZIN_STIJL] });
    if (!r.ok) throw new Error('moet geldig zijn');
    assert.equal(r.waarden.gezinStijl, true);
    assert.deepEqual(r.waarden.stijlen, []);
  });

  test('zonder de gezinsstijl is het recept geen gezinsrecept', () => {
    const r = valideer(geldig);
    if (!r.ok) throw new Error('moet geldig zijn');
    assert.notEqual(r.waarden.gezinStijl, true);
  });

  test('onbekende seizoenen worden weggelaten, bekende blijven', () => {
    const r = valideer({ ...geldig, seizoenen: ['zomer', 'bogus' as never] });
    if (!r.ok) throw new Error('moet geldig zijn');
    assert.deepEqual(r.waarden.seizoenen, ['zomer']);
  });

  test('normaliseerEigen geeft een lege lijst bij ongeldige opslag', () => {
    assert.deepEqual(normaliseerEigen(null), []);
    assert.deepEqual(normaliseerEigen('kapot'), []);
  });

  test('normaliseerEigen bewaart de gezinsstijl en de seizoenen van een opgeslagen recept', () => {
    const opgeslagen = { ...recept('g1', 'Ons stoofvlees'), gezinStijl: true, seizoenen: ['winter' as const] };
    const [terug] = normaliseerEigen([opgeslagen]);
    assert.equal(terug.id, 'g1');
    assert.equal(terug.gezinStijl, true);
    assert.deepEqual(terug.seizoenen, ['winter']);
  });
});
