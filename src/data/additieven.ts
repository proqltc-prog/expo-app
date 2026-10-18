// Uitleg bij additieven op het scan-scherm (WEEK-71). Pure data en logica, zonder React Native.
// Alleen de veelvoorkomende E-nummers staan hier. Een onbekend nummer toont de code zoals Open Food Facts hem geeft,
// zonder verzonnen uitleg.

import type { Taal } from '@/i18n';

export type Functie =
  | 'kleurstof'
  | 'conserveermiddel'
  | 'antioxidant'
  | 'zuurteregelaar'
  | 'verdikkingsmiddel'
  | 'emulgator'
  | 'smaakversterker'
  | 'zoetstof';

const FUNCTIE: Record<Functie, Record<Taal, string>> = {
  kleurstof: { nl: 'kleurstof', fr: 'colorant', de: 'Farbstoff', en: 'colour', es: 'colorante', pt: 'corante' },
  conserveermiddel: { nl: 'conserveermiddel', fr: 'conservateur', de: 'Konservierungsstoff', en: 'preservative', es: 'conservante', pt: 'conservante' },
  antioxidant: { nl: 'antioxidant', fr: 'antioxydant', de: 'Antioxidationsmittel', en: 'antioxidant', es: 'antioxidante', pt: 'antioxidante' },
  zuurteregelaar: { nl: 'zuurteregelaar', fr: "correcteur d'acidité", de: 'Säuerungsmittel', en: 'acidity regulator', es: 'regulador de acidez', pt: 'regulador de acidez' },
  verdikkingsmiddel: { nl: 'verdikkingsmiddel', fr: 'épaississant', de: 'Verdickungsmittel', en: 'thickener', es: 'espesante', pt: 'espessante' },
  emulgator: { nl: 'emulgator', fr: 'émulsifiant', de: 'Emulgator', en: 'emulsifier', es: 'emulgente', pt: 'emulsificante' },
  smaakversterker: { nl: 'smaakversterker', fr: 'exhausteur de goût', de: 'Geschmacksverstärker', en: 'flavour enhancer', es: 'potenciador del sabor', pt: 'realçador de sabor' },
  zoetstof: { nl: 'zoetstof', fr: 'édulcorant', de: 'Süßungsmittel', en: 'sweetener', es: 'edulcorante', pt: 'edulcorante' },
};

interface AdditiefUitleg {
  functie: Functie;
  naam: Record<Taal, string>;
}

