// Eigen recepten (WEEK-45): recepten die het gezin zelf toevoegt. Pure logica, zonder opslag.
// Hoeveelheden zijn per volwassen portie, zoals in de databank.
import { Eenheid, Soort, STIJLEN, StijlCode } from '@/data/recept';
import { Afdeling, AFDELINGEN, afdelingVan, dbCodeVan, eenheidVan, IngredientCode } from '@/data/ingredienten';
import { MAX_KOOKTIJD_MIN } from '@/lib/kooktijd';
import type { Taal } from '@/i18n';
import { SEIZOENEN, Seizoen } from '@/data/seizoenen';
import { normaliseer, zoekCatalogus } from '@/lib/frigoSheets';

export const EENHEDEN: readonly Eenheid[] = ['g', 'ml', 'stuk', 'teentje'];
export const SOORTEN: readonly Soort[] = ['vegetarisch', 'vis', 'vlees'];
/** De stijl die het gezin zelf kiest voor eigen recepten; de naam is de naam van de gezinsruimte (WEEK-192). */
export const GEZIN_STIJL = 'gezin' as const;
export type StijlKeuze = StijlCode | typeof GEZIN_STIJL;
// WEEK-199: een eigen recept duurt, zoals elk recept in de app, nooit langer dan een uur.
const MAX_MINUTEN = MAX_KOOKTIJD_MIN;

export type EigenIngredient = {
  code?: IngredientCode;
  naam: string;
  hoeveelheid: number;
  eenheid: Eenheid;
  /** Winkelafdeling van een eigen ingrediënt zonder code (WEEK-201); ontbreekt = overig. Met code geldt de afdeling van de ingrediëntenlijst. */
  afdeling?: Afdeling;
};

const isAfdeling = (x: unknown): x is Afdeling => typeof x === 'string' && (AFDELINGEN as string[]).includes(x);

/**
 * De winkelafdeling waaronder een eigen ingrediënt op de lijst en in de frigo komt (WEEK-201):
 * met code die van de ingrediëntenlijst, anders de gekozen afdeling; zonder keuze geen afdeling (overig).
 */
export function afdelingVanEigen(i: Pick<EigenIngredient, 'code' | 'afdeling'>): Afdeling | undefined {
  if (i.code) return afdelingVan(i.code);
  return isAfdeling(i.afdeling) ? i.afdeling : undefined;
}

export type EigenRecept = {
  id: string;
  naam: string;
  soort: Soort;
  minuten: number;
  stijlen: StijlCode[];
  /** true: de stijl van het gezin (WEEK-192). Ontbreekt het veld, dan is het geen gezinsstijl. */
  gezinStijl?: boolean;
  /** Seizoenen waarin het recept past; leeg of ontbrekend betekent het hele jaar (WEEK-192). */
  seizoenen?: Seizoen[];
  ingredienten: EigenIngredient[];
  stappen: string[];
  bijgewerkt: string;
};

export type Invoer = {
  naam: string;
  soort: Soort;
  minuten: string;
  stijlen: StijlKeuze[];
  seizoenen?: Seizoen[];
  ingredienten: EigenIngredient[];
  stappen: string[];
};

export type Fout = 'naam' | 'minuten' | 'ingredienten' | 'stappen';
export type Gewaardeerd = Omit<EigenRecept, 'id' | 'bijgewerkt'>;

/**
 * WEEK-246: welke getoonde foutmeldingen nog gelden. Een melding verdwijnt zodra het probleem opgelost is
 * (bv. opnieuw een ingrediënt toegevoegd); er komen geen nieuwe meldingen bij voor je opnieuw bewaart.
 */
export function nogGeldigeFouten(getoond: readonly Fout[], invoer: Invoer): Fout[] {
  if (!getoond.length) return [];
  const r = valideer(invoer);
  return r.ok ? [] : getoond.filter((f) => r.fouten.includes(f));
}

/** Controleert het formulier; geeft de opgeschoonde waarden of de fouten. */
export function valideer(invoer: Invoer): { ok: true; waarden: Gewaardeerd } | { ok: false; fouten: Fout[] } {
  const fouten: Fout[] = [];
  const naam = invoer.naam.trim();
  if (!naam) fouten.push('naam');
  const minuten = Number(invoer.minuten.trim().replace(',', '.'));
  if (!Number.isInteger(minuten) || minuten < 1 || minuten > MAX_MINUTEN) fouten.push('minuten');
  // Een ingrediënt met code krijgt zijn afdeling van de ingrediëntenlijst; een eigen ingrediënt houdt enkel een geldige keuze (WEEK-201).
  const ingredienten: EigenIngredient[] = invoer.ingredienten
    .map(({ afdeling, ...i }) => ({ ...i, naam: i.naam.trim(), ...(!i.code && isAfdeling(afdeling) ? { afdeling } : {}) }))
    .filter((i) => i.naam.length > 0);
  if (!ingredienten.length || ingredienten.some((i) => !(i.hoeveelheid > 0))) fouten.push('ingredienten');
  const stappen = invoer.stappen.map((s) => s.trim()).filter((s) => s.length > 0);
  if (!stappen.length) fouten.push('stappen');
  if (fouten.length) return { ok: false, fouten };
  const gezin = invoer.stijlen.includes(GEZIN_STIJL);
  const seizoenen = SEIZOENEN.filter((s) => (invoer.seizoenen ?? []).includes(s));
  return {
    ok: true,
    waarden: {
      naam,
      soort: invoer.soort,
      minuten,
      stijlen: invoer.stijlen.filter((s): s is StijlCode => s !== GEZIN_STIJL),
      ...(gezin ? { gezinStijl: true } : {}),
      ...(seizoenen.length ? { seizoenen } : {}),
      ingredienten,
      stappen,
    },
  };
}

