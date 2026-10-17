import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dagVan, GRATIS_SCANS_PER_DAG, leesTeller, magScannen, resterendeScans, telScan } from '@/lib/scanteller';

// Lokale tijd, zoals op het toestel.
const ochtend = new Date(2026, 9, 11, 8, 0);
const avond = new Date(2026, 9, 11, 23, 59);
const morgen = new Date(2026, 9, 12, 0, 1);

describe('scanlimiet (WEEK-34)', () => {
  test('gratis: 3 scans per dag', () => {
    assert.equal(GRATIS_SCANS_PER_DAG, 3);
    let teller = null;
    for (let i = 0; i < 3; i++) {
      assert.equal(magScannen(teller, ochtend), true);
      teller = telScan(teller, ochtend);
    }
    assert.equal(resterendeScans(teller, avond), 0);
    assert.equal(magScannen(teller, avond), false);
  });

  test('een nieuwe dag begint opnieuw', () => {
    const vol = { dag: dagVan(ochtend), aantal: 3 };
    assert.equal(magScannen(vol, morgen), true);
    assert.equal(resterendeScans(vol, morgen), 3);
    assert.deepEqual(telScan(vol, morgen), { dag: dagVan(morgen), aantal: 1 });
  });

  test('op is op: ook met veel scans blijft het bij nul', () => {
    const veel = { dag: dagVan(ochtend), aantal: 50 };
    assert.equal(resterendeScans(veel, ochtend), 0);
    assert.equal(magScannen(veel, ochtend), false);
  });

  test('dag volgens de klok van het toestel', () => {
    assert.equal(dagVan(new Date(2026, 0, 5, 12)), '2026-01-05');
  });

  test('bewaarde teller lezen', () => {
    assert.deepEqual(leesTeller({ dag: '2026-10-11', aantal: 2 }), { dag: '2026-10-11', aantal: 2 });
    assert.equal(leesTeller(null), null);
    assert.equal(leesTeller({ dag: 'gisteren', aantal: 2 }), null);
    assert.equal(leesTeller({ dag: '2026-10-11', aantal: -1 }), null);
    assert.equal(leesTeller({ dag: '2026-10-11', aantal: 'twee' }), null);
  });
});
