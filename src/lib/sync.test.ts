import { alsEigenGezin } from '@/lib/sync';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  eersteSamenvoeging,
  leesGezinFout,
  leesGezinscode,
  lokaleWijzigingen,
  neemDocumentOver,
  nieuwer,
  pasExternToe,
  SyncRij,
  toonGezinscode,
  voegWachtrijSamen,
} from '@/lib/sync';

type Item = { id: string; naam: string; afgevinkt: boolean };
const item = (id: string, naam = id, afgevinkt = false): Item => ({ id, naam, afgevinkt });
const lees = (d: unknown): Item | null => {
  const r = d as Partial<Item> | null;
  return r && typeof r.id === 'string' && typeof r.naam === 'string' ? { id: r.id, naam: r.naam, afgevinkt: !!r.afgevinkt } : null;
};
const rij = (i: Item | string, op: string, verwijderd = false): SyncRij =>
  typeof i === 'string' ? { id: i, data: {}, verwijderd: true, bijgewerkt_op: op } : { id: i.id, data: i, verwijderd, bijgewerkt_op: op };

const T1 = '2026-10-10T10:00:00.000Z';
const T2 = '2026-10-10T11:00:00.000Z';
const T3 = '2026-10-10T12:00:00.000Z';

describe('nieuwer', () => {
  test('vergelijkt tijdstippen, ook in het formaat van Postgres', () => {
    assert.ok(nieuwer(T2, T1));
    assert.ok(!nieuwer(T1, T2));
    assert.ok(!nieuwer(T1, T1));
    assert.ok(nieuwer('2026-10-10T11:00:00.123456+00:00', '2026-10-10T11:00:00.122Z'));
    assert.ok(!nieuwer('2026-10-10T11:00:00.123456+00:00', '2026-10-10T11:00:00.123Z'), 'zelfde milliseconde');
    assert.ok(nieuwer('2026-10-10T13:00:00+02:00', '2026-10-10T10:59:00Z'));
  });
  test('een ontbrekend of ongeldig tijdstip is het oudst', () => {
    assert.ok(nieuwer(T1, undefined));
    assert.ok(nieuwer(T1, 'gisteren'));
    assert.ok(!nieuwer(undefined, T1));
  });
});

describe('lokaleWijzigingen', () => {
  test('nieuwe en gewijzigde items worden verstuurd met het tijdstip van nu', () => {
    const vorige = [item('a'), item('b')];
    const nieuw = [item('a'), item('b', 'b', true), item('c')];
    const { rijen, meta } = lokaleWijzigingen(vorige, nieuw, { a: T1, b: T1 }, T2);
    assert.deepEqual(rijen.map((r) => [r.id, r.verwijderd]), [['b', false], ['c', false]]);
    assert.ok(rijen.every((r) => r.bijgewerkt_op === T2));
    assert.deepEqual(rijen[0].data, item('b', 'b', true));
    assert.deepEqual(meta, { a: T1, b: T2, c: T2 });
  });
  test('verwijderde items worden als verwijderd verstuurd', () => {
    const { rijen, meta } = lokaleWijzigingen([item('a'), item('b')], [item('a')], {}, T2);
    assert.deepEqual(rijen, [{ id: 'b', data: {}, verwijderd: true, bijgewerkt_op: T2 }]);
    assert.equal(meta.b, T2);
  });
  test('niets veranderd = niets te versturen', () => {
    const lijst = [item('a'), item('b', 'b', true)];
    assert.deepEqual(lokaleWijzigingen(lijst, lijst.map((i) => ({ ...i })), { a: T1 }, T2).rijen, []);
  });
  test('dubbele ids in de nieuwe lijst worden maar één keer verstuurd', () => {
    assert.equal(lokaleWijzigingen([], [item('a'), item('a', 'x')], {}, T2).rijen.length, 1);
  });
});

