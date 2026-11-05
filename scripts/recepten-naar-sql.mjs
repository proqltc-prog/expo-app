#!/usr/bin/env node
// Receptenbatch naar SQL (WEEK-213).
// Leest de gegevensbestanden in supabase/data/, controleert elk recept en rekent de hoeveelheden om naar
// 1 volwassene (porties = 1, zie WEEK-212). Schrijft idempotente SQL naar stdout: een recept met dezelfde bron
// wordt overgeslagen, bestaande ingrediënten blijven ongewijzigd.
// Gebruik: node scripts/recepten-naar-sql.mjs > batch.sql   (controle zonder SQL: --controle)
import { INGREDIENTEN_DB } from '../src/data/ingredienten.gegenereerd.ts';
import { NIEUWE_INGREDIENTEN } from '../supabase/data/ingredienten-week-213.mjs';
import { VIS } from '../supabase/data/recepten-week-213-vis.mjs';
import { VEGA } from '../supabase/data/recepten-week-213-vega.mjs';
import { VLEES } from '../supabase/data/recepten-week-213-vlees.mjs';

export const RECEPTEN = [...VIS, ...VEGA, ...VLEES];

const TALEN = ['nl', 'fr', 'de', 'en'];
const STIJLEN = ['klassiek', 'italiaans', 'aziatisch', 'mexicaans', 'mediterraan', 'thais', 'japans', 'koreaans', 'frans', 'belgisch', 'indiaas', 'chinees', 'hartig', 'zoet'];
const SOORTEN = ['vegetarisch', 'vis', 'vlees'];
const BASIS = [null, 'pasta', 'rijst', 'aardappel', 'brood', 'wrap', 'noedels', 'granen'];
const WIJZEN = ['oven', 'pan', 'wok', 'slowcooker', 'rauw', 'geen'];
const MOEILIJK = ['makkelijk', 'gemiddeld', 'uitdagend'];
const SEIZOENEN = ['lente', 'zomer', 'herfst', 'winter'];
const MAX_MINUTEN = 60;

/** Alle gekende ingrediënten: code -> { eenheid, soort? }. */
export function ingredientenLijst() {
  const lijst = new Map(Object.entries(INGREDIENTEN_DB).map(([code, [, eenheid]]) => [code, { eenheid }]));
  for (const [code, eenheid, , soort] of NIEUWE_INGREDIENTEN) lijst.set(code, { eenheid, soort });
  return lijst;
}

/** Hoeveelheid voor 1 volwassene: g en ml op 1 decimaal, stuks en teentjes op 2 decimalen. */
export function perVolwassene(totaal, personen, eenheid) {
  const decimalen = eenheid === 'g' || eenheid === 'ml' ? 1 : 2;
  const f = 10 ** decimalen;
  return Math.max(1 / f, Math.round((totaal / personen) * f) / f);
}

