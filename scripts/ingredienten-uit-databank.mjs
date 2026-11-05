#!/usr/bin/env node
// Maakt src/data/ingredienten.gegenereerd.ts opnieuw uit de databank (WEEK-205).
// Bron: tabellen `ingredienten` en `ingredient_vertalingen` (publiek leesbaar via de anon-sleutel).
// Gebruik: `node scripts/ingredienten-uit-databank.mjs` (zelfde instellingen als de app: EXPO_PUBLIC_SUPABASE_URL en
// EXPO_PUBLIC_SUPABASE_KEY, anders de standaardwaarden uit src/config.ts). Draai dit na elke wijziging aan de
// ingrediënten in de databank, bv. na een receptenbatch, en commit het resultaat.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const config = readFileSync(join(hier, '..', 'src', 'config.ts'), 'utf8');
const standaard = (naam) => config.match(new RegExp(`${naam}:\\s*process\\.env\\.[A-Z_]+\\s*\\?\\?\\s*'([^']+)'`))?.[1] ?? '';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? standaard('url');
const sleutel = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? standaard('sleutel');
if (!url || !sleutel) {
  console.error('Geen Supabase-url of -sleutel gevonden (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY).');
  process.exit(1);
}

const TALEN = ['nl', 'fr', 'de', 'en'];
const antwoord = await fetch(`${url}/rest/v1/ingredienten?select=code,categorie,eenheid,ingredient_vertalingen(taal,naam)&order=code`, {
  headers: { apikey: sleutel, Authorization: `Bearer ${sleutel}` },
});
if (!antwoord.ok) {
  console.error(`Databank antwoordt ${antwoord.status}: ${await antwoord.text()}`);
  process.exit(1);
}
const rijen = await antwoord.json();

const tekst = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const sleutelVan = (code) => (/^[a-z_][a-z0-9_]*$/.test(code) ? code : tekst(code));
const regels = [];
for (const r of rijen) {
  const namen = TALEN.map((taal) => r.ingredient_vertalingen.find((v) => v.taal === taal)?.naam);
  if (namen.some((n) => !n)) {
    console.error(`Ingrediënt ${r.code} mist een vertaling (nl, fr, de, en); overgeslagen.`);
    continue;
  }
  regels.push(`  ${sleutelVan(r.code)}: [${tekst(r.categorie)}, ${tekst(r.eenheid)}, [${namen.map(tekst).join(', ')}]],`);
}

const datum = new Date().toISOString().slice(0, 10);
const uit = `// GEGENEREERD uit de databank (tabellen ingredienten en ingredient_vertalingen) op ${datum}. Niet met de hand bewerken.
// Opnieuw maken na elke wijziging aan de ingrediënten in de databank: \`node scripts/ingredienten-uit-databank.mjs\` (WEEK-205).
// Per code: [categorie in de databank, eenheid, [naam nl, fr, de, en]].
export const INGREDIENTEN_DB = {
${regels.join('\n')}
} as const;
`;
const doel = join(hier, '..', 'src', 'data', 'ingredienten.gegenereerd.ts');
writeFileSync(doel, uit);
console.log(`${regels.length} ingrediënten geschreven naar ${doel}`);
