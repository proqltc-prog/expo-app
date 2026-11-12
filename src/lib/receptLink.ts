// WEEK-247: een eigen recept inlezen via een link van een receptensite. Pure logica, zonder netwerk.
// De meeste receptensites zetten hun recept als gestructureerde gegevens (schema.org "Recipe" in JSON-LD) in de pagina.
// Een Supabase-functie haalt die blokken op (supabase/functions/recept-link); hier worden ze gelezen:
//  - naam, aantal personen, kooktijd, ingrediënten (als tekstregels) en stappen;
//  - elke ingrediëntregel wordt ontleed (hoeveelheid, eenheid, naam) en gekoppeld aan de ingrediëntenlijst van de app.
//    Een dubbel of synoniem (meervoud, "rijpe", "verse", andere taal) gebruikt altijd het bestaande ingrediënt: geen dubbels;
//  - hoeveelheden worden omgerekend naar de eenheid van de app en naar één volwassene.
import { eenheidVan, gewichtPerStuk, ingredientNaam, INGREDIENT_CODES, IngredientCode, isVoorraad } from '@/data/ingredienten';
import { INGREDIENTEN_DB } from '@/data/ingredienten.gegenereerd';
import type { Eenheid, Soort } from '@/data/recept';
import { TALEN, Taal } from '@/i18n';
import type { EigenIngredient } from '@/lib/eigenrecepten';

/** Zoveel personen nemen we aan als de site het niet vermeldt. */
export const STANDAARD_PERSONEN = 4;
const MAX_REGELS = 60;
const MAX_STAPPEN = 30;
const MAX_STAP_LENGTE = 1000;

// ---------------------------------------------------------------- de link

/**
 * De eerste http(s)-link in een tekst (ook als de gebruiker "Bekijk dit recept: https://…" plakt), of undefined.
 * Enkel gewone websites: geen IP-adressen, geen localhost, geen andere poorten.
 */
export function zoekLink(tekst: string): string | undefined {
  const m = tekst.match(/https?:\/\/[^\s<>"']+/i);
  if (!m) return undefined;
  let url: URL;
  try {
    url = new URL(m[0].replace(/[).,;!?]+$/, ''));
  } catch {
    return undefined;
  }
  return isVeiligeLink(url) ? url.href : undefined;
}

/** Een link die de Supabase-functie mag ophalen (dezelfde regels staan in de functie zelf). */
export function isVeiligeLink(url: URL): boolean {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '80' && url.port !== '443') return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return false;
  if (/^[\d.]+$/.test(host) || host.startsWith('[')) return false; // IP-adressen
  return true;
}

// ---------------------------------------------------------------- de pagina

/** De inhoud van elk <script type="application/ld+json">-blok in de HTML (dezelfde regel staat in de Supabase-functie). */
export function ldJsonBlokken(html: string): string[] {
  const uit: string[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) uit.push(m[1]);
  return uit;
}

export type RuwRecept = {
  naam: string;
  personen?: number;
  minuten?: number;
  ingredienten: string[];
  stappen: string[];
  /** De taal van het recept volgens de site (nl, fr, de, en), als die gekend is. */
  taal?: Taal;
};

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const isObject = (x: unknown): x is Record<string, Json> => typeof x === 'object' && x !== null && !Array.isArray(x);

function isReceptType(x: Record<string, Json>): boolean {
  const t = x['@type'];
  return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'));
}

/** Zoekt het eerste Recipe-object, ook in een @graph, een lijst of mainEntity. */
function vindReceptObject(x: Json, diepte = 0): Record<string, Json> | undefined {
  if (diepte > 6) return undefined;
  if (Array.isArray(x)) {
    for (const y of x) {
      const r = vindReceptObject(y, diepte + 1);
      if (r) return r;
    }
    return undefined;
  }
  if (!isObject(x)) return undefined;
  if (isReceptType(x)) return x;
  for (const sleutel of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    if (sleutel in x) {
      const r = vindReceptObject(x[sleutel], diepte + 1);
      if (r) return r;
    }
  }
  return undefined;
}

