// WEEK-251: leest een recept van een foto met Google Gemini en geeft de ruwe receptgegevens terug
// (titel, personen, kooktijd, ingrediëntregels, stappen, taal). De app verwerkt die zelf (src/lib/receptFoto.ts en
// verwerkRecept in src/lib/receptLink.ts), net als bij een link.
// Beveiliging: enkel aangemelde gebruikers (ook anoniem), enkel JPEG/PNG/WebP tot ~2 MB, een tijdslimiet en een
// limiet per gebruiker per dag (public.famenu_recept_foto_tel). De foto wordt nergens bewaard.
// Instellen (eigenaar, Supabase → Edge Functions → Secrets): GEMINI_API_KEY (verplicht), GEMINI_MODEL (optioneel).
const MAX_BASE64 = 2_800_000;
// Per poging; met de tweede poging blijft het geheel ruim onder de grens van een Supabase-functie.
const TIJDSLIMIET_MS = 25_000;
// gemini-2.5-flash is niet meer beschikbaar voor nieuwe projecten; Google raadt 3.5 Flash-Lite aan (snel en zuinig, genoeg om tekst te lezen).
const STANDAARD_MODEL = 'gemini-3.5-flash-lite';
// Tweede poging als het eerste model overbelast is (WEEK-251): het sterkere Flash-model, ook aangeraden door Google.
const RESERVE_MODEL = 'gemini-3.8-flash';
const MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const antwoord = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const OPDRACHT = `Je krijgt een foto van een recept (kookboek, receptkaart, tijdschrift of scherm).
Neem het recept letterlijk over, in de taal van de foto. Verzin niets en vertaal niets.
- naam: de titel van het recept.
- personen: voor hoeveel personen, als dat vermeld staat.
- minuten: de totale bereidingstijd in minuten, als die vermeld staat.
- taal: de taalcode van de tekst (nl, fr, de, en of een andere).
- ingredienten: één regel per ingrediënt, precies zoals geschreven, met hoeveelheid en eenheid (bv. "200 g bloem").
- stappen: de bereidingsstappen in volgorde, zonder nummering.
Staat er geen recept op de foto, of is het onleesbaar, zet dan gevonden op false.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    gevonden: { type: 'BOOLEAN' },
    naam: { type: 'STRING' },
    personen: { type: 'INTEGER', nullable: true },
    minuten: { type: 'INTEGER', nullable: true },
    taal: { type: 'STRING' },
    ingredienten: { type: 'ARRAY', items: { type: 'STRING' } },
    stappen: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  // Alles verplicht (leeg of null als het er niet staat): anders laat een licht model de lijsten soms weg.
  required: ['gevonden', 'naam', 'personen', 'minuten', 'taal', 'ingredienten', 'stappen'],
  propertyOrdering: ['gevonden', 'naam', 'personen', 'minuten', 'taal', 'ingredienten', 'stappen'],
};

/** Telt de foto mee voor de gebruiker (met diens eigen sessie); false als de daglimiet bereikt is. */
async function binnenLimiet(authorization: string): Promise<boolean> {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/famenu_recept_foto_tel`, {
    method: 'POST',
    headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '', Authorization: authorization, 'Content-Type': 'application/json' },
    body: '{}',
  });
  return res.ok && (await res.json()) === true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return antwoord({ fout: 'methode' }, 405);
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return antwoord({ fout: 'aanmelden' }, 401);

  const sleutel = Deno.env.get('GEMINI_API_KEY');
  // Nog geen sleutel: melden zonder de limiet van de gebruiker te verbruiken.
  if (!sleutel) return antwoord({ fout: 'niet_ingesteld' }, 503);

  let beeld = '';
  let mime = '';
  try {
    const body = await req.json();
    beeld = typeof body?.beeld === 'string' ? body.beeld : '';
    mime = typeof body?.mime === 'string' ? body.mime : '';
  } catch {
    return antwoord({ fout: 'geen_foto' }, 400);
  }
  if (!beeld || !MIME.has(mime) || !/^[A-Za-z0-9+/=]+$/.test(beeld)) return antwoord({ fout: 'geen_foto' }, 400);
  if (beeld.length > MAX_BASE64) return antwoord({ fout: 'te_groot' }, 413);

  if (!(await binnenLimiet(authorization))) return antwoord({ fout: 'limiet' }, 429);

  const model = Deno.env.get('GEMINI_MODEL') || STANDAARD_MODEL;
  const vraag = async (m: string): Promise<Response> => {
    const stop = new AbortController();
    const klok = setTimeout(() => stop.abort(), TIJDSLIMIET_MS);
    try {
      return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
        method: 'POST',
        signal: stop.signal,
        headers: { 'x-goog-api-key': sleutel, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mime, data: beeld } }, { text: OPDRACHT }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
      });
    } finally {
      clearTimeout(klok);
    }
  };
  // Geen antwoord binnen de tijd (undefined), 429 (gratis limiet van Google) of 503 (overbelast): "druk".
  const probeer = async (m: string) => {
    const r = await vraag(m).catch(() => undefined);
    // Bij een fout de reden van Google loggen (enkel hun foutmelding, nooit de foto of de sleutel).
    if (r && !r.ok) console.error(`Gemini ${m} ${r.status}: ${(await r.clone().text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)}`);
    return r;
  };
  const druk = (r: Response | undefined) => !r || r.status === 429 || r.status === 503;
  try {
    let res = await probeer(model);
    // Eén tweede poging met een ander model, enkel als het eerste overbelast is of te traag; daarna "probeer later".
    if (druk(res) && model !== RESERVE_MODEL) {
      console.error(`Gemini ${model} antwoordt ${res?.status ?? 'niet op tijd'}; tweede poging met ${RESERVE_MODEL}`);
      res = await probeer(RESERVE_MODEL);
    }
    if (!res || druk(res)) return antwoord({ fout: 'druk' }, 503);
    if (!res.ok) {
      // Enkel de status loggen, nooit de foto of de sleutel.
      console.error(`Gemini antwoordt ${res.status}`);
      return antwoord({ fout: res.status === 400 || res.status === 403 || res.status === 404 ? 'niet_ingesteld' : 'niet_bereikbaar' }, 502);
    }
    const data = await res.json();
    const tekst = data?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => typeof p?.text === 'string')?.text;
    if (typeof tekst !== 'string') return antwoord({ fout: 'geen_recept' }, 422);
    let recept: unknown;
    try {
      recept = JSON.parse(tekst);
    } catch {
      return antwoord({ fout: 'geen_recept' }, 422);
    }
    return antwoord({ recept });
  } catch {
    return antwoord({ fout: 'niet_bereikbaar' }, 504);
  }
});
