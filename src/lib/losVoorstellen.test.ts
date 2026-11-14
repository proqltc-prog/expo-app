import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { heeftExact, leesVoorstellen, LosVoorstel, MAX_BEWAARD, MAX_GETOOND, onthoudLos, staatErAl, uitFrigo, uitLijst, voegSamen, zoekLos } from '@/lib/losVoorstellen';

const v = (naam: string, laatst: string, extra: Partial<LosVoorstel> = {}): LosVoorstel => ({ naam, laatst, afdeling: 'overig', ...extra });

describe('WEEK-288: eerder ingevulde andere producten onthouden', () => {
  test('nieuw product vooraan, met hoeveelheid, eenheid en categorie', () => {
    const l = onthoudLos([v('melk', '2026-11-01T00:00:00.000Z')], { naam: ' Koffie ', hoeveelheid: 2, eenheid: 'pak', afdeling: 'overig' }, new Date('2026-11-14T10:00:00Z'));
    assert.equal(l[0].naam, 'Koffie');
    assert.equal(l[0].hoeveelheid, 2);
    assert.equal(l[0].eenheid, 'pak');
    assert.equal(l.length, 2);
  });
  test('dezelfde naam (hoofdletters, accenten) vervangt de oude', () => {
    const l = onthoudLos([v('Crème', '2026-11-01T00:00:00.000Z', { hoeveelheid: 1 })], { naam: 'creme', hoeveelheid: 3, afdeling: 'overig' }, new Date('2026-11-14T10:00:00Z'));
    assert.equal(l.length, 1);
    assert.equal(l[0].hoeveelheid, 3);
  });
  test('lege naam verandert niets', () => {
    assert.deepEqual(onthoudLos([], { naam: '  ', afdeling: 'overig' }, new Date()), []);
  });
  test('hoogstens MAX_BEWAARD producten', () => {
    let l: LosVoorstel[] = [];
    for (let i = 0; i < MAX_BEWAARD + 5; i++) l = onthoudLos(l, { naam: `p${i}`, afdeling: 'overig' }, new Date(Date.UTC(2026, 0, 1, 0, 0, i)));
    assert.equal(l.length, MAX_BEWAARD);
    assert.equal(l[0].naam, `p${MAX_BEWAARD + 4}`);
  });
});

describe('WEEK-288: voorstellen tijdens het typen', () => {
  const lijst = [
    v('Wc-papier', '2026-11-10T00:00:00.000Z'),
    v('Afwasmiddel', '2026-11-12T00:00:00.000Z'),
    v('Appelsap', '2026-11-11T00:00:00.000Z'),
    v('Zure appels', '2026-11-13T00:00:00.000Z'),
    v('Cola', '2026-11-09T00:00:00.000Z'),
  ];
  test('begint met gaat voor een woord dat begint, dat gaat voor bevat', () => {
    assert.deepEqual(zoekLos(lijst, 'ap').map((x) => x.naam), ['Appelsap', 'Zure appels', 'Wc-papier']);
    assert.deepEqual(zoekLos(lijst, 'pap').map((x) => x.naam), ['Wc-papier']);
    assert.deepEqual(zoekLos(lijst, 'middel').map((x) => x.naam), ['Afwasmiddel']);
  });
  test('zonder accenten en hoofdletters', () => {
    assert.deepEqual(zoekLos([v('Crème fraîche', '2026-11-01T00:00:00.000Z')], 'CREME').map((x) => x.naam), ['Crème fraîche']);
  });
  test('leeg zoekveld of niets gevonden: geen voorstellen', () => {
    assert.deepEqual(zoekLos(lijst, ''), []);
    assert.deepEqual(zoekLos(lijst, 'xyz'), []);
  });
  test('hoogstens MAX_GETOOND voorstellen', () => {
    const veel = Array.from({ length: 20 }, (_, i) => v(`thee ${i}`, `2026-11-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`));
    assert.equal(zoekLos(veel, 'thee').length, MAX_GETOOND);
    assert.equal(zoekLos(veel, 'thee')[0].naam, 'thee 19');
  });
  test('exact gevonden of niet (bepaalt de regel "toevoegen als nieuw product")', () => {
    assert.equal(heeftExact(lijst, 'cola'), true);
    assert.equal(heeftExact(lijst, 'col'), false);
    assert.equal(heeftExact(lijst, ''), false);
  });
});

describe('WEEK-288: bronnen samenvoegen en inlezen', () => {
  test('per naam blijft het recentste', () => {
    const s = voegSamen([v('Melk', '2026-11-01T00:00:00.000Z', { hoeveelheid: 1 })], [v('melk', '2026-11-05T00:00:00.000Z', { hoeveelheid: 2 })]);
    assert.equal(s.length, 1);
    assert.equal(s[0].hoeveelheid, 2);
  });
  test('ongeldige bewaarde gegevens vallen weg', () => {
    const l = leesVoorstellen([null, 3, { naam: '' , laatst: 'x' }, { naam: 'Melk' }, { naam: 'Kaas', laatst: '2026-11-01T00:00:00.000Z', hoeveelheid: 'veel', eenheid: 'g' }]);
    assert.deepEqual(l, [{ naam: 'Kaas', laatst: '2026-11-01T00:00:00.000Z', afdeling: 'overig', eenheid: 'g' }]);
    assert.deepEqual(leesVoorstellen('kapot'), []);
  });
});

describe('WEEK-288: voorstellen uit de lijst en uit In huis', () => {
  test('enkel andere producten, geen weekmenu-items', () => {
    const l = uitLijst([
      { naam: 'Cola', hoeveelheid: 2, eenheid: 'fles' },
      { naam: 'ui', code: 'ui', recept: { dag: 'ma' } },
    ]);
    assert.deepEqual(l, [{ naam: 'Cola', afdeling: 'overig', laatst: '', hoeveelheid: 2, eenheid: 'fles' }]);
    const f = uitFrigo([
      { naam: 'Thee', afdeling: 'overig', toegevoegdOp: '2026-11-01T00:00:00.000Z', bron: 'los' },
      { naam: 'wortel', afdeling: 'groenten-fruit', toegevoegdOp: '2026-11-01T00:00:00.000Z', bron: 'planner' },
      { naam: 'oud', afdeling: 'overig', toegevoegdOp: '2026-11-01T00:00:00.000Z', lijstId: 'x' },
    ]);
    assert.deepEqual(f.map((x) => x.naam), ['Thee']);
  });
  test('vinkje bij een product dat er al staat', () => {
    assert.equal(staatErAl(['Crème'], 'creme'), true);
    assert.equal(staatErAl(['Cola'], 'Thee'), false);
  });
  test('regressie: een bewaard voorstel gaat voor hetzelfde product op de lijst zonder datum', () => {
    const s = voegSamen([v('Cola', '2026-11-01T00:00:00.000Z', { hoeveelheid: 6 })], uitLijst([{ naam: 'cola', hoeveelheid: 1 }]));
    assert.equal(s[0].hoeveelheid, 6);
  });
});
