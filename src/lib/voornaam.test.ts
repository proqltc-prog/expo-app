import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_VOORNAAM, valideerVoornaam, naamVoorGezinsruimte, vraagVoornaamInGezin } from '@/lib/voornaam';

describe('valideerVoornaam (WEEK-163)', () => {
  test('gewone voornamen zijn geldig, ook met accenten, koppelteken of apostrof', () => {
    for (const n of ['Maarten', 'José', 'Søren', 'Anne-Marie', "D'Haese", 'Mary Ann']) {
      assert.deepEqual(valideerVoornaam(n), { ok: true, naam: n }, n);
    }
  });

  test('spaties rond de naam verdwijnen, dubbele spaties worden één spatie', () => {
    assert.deepEqual(valideerVoornaam('  Mary   Ann  '), { ok: true, naam: 'Mary Ann' });
  });

  test('leeg of enkel spaties is leeg', () => {
    assert.deepEqual(valideerVoornaam(''), { ok: false, fout: 'leeg' });
    assert.deepEqual(valideerVoornaam('   '), { ok: false, fout: 'leeg' });
  });

  test('maximaal 20 tekens: 20 mag, 21 niet', () => {
    assert.equal(MAX_VOORNAAM, 20);
    assert.equal(valideerVoornaam('a'.repeat(20)).ok, true);
    assert.deepEqual(valideerVoornaam('a'.repeat(21)), { ok: false, fout: 'teLang' });
  });

  test('de lengte telt tekens, niet bytes: 20 accenten mag', () => {
    assert.equal(valideerVoornaam('é'.repeat(20)).ok, true);
  });

  test('leestekens en symbolen worden geweigerd', () => {
    for (const n of ['Jan.', 'Jan:', 'Jan,', 'Jan£', 'Jan%', 'Jan¨', 'Jan*', 'Jan?', 'Jan;', 'Jan!', 'Jan1', 'Ja_n', 'Jan@']) {
      assert.deepEqual(valideerVoornaam(n), { ok: false, fout: 'ongeldig' }, n);
    }
  });

  test('een scheidingsteken mag niet aan het begin of einde staan, niet dubbel, en niet met spaties eromheen', () => {
    for (const n of ['-Jan', "'Jan", 'Jan-', "Jan'", 'Jan--Piet', 'Jan -', 'Jan  -  Piet']) {
      assert.equal(valideerVoornaam(n).ok, false, n);
    }
  });

  test('emoji en vreemde schrijfsystemen zonder letters worden geweigerd', () => {
    assert.deepEqual(valideerVoornaam('Jan 😀'), { ok: false, fout: 'ongeldig' });
  });
});

describe('voornaam verplicht voor een gezinsruimte (WEEK-283)', () => {
  test('positief: een getypte, nog niet opgeslagen naam wordt gebruikt', () => {
    assert.deepEqual(naamVoorGezinsruimte('', 'Lien'), { ok: true, naam: 'Lien' });
  });
  test('positief: een leeg veld valt terug op de opgeslagen naam', () => {
    assert.deepEqual(naamVoorGezinsruimte('Maarten', '   '), { ok: true, naam: 'Maarten' });
  });
  test('positief: wat in het veld staat gaat voor op de opgeslagen naam', () => {
    assert.deepEqual(naamVoorGezinsruimte('Maarten', 'Marie-Anne'), { ok: true, naam: 'Marie-Anne' });
  });
  test('negatief: geen naam opgeslagen en niets getypt', () => {
    assert.deepEqual(naamVoorGezinsruimte('', ''), { ok: false, fout: 'leeg' });
    assert.deepEqual(naamVoorGezinsruimte('', '   '), { ok: false, fout: 'leeg' });
  });
  test('negatief: ongeldige of te lange naam in het veld (ook met een geldige opgeslagen naam)', () => {
    assert.deepEqual(naamVoorGezinsruimte('Maarten', 'M@rten'), { ok: false, fout: 'ongeldig' });
    assert.deepEqual(naamVoorGezinsruimte('', 'A'.repeat(21)), { ok: false, fout: 'teLang' });
  });
  test('randgeval: precies 20 tekens, accenten en dubbele spaties', () => {
    assert.deepEqual(naamVoorGezinsruimte('', 'A'.repeat(20)), { ok: true, naam: 'A'.repeat(20) });
    assert.deepEqual(naamVoorGezinsruimte('', '  Éloïse   De  Vos '), { ok: true, naam: 'Éloïse De Vos' });
  });
  test('melding in een gezin zonder geldige voornaam', () => {
    assert.equal(vraagVoornaamInGezin(true, ''), true);
    assert.equal(vraagVoornaamInGezin(true, 'Maarten'), false);
    assert.equal(vraagVoornaamInGezin(false, ''), false);
  });
});
