// WEEK-215: nieuwe ingrediënten, samengevoegd uit de stijlbestanden (zie recepten-week-215.mjs).
// [code, eenheid, categorie, soort, allergenen, { nl, fr, de, en }]
import { NIEUWE_INGREDIENTEN_PER_STIJL } from './recepten-week-215.mjs';
import { INGREDIENTEN_DB } from '../../src/data/ingredienten.gegenereerd.ts';

const gezien = new Set();
export const NIEUWE_INGREDIENTEN = NIEUWE_INGREDIENTEN_PER_STIJL.filter(([code]) => {
  if (gezien.has(code) || code in INGREDIENTEN_DB) return false;
  gezien.add(code);
  return true;
});
