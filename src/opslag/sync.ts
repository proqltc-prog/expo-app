// Synchronisatie van de gezinsruimte (WEEK-8) met Supabase.
//
// Werking:
// - De app blijft alles op het toestel bewaren; zonder gezinsruimte (of offline) werkt alles zoals voorheen.
// - Na elke lokale wijziging berekent registreerItems/registreerDocument wat dit toestel veranderde
//   en zet dat in een wachtrij; verstuur() stuurt de wachtrij door zodra er verbinding is.
// - Wijzigingen van andere gezinsleden komen live binnen (Supabase Realtime) en bij het openen
//   van de app (haalOp); ze worden toegepast met de pure logica uit src/lib/sync.ts.
// - Alle wijzigingen aan de opslag lopen via naElkaar(), zodat niets elkaar overschrijft.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { normaliseerFrigo } from '@/lib/frigo';
import { leesLijstItem, normaliseerLijst } from '@/lib/lijst';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import { normaliseerProfiel } from '@/lib/profiel';
import {
  DocumentSleutel,
  eersteSamenvoeging,
  ItemSoort,
  lokaleWijzigingen,
  neemDocumentOver,
  pasExternToe,
  SyncMeta,
  SyncRij,
  voegWachtrijSamen,
} from '@/lib/sync';
import { SLEUTEL } from './sleutels';
import { supabase, zorgVoorSessie } from './supabase';
import { naElkaar } from './wachtrij';

export type Gezin = { id: string; naam: string; code: string; /** Naam van dit toestel binnen het gezin. */ ikNaam?: string };
export type GezinsLid = { id: string; naam: string; ikZelf: boolean };
export type SyncStatus = 'uit' | 'verbonden' | 'offline';
export type Gebeurtenis = ItemSoort | DocumentSleutel | 'leden' | 'gezin' | 'status';

type MetId = { id: string };

// ── Wat er gesynchroniseerd wordt ──

type ItemBron = { sleutel: string; lees: (d: unknown) => MetId | null; normaliseer: (ruw: unknown) => MetId[] };

const ITEMBRONNEN: Partial<Record<ItemSoort, ItemBron>> = {
  lijst: { sleutel: SLEUTEL.lijst, lees: leesLijstItem, normaliseer: normaliseerLijst },
  frigo: { sleutel: SLEUTEL.frigo, lees: (d) => normaliseerFrigo([d])[0] ?? null, normaliseer: normaliseerFrigo },
};

type DocumentBron = {
  sleutel: string;
  /** Wat er naar het gezin gaat. */
  naarGezin: (lokaal: unknown) => unknown;
  /** Wat er van het gezin op dit toestel komt (null = onbruikbaar). */
  vanGezin: (extern: unknown, lokaal: unknown) => unknown | null;
};

const DOCUMENTBRONNEN: Record<DocumentSleutel, DocumentBron> = {
  plan: { sleutel: SLEUTEL.plan, naarGezin: (d) => d, vanGezin: (e) => normaliseerWeekplan(e) },
  // De taal is een keuze per toestel en wordt niet gedeeld.
  profiel: {
    sleutel: SLEUTEL.profiel,
    naarGezin: (d) => ({ ...normaliseerProfiel(d), taal: undefined }),
    vanGezin: (e, l) => ({ ...normaliseerProfiel(e), taal: normaliseerProfiel(l).taal }),
  },
};

// ── Toestand op het toestel ──

type Toestand = {
  items: Partial<Record<ItemSoort, { vorige: MetId[]; meta: SyncMeta }>>;
  documenten: Partial<Record<DocumentSleutel, { op: string }>>;
  wachtrij: {
    items: Partial<Record<ItemSoort, SyncRij[]>>;
    documenten: Partial<Record<DocumentSleutel, { data: unknown; bijgewerkt_op: string }>>;
  };
};

const legeToestand = (): Toestand => ({ items: {}, documenten: {}, wachtrij: { items: {}, documenten: {} } });

async function laadToestand(): Promise<Toestand> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.sync);
    const t = ruw ? (JSON.parse(ruw) as Partial<Toestand>) : {};
    const leeg = legeToestand();
    return {
      items: t.items ?? leeg.items,
      documenten: t.documenten ?? leeg.documenten,
      wachtrij: { items: t.wachtrij?.items ?? {}, documenten: t.wachtrij?.documenten ?? {} },
    };
  } catch {
    return legeToestand();
  }
}

