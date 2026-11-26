// Hoeveelheden in de stap zelf (WEEK-335): "Voeg de kokosmelk toe" wordt "Voeg de kokosmelk (100 ml) toe",
// zodat je tijdens het koken niet terug moet naar de kaart "Wat heb je nodig". Pure logica.
//
// Regels (afspraak eigenaar):
// - Enkel de eerste keer dat een ingrediënt in de bereiding voorkomt.
// - Staat er "de helft van", "de rest van", "een deel van" (of een vertaling) vlak voor het ingrediënt, dan zou de
//   volle hoeveelheid misleiden. Zo'n ingrediënt krijgt dan nergens een hoeveelheid.
// - Samengestelde woorden tellen mee: "bloemkoolroosjes" hoort bij bloemkool.

/** Een stuk stappentekst; `hoeveelheid` = de tekst die er tussen haakjes achter komt. */
export type StapDeel = { tekst: string; hoeveelheid?: string };

/** Een ingrediënt met de tekst van zijn hoeveelheid (al opgemaakt in de taal van de app, bv. "100 ml"). */
export type IngredientTekst = { naam: string; hoeveelheid: string };

/** Woorden die zeggen dat maar een deel van het ingrediënt gebruikt wordt (4 talen). */
const DEEL = new RegExp(
  '^(' +
    [
      // nl
      'helft|halve|rest|resterende|overige|overschot|deel|beetje|wat|scheut|scheutje|klont|klontje|klontjes|stukje|snuf|snufje|kwart|derde|driekwart|meeste|handje|handvol',
      // en
      'half|remaining|some|part|portion|rest|quarter|third|most|knob|pinch|splash|dash|bit|handful',
      // fr
      'moitié|reste|restant|partie|peu|quart|tiers|noix|pincée|filet|trait|morceau|plupart|poignée',
      // de
      'hälfte|restliche[nrsm]?|übrige[nrsm]?|teil|etwas|drittel|viertel|stück|stückchen|prise|schuss|stich|meisten|handvoll',
    ].join('|') +
    ')$',
  'iu',
);

/** Hoeveel woorden vóór het ingrediënt we naar zo'n "deel"-woord kijken. */
const VENSTER = 4;

