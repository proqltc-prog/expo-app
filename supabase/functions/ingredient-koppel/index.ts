// WEEK-254: onbekende ingrediënten koppelen aan een bestaand ingrediënt of automatisch toevoegen.
// 1. Zonder AI: de naam letterlijk zoeken in alle vertalingen (zonder hoofdletters en accenten).
// 2. Gemini krijgt de bestaande lijst (code + namen) en zegt per naam: bestaand (code), nieuw (voorstel) of geen ingrediënt.
// 3. Deze functie controleert opnieuw (code of een van de namen al gekend → bestaand; vaste lijsten voor categorie,
//    eenheid, soort en allergenen) en voegt een nieuw ingrediënt toe via public.famenu_voeg_ingredient_toe
//    (gemarkeerd als automatisch en nog niet nagekeken; hoogstens 50 per dag).
// Beveiliging: enkel aangemelde gebruikers (ook anoniem), hoogstens 10 namen per vraag, limiet per gebruiker per dag
// (public.famenu_ingredient_koppel_tel: 20 per gebruiker, 300 samen). Geheimen: GEMINI_API_KEY (verplicht), GEMINI_MODEL.
const TIJDSLIMIET_MS = 25_000;
const STANDAARD_MODEL = 'gemini-3.5-flash-lite';
const RESERVE_MODEL = 'gemini-3.8-flash';
const MAX_NAMEN = 10;
const TALEN = ['nl', 'fr', 'de', 'en'] as const;
const CATEGORIEEN = ['condiment', 'ei', 'eiwit', 'fruit', 'graan', 'groente', 'kruid', 'noten', 'overig', 'peulvrucht', 'specerij', 'vet', 'vis', 'vlees', 'zoet', 'zuivel'];
const EENHEDEN = ['g', 'ml', 'stuk', 'teentje'];
const SOORTEN = ['vegetarisch', 'vis', 'vlees'];
const ALLERGENEN = ['ei', 'gluten', 'melk', 'noten', 'schaaldieren', 'soja', 'sulfiet', 'vis', 'weekdieren', 'pinda', 'selderij', 'mosterd', 'sesam', 'lupine'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const antwoord = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Info = [string, string, [string, string, string, string]];
type Bestaand = { code: string; categorie: string; eenheid: string; namen: Record<string, string> };
type Resultaat = { naam: string; status: 'bestaand' | 'nieuw' | 'geen' | 'druk' | 'limiet'; code?: string; info?: Info };

const norm = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9ß ]+/g, ' ').replace(/\s+/g, ' ').trim();
const alsInfo = (b: Bestaand): Info => [b.categorie, b.eenheid, [b.namen.nl ?? b.code, b.namen.fr ?? b.code, b.namen.de ?? b.code, b.namen.en ?? b.code]];

const OPDRACHT = (lijst: string, namen: string[], taal: string) => `Je beheert de ingrediëntenlijst van een kookapp. Bestaande ingrediënten (code | nl | en):
${lijst}

Nieuwe namen uit een recept (taal: ${taal}):
${namen.map((n) => `- ${n}`).join('\n')}

Geef voor elke naam één resultaat, in dezelfde volgorde:
- oordeel "bestaand" als het hetzelfde product is als een bestaand ingrediënt (ook een andere taal, meervoud, synoniem of
  een gewone variant, bv. "sojabonen" voor "edamame" als het hetzelfde product is). Zet dan code = de bestaande code.
- oordeel "nieuw" als het een echt ander, gewoon te koop zijnd voedingsmiddel is. Stel dan voor:
  code (kleine letters, underscores, Nederlandstalig, bv. "yuzu" of "verse_koriander"), categorie (${CATEGORIEEN.join(', ')}),
  eenheid (g voor vaste producten, ml voor vloeistoffen, stuk voor producten die je per stuk koopt zoals fruit, teentje enkel voor knoflook),
  soort (vlees, vis, vegetarisch), allergenen (enkel uit: ${ALLERGENEN.join(', ')}; leeg als er geen zijn),
  kcal, eiwit en vezels per 100 g (schatting), en de naam in het Nederlands (Vlaams), Frans, Duits en Engels (enkelvoud, kleine letters behalve Duitse zelfstandige naamwoorden).
- oordeel "geen" als het geen ingrediënt is (bv. "naar smaak", "liefde", een keukengerei of een zin).`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    resultaten: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          naam: { type: 'STRING' },
          oordeel: { type: 'STRING', enum: ['bestaand', 'nieuw', 'geen'] },
          code: { type: 'STRING', nullable: true },
          categorie: { type: 'STRING', nullable: true },
          eenheid: { type: 'STRING', nullable: true },
          soort: { type: 'STRING', nullable: true },
          allergenen: { type: 'ARRAY', items: { type: 'STRING' } },
          kcal: { type: 'NUMBER', nullable: true },
          eiwit: { type: 'NUMBER', nullable: true },
          vezels: { type: 'NUMBER', nullable: true },
          nl: { type: 'STRING', nullable: true },
          fr: { type: 'STRING', nullable: true },
          de: { type: 'STRING', nullable: true },
          en: { type: 'STRING', nullable: true },
        },
        required: ['naam', 'oordeel', 'code', 'categorie', 'eenheid', 'soort', 'allergenen', 'kcal', 'eiwit', 'vezels', 'nl', 'fr', 'de', 'en'],
      },
    },
  },
  required: ['resultaten'],
};

