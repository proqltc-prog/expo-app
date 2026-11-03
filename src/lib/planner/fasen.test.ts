import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { FASEN, Keuzes, kanVerder, naarStap, ontbrekendeVoorkeur, volgendeFase, vorigeFase, wijzigMomenten } from '@/lib/planner/fasen';

const leeg: Keuzes = { aantalDagen: 6, datums: [], uitgesloten: [], momenten: ['avond'], kooktijden: ['snel'], stijlen: ['mediterraan'], vermijd: [] };

describe('volgorde van de stappen (WEEK-189: geen maaltijdkeuze meer)', () => {
  test('vijf stappen in vaste volgorde', () => {
    assert.deepEqual([...FASEN], ['periode', 'kooktijd', 'stijl', 'vermijden', 'plan']);
  });
  test('volgende en vorige lopen door de stappen en stoppen aan de randen', () => {
    assert.equal(volgendeFase('periode'), 'kooktijd');
    assert.equal(volgendeFase('plan'), undefined);
    assert.equal(vorigeFase('periode'), undefined);
    assert.equal(vorigeFase('vermijden'), 'stijl');
  });
});

describe('mag de gebruiker verder?', () => {
  test('periode is altijd goed', () => {
    assert.equal(kanVerder('periode', leeg), true);
  });
  test('kooktijd vraagt minstens één kooktijd', () => {
    assert.equal(kanVerder('kooktijd', { ...leeg, kooktijden: [] }), false);
    assert.equal(kanVerder('kooktijd', leeg), true);
  });
  test('stijl vraagt minstens één stijl', () => {
    assert.equal(kanVerder('stijl', { ...leeg, stijlen: [] }), false);
    assert.equal(kanVerder('stijl', leeg), true);
  });
  test('vermijden is optioneel', () => {
    assert.equal(kanVerder('vermijden', { ...leeg, vermijd: [] }), true);
  });
});

describe('wijzigen van de momenten houdt geldige keuzes (regressie)', () => {
  test('een kooktijd die bij het avondmoment hoort, blijft staan', () => {
    const nieuw = wijzigMomenten({ ...leeg, kooktijden: ['snel', 'verfijnd'] }, ['avond']);
    assert.deepEqual(nieuw.kooktijden, ['snel', 'verfijnd']);
  });
  test('een kooktijd die niet meer bestaat, valt weg', () => {
    const nieuw = wijzigMomenten({ ...leeg, kooktijden: ['rustig'] }, ['avond']);
    assert.deepEqual(nieuw.kooktijden, []);
  });
  test('een stijl die niet meer bestaat, valt weg; er wordt de standaard gekozen', () => {
    const nieuw = wijzigMomenten({ ...leeg, stijlen: ['ovenschotels'] }, ['avond']);
    assert.deepEqual(nieuw.stijlen, ['mediterraan']);
  });
  test('vermijden die bij geen enkel moment meer past, valt weg', () => {
    const nieuw = wijzigMomenten({ ...leeg, vermijd: ['ongeldig'] }, ['avond']);
    assert.deepEqual(nieuw.vermijd, []);
  });
  test('periode blijft ongemoeid', () => {
    const nieuw = wijzigMomenten(leeg, ['avond']);
    assert.equal(nieuw.aantalDagen, 6);
    assert.deepEqual(nieuw.momenten, ['avond']);
  });
});

describe('melding als de gebruiker nog niet verder kan', () => {
  test('kooktijd zonder keuze geeft de kooktijdmelding', () => {
    assert.equal(ontbrekendeVoorkeur('kooktijd', { ...leeg, kooktijden: [] }), 'planning.meld.kooktijd');
  });
  test('stijl zonder keuken geeft de stijlmelding', () => {
    assert.equal(ontbrekendeVoorkeur('stijl', { ...leeg, stijlen: [] }), 'planning.meld.stijl');
  });
  test('met een volledige keuze is er geen melding', () => {
    assert.equal(ontbrekendeVoorkeur('kooktijd', leeg), undefined);
    assert.equal(ontbrekendeVoorkeur('stijl', leeg), undefined);
  });
  test('periode en vermijden hebben nooit een melding', () => {
    assert.equal(ontbrekendeVoorkeur('periode', { ...leeg, aantalDagen: 0 }), undefined);
    assert.equal(ontbrekendeVoorkeur('vermijden', { ...leeg, stijlen: [] }), undefined);
  });
  test('er is een melding precies dan wanneer kanVerder false is (behalve bij periode en vermijden)', () => {
    const varianten = [leeg, { ...leeg, kooktijden: [] }, { ...leeg, stijlen: [] }];
    for (const fase of FASEN) {
      for (const k of varianten) {
        const melding = ontbrekendeVoorkeur(fase, k);
        if (kanVerder(fase, k)) assert.equal(melding, undefined, `${fase} mag, geen melding verwacht`);
        else if (fase === 'kooktijd' || fase === 'stijl') assert.notEqual(melding, undefined, `${fase} mag niet, melding verwacht`);
      }
    }
  });
});

describe('keuzes bij het binnenkomen van een stap (WEEK-105)', () => {
  test('bij de stap Stijl staat niets geselecteerd, ook als er eerder keuzes waren', () => {
    assert.deepEqual(naarStap('stijl', leeg).stijlen, []);
  });
  test('de andere stappen laten de stijlkeuzes staan (regressie)', () => {
    for (const doel of ['periode', 'kooktijd', 'vermijden', 'plan'] as const) {
      assert.deepEqual(naarStap(doel, leeg).stijlen, ['mediterraan'], doel);
    }
  });
  test('zonder stijl kan de gebruiker de stap Stijl niet verlaten', () => {
    assert.equal(kanVerder('stijl', naarStap('stijl', leeg)), false);
  });
  test('de overige keuzes blijven ongewijzigd bij de stap Stijl', () => {
    const k = naarStap('stijl', leeg);
    assert.equal(k.aantalDagen, leeg.aantalDagen);
    assert.deepEqual(k.momenten, leeg.momenten);
    assert.deepEqual(k.vermijd, leeg.vermijd);
  });
});