const bewaarToestand = (t: Toestand) => AsyncStorage.setItem(SLEUTEL.sync, JSON.stringify(t));

async function leesJson(sleutel: string): Promise<unknown> {
  try {
    const ruw = await AsyncStorage.getItem(sleutel);
    return ruw ? JSON.parse(ruw) : null;
  } catch {
    return null;
  }
}

// ── Gezin ──

let gezinGeladen = false;
let gezinCache: Gezin | null = null;

export async function laadGezin(): Promise<Gezin | null> {
  if (gezinGeladen) return gezinCache;
  const ruw = (await leesJson(SLEUTEL.gezin)) as Partial<Gezin> | null;
  gezinCache =
    ruw && typeof ruw.id === 'string' && typeof ruw.code === 'string'
      ? { id: ruw.id, naam: ruw.naam ?? '', code: ruw.code, ...(typeof ruw.ikNaam === 'string' && ruw.ikNaam ? { ikNaam: ruw.ikNaam } : {}) }
      : null;
  gezinGeladen = true;
  return gezinCache;
}

async function bewaarGezin(gezin: Gezin | null): Promise<void> {
  gezinCache = gezin;
  gezinGeladen = true;
  if (gezin) await AsyncStorage.setItem(SLEUTEL.gezin, JSON.stringify(gezin));
  else await AsyncStorage.removeItem(SLEUTEL.gezin);
}

// ── Meldingen aan de schermen ──

const luisteraars = new Map<Gebeurtenis, Set<() => void>>();

/** Laat een scherm weten dat er iets veranderde (bv. door een ander gezinslid). Geeft een afmeldfunctie terug. */
export function bijWijziging(gebeurtenis: Gebeurtenis, terugroep: () => void): () => void {
  const set = luisteraars.get(gebeurtenis) ?? new Set();
  set.add(terugroep);
  luisteraars.set(gebeurtenis, set);
  return () => {
    set.delete(terugroep);
  };
}

function meld(gebeurtenis: Gebeurtenis) {
  luisteraars.get(gebeurtenis)?.forEach((f) => {
    try {
      f();
    } catch {
      // een fout in één scherm mag de synchronisatie niet stoppen
    }
  });
}

let status: SyncStatus = 'uit';
export const syncStatus = () => status;
function zetStatus(s: SyncStatus) {
  if (s === status) return;
  status = s;
  meld('status');
}

// ── Lokale wijzigingen registreren (aangeroepen vanuit src/opslag/*, binnen naElkaar) ──

/** Registreert de nieuwe inhoud van een lijst na een lokale wijziging. Moet binnen naElkaar() lopen. */
export async function registreerItems(soort: ItemSoort, items: readonly MetId[]): Promise<void> {
  if (!(await laadGezin())) return;
  const t = await laadToestand();
  const huidig = t.items[soort] ?? { vorige: [], meta: {} };
  const { rijen, meta } = lokaleWijzigingen(huidig.vorige, items, huidig.meta, new Date().toISOString());
  t.items[soort] = { vorige: [...items], meta };
  if (rijen.length) t.wachtrij.items[soort] = voegWachtrijSamen(t.wachtrij.items[soort] ?? [], rijen);
  await bewaarToestand(t);
  if (rijen.length) planVerstuur();
}

/** Registreert een lokaal gewijzigd document. Moet binnen naElkaar() lopen. */
export async function registreerDocument(sleutel: DocumentSleutel, data: unknown): Promise<void> {
  if (!(await laadGezin())) return;
  const t = await laadToestand();
  const op = new Date().toISOString();
  t.documenten[sleutel] = { op };
  t.wachtrij.documenten[sleutel] = { data: DOCUMENTBRONNEN[sleutel].naarGezin(data), bijgewerkt_op: op };
  await bewaarToestand(t);
  planVerstuur();
}

// ── Versturen ──

let verstuurTimer: ReturnType<typeof setTimeout> | null = null;
function planVerstuur() {
  if (verstuurTimer) clearTimeout(verstuurTimer);
  verstuurTimer = setTimeout(() => {
    verstuurTimer = null;
    void verstuur();
  }, 300);
}

let bezigMetVersturen = false;
let nogEens = false;