const URL_ = () => Deno.env.get('SUPABASE_URL') ?? '';

async function binnenLimiet(authorization: string): Promise<boolean> {
  const res = await fetch(`${URL_()}/rest/v1/rpc/famenu_ingredient_koppel_tel`, {
    method: 'POST',
    headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '', Authorization: authorization, 'Content-Type': 'application/json' },
    body: '{}',
  });
  return res.ok && (await res.json()) === true;
}

async function bestaandeLijst(): Promise<Bestaand[]> {
  const sleutel = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const res = await fetch(`${URL_()}/rest/v1/ingredienten?select=code,categorie,eenheid,ingredient_vertalingen(taal,naam)&order=code`, {
    headers: { apikey: sleutel, Authorization: `Bearer ${sleutel}` },
  });
  if (!res.ok) throw new Error(`lijst ${res.status}`);
  const rijen = (await res.json()) as { code: string; categorie: string; eenheid: string; ingredient_vertalingen: { taal: string; naam: string }[] }[];
  return rijen.map((r) => ({ code: r.code, categorie: r.categorie, eenheid: r.eenheid, namen: Object.fromEntries(r.ingredient_vertalingen.map((v) => [v.taal, v.naam])) }));
}

/** De code van het (nieuwe of bestaande) ingrediënt, 'limiet' (50 nieuwe per dag bereikt) of 'fout' (databank). */
async function voegToe(v: Record<string, unknown>, code: string): Promise<string | 'limiet' | 'fout'> {
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const res = await fetch(`${URL_()}/rest/v1/rpc/famenu_voeg_ingredient_toe`, {
    method: 'POST',
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_code: code,
      p_categorie: v.categorie,
      p_eenheid: v.eenheid,
      p_soort: v.soort,
      p_allergenen: v.allergenen,
      p_kcal: v.kcal,
      p_eiwit: v.eiwit,
      p_vezels: v.vezels,
      p_namen: Object.fromEntries(TALEN.map((t) => [t, v[t]])),
    }),
  });
  if (!res.ok) {
    console.error(`toevoegen ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return 'fout';
  }
  const code_ = (await res.json()) as string | null;
  return code_ ?? 'limiet';
}

async function vraagGemini(sleutel: string, model: string, tekst: string): Promise<Response | undefined> {
  const stop = new AbortController();
  const klok = setTimeout(() => stop.abort(), TIJDSLIMIET_MS);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: stop.signal,
      headers: { 'x-goog-api-key': sleutel, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: tekst }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
    });
    if (!r.ok) console.error(`Gemini ${model} ${r.status}: ${(await r.clone().text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)}`);
    return r;
  } catch {
    return undefined;
  } finally {
    clearTimeout(klok);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return antwoord({ fout: 'methode' }, 405);
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return antwoord({ fout: 'aanmelden' }, 401);
  const sleutel = Deno.env.get('GEMINI_API_KEY');
  if (!sleutel) return antwoord({ fout: 'niet_ingesteld' }, 503);

  let namen: string[] = [];
  let taal = 'nl';
  try {
    const body = await req.json();
    namen = (Array.isArray(body?.namen) ? body.namen : [])
      .filter((n: unknown): n is string => typeof n === 'string')
      .map((n: string) => n.replace(/\s+/g, ' ').trim().slice(0, 60))
      .filter((n: string) => /^\p{L}[\p{L} '’-]{1,59}$/u.test(n));
    namen = [...new Set(namen)].slice(0, MAX_NAMEN);
    if (typeof body?.taal === 'string' && (TALEN as readonly string[]).includes(body.taal)) taal = body.taal;
  } catch {
    return antwoord({ fout: 'geen_namen' }, 400);
  }
  if (!namen.length) return antwoord({ fout: 'geen_namen' }, 400);
  if (!(await binnenLimiet(authorization))) return antwoord({ fout: 'limiet' }, 429);

  let lijst: Bestaand[];
  try {
    lijst = await bestaandeLijst();
  } catch {
    return antwoord({ fout: 'niet_bereikbaar' }, 502);
  }
  const perCode = new Map(lijst.map((b) => [b.code, b]));
  const perNaam = new Map<string, Bestaand>();
  for (const b of lijst) for (const n of Object.values(b.namen)) perNaam.set(norm(n), b);

  const resultaten: Resultaat[] = [];
  const voorAi: string[] = [];
  // 1. Zonder AI: letterlijk dezelfde naam in een van de talen.
  for (const naam of namen) {
    const b = perNaam.get(norm(naam));
    if (b) resultaten.push({ naam, status: 'bestaand', code: b.code, info: alsInfo(b) });
    else voorAi.push(naam);
  }
  if (!voorAi.length) return antwoord({ resultaten });

  // 2. Gemini, met één tweede poging op een ander model bij overbelasting.
  const tekst = OPDRACHT(lijst.map((b) => `${b.code} | ${b.namen.nl ?? ''} | ${b.namen.en ?? ''}`).join('\n'), voorAi, taal);
  const druk = (r: Response | undefined) => !r || r.status === 429 || r.status === 503;
  const model = Deno.env.get('GEMINI_MODEL') || STANDAARD_MODEL;
  let res = await vraagGemini(sleutel, model, tekst);
  if (druk(res) && model !== RESERVE_MODEL) res = await vraagGemini(sleutel, RESERVE_MODEL, tekst);
  if (!res || druk(res) || !res.ok) {
    for (const naam of voorAi) resultaten.push({ naam, status: 'druk' });
    return antwoord({ resultaten });
  }
  let voorstellen: Record<string, unknown>[] = [];
  try {
    const data = await res.json();
    const t = data?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => typeof p?.text === 'string')?.text;
    voorstellen = JSON.parse(t)?.resultaten ?? [];
  } catch {
    voorstellen = [];
  }

  // 3. Elke naam opnieuw nakijken; nieuwe ingrediënten toevoegen.
  for (const [i, naam] of voorAi.entries()) {
    const v = voorstellen.find((x) => typeof x?.naam === 'string' && norm(x.naam as string) === norm(naam)) ?? voorstellen[i];
    if (!v || v.oordeel === 'geen') {
      resultaten.push({ naam, status: 'geen' });
      continue;
    }
    const code = typeof v.code === 'string' ? v.code.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) : '';
    const viaCode = perCode.get(code);
    const viaNaam = TALEN.map((t) => (typeof v[t] === 'string' ? perNaam.get(norm(v[t] as string)) : undefined)).find(Boolean);
    const gekend = (v.oordeel === 'bestaand' ? viaCode : undefined) ?? viaNaam ?? viaCode;
    if (gekend) {
      resultaten.push({ naam, status: 'bestaand', code: gekend.code, info: alsInfo(gekend) });
      continue;
    }
    if (v.oordeel !== 'nieuw') {
      resultaten.push({ naam, status: 'geen' });
      continue;
    }
    const geldig =
      /^[a-z][a-z0-9_]{1,40}$/.test(code) &&
      CATEGORIEEN.includes(v.categorie as string) &&
      EENHEDEN.includes(v.eenheid as string) &&
      (v.soort === null || SOORTEN.includes(v.soort as string)) &&
      TALEN.every((t) => typeof v[t] === 'string' && (v[t] as string).trim().length > 0 && (v[t] as string).length <= 80);
    if (!geldig) {
      resultaten.push({ naam, status: 'geen' });
      continue;
    }
    const allergenen = (Array.isArray(v.allergenen) ? v.allergenen : []).filter((a): a is string => ALLERGENEN.includes(a as string));
    const getal = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1000 ? Math.round(x * 10) / 10 : null);
    const toegevoegd = await voegToe({ ...v, allergenen, kcal: getal(v.kcal), eiwit: getal(v.eiwit), vezels: getal(v.vezels) }, code);
    // WEEK-258: een fout in de databank is tijdelijk ("druk"), geen limiet van de gebruiker.
    if (toegevoegd === 'limiet' || toegevoegd === 'fout') {
      resultaten.push({ naam, status: toegevoegd === 'limiet' ? 'limiet' : 'druk' });
      continue;
    }
    const info: Info = [v.categorie as string, v.eenheid as string, [v.nl as string, v.fr as string, v.de as string, v.en as string].map((x) => x.trim()) as Info[2]];
    const nieuw = toegevoegd === code;
    const b = perCode.get(toegevoegd);
    resultaten.push({ naam, status: nieuw ? 'nieuw' : 'bestaand', code: toegevoegd, info: nieuw || !b ? info : alsInfo(b) });
    if (nieuw) {
      const nb: Bestaand = { code, categorie: info[0], eenheid: info[1], namen: Object.fromEntries(TALEN.map((t, j) => [t, info[2][j]])) };
      perCode.set(code, nb);
      for (const n of info[2]) perNaam.set(norm(n), nb);
    }
  }
  return antwoord({ resultaten });
});