/**
 * Leest de opgeslagen eigen recepten veilig in (ook de lijst die van een ander gezinslid komt).
 * Onbruikbare items vallen weg.
 */
export function normaliseerEigen(ruw: unknown): EigenRecept[] {
  if (!Array.isArray(ruw)) return [];
  return ruw
    .filter(
      (r): r is EigenRecept =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as EigenRecept).id === 'string' &&
        typeof (r as EigenRecept).naam === 'string' &&
        Array.isArray((r as EigenRecept).ingredienten) &&
        Array.isArray((r as EigenRecept).stappen)
    )
    // WEEK-204: een oud of gesynchroniseerd recept zonder stijlen, seizoenen of geldige soort/minuten mag de app niet laten vastlopen.
    .map((r) => ({
      ...r,
      soort: (SOORTEN as readonly string[]).includes(r.soort) ? r.soort : 'vegetarisch',
      minuten: Number.isFinite(r.minuten) && r.minuten >= 1 ? Math.round(r.minuten) : 30,
      stijlen: Array.isArray(r.stijlen) ? r.stijlen.filter((x): x is StijlCode => (STIJLEN as readonly string[]).includes(x)) : [],
      ...(Array.isArray(r.seizoenen) ? { seizoenen: r.seizoenen.filter((x): x is Seizoen => (SEIZOENEN as readonly string[]).includes(x)) } : {}),
      // WEEK-205: oude catalogus-codes worden databankcodes; een onbekende code valt weg (het ingrediënt blijft als eigen ingrediënt).
      ingredienten: r.ingredienten
        .filter((i) => i && typeof i === 'object' && typeof i.naam === 'string')
        .map(({ code, ...i }) => {
          const db = typeof code === 'string' ? dbCodeVan(code) : undefined;
          return db ? { ...i, code: db } : i;
        }),
      stappen: r.stappen.filter((x): x is string => typeof x === 'string'),
    }));
}

/** Een nieuwe id; uniek genoeg voor één gezin op één toestel. */
export function nieuweId(nu: Date, willekeurig: () => number = Math.random): string {
  return `eigen:${nu.getTime().toString(36)}${Math.floor(willekeurig() * 36 ** 3).toString(36)}`;
}

/** Voegt toe of vervangt (zelfde id); de lijst blijft in volgorde van toevoegen. */
export function bewaarEigen(lijst: readonly EigenRecept[], recept: EigenRecept): EigenRecept[] {
  return lijst.some((r) => r.id === recept.id)
    ? lijst.map((r) => (r.id === recept.id ? recept : r))
    : [...lijst, recept];
}

export function verwijderEigen(lijst: readonly EigenRecept[], id: string): EigenRecept[] {
  return lijst.filter((r) => r.id !== id);
}

export type IngredientKeuze = { code?: IngredientCode; naam: string };

/**
 * Zoeken naar een ingrediënt: dezelfde zoeklogica als de lijst en de frigo (zoekCatalogus, zonder accenten en hoofdletters).
 * WEEK-245: enkel ingrediënten die de app kent (de ingrediëntenlijst in 4 talen); eigen ingrediënten kunnen niet meer.
 */
export function zoekIngredienten(zoek: string, taal: Taal, max = 8): IngredientKeuze[] {
  if (!normaliseer(zoek)) return [];
  return zoekCatalogus(zoek, taal).map((i) => ({ code: i.code, naam: i.naam })).slice(0, max);
}

/** De eenheid die de lijst bij dit ingrediënt toont; zonder databankcode is het gram. */
export function standaardEenheid(code?: IngredientCode): Eenheid {
  if (!code) return 'g';
  const e = eenheidVan(code);
  return (EENHEDEN as readonly string[]).includes(e) ? (e as Eenheid) : 'g';
}

/** Staat de zoekterm al exact in de lijst? Dan hoeft er geen handmatig ingrediënt bij. */
export function isExactBekend(zoek: string, keuzes: readonly IngredientKeuze[]): boolean {
  const q = normaliseer(zoek);
  return keuzes.some((k) => normaliseer(k.naam) === q);
}

export type Bron = 'alle' | 'mijn' | 'favoriet';
