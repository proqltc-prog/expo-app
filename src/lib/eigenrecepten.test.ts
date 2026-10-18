import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bewaarEigen,
  EigenIngredient,
  EigenRecept,
  isExactBekend,
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
