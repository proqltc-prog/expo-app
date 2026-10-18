// Winkelvoorstel bij de boodschappenlijst (WEEK-57). Pure logica, zonder netwerk of opslag.
// Een supermarkt verkoopt ook vlees, brood en groenten: die dekt dus de andere soorten, maar niet omgekeerd.
import type { Winkel, WinkelSoort } from '@/lib/winkels';

export type Positie = { lat: number; lon: number };

export type Stop = { soort: WinkelSoort; winkel: Winkel; afstandKm?: number };

export type Voorstel = {
  stops: Stop[];
  /** Winkeltypes uit de lijst waarvoor binnen de afstand geen winkel is gevonden. */
  nietGedekt: WinkelSoort[];
};

const SOORT_VOOR_AFDELING: Record<string, WinkelSoort> = {
  'groenten-fruit': 'groenteboer',
  'vlees-vis': 'slager',
  brood: 'bakker',
};

/** Winkeltype waar een product uit een afdeling hoort. Onbekend of leeg = supermarkt. */
export function afdelingNaarSoort(afdeling?: string): WinkelSoort {
  return (afdeling && SOORT_VOOR_AFDELING[afdeling]) || 'supermarkt';
}

/** Unieke winkeltypes die de lijst nodig heeft, in een vaste volgorde. */
export function nodigeSoorten(afdelingen: (string | undefined)[]): WinkelSoort[] {
  const volgorde: WinkelSoort[] = ['supermarkt', 'groenteboer', 'slager', 'bakker'];
  const gevonden = new Set(afdelingen.map(afdelingNaarSoort));
  return volgorde.filter((s) => gevonden.has(s));
}

/** Afstand in kilometer tussen twee punten (haversine). */
export function afstandKm(a: Positie, b: Positie): number {
  const straal = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * straal * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Kan een winkel van soort `winkel` een product van soort `nodig` leveren? */
function dekt(winkel: WinkelSoort, nodig: WinkelSoort): boolean {
  return winkel === nodig || (winkel === 'supermarkt' && nodig !== 'supermarkt');
}

/**
 * Kiest het kleinste aantal winkels dat alle nodige winkeltypes dekt.
 * Per winkeltype wordt de dichtstbijzijnde winkel genomen, ook als die ver weg ligt (WEEK-69: geen km-limiet meer).
 * Bij gelijke aantallen wint de kortste totale afstand.
 */
export function kiesWinkels(nodig: WinkelSoort[], winkels: Winkel[], positie?: Positie): Voorstel {
  if (!nodig.length) return { stops: [], nietGedekt: [] };

  const beste = new Map<WinkelSoort, Stop>();
  for (const winkel of winkels) {
    const afstand = positie && winkel.lat !== undefined && winkel.lon !== undefined
      ? afstandKm(positie, { lat: winkel.lat, lon: winkel.lon })
      : undefined;
    const huidige = beste.get(winkel.soort);
    // Zonder afstand blijft de volgorde van rangschik (lokaal eerst) gelden: de eerste wint.
    if (!huidige || (afstand !== undefined && (huidige.afstandKm === undefined || afstand < huidige.afstandKm))) {
      beste.set(winkel.soort, { soort: winkel.soort, winkel, afstandKm: afstand });
    }
  }

  const types = [...beste.keys()];
  let gekozen: Stop[] | undefined;
  for (let masker = 1; masker < 1 << types.length; masker++) {
    const subset = types.filter((_, i) => masker & (1 << i));
    if (!nodig.every((n) => subset.some((s) => dekt(s, n)))) continue;
    const stops = subset.map((s) => beste.get(s)!);
    if (!gekozen || stops.length < gekozen.length || (stops.length === gekozen.length && totaal(stops) < totaal(gekozen))) {
      gekozen = stops;
    }
  }

  if (gekozen) return { stops: gekozen, nietGedekt: [] };
  const nietGedekt = nodig.filter((n) => !types.some((s) => dekt(s, n)));
  return { stops: types.map((s) => beste.get(s)!), nietGedekt };
}

function totaal(stops: Stop[]): number {
  return stops.reduce((som, s) => som + (s.afstandKm ?? 0), 0);
}
