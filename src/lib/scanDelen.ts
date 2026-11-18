// WEEK-304: de tekst om een scanresultaat te delen (via het deelmenu van het toestel). Pure logica.
import { vertaal, type Taal } from '@/i18n';
import { productLink, scanNaam, type Product } from '@/lib/openfoodfacts';
import { additievenGekend } from '@/lib/score';
import { allergeenNaam, allergenenStatus } from '@/lib/allergenen';

export function deelTekst(p: Product, taal: Taal): string {
  const regels = [scanNaam(p, vertaal(taal, 'scan.onbekend'))];
  regels.push(vertaal(taal, 'scan.deel.nutriscore', { waarde: p.nutriscore ? p.nutriscore.toUpperCase() : vertaal(taal, 'scan.deel.onbekend') }));
  regels.push(vertaal(taal, 'scan.deel.nova', { waarde: p.nova ? String(p.nova) : vertaal(taal, 'scan.deel.onbekend') }));
  if (additievenGekend(p) || p.additieven.length) {
    regels.push(vertaal(taal, 'scan.deel.additieven', { waarde: p.additieven.length ? p.additieven.join(', ') : '0' }));
  }
  const allergenen = allergenenStatus(p);
  if (allergenen.soort === 'bevat') {
    regels.push(vertaal(taal, 'scan.deel.allergenen', { waarde: allergenen.bevat.map((c) => allergeenNaam(c, taal)).join(', ') }));
  } else if (allergenen.soort === 'geen') {
    regels.push(vertaal(taal, 'scan.deel.allergenen', { waarde: vertaal(taal, 'scan.deel.geen') }));
  }
  regels.push('', vertaal(taal, 'scan.deel.meer', { link: productLink(p.barcode) }), vertaal(taal, 'scan.deel.via'));
  return regels.join('\n');
}
