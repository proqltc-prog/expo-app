import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BORDEN_BOVEN, dagKort, FOTO_BRON, FOTO_SLEUTELS, FOTO_VERHOUDING, heeftEigenFoto, heroHoogte, HERO_MIN, merkDelen, START_KENMERKEN, uitlegFoto, WEEKPLAN_BORDEN } from '@/lib/welkomFotos';
import { UITLEG_SCHERMEN } from '@/lib/welkom';
import { WEEKDAGEN } from '@/lib/planner/types';
import { vertaal, TALEN } from '@/i18n';

const MAP = join(__dirname, '..', '..', 'assets', 'welkom');

describe('woordmerk en kenmerken op de startpagina (WEEK-289)', () => {
  test('Famenu wordt Fa + menu; een andere naam blijft heel', () => {
    assert.deepEqual(merkDelen('Famenu'), ['Fa', 'menu']);
    assert.deepEqual(merkDelen(' Famenu '), ['Fa', 'menu']);
    assert.deepEqual(merkDelen('Gezond Boodschappen'), ['Gezond Boodschappen', '']);
  });

  test('in elke taal is het merk Famenu en heeft elk kenmerk een korte tekst', () => {
    for (const taal of TALEN) {
      assert.deepEqual(merkDelen(vertaal(taal, 'welkom.merk')), ['Fa', 'menu'], taal);
      for (const k of START_KENMERKEN) {
        const tekst = vertaal(taal, k.tekst);
        assert.ok(tekst.length > 0 && tekst.length <= 20, `${taal} ${k.tekst}: ${tekst}`);
      }
    }
  });
});

describe('sfeerfoto\'s (WEEK-289)', () => {
  test('elk uitlegscherm heeft een foto, en elke foto hoort bij de start of een uitlegscherm', () => {
    const gebruikt = UITLEG_SCHERMEN.map((s) => uitlegFoto(s));
    assert.ok(gebruikt.every((f) => f !== null), JSON.stringify(gebruikt));
    assert.deepEqual([...new Set(['start', ...gebruikt])].sort(), [...FOTO_SLEUTELS].sort());
  });

  test('elk bestand bestaat, is klein genoeg en het geheel blijft onder 0,8 MB', () => {
    let totaal = 0;
    const bestanden = [...FOTO_SLEUTELS.filter(heeftEigenFoto).map((k) => `${k}.jpg`), ...WEEKPLAN_BORDEN.map((d) => `bord-${d}.jpg`)];
    for (const bestand of bestanden) {
      const grootte = statSync(join(MAP, bestand)).size;
      assert.ok(grootte < 160 * 1024, `${bestand}: ${grootte}`);
      totaal += grootte;
    }
    assert.ok(totaal < 800 * 1024, `totaal ${totaal}`);
  });

  test('elke foto heeft een verhouding en een Pexels-bron, en staat in BRONNEN.md', () => {
    const bronnen = readFileSync(join(MAP, 'BRONNEN.md'), 'utf8');
    for (const sleutel of FOTO_SLEUTELS) {
      assert.ok(FOTO_VERHOUDING[sleutel] > 0.5 && FOTO_VERHOUDING[sleutel] < 2.5, sleutel);
      assert.ok(FOTO_BRON[sleutel].length > 0, sleutel);
      for (const id of FOTO_BRON[sleutel]) assert.ok(bronnen.includes(String(id)), `${sleutel} ${id}`);
    }
  });

  test('de foto bovenaan is een vast deel van het scherm, met een minimum', () => {
    assert.equal(heroHoogte(812), Math.round(812 * 0.44));
    assert.equal(heroHoogte(400), HERO_MIN);
  });

  test('enkel Plan je week heeft geen gewone foto (het toont de borden)', () => {
    assert.deepEqual(FOTO_SLEUTELS.filter((k) => !heeftEigenFoto(k)), ['weekplan']);
  });

  test('Plan je week: zeven borden, elke weekdag één keer, van maandag tot zondag, vier boven en drie onder', () => {
    assert.equal(WEEKPLAN_BORDEN.length, 7);
    assert.deepEqual([...WEEKPLAN_BORDEN].sort(), [...WEEKDAGEN].sort());
    assert.equal(WEEKPLAN_BORDEN[0], 'maandag');
    assert.equal(WEEKPLAN_BORDEN[6], 'zondag');
    assert.equal(BORDEN_BOVEN, 4);
  });

  test('korte dagnamen in elke taal: twee letters, binnen een taal allemaal verschillend', () => {
    assert.equal(dagKort('Maandag'), 'MA');
    assert.equal(dagKort('mercredi'), 'ME');
    for (const taal of TALEN) {
      const kort = WEEKDAGEN.map((d) => dagKort(vertaal(taal, `dag.${d}`)));
      assert.ok(kort.every((k) => k.length === 2), `${taal}: ${kort}`);
      assert.equal(new Set(kort).size, 7, `${taal}: ${kort}`);
    }
  });
});