function leesJson(blok: string): Json | undefined {
  const tekst = blok.trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
  try {
    return JSON.parse(tekst) as Json;
  } catch {
    try {
      // Sommige sites laten ruwe regeleinden of tabs in tekstwaarden staan.
      return JSON.parse(tekst.replace(/[\u0000-\u001f]+/g, ' ')) as Json;
    } catch {
      return undefined;
    }
  }
}

/** Leest het recept uit de JSON-LD-blokken van een pagina; undefined als er geen bruikbaar recept in staat. */
export function vindRecept(blokken: readonly string[], paginaTaal?: string): RuwRecept | undefined {
  for (const blok of blokken) {
    const json = leesJson(blok);
    const r = json === undefined ? undefined : vindReceptObject(json);
    if (!r) continue;
    const ingredienten = tekstLijst(r.recipeIngredient ?? r.ingredients)
      .map((x) => schoneTekst(x))
      .filter(Boolean)
      .slice(0, MAX_REGELS);
    if (!ingredienten.length) continue;
    const taal = leesTaal(typeof r.inLanguage === 'string' ? r.inLanguage : paginaTaal);
    return {
      naam: schoneTekst(typeof r.name === 'string' ? r.name : '').slice(0, 120),
      personen: leesPersonen(r.recipeYield),
      minuten: leesMinuten(r),
      ingredienten,
      stappen: leesStappen(r.recipeInstructions),
      ...(taal ? { taal } : {}),
    };
  }
  return undefined;
}

function tekstLijst(x: Json | undefined): string[] {
  if (typeof x === 'string') return [x];
  if (Array.isArray(x)) return x.flatMap((y) => (typeof y === 'string' ? [y] : isObject(y) && typeof y.text === 'string' ? [y.text] : []));
  return [];
}

/** "nl-BE" → nl; een andere taal dan de vier van de app → undefined. */
export function leesTaal(code?: string): Taal | undefined {
  const t = code?.slice(0, 2).toLowerCase();
  return (TALEN as readonly string[]).includes(t ?? '') ? (t as Taal) : undefined;
}

/** "4", "4 personen", ["4", "4 servings"], 4 → 4. Een bereik ("4-6") geeft het eerste getal. */
export function leesPersonen(x: Json | undefined): number | undefined {
  if (typeof x === 'number') return x >= 1 && x <= 50 ? Math.round(x) : undefined;
  if (typeof x === 'string') {
    const m = x.match(/\d+/);
    const n = m ? Number(m[0]) : NaN;
    return n >= 1 && n <= 50 ? n : undefined;
  }
  if (Array.isArray(x)) {
    for (const y of x) {
      const n = leesPersonen(y);
      if (n) return n;
    }
  }
  return undefined;
}

/** Een ISO 8601-duur (PT1H30M, P0DT0H45M) in minuten; undefined als ze niet te lezen of nul is. */
export function duurInMinuten(x: Json | undefined): number | undefined {
  if (typeof x !== 'string') return undefined;
  const m = x.trim().match(/^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!m) return undefined;
  const min = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) + Number(m[4] ?? 0) / 60;
  return min > 0 ? Math.round(min) : undefined;
}

/** De totale tijd, anders voorbereiding + kooktijd. */
function leesMinuten(r: Record<string, Json>): number | undefined {
  const totaal = duurInMinuten(r.totalTime);
  if (totaal) return totaal;
  const som = (duurInMinuten(r.prepTime) ?? 0) + (duurInMinuten(r.cookTime) ?? 0);
  return som > 0 ? som : undefined;
}

/** De stappen: tekst, een lijst van teksten, HowToStep's of HowToSection's met stappen. */
export function leesStappen(x: Json | undefined): string[] {
  const uit: string[] = [];
  const voeg = (y: Json | undefined, diepte: number): void => {
    if (diepte > 4 || y === undefined || y === null) return;
    if (typeof y === 'string') {
      for (const deel of schoneTekst(y, true).split('\n')) if (deel.trim()) uit.push(deel.trim());
      return;
    }
    if (Array.isArray(y)) {
      for (const z of y) voeg(z, diepte + 1);
      return;
    }
    if (!isObject(y)) return;
    if (y.itemListElement !== undefined) voeg(y.itemListElement, diepte + 1);
    else if (typeof y.text === 'string') voeg(y.text, diepte + 1);
    else if (typeof y.name === 'string') voeg(y.name, diepte + 1);
  };
  voeg(x, 0);
  return uit.map((s) => s.replace(/^\d+[.)]\s+/, '').slice(0, MAX_STAP_LENGTE)).filter(Boolean).slice(0, MAX_STAPPEN);
}

