// Synchronisatie binnen de gezinsruimte (WEEK-8). Pure logica, zonder netwerk of opslag.
//
// Lijsten (boodschappenlijst, frigo) worden per item gesynchroniseerd:
// wie tegelijk verschillende items aanpast, verliest niets. Per item wint de laatste wijziging.
// Documenten (weekplan, gezinsprofiel) worden als geheel gesynchroniseerd; ook daar wint de laatste.
//
// Elk toestel onthoudt per soort:
// - de laatst gekende versie van de lijst (om te zien wat dit toestel zelf veranderde)
// - per item het tijdstip van de laatst gekende wijziging ("meta")

export type ItemSoort = 'lijst' | 'frigo' | 'eigenRecept';
export type DocumentSleutel = 'plan' | 'profiel';

/** Een rij zoals ze in de tabel gezin_items staat. */
export type SyncRij = {
  id: string;
  data: unknown;
  verwijderd: boolean;
  bijgewerkt_op: string;
};

/** Per item-id: tijdstip (ISO) van de laatst gekende wijziging. */
export type SyncMeta = Record<string, string>;

type MetId = { id: string };

// Postgres geeft microseconden ("…:00.123456+00:00"); niet elke JavaScript-motor leest die, dus inkorten tot milliseconden.
const tijd = (iso: string | undefined) => {
  const t = iso ? Date.parse(iso.replace(/(\.\d{3})\d+/, '$1')) : NaN;
  return Number.isNaN(t) ? -Infinity : t;
};

/** Is tijdstip `a` later dan `b`? Ongeldige of ontbrekende tijdstippen zijn het oudst. */
export function nieuwer(a: string | undefined, b: string | undefined): boolean {
  return tijd(a) > tijd(b);
}

const zelfde = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Wat heeft dit toestel veranderd sinds de vorige gekende versie?
 * Geeft de rijen om te versturen (nieuw, gewijzigd, of verwijderd) met tijdstip `nu`,
 * en de bijgewerkte meta.
 */
export function lokaleWijzigingen<T extends MetId>(
  vorige: readonly T[],
  nieuw: readonly T[],
  meta: SyncMeta,
  nu: string
): { rijen: SyncRij[]; meta: SyncMeta } {
  const oud = new Map(vorige.map((i) => [i.id, i]));
  const rijen: SyncRij[] = [];
  const nieuweMeta: SyncMeta = { ...meta };
  const gezien = new Set<string>();
  for (const item of nieuw) {
    if (gezien.has(item.id)) continue;
    gezien.add(item.id);
    const was = oud.get(item.id);
    if (was && zelfde(was, item)) continue;
    rijen.push({ id: item.id, data: item, verwijderd: false, bijgewerkt_op: nu });
    nieuweMeta[item.id] = nu;
  }
  for (const id of oud.keys()) {
    if (gezien.has(id)) continue;
    rijen.push({ id, data: {}, verwijderd: true, bijgewerkt_op: nu });
    nieuweMeta[id] = nu;
  }
  return { rijen, meta: nieuweMeta };
}

/**
 * Past wijzigingen van andere toestellen toe op de lokale lijst.
 * - Een rij wordt enkel toegepast als ze nieuwer is dan wat dit toestel van dat item kent.
 * - Gewijzigde items blijven op hun plaats; nieuwe items komen achteraan, in de volgorde van de rijen.
 * - `lees` controleert de data van een rij (null = onbruikbaar, wordt overgeslagen).
 */
export function pasExternToe<T extends MetId>(
  lokaal: readonly T[],
  meta: SyncMeta,
  rijen: readonly SyncRij[],
  lees: (data: unknown) => T | null
): { items: T[]; meta: SyncMeta; gewijzigd: boolean } {
  const items = [...lokaal];
  const nieuweMeta: SyncMeta = { ...meta };
  let gewijzigd = false;
  const gesorteerd = [...rijen].sort((a, b) => tijd(a.bijgewerkt_op) - tijd(b.bijgewerkt_op));
  for (const rij of gesorteerd) {
    if (!nieuwer(rij.bijgewerkt_op, nieuweMeta[rij.id])) continue;
    const plaats = items.findIndex((i) => i.id === rij.id);
    if (rij.verwijderd) {
      nieuweMeta[rij.id] = rij.bijgewerkt_op;
      if (plaats >= 0) {
        items.splice(plaats, 1);
        gewijzigd = true;
      }
      continue;
    }
    const item = lees(rij.data);
    if (!item || item.id !== rij.id) continue;
    nieuweMeta[rij.id] = rij.bijgewerkt_op;
    if (plaats >= 0) {
      if (zelfde(items[plaats], item)) continue;
      items[plaats] = item;
    } else {
      items.push(item);
    }
    gewijzigd = true;
  }
  return { items, meta: nieuweMeta, gewijzigd };
}

/**
 * Eerste keer samenvoegen na het aansluiten bij een gezin: de gegevens van het gezin
 * worden overgenomen, en wat dit toestel al had en het gezin nog niet kent, wordt toegevoegd.
 * - Dubbele ids op het toestel worden maar één keer meegenomen (anders weigert de database de hele batch).
 * - Verwijderde het gezin ooit een item met dezelfde id, dan wint die verwijdering, tenzij het lokale item
 *   aantoonbaar nieuwer is (`tijdVan`, bv. wanneer een frigo-item toegevoegd werd).
 * Geeft de samengevoegde lijst en de rijen die dit toestel moet versturen.
 */
