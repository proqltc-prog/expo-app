// WEEK-337: voorbereiding webwinkels (nog onzichtbaar).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  huidigeWinkel,
  kan,
  kiesTijdelijk,
  kiesVast,
  leesKeuze,
  normaliseerWebwinkels,
  WEBWINKELS_ZICHTBAAR,
  wisTijdelijk,
  zoekLink,
} from './webwinkels';

const rij = (code: string, extra: Record<string, unknown> = {}) => ({
  code,
  naam: code.toUpperCase(),
  land: 'BE',
  webshop_url: `https://www.${code}.be`,
  zoek_url: null,
  mogelijkheden: [],
  actief: true,
  volgorde: 1,
  ...extra,
});

describe('WEEK-337: webwinkels uit de databank', () => {
  it('enkel actieve en geldige winkels, op volgorde', () => {
    const w = normaliseerWebwinkels([
      rij('delhaize', { volgorde: 2 }),
      rij('colruyt', { volgorde: 1 }),
      rij('ah', { actief: false }),
    ]);
    assert.deepEqual(w.map((x) => x.code), ['colruyt', 'delhaize']);
  });
  it('regressie: zoals nu in de databank (alles op niet actief) toont de app niets', () => {
    const nu = ['colruyt', 'delhaize', 'ah', 'carrefour'].map((c) => rij(c, { actief: false }));
    assert.deepEqual(normaliseerWebwinkels(nu), []);
  });
  it('negatief: ongeldige rijen vallen weg', () => {
    assert.deepEqual(normaliseerWebwinkels(null), []);
    assert.deepEqual(normaliseerWebwinkels('x'), []);
    assert.deepEqual(
      normaliseerWebwinkels([
        rij('Fout Code'),
        rij('geen_naam', { naam: '  ' }),
        rij('http', { webshop_url: 'http://onveilig.be' }),
        null,
        rij('colruyt'),
        rij('colruyt', { naam: 'dubbel' }),
      ]).map((x) => x.naam),
      ['COLRUYT'],
    );
  });
  it('zoeken kan enkel met een zoek-URL met {zoekterm}; onbekende mogelijkheden vallen weg', () => {
    const [zonder] = normaliseerWebwinkels([rij('ah', { mogelijkheden: ['zoeken', 'mandje', 'vliegen'] })]);
    assert.deepEqual(zonder.mogelijkheden, ['mandje']);
    const [slecht] = normaliseerWebwinkels([rij('ah', { zoek_url: 'https://www.ah.be/zoeken', mogelijkheden: ['zoeken'] })]);
    assert.equal(kan(slecht, 'zoeken'), false);
    const [goed] = normaliseerWebwinkels([rij('ah', { zoek_url: 'https://www.ah.be/zoeken?q={zoekterm}', mogelijkheden: ['zoeken'] })]);
    assert.equal(kan(goed, 'zoeken'), true);
  });
});

describe('WEEK-337: zoeklink', () => {
  const [w] = normaliseerWebwinkels([rij('colruyt', { zoek_url: 'https://www.collectandgo.be/zoek?q={zoekterm}', mogelijkheden: ['zoeken'] })]);
  it('vult de zoekterm in, veilig gecodeerd', () => {
    assert.equal(zoekLink(w, 'kokosmelk'), 'https://www.collectandgo.be/zoek?q=kokosmelk');
    assert.equal(zoekLink(w, 'crème fraîche & co'), 'https://www.collectandgo.be/zoek?q=cr%C3%A8me%20fra%C3%AEche%20%26%20co');
  });
  it('negatief: geen winkel, lege term of zoeken kan niet', () => {
    assert.equal(zoekLink(undefined, 'melk'), undefined);
    assert.equal(zoekLink(w, '   '), undefined);
    const [geen] = normaliseerWebwinkels([rij('ah')]);
    assert.equal(zoekLink(geen, 'melk'), undefined);
  });
});

describe('WEEK-337: keuze van de gebruiker (één vaste + tijdelijk wisselen)', () => {
  const winkels = normaliseerWebwinkels([rij('colruyt', { volgorde: 1 }), rij('delhaize', { volgorde: 2 })]);
  it('vaste winkel, daarna tijdelijk een andere, dan terug', () => {
    let k = kiesVast({}, 'colruyt');
    assert.equal(huidigeWinkel(k, winkels)?.code, 'colruyt');
    k = kiesTijdelijk(k, 'delhaize');
    assert.equal(huidigeWinkel(k, winkels)?.code, 'delhaize');
    k = wisTijdelijk(k);
    assert.deepEqual(k, { vast: 'colruyt' });
  });
  it('een nieuwe vaste winkel wist de tijdelijke; tijdelijk = vast telt niet', () => {
    assert.deepEqual(kiesVast({ vast: 'colruyt', tijdelijk: 'delhaize' }, 'ah'), { vast: 'ah' });
    assert.deepEqual(kiesTijdelijk({ vast: 'colruyt' }, 'colruyt'), { vast: 'colruyt' });
  });
  it('negatief: zonder keuze of met een niet-actieve winkel geen winkel', () => {
    assert.equal(huidigeWinkel({}, winkels), undefined);
    assert.equal(huidigeWinkel({ vast: 'carrefour' }, winkels), undefined);
    assert.equal(huidigeWinkel({ vast: 'colruyt', tijdelijk: 'carrefour' }, winkels)?.code, 'colruyt');
    assert.equal(huidigeWinkel({ vast: 'colruyt' }, []), undefined);
  });
  it('negatief: een kapotte bewaarde keuze wordt leeg', () => {
    assert.deepEqual(leesKeuze(null), {});
    assert.deepEqual(leesKeuze('colruyt'), {});
    assert.deepEqual(leesKeuze({ vast: 'Fout!', tijdelijk: 42 }), {});
    assert.deepEqual(leesKeuze({ vast: 'colruyt', tijdelijk: 'colruyt' }), { vast: 'colruyt' });
  });
});

describe('WEEK-337: regressie – nog onzichtbaar en niet actief', () => {
  it('de schakelaar staat uit', () => {
    assert.equal(WEBWINKELS_ZICHTBAAR, false);
  });
  it('geen enkel scherm gebruikt de webwinkels nog', () => {
    const bestanden: string[] = [];
    const loop = (map: string) => {
      for (const n of readdirSync(map)) {
        const p = join(map, n);
        if (statSync(p).isDirectory()) loop(p);
        else if (/\.tsx?$/.test(n)) bestanden.push(p);
      }
    };
    loop('app');
    loop('src/ui');
    const gebruikt = bestanden.filter((p) => /webwinkel/i.test(readFileSync(p, 'utf8')));
    assert.deepEqual(gebruikt, []);
  });
});
