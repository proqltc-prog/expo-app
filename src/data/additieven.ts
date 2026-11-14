// Uitleg bij additieven op het scan-scherm (WEEK-71). Pure data en logica, zonder React Native.
// WEEK-290: alle additieven uit de lijst van Open Food Facts (additieven.gegenereerd.ts), met het EFSA-risico op te veel
// inname. De handgeschreven lijst hieronder gaat voor (betere Nederlandse namen). Een onbekend nummer krijgt "naam onbekend",
// nooit een verzonnen uitleg.

import type { Taal } from '@/i18n';
import { ADDITIEVEN_OFF } from '@/data/additieven.gegenereerd';

export type Functie =
  | 'kleurstof'
  | 'conserveermiddel'
  | 'antioxidant'
  | 'zuurteregelaar'
  | 'verdikkingsmiddel'
  | 'emulgator'
  | 'smaakversterker'
  | 'zoetstof'
  | 'stabilisator'
  | 'bevochtiger'
  | 'complexvormer'
  | 'drager'
  | 'drijfgas'
  | 'stremmiddel';

const FUNCTIE: Record<Functie, Record<Taal, string>> = {
  kleurstof: { nl: 'kleurstof', fr: 'colorant', de: 'Farbstoff', en: 'colour' },
  conserveermiddel: { nl: 'conserveermiddel', fr: 'conservateur', de: 'Konservierungsstoff', en: 'preservative' },
  antioxidant: { nl: 'antioxidant', fr: 'antioxydant', de: 'Antioxidationsmittel', en: 'antioxidant' },
  zuurteregelaar: { nl: 'zuurteregelaar', fr: "correcteur d'acidité", de: 'Säuerungsmittel', en: 'acidity regulator' },
  verdikkingsmiddel: { nl: 'verdikkingsmiddel', fr: 'épaississant', de: 'Verdickungsmittel', en: 'thickener' },
  emulgator: { nl: 'emulgator', fr: 'émulsifiant', de: 'Emulgator', en: 'emulsifier' },
  smaakversterker: { nl: 'smaakversterker', fr: 'exhausteur de goût', de: 'Geschmacksverstärker', en: 'flavour enhancer' },
  zoetstof: { nl: 'zoetstof', fr: 'édulcorant', de: 'Süßungsmittel', en: 'sweetener' },
  stabilisator: { nl: 'stabilisator', fr: 'stabilisant', de: 'Stabilisator', en: 'stabiliser' },
  bevochtiger: { nl: 'bevochtiger', fr: 'humectant', de: 'Feuchthaltemittel', en: 'humectant' },
  complexvormer: { nl: 'complexvormer', fr: 'séquestrant', de: 'Komplexbildner', en: 'sequestrant' },
  drager: { nl: 'drager', fr: 'support', de: 'Trägerstoff', en: 'carrier' },
  drijfgas: { nl: 'drijfgas', fr: 'gaz propulseur', de: 'Treibgas', en: 'propellant' },
  stremmiddel: { nl: 'stremmiddel', fr: 'coagulant', de: 'Gerinnungsmittel', en: 'coagulant' },
};

const ONBEKEND: Record<Taal, string> = { nl: 'naam onbekend', fr: 'nom inconnu', de: 'Name unbekannt', en: 'name unknown' };
const TAAL_INDEX: Record<Taal, number> = { nl: 0, fr: 1, de: 2, en: 3 };

interface AdditiefUitleg {
  functie: Functie;
  naam: Record<Taal, string>;
}

