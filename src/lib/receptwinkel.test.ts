import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { winkelVanBron } from '@/lib/receptwinkel';

describe('winkel van een recept uit de bron (WEEK-219)', () => {
  test('AH, Delhaize en Colruyt worden herkend', () => {
    assert.equal(winkelVanBron('https://www.ah.be/allerhande/recept/R-R7968/mosselen-koken'), 'ah');
    assert.equal(winkelVanBron('https://ah.nl/allerhande/recept/R-R237822/waterzooi-van-zalm-en-prei'), 'ah');
    assert.equal(winkelVanBron('https://www.delhaize.be/nl/recepten/receptDetails/Zalm-met-dille-roomsaus/r/R00026822'), 'delhaize');
    assert.equal(winkelVanBron('https://www.colruyt.be/nl/recepten/toscaans-stoofvlees'), 'colruyt');
  });

  test('andere sites en ongeldige bronnen geven geen winkel (regressie: bestaande blogrecepten)', () => {
    assert.equal(winkelVanBron('https://thewoksoflife.com/egg-fried-rice/'), undefined);
    assert.equal(winkelVanBron('https://dagelijksekost.vrt.be/gerechten/enchilada-met-kip'), undefined);
    assert.equal(winkelVanBron('https://www.lookalike-ah.be.evil.com/x'), undefined);
    assert.equal(winkelVanBron('https://notah.be/x'), undefined);
    assert.equal(winkelVanBron('geen url'), undefined);
    assert.equal(winkelVanBron(''), undefined);
    assert.equal(winkelVanBron(null), undefined);
  });
});
