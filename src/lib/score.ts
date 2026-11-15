/**
 * Onze eigen gezondheidsscore (WEEK-220). Los van het Nutri-Score, zodat niets dubbel meetelt.
 *
 * Officieel zijn de DREMPELS:
 *  - vet, verzadigd vet, suikers, zout: richtlijn voor voedingskleuren van de Britse overheid
 *    ("Guide to creating a front of pack nutrition label", november 2016, Open Government Licence).
 *    Per 100 g voor voeding, per 100 ml voor drank.
 *  - veel vezels (minstens 6 g per 100 g) en veel eiwit (minstens 20 % van de energie):
 *    voedingsclaims uit Verordening (EG) 1924/2006.
 * De PUNTEN die aan een drempel hangen zijn onze eigen keuze; de app zegt dat ook.
 *
 * WEEK-290/WEEK-295: additieven tellen streng mee, enkel op basis van officiële bronnen:
 *  - elk additief kost punten; zoetstoffen extra;
 *  - EFSA: risico dat mensen er meer van binnenkrijgen dan de veilige dagdosis ("matig" of "hoog");
 *  - EU-wet (Verordening (EG) 1333/2008; zie euAdditieven.ts): verplichte waarschuwing, of niet meer toegelaten.
 * Plafonds: verboden additief = 0; EU-waarschuwing hoogstens 25; hoog EFSA-risico hoogstens 39; NOVA 4 hoogstens 49.
 * WEEK-295: ontbreken cruciale gegevens (NOVA, ingrediënten, vet/suikers/zout), dan geen score: "niet genoeg gegevens".
 * We vullen nooit zelf iets aan.
 */
import { additiefInfo, eNummer } from '@/data/additieven';
import { euRegel } from '@/data/euAdditieven';
import type { Product } from '@/lib/openfoodfacts';

export type Niveau = 'laag' | 'midden' | 'hoog';
export type Stof = 'vet' | 'verzadigd' | 'suikers' | 'zout';
export type RedenCode =
  | 'vetMidden' | 'vetHoog'
  | 'verzadigdMidden' | 'verzadigdHoog'
  | 'suikersMidden' | 'suikersHoog'
  | 'zoutMidden' | 'zoutHoog'
  | 'nova4' | 'vezels' | 'eiwit'
  | 'additief' | 'efsaMatig' | 'efsaHoog' | 'additiefEu' | 'verboden' | 'zoetstof'
  | 'geenAdditieven' | 'nova1' | 'energiearm';

/** Een reden is taalonafhankelijk. Het scherm toont ze niet meer apart: de voedingstabel (`voedingstabel.ts`) zegt per stof waarom. */
export type Reden = { code: RedenCode; punten: number; waarde?: number; additief?: string };
export type OordeelLabel = 'goed' | 'matig' | 'slecht';
/** WEEK-290: waarom de score niet hoger kan dan `max`. */
export type PlafondReden = 'verboden' | 'additiefEu' | 'efsaHoog' | 'nova4';
export type Plafond = { reden: PlafondReden; max: number };
/** WEEK-295: cruciale gegevens die Open Food Facts niet heeft. */
export type Ontbrekend = 'nova' | 'ingredienten' | 'voeding';
/** `onvoldoende`: er ontbreken cruciale gegevens; het scherm toont dan geen score maar "niet genoeg gegevens". */
export type Oordeel = { score: number; label: OordeelLabel; redenen: Reden[]; plafond?: Plafond; onvoldoende?: Ontbrekend[] };

/** [laag tot en met, hoog vanaf boven] per stof. */
export const DREMPELS: Record<'voeding' | 'drank', Record<Stof, [number, number]>> = {
  voeding: { vet: [3, 17.5], verzadigd: [1.5, 5], suikers: [5, 22.5], zout: [0.3, 1.5] },
  drank: { vet: [1.5, 8.75], verzadigd: [0.75, 2.5], suikers: [2.5, 11.25], zout: [0.3, 0.75] },
};

export const PUNTEN = {
  midden: -10,
  hoog: -25,
  nova4: -25,
  vezels: 5,
  eiwit: 5,
  // WEEK-295: per additief; EFSA en EU komen er bovenop.
  additief: -5,
  efsaMatig: -10,
  efsaHoog: -15,
  additiefEu: -25,
  zoetstof: -15,
  // WEEK-296: bonussen.
  geenAdditieven: 10,
  nova1: 5,
  energiearm: 5,
} as const;
/** WEEK-296: "energiearm" volgens Verordening (EG) 1924/2006: hoogstens 40 kcal per 100 g, of 20 kcal per 100 ml voor een drank. */
export const ENERGIEARM_KCAL = { voeding: 40, drank: 20 } as const;
/** WEEK-295: de hoogste score die nog kan; het strengste plafond telt. Verboden in de EU = 0. */
export const PLAFOND: Record<PlafondReden, number> = { verboden: 0, additiefEu: 25, efsaHoog: 39, nova4: 49 };
const PLAFOND_VOLGORDE: PlafondReden[] = ['verboden', 'additiefEu', 'efsaHoog', 'nova4'];

/**
 * WEEK-295/WEEK-296: welke cruciale gegevens ontbreken. NOVA en de ingrediëntenlijst moeten gekend zijn; een oud bewaard
 * product zonder het veld ingredientenBekend telt als niet gekend (opnieuw scannen).
 */
