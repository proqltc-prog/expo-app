// WEEK-305: de 14 allergenen die de EU verplicht op het etiket (Verordening (EU) nr. 1169/2011, bijlage II),
// zoals Open Food Facts ze aanduidt (allergens_tags, traces_tags). Pure logica.
import type { Taal } from '@/i18n';
import type { Product } from '@/lib/openfoodfacts';

export const ALLERGEEN_CODES = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk',
  'nuts', 'celery', 'mustard', 'sesame-seeds', 'sulphur-dioxide-and-sulphites', 'lupin', 'molluscs',
] as const;
export type AllergeenCode = (typeof ALLERGEEN_CODES)[number];

const NAMEN: Record<AllergeenCode, Record<Taal, string>> = {
  gluten: { nl: 'gluten', fr: 'gluten', de: 'Gluten', en: 'gluten' },
  crustaceans: { nl: 'schaaldieren', fr: 'crustacés', de: 'Krebstiere', en: 'crustaceans' },
  eggs: { nl: 'eieren', fr: 'œufs', de: 'Eier', en: 'eggs' },
  fish: { nl: 'vis', fr: 'poisson', de: 'Fisch', en: 'fish' },
  peanuts: { nl: 'pinda’s', fr: 'arachides', de: 'Erdnüsse', en: 'peanuts' },
  soybeans: { nl: 'soja', fr: 'soja', de: 'Soja', en: 'soy' },
  milk: { nl: 'melk (ook lactose)', fr: 'lait (y compris lactose)', de: 'Milch (einschließlich Laktose)', en: 'milk (including lactose)' },
  nuts: { nl: 'noten', fr: 'fruits à coque', de: 'Schalenfrüchte', en: 'tree nuts' },
  celery: { nl: 'selderij', fr: 'céleri', de: 'Sellerie', en: 'celery' },
  mustard: { nl: 'mosterd', fr: 'moutarde', de: 'Senf', en: 'mustard' },
  'sesame-seeds': { nl: 'sesamzaad', fr: 'graines de sésame', de: 'Sesamsamen', en: 'sesame seeds' },
  'sulphur-dioxide-and-sulphites': { nl: 'sulfiet', fr: 'sulfites', de: 'Sulfite', en: 'sulphites' },
  lupin: { nl: 'lupine', fr: 'lupin', de: 'Lupinen', en: 'lupin' },
  molluscs: { nl: 'weekdieren', fr: 'mollusques', de: 'Weichtiere', en: 'molluscs' },
};

const isCode = (c: string): c is AllergeenCode => (ALLERGEEN_CODES as readonly string[]).includes(c);

/** Zet tags van Open Food Facts ("en:milk") om naar de EU-codes; andere tags vallen weg, geen dubbels. */
export function allergeenCodes(tags: unknown): AllergeenCode[] {
  if (!Array.isArray(tags)) return [];
  const codes = tags
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.replace(/^en:/, ''))
    .filter(isCode);
  return ALLERGEEN_CODES.filter((c) => codes.includes(c));
}

export function allergeenNaam(code: AllergeenCode, taal: Taal): string {
  return NAMEN[code][taal];
}

export type AllergenenStatus =
  | { soort: 'onbekend' }
  | { soort: 'geen'; sporen: AllergeenCode[] }
  | { soort: 'bevat'; bevat: AllergeenCode[]; sporen: AllergeenCode[] };

/**
 * Wat we over de allergenen van een product weten.
 * - Allergenen vermeld: "bevat".
 * - Geen allergenen maar wel een ingrediëntenlijst: "geen" (zoals vermeld door Open Food Facts).
 * - Geen lijst, of een oud bewaard product zonder allergeneninfo: "onbekend".
 * Sporen ("kan sporen bevatten van") staan apart en tellen niet als "bevat".
 */
export function allergenenStatus(p: Pick<Product, 'allergenen' | 'sporen' | 'ingredientenBekend'>): AllergenenStatus {
  if (p.allergenen === undefined) return { soort: 'onbekend' };
  const bevat = allergeenCodes(p.allergenen);
  const sporen = allergeenCodes(p.sporen).filter((c) => !bevat.includes(c));
  if (bevat.length) return { soort: 'bevat', bevat, sporen };
  if (p.ingredientenBekend) return { soort: 'geen', sporen };
  return { soort: 'onbekend' };
}
