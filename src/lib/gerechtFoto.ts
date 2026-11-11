// Foto's van gerechten in het weekmenu en bij de stijlkeuze (WEEK-244). Pure logica.
// De foto's staan in Supabase: de bestanden in de opslagmap "gerechtfotos", de lijst in de tabel gerecht_fotos.
// Elk recept uit de databank heeft een eigen foto (recepten.foto_pad), gekozen op keuken en soort gerecht.
// Elke bestandsnaam bevat de Pexels-id: een nieuwe foto heeft dus altijd een nieuwe naam, zodat het toestel
// een foto die het al heeft nooit opnieuw downloadt en een nieuwe foto wel ophaalt.
// De vlag tekent de app zelf, zodat ze altijd klopt.

/** De opslagmap in Supabase met de foto's. */
export const FOTO_MAP = 'gerechtfotos';

/** De publieke link naar een foto in de opslag van Supabase. */
export function fotoUrl(supabaseUrl: string, pad: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${FOTO_MAP}/${encodeURIComponent(pad)}`;
}

/** Stijlfoto's per sleutel, bv. { 'stijl-italiaans': 'stijl-italiaans-5280912.jpg' }. */
export type StijlFotos = Readonly<Record<string, string>>;

/**
 * De foto van een recept: zijn eigen foto uit de databank, anders de stijlfoto van zijn keuken,
 * anders de gezinsfoto (recept van het gezin zonder keuken). Nog niets geladen: undefined.
 */
export function kiesFoto(eigen: string | undefined, stijl: string | undefined, stijlFotos: StijlFotos): string | undefined {
  if (eigen) return eigen;
  if (stijl && stijlFotos[`stijl-${stijl}`]) return stijlFotos[`stijl-${stijl}`];
  return stijlFotos['stijl-gezin'];
}

/** Leest de rijen van gerecht_fotos tot een overzicht van de stijlfoto's (de eerste per stijl). */
export function leesStijlFotos(rijen: readonly { sleutel?: unknown; pad?: unknown; volgnr?: unknown }[]): Record<string, string> {
  const uit: Record<string, string> = {};
  const gesorteerd = [...rijen].sort((a, b) => Number(a.volgnr ?? 1) - Number(b.volgnr ?? 1));
  for (const r of gesorteerd) {
    if (typeof r.sleutel !== 'string' || typeof r.pad !== 'string' || !r.sleutel.startsWith('stijl-')) continue;
    if (!uit[r.sleutel]) uit[r.sleutel] = r.pad;
  }
  return uit;
}

/** Een vlag of teken in de hoek van de foto. */
export type Vlag =
  | { soort: 'strepen'; richting: 'verticaal' | 'horizontaal'; kleuren: readonly string[]; cirkel?: string }
  | { soort: 'cirkel'; achtergrond: string; kleur: string; tweede?: string }
  | { soort: 'ster'; achtergrond: string; kleur: string }
  | { soort: 'teken'; teken: 'olijf' | 'stokjes' | 'gezin' };

const VLAGGEN: Record<string, Vlag> = {
  italiaans: { soort: 'strepen', richting: 'verticaal', kleuren: ['#009246', '#FFFFFF', '#CE2B37'] },
  frans: { soort: 'strepen', richting: 'verticaal', kleuren: ['#002395', '#FFFFFF', '#ED2939'] },
  belgisch: { soort: 'strepen', richting: 'verticaal', kleuren: ['#000000', '#FDDA24', '#EF3340'] },
  // Klassiek = Belgisch (in het Frans: "Belge / classique").
  klassiek: { soort: 'strepen', richting: 'verticaal', kleuren: ['#000000', '#FDDA24', '#EF3340'] },
  mexicaans: { soort: 'strepen', richting: 'verticaal', kleuren: ['#006847', '#FFFFFF', '#CE1126'] },
  indiaas: { soort: 'strepen', richting: 'horizontaal', kleuren: ['#FF9933', '#FFFFFF', '#138808'], cirkel: '#000080' },
  thais: { soort: 'strepen', richting: 'horizontaal', kleuren: ['#A51931', '#F4F5F8', '#2D2A4A', '#2D2A4A', '#F4F5F8', '#A51931'] },
  japans: { soort: 'cirkel', achtergrond: '#FFFFFF', kleur: '#BC002D' },
  // Korea: vereenvoudigd tot de rood-blauwe cirkel op wit.
  koreaans: { soort: 'cirkel', achtergrond: '#FFFFFF', kleur: '#CD2E3A', tweede: '#0047A0' },
  chinees: { soort: 'ster', achtergrond: '#DE2910', kleur: '#FFDE00' },
  mediterraan: { soort: 'teken', teken: 'olijf' },
  aziatisch: { soort: 'teken', teken: 'stokjes' },
  gezin: { soort: 'teken', teken: 'gezin' },
};

/** De keukens met een vlag of teken (en een stijlfoto). */
export const STIJLEN_MET_FOTO: readonly string[] = Object.keys(VLAGGEN).filter((k) => k !== 'gezin');

/** De vlag of het teken van een keuken; zonder keuken het gezinsteken; hartig/zoet en onbekend: undefined. */
export function vlagVoorStijl(stijl: string | undefined): Vlag | undefined {
  return VLAGGEN[stijl ?? 'gezin'];
}