const ENTITEITEN: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', ccedil: 'ç', ouml: 'ö', uuml: 'ü', auml: 'ä', szlig: 'ß', euml: 'ë', iuml: 'ï' };

/** Haalt HTML-tags en -entiteiten weg en zet witruimte recht. Met `regels` blijven regeleinden (van <br>, <p>, <li>) behouden. */
export function schoneTekst(x: string, regels = false): string {
  let t = x
    .replace(/<\s*(br|\/p|\/li|\/div)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+\d*);/gi, (m, n: string) => ENTITEITEN[n.toLowerCase()] ?? m);
  t = regels ? t.split(/\r?\n/).map((r) => r.replace(/\s+/g, ' ').trim()).join('\n') : t.replace(/\s+/g, ' ');
  return t.trim();
}

// ---------------------------------------------------------------- een ingrediëntregel

/** Een eenheid zoals ze op receptensites staat, met de omrekening naar de basiseenheid. "onbekend": niet om te rekenen (bosje, zakje). */
type Bron = { soort: 'g' | 'ml' | 'stuk' | 'teentje' | 'snuf' | 'onbekend'; factor: number };

const EENHEID_WOORDEN: ReadonlyArray<[readonly string[], Bron]> = [
  [['g', 'gr', 'gram', 'grams', 'gramm', 'gramme', 'grammes'], { soort: 'g', factor: 1 }],
  [['kg', 'kilo', 'kilogram', 'kilos', 'kilogramm'], { soort: 'g', factor: 1000 }],
  [['mg'], { soort: 'g', factor: 0.001 }],
  [['ml', 'milliliter', 'millilitre', 'millilitres'], { soort: 'ml', factor: 1 }],
  [['cl', 'centiliter', 'centilitre'], { soort: 'ml', factor: 10 }],
  [['dl', 'deciliter', 'decilitre'], { soort: 'ml', factor: 100 }],
  [['l', 'liter', 'liters', 'litre', 'litres'], { soort: 'ml', factor: 1000 }],
  [['el', 'eetlepel', 'eetlepels', 'eetl', 'tbsp', 'tbs', 'tablespoon', 'tablespoons', 'cas', 'cs', 'essloffel', 'el.'], { soort: 'ml', factor: 15 }],
  [['tl', 'theelepel', 'theelepels', 'koffielepel', 'koffielepels', 'kl', 'tsp', 'teaspoon', 'teaspoons', 'cac', 'cc', 'teeloffel'], { soort: 'ml', factor: 5 }],
  [['cup', 'cups', 'tasse', 'tasses'], { soort: 'ml', factor: 240 }],
  [['kop', 'kopje', 'kopjes', 'tas'], { soort: 'ml', factor: 200 }],
  [['oz', 'ounce', 'ounces'], { soort: 'g', factor: 28 }],
  [['lb', 'lbs', 'pound', 'pounds'], { soort: 'g', factor: 454 }],
  [['teentje', 'teentjes', 'teen', 'tenen', 'gousse', 'gousses', 'zehe', 'zehen', 'clove', 'cloves'], { soort: 'teentje', factor: 1 }],
  [['stuk', 'stuks', 'st', 'piece', 'pieces', 'stuck', 'snee', 'sneetje', 'sneetjes', 'tranche', 'tranches', 'scheibe', 'scheiben', 'slice', 'slices'], { soort: 'stuk', factor: 1 }],
  [['snuifje', 'snufje', 'mespuntje', 'pincee', 'pincees', 'prise', 'prisen', 'pinch', 'pinches', 'scheutje', 'trait', 'schuss', 'dash'], { soort: 'snuf', factor: 1 }],
  [['blik', 'blikken', 'boite', 'boites', 'dose', 'dosen', 'can', 'cans', 'tin', 'tins'], { soort: 'g', factor: 400 }],
  [['blikje', 'blikjes'], { soort: 'g', factor: 150 }],
  [['bosje', 'bosjes', 'bos', 'takje', 'takjes', 'zakje', 'zakjes', 'pak', 'pakje', 'pakjes', 'bouquet', 'botte', 'brin', 'brins', 'branche', 'sachet', 'bund', 'bundel', 'zweig', 'zweige', 'packung', 'paket', 'bunch', 'sprig', 'sprigs', 'handvol', 'poignee', 'handvoll', 'handful'], { soort: 'onbekend', factor: 1 }],
];