// Sleutel: het E-nummer in hoofdletters, met eventuele letter (E160A).
const ADDITIEVEN: Record<string, AdditiefUitleg> = {
  E100: { functie: 'kleurstof', naam: { nl: 'Curcumine', fr: 'Curcumine', de: 'Curcumin', en: 'Curcumin' } },
  E102: { functie: 'kleurstof', naam: { nl: 'Tartrazine', fr: 'Tartrazine', de: 'Tartrazin', en: 'Tartrazine' } },
  E104: { functie: 'kleurstof', naam: { nl: 'Chinolinegeel', fr: 'Jaune de quinoléine', de: 'Chinolingelb', en: 'Quinoline yellow' } },
  E110: { functie: 'kleurstof', naam: { nl: 'Zonnegeel FCF', fr: 'Jaune orangé S', de: 'Gelborange S', en: 'Sunset yellow FCF' } },
  E122: { functie: 'kleurstof', naam: { nl: 'Azorubine', fr: 'Azorubine', de: 'Azorubin', en: 'Azorubine' } },
  E124: { functie: 'kleurstof', naam: { nl: 'Ponceau 4R', fr: 'Ponceau 4R', de: 'Cochenillerot A', en: 'Ponceau 4R' } },
  E128: { functie: 'kleurstof', naam: { nl: 'Rood 2G', fr: 'Rouge 2G', de: 'Rot 2G', en: 'Red 2G' } },
  E133: { functie: 'kleurstof', naam: { nl: 'Briljantblauw FCF', fr: 'Bleu brillant FCF', de: 'Brillantblau FCF', en: 'Brilliant blue FCF' } },
  E129: { functie: 'kleurstof', naam: { nl: 'Allurarood AC', fr: 'Rouge allura AC', de: 'Allurarot AC', en: 'Allura red AC' } },
  E171: { functie: 'kleurstof', naam: { nl: 'Titaandioxide', fr: 'Dioxyde de titane', de: 'Titandioxid', en: 'Titanium dioxide' } },
  E150: { functie: 'kleurstof', naam: { nl: 'Karamel', fr: 'Caramel', de: 'Zuckerkulör', en: 'Caramel' } },
  E160A: { functie: 'kleurstof', naam: { nl: 'Bètacaroteen', fr: 'Bêta-carotène', de: 'Beta-Carotin', en: 'Beta-carotene' } },
  E200: { functie: 'conserveermiddel', naam: { nl: 'Sorbinezuur', fr: 'Acide sorbique', de: 'Sorbinsäure', en: 'Sorbic acid' } },
  E202: { functie: 'conserveermiddel', naam: { nl: 'Kaliumsorbaat', fr: 'Sorbate de potassium', de: 'Kaliumsorbat', en: 'Potassium sorbate' } },
  E211: { functie: 'conserveermiddel', naam: { nl: 'Natriumbenzoaat', fr: 'Benzoate de sodium', de: 'Natriumbenzoat', en: 'Sodium benzoate' } },
  E216: { functie: 'conserveermiddel', naam: { nl: 'Propylparabeen', fr: 'Parahydroxybenzoate de propyle', de: 'Propylparaben', en: 'Propylparaben' } },
  E217: { functie: 'conserveermiddel', naam: { nl: 'Natriumpropylparabeen', fr: 'Parahydroxybenzoate de propyle sodique', de: 'Natriumpropylparaben', en: 'Sodium propylparaben' } },
  E300: { functie: 'antioxidant', naam: { nl: 'Ascorbinezuur (vitamine C)', fr: 'Acide ascorbique (vitamine C)', de: 'Ascorbinsäure (Vitamin C)', en: 'Ascorbic acid (vitamin C)' } },
  E322: { functie: 'emulgator', naam: { nl: 'Lecithine', fr: 'Lécithines', de: 'Lecithine', en: 'Lecithins' } },
  E330: { functie: 'zuurteregelaar', naam: { nl: 'Citroenzuur', fr: 'Acide citrique', de: 'Citronensäure', en: 'Citric acid' } },
  E407: { functie: 'verdikkingsmiddel', naam: { nl: 'Carrageen', fr: 'Carraghénanes', de: 'Carrageen', en: 'Carrageenan' } },
  E412: { functie: 'verdikkingsmiddel', naam: { nl: 'Guarpitmeel', fr: 'Gomme de guar', de: 'Guarkernmehl', en: 'Guar gum' } },
  E471: { functie: 'emulgator', naam: { nl: 'Mono- en diglyceriden', fr: 'Mono- et diglycérides', de: 'Mono- und Diglyceride', en: 'Mono- and diglycerides' } },
  E621: { functie: 'smaakversterker', naam: { nl: 'Mononatriumglutamaat (MSG)', fr: 'Glutamate monosodique', de: 'Mononatriumglutamat', en: 'Monosodium glutamate' } },
  E950: { functie: 'zoetstof', naam: { nl: 'Acesulfaam-K', fr: 'Acésulfame K', de: 'Acesulfam-K', en: 'Acesulfame K' } },
  E951: { functie: 'zoetstof', naam: { nl: 'Aspartaam', fr: 'Aspartame', de: 'Aspartam', en: 'Aspartame' } },
  E955: { functie: 'zoetstof', naam: { nl: 'Sucralose', fr: 'Sucralose', de: 'Sucralose', en: 'Sucralose' } },
};

