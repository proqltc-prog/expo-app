// WEEK-219: nieuwe ingrediënten, samengevoegd uit de delen (zie recepten-week-219.mjs).
// [code, eenheid, categorie, soort, allergenen, { nl, fr, de, en }]
import { NIEUWE_INGREDIENTEN_PER_DEEL } from './recepten-week-219.mjs';
import { INGREDIENTEN_DB } from '../../src/data/ingredienten.gegenereerd.ts';

const gezien = new Set();
export const NIEUWE_INGREDIENTEN = NIEUWE_INGREDIENTEN_PER_DEEL.filter(([code]) => {
  if (gezien.has(code) || code in INGREDIENTEN_DB) return false;
  gezien.add(code);
  return true;
});
