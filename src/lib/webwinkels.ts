// WEEK-337: voorbereiding om later zelf je (web)winkel te kiezen. Pure logica, NOG NIET ZICHTBAAR in de app.
//
// Afspraken met de eigenaar (25/11/2026):
// - Winkels met webshop: Colruyt (Collect&Go), Delhaize, Albert Heijn, Carrefour (tabel public.webwinkels).
// - Later kiezen enkel bij de boodschappenlijst: één vaste winkel, en tijdelijk een andere kiezen kan.
// - Nu: enkel de keuze kunnen bewaren; niets tonen en niets ophalen.
//
// Een koppeling aanzetten gebeurt in de databank (actief, zoek_url, mogelijkheden). De app toont pas iets als
// WEBWINKELS_ZICHTBAAR aan staat; dat gebeurt in een latere versie, na akkoord van de eigenaar.

/** Schakelaar: zolang false, toont en haalt de app niets van webwinkels. */
export const WEBWINKELS_ZICHTBAAR = false;

/** Wat er bij een winkel kan, zodra er een koppeling is. */
export const MOGELIJKHEDEN = ['zoeken', 'mandje', 'prijzen', 'promoties'] as const;
export type Mogelijkheid = (typeof MOGELIJKHEDEN)[number];

export type WebWinkel = {
  /** Zelfde codes als recepten.winkel (ah, delhaize, colruyt) + carrefour. */
  code: string;
  naam: string;
  land: string;
  webshopUrl: string;
  /** Sjabloon met {zoekterm}, bv. "https://…/zoeken?q={zoekterm}". */
  zoekUrl?: string;
  mogelijkheden: Mogelijkheid[];
  volgorde: number;
};

const CODE = /^[a-z0-9_]+$/;
const HTTPS = /^https:\/\/[^\s]+$/;

/**
 * Leest de rijen uit de tabel public.webwinkels. Enkel actieve en geldige winkels blijven over, gesorteerd op volgorde.
 * Onbekende mogelijkheden vallen weg; een zoek-URL zonder {zoekterm} telt niet.
 */
export function normaliseerWebwinkels(rijen: unknown): WebWinkel[] {
  if (!Array.isArray(rijen)) return [];
  const gezien = new Set<string>();
  const lijst: WebWinkel[] = [];
  for (const r of rijen as Record<string, unknown>[]) {
    if (!r || r.actief !== true) continue;
    const code = typeof r.code === 'string' ? r.code : '';
    const naam = typeof r.naam === 'string' ? r.naam.trim() : '';
    const webshopUrl = typeof r.webshop_url === 'string' ? r.webshop_url : '';
    if (!CODE.test(code) || !naam || !HTTPS.test(webshopUrl) || gezien.has(code)) continue;
    gezien.add(code);
    const zoek = typeof r.zoek_url === 'string' && HTTPS.test(r.zoek_url) && r.zoek_url.includes('{zoekterm}') ? r.zoek_url : undefined;
    const mogelijkheden = Array.isArray(r.mogelijkheden)
      ? MOGELIJKHEDEN.filter((m) => (r.mogelijkheden as unknown[]).includes(m))
      : [];
    lijst.push({
      code,
      naam,
      land: typeof r.land === 'string' && /^[A-Z]{2}$/.test(r.land) ? r.land : 'BE',
      webshopUrl,
      ...(zoek ? { zoekUrl: zoek } : {}),
      // Zoeken kan enkel met een zoek-URL.
      mogelijkheden: zoek ? mogelijkheden : mogelijkheden.filter((m) => m !== 'zoeken'),
      volgorde: typeof r.volgorde === 'number' && Number.isFinite(r.volgorde) ? r.volgorde : 0,
    });
  }
  return lijst.sort((a, b) => a.volgorde - b.volgorde || a.naam.localeCompare(b.naam));
}

export const kan = (w: WebWinkel | undefined, m: Mogelijkheid) => !!w && w.mogelijkheden.includes(m);

/** Link om een product op te zoeken in de webshop, of undefined als dat (nog) niet kan. */
export function zoekLink(w: WebWinkel | undefined, zoekterm: string): string | undefined {
  const term = zoekterm.trim();
  if (!w || !term || !kan(w, 'zoeken') || !w.zoekUrl) return undefined;
  return w.zoekUrl.split('{zoekterm}').join(encodeURIComponent(term));
}

// ---------------------------------------------------------------- de keuze van de gebruiker

/** Eén vaste winkel; bij de lijst kan je tijdelijk een andere kiezen. Enkel op het toestel bewaard. */
export type WinkelKeuze = { vast?: string; tijdelijk?: string };

/** Leest een bewaarde keuze; wat niet klopt valt weg. */
export function leesKeuze(ruw: unknown): WinkelKeuze {
  const k = (ruw && typeof ruw === 'object' ? ruw : {}) as Record<string, unknown>;
  const geldig = (v: unknown) => (typeof v === 'string' && CODE.test(v) ? v : undefined);
  const vast = geldig(k.vast);
  const tijdelijk = geldig(k.tijdelijk);
  return { ...(vast ? { vast } : {}), ...(tijdelijk && tijdelijk !== vast ? { tijdelijk } : {}) };
}

/** De vaste winkel kiezen; een tijdelijke keuze vervalt. */
export const kiesVast = (_k: WinkelKeuze, code: string): WinkelKeuze => leesKeuze({ vast: code });

/** Even een andere winkel; dezelfde als de vaste = geen tijdelijke keuze. */
export const kiesTijdelijk = (k: WinkelKeuze, code: string): WinkelKeuze => leesKeuze({ vast: k.vast, tijdelijk: code });

export const wisTijdelijk = (k: WinkelKeuze): WinkelKeuze => leesKeuze({ vast: k.vast });

/**
 * De winkel die nu geldt: de tijdelijke, anders de vaste. Een winkel die niet (meer) actief is, telt niet.
 * Zonder keuze: geen winkel (de app kiest niet in de plaats van de gebruiker).
 */
export function huidigeWinkel(k: WinkelKeuze, winkels: readonly WebWinkel[]): WebWinkel | undefined {
  const vind = (code?: string) => (code ? winkels.find((w) => w.code === code) : undefined);
  return vind(k.tijdelijk) ?? vind(k.vast);
}
