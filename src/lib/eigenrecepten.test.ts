import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { RECEPTENBANK } from '@/data/receptenbank';
import { favorietId, type Favoriet } from '@/lib/favorieten';
import {
  bewaarEigen,
  EigenIngredient,
  EigenRecept,
  isExactBekend,
  lijstRegels,
  nieuweId,
  valideer,
  verwijderEigen,
  zoekIngredienten,
} from '@/lib/eigenrecepten';

const ing = (naam: string, hoeveelheid = 100): EigenIngredient => ({ naam, hoeveelheid, eenheid: 'g' });
const geldig = {
  naam: '  Mijn stoofpot ',
  soort: 'vlees' as const,
  minuten: '45',
  stijlen: ['comfort' as const],
  ingredienten: [ing('rundsvlees', 150)],
  stappen: ['Bak het vlees.', '  ', 'Laat sudderen.'],
};

const recept = (id: string, naam: string, ingredienten: EigenIngredient[] = [ing('tofu')]): EigenRecept => ({
  id,
  naam,
  soort: 'vegetarisch',
  minuten: 15,
  stijlen: ['licht'],
  ingredienten,
  stappen: ['Snijd.'],
  bijgewerkt: '2026-10-17T10:00:00.000Z',
});

const favoriet = (naam: string): Favoriet => ({
  id: favorietId(naam),
  naam,
  soort: 'vis',
  stijlen: [],
  minuten: 10,
  ingredienten: [],
  personen: 4,
  porties: 3,
  opgeslagenOp: '2026-10-01T10:00:00.000Z',
});

const filter = { bron: 'alle' as const, soorten: [], kooktijden: [], stijlen: [], zoek: '', taal: 'nl' as const, favorieten: [] };

describe('valideer', () => {
  test('geldig formulier geeft opgeschoonde waarden', () => {
    const res = valideer(geldig);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.waarden.naam, 'Mijn stoofpot');
    assert.equal(res.waarden.minuten, 45);
    assert.deepEqual(res.waarden.stappen, ['Bak het vlees.', 'Laat sudderen.']);
  });

  test('komma als decimaalteken bij minuten is geen fout (regressie)', () => {
    assert.equal(valideer({ ...geldig, minuten: '12,0' }).ok, true);
  });

  test('lege naam, ongeldige minuten, geen ingrediënten en geen stappen geven elk een fout', () => {
    const res = valideer({ ...geldig, naam: '  ', minuten: '0', ingredienten: [], stappen: [' '] });
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.deepEqual(res.fouten, ['naam', 'minuten', 'ingredienten', 'stappen']);
  });

  test('minuten boven 600 of met een breuk zijn ongeldig', () => {
    assert.equal(valideer({ ...geldig, minuten: '601' }).ok, false);
    assert.equal(valideer({ ...geldig, minuten: '4,5' }).ok, false);
  });

  test('een ingrediënt zonder hoeveelheid is ongeldig', () => {
    const res = valideer({ ...geldig, ingredienten: [ing('ui', 0)] });
    assert.equal(res.ok, false);
  });

  test('een ingrediënt zonder naam telt niet mee', () => {
    const res = valideer({ ...geldig, ingredienten: [ing('  '), ing('ui')] });
    assert.equal(res.ok, true);
    if (res.ok) assert.equal(res.waarden.ingredienten.length, 1);
  });
});