/** Stuurt de wachtrij naar het gezin. Mislukt het (offline), dan blijft alles in de wachtrij staan. */
export async function verstuur(): Promise<void> {
  if (bezigMetVersturen) {
    nogEens = true;
    return;
  }
  bezigMetVersturen = true;
  try {
    do {
      nogEens = false;
      const gezin = await laadGezin();
      const sb = supabase();
      if (!gezin || !sb) return;
      const t = await naElkaar(laadToestand);
      const itemRijen = (Object.entries(t.wachtrij.items) as [ItemSoort, SyncRij[]][]).flatMap(([soort, rijen]) =>
        rijen.map((r) => ({ gezin_id: gezin.id, soort, id: r.id, data: r.data, verwijderd: r.verwijderd, bijgewerkt_op: r.bijgewerkt_op }))
      );
      const docRijen = (Object.entries(t.wachtrij.documenten) as [DocumentSleutel, { data: unknown; bijgewerkt_op: string }][]).map(
        ([sleutel, d]) => ({ gezin_id: gezin.id, sleutel, data: d.data, bijgewerkt_op: d.bijgewerkt_op })
      );
      for (let i = 0; i < itemRijen.length; i += 500) {
        const { error } = await sb.from('gezin_items').upsert(itemRijen.slice(i, i + 500), { onConflict: 'gezin_id,soort,id' });
        if (error) throw error;
      }
      if (docRijen.length) {
        const { error } = await sb.from('gezin_documenten').upsert(docRijen, { onConflict: 'gezin_id,sleutel' });
        if (error) throw error;
      }
      // Enkel weghalen wat verstuurd is; wat intussen opnieuw wijzigde, blijft staan.
      await naElkaar(async () => {
        const nu = await laadToestand();
        const verstuurd = new Set(itemRijen.map((r) => `${r.soort}|${r.id}|${r.bijgewerkt_op}`));
        for (const soort of Object.keys(nu.wachtrij.items) as ItemSoort[]) {
          nu.wachtrij.items[soort] = (nu.wachtrij.items[soort] ?? []).filter((r) => !verstuurd.has(`${soort}|${r.id}|${r.bijgewerkt_op}`));
        }
        for (const d of docRijen) {
          if (nu.wachtrij.documenten[d.sleutel]?.bijgewerkt_op === d.bijgewerkt_op) delete nu.wachtrij.documenten[d.sleutel];
        }
        await bewaarToestand(nu);
      });
      zetStatus('verbonden');
    } while (nogEens);
  } catch {
    zetStatus('offline');
    planHerstart();
  } finally {
    bezigMetVersturen = false;
  }
}

// ── Ontvangen ──

/** Past rijen van andere toestellen toe op een lijst. Moet binnen naElkaar() lopen. */
async function pasItemsToe(soort: ItemSoort, rijen: SyncRij[], t: Toestand): Promise<void> {
  const bron = ITEMBRONNEN[soort];
  if (!bron || !rijen.length) return;
  const lokaal = bron.normaliseer(await leesJson(bron.sleutel));
  const huidig = t.items[soort] ?? { vorige: lokaal, meta: {} };
  const { items, meta, gewijzigd } = pasExternToe(lokaal, huidig.meta, rijen, bron.lees);
  if (gewijzigd) await AsyncStorage.setItem(bron.sleutel, JSON.stringify(items));
  t.items[soort] = { vorige: items, meta };
  if (gewijzigd) meld(soort);
}

/** Past een document van een ander toestel toe als het nieuwer is. Moet binnen naElkaar() lopen. */
async function pasDocumentToe(sleutel: DocumentSleutel, extern: { data: unknown; bijgewerkt_op: string }, t: Toestand): Promise<void> {
  if (!neemDocumentOver(t.documenten[sleutel]?.op, extern)) return;
  const bron = DOCUMENTBRONNEN[sleutel];
  const nieuw = bron.vanGezin(extern.data, await leesJson(bron.sleutel));
  t.documenten[sleutel] = { op: extern.bijgewerkt_op };
  if (nieuw === null) return;
  await AsyncStorage.setItem(bron.sleutel, JSON.stringify(nieuw));
  meld(sleutel);
}

type ItemRijDb = SyncRij & { soort: ItemSoort };
type DocRijDb = { sleutel: DocumentSleutel; data: unknown; bijgewerkt_op: string };

async function haalAllesOp(gezinId: string): Promise<{ items: ItemRijDb[]; documenten: DocRijDb[] }> {
  const sb = supabase();
  if (!sb) throw new Error('geen_backend');
  const items: ItemRijDb[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await sb
      .from('gezin_items')
      .select('soort,id,data,verwijderd,bijgewerkt_op')
      .eq('gezin_id', gezinId)
      .order('bijgewerkt_op', { ascending: true })
      .order('id', { ascending: true })
      .range(van, van + 999);
    if (error) throw error;
    items.push(...((data ?? []) as ItemRijDb[]));
    if (!data || data.length < 1000) break;
  }
  const { data: documenten, error } = await sb.from('gezin_documenten').select('sleutel,data,bijgewerkt_op').eq('gezin_id', gezinId);
  if (error) throw error;
  return { items, documenten: (documenten ?? []) as DocRijDb[] };
}

