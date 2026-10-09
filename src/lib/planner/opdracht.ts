// Leest wensen uit de vrije opdracht van de gebruiker, in elk van de 6 talen.
// Dit is de basis voor de lokale planner; een AI-planner begrijpt de opdracht zelf.

export type Wensen = {
  /** Aantal dagen (1–7) als de gebruiker dat vraagt. */
  aantalDagen?: number;
  zonderVlees: boolean;
  zonderVis: boolean;
  meerVis: boolean;
  snel: boolean;
  gezond: boolean;
  goedkoop: boolean;
};

const GETALWOORDEN: Record<string, number> = {
  // nl
  een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7,
  // en
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  // fr
  un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7,
  // de
  zwei: 2, drei: 3, fünf: 5, sechs: 6, sieben: 7,
  // es
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  // pt
  três: 3, quatro: 4, sete: 7,
};

const DAGWOORD = '(?:dagen|dag|days?|jours?|tage?n?|d[ií]as?)';
const GETAL_DAGEN = new RegExp(`(\\d{1,2}|[a-zàâäéèêëïîôöùûüçñ]+)\\s*${DAGWOORD}\\b`, 'giu');

const ZONDER_VLEES = /veg[ae]tari|végétari|veggie|vegan|v[ée]g[ée]talien|geen vlees|zonder vlees|no meat|without meat|meat-?free|sans viande|kein(?:e|en)? fleisch|ohne fleisch|fleischlos|sin carne|sem carne/iu;
const ZONDER_VIS = /geen vis|zonder vis|no fish|without fish|sans poisson|kein(?:en)? fisch|ohne fisch|sin pescado|sem peixe/iu;
const MEER_VIS = /meer vis|more fish|plus de poisson|mehr fisch|m[áa]s pescado|mais peixe/iu;
const SNEL = /\bsnel|\bquick|\bfast\b|rapide|schnell|r[áa]pid/iu;
const GEZOND = /gezond|nutri|healthy|\bsain|gesund|saludable|saud[áa]vel/iu;
const GOEDKOOP = /goedkoop|budget|\bcheap|bon march[ée]|pas cher|g[üu]nstig|billig|barat[oa]|econ[óo]mic/iu;

export function leesOpdracht(tekst: string): Wensen {
  const t = tekst.normalize('NFC');
  let aantalDagen: number | undefined;
  for (const m of t.matchAll(GETAL_DAGEN)) {
    const woord = m[1].toLowerCase();
    const n = /^\d+$/.test(woord) ? Number(woord) : GETALWOORDEN[woord];
    if (n !== undefined) {
      aantalDagen = Math.min(7, Math.max(1, n));
      break;
    }
  }
  return {
    aantalDagen,
    zonderVlees: ZONDER_VLEES.test(t),
    zonderVis: ZONDER_VIS.test(t),
    meerVis: MEER_VIS.test(t),
    snel: SNEL.test(t),
    gezond: GEZOND.test(t),
    goedkoop: GOEDKOOP.test(t),
  };
}