// Sleutel: het E-nummer in hoofdletters, met eventuele letter (E160A).
const ADDITIEVEN: Record<string, AdditiefUitleg> = {
  E100: { functie: 'kleurstof', naam: { nl: 'Curcumine', fr: 'Curcumine', de: 'Curcumin', en: 'Curcumin', es: 'Curcumina', pt: 'Curcumina' } },
  E150: { functie: 'kleurstof', naam: { nl: 'Karamel', fr: 'Caramel', de: 'Zuckerkulör', en: 'Caramel', es: 'Caramelo', pt: 'Caramelo' } },
  E160A: { functie: 'kleurstof', naam: { nl: 'Bètacaroteen', fr: 'Bêta-carotène', de: 'Beta-Carotin', en: 'Beta-carotene', es: 'Betacaroteno', pt: 'Betacaroteno' } },
  E200: { functie: 'conserveermiddel', naam: { nl: 'Sorbinezuur', fr: 'Acide sorbique', de: 'Sorbinsäure', en: 'Sorbic acid', es: 'Ácido sórbico', pt: 'Ácido sórbico' } },
  E202: { functie: 'conserveermiddel', naam: { nl: 'Kaliumsorbaat', fr: 'Sorbate de potassium', de: 'Kaliumsorbat', en: 'Potassium sorbate', es: 'Sorbato de potasio', pt: 'Sorbato de potássio' } },
  E211: { functie: 'conserveermiddel', naam: { nl: 'Natriumbenzoaat', fr: 'Benzoate de sodium', de: 'Natriumbenzoat', en: 'Sodium benzoate', es: 'Benzoato de sodio', pt: 'Benzoato de sódio' } },
  E300: { functie: 'antioxidant', naam: { nl: 'Ascorbinezuur (vitamine C)', fr: 'Acide ascorbique (vitamine C)', de: 'Ascorbinsäure (Vitamin C)', en: 'Ascorbic acid (vitamin C)', es: 'Ácido ascórbico (vitamina C)', pt: 'Ácido ascórbico (vitamina C)' } },
  E322: { functie: 'emulgator', naam: { nl: 'Lecithine', fr: 'Lécithines', de: 'Lecithine', en: 'Lecithins', es: 'Lecitinas', pt: 'Lecitinas' } },
  E330: { functie: 'zuurteregelaar', naam: { nl: 'Citroenzuur', fr: 'Acide citrique', de: 'Citronensäure', en: 'Citric acid', es: 'Ácido cítrico', pt: 'Ácido cítrico' } },
  E407: { functie: 'verdikkingsmiddel', naam: { nl: 'Carrageen', fr: 'Carraghénanes', de: 'Carrageen', en: 'Carrageenan', es: 'Carragenina', pt: 'Carragenina' } },
  E412: { functie: 'verdikkingsmiddel', naam: { nl: 'Guarpitmeel', fr: 'Gomme de guar', de: 'Guarkernmehl', en: 'Guar gum', es: 'Goma guar', pt: 'Goma guar' } },
  E471: { functie: 'emulgator', naam: { nl: 'Mono- en diglyceriden', fr: 'Mono- et diglycérides', de: 'Mono- und Diglyceride', en: 'Mono- and diglycerides', es: 'Mono y diglicéridos', pt: 'Mono e diglicéridos' } },
  E621: { functie: 'smaakversterker', naam: { nl: 'Mononatriumglutamaat (MSG)', fr: 'Glutamate monosodique', de: 'Mononatriumglutamat', en: 'Monosodium glutamate', es: 'Glutamato monosódico', pt: 'Glutamato monossódico' } },
  E951: { functie: 'zoetstof', naam: { nl: 'Aspartaam', fr: 'Aspartame', de: 'Aspartam', en: 'Aspartame', es: 'Aspartamo', pt: 'Aspartame' } },
  E955: { functie: 'zoetstof', naam: { nl: 'Sucralose', fr: 'Sucralose', de: 'Sucralose', en: 'Sucralose', es: 'Sucralosa', pt: 'Sucralose' } },
};

/** Het E-nummer uit een Open Food Facts-tag, bv. "en:e322-lecithins" → "E322". Null als er geen E-nummer in zit. */
export function eNummer(tag: string): string | null {
  const m = tag.trim().toLowerCase().replace(/^en:/, '').match(/^e(\d{3,4})([a-z]?)(?![a-z0-9])/);
  return m ? `E${m[1]}${m[2].toUpperCase()}` : null;
}

export interface AdditiefWeergave {
  /** Het E-nummer, of de tag zoals die er staat als er geen E-nummer is. */
  code: string;
  /** De uitleg in de gekozen taal: naam en functie. Null als het additief niet in de lijst staat. */
  omschrijving: string | null;
}

/** Wat het scan-scherm bij één additief toont. Onbekende nummers krijgen geen verzonnen uitleg. */
export function additiefWeergave(tag: string, taal: Taal): AdditiefWeergave {
  const code = eNummer(tag);
  const uitleg = code ? ADDITIEVEN[code] : undefined;
  if (!code) return { code: tag.replace(/^en:/i, '').toUpperCase(), omschrijving: null };
  if (!uitleg) return { code, omschrijving: null };
  return { code, omschrijving: `${uitleg.naam[taal]} · ${FUNCTIE[uitleg.functie][taal]}` };
}
