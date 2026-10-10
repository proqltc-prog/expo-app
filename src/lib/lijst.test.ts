import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { aantalReceptRegels, itemsUitPlan, leesLijstItem, LijstItem, normaliseerLijst, samenvoegen, vasteItems, vinkAf, voegPlanToe } from '@/lib/lijst';
import { VASTE_ITEMS } from '@/data/vasteItems';
import type { PlanDag, PlanRecept } from '@/lib/planner/types';

const recept = (naam: string, ingredienten: PlanRecept['ingredienten']): PlanRecept => ({
  id: naam, naam, soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten,
});

const dagen: PlanDag[] = [
  { dag: 'zondag', recept: recept('Pasta pesto', [
    { naam: 'pasta', hoeveelheid: 300, eenheid: 'g', afdeling: 'droge-voeding' },
    { naam: 'ui', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit' },
  ]) },
  { dag: 'maandag', recept: recept('Pasta tonijn', [
    { naam: 'Pasta', hoeveelheid: 200, eenheid: 'g', afdeling: 'droge-voeding' },
    { naam: 'brood', hoeveelheid: 240, eenheid: 'g', afdeling: 'brood' },
  ]) },
];

const AANTAL_VAST = VASTE_ITEMS.flatMap((c) => c.items).length;

describe('itemsUitPlan', () => {
  test('één item per ingrediënt per recept, gekoppeld aan dag en recept', () => {
    const items = itemsUitPlan(dagen);
    assert.equal(items.length, 4);
    assert.deepEqual(items[0].recept, { dag: 'zondag', naam: 'Pasta pesto' });
    assert.equal(items[0].afdeling, 'droge-voeding');
    assert.ok(items.every((i) => i.categorie === 'avondeten' && !i.afgevinkt));
    assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  });
});

describe('voegPlanToe (WEEK-15)', () => {
  test('zet alle ingrediënten van het plan en de vaste items op een lege lijst', () => {
    const lijst = voegPlanToe([], dagen, 'nl');
    assert.equal(lijst.filter((i) => i.recept).length, 4);
    // "brood" zit in een recept, dus het vaste item brood komt er niet apart bij
    assert.equal(lijst.filter((i) => !i.recept).length, AANTAL_VAST - 1);
    assert.equal(lijst.filter((i) => i.naam === 'brood').length, 1);
  });

  test('opnieuw overzetten geeft geen dubbels en behoudt vinkjes', () => {
    const eerst = voegPlanToe([], dagen, 'nl');
    const afgevinkt = vinkAf(eerst, [eerst[0].id], true);
    const opnieuw = voegPlanToe(afgevinkt, dagen, 'nl');
    assert.equal(opnieuw.length, eerst.length);
    assert.equal(opnieuw.find((i) => i.id === eerst[0].id)?.afgevinkt, true);
  });

  test('een nieuw plan vervangt de items van het vorige plan', () => {
    const eerst = voegPlanToe([], dagen, 'nl');
    const ander: PlanDag[] = [{ dag: 'zondag', recept: recept('Soep', [{ naam: 'prei', hoeveelheid: 2, eenheid: 'stuk', afdeling: 'groenten-fruit' }]) }];
    const lijst = voegPlanToe(eerst, ander, 'nl');
    assert.deepEqual(lijst.filter((i) => i.recept).map((i) => i.naam), ['prei']);
    assert.ok(!lijst.some((i) => i.naam.toLowerCase() === 'pasta'));
    // brood zit niet meer in een recept: nu komt het vaste item terug
    assert.ok(lijst.some((i) => i.id === 'brood-beleg-brood'));
  });

  test('zelf toegevoegde en gescande items blijven staan, met hun vinkje', () => {
    const eigen: LijstItem[] = [
      { id: 'extra-1', naam: 'kaarsjes', categorie: 'extra', afgevinkt: false },
      { id: 'scan-1', naam: 'Yoghurt', categorie: 'gescand', afgevinkt: true },
    ];
    const lijst = voegPlanToe(eigen, dagen, 'nl');
    assert.ok(lijst.some((i) => i.id === 'extra-1' && !i.afgevinkt));
    assert.ok(lijst.some((i) => i.id === 'scan-1' && i.afgevinkt));
  });

  test('een afgevinkt vast item blijft afgevinkt en komt er niet nog eens bij', () => {
    const eerst = voegPlanToe([], dagen, 'nl');
    const appels = eerst.find((i) => i.id === 'fruit-appels')!;
    const lijst = voegPlanToe(vinkAf(eerst, [appels.id], true), dagen, 'nl');
    const alleAppels = lijst.filter((i) => i.id === 'fruit-appels');
    assert.equal(alleAppels.length, 1);
    assert.equal(alleAppels[0].afgevinkt, true);
  });

  test('items uit een oudere versie zonder receptkoppeling worden vervangen', () => {
    const oud: LijstItem[] = [{ id: 'avondeten-rijst|g', naam: 'rijst', categorie: 'avondeten', afgevinkt: false, hoeveelheid: 300, eenheid: 'g' }];
    const lijst = voegPlanToe(oud, dagen, 'nl');
    assert.ok(!lijst.some((i) => i.naam === 'rijst'));
  });

  test('vaste items in de taal van de gebruiker', () => {
    assert.ok(voegPlanToe([], [], 'fr').some((i) => i.categorie === 'fruit' && i.naam === 'pommes'));
    assert.ok(vasteItems('de').some((i) => i.naam === 'Zahnpasta'));
  });
});

describe('samenvoegen', () => {
  test('telt hetzelfde ingrediënt met dezelfde eenheid samen (hoofdletterongevoelig)', () => {
    const regels = samenvoegen(itemsUitPlan(dagen));
    const pasta = regels.filter((r) => r.naam.toLowerCase() === 'pasta');
    assert.equal(pasta.length, 1);
    assert.equal(pasta[0].hoeveelheid, 500);
    assert.deepEqual(pasta[0].recepten, ['Pasta pesto', 'Pasta tonijn']);
    assert.equal(pasta[0].ids.length, 2);
  });

  test('verschillende eenheden worden niet opgeteld', () => {
    const items: LijstItem[] = [
      { id: 'a', naam: 'melk', categorie: 'avondeten', afgevinkt: false, hoeveelheid: 200, eenheid: 'ml' },
      { id: 'b', naam: 'melk', categorie: 'avondeten', afgevinkt: false, hoeveelheid: 1, eenheid: 'stuk' },
    ];
    assert.equal(samenvoegen(items).length, 2);
  });

  test('een regel is pas afgevinkt als alle onderliggende items afgevinkt zijn', () => {
    const items = itemsUitPlan(dagen);
    const pastaIds = items.filter((i) => i.naam.toLowerCase() === 'pasta').map((i) => i.id);
    const half = vinkAf(items, [pastaIds[0]], true);
    assert.equal(samenvoegen(half).find((r) => r.naam === 'pasta')!.afgevinkt, false);
    const heel = vinkAf(items, pastaIds, true);
    assert.equal(samenvoegen(heel).find((r) => r.naam === 'pasta')!.afgevinkt, true);
  });
});

describe('aantalReceptRegels', () => {
  test('telt verschillende ingrediënten uit de recepten', () => {
    assert.equal(aantalReceptRegels(voegPlanToe([], dagen, 'nl')), 3);
  });
});

describe('weergaven (WEEK-16)', () => {
  const metEigen = (): LijstItem[] => [
    ...voegPlanToe([], dagen, 'nl'),
    { id: 'extra-1', naam: 'pasta', categorie: 'extra', afgevinkt: false, hoeveelheid: 500, eenheid: 'g', afdeling: 'droge-voeding' },
    { id: 'extra-2', naam: 'kaarsjes', categorie: 'extra', afgevinkt: false },
  ];

  test('per recept: recepten in de volgorde van de week, daarna de overige categorieën', async () => {
    const { perRecept } = await import('@/lib/lijst');
    const omgekeerd = [...metEigen()].reverse();
    const s = perRecept(omgekeerd);
    const recepten = s.filter((x) => x.soort === 'recept');
    assert.deepEqual(recepten.map((x) => (x.soort === 'recept' ? x.dag : '')), ['zondag', 'maandag']);
    assert.ok(s.findIndex((x) => x.soort === 'categorie') > s.findIndex((x) => x.soort === 'recept'));
  });

  test('per recept: elk recept toont enkel zijn eigen ingrediënten en hoeveelheden', async () => {
    const { perRecept } = await import('@/lib/lijst');
    const s = perRecept(metEigen());
    const pesto = s.find((x) => x.soort === 'recept' && x.recept === 'Pasta pesto')!;
    assert.deepEqual(pesto.regels.map((r) => [r.naam, r.hoeveelheid]), [['pasta', 300], ['ui', 1]]);
    const tonijn = s.find((x) => x.soort === 'recept' && x.recept === 'Pasta tonijn')!;
    assert.equal(tonijn.regels.find((r) => r.naam === 'Pasta')!.hoeveelheid, 200);
  });

  test('per categorie: gegroepeerd per winkelafdeling, dubbels over recepten én eigen items samengeteld', async () => {
    const { perAfdeling } = await import('@/lib/lijst');
    const s = perAfdeling(metEigen());
    const droog = s.find((x) => x.soort === 'afdeling' && x.afdeling === 'droge-voeding')!;
    const pasta = droog.regels.filter((r) => r.naam.toLowerCase() === 'pasta');
    assert.equal(pasta.length, 1);
    assert.equal(pasta[0].hoeveelheid, 1000);
    assert.equal(pasta[0].ids.length, 3);
  });

  test('per categorie: afdelingen in winkelvolgorde, "overig" achteraan', async () => {
    const { perAfdeling } = await import('@/lib/lijst');
    const namen = perAfdeling(metEigen()).map((x) => (x.soort === 'afdeling' ? x.afdeling : ''));
    assert.equal(namen[0], 'groenten-fruit');
    assert.equal(namen[namen.length - 1], 'overig');
    const overig = perAfdeling(metEigen()).at(-1)!;
    assert.ok(overig.regels.some((r) => r.naam === 'kaarsjes'));
    assert.ok(overig.regels.some((r) => r.naam === 'tandpasta'));
  });

  test('vaste items liggen in de juiste afdeling, ook als ze uit een oudere versie komen', async () => {
    const { afdelingVan } = await import('@/lib/lijst');
    assert.equal(afdelingVan({ id: 'fruit-appels', naam: 'appels', categorie: 'fruit', afgevinkt: false }), 'groenten-fruit');
    assert.equal(afdelingVan({ id: 'huishouden-wc-papier', naam: 'wc-papier', categorie: 'huishouden', afgevinkt: false }), 'overig');
    assert.equal(afdelingVan({ id: 'extra-9', naam: 'x', categorie: 'extra', afgevinkt: false }), 'overig');
  });

  test('afvinken in de ene weergave is zichtbaar in de andere', async () => {
    const { perAfdeling, perRecept } = await import('@/lib/lijst');
    const items = metEigen();
    const pestoPasta = perRecept(items).find((x) => x.soort === 'recept' && x.recept === 'Pasta pesto')!.regels[0];
    const na = vinkAf(items, pestoPasta.ids, true);
    // per categorie: pasta is nog niet volledig afgevinkt (ook nog in tonijn en eigen item)
    const pasta = perAfdeling(na).flatMap((x) => x.regels).find((r) => r.naam.toLowerCase() === 'pasta')!;
    assert.equal(pasta.afgevinkt, false);
    // alles afvinken in de categorieweergave vinkt het af in elk recept
    const alles = vinkAf(na, pasta.ids, true);
    const tonijn = perRecept(alles).find((x) => x.soort === 'recept' && x.recept === 'Pasta tonijn')!;
    assert.equal(tonijn.regels.find((r) => r.naam === 'Pasta')!.afgevinkt, true);
  });

  test('isWeergave', async () => {
    const { isWeergave } = await import('@/lib/lijst');
    assert.ok(isWeergave('recept') && isWeergave('categorie'));
    assert.ok(!isWeergave('alfabet'));
  });
});

describe('leesLijstItem / normaliseerLijst (WEEK-8)', () => {
  test('leest een volledig item ongewijzigd in', () => {
    const [i] = itemsUitPlan(dagen);
    assert.deepEqual(leesLijstItem(JSON.parse(JSON.stringify(i))), i);
    const eigen = { id: 'extra-1', naam: 'wc-papier', categorie: 'extra', afgevinkt: true, door: 'Pauline' };
    assert.deepEqual(leesLijstItem(eigen), eigen);
  });
  test('vult ontbrekende velden aan en laat foute velden weg', () => {
    assert.deepEqual(
      leesLijstItem({ id: 'x', naam: 'melk', hoeveelheid: -1, afdeling: 'maan', recept: { dag: 'feestdag', naam: 'r' }, afgevinkt: 'ja' }),
      { id: 'x', naam: 'melk', categorie: 'extra', afgevinkt: false }
    );
  });
  test('geen id of naam = onbruikbaar', () => {
    assert.equal(leesLijstItem({ naam: 'melk' }), null);
    assert.equal(leesLijstItem({ id: 'x', naam: '  ' }), null);
    assert.equal(leesLijstItem('melk'), null);
  });
  test('normaliseerLijst slaat onbruikbare items over', () => {
    assert.deepEqual(normaliseerLijst([{ id: 'a', naam: 'a', categorie: 'extra', afgevinkt: false }, null, { id: 'b' }]).map((i) => i.id), ['a']);
    assert.deepEqual(normaliseerLijst({}), []);
  });
});
