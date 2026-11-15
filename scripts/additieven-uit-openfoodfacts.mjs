#!/usr/bin/env node
// Maakt src/data/additieven.gegenereerd.ts opnieuw uit de additievenlijst van Open Food Facts (WEEK-290).
// Bron: https://static.openfoodfacts.org/data/taxonomies/additives.json (Open Database License, bron vermeld in de app).
// Eén download per keer dat je dit draait; de app zelf vraagt niets aan Open Food Facts voor deze lijst (werkt offline).
// Gebruik: `npm run additieven`, of `node scripts/additieven-uit-openfoodfacts.mjs <pad-naar-additives.json>` om een
// eerder gedownload bestand te gebruiken. Commit het resultaat.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BRON = 'https://static.openfoodfacts.org/data/taxonomies/additives.json';
const hier = dirname(fileURLToPath(import.meta.url));
const doel = join(hier, '..', 'src', 'data', 'additieven.gegenereerd.ts');

let lijst;
if (process.argv[2]) {
  lijst = JSON.parse(readFileSync(process.argv[2], 'utf8'));
} else {
  const antwoord = await fetch(BRON, { headers: { 'User-Agent': 'famenu-additieven-script' } });
  if (!antwoord.ok) {
    console.error(`Open Food Facts antwoordt ${antwoord.status}.`);
    process.exit(1);
  }
  lijst = await antwoord.json();
}

// Zelfde regel als eNummer() in src/data/additieven.ts: E + 3 of 4 cijfers, eventueel een letter en een Romeins cijfer.
const E = /^e(\d{3,4})([a-z]?(?:x{0,2}(?:ix|iv|v?i{0,3})))(?![a-z0-9])/;
const eNummer = (tag) => {
  const m = tag.trim().toLowerCase().replace(/^en:/, '').match(E);
  return m ? `E${m[1]}${m[2].toUpperCase()}` : null;
};

// Klassen van Open Food Facts → onze functie (zie Functie in src/data/additieven.ts).
const FUNCTIE = {
  'en:colour': 'kleurstof',
  'en:preservative': 'conserveermiddel',
  'en:antioxidant': 'antioxidant',
  'en:acidity-regulator': 'zuurteregelaar',
  'en:acid': 'zuurteregelaar',
  'en:thickener': 'verdikkingsmiddel',
  'en:emulsifier': 'emulgator',
  'en:flavour-enhancer': 'smaakversterker',
  'en:sweetener': 'zoetstof',
  'en:stabiliser': 'stabilisator',
  'en:humectant': 'bevochtiger',
  'en:sequestrant': 'complexvormer',
  'en:carrier': 'drager',
  'en:propellent-gas': 'drijfgas',
  'en:coagulant': 'stremmiddel',
};
const RISICO = { 'en:high': 'hoog', 'en:moderate': 'matig' };

const TALEN = ['nl', 'fr', 'de', 'en'];
const naamZonderCode = (s) => {
  // "E330 - Citroenzuur" → "Citroenzuur"; een naam die enkel het nummer is ("E330") telt als geen naam.
  // Kleine opkuis van tikfouten in de bron: "E553) - …", een los woord "synoniemen", "Patentblauw v" → "Patentblauw V".
  const n = String(s)
    .replace(/^E\d{3,4}[a-z]*\)?\s*-\s*/i, '')
    .replace(/^E\d{3,4}[a-z]*( food additive)?$/i, '')
    .replace(/\s+synoniemen$/i, '')
    .replace(/ ([a-z])$/, (_, l) => ` ${l.toUpperCase()}`)
    .trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
};
const tekst = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const rijen = new Map();
for (const [sleutel, a] of Object.entries(lijst)) {
  const code = eNummer(sleutel);
  if (!code || rijen.has(code)) continue;
  // Ontbreekt een taal, dan de eerste naam die er wel is (eerst Engels).
  const eigen = TALEN.map((t) => naamZonderCode(a.name?.[t] ?? ''));
  const reserve = [eigen[3], ...eigen].find(Boolean) ?? '';
  const namen = eigen.map((n) => n || reserve);
  if (!namen[0]) continue; // zonder enige naam: niet opnemen, de app toont dan "naam onbekend"
  const klassen = (a.additives_classes?.en ?? '').split(',').map((k) => k.trim());
  const zoet = a.sweetener?.en === 'yes' || klassen.includes('en:sweetener');
  const functie = zoet ? 'zoetstof' : (klassen.map((k) => FUNCTIE[k]).find(Boolean) ?? '');
  const risico = RISICO[a.efsa_evaluation_overexposure_risk?.en] ?? '';
  const url = risico ? (a.efsa_evaluation_url?.en ?? '') : '';
  const jaar = risico ? (String(a.efsa_evaluation_date?.en ?? '').match(/\d{4}/)?.[0] ?? '') : '';
  rijen.set(code, `  ${code}: [[${namen.map(tekst).join(', ')}], ${tekst(functie)}${risico ? `, ${tekst(risico)}, ${tekst(jaar)}, ${tekst(url)}` : ''}],`);
}

const vandaag = new Date().toISOString().slice(0, 10);
const inhoud = `// GEGENEREERD uit de additievenlijst van Open Food Facts (${BRON}) op ${vandaag}. Niet met de hand bewerken.
// Opnieuw maken: \`npm run additieven\` (WEEK-290). Gegevens: Open Food Facts, Open Database License.
// Per E-nummer: [[naam nl, fr, de, en], functie, EFSA-risico op te veel inname ('hoog' | 'matig'), jaar, link naar het EFSA-advies].
export const ADDITIEVEN_OFF: Record<string, readonly [readonly [string, string, string, string], string, ...string[]]> = {
${[...rijen.keys()].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map((k) => rijen.get(k)).join('\n')}
};
`;
writeFileSync(doel, inhoud);
console.log(`${rijen.size} additieven geschreven naar ${doel}`);
