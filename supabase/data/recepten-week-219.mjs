// WEEK-219: 50 recepten van Delhaize en 50 van Colruyt, elk in 5 delen van 10 (recepten-week-219-<winkel>-<deel>.mjs,
// met export RECEPTEN en NIEUWE_INGREDIENTEN); dit bestand voegt ze samen.
// Colruyt vermeldt geen hoeveelheden op de site: die zijn per recept geschat (zie de commentaarregel boven elk recept).
import * as delhaize1 from './recepten-week-219-delhaize-1.mjs';
import * as delhaize2 from './recepten-week-219-delhaize-2.mjs';
import * as delhaize3 from './recepten-week-219-delhaize-3.mjs';
import * as delhaize4 from './recepten-week-219-delhaize-4.mjs';
import * as delhaize5 from './recepten-week-219-delhaize-5.mjs';
import * as colruyt1 from './recepten-week-219-colruyt-1.mjs';
import * as colruyt2 from './recepten-week-219-colruyt-2.mjs';
import * as colruyt3 from './recepten-week-219-colruyt-3.mjs';
import * as colruyt4 from './recepten-week-219-colruyt-4.mjs';
import * as colruyt5 from './recepten-week-219-colruyt-5.mjs';

export const DELEN = { delhaize1, delhaize2, delhaize3, delhaize4, delhaize5, colruyt1, colruyt2, colruyt3, colruyt4, colruyt5 };
export const RECEPTEN = Object.values(DELEN).flatMap((m) => m.RECEPTEN);
/** Nieuwe ingrediënten uit alle delen, met dubbels (zie ingredienten-week-219.mjs). */
export const NIEUWE_INGREDIENTEN_PER_DEEL = Object.values(DELEN).flatMap((m) => m.NIEUWE_INGREDIENTEN ?? []);