/**
 * Haalt alle gegevens van het gezin op en past ze toe.
 * `eerste`: net aangesloten — gezinsgegevens overnemen en wat enkel op dit toestel staat, doorsturen.
 */
async function haalOp(gezin: Gezin, eerste = false): Promise<void> {
  const { items, documenten } = await haalAllesOp(gezin.id);
  await naElkaar(async () => {
    const t = eerste ? legeToestand() : await laadToestand();
    const nu = new Date().toISOString();
    for (const soort of Object.keys(ITEMBRONNEN) as ItemSoort[]) {
      const bron = ITEMBRONNEN[soort]!;
      const rijen = items.filter((r) => r.soort === soort);
      if (!eerste) {
        await pasItemsToe(soort, rijen, t);
        continue;
      }
      const lokaal = bron.normaliseer(await leesJson(bron.sleutel));
      const samen = eersteSamenvoeging(lokaal, rijen, bron.lees, nu);
      await AsyncStorage.setItem(bron.sleutel, JSON.stringify(samen.items));
      t.items[soort] = { vorige: samen.items, meta: samen.meta };
      if (samen.teVersturen.length) t.wachtrij.items[soort] = samen.teVersturen;
      meld(soort);
    }
    for (const sleutel of Object.keys(DOCUMENTBRONNEN) as DocumentSleutel[]) {
      const extern = documenten.find((d) => d.sleutel === sleutel);
      if (extern) {
        await pasDocumentToe(sleutel, extern, t);
      } else if (eerste) {
        // Het gezin heeft dit document nog niet: dat van dit toestel delen.
        const lokaal = await leesJson(DOCUMENTBRONNEN[sleutel].sleutel);
        if (lokaal) {
          t.documenten[sleutel] = { op: nu };
          t.wachtrij.documenten[sleutel] = { data: DOCUMENTBRONNEN[sleutel].naarGezin(lokaal), bijgewerkt_op: nu };
        }
      }
    }
    await bewaarToestand(t);
  });
}

// ── Live ──

let kanaal: RealtimeChannel | null = null;