const LETTER = /[\p{L}\p{M}'’-]/u;

function klein(s: string): string {
  return s.toLocaleLowerCase('nl');
}

/** Korte namen (ui, ei, kip, olie) enkel als heel woord of meervoud, nooit als begin van een ander woord ("uit", "olievlek"). */
const KORT = 5;
const KORTE_UITGANGEN = ['', 'en', 'n', 's', 'es', 'e', 'eren', 'jes', 'tjes', 'x'];

/** De vormen waaronder een naam in een stap kan staan: de naam zelf en, bij langere namen, zonder meervoud. */
function vormen(naam: string): string[] {
  // "tomaten (blik)" → "tomaten"
  const n = klein(naam.replace(/\(.*?\)/g, '').trim());
  const lijst = [n];
  if (n.length >= 6 && !n.includes(' ')) {
    const stam = n.replace(/(en|s|n)$/u, '');
    if (stam !== n && stam.length >= KORT) lijst.push(stam);
  }
  return lijst;
}

/** Waar komt het ingrediënt voor in de tekst? Geeft begin en einde van het woord (met samenstelling) of undefined. */
export function zoekIngredient(tekst: string, naam: string): { start: number; eind: number } | undefined {
  const t = klein(tekst);
  let beste: { start: number; eind: number } | undefined;
  for (const n of vormen(naam)) {
    if (n.length < 2) continue;
    let van = 0;
    while (van <= t.length) {
      const i = t.indexOf(n, van);
      if (i < 0) break;
      van = i + 1;
      const ervoor = i === 0 ? '' : t[i - 1];
      // Het ingrediënt moet een woord beginnen (niet "olie" in "olijfolie" of "ui" in "fruit").
      // Na een weggelaten klinker telt het wel als nieuw woord: l'ail, d'huile.
      if (ervoor && LETTER.test(ervoor) && ervoor !== "'" && ervoor !== '’') continue;
      // Het hele woord nemen, met samenstelling ("bloemkoolroosjes", "Blumenkohlröschen").
      let eind = i + n.length;
      while (eind < t.length && LETTER.test(t[eind]) && t[eind] !== "'" && t[eind] !== '’' && t[eind] !== '-') eind++;
      if (n.length < KORT && !KORTE_UITGANGEN.includes(t.slice(i + n.length, eind))) continue;
      if (!beste || i < beste.start) beste = { start: i, eind };
      break;
    }
  }
  return beste;
}

/** De woorden van dezelfde zin vlak voor een plaats in de tekst. */
function woordenErvoor(tekst: string, start: number, aantal: number): string[] {
  const zin = tekst.slice(0, start).split(/[.;:!?]/u).pop() ?? '';
  return zin.split(/\s+/).filter(Boolean).slice(-aantal).map((w) => w.replace(/[,()«»"“”]/g, ''));
}

/** Staat er een "deel"-woord ("de helft van") vlak voor het ingrediënt? */
const isDeel = (tekst: string, start: number) => woordenErvoor(tekst, start, VENSTER).some((w) => DEEL.test(w));

/** Staat er al een hoeveelheid vlak voor het ingrediënt ("2 eieren", "200 g bloem")? Dan niets toevoegen. */
const heeftGetalErvoor = (tekst: string, start: number) => woordenErvoor(tekst, start, 2).some((w) => /[\d½¼¾]/u.test(w));

/**
 * Splitst elke stap in stukken, met de hoeveelheid achter de eerste vermelding van elk ingrediënt.
 * Langere namen eerst, zodat "witte wijn" voor "wijn" komt. Ingrediënten zonder hoeveelheid worden overgeslagen.
 */
export function stappenMetHoeveelheden(stappen: readonly string[], ingredienten: readonly IngredientTekst[]): StapDeel[][] {
  // Per stap: lijst van invoegingen { na: index, hoeveelheid }.
  const invoegen: { na: number; hoeveelheid: string; start: number; eind: number }[][] = stappen.map(() => []);
  const volgorde = [...ingredienten].filter((i) => i.hoeveelheid.trim() && i.naam.trim()).sort((a, b) => b.naam.length - a.naam.length);

  for (const ing of volgorde) {
    for (let s = 0; s < stappen.length; s++) {
      const plaats = zoekIngredient(stappen[s], ing.naam);
      if (!plaats) continue;
      // Al door een langere naam bezet (bv. "wijn" binnen "witte wijn")?
      const bezet = invoegen[s].some((v) => plaats.start < v.eind && plaats.eind > v.start);
      if (bezet) break;
      // De eerste vermelding is maar een deel: nergens een hoeveelheid voor dit ingrediënt.
      if (isDeel(stappen[s], plaats.start) || heeftGetalErvoor(stappen[s], plaats.start)) break;
      invoegen[s].push({ na: plaats.eind, hoeveelheid: ing.hoeveelheid.trim(), start: plaats.start, eind: plaats.eind });
      break;
    }
  }

  return stappen.map((tekst, s) => {
    const lijst = invoegen[s].sort((a, b) => a.na - b.na);
    const delen: StapDeel[] = [];
    let van = 0;
    for (const v of lijst) {
      delen.push({ tekst: tekst.slice(van, v.na), hoeveelheid: v.hoeveelheid });
      van = v.na;
    }
    if (van < tekst.length || !delen.length) delen.push({ tekst: tekst.slice(van) });
    return delen;
  });
}

/** De stap als gewone tekst, met de hoeveelheden tussen haakjes (voor schermlezers en tests). */
export function alsTekst(delen: readonly StapDeel[]): string {
  return delen.map((d) => (d.hoeveelheid ? `${d.tekst} (${d.hoeveelheid})` : d.tekst)).join('');
}
