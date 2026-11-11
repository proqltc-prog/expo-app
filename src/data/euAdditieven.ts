// Additieven waar de Europese wet iets over zegt (WEEK-224). Pure data en logica, zonder React Native.
// Enkel de wet zelf, geen eigen oordeel en geen teksten van IARC of EFSA (zie WEEK-220, "bewust niet opgenomen").
//  - waarschuwing: kleurstoffen waarvoor de verpakking verplicht vermeldt "kan de activiteit en de aandacht van
//    kinderen nadelig beïnvloeden" (Verordening (EG) 1333/2008, bijlage V).
//  - verboden: additieven die in de EU niet meer toegelaten zijn. Ze kunnen nog opduiken in oude gegevens van
//    Open Food Facts of in ingevoerde producten.
import { eNummer } from '@/data/additieven';

export type EuStatus = 'verboden' | 'waarschuwing';
/** Welke wettekst; het scherm vertaalt dit (sleutel `eu.bron.<bron>`). */
export type EuBron = 'v1333_2008' | 'v2022_63' | 'v884_2007' | 'r2006_52';
export type EuRegel = { status: EuStatus; bron: EuBron };

export const EU_ADDITIEVEN: Record<string, EuRegel> = {
  // Verplichte waarschuwing voor kinderen (Verordening (EG) 1333/2008, bijlage V).
  E102: { status: 'waarschuwing', bron: 'v1333_2008' },
  E104: { status: 'waarschuwing', bron: 'v1333_2008' },
  E110: { status: 'waarschuwing', bron: 'v1333_2008' },
  E122: { status: 'waarschuwing', bron: 'v1333_2008' },
  E124: { status: 'waarschuwing', bron: 'v1333_2008' },
  E129: { status: 'waarschuwing', bron: 'v1333_2008' },
  // Niet meer toegelaten.
  E171: { status: 'verboden', bron: 'v2022_63' }, // titaandioxide, Verordening (EU) 2022/63
  E128: { status: 'verboden', bron: 'v884_2007' }, // rood 2G, Verordening (EG) 884/2007
  E216: { status: 'verboden', bron: 'r2006_52' }, // propylparabeen, Richtlijn 2006/52/EG
  E217: { status: 'verboden', bron: 'r2006_52' }, // natriumpropylparabeen, Richtlijn 2006/52/EG
};

/** De EU-regel voor een Open Food Facts-tag, of null. Varianten met een letter (bv. E129A) vallen niet onder de regel. */
export function euRegel(tag: string): EuRegel | null {
  const code = eNummer(tag);
  return (code && EU_ADDITIEVEN[code]) || null;
}

export type AdditiefMetRegel = { tag: string; regel: EuRegel | null };

const RANG: Record<EuStatus | 'geen', number> = { verboden: 0, waarschuwing: 1, geen: 2 };

/** De additieven met hun regel: eerst niet meer toegelaten, dan met waarschuwing, dan de rest (elk in de oorspronkelijke volgorde). */
export function additievenMetRegel(tags: string[]): AdditiefMetRegel[] {
  return tags
    .map((tag, i) => ({ tag, regel: euRegel(tag), i }))
    .sort((a, b) => RANG[a.regel?.status ?? 'geen'] - RANG[b.regel?.status ?? 'geen'] || a.i - b.i)
    .map(({ tag, regel }) => ({ tag, regel }));
}

/** Hoeveel additieven niet meer toegelaten zijn en hoeveel een waarschuwing hebben. Dubbele E-nummers tellen één keer. */
export function telEuRegels(tags: string[]): Record<EuStatus, number> {
  const gezien = new Set<string>();
  const telling: Record<EuStatus, number> = { verboden: 0, waarschuwing: 0 };
  for (const tag of tags) {
    const code = eNummer(tag);
    const regel = euRegel(tag);
    if (!code || !regel || gezien.has(code)) continue;
    gezien.add(code);
    telling[regel.status] += 1;
  }
  return telling;
}