describe('pasExternToe', () => {
  test('nieuwere wijzigingen van een ander toestel worden toegepast, op hun plaats', () => {
    const lokaal = [item('a'), item('b'), item('c')];
    const { items, meta, gewijzigd } = pasExternToe(lokaal, { b: T1 }, [rij(item('b', 'b', true), T2)], lees);
    assert.ok(gewijzigd);
    assert.deepEqual(items.map((i) => [i.id, i.afgevinkt]), [['a', false], ['b', true], ['c', false]]);
    assert.equal(meta.b, T2);
  });
  test('een oudere wijziging overschrijft niets', () => {
    const lokaal = [item('b', 'b', true)];
    const { items, gewijzigd } = pasExternToe(lokaal, { b: T2 }, [rij(item('b'), T1)], lees);
    assert.ok(!gewijzigd);
    assert.equal(items[0].afgevinkt, true);
  });
  test('de echo van een eigen wijziging (zelfde tijdstip) verandert niets', () => {
    const { gewijzigd } = pasExternToe([item('b', 'b', true)], { b: T2 }, [rij(item('b', 'b', true), '2026-10-10T11:00:00.000+00:00')], lees);
    assert.ok(!gewijzigd);
  });
  test('nieuwe items komen achteraan; verwijderde verdwijnen', () => {
    const { items } = pasExternToe([item('a'), item('b')], {}, [rij(item('c'), T1), rij('a', T2)], lees);
    assert.deepEqual(items.map((i) => i.id), ['b', 'c']);
  });
  test('verwijderen van een onbekend item wordt onthouden, zodat een oudere versie het niet terugbrengt', () => {
    const eerst = pasExternToe([], {}, [rij('x', T2)], lees);
    assert.equal(eerst.meta.x, T2);
    const daarna = pasExternToe(eerst.items, eerst.meta, [rij(item('x'), T1)], lees);
    assert.deepEqual(daarna.items, []);
  });
  test('meerdere versies van hetzelfde item: de nieuwste wint, ongeacht de volgorde', () => {
    const { items } = pasExternToe([], {}, [rij(item('a', 'nieuw'), T3), rij(item('a', 'oud'), T1)], lees);
    assert.deepEqual(items, [item('a', 'nieuw')]);
  });
  test('onbruikbare data of een id die niet klopt wordt overgeslagen', () => {
    const { items, meta } = pasExternToe([], {}, [{ id: 'a', data: { kapot: true }, verwijderd: false, bijgewerkt_op: T1 }, rij({ ...item('z'), id: 'z' }, T1)], lees);
    assert.deepEqual(items.map((i) => i.id), ['z']);
    assert.equal(meta.a, undefined);
    const fout = pasExternToe([], {}, [{ id: 'a', data: item('b'), verwijderd: false, bijgewerkt_op: T1 }], lees);
    assert.deepEqual(fout.items, []);
  });
  test('twee toestellen vinken tegelijk verschillende items af: niets gaat verloren', () => {
    // toestel 1 vinkt a af, toestel 2 vinkt b af, allebei vanuit dezelfde lijst
    const basis = [item('a'), item('b')];
    const een = lokaleWijzigingen(basis, [item('a', 'a', true), item('b')], {}, T2);
    const twee = lokaleWijzigingen(basis, [item('a'), item('b', 'b', true)], {}, T3);
    const bijEen = pasExternToe([item('a', 'a', true), item('b')], een.meta, twee.rijen, lees);
    const bijTwee = pasExternToe([item('a'), item('b', 'b', true)], twee.meta, een.rijen, lees);
    assert.deepEqual(bijEen.items, [item('a', 'a', true), item('b', 'b', true)]);
    assert.deepEqual(bijTwee.items, bijEen.items);
  });
});

describe('eersteSamenvoeging', () => {
  test('neemt de gegevens van het gezin over en voegt wat enkel lokaal is toe', () => {
    const lokaal = [item('eigen'), item('gedeeld', 'lokale versie')];
    const rijen = [rij(item('gedeeld', 'gezin'), T1), rij(item('andere'), T1), rij('weg', T1)];
    const { items, meta, teVersturen } = eersteSamenvoeging(lokaal, rijen, lees, T2);
    assert.deepEqual(items.map((i) => [i.id, i.naam]), [['gedeeld', 'gezin'], ['andere', 'andere'], ['eigen', 'eigen']]);
    assert.deepEqual(teVersturen.map((r) => r.id), ['eigen']);
    assert.equal(meta.eigen, T2);
    assert.equal(meta.gedeeld, T1);
  });
  test('een item dat het gezin verwijderde, komt niet terug van een nieuw lid', () => {
    const { items, teVersturen } = eersteSamenvoeging([item('weg')], [rij('weg', T1)], lees, T2);
    assert.deepEqual(items, []);
    assert.deepEqual(teVersturen, []);
  });
  test('dubbele ids op het toestel worden maar één keer verstuurd (WEEK-27)', () => {
    const { items, teVersturen } = eersteSamenvoeging([item('a'), item('a', 'tweede'), item('b')], [], lees, T2);
    assert.deepEqual(teVersturen.map((r) => r.id), ['a', 'b']);
    assert.deepEqual(items.map((i) => i.naam), ['a', 'b']);
  });
  test('een lokaal item dat nieuwer is dan de verwijdering bij het gezin, blijft (WEEK-27)', () => {
    type Fav = Item & { op: string };
    const leesFav = (d: unknown) => d as Fav;
    const lasagne: Fav = { ...item('fav:lasagne'), op: T3 };
    const { items, teVersturen } = eersteSamenvoeging([lasagne], [rij('fav:lasagne', T2)], leesFav, T3, (f) => f.op);
    assert.deepEqual(items, [lasagne]);
    assert.deepEqual(teVersturen.map((r) => r.id), ['fav:lasagne']);
    const ouder = eersteSamenvoeging([{ ...lasagne, op: T1 }], [rij('fav:lasagne', T2)], leesFav, T3, (f) => f.op);
    assert.deepEqual(ouder.items, []);
  });
});

