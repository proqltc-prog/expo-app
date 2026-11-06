// WEEK-215: 10 recepten per kookstijl. Elke stijl staat in zijn eigen bestand recepten-week-215-<stijl>.mjs
// (export RECEPTEN en NIEUWE_INGREDIENTEN); dit bestand voegt ze samen.
import * as mediterraan from './recepten-week-215-mediterraan.mjs';
import * as klassiek from './recepten-week-215-klassiek.mjs';
import * as indiaas from './recepten-week-215-indiaas.mjs';
import * as italiaans from './recepten-week-215-italiaans.mjs';
import * as thais from './recepten-week-215-thais.mjs';
import * as japans from './recepten-week-215-japans.mjs';
import * as mexicaans from './recepten-week-215-mexicaans.mjs';
import * as aziatisch from './recepten-week-215-aziatisch.mjs';
import * as chinees from './recepten-week-215-chinees.mjs';
import * as koreaans from './recepten-week-215-koreaans.mjs';
import * as belgisch from './recepten-week-215-belgisch.mjs';
import * as frans from './recepten-week-215-frans.mjs';

export const STIJLEN = { mediterraan, klassiek, indiaas, italiaans, thais, japans, mexicaans, aziatisch, chinees, koreaans, belgisch, frans };
export const RECEPTEN = Object.values(STIJLEN).flatMap((m) => m.RECEPTEN);
/** Nieuwe ingrediënten uit alle stijlbestanden, zonder dubbels (eerste definitie wint). */
export const NIEUWE_INGREDIENTEN_PER_STIJL = Object.values(STIJLEN).flatMap((m) => m.NIEUWE_INGREDIENTEN ?? []);