describe('zoekIngredienten', () => {
  test('vindt ingrediënten uit de app, ook zonder accenten en hoofdletters', () => {
    const res = zoekIngredienten('AVOC', 'nl', []);
    assert.ok(res.some((k) => k.naam === 'avocado' && k.code === 'avocado'));
  });

  test('handmatig ingevoerde ingrediënten uit eigen recepten worden teruggevonden (regressie)', () => {
    const eigen = [recept('a', 'Gojisoep', [ing('Gojibessen')])];
    const res = zoekIngredienten('goji', 'nl', eigen);
    assert.deepEqual(res, [{ naam: 'Gojibessen' }]);
  });

  test('een handmatig ingrediënt dat al in de app-lijst staat, komt niet dubbel', () => {
    const eigen = [recept('a', 'Test', [ing('Avocado')])];
    const res = zoekIngredienten('avocado', 'nl', eigen);
    assert.equal(res.filter((k) => k.naam.toLowerCase() === 'avocado').length, 1);
  });

  test('lege zoekterm geeft niets', () => {
    assert.deepEqual(zoekIngredienten('  ', 'nl', []), []);
  });

  test('isExactBekend herkent een exacte treffer', () => {
    const keuzes = zoekIngredienten('avocado', 'nl', []);
    assert.equal(isExactBekend('Avocado', keuzes), true);
    assert.equal(isExactBekend('avo', keuzes), false);
  });
});

describe('bewaarEigen en verwijderEigen', () => {
  test('nieuw recept komt erbij, bestaand recept (zelfde id) wordt vervangen', () => {
    const a = recept('a', 'A');
    const b = recept('b', 'B');
    assert.deepEqual(bewaarEigen([a], b).map((r) => r.id), ['a', 'b']);
    assert.deepEqual(bewaarEigen([a, b], { ...a, naam: 'A2' }).map((r) => r.naam), ['A2', 'B']);
  });

  test('verwijderen laat de rest ongemoeid', () => {
    assert.deepEqual(verwijderEigen([recept('a', 'A'), recept('b', 'B')], 'a').map((r) => r.id), ['b']);
  });

  test('nieuweId is uniek per aanroep en begint met eigen:', () => {
    const nu = new Date('2026-10-17T10:00:00.000Z');
    const a = nieuweId(nu, () => 0.1);
    const b = nieuweId(nu, () => 0.9);
    assert.ok(a.startsWith('eigen:'));
    assert.notEqual(a, b);
  });
});

describe('lijstRegels', () => {
  const eigen = [recept('e1', 'Zoete aardappelcurry', [ing('Zoete aardappel')])];

  test('bron alle toont receptenbank én eigen recepten (regressie: bank blijft zichtbaar)', () => {
    const res = lijstRegels(eigen, RECEPTENBANK, filter);
    assert.ok(res.some((r) => r.eigen && r.id === 'e1'));
    assert.ok(res.some((r) => !r.eigen && r.id === RECEPTENBANK[0].id));
  });

  test('bron mijn toont enkel eigen recepten', () => {
    const res = lijstRegels(eigen, RECEPTENBANK, { ...filter, bron: 'mijn' });
    assert.deepEqual(res.map((r) => r.id), ['e1']);
  });

  test('bron favoriet toont enkel recepten in het kookboek', () => {
    const naam = RECEPTENBANK[0].namen[0];
    const res = lijstRegels(eigen, RECEPTENBANK, { ...filter, bron: 'favoriet', favorieten: [favoriet(naam)] });
    assert.deepEqual(res.map((r) => r.naam), [naam]);
  });

  test('zoeken werkt op de naam in de gekozen taal', () => {
    const naam = RECEPTENBANK[0].namen[1];
    const res = lijstRegels([], RECEPTENBANK, { ...filter, zoek: naam.toUpperCase(), taal: 'fr' });
    assert.ok(res.some((r) => r.id === RECEPTENBANK[0].id));
  });

  test('soortfilter houdt enkel dat soort over', () => {
    const res = lijstRegels(eigen, RECEPTENBANK, { ...filter, soorten: ['vegetarisch'] });
    assert.ok(res.length > 0 && res.every((r) => r.soort === 'vegetarisch'));
  });

  test('resultaat is alfabetisch op naam', () => {
    const res = lijstRegels(eigen, RECEPTENBANK, filter);
    const namen = res.map((r) => r.naam);
    assert.deepEqual(namen, [...namen].sort((a, b) => a.localeCompare(b, 'nl')));
  });
});