const EENHEDEN_INDEX: ReadonlyMap<string, Bron> = new Map(EENHEID_WOORDEN.flatMap(([woorden, bron]) => woorden.map((w) => [w, bron] as const)));

/** Woorden van meer dan één woord die samen een eenheid vormen, eerst vervangen door één token. */
const MEERWOORD_EENHEDEN: ReadonlyArray<[RegExp, string]> = [
  [/\bc(?:uill?[eè]res?)?\.?\s*(?:a|à)\s*s(?:oupe)?\b\.?/gi, 'cas'],
  [/\bc(?:uill?[eè]res?)?\.?\s*(?:a|à)\s*c(?:af[eé])?\b\.?/gi, 'cac'],
  [/\bc\.a\.s\.?/gi, 'cas'],
  [/\bc\.a\.c\.?/gi, 'cac'],
];

const BREUKEN: Record<string, string> = { '½': '.5', '¼': '.25', '¾': '.75', '⅓': '.333', '⅔': '.667', '⅛': '.125' };

export type Ontleed = { hoeveelheid?: number; bron?: Bron; naam: string };

const EEN_WOORDEN = new Set(['een', 'één', 'un', 'une', 'ein', 'eine', 'einen', 'a', 'an']);

function getal(t: string): number {
  const s = t.replace(',', '.');
  const breuk = s.match(/^(\d+)\/(\d+)$/);
  if (breuk) return Number(breuk[1]) / Number(breuk[2]);
  const gemengd = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (gemengd) return Number(gemengd[1]) + Number(gemengd[2]) / Number(gemengd[3]);
  return Number(s);
}

const NORM = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Ontleedt een ingrediëntregel: "200 g bloem", "2 el olijfolie", "1½ dl melk", "2 teentjes look", "3 rijpe tomaten",
 * "1 x 400 g tomatenblokjes", "1 blik (400 g) tomaten", "200 g de farine", "zout naar smaak".
 */
