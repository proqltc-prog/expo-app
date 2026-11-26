// Kookwekker in de bereiding (WEEK-334). Pure logica: tijden herkennen in een stap en de stand van een wekker.
// Staat er in een stap "laat 15 minuten zacht koken", dan kan de gebruiker met één tik een wekker van 15 minuten starten.
// Een bereik ("5 à 7 minuten") geeft de kortste tijd: dan kijk je op tijd na of het klaar is.

/** Een tijd die in een stap gevonden werd. `tekst` = het stuk uit de stap (bv. "15 minuten"). */
export type GevondenTijd = { seconden: number; tekst: string; start: number };

/** Langer dan dit is geen kookwekker meer (bv. "24 uur marineren"): dan blijft de app niet zo lang open. */
export const MAX_SECONDEN = 4 * 3600;

const GETAL = String.raw`(\d+(?:[.,]\d+)?|\d*\s?½)`;
const TOT = String.raw`(?:\s*(?:-|–|à|a|tot|of|to|or|bis|oder|ou)\s*` + GETAL + ')?';

// Eenheden in de vier talen; langste vormen eerst. "h" enkel direct na een getal (Frans: "1 h", "1h30").
const EENHEID: { re: string; seconden: number }[] = [
  { re: 'seconden|seconde|secondes|seconds|second|sekunden|sekunde|sec\\.?|s\\b', seconden: 1 },
  { re: 'minuten|minuut|minutes|minute|minuten|mins|min\\.?', seconden: 60 },
  { re: 'uren|uur|hours|hour|hrs|heures|heure|stunden|stunde|std\\.?|h(?=\\b|\\d)', seconden: 3600 },
];

const PATROON = new RegExp(
  String.raw`(?<![\w,.])` + GETAL + TOT + String.raw`\s*(` + EENHEID.map((e) => e.re).join('|') + String.raw`)(?:(?<=\dh|\d\sh)\s*(\d{1,2})(?![\d°]))?(?![\wÀ-ÿ])`,
  'giu',
);

// Woorden zonder cijfers: kwartier, halfuur, ...
const WOORDEN: { re: RegExp; seconden: number }[] = [
  { re: /\b(?:een\s+)?half\s*uur\b|\bhalfuur\b/giu, seconden: 1800 },
  { re: /\b(?:een\s+)?kwartier\b/giu, seconden: 900 },
  { re: /\bhalf an hour\b|\bhalf-hour\b/giu, seconden: 1800 },
  { re: /\bquarter of an hour\b/giu, seconden: 900 },
  { re: /\bune demi-heure\b|\bdemi-heure\b/giu, seconden: 1800 },
  { re: /\bun quart d[’']heure\b|\bquart d[’']heure\b/giu, seconden: 900 },
  { re: /\beine halbe stunde\b|\bhalbe stunde\b/giu, seconden: 1800 },
  { re: /\beine viertelstunde\b|\bviertelstunde\b/giu, seconden: 900 },
];

function leesGetal(s: string): number {
  const t = s.replace(/\s/g, '');
  if (t.endsWith('½')) return (t.length > 1 ? Number(t.slice(0, -1)) : 0) + 0.5;
  return Number(t.replace(',', '.'));
}

function eenheidSeconden(woord: string): number {
  const w = woord.toLowerCase();
  for (const e of EENHEID) if (new RegExp(`^(?:${e.re})$`, 'iu').test(w)) return e.seconden;
  return 0;
}

/**
 * Alle tijden in een stap, in volgorde. Dezelfde tijd twee keer in één stap geeft één wekker.
 * Geen tijden: temperaturen ("180 graden"), aantallen ("2 eieren"), of langer dan MAX_SECONDEN.
 */
export function vindTijden(stap: string): GevondenTijd[] {
  const gevonden: GevondenTijd[] = [];
  for (const m of stap.matchAll(PATROON)) {
    const eenheid = eenheidSeconden(m[3].replace(/\.$/, '.'));
    if (!eenheid) continue;
    let seconden = Math.round(leesGetal(m[1]) * eenheid);
    // "1 h 30" / "1h30": minuten na de uren.
    if (/^h$/i.test(m[3]) && m[4]) seconden += Number(m[4]) * 60;
    gevonden.push({ seconden, tekst: m[0].trim(), start: m.index ?? 0 });
  }
  for (const w of WOORDEN) {
    for (const m of stap.matchAll(w.re)) {
      const start = m.index ?? 0;
      // Een "half uur" binnen een al gevonden tijd ("1 en een half uur") niet dubbel tellen.
      if (gevonden.some((g) => start >= g.start && start < g.start + g.tekst.length)) continue;
      gevonden.push({ seconden: w.seconden, tekst: m[0].trim(), start });
    }
  }
  const gezien = new Set<number>();
  return gevonden
    .filter((g) => g.seconden > 0 && g.seconden <= MAX_SECONDEN)
    .sort((a, b) => a.start - b.start)
    .filter((g) => (gezien.has(g.seconden) ? false : (gezien.add(g.seconden), true)));
}

