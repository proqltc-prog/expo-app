import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { gaatNaarMenu, sluitAppOp } from '@/lib/terugknop';

describe('gaatNaarMenu (WEEK-128)', () => {
  test('vanuit bereiding, kies, profiel, lijst, frigo en scan gaat de knop naar het menu', () => {
    for (const pad of ['/bereiding', '/kies', '/profiel', '/lijst', '/frigo', '/scan']) {
      assert.equal(gaatNaarMenu(pad), true, pad);
    }
  });
  test('op het menu zelf en op het welkomstscherm gaat de knop niet naar het menu', () => {
    for (const pad of ['/', '/index', '/welkom']) {
      assert.equal(gaatNaarMenu(pad), false, pad);
    }
  });
  test('regressie: een afsluitende schuine streep verandert het resultaat niet', () => {
    assert.equal(gaatNaarMenu('/bereiding/'), true);
    assert.equal(gaatNaarMenu('/index/'), false);
  });
});

describe('op het weekmenu sluit de terugknop de app (WEEK-142)', () => {
  test('het weekmenu sluit de app', () => {
    assert.equal(sluitAppOp('/'), true);
    assert.equal(sluitAppOp('/index'), true);
  });
  test('een ander scherm sluit de app niet', () => {
    assert.equal(sluitAppOp('/lijst'), false);
    assert.equal(sluitAppOp('/frigo'), false);
    assert.equal(sluitAppOp('/welkom'), false);
  });
  test('regressie: van een scherm binnen de app gaat de knop nog naar het weekmenu', () => {
    assert.equal(gaatNaarMenu('/lijst'), true);
    assert.equal(gaatNaarMenu('/scan'), true);
  });
});
