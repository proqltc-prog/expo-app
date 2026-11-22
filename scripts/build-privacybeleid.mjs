#!/usr/bin/env node
// Bouwt docs/privacybeleid/index.html uit store/privacybeleid.md (WEEK-62; WEEK-324: Node in plaats van Python/pandoc).
// Daarna kopieert de eigenaar (of Claude) index.html naar de repository famenu-privacy (GitHub Pages):
// https://proqltc-prog.github.io/famenu-privacy/
// Gebruik: node scripts/build-privacybeleid.mjs
// Ondersteunt wat het privacybeleid gebruikt: titels (met {#anker}), alinea's, lijsten, tabellen, vet, cursief, lijn.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const bron = readFileSync(join(ROOT, 'store', 'privacybeleid.md'), 'utf8').replace(/\r\n/g, '\n');

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (t) =>
  esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/(^|[\s(])((?:[a-z0-9-]+\.)+be)(?=[\s).,]|$)/g, '$1<a href="https://$2">$2</a>')
    .replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>');

const regels = bron.split('\n');
const uit = [];
let i = 0;
while (i < regels.length) {
  const r = regels[i];
  if (!r.trim()) { i++; continue; }
  const kop = /^(#{1,3}) (.+?)(?: \{#([\w-]+)\})?$/.exec(r);
  if (kop) {
    const n = kop[1].length;
    uit.push(`<h${n}${kop[3] ? ` id="${kop[3]}"` : ''}>${inline(kop[2])}</h${n}>`);
    i++;
    continue;
  }
  if (/^---\s*$/.test(r)) { uit.push('<hr />'); i++; continue; }
  if (r.startsWith('|')) {
    const rijen = [];
    while (i < regels.length && regels[i].startsWith('|')) rijen.push(regels[i++]);
    const cellen = (rij) => rij.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const [kopRij, , ...data] = rijen;
    uit.push('<table>', `<thead><tr>${cellen(kopRij).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`, '<tbody>');
    for (const rij of data) uit.push(`<tr>${cellen(rij).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
    uit.push('</tbody>', '</table>');
    continue;
  }
  if (/^(- |\d+\. )/.test(r)) {
    const geordend = /^\d+\. /.test(r);
    const items = [];
    while (i < regels.length && /^(- |\d+\. )/.test(regels[i])) items.push(regels[i++].replace(/^(- |\d+\. )/, ''));
    const tag = geordend ? 'ol' : 'ul';
    uit.push(`<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${tag}>`);
    continue;
  }
  const alinea = [];
  while (i < regels.length && regels[i].trim() && !/^(#|\||- |\d+\. |---)/.test(regels[i])) alinea.push(regels[i++]);
  uit.push(`<p>${inline(alinea.join(' '))}</p>`);
}

const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Privacybeleid Famenu · Privacy policy</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:46rem;margin:0 auto;padding:1.25rem 1rem;line-height:1.6;color:#222;background:#fff}
h1,h2{line-height:1.25}
table{border-collapse:collapse;width:100%;font-size:.95rem}
td,th{border:1px solid #ddd;padding:.45rem;vertical-align:top;text-align:left}
th{background:#f4f4f4}
em{color:#555}
hr{border:0;border-top:1px solid #ddd;margin:2rem 0}
@media (prefers-color-scheme:dark){body{background:#151515;color:#eee}th{background:#262626}td,th{border-color:#444}em{color:#aaa}hr{border-color:#444}a{color:#8cc8ff}}
</style>
</head>
<body>
${uit.join('\n')}
</body>
</html>
`;

const doel = join(ROOT, 'docs', 'privacybeleid', 'index.html');
mkdirSync(dirname(doel), { recursive: true });
writeFileSync(doel, html, 'utf8');
console.log(`geschreven: ${doel}`);
