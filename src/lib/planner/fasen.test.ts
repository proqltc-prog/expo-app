import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { FASEN, Keuzes, kanVerder, ontbrekendeVoorkeur, volgendeFase, vorigeFase, wijzigMomenten } from '@/lib/planner/fasen';

const leeg: Keuzes = { aantalDagen: 6, datums: [], uitgesloten: [], momenten: ['avond'], kooktijden: ['snel'], stijlen: ['mediterraan'], vermijd: [] };

describe('volgorde van de stappen', () => {
  test('vijf stappen in vaste volgorde', () => {
    assert.deepEqual([...FASEN], ['periode', 'moment', 'stijl', 'vermijden', 'plan']);
  });
  test('volgende en vorige lopen door de stappen en stoppen aan de randen', () => {
    assert.equal(volgendeFase('periode'), 'moment');
    assert.equal(volgendeFase('plan'), undefined);
    assert.equal(vorigeFase('periode'), undefined);
    assert.equal(vorigeFase('vermijden'), 'stijl');
  });
});

describe('mag de gebruiker verder?', () => {
  test('periode is altijd goed', () => {
    assert.equal(kanVerder('periode', leeg), true);
  });
  test('moment vraagt minstens één moment én één kooktijd', () => {
    assert.equal(kanVerder('moment', { ...leeg, momenten: [] }), false);
    assert.equal(kanVerder('moment', { ...leeg, kooktijden: [] }), false);
    assert.equal(kanVerder('moment', leeg), true);
  });
  test('stijl vraagt minstens één stijl', () => {
    assert.equal(kanVerder('stijl', { ...leeg, stijlen: [] }), false);
    assert.equal(kanVerder('stijl', leeg), true);
  });
  test('vermijden is optioneel', () => {
    assert.equal(kanVerder('vermijden', { ...leeg, vermijd: [] }), true);
  });
});

describe('wijzigen van het moment houdt geldige keuzes', () => {
  test('een kooktijd die bij het nieuwe moment past, blijft staan', () => {
    const nieuw = wijzigMomenten({ ...leeg, momenten: ['avond'], kooktijden: ['snel', 'verfijnd'] }, ['middag']);
    assert.deepEqual(nieuw.kooktijden, ['snel', 'verfijnd']);
  });
  test('ontbijt-kooktijd Rustig valt weg bij avond', () => {
    const nieuw = wijzigMomenten({ ...leeg, momenten: ['ontbijt'], kooktijden: ['rustig'] }, ['avond']);
    assert.deepEqual(nieuw.kooktijden, []);
  });
  test('een stijl die niet meer past, valt weg; er wordt een standaard gekozen', () => {
    const nieuw = wijzigMomenten({ ...leeg, momenten: ['middag'], stijlen: ['thais'] }, ['ontbijt']);
    assert.deepEqual(nieuw.stijlen, ['hartig']);
  });
  test('ontbijt krijgt zijn eigen standaardstijl', () => {
    const nieuw = wijzigMomenten({ ...leeg, stijlen: [] }, ['ontbijt']);
    assert.deepEqual(nieuw.stijlen, ['hartig']);
  });
  test('vermijden die bij geen enkel moment meer past, valt weg', () => {
    const nieuw = wijzigMomenten({ ...leeg, momenten: ['avond'], vermijd: ['vis', 'varkensvlees'] }, ['ontbijt']);
    assert.deepEqual(nieuw.vermijd, []);
  });
  test('periode en het moment zelf blijven ongemoeid', () => {
    const nieuw = wijzigMomenten(leeg, ['ontbijt', 'avond']);
    assert.equal(nieuw.aantalDagen, 6);
    assert.deepEqual(nieuw.momenten, ['ontbijt', 'avond']);
  });
});

describe('melding als de gebruiker nog niet verder kan', () => {
  test('moment zonder maaltijd of kooktijd geeft de momentmelding', () => {
    assert.equal(ontbrekendeVoorkeur('moment', { ...leeg, momenten: [] }), 'planning.meld.moment');
    assert.equal(ontbrekendeVoorkeur('moment', { ...leeg, kooktijden: [] }), 'planning.meld.moment');
  });
  test('stijl zonder keuken geeft de stijlmelding', () => {
    assert.equal(ontbrekendeVoorkeur('stijl', { ...leeg, stijlen: [] }), 'planning.meld.stijl');
  });
  test('met een volledige keuze is er geen melding', () => {
    assert.equal(ontbrekendeVoorkeur('moment', leeg), undefined);
    assert.equal(ontbrekendeVoorkeur('stijl', leeg), undefined);
  });
  test('periode en vermijden hebben nooit een melding', () => {
    assert.equal(ontbrekendeVoorkeur('periode', { ...leeg, aantalDagen: 0 }), undefined);
    assert.equal(ontbrekendeVoorkeur('vermijden', { ...leeg, stijlen: [] }), undefined);
  });
  test('er is een melding precies dan wanneer kanVerder false is (behalve bij periode en vermijden)', () => {
    const varianten = [leeg, { ...leeg, momenten: [] }, { ...leeg, kooktijden: [] }, { ...leeg, stijlen: [] }];
    for (const fase of FASEN) {
      for (const k of varianten) {
        const melding = ontbrekendeVoorkeur(fase, k);
        if (kanVerder(fase, k)) assert.equal(melding, undefined, `${fase} mag, geen melding verwacht`);
        else if (fase === 'moment' || fase === 'stijl') assert.notEqual(melding, undefined, `${fase} mag niet, melding verwacht`);
      }
    }
  });
});