/** Geeft een lijst fouten voor één recept (leeg = in orde). */
export function controleer(r, ingredienten) {
  const fouten = [];
  const naam = r.titel?.nl ?? r.bron;
  const fout = (tekst) => fouten.push(`${naam}: ${tekst}`);
  if (!/^https:\/\//.test(r.bron ?? '')) fout('geen geldige bron-URL');
  if (!(r.personen > 0)) fout('aantal personen ontbreekt');
  if (!(r.minuten > 0 && r.minuten <= MAX_MINUTEN)) fout(`kooktijd ${r.minuten} min (max ${MAX_MINUTEN})`);
  if (!STIJLEN.includes(r.stijl)) fout(`onbekende stijl ${r.stijl}`);
  if (!SOORTEN.includes(r.soort)) fout(`onbekende soort ${r.soort}`);
  if (!BASIS.includes(r.basis)) fout(`onbekende basis ${r.basis}`);
  if (!WIJZEN.includes(r.wijze)) fout(`onbekende bereidingswijze ${r.wijze}`);
  if (!MOEILIJK.includes(r.moeilijkheid)) fout(`onbekende moeilijkheid ${r.moeilijkheid}`);
  if (!r.seizoenen.every((s) => SEIZOENEN.includes(s))) fout('onbekend seizoen');
  for (const taal of TALEN) {
    if (!r.titel?.[taal]?.trim()) fout(`titel ontbreekt (${taal})`);
    if (!Array.isArray(r.stappen?.[taal]) || r.stappen[taal].length < 2) fout(`stappen ontbreken (${taal})`);
  }
  const aantallen = new Set(TALEN.map((t) => r.stappen?.[t]?.length));
  if (aantallen.size > 1) fout('niet in elke taal evenveel stappen');
  if (r.ing.length < 3) fout('minder dan 3 ingrediënten');
  const codes = new Set();
  let heeftVis = false;
  let heeftVlees = false;
  for (const [code, hoeveelheid, eenheid] of r.ing) {
    const ing = ingredienten.get(code);
    if (!ing) fout(`onbekend ingrediënt ${code}`);
    else if (ing.eenheid !== eenheid) fout(`${code}: eenheid ${eenheid}, verwacht ${ing.eenheid}`);
    if (!(hoeveelheid > 0)) fout(`${code}: hoeveelheid ${hoeveelheid}`);
    if (codes.has(code)) fout(`${code} staat er twee keer in`);
    codes.add(code);
    const soort = ing?.soort ?? SOORT_VAN_CATEGORIE[INGREDIENTEN_DB[code]?.[0]];
    if (soort === 'vis') heeftVis = true;
    if (soort === 'vlees') heeftVlees = true;
  }
  if (r.soort === 'vegetarisch' && (heeftVis || heeftVlees)) fout('vegetarisch recept met vis of vlees');
  if (r.soort === 'vis' && heeftVlees && !codes.has('spek') && !codes.has('hesp')) fout('visrecept met vlees');
  return fouten;
}

const SOORT_VAN_CATEGORIE = { vis: 'vis', vlees: 'vlees' };

const sqlTekst = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sqlLijst = (a) => `array[${a.map(sqlTekst).join(', ')}]::text[]`;

function ingredientenSql() {
  const regels = ['-- Nieuwe ingrediënten (bestaande codes blijven ongewijzigd).'];
  for (const [code, eenheid, categorie, soort, allergenen, namen] of NIEUWE_INGREDIENTEN) {
    regels.push(
      `insert into public.ingredienten (code, eenheid, categorie, soort, allergenen) values (${sqlTekst(code)}, ${sqlTekst(eenheid)}, ${sqlTekst(categorie)}, ${sqlTekst(soort)}, ${allergenen.length ? sqlLijst(allergenen) : "'{}'::text[]"}) on conflict (code) do nothing;`,
    );
    for (const taal of TALEN) {
      regels.push(
        `insert into public.ingredient_vertalingen (ingredient_id, taal, naam) select id, ${sqlTekst(taal)}, ${sqlTekst(namen[taal])} from public.ingredienten where code = ${sqlTekst(code)} on conflict (ingredient_id, taal) do nothing;`,
      );
    }
  }
  return regels.join('\n');
}

function receptSql(r) {
  const ing = r.ing.map(([code, totaal, eenheid]) => [code, perVolwassene(totaal, r.personen, eenheid), eenheid]);
  const regels = [
    `do $$`,
    `declare rid bigint;`,
    `begin`,
    `  if exists (select 1 from public.recepten where bron = ${sqlTekst(r.bron)}) then return; end if;`,
    `  insert into public.recepten (porties, kooktijd_min, moment, stijl, stijlen, soort, basis, bereidingswijze, moeilijkheid, tags, bron, status, seizoenen)`,
    `  values (1, ${r.minuten}, 'avond', ${sqlTekst(r.stijl)}, ${sqlLijst([r.stijl])}, ${sqlTekst(r.soort)}, ${r.basis ? sqlTekst(r.basis) : 'null'}, ${sqlTekst(r.wijze)}, ${sqlTekst(r.moeilijkheid)}, ${sqlLijst(r.tags)}, ${sqlTekst(r.bron)}, 'goedgekeurd', ${r.seizoenen.length ? sqlLijst(r.seizoenen) : "'{}'::text[]"})`,
    `  returning id into rid;`,
    `  insert into public.recept_vertalingen (recept_id, taal, titel) values ${TALEN.map((t) => `(rid, ${sqlTekst(t)}, ${sqlTekst(r.titel[t])})`).join(', ')};`,
    `  insert into public.recept_ingredienten (recept_id, ingredient_id, hoeveelheid, eenheid)`,
    `  select rid, i.id, v.h, v.e from (values ${ing.map(([c, h, e]) => `(${sqlTekst(c)}, ${h}::numeric, ${sqlTekst(e)})`).join(', ')}) as v(c, h, e) join public.ingredienten i on i.code = v.c;`,
    `  insert into public.recept_bereidingen (recept_id, taal, stappen) values ${TALEN.map((t) => `(rid, ${sqlTekst(t)}, ${sqlTekst(JSON.stringify(r.stappen[t]))}::jsonb)`).join(', ')};`,
    `  insert into public.bereidingsstappen (recept_id, volgnummer) select rid, g from generate_series(1, ${r.stappen.nl.length}) g;`,
    `  insert into public.bereidingsstap_vertalingen (recept_id, volgnummer, taal, tekst) values ${TALEN.flatMap((t) => r.stappen[t].map((s, i) => `(rid, ${i + 1}, ${sqlTekst(t)}, ${sqlTekst(s)})`)).join(', ')};`,
    `end $$;`,
  ];
  return regels.join('\n');
}

export function batchSql(recepten = RECEPTEN) {
  return [`-- WEEK-213: receptenbatch (${recepten.length} recepten), gegenereerd door scripts/recepten-naar-sql.mjs.`, ingredientenSql(), ...recepten.map(receptSql)].join('\n\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ingredienten = ingredientenLijst();
  const fouten = RECEPTEN.flatMap((r) => controleer(r, ingredienten));
  const bronnen = RECEPTEN.map((r) => r.bron);
  if (new Set(bronnen).size !== bronnen.length) fouten.push('dubbele bron in de batch');
  if (fouten.length) {
    console.error(fouten.join('\n'));
    process.exit(1);
  }
  const telling = Object.groupBy(RECEPTEN, (r) => r.soort);
  console.error(`${RECEPTEN.length} recepten in orde: ${Object.entries(telling).map(([s, l]) => `${l.length} ${s}`).join(', ')}.`);
  if (!process.argv.includes('--controle') && !process.argv.includes('--delen')) process.stdout.write(batchSql());
}

/** Compacte variant: één do-blok per deel dat de recepten uit JSON leest (zelfde resultaat als batchSql). */
export function batchJsonSql(recepten) {
  const data = recepten.map((r) => ({
    b: r.bron, m: r.minuten, st: r.stijl, so: r.soort, ba: r.basis, w: r.wijze, mo: r.moeilijkheid, se: r.seizoenen, t: r.tags,
    ti: r.titel, s: r.stappen,
    i: r.ing.map(([code, totaal, eenheid]) => [code, perVolwassene(totaal, r.personen, eenheid), eenheid]),
  }));
  const json = JSON.stringify(data).replace(/'/g, "''");
  return `do $$
declare r jsonb; rid bigint; taal text; n int;
begin
  for r in select * from jsonb_array_elements('${json}'::jsonb) loop
    continue when exists (select 1 from public.recepten where bron = r->>'b');
    insert into public.recepten (porties, kooktijd_min, moment, stijl, stijlen, soort, basis, bereidingswijze, moeilijkheid, tags, bron, status, seizoenen)
    values (1, (r->>'m')::int, 'avond', r->>'st', array[r->>'st'], r->>'so', r->>'ba', r->>'w', r->>'mo',
      array(select jsonb_array_elements_text(r->'t')), r->>'b', 'goedgekeurd', array(select jsonb_array_elements_text(r->'se')))
    returning id into rid;
    insert into public.recept_vertalingen (recept_id, taal, titel) select rid, k, v from jsonb_each_text(r->'ti') as x(k, v);
    insert into public.recept_ingredienten (recept_id, ingredient_id, hoeveelheid, eenheid)
    select rid, i.id, (e->>1)::numeric, e->>2 from jsonb_array_elements(r->'i') e join public.ingredienten i on i.code = e->>0;
    insert into public.recept_bereidingen (recept_id, taal, stappen) select rid, k, v from jsonb_each(r->'s') as x(k, v);
    n := jsonb_array_length(r->'s'->'nl');
    insert into public.bereidingsstappen (recept_id, volgnummer) select rid, g from generate_series(1, n) g;
    insert into public.bereidingsstap_vertalingen (recept_id, volgnummer, taal, tekst)
    select rid, s.nr::int, x.k, s.tekst from jsonb_each(r->'s') as x(k, v), jsonb_array_elements_text(x.v) with ordinality as s(tekst, nr);
  end loop;
end $$;
`;
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes('--delen')) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const map = process.argv[process.argv.indexOf('--delen') + 1];
  mkdirSync(map, { recursive: true });
  writeFileSync(`${map}/0-ingredienten.sql`, ingredientenSql() + '\n');
  for (let d = 0; d * 11 < RECEPTEN.length; d++) writeFileSync(`${map}/${d + 1}-recepten.sql`, batchJsonSql(RECEPTEN.slice(d * 11, d * 11 + 11)));
}