function abonneer(gezin: Gezin) {
  const sb = supabase();
  if (!sb) return;
  if (kanaal) void sb.removeChannel(kanaal);
  const filter = `gezin_id=eq.${gezin.id}`;
  kanaal = sb
    .channel(`gezin-${gezin.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gezin_items', filter }, (p) => {
      const r = p.new as Partial<ItemRijDb> | undefined;
      if (!r || typeof r.id !== 'string' || !r.soort || typeof r.bijgewerkt_op !== 'string') return;
      const rij: SyncRij = { id: r.id, data: r.data, verwijderd: r.verwijderd === true, bijgewerkt_op: r.bijgewerkt_op };
      void naElkaar(async () => {
        const t = await laadToestand();
        await pasItemsToe(r.soort as ItemSoort, [rij], t);
        await bewaarToestand(t);
      });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gezin_documenten', filter }, (p) => {
      const r = p.new as Partial<DocRijDb> | undefined;
      if (!r || !r.sleutel || !(r.sleutel in DOCUMENTBRONNEN) || typeof r.bijgewerkt_op !== 'string') return;
      void naElkaar(async () => {
        const t = await laadToestand();
        await pasDocumentToe(r.sleutel as DocumentSleutel, { data: r.data, bijgewerkt_op: r.bijgewerkt_op as string }, t);
        await bewaarToestand(t);
      });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gezinsleden', filter }, () => meld('leden'))
    .subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        zetStatus('verbonden');
        // Inhalen wat er gemist werd terwijl de verbinding weg was.
        haalOp(gezin).then(verstuur).catch(() => zetStatus('offline'));
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        // supabase-js probeert zelf opnieuw te verbinden; bij succes volgt opnieuw SUBSCRIBED.
        zetStatus('offline');
      }
    });
}

function stopAbonnement() {
  const sb = supabase();
  if (kanaal && sb) void sb.removeChannel(kanaal);
  kanaal = null;
}

// ── Starten, aansluiten, verlaten ──

let herstartTimer: ReturnType<typeof setTimeout> | null = null;
/** Offline: over 30 seconden opnieuw proberen (zolang de app open is). */
function planHerstart() {
  if (herstartTimer) return;
  herstartTimer = setTimeout(() => {
    herstartTimer = null;
    void startSync();
  }, 30_000);
}

let lopendeStart: Promise<void> | null = null;

/** Bij het openen van de app (en telkens ze terug op de voorgrond komt): bijwerken en live meeluisteren. */
export function startSync(): Promise<void> {
  // Twee starts tegelijk (bv. openen + voorgrond) doen het werk maar één keer.
  lopendeStart ??= start().finally(() => {
    lopendeStart = null;
  });
  return lopendeStart;
}

async function start(): Promise<void> {
  const gezin = await laadGezin();
  const sb = supabase();
  if (!gezin || !sb) {
    zetStatus('uit');
    return;
  }
  try {
    await zorgVoorSessie();
    const { data, error } = await sb.from('gezinnen').select('id').eq('id', gezin.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      // Niet meer (of nooit) lid: loskoppelen, de gegevens blijven op het toestel.
      await koppelLos();
      return;
    }
    await haalOp(gezin);
    await verstuur();
    if (!kanaal) abonneer(gezin);
  } catch {
    zetStatus('offline');
    planHerstart();
  }
}

async function koppel(gezin: Gezin): Promise<void> {
  stopAbonnement();
  await bewaarGezin(gezin);
  await haalOp(gezin, true);
  meld('gezin');
  await verstuur();
  abonneer(gezin);
}

async function koppelLos(): Promise<void> {
  stopAbonnement();
  await naElkaar(async () => {
    await bewaarGezin(null);
    await bewaarToestand(legeToestand());
  });
  zetStatus('uit');
  meld('gezin');
}

type GezinRij = { id: string | null; naam: string | null; code: string | null } | null;

function alsGezin(data: unknown, ikNaam: string): Gezin | null {
  const r = (Array.isArray(data) ? data[0] : data) as GezinRij;
  const naam = ikNaam.trim().slice(0, 40);
  return r && r.id && r.code ? { id: r.id, naam: r.naam ?? '', code: r.code, ...(naam ? { ikNaam: naam } : {}) } : null;
}

/** Maakt een nieuwe gezinsruimte en deelt de gegevens van dit toestel. */
export async function maakGezin(naam: string, lidNaam: string): Promise<Gezin> {
  const sb = supabase();
  if (!sb) throw new Error('geen_backend');
  await zorgVoorSessie();
  const { data, error } = await sb.rpc('maak_gezin', { p_naam: naam, p_lid_naam: lidNaam });
  if (error) throw new Error(error.message);
  const gezin = alsGezin(data, lidNaam);
  if (!gezin) throw new Error('onbekend');
  await koppel(gezin);
  return gezin;
}

/** Wordt lid van een bestaande gezinsruimte met de code. */
export async function wordLid(code: string, lidNaam: string): Promise<Gezin> {
  const sb = supabase();
  if (!sb) throw new Error('geen_backend');
  await zorgVoorSessie();
  const { data, error } = await sb.rpc('word_lid', { p_code: code, p_lid_naam: lidNaam });
  if (error) throw new Error(error.message);
  const gezin = alsGezin(data, lidNaam);
  if (!gezin) throw new Error('onbekende_code');
  await koppel(gezin);
  return gezin;
}

/** Verlaat de gezinsruimte. De gegevens blijven op dit toestel staan. */
export async function verlaatGezin(): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const { error } = await sb.rpc('verlaat_gezin');
  if (error) throw new Error(error.message);
  await koppelLos();
}

/** De leden van de gezinsruimte, in volgorde van aansluiten. */
export async function laadLeden(): Promise<GezinsLid[]> {
  const gezin = await laadGezin();
  const sb = supabase();
  if (!gezin || !sb) return [];
  const [{ data: sessie }, { data, error }] = await Promise.all([
    sb.auth.getSession(),
    sb.from('gezinsleden').select('gebruiker_id,naam').eq('gezin_id', gezin.id).order('toegetreden_op', { ascending: true }),
  ]);
  if (error) throw error;
  const ik = sessie.session?.user.id;
  return ((data ?? []) as { gebruiker_id: string; naam: string }[]).map((l) => ({ id: l.gebruiker_id, naam: l.naam, ikZelf: l.gebruiker_id === ik }));
}
