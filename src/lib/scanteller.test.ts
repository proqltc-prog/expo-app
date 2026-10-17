import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bonusVandaag, dagVan, GRATIS_SCANS_PER_DAG, leesTeller, magScannen, resterendeScans, telScan, voegBonusToe } from '@/lib/scanteller';

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

describe('bonusscans van reclamefilmpjes (WEEK-38)', () => {
  test('een filmpje geeft extra scans voor die dag', () => {
    let teller = null;
    for (let i = 0; i < 3; i++) teller = telScan(teller, ochtend);
    assert.equal(magScannen(teller, ochtend), false);
    teller = voegBonusToe(teller, ochtend, 3);
    assert.equal(resterendeScans(teller, ochtend), 3);
    assert.equal(magScannen(teller, ochtend), true);
    assert.equal(bonusVandaag(teller, ochtend), 3);
  });

  test('bonusscans tellen mee met het dagelijkse maximum', () => {
    let teller = voegBonusToe(null, ochtend, 3);
    for (let i = 0; i < 6; i++) teller = telScan(teller, ochtend);
    assert.equal(resterendeScans(teller, ochtend), 0);
  });

  test('bonus van gisteren geldt vandaag niet meer', () => {
    const teller = voegBonusToe(null, ochtend, 3);
    assert.equal(bonusVandaag(teller, morgen), 0);
    assert.equal(resterendeScans(teller, morgen), GRATIS_SCANS_PER_DAG);
  });

  test('een nieuwe scan behoudt de bonus van vandaag', () => {
    const teller = telScan(voegBonusToe(null, ochtend, 3), ochtend);
    assert.deepEqual(teller, { dag: dagVan(ochtend), aantal: 1, bonus: 3 });
  });

  test('zonder bonus blijft de teller zoals voorheen (geen bonus-veld)', () => {
    assert.deepEqual(telScan(null, ochtend), { dag: dagVan(ochtend), aantal: 1 });
    assert.deepEqual(leesTeller({ dag: '2026-10-11', aantal: 2, bonus: 0 }), { dag: '2026-10-11', aantal: 2 });
  });

  test('bewaarde bonus lezen en foute waarden negeren', () => {
    assert.deepEqual(leesTeller({ dag: '2026-10-11', aantal: 1, bonus: 3 }), { dag: '2026-10-11', aantal: 1, bonus: 3 });
    assert.deepEqual(leesTeller({ dag: '2026-10-11', aantal: 1, bonus: 'veel' }), { dag: '2026-10-11', aantal: 1 });
  });

  test('negatieve of nul extra scans veranderen niets', () => {
    assert.deepEqual(voegBonusToe(null, ochtend, -2), { dag: dagVan(ochtend), aantal: 0 });
  });
});

