import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { dagKort, FOTO_BRON, FOTO_SLEUTELS, FOTO_VERHOUDING, kaartVerhouding, KAART_VERHOUDING, uitlegFoto, WEEKPLAN_BLAADJES } from '@/lib/welkomFotos';
import { UITLEG_SCHERMEN } from '@/lib/welkom';
import { WEEKDAGEN } from '@/lib/planner/types';
import { vertaal, TALEN } from '@/i18n';

const MAP = join(__dirname, '..', '..', 'assets', 'welkom');

describe('sfeerfoto\'s (WEEK-289)', () => {
  test('elk uitlegscherm heeft een foto, en elke foto hoort bij de start of een uitlegscherm', () => {
    const gebruikt = UITLEG_SCHERMEN.map((s) => uitlegFoto(s));
    assert.ok(gebruikt.every((f) => f !== null), JSON.stringify(gebruikt));
    assert.deepEqual([...new Set(['start', ...gebruikt])].sort(), [...FOTO_SLEUTELS].sort());
  });

  test('elk bestand bestaat, is klein genoeg en het geheel blijft onder 0,8 MB', () => {
    let totaal = 0;
    for (const sleutel of FOTO_SLEUTELS) {
      const grootte = statSync(join(MAP, `${sleutel}.jpg`)).size;
      assert.ok(grootte < 160 * 1024, `${sleutel}: ${grootte}`);
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

  test('alle fotokaarten even groot, en Plan je week wordt niet bijgesneden', () => {
    for (const sleutel of FOTO_SLEUTELS) assert.equal(kaartVerhouding(sleutel), KAART_VERHOUDING, sleutel);
    assert.equal(KAART_VERHOUDING, FOTO_VERHOUDING.weekplan); // de blaadjes liggen op de borden
  });

  test('Plan je week: zeven blaadjes, elke weekdag één keer, binnen de foto', () => {
    assert.deepEqual(WEEKPLAN_BLAADJES.map((b) => b.dag).sort(), [...WEEKDAGEN].sort());
    for (const b of WEEKPLAN_BLAADJES) {
      assert.ok(b.x > 5 && b.x < 95 && b.y > 5 && b.y < 95, b.dag);
      assert.ok(Math.abs(b.kanteling) <= 8, b.dag);
    }
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
