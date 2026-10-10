// AI-planner (WEEK-23): vraagt een weekplan aan de server-functie en controleert het antwoord.
// Faalt er iets (geen internet, time-out, ongeldig antwoord), dan valt de app terug op de lokale planner.
import { profielContext } from '@/lib/profiel';
import { leesOpdracht } from './opdracht';
import { porties as berekenPorties } from './hoeveelheid';
import { dagenVoorPlan, planLokaal, STANDAARD_AANTAL_DAGEN } from './lokaal';
import { normaliseerRecept } from './normaliseer';
import { markeerUitFrigo } from './frigovoorrang';
import type { FrigoItem } from '@/lib/frigo';
import type { AiVerzoek } from './aiPrompt';
import { DagCode, kooktijdVan, PlanDag, PlanVerzoek, Weekplan, WEEKDAGEN } from './types';

export type AiInstelling = {
  /** Adres van de server-functie; leeg = geen AI, enkel de lokale planner. */
  url?: string;
  /** Optionele sleutel (bv. de publieke Supabase-sleutel) voor de Authorization-header. */
  sleutel?: string;
  /** Publieke Supabase-sleutel voor de apikey-header. */
  apikey?: string;
  /** Toegangstoken van het aangemelde toestel (WEEK-31); gaat voor op `sleutel`. */
  token?: () => Promise<string | undefined>;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

export class AiFout extends Error {
  constructor(bericht: string, readonly status?: number) {
    super(bericht);
  }
}

/** Velden voor een plan waarbij de AI faalde: `aiLimiet` als de daglimiet bereikt was (HTTP 429). */
export function terugvalVelden(fout: unknown): { terugval: true; aiLimiet?: true } {
  return fout instanceof AiFout && fout.status === 429 ? { terugval: true, aiLimiet: true } : { terugval: true };
}

const DAG_MS = 24 * 60 * 60 * 1000;

/** De frigo voor de AI: oudste eerst, hoogstens 25 producten, met hoeveelheid en leeftijd in dagen. */
export function frigoVoorAi(frigo: readonly FrigoItem[], nu: Date): string[] {
  return [...frigo]
    .sort((a, b) => a.toegevoegdOp.localeCompare(b.toegevoegdOp))
    .slice(0, 25)
    .map((f) => {
      const dagen = Math.max(0, Math.floor((nu.getTime() - Date.parse(f.toegevoegdOp)) / DAG_MS));
      const hoeveel = f.hoeveelheid !== undefined ? `${f.hoeveelheid}${f.eenheid ? ` ${f.eenheid}` : ''}, ` : '';
      return `${f.naam.slice(0, 60)} (${hoeveel}${Number.isFinite(dagen) ? dagen : 0} days)`;
    });
}

export function bouwAiVerzoek(verzoek: PlanVerzoek, dagen?: DagCode[], vermijd?: string[]): AiVerzoek {
  const w = leesOpdracht(verzoek.opdracht);
  const frigo = verzoek.frigo?.length ? frigoVoorAi(verzoek.frigo, new Date()) : [];
  return {
    taal: verzoek.taal,
    profiel: profielContext(verzoek.profiel),
    porties: berekenPorties(verzoek.profiel),
    opdracht: verzoek.opdracht,
    kooktijden: [...verzoek.kooktijden],
    stijlen: [...verzoek.stijlen],
    dagen: dagen ?? dagenVoorPlan(w.aantalDagen ?? STANDAARD_AANTAL_DAGEN),
    ...(vermijd?.length ? { vermijd } : {}),
    ...(frigo.length ? { frigo } : {}),
  };
}

/**
 * Controleert het antwoord van de AI. Gooit AiFout als het onbruikbaar is.
 * Harde regels worden hier nog eens afgedwongen, zodat de app er nooit blind op vertrouwt.
 */
export function leesAiAntwoord(ruw: unknown, verzoek: PlanVerzoek, gevraagdeDagen: DagCode[]): PlanDag[] {
  if (!ruw || typeof ruw !== 'object' || !Array.isArray((ruw as { dagen?: unknown }).dagen)) {
    throw new AiFout('Antwoord zonder dagen');
  }
  const w = leesOpdracht(verzoek.opdracht);
  const resultaat: PlanDag[] = [];
  for (const d of (ruw as { dagen: unknown[] }).dagen) {
    if (!d || typeof d !== 'object') continue;
    const { dag, recept: ruwRecept } = d as { dag?: unknown; recept?: unknown };
    if (!WEEKDAGEN.includes(dag as DagCode) || !gevraagdeDagen.includes(dag as DagCode)) continue;
    if (resultaat.some((r) => r.dag === dag)) continue;
    const recept = normaliseerRecept(ruwRecept);
    if (!recept) continue;
    if (w.zonderVlees && recept.soort === 'vlees') continue;
    if (w.zonderVis && recept.soort === 'vis') continue;
    if (verzoek.kooktijden.length && !verzoek.kooktijden.includes(kooktijdVan(recept.minuten))) continue;
    resultaat.push({ dag: dag as DagCode, recept: { ...recept, id: `ai-${dag}-${recept.id}` } });
  }
  if (resultaat.length < gevraagdeDagen.length) {
    throw new AiFout(`Antwoord onvolledig: ${resultaat.length} van ${gevraagdeDagen.length} dagen bruikbaar`);
  }
  return gevraagdeDagen.map((dag) => resultaat.find((r) => r.dag === dag)!);
}

/** Vraagt recepten voor de gegeven dagen aan de server-functie. */
export async function vraagAi(
  verzoek: PlanVerzoek,
  instelling: AiInstelling,
  dagen: DagCode[],
  vermijd?: string[]
): Promise<PlanDag[]> {
  if (!instelling.url) throw new AiFout('Geen AI ingesteld');
  const doeFetch = instelling.fetch ?? fetch;
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), instelling.timeoutMs ?? 45000);
  try {
    const token = (await instelling.token?.()) ?? instelling.sleutel;
    const antwoord = await doeFetch(instelling.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(instelling.apikey ? { apikey: instelling.apikey } : {}),
      },
      body: JSON.stringify(bouwAiVerzoek(verzoek, dagen, vermijd)),
      signal: controle.signal,
    });
    if (!antwoord.ok) throw new AiFout(`Server antwoordde ${antwoord.status}`, antwoord.status);
    return leesAiAntwoord(await antwoord.json(), verzoek, dagen);
  } catch (e) {
    throw e instanceof AiFout ? e : new AiFout(e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Maakt een weekplan: met AI als die ingesteld is, anders (of bij een fout) met de lokale planner.
 * `terugval` staat op true als de AI ingesteld was maar faalde.
 */
export async function planWeek(verzoek: PlanVerzoek, instelling: AiInstelling = {}): Promise<Weekplan> {
  if (!instelling.url) return planLokaal(verzoek);
  const w = leesOpdracht(verzoek.opdracht);
  const dagen = dagenVoorPlan(w.aantalDagen ?? STANDAARD_AANTAL_DAGEN);
  try {
    const planDagen = await vraagAi(verzoek, instelling, dagen);
    return {
      dagen: verzoek.frigo?.length ? markeerUitFrigo(planDagen, verzoek.frigo) : planDagen,
      opdracht: verzoek.opdracht,
      kooktijden: verzoek.kooktijden,
      stijlen: verzoek.stijlen,
      taal: verzoek.taal,
      porties: berekenPorties(verzoek.profiel),
      bron: 'ai',
      gemaaktOp: new Date().toISOString(),
    };
  } catch (e) {
    return { ...planLokaal(verzoek), ...terugvalVelden(e) };
  }
}