export function ontleedRegel(regel: string): Ontleed {
  let t = schoneTekst(regel);
  for (const [teken, waarde] of Object.entries(BREUKEN)) t = t.replace(new RegExp(`(\\d*)\\s*${teken}`, 'g'), (_, d: string) => `${d || '0'}${waarde}`);
  for (const [re, token] of MEERWOORD_EENHEDEN) t = t.replace(re, ` ${token} `);
  t = t.replace(/\s+/g, ' ').trim();

  const GETAL = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?`;
  let hoeveelheid: number | undefined;
  let rest = t;
  // "2 x 400 g": een aantal keer een hoeveelheid
  const keer = rest.match(new RegExp(`^(${GETAL})\\s*[x×]\\s*(${GETAL})\\s*`, 'i'));
  if (keer) {
    hoeveelheid = getal(keer[1]) * getal(keer[2]);
    rest = rest.slice(keer[0].length);
  } else {
    const m = rest.match(new RegExp(`^(${GETAL})(?:\\s*(?:-|–|à|a|tot|to|bis|of|ou|or)\\s*(?:${GETAL}))?\\s*`, 'i'));
    if (m) {
      hoeveelheid = getal(m[1]);
      rest = rest.slice(m[0].length);
    } else {
      const woord = rest.match(/^(\S+)\s+/);
      if (woord && EEN_WOORDEN.has(woord[1].toLowerCase())) {
        hoeveelheid = 1;
        rest = rest.slice(woord[0].length);
      }
    }
  }

  // De eenheid: het eerste woord (of "200g" zonder spatie, dan staat ze vooraan in rest).
  let bron: Bron | undefined;
  const eenheid = rest.match(/^([a-zA-ZÀ-ÿß.]+)\s*/);
  if (eenheid) {
    const sleutel = NORM(eenheid[1]).replace(/\.$/, '');
    const gevonden = EENHEDEN_INDEX.get(sleutel) ?? EENHEDEN_INDEX.get(eenheid[1].toLowerCase());
    if (gevonden) {
      bron = gevonden;
      rest = rest.slice(eenheid[0].length);
      if (hoeveelheid === undefined) hoeveelheid = 1; // "snuifje zout", "teentje look"
    }
  }
  // "1 blik (400 g) tomaten": de hoeveelheid tussen haakjes is preciezer.
  const haakjes = rest.match(new RegExp(`^\\((${GETAL})\\s*([a-zA-Z]+)\\.?\\)\\s*`));
  if (haakjes) {
    const b = EENHEDEN_INDEX.get(NORM(haakjes[2]));
    if (b && (b.soort === 'g' || b.soort === 'ml')) {
      hoeveelheid = (hoeveelheid ?? 1) * getal(haakjes[1]);
      bron = b;
      rest = rest.slice(haakjes[0].length);
    }
  }
  // Verbindingswoorden: "200 g de farine", "d'huile", "2 cups of flour", "1 bosje van".
  rest = rest.replace(/^(?:de|d'|d’|du|des|of|van|aan)\s*/i, '').trim();
  if (!bron && hoeveelheid !== undefined) bron = { soort: 'stuk', factor: 1 }; // "3 tomaten": een aantal stuks
  return { ...(hoeveelheid !== undefined && Number.isFinite(hoeveelheid) && hoeveelheid > 0 ? { hoeveelheid } : {}), ...(bron ? { bron } : {}), naam: rest };
}

// ---------------------------------------------------------------- koppelen aan de ingrediëntenlijst

/** Woorden die niets zeggen over welk ingrediënt het is: bereiding, grootte, versheid, "naar smaak". In de 4 talen. */
const BIJWOORDEN = new Set(
  (
    'vers verse rijp rijpe groot grote klein kleine middelgroot middelgrote fijn fijne gehakt gehakte fijngehakt fijngehakte gesnipperd gesnipperde ' +
    'gesneden in reepjes blokjes plakjes schijfjes ringen geraspt geraspte geperst geperste gepeld gepelde gekookt gekookte ' +
    'biologisch biologische bio extra vierge zacht zachte koud koude warm warme lauw lauwe gesmolten naar smaak eventueel optioneel ' +
    'ongeveer circa ca een paar of en voor de het om te garneren garnering stuk stukje stukjes geschild geschilde ' +
    'frais fraiche fraiches gros grosse grosses petit petite petits petites hache hachee haches hachees emince emincee cisele ciselee ' +
    'rape rapee rapes rapees en des de du la le les au aux pour un une selon gout facultatif environ fondu fondue tiede ' +
    'frisch frische frischer gross grosse grossen klein kleine kleinen gehackt gehackte fein feine gerieben geriebene ' +
    'geschalt geschalte nach geschmack etwas evtl und oder zum fur der die das reif reife ' +
    'fresh large small medium chopped finely diced sliced minced grated peeled ripe to taste optional about and or for the of ' +
    'crushed melted softened cold warm organic trimmed picked deseeded halved quartered roughly thinly thickly cut into ' +
    'half halves whole rest left serve serving garnish leaves leaf stick sticks rasher rashers smoked streaky dried ' +
    'gedroogd gedroogde gerookt gerookte blaadjes blad bladeren stengel stengels seche sechee seches feuilles feuille ' +
    'getrocknet getrocknete geraucht blatter blatt stange stangen ontpit ontpitte zaadjes verwijderd'
  ).split(' ')
);

/** De stam van een woord: zonder meervoudsuitgang en met enkele klinkers ("tomaten" en "tomaat" → "tomat"). */
export function stam(woord: string): string {
  let w = NORM(woord);
  // twee keer, voor "citroenen" → "citroen" → "citro" (zoals "citroen"); korte woorden ("uien" → "ui") één keer
  for (let i = 0; i < 2; i++) {
    if (w.length > 4) w = w.replace(/(eren|en|es|s|n|e|x)$/, '');
    else if (w.length === 4 && i === 0) w = w.replace(/(en|s|x)$/, '');
  }
  return w.replace(/aa/g, 'a').replace(/ee/g, 'e').replace(/oo/g, 'o').replace(/uu/g, 'u');
}

/** Woorden van een naam: zonder haakjes, zonder wat na een komma komt, zonder bijwoorden. */
function woorden(naam: string): string[] {
  const kern = NORM(naam)
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;:]/)[0]
    .replace(/[^a-z0-9ß\s-]/g, ' ')
    .replace(/-/g, ' ');
  const alle = kern.split(/\s+/).filter((w) => w && !BIJWOORDEN.has(w) && !/^\d+$/.test(w));
  // Eenheden in de naam ("garlic cloves", "tins plum tomatoes") zeggen niets over het ingrediënt, tenzij er niets anders overblijft.
  const zonderEenheden = alle.filter((w) => !EENHEDEN_INDEX.has(w));
  return zonderEenheden.length ? zonderEenheden : alle;
}

/** Synoniemen die niet uit de namen af te leiden zijn: naam (genormaliseerd, enkelvoud of meervoud) → code. */
const SYNONIEMEN: Readonly<Record<string, IngredientCode>> = {
  look: 'knoflook',
  lookteentje: 'knoflook',
  lookteentjes: 'knoflook',
  ei: 'eieren',
  oeuf: 'eieren',
  egg: 'eieren',
  peper: 'zwarte_peper',
  poivre: 'zwarte_peper',
  pfeffer: 'zwarte_peper',
  pepper: 'zwarte_peper',
  parmezaan: 'kaas_parmezaan',
  parmezaanse: 'kaas_parmezaan',
  parmesan: 'kaas_parmezaan',
  bouillon: 'groentebouillon',
  'gemalen komijn': 'komijn',
  mince: 'gehakt',
  'beef mince': 'gehakt',
  'minced beef': 'gehakt',
  rundergehakt: 'gehakt',
  'gehakt van het rund': 'gehakt',
  'boeuf hache': 'gehakt',
  rinderhackfleisch: 'gehakt',
  rundsvlees: 'rundvlees',
  rundvlees: 'rundvlees',
  stoofvlees: 'rundvlees',
  'stoofvlees van het rund': 'rundvlees',
  bacon: 'spek',
  lardons: 'spek',
};

type Index = { code: IngredientCode; taal: Taal; stammen: string[] }[];
let index: Index | undefined;

function bouwIndex(): Index {
  if (!index) {
    index = INGREDIENT_CODES.flatMap((code) =>
      TALEN.map((taal) => ({ code, taal, stammen: woorden(ingredientNaam(code, taal)).map(stam) })).filter((x) => x.stammen.length)
    );
  }
  return index;
}

export type Koppeling = { code: IngredientCode; zeker: boolean };

/**
 * Koppelt een ingrediëntnaam aan de ingrediëntenlijst (WEEK-247). Een dubbel of synoniem gebruikt altijd het bestaande ingrediënt.
 * - zeker: dezelfde woorden (zonder meervoud, bijwoorden of haakjes) als een naam in een van de 4 talen, of een gekend synoniem;
 * - voorstel (zeker = false): het beste gedeeltelijke ingrediënt ("rode ui" in "grote rode ui, gesnipperd", "tomaten" in "trostomaten");
 * - undefined: niets dat lijkt.
 * Bij gelijke kansen wint de taal van het recept, dan de taal van de app.
 */
export function koppelIngredient(naam: string, talen: readonly Taal[] = []): Koppeling | undefined {
  const w = woorden(naam);
  if (!w.length) return undefined;
  const q = w.map(stam);
  const synoniem = SYNONIEMEN[w.join(' ')] ?? SYNONIEMEN[NORM(naam).trim()];
  if (synoniem) return { code: synoniem, zeker: true };
  const voorkeur = (t: Taal) => {
    const i = talen.indexOf(t);
    return i < 0 ? talen.length : i;
  };

  let beste: { code: IngredientCode; score: number; zeker: boolean; taal: number } | undefined;
  const kandidaat = (code: IngredientCode, score: number, zeker: boolean, taal: number) => {
    if (!beste || score > beste.score || (score === beste.score && taal < beste.taal)) beste = { code, score, zeker, taal };
  };
  for (const item of bouwIndex()) {
    const t = voorkeur(item.taal);
    const n = item.stammen;
    if (n.length === q.length && n.every((s, i) => s === q[i])) {
      kandidaat(item.code, 1000 + n.join('').length, true, t);
      continue;
    }
    // Elk woord van de naam in de lijst komt voor in de regel (of als einde van een samengesteld woord: "trostomaten").
    const allesGevonden = n.every((s) => q.some((x) => x === s || (s.length >= 4 && x.length > s.length && x.endsWith(s))));
    if (allesGevonden) {
      const score = n.join('').length * 10 - (q.length - n.length);
      kandidaat(item.code, score, false, t);
      continue;
    }
    // De regel is een deel van de naam ("peper" in "zwarte peper"); zwakker.
    if (q.every((s) => s.length >= 3 && n.includes(s))) kandidaat(item.code, q.join('').length * 5 - (n.length - q.length), false, t);
  }
  return beste ? { code: beste.code, zeker: beste.zeker } : undefined;
}

// ---------------------------------------------------------------- omrekenen

/** De eenheid waarin de app dit ingrediënt bijhoudt (zoals standaardEenheid in eigenrecepten). */
export function doelEenheid(code: IngredientCode): Eenheid {
  const e = eenheidVan(code);
  return e === 'g' || e === 'ml' || e === 'stuk' || e === 'teentje' ? e : 'g';
}

const GRAM_PER_TEENTJE = 5;

/** Afronden zoals een mens het zou opschrijven: gram en ml op 5 vanaf 10, stuks op een kwart. */
export function rondAf(x: number, eenheid: Eenheid): number {
  if (eenheid === 'stuk' || eenheid === 'teentje') return Math.max(0.25, Math.round(x * 4) / 4);
  if (x >= 10) return Math.round(x / 5) * 5;
  if (x >= 1) return Math.round(x);
  return Math.max(0.1, Math.round(x * 10) / 10);
}

/**
 * De hoeveelheid voor één volwassene in de eenheid van de app, of undefined als ze niet te bepalen is
 * (geen hoeveelheid, "1 bosje", of stuks tegen gram zonder gekend stukgewicht).
 */
export function omrekenen(o: Pick<Ontleed, 'hoeveelheid' | 'bron'>, code: IngredientCode, personen: number): number | undefined {
  const doel = doelEenheid(code);
  if (o.hoeveelheid === undefined || !o.bron) {
    // Zout en peper "naar smaak": een klein beetje.
    return isVoorraad(code) && doel === 'g' ? 1 : undefined;
  }
  const basis = o.hoeveelheid * o.bron.factor;
  const stuk = gewichtPerStuk(code);
  let waarde: number | undefined;
  switch (o.bron.soort) {
    case 'g':
    case 'ml':
      // gram en ml gelijkstellen is voor keukenhoeveelheden goed genoeg
      waarde = doel === 'g' || doel === 'ml' ? basis : doel === 'teentje' ? basis / GRAM_PER_TEENTJE : stuk ? basis / stuk : undefined;
      break;
    case 'stuk':
    case 'teentje':
      waarde = doel === 'stuk' || doel === 'teentje' ? basis : o.bron.soort === 'teentje' ? basis * GRAM_PER_TEENTJE : stuk ? basis * stuk : undefined;
      break;
    case 'snuf':
      waarde = doel === 'g' || doel === 'ml' ? basis : undefined;
      // een snuifje is voor het hele gerecht; per persoon blijft het een snuifje
      return waarde === undefined ? undefined : rondAf(waarde, doel);
    default:
      waarde = undefined;
  }
  if (waarde === undefined || !(waarde > 0)) return undefined;
  return rondAf(waarde / Math.max(1, personen), doel);
}

// ---------------------------------------------------------------- het hele recept

/** Een regel die de gebruiker moet nakijken: een voorstel, een onbekend ingrediënt of een ontbrekende hoeveelheid. */
export type NakijkRegel = {
  /** De regel zoals op de site. */
  tekst: string;
  /** De naam zonder hoeveelheid en eenheid; om te melden als het ingrediënt onbekend is (WEEK-248). */
  naam: string;
  reden: 'voorstel' | 'onbekend' | 'hoeveelheid';
  code?: IngredientCode;
  /** De hoeveelheid voor één volwassene in de eenheid van de app, als die te bepalen is. */
  hoeveelheid?: number;
};

/** Het soort gerecht volgens de ingrediënten: met vlees "vlees", anders met vis "vis", anders "vegetarisch". */
export function soortVanIngredienten(codes: readonly IngredientCode[]): Soort {
  const categorieen = new Set(codes.map((c) => INGREDIENTEN_DB[c][0] as string));
  return categorieen.has('vlees') ? 'vlees' : categorieen.has('vis') ? 'vis' : 'vegetarisch';
}

export type IngelezenRecept = {
  naam: string;
  /** Afgeleid uit de gekoppelde ingrediënten en de voorstellen; de gebruiker kan het nog aanpassen. */
  soort: Soort;
  minuten?: number;
  stappen: string[];
  /** De ingrediënten die zeker gekoppeld zijn en een hoeveelheid hebben; een ingrediënt dat twee keer voorkomt, wordt samengeteld. */
  ingredienten: EigenIngredient[];
  nakijken: NakijkRegel[];
  /** Het aantal personen waarvan omgerekend is, en of dat van de site kwam. */
  personen: number;
  personenVanSite: boolean;
};

/** Voegt een ingrediënt toe aan de lijst; staat het er al (zelfde code), dan worden de hoeveelheden samengeteld. */
export function voegSamen(lijst: readonly EigenIngredient[], nieuw: EigenIngredient): EigenIngredient[] {
  const i = nieuw.code ? lijst.findIndex((x) => x.code === nieuw.code) : -1;
  if (i < 0) return [...lijst, nieuw];
  return lijst.map((x, j) => (j === i ? { ...x, hoeveelheid: rondAf(x.hoeveelheid + nieuw.hoeveelheid, x.eenheid) } : x));
}

/**
 * "zout en peper", "sel et poivre", "Salz und Pfeffer": een regel zonder hoeveelheid met twee gekende ingrediënten
 * wordt twee regels. Enkel als elk deel zeker gekoppeld is, anders blijft de regel zoals hij is.
 */
export function splitsRegel(regel: string, talen: readonly Taal[]): string[] {
  if (ontleedRegel(regel).hoeveelheid !== undefined) return [regel];
  const delen = schoneTekst(regel).split(/\s+(?:en|et|und|and|&)\s+|\s*,\s*/i).map((d) => d.trim()).filter(Boolean);
  if (delen.length < 2) return [regel];
  return delen.every((d) => koppelIngredient(d, talen)?.zeker) ? delen : [regel];
}

/** Verwerkt een ingelezen recept tot het formulier: gekoppelde ingrediënten, regels om na te kijken, stappen en kooktijd. */
export function verwerkRecept(ruw: RuwRecept, appTaal: Taal): IngelezenRecept {
  const personen = ruw.personen ?? STANDAARD_PERSONEN;
  const talen: Taal[] = [...new Set([...(ruw.taal ? [ruw.taal] : []), appTaal])];
  let ingredienten: EigenIngredient[] = [];
  const nakijken: NakijkRegel[] = [];
  for (const tekst of ruw.ingredienten.flatMap((r) => splitsRegel(r, talen))) {
    const o = ontleedRegel(tekst);
    const naam = o.naam || tekst;
    const k = koppelIngredient(naam, talen);
    if (!k) {
      nakijken.push({ tekst, naam, reden: 'onbekend' });
      continue;
    }
    const hoeveelheid = omrekenen(o, k.code, personen);
    if (!k.zeker) {
      nakijken.push({ tekst, naam, reden: 'voorstel', code: k.code, ...(hoeveelheid !== undefined ? { hoeveelheid } : {}) });
    } else if (hoeveelheid === undefined) {
      nakijken.push({ tekst, naam, reden: 'hoeveelheid', code: k.code });
    } else {
      ingredienten = voegSamen(ingredienten, { code: k.code, naam: ingredientNaam(k.code, appTaal), hoeveelheid, eenheid: doelEenheid(k.code) });
    }
  }
  const codes = [...ingredienten.flatMap((i) => (i.code ? [i.code] : [])), ...nakijken.flatMap((n) => (n.code ? [n.code] : []))];
  return {
    naam: ruw.naam,
    soort: soortVanIngredienten(codes),
    ...(ruw.minuten ? { minuten: ruw.minuten } : {}),
    stappen: ruw.stappen,
    ingredienten,
    nakijken,
    personen,
    personenVanSite: ruw.personen !== undefined,
  };
}