export function eersteSamenvoeging<T extends MetId>(
  lokaal: readonly T[],
  rijen: readonly SyncRij[],
  lees: (data: unknown) => T | null,
  nu: string,
  tijdVan?: (item: T) => string | undefined
): { items: T[]; meta: SyncMeta; teVersturen: SyncRij[] } {
  const { items: vanGezin, meta } = pasExternToe([], {}, rijen, lees);
  const levend = new Set(vanGezin.map((i) => i.id));
  const gezien = new Set<string>();
  const extra = lokaal.filter((i) => {
    if (gezien.has(i.id) || levend.has(i.id)) return false;
    gezien.add(i.id);
    const verwijderdOp = meta[i.id];
    if (!verwijderdOp) return true;
    return !!tijdVan && nieuwer(tijdVan(i), verwijderdOp);
  });
  const teVersturen = extra.map((i) => ({ id: i.id, data: i, verwijderd: false, bijgewerkt_op: nu }));
  for (const r of teVersturen) meta[r.id] = nu;
  return { items: [...vanGezin, ...extra], meta, teVersturen };
}

/** Versie van een document: inhoud + tijdstip van de laatste wijziging. */
export type DocumentVersie = { data: unknown; bijgewerkt_op: string };

/** Moet een document van een ander toestel het lokale vervangen? */
export function neemDocumentOver(lokaalOp: string | undefined, extern: DocumentVersie | null | undefined): boolean {
  return !!extern && nieuwer(extern.bijgewerkt_op, lokaalOp);
}

/** Voegt rijen in de wachtrij samen: per id telt enkel de nieuwste versie. */
export function voegWachtrijSamen(wachtrij: readonly SyncRij[], nieuw: readonly SyncRij[]): SyncRij[] {
  const perId = new Map<string, SyncRij>();
  for (const rij of [...wachtrij, ...nieuw]) {
    const bestaand = perId.get(rij.id);
    if (!bestaand || !nieuwer(bestaand.bijgewerkt_op, rij.bijgewerkt_op)) perId.set(rij.id, rij);
  }
  return [...perId.values()];
}

// ── Gezinscode ──

/** Tekens in een gezinscode (zonder I, O, 0 en 1). */
export const CODE_TEKENS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Maakt een getypte code netjes: hoofdletters, zonder spaties of streepjes.
 * Geeft null als het geen geldige code van 6 tekens is.
 */
export function leesGezinscode(invoer: string): string | null {
  const code = invoer.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== 6) return null;
  return [...code].every((t) => CODE_TEKENS.includes(t)) ? code : null;
}

/** Toont een code leesbaar in twee blokjes: "ABC 234". */
export function toonGezinscode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

/** Foutcodes van de server-functies, vertaald naar een vertaalsleutel-achtervoegsel. */
export type GezinFout =
  | 'onbekendeCode'
  | 'teVeelPogingen'
  | 'alLid'
  | 'geenVerbinding'
  | 'opvolgerNodig'
  | 'geenBeheerder'
  | 'geenLid'
  | 'geenOpvolger'
  | 'onbekend';

export function leesGezinFout(bericht: string | undefined | null): GezinFout {
  const t = bericht ?? '';
  if (t.includes('onbekende_code')) return 'onbekendeCode';
  if (t.includes('te_veel_pogingen')) return 'teVeelPogingen';
  if (t.includes('al_lid')) return 'alLid';
  if (t.includes('opvolger_nodig')) return 'opvolgerNodig';
  if (t.includes('geen_beheerder')) return 'geenBeheerder';
  if (t.includes('geen_opvolger')) return 'geenOpvolger';
  if (t.includes('geen_lid')) return 'geenLid';
  if (/network|fetch|timeout|offline|failed to fetch/i.test(t)) return 'geenVerbinding';
  return 'onbekend';
}

// ── Bijhalen naast live updates (WEEK-26) ──

/**
 * Wanneer de app zelf alles opnieuw ophaalt, naast de live updates.
 * Bij een koude start van Supabase Realtime (project een tijd niet gebruikt) gaan wijzigingen in de
 * eerste seconden na het inschrijven live verloren; door kort na het verbinden en daarna geregeld
 * bij te halen, komt een gemiste wijziging ten laatste na `intervalMs` binnen.
 */
export const BIJHALEN = {
  /** Na het verbinden: zoveel milliseconden later nog eens bijhalen. */
  naVerbindenMs: [5_000, 20_000],
  /** Zolang de app open en verbonden is: zo vaak bijhalen. */
  intervalMs: 60_000,
} as const;

/**
 * Het gezin waar dit account volgens de server al lid van is (WEEK-129).
 * Leest de rij uit gezinsleden met het gezin erbij; PostgREST geeft het gezin als object of als lijst.
 */
export function alsEigenGezin(ruw: unknown): { id: string; naam: string; code: string } | null {
  const rij = (Array.isArray(ruw) ? ruw[0] : ruw) as { gezinnen?: unknown } | null;
  const gezin = (Array.isArray(rij?.gezinnen) ? rij?.gezinnen[0] : rij?.gezinnen) as { id?: unknown; naam?: unknown; code?: unknown } | null | undefined;
  if (!gezin || typeof gezin.id !== 'string' || typeof gezin.code !== 'string') return null;
  return { id: gezin.id, naam: typeof gezin.naam === 'string' ? gezin.naam : '', code: gezin.code };
}

/**
 * WEEK-275: welke soorten dit toestel doorstuurt. Elke soort gaat apart naar de databank, zodat een weigering van
 * één soort de rest (lijst, In huis) niet blokkeert. Eigen gerechten enkel als dit toestel ze mag beheren (WEEK-276).
 */
export function teVersturenSoorten<S extends string>(soorten: readonly S[], magGerechten: boolean): S[] {
  return soorten.filter((s) => s !== 'eigenRecept' || magGerechten);
}