/** Korte naam op de knop: "15 min", "1 u 30 min", "45 s". */
export function tijdLabel(seconden: number, eenheden: { u: string; min: string; s: string } = { u: 'u', min: 'min', s: 's' }): string {
  const u = Math.floor(seconden / 3600);
  const min = Math.floor((seconden % 3600) / 60);
  const s = seconden % 60;
  const delen: string[] = [];
  if (u) delen.push(`${u} ${eenheden.u}`);
  if (min) delen.push(`${min} ${eenheden.min}`);
  if (s || !delen.length) delen.push(`${s} ${eenheden.s}`);
  return delen.join(' ');
}

/** Wat er op een lopende wekker staat: "9:05" of "1:02:03". Nooit negatief. */
export function aftellen(seconden: number): string {
  const t = Math.max(0, Math.ceil(seconden));
  const u = Math.floor(t / 3600);
  const min = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const twee = (n: number) => String(n).padStart(2, '0');
  return u ? `${u}:${twee(min)}:${twee(s)}` : `${min}:${twee(s)}`;
}

// ---------------------------------------------------------------- de stand van een wekker

/**
 * Een wekker. Loopt hij, dan is `eind` het tijdstip (ms) waarop hij afloopt; gepauzeerd bewaart hij `rest` (ms).
 * Zo klopt de tijd ook als de app even in de achtergrond stond.
 */
export type Wekker = {
  id: string;
  /** Het gerecht en de stap waar de wekker bij hoort. */
  receptId: string;
  /** Naam van het gerecht, voor de melding als de tijd om is. */
  naam?: string;
  stap: number;
  seconden: number;
  eind?: number;
  rest?: number;
  /** Afgelopen en de gebruiker heeft nog niet op Stop getikt. */
  afgelopen?: boolean;
};

export const wekkerId = (receptId: string, stap: number, seconden: number) => `${receptId}|${stap}|${seconden}`;

export function startWekker(receptId: string, stap: number, seconden: number, nu: number, naam?: string): Wekker {
  return { id: wekkerId(receptId, stap, seconden), receptId, ...(naam ? { naam } : {}), stap, seconden, eind: nu + seconden * 1000 };
}

/** Resterende tijd in seconden (0 als hij afgelopen is). */
export function resterend(w: Wekker, nu: number): number {
  if (w.afgelopen) return 0;
  if (w.rest !== undefined) return w.rest / 1000;
  return Math.max(0, ((w.eind ?? nu) - nu) / 1000);
}

export const isGepauzeerd = (w: Wekker) => w.rest !== undefined && !w.afgelopen;

export function pauzeer(w: Wekker, nu: number): Wekker {
  if (w.afgelopen || w.rest !== undefined) return w;
  return { ...w, eind: undefined, rest: Math.max(0, (w.eind ?? nu) - nu) };
}

export function hervat(w: Wekker, nu: number): Wekker {
  if (w.afgelopen || w.rest === undefined) return w;
  return { ...w, eind: nu + w.rest, rest: undefined };
}

/** Markeert de wekkers die nu afgelopen zijn. Geeft dezelfde lijst terug als er niets veranderde. */
export function werkBij(wekkers: readonly Wekker[], nu: number): Wekker[] {
  let veranderd = false;
  const nieuw = wekkers.map((w) => {
    if (!w.afgelopen && w.rest === undefined && w.eind !== undefined && w.eind <= nu) {
      veranderd = true;
      return { ...w, afgelopen: true };
    }
    return w;
  });
  return veranderd ? nieuw : (wekkers as Wekker[]);
}

/** Zijn er wekkers die afgelopen zijn en nog signaal geven? */
export const heeftAlarm = (wekkers: readonly Wekker[]) => wekkers.some((w) => w.afgelopen);
