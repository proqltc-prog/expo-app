import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { anderenLeden, ikBeheerder, magGezinsprofielWijzigen, vraagtOpvolgerBijVertrek } from '@/lib/gezinbeheer';
import { leesGezinFout } from '@/lib/sync';

const leden = [
  { id: 'ik', naam: 'Maarten' },
  { id: 'partner', naam: 'Sofie' },
];

describe('ikBeheerder', () => {
  it('ja als ik de beheerder ben', () => assert.equal(ikBeheerder('ik', 'ik'), true));
  it('nee als een ander beheerder is', () => assert.equal(ikBeheerder('partner', 'ik'), false));
  it('nee zonder beheerder of zonder aanmelding', () => {
    assert.equal(ikBeheerder(undefined, 'ik'), false);
    assert.equal(ikBeheerder('ik', undefined), false);
  });
});

describe('anderenLeden', () => {
  it('laat mezelf weg', () => assert.deepEqual(anderenLeden(leden, 'ik').map((l) => l.id), ['partner']));
});

describe('vraagtOpvolgerBijVertrek', () => {
  it('beheerder met andere leden moet eerst een opvolger kiezen', () => {
    assert.equal(vraagtOpvolgerBijVertrek(true, leden, 'ik'), true);
  });
  it('beheerder die alleen is, hoeft geen opvolger', () => {
    assert.equal(vraagtOpvolgerBijVertrek(true, [{ id: 'ik', naam: 'Maarten' }], 'ik'), false);
  });
  it('gewoon lid hoeft nooit een opvolger te kiezen (regressie)', () => {
    assert.equal(vraagtOpvolgerBijVertrek(false, leden, 'partner'), false);
  });
});

describe('foutcodes van het beheer (WEEK-65)', () => {
  it('vertaalt de nieuwe serverfouten', () => {
    assert.equal(leesGezinFout('opvolger_nodig'), 'opvolgerNodig');
    assert.equal(leesGezinFout('geen_beheerder'), 'geenBeheerder');
    assert.equal(leesGezinFout('geen_lid'), 'geenLid');
    assert.equal(leesGezinFout('geen_opvolger'), 'geenOpvolger');
  });
});

describe('magGezinsprofielWijzigen (WEEK-168)', () => {
  it('zonder gezinsruimte mag iedereen het eigen profiel wijzigen', () => {
    assert.equal(magGezinsprofielWijzigen(false, undefined, 'ik'), true);
  });
  it('met een gezin enkel de beheerder', () => {
    assert.equal(magGezinsprofielWijzigen(true, 'ik', 'ik'), true);
    assert.equal(magGezinsprofielWijzigen(true, 'partner', 'ik'), false);
  });
  it('onbekende beheerder: niet wijzigen', () => {
    assert.equal(magGezinsprofielWijzigen(true, undefined, 'ik'), false);
  });
});
