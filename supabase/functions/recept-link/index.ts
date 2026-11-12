// WEEK-247: haalt een receptpagina op en geeft enkel de gestructureerde receptgegevens (JSON-LD-blokken) terug.
// De app leest die zelf (src/lib/receptLink.ts). Een webpagina mag andere sites niet rechtstreeks lezen, daarom deze functie.
// Beveiliging: enkel aangemelde gebruikers (ook anoniem), enkel http(s) naar gewone domeinnamen (geen IP-adressen of
// interne namen, ook niet na een doorverwijzing), tijdslimiet, maximale grootte en een limiet per gebruiker per dag
// (public.famenu_recept_link_tel). De pagina zelf wordt niet bewaard.
const MAX_BYTES = 2_000_000;
const MAX_BLOKKEN_BYTES = 400_000;
const TIJDSLIMIET_MS = 8000;
const MAX_DOORVERWIJZINGEN = 3;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const antwoord = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** Dezelfde regels als isVeiligeLink in src/lib/receptLink.ts. */
function veilig(url: URL): boolean {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '80' && url.port !== '443') return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return false;
  if (/^[\d.]+$/.test(host) || host.startsWith('[')) return false;
  return true;
}

/** Dezelfde regel als ldJsonBlokken in src/lib/receptLink.ts. */
function ldJsonBlokken(html: string): string[] {
  const uit: string[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) uit.push(m[1]);
  return uit;
}

async function leesBegrensd(res: Response): Promise<string | undefined> {
  const lezer = res.body?.getReader();
  if (!lezer) return '';
  const delen: Uint8Array[] = [];
  let totaal = 0;
  for (;;) {
    const { done, value } = await lezer.read();
    if (done) break;
    totaal += value.byteLength;
    if (totaal > MAX_BYTES) {
      await lezer.cancel();
      return undefined;
    }
    delen.push(value);
  }
  const alles = new Uint8Array(totaal);
  let i = 0;
  for (const d of delen) {
    alles.set(d, i);
    i += d.byteLength;
  }
  return new TextDecoder('utf-8').decode(alles);
}

/** Telt de vraag mee voor de gebruiker (met diens eigen sessie); false als de daglimiet bereikt is. */
async function binnenLimiet(authorization: string): Promise<boolean> {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/famenu_recept_link_tel`, {
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

  let url: URL;
  try {
    const body = await req.json();
    url = new URL(String(body?.url ?? ''));
  } catch {
    return antwoord({ fout: 'ongeldige_link' }, 400);
  }
  if (!veilig(url)) return antwoord({ fout: 'ongeldige_link' }, 400);
  if (!(await binnenLimiet(authorization))) return antwoord({ fout: 'limiet' }, 429);

  const stop = new AbortController();
  const klok = setTimeout(() => stop.abort(), TIJDSLIMIET_MS);
  try {
    let res: Response | undefined;
    for (let stap = 0; stap <= MAX_DOORVERWIJZINGEN; stap++) {
      res = await fetch(url.href, {
        redirect: 'manual',
        signal: stop.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Famenu-receptlezer/1.0)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'nl-BE,nl;q=0.9,fr;q=0.8,de;q=0.7,en;q=0.6',
        },
      });
      const naar = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (!naar) break;
      await res.body?.cancel();
      const volgende = new URL(naar, url);
      if (!veilig(volgende)) return antwoord({ fout: 'ongeldige_link' }, 400);
      url = volgende;
      res = undefined;
    }
    if (!res) return antwoord({ fout: 'niet_bereikbaar' }, 502);
    if (!res.ok) {
      await res.body?.cancel();
      return antwoord({ fout: 'niet_bereikbaar', status: res.status }, 502);
    }
    if (!(res.headers.get('content-type') ?? '').includes('html')) {
      await res.body?.cancel();
      return antwoord({ fout: 'geen_recept' }, 422);
    }
    const html = await leesBegrensd(res);
    if (html === undefined) return antwoord({ fout: 'te_groot' }, 413);
    const taal = html.match(/<html\b[^>]*\blang\s*=\s*["']?([a-zA-Z-]+)/i)?.[1];
    const blokken: string[] = [];
    let grootte = 0;
    for (const b of ldJsonBlokken(html)) {
      grootte += b.length;
      if (grootte > MAX_BLOKKEN_BYTES) break;
      blokken.push(b);
    }
    return antwoord({ blokken, taal, url: url.href });
  } catch {
    return antwoord({ fout: 'niet_bereikbaar' }, 502);
  } finally {
    clearTimeout(klok);
  }
});
