// Supabase Edge Function (Deno): vraagt een weekplan aan Claude en geeft het terug als JSON.
// De API-sleutel blijft op de server; de app kent enkel het adres van deze functie.
//
// Enkel aangemelde toestellen (anonieme sessie van de app) mogen de functie gebruiken, met een limiet
// van 5 aanvragen per 24 uur per toestel, 30 voor een betalend gezin (WEEK-31, ai_toegestaan in de database).
//
// Uitrollen:
//   supabase functions deploy plan-week
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      (verplicht)
//   supabase secrets set PLANNER_MODEL=claude-sonnet-5-5   (optioneel)
//
// Zie README.md › "AI-planner".
import { createClient } from 'npm:@supabase/supabase-js@2';
import { gebruikersBericht, systeemPrompt, WEEKPLAN_SCHEMA, type AiVerzoek } from '../../../src/lib/planner/aiPrompt.ts';

const MODEL = Deno.env.get('PLANNER_MODEL') ?? 'claude-sonnet-5-5';
const TALEN = ['nl', 'fr', 'de', 'en', 'es', 'pt'];
const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** Basiscontrole van het verzoek, zodat de functie niet voor willekeurige tekst misbruikt kan worden. */
function geldigVerzoek(v: unknown): v is AiVerzoek {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    TALEN.includes(r.taal as string) &&
    typeof r.profiel === 'string' && r.profiel.length <= 2000 &&
    typeof r.porties === 'number' && r.porties > 0 && r.porties <= 30 &&
    typeof r.opdracht === 'string' && r.opdracht.length <= 1000 &&
    Array.isArray(r.kooktijden) && Array.isArray(r.stijlen) &&
    Array.isArray(r.dagen) && r.dagen.length >= 1 && r.dagen.length <= 7 &&
    r.dagen.every((d) => DAGEN.includes(d as string)) &&
    (r.vermijd === undefined || (Array.isArray(r.vermijd) && r.vermijd.length <= 14)) &&
    (r.frigo === undefined || (Array.isArray(r.frigo) && r.frigo.length <= 25 && r.frigo.every((f) => typeof f === 'string' && f.length <= 100)))
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ fout: 'Enkel POST' }, 405);

  const sleutel = Deno.env.get('ANTHROPIC_API_KEY');
  if (!sleutel) return json({ fout: 'ANTHROPIC_API_KEY ontbreekt op de server' }, 500);

  // Enkel aangemelde toestellen, met een limiet per toestel (WEEK-31).
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: gebruiker } = await supabase.auth.getUser();
  if (!gebruiker?.user) return json({ fout: 'Niet aangemeld' }, 401);

  let verzoek: unknown;
  try {
    verzoek = await req.json();
  } catch {
    return json({ fout: 'Ongeldige JSON' }, 400);
  }
  if (!geldigVerzoek(verzoek)) return json({ fout: 'Ongeldig verzoek' }, 400);

  // Pas tellen voor de limiet als het verzoek geldig is.
  const { data: toegestaan, error: limietFout } = await supabase.rpc('ai_toegestaan');
  if (limietFout) return json({ fout: 'Limiet kon niet gecontroleerd worden' }, 500);
  if (toegestaan !== true) return json({ fout: 'Daglimiet AI bereikt' }, 429);

  const antwoord = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': sleutel,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: systeemPrompt(),
      tools: [{ name: 'weekplan', description: 'Return the weekly dinner plan.', input_schema: WEEKPLAN_SCHEMA }],
      tool_choice: { type: 'tool', name: 'weekplan' },
      messages: [{ role: 'user', content: gebruikersBericht(verzoek) }],
    }),
  });

  if (!antwoord.ok) {
    console.error('Claude API', antwoord.status, await antwoord.text());
    return json({ fout: 'AI niet beschikbaar' }, 502);
  }

  const data = await antwoord.json();
  const blok = (data.content ?? []).find((b: { type: string; name?: string }) => b.type === 'tool_use' && b.name === 'weekplan');
  if (!blok?.input) return json({ fout: 'Geen weekplan in het antwoord' }, 502);
  return json(blok.input);
});