/**
 * Het E-nummer uit een Open Food Facts-tag, bv. "en:e322-lecithins" → "E322". Null als er geen E-nummer in zit.
 * WEEK-290: ook varianten met een letter en/of een Romeins cijfer, zoals E322i, E420ii en E440aiv.
 */
export function eNummer(tag: string): string | null {
  const m = tag.trim().toLowerCase().replace(/^en:/, '').match(/^e(\d{3,4})([a-z]?(?:x{0,2}(?:ix|iv|v?i{0,3})))(?![a-z0-9])/);
  return m ? `E${m[1]}${m[2].toUpperCase()}` : null;
}

export type EfsaRisico = 'hoog' | 'matig';
export interface AdditiefInfo {
  code: string;
  naam: string | null;
  functie: Functie | null;
  /** EFSA: risico dat mensen er meer van binnenkrijgen dan de veilige dagdosis ('hoog': gemiddeld al, 'matig': wie veel eet). */
  efsa?: { risico: EfsaRisico; jaar?: string; url?: string };
}

const isFunctie = (f: string): f is Functie => f in FUNCTIE;

/** Alles wat we over een additief weten, of null als de tag geen E-nummer bevat. Ook een variant (E322I) valt terug op het basisnummer (E322). */
export function additiefInfo(tag: string, taal: Taal): AdditiefInfo | null {
  const code = eNummer(tag);
  if (!code) return null;
  const basis = code.match(/^E\d+/)![0];
  const hand = ADDITIEVEN[code];
  const off = ADDITIEVEN_OFF[code] ?? ADDITIEVEN_OFF[basis];
  const handBasis = !hand && !ADDITIEVEN_OFF[code] ? ADDITIEVEN[basis] : undefined;
  const h = hand ?? handBasis;
  const offFunctie = off && isFunctie(off[1]) ? off[1] : null;
  const info: AdditiefInfo = {
    code,
    naam: h ? h.naam[taal] : off ? off[0][TAAL_INDEX[taal]] : null,
    functie: h ? h.functie : offFunctie,
  };
  const [, , risico, jaar, url] = off ?? [];
  if (risico === 'hoog' || risico === 'matig') info.efsa = { risico, jaar: jaar || undefined, url: url || undefined };
  return info;
}

/** De functie van een additief (bv. 'zoetstof'), of null als die niet gekend is. Taalonafhankelijk. */
export function functieVan(tag: string): Functie | null {
  return additiefInfo(tag, 'nl')?.functie ?? null;
}

export interface AdditiefWeergave {
  /** Het E-nummer, of de tag zoals die er staat als er geen E-nummer is. */
  code: string;
  /** De uitleg in de gekozen taal: naam en functie (of enkel de naam). "naam onbekend" als het E-nummer niet in de lijst staat (WEEK-290). */
  omschrijving: string | null;
  /** WEEK-290: het EFSA-risico op te veel inname, als dat er is. */
  efsa?: AdditiefInfo['efsa'];
}

/** Wat het scan-scherm bij één additief toont. Onbekende nummers krijgen geen verzonnen uitleg. */
export function additiefWeergave(tag: string, taal: Taal): AdditiefWeergave {
  const info = additiefInfo(tag, taal);
  if (!info) return { code: tag.replace(/^en:/i, '').toUpperCase(), omschrijving: null };
  if (!info.naam) return { code: info.code, omschrijving: ONBEKEND[taal] };
  const omschrijving = info.functie ? `${info.naam} · ${FUNCTIE[info.functie][taal]}` : info.naam;
  return info.efsa ? { code: info.code, omschrijving, efsa: info.efsa } : { code: info.code, omschrijving };
}