describe('neemDocumentOver', () => {
  test('enkel een nieuwer document vervangt het lokale', () => {
    assert.ok(neemDocumentOver(T1, { data: {}, bijgewerkt_op: T2 }));
    assert.ok(neemDocumentOver(undefined, { data: {}, bijgewerkt_op: T1 }));
    assert.ok(!neemDocumentOver(T2, { data: {}, bijgewerkt_op: T1 }));
    assert.ok(!neemDocumentOver(T2, { data: {}, bijgewerkt_op: T2 }));
    assert.ok(!neemDocumentOver(T1, null));
  });
});

describe('voegWachtrijSamen', () => {
  test('houdt per item enkel de nieuwste versie', () => {
    const samen = voegWachtrijSamen([rij(item('a', 'oud'), T1), rij(item('b'), T1)], [rij(item('a', 'nieuw'), T2), rij(item('b', 'te oud'), T1)]);
    assert.deepEqual(samen.map((r) => [r.id, (r.data as Item).naam]), [['a', 'nieuw'], ['b', 'te oud']]);
    assert.deepEqual(voegWachtrijSamen([rij(item('a', 'nieuw'), T3)], [rij(item('a', 'oud'), T1)]).map((r) => (r.data as Item).naam), ['nieuw']);
  });
});

describe('gezinscode', () => {
  test('leest getypte codes met kleine letters, spaties of streepje', () => {
    assert.equal(leesGezinscode('abc 234'), 'ABC234');
    assert.equal(leesGezinscode(' AbC-234 '), 'ABC234');
  });
  test('weigert codes met verkeerde lengte of tekens die niet bestaan (I, O, 0, 1)', () => {
    assert.equal(leesGezinscode('ABC23'), null);
    assert.equal(leesGezinscode('ABC2345'), null);
    assert.equal(leesGezinscode('ABCIO1'), null);
    assert.equal(leesGezinscode(''), null);
  });
  test('toont een code in twee blokjes', () => {
    assert.equal(toonGezinscode('ABC234'), 'ABC 234');
    assert.equal(toonGezinscode('XY'), 'XY');
  });
  test('vertaalt foutmeldingen van de server', () => {
    assert.equal(leesGezinFout('onbekende_code'), 'onbekendeCode');
    assert.equal(leesGezinFout('ERROR: te_veel_pogingen'), 'teVeelPogingen');
    assert.equal(leesGezinFout('al_lid'), 'alLid');
    assert.equal(leesGezinFout('TypeError: Network request failed'), 'geenVerbinding');
    assert.equal(leesGezinFout(undefined), 'onbekend');
  });
});

describe('bijhalen naast live updates (WEEK-26)', () => {
  test('een gemiste live-update komt ten laatste na een minuut binnen', async () => {
    const { BIJHALEN } = await import('@/lib/sync');
    assert.ok(BIJHALEN.intervalMs <= 60_000);
    assert.ok(BIJHALEN.naVerbindenMs.length >= 1);
    assert.ok(BIJHALEN.naVerbindenMs.every((ms, i, a) => ms > 0 && (i === 0 || ms > a[i - 1]) && ms < BIJHALEN.intervalMs));
  });
});

describe('alsEigenGezin (WEEK-129)', () => {
  test('leest het gezin uit een rij met het gezin als object', () => {
    assert.deepEqual(alsEigenGezin({ gezinnen: { id: 'g1', naam: 'Gezin', code: 'ABC234' } }), { id: 'g1', naam: 'Gezin', code: 'ABC234' });
  });
  test('leest het gezin ook als lijst van één', () => {
    assert.deepEqual(alsEigenGezin([{ gezinnen: [{ id: 'g1', naam: 'Gezin', code: 'ABC234' }] }]), { id: 'g1', naam: 'Gezin', code: 'ABC234' });
  });
  test('zonder gezin of zonder code is het resultaat leeg', () => {
    assert.equal(alsEigenGezin(null), null);
    assert.equal(alsEigenGezin({ gezinnen: null }), null);
    assert.equal(alsEigenGezin({ gezinnen: { id: 'g1' } }), null);
  });
});
