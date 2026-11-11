import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fotoUrl, kiesFoto, leesStijlFotos, STIJLEN_MET_FOTO, vlagVoorStijl } from '@/lib/gerechtFoto';

const stijl = { 'stijl-italiaans': 'stijl-italiaans-5280912.jpg', 'stijl-gezin': 'stijl-gezin-5810663.jpg' };

describe('foto per recept uit de databank (WEEK-244)', () => {
  test('een recept met een eigen foto krijgt die foto', () => {
    assert.equal(kiesFoto('italiaans-pasta-2-17906500.jpg', 'italiaans', stijl), 'italiaans-pasta-2-17906500.jpg');
  });
  test('zonder eigen foto: de stijlfoto van de keuken (bv. oud weekmenu of recept van het gezin)', () => {
    assert.equal(kiesFoto(undefined, 'italiaans', stijl), 'stijl-italiaans-5280912.jpg');
  });
  test('zonder keuken of zonder stijlfoto: de gezinsfoto', () => {
    assert.equal(kiesFoto(undefined, undefined, stijl), 'stijl-gezin-5810663.jpg');
    assert.equal(kiesFoto(undefined, 'koreaans', stijl), 'stijl-gezin-5810663.jpg');
  });
  test('nog niets geladen: geen foto (de app toont dan een rustig vlak met de vlag)', () => {
    assert.equal(kiesFoto(undefined, 'italiaans', {}), undefined);
  });
  test('de publieke link naar de opslag van Supabase', () => {
    assert.equal(
      fotoUrl('https://abc.supabase.co/', 'thais-curry-1-31653135.jpg'),
      'https://abc.supabase.co/storage/v1/object/public/gerechtfotos/thais-curry-1-31653135.jpg'
    );
  });
  test('stijlfoto\'s uit de tabel: enkel stijl-sleutels, de eerste per stijl', () => {
    const uit = leesStijlFotos([
      { sleutel: 'stijl-thais', pad: 'b.jpg', volgnr: 2 },
      { sleutel: 'stijl-thais', pad: 'a.jpg', volgnr: 1 },
      { sleutel: 'thais-curry', pad: 'c.jpg', volgnr: 1 },
      { sleutel: 5, pad: 'x.jpg' },
    ]);
    assert.deepEqual(uit, { 'stijl-thais': 'a.jpg' });
  });
  test('regressie: elke nieuwe foto heeft een nieuwe naam (Pexels-id), zodat de cache niet oud blijft', () => {
    assert.notEqual(fotoUrl('https://x', 'thais-curry-1-31653135.jpg'), fotoUrl('https://x', 'thais-curry-1-5939141.jpg'));
  });
});

describe('vlag per keuken (WEEK-244)', () => {
  test('elke keuken met een foto heeft een vlag of teken', () => {
    for (const s of STIJLEN_MET_FOTO) assert.ok(vlagVoorStijl(s), s);
    assert.equal(STIJLEN_MET_FOTO.length, 12);
  });
  test('klassiek toont de Belgische vlag, mediterraan een olijf, Aziatisch stokjes, gezin het gezinsteken', () => {
    assert.deepEqual(vlagVoorStijl('klassiek'), vlagVoorStijl('belgisch'));
    assert.deepEqual(vlagVoorStijl('mediterraan'), { soort: 'teken', teken: 'olijf' });
    assert.deepEqual(vlagVoorStijl('aziatisch'), { soort: 'teken', teken: 'stokjes' });
    assert.deepEqual(vlagVoorStijl(undefined), { soort: 'teken', teken: 'gezin' });
  });
  test('hartig en zoet hebben geen vlag (regressie: daar blijft de oude illustratie)', () => {
    assert.equal(vlagVoorStijl('hartig'), undefined);
    assert.equal(vlagVoorStijl('zoet'), undefined);
  });
});