export function ontbrekendeGegevens(p: Product): Ontbrekend[] {
  const uit: Ontbrekend[] = [];
  if (p.nova === undefined) uit.push('nova');
  if (p.ingredientenBekend !== true) uit.push('ingredienten');
  if (p.vet === undefined || p.suikers === undefined || p.zout === undefined) uit.push('voeding');
  return uit;
}
export const VEZELS_VEEL = 6; // g per 100 g
export const EIWIT_VEEL_ENERGIE = 0.2; // aandeel van de energie
const KCAL_PER_G_EIWIT = 4;

export function niveauVan(stof: Stof, waarde: number, drank: boolean): Niveau {
  const [laag, hoog] = DREMPELS[drank ? 'drank' : 'voeding'][stof];
  if (waarde <= laag) return 'laag';
  return waarde > hoog ? 'hoog' : 'midden';
}

export function labelVoor(score: number): OordeelLabel {
  return score >= 65 ? 'goed' : score >= 40 ? 'matig' : 'slecht';
}

export function berekenScore(p: Product, drank: boolean): Oordeel {
  const redenen: Reden[] = [];
  const waarden: Record<Stof, number | undefined> = { vet: p.vet, verzadigd: p.verzadigd, suikers: p.suikers, zout: p.zout };
  // Een onbekende waarde telt niet mee: we schatten niets.
  for (const stof of ['vet', 'verzadigd', 'suikers', 'zout'] as Stof[]) {
    const v = waarden[stof];
    if (v === undefined) continue;
    const niveau = niveauVan(stof, v, drank);
    if (niveau === 'laag') continue;
    const punten = niveau === 'hoog' ? PUNTEN.hoog : PUNTEN.midden;
    const code = `${stof}${niveau === 'hoog' ? 'Hoog' : 'Midden'}` as RedenCode;
    redenen.push({ code, punten, waarde: v });
  }
  if (p.nova === 4) redenen.push({ code: 'nova4', punten: PUNTEN.nova4 });
  // WEEK-296: bonussen voor onbewerkt, zonder additieven en energiearm.
  if (p.nova === 1) redenen.push({ code: 'nova1', punten: PUNTEN.nova1 });
  if (p.ingredientenBekend === true && !p.additieven.some((a) => eNummer(a))) redenen.push({ code: 'geenAdditieven', punten: PUNTEN.geenAdditieven });
  if (p.kcal !== undefined && p.kcal <= ENERGIEARM_KCAL[drank ? 'drank' : 'voeding']) redenen.push({ code: 'energiearm', punten: PUNTEN.energiearm, waarde: p.kcal });
  if ((p.vezels ?? 0) >= VEZELS_VEEL) redenen.push({ code: 'vezels', punten: PUNTEN.vezels, waarde: p.vezels });
  if (p.eiwitten !== undefined && p.kcal && (p.eiwitten * KCAL_PER_G_EIWIT) / p.kcal >= EIWIT_VEEL_ENERGIE) {
    redenen.push({ code: 'eiwit', punten: PUNTEN.eiwit, waarde: p.eiwitten });
  }
  // WEEK-295: additieven, streng. Elk E-nummer telt één keer: altijd de basisaftrek, en daarbovenop
  // zoetstof, EFSA-risico of de EU-regel (een additief met een EU-regel telt niet nog eens voor EFSA).
  const gezien = new Set<string>();
  const plafonds = new Set<PlafondReden>();
  if (p.nova === 4) plafonds.add('nova4');
  for (const tag of p.additieven) {
    const code = eNummer(tag);
    if (!code || gezien.has(code)) continue;
    gezien.add(code);
    const info = additiefInfo(tag, 'nl');
    redenen.push({ code: 'additief', punten: PUNTEN.additief, additief: code });
    if (info?.functie === 'zoetstof') redenen.push({ code: 'zoetstof', punten: PUNTEN.zoetstof, additief: code });
    const regel = euRegel(tag);
    if (regel?.status === 'verboden') {
      redenen.push({ code: 'verboden', punten: 0, additief: code });
      plafonds.add('verboden');
    } else if (regel) {
      redenen.push({ code: 'additiefEu', punten: PUNTEN.additiefEu, additief: code });
      plafonds.add('additiefEu');
    } else if (info?.efsa?.risico === 'hoog') {
      redenen.push({ code: 'efsaHoog', punten: PUNTEN.efsaHoog, additief: code });
      plafonds.add('efsaHoog');
    } else if (info?.efsa?.risico === 'matig') {
      redenen.push({ code: 'efsaMatig', punten: PUNTEN.efsaMatig, additief: code });
    }
  }

  const totaal = 100 + redenen.reduce((som, r) => som + r.punten, 0);
  let score = Math.max(0, Math.min(100, Math.round(totaal)));
  // Het strengste plafond telt; het wordt enkel vermeld als het de score echt verlaagt.
  const strengste = PLAFOND_VOLGORDE.find((reden) => plafonds.has(reden));
  const plafond: Plafond | undefined = strengste !== undefined && score > PLAFOND[strengste] ? { reden: strengste, max: PLAFOND[strengste] } : undefined;
  if (plafond) score = plafond.max;
  const onvoldoende = ontbrekendeGegevens(p);
  const oordeel: Oordeel = { score, label: labelVoor(score), redenen };
  if (plafond) oordeel.plafond = plafond;
  if (onvoldoende.length) oordeel.onvoldoende = onvoldoende;
  return oordeel;
}
