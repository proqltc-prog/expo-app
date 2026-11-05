// WEEK-193: de uitleg "Hoe werkt het?" op de gezinspagina, achter het info-icoon.
// Pure logica: de vertaalfunctie komt van het scherm, zodat dit zonder React getest kan worden.

/** De onderdelen van de uitleg, in de volgorde van de app-tabbladen. */
export const HOWTO_ONDERDELEN = ['menu', 'lijst', 'frigo', 'scan', 'gezin'] as const;

/**
 * De uitleg als tekst: eerst de kop, dan een alinea per onderdeel. Alinea's scheiden met een lege regel.
 * De onderdeelnaam staat in de vertaling tussen dubbele sterretjes en wordt vet getoond (WEEK-209).
 */
export function howtoTekst(vertaal: (sleutel: string) => string): string {
  return [vertaal('howto.kop'), ...HOWTO_ONDERDELEN.map((k) => vertaal(`howto.${k}`))].join('\n\n');
}
