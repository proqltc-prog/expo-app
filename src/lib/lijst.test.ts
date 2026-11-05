import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { trekFrigoAf } from '@/lib/frigo';
import { alleenHuidigPlan, aantalReceptRegels, bewerkLijstItem, eigenItem, itemsUitPlan, leesLijstItem, lijstSheet, magBewerken, opSheet, perAfdeling, perRecept, planSleutel, LijstItem, LijstRegel, normaliseerLijst, receptItem, samenvoegen, sectieKeuze, staatOpLijst, telRegels, vinkAf, voegPlanToe } from '@/lib/lijst';
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

describe('itemsUitPlan', () => {
  test('één item per ingrediënt per recept, gekoppeld aan dag en recept', () => {
    const items = itemsUitPlan(dagen);
    assert.equal(items.length, 4);
    assert.deepEqual(items[0].recept, { dag: 'zondag', naam: 'Pasta pesto', id: 'Pasta pesto' });
    assert.equal(items[0].afdeling, 'droge-voeding');
    assert.ok(items.every((i) => i.categorie === 'avondeten' && !i.afgevinkt));
    assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  });
});

describe('vaste items bestaan niet meer (WEEK-155)', () => {
  test('een nieuw weekplan zet geen vaste items op de lijst', () => {
    const lijst = voegPlanToe([], dagen, 'nl');
    assert.equal(lijst.filter((i) => !i.recept).length, 0);
  });
  test('oude vaste items uit een opgeslagen lijst worden bij het inlezen weggelaten', () => {
    const oud = [
      { id: 'brood-beleg-brood', naam: 'brood', categorie: 'brood-beleg', afgevinkt: false },
      { id: 'school-koekjes', naam: 'koekjes', categorie: 'school', afgevinkt: false },
      { id: 'extra-9', naam: 'Zout', categorie: 'extra', afgevinkt: false },
    ];
    assert.deepEqual(normaliseerLijst(oud).map((i) => i.id), ['extra-9']);
  });
});

describe('voegPlanToe (WEEK-15)', () => {
  test('zet alle ingrediënten van het plan op een lege lijst', () => {
    const lijst = voegPlanToe([], dagen, 'nl');
    assert.equal(lijst.filter((i) => i.recept).length, 4);
    assert.equal(lijst.filter((i) => !i.recept).length, 0);
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

  test('een afgevinkt ingrediënt blijft afgevinkt en komt er niet nog eens bij', () => {
    const eerst = voegPlanToe([], dagen, 'nl');
    const ui = eerst.find((i) => i.recept)!;
    const lijst = voegPlanToe(vinkAf(eerst, [ui.id], true), dagen, 'nl');
    const alleUi = lijst.filter((i) => i.id === ui.id);
    assert.equal(alleUi.length, 1);
    assert.equal(alleUi[0].afgevinkt, true);
  });

  test('items uit een oudere versie zonder receptkoppeling worden vervangen', () => {
    const oud: LijstItem[] = [{ id: 'avondeten-rijst|g', naam: 'rijst', categorie: 'avondeten', afgevinkt: false, hoeveelheid: 300, eenheid: 'g' }];
    const lijst = voegPlanToe(oud, dagen, 'nl');
    assert.ok(!lijst.some((i) => i.naam === 'rijst'));
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
  });

  test('een item zonder afdeling komt onder overig', async () => {
    const { afdelingVan } = await import('@/lib/lijst');
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

describe('gedeelde lijst: wie voegde toe en wie vinkte af (WEEK-17)', () => {
  const basis = itemsUitPlan(dagen);
  const pasta = basis.filter((i) => i.naam.toLowerCase() === 'pasta').map((i) => i.id);

  test('afvinken onthoudt wie afvinkte; een vinkje weghalen wist de naam', () => {
    const afgevinkt = vinkAf(basis, [pasta[0]], true, 'Pauline');
    assert.equal(afgevinkt.find((i) => i.id === pasta[0])!.afgevinktDoor, 'Pauline');
    const terug = vinkAf(afgevinkt, [pasta[0]], false, 'Maarten');
    const item = terug.find((i) => i.id === pasta[0])!;
    assert.equal(item.afgevinkt, false);
    assert.ok(!('afgevinktDoor' in item));
  });

  test('wie al eerder afvinkte, blijft staan als een ander de hele regel afvinkt', () => {
    const een = vinkAf(basis, [pasta[0]], true, 'Pauline');
    const twee = vinkAf(een, pasta, true, 'Maarten');
    assert.deepEqual(twee.filter((i) => pasta.includes(i.id)).map((i) => i.afgevinktDoor), ['Pauline', 'Maarten']);
    const [regel] = samenvoegen(twee.filter((i) => pasta.includes(i.id)), { overCategorieen: true });
    assert.deepEqual(regel.afgevinktDoor, ['Pauline', 'Maarten']);
  });

  test('zonder gezinsruimte (geen naam) wordt er geen naam bewaard', () => {
    const item = vinkAf(basis, [pasta[0]], true).find((i) => i.id === pasta[0])!;
    assert.equal(item.afgevinkt, true);
    assert.ok(!('afgevinktDoor' in item));
  });

  test('een regel toont wie het item toevoegde, en enkel de namen van wat echt afgevinkt is', () => {
    const items: LijstItem[] = [
      { id: 'extra-1', naam: 'wc-papier', categorie: 'extra', afgevinkt: false, door: 'Pauline' },
      { id: 'extra-2', naam: 'WC-papier', categorie: 'extra', afgevinkt: false, afgevinktDoor: 'oud' },
    ];
    const [regel] = samenvoegen(items);
    assert.equal(regel.door, 'Pauline');
    assert.deepEqual(regel.afgevinktDoor, []);
  });

  test('eigenItem: met naam van wie toevoegde, lege tekst = niets', () => {
    const nu = new Date('2026-10-10T12:00:00Z');
    assert.deepEqual(eigenItem('  chips ', nu, 'Maarten'), { id: `extra-${nu.getTime()}`, naam: 'chips', categorie: 'extra', afgevinkt: false, door: 'Maarten' });
    assert.deepEqual(eigenItem('chips', nu), { id: `extra-${nu.getTime()}`, naam: 'chips', categorie: 'extra', afgevinkt: false });
    assert.equal(eigenItem('   ', nu, 'Maarten'), null);
  });

  describe('zoekfunctie op de lijst (WEEK-164)', () => {
    const nu = new Date('2026-10-26T12:00:00Z');
    const tomaat = { code: 'tomaat', naam: 'Tomaat', afdeling: 'groenten-fruit' as const, eenheid: 'stuk' };

    test('een databank-ingrediënt komt met code, eenheid, afdeling en categorie extra op de lijst', () => {
      const [item] = receptItem([], tomaat, nu);
      assert.equal(item.naam, 'Tomaat');
      assert.equal(item.code, 'tomaat');
      assert.equal(item.eenheid, 'stuk');
      assert.equal(item.afdeling, 'groenten-fruit');
      assert.equal(item.categorie, 'extra');
      assert.equal(item.afgevinkt, false);
      assert.equal(item.hoeveelheid, undefined);
    });

    test('een optionele hoeveelheid en de naam van wie toevoegde worden meegegeven', () => {
      const [item] = receptItem([], tomaat, nu, 3, 'Maarten');
      assert.equal(item.hoeveelheid, 3);
      assert.equal(item.door, 'Maarten');
    });

    test('dezelfde code staat al open op de lijst: geen dubbele regel', () => {
      const een = receptItem([], tomaat, nu);
      assert.equal(receptItem(een, tomaat, nu).length, 1);
    });

    test('een afgevinkt item met dezelfde code blokkeert niet: het mag opnieuw', () => {
      const een = receptItem([], tomaat, nu).map((i) => ({ ...i, afgevinkt: true }));
      assert.equal(receptItem(een, tomaat, new Date(nu.getTime() + 1000)).length, 2);
    });

    test('een open weekmenu-item met dezelfde code telt ook als "al op de lijst"', () => {
      const uitPlan: LijstItem = { id: 'x', naam: 'tomaat', categorie: 'avondeten', afgevinkt: false, code: 'tomaat' };
      assert.equal(receptItem([uitPlan], tomaat, nu).length, 1);
      assert.equal(staatOpLijst([uitPlan], 'tomaat'), true);
    });

    test('staatOpLijst: alleen open items met de code tellen', () => {
      assert.equal(staatOpLijst([], 'tomaat'), false);
      assert.equal(staatOpLijst([{ id: 'x', naam: 'Tomaat', categorie: 'extra', afgevinkt: true, code: 'tomaat' }], 'tomaat'), false);
    });

    test('regressie: een losse product via eigenItem blijft zonder code en afdeling', () => {
      const item = eigenItem('Zelfgemaakte sambal', nu);
      assert.equal(item?.code, undefined);
      assert.equal(item?.afdeling, undefined);
      assert.equal(item?.categorie, 'extra');
    });

    test('regressie: een databank-item en een los product tellen samen als twee regels', () => {
      const met = receptItem([], tomaat, nu);
      const beide = [...met, eigenItem('Zelfgemaakte sambal', nu)!];
      assert.equal(samenvoegen(beide).length, 2);
    });
  });

  test('inlezen bewaart afgevinktDoor enkel bij een afgevinkt item', () => {
    assert.equal(leesLijstItem({ id: 'a', naam: 'a', afgevinkt: true, afgevinktDoor: 'Pauline' })!.afgevinktDoor, 'Pauline');
    assert.ok(!('afgevinktDoor' in leesLijstItem({ id: 'a', naam: 'a', afgevinkt: false, afgevinktDoor: 'Pauline' })!));
  });
});

describe('lijstitems per weekplan (WEEK-29)', () => {
  test('planSleutel: hetzelfde plan geeft dezelfde sleutel, een ander plan een andere', () => {
    assert.equal(planSleutel({ gemaaktOp: '2026-10-10T10:00:00.000Z' }), planSleutel({ gemaaktOp: '2026-10-10T10:00:00.000Z' }));
    assert.notEqual(planSleutel({ gemaaktOp: '2026-10-10T10:00:00.000Z' }), planSleutel({ gemaaktOp: '2026-10-17T10:00:00.000Z' }));
    assert.match(planSleutel({ gemaaktOp: 'raar!' }), /^[a-z0-9]+$/);
  });
  test('dezelfde maaltijd in twee weken krijgt verschillende ids', () => {
    const week1 = itemsUitPlan(dagen, 'a1');
    const week2 = itemsUitPlan(dagen, 'b2');
    assert.ok(week1.every((i) => !week2.some((j) => j.id === i.id)));
    assert.ok(week1[0].id.startsWith('recept-a1-zondag-'));
  });
  test('hetzelfde ingrediënt twee keer in één recept wordt één item met de som', () => {
    const dubbel: PlanDag[] = [{ dag: 'maandag', recept: recept('Salade', [
      { naam: 'olijfolie', hoeveelheid: 15, eenheid: 'ml', afdeling: 'conserven-sauzen' },
      { naam: 'Olijfolie', hoeveelheid: 30, eenheid: 'ml', afdeling: 'conserven-sauzen' },
      { naam: 'olijfolie', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'conserven-sauzen' },
    ]) }];
    const items = itemsUitPlan(dubbel, 'x');
    assert.equal(new Set(items.map((i) => i.id)).size, items.length);
    assert.deepEqual(items.map((i) => [i.eenheid, i.hoeveelheid]), [['ml', 45], ['stuk', 1]]);
  });
  test('opnieuw overzetten van hetzelfde plan behoudt vinkjes; een nieuw plan vervangt de items', () => {
    const eerst = voegPlanToe([], dagen, 'nl', undefined, 'w1');
    const gekocht = vinkAf(eerst, [eerst[0].id], true);
    const opnieuw = voegPlanToe(gekocht, dagen, 'nl', undefined, 'w1');
    assert.equal(opnieuw.find((i) => i.id === eerst[0].id)?.afgevinkt, true);
    const volgendeWeek = voegPlanToe(gekocht, dagen, 'nl', undefined, 'w2');
    assert.ok(volgendeWeek.filter((i) => i.recept).every((i) => i.id.includes('-w2-') && !i.afgevinkt));
  });
  test('frigo: restjes van vorige week worden afgetrokken en het nieuw gekochte komt erbij', async () => {
    const { pasFrigoAan, trekFrigoAf } = await import('@/lib/frigo');
    const week1 = itemsUitPlan(dagen, 'w1');
    const frigo = pasFrigoAan([], [week1[0]], true, new Date('2026-10-03T10:00:00Z')); // 300 g pasta gekocht, niet opgegeten
    const week2 = itemsUitPlan(dagen, 'w2');
    // de restjes tellen als "al in huis" voor de nieuwe week
    assert.ok(!trekFrigoAf(week2, frigo).some((i) => i.id === week2[0].id));
    // en wie toch opnieuw koopt, krijgt een tweede exemplaar in de frigo
    assert.equal(pasFrigoAan(frigo, [week2[0]], true, new Date('2026-10-10T10:00:00Z')).length, 2);
  });
  // WEEK-204: wat uit precies dit lijstitem gekocht werd, komt na "Wissen" bij het opnieuw overzetten terug als gekocht, niet als open boodschap.
  test('WEEK-204: een gekocht en gewist item komt bij het opnieuw overzetten als afgevinkt terug', async () => {
    const { pasFrigoAan, trekFrigoAf } = await import('@/lib/frigo');
    const week = itemsUitPlan(dagen, 'w1');
    const gekocht = vinkAf(week, [week[0].id], true);
    const frigo = pasFrigoAan([], [week[0]], true, new Date('2026-10-03T10:00:00Z'));
    const gewist = gekocht.filter((i) => !i.afgevinkt); // de knop Wissen
    const opnieuw = voegPlanToe(gewist, dagen, 'nl', (items) => trekFrigoAf(items, frigo), 'w1');
    const terug = opnieuw.find((i) => i.id === week[0].id);
    assert.equal(terug?.afgevinkt, true);
    // regressie: de andere items blijven open en worden niet door het gekochte product gedekt
    assert.ok(opnieuw.filter((i) => i.id !== week[0].id && i.recept).every((i) => !i.afgevinkt));
  });
});

describe('selectievakje per sectie (WEEK-111)', () => {
  const regel = (ids: string[], afgevinkt: boolean): LijstRegel => ({
    sleutel: ids.join('+'), naam: ids.join('+'), categorie: 'groente', afgevinkt, ids, recepten: [],
  } as unknown as LijstRegel);

  test('vinkt alle regels van de sectie af als er nog open regels zijn', () => {
    const keuze = sectieKeuze([regel(['a'], true), regel(['b', 'c'], false)]);
    assert.equal(keuze.afgevinkt, true);
    assert.deepEqual(keuze.ids, ['a', 'b', 'c']);
  });

  test('zet de sectie weer open als alle regels al afgevinkt zijn', () => {
    const keuze = sectieKeuze([regel(['a'], true), regel(['b'], true)]);
    assert.equal(keuze.afgevinkt, false);
    assert.deepEqual(keuze.ids, ['a', 'b']);
  });

  test('een lege sectie vinkt niets af', () => {
    const keuze = sectieKeuze([]);
    assert.equal(keuze.afgevinkt, true);
    assert.deepEqual(keuze.ids, []);
  });

  test('regressie: vinkAf op de sectie-ids raakt enkel die items en laat de rest ongemoeid', () => {
    const items = [
      { id: 'a', naam: 'appel', afgevinkt: false },
      { id: 'b', naam: 'peer', afgevinkt: false },
      { id: 'x', naam: 'brood', afgevinkt: false },
    ] as unknown as LijstItem[];
    const keuze = sectieKeuze([regel(['a'], false), regel(['b'], false)]);
    const nieuw = vinkAf(items, keuze.ids, keuze.afgevinkt, 'Ik');
    assert.deepEqual(nieuw.map((i) => i.afgevinkt), [true, true, false]);
  });
});

describe('bevestigen zet enkel de ontbrekende ingrediënten op de lijst (WEEK-107)', () => {
  test('regressie: wat al in de frigo ligt, komt niet op de lijst', () => {
    const dag = dagen[0];
    const alles = itemsUitPlan([dag]);
    const eerste = alles[0];
    const frigo = [{ id: 'x', naam: eerste.naam, afdeling: eerste.afdeling ?? 'groenten-fruit', toegevoegdOp: new Date().toISOString(), hoeveelheid: 99999, eenheid: eerste.eenheid, bron: 'planner' }];
    const lijst = voegPlanToe([], [dag], 'nl', (items) => trekFrigoAf(items, frigo as never));
    assert.ok(!lijst.some((i) => i.naam === eerste.naam));
    // De overige ingrediënten van het gerecht staan er wél op.
    if (alles.length > 1) assert.ok(lijst.some((i) => i.naam === alles[1].naam));
  });
});


describe('gekookt recept verdwijnt van de lijst (WEEK-134)', () => {
  const ing = (naam: string) => ({ naam, hoeveelheid: 100, eenheid: 'g', afdeling: 'droge-voeding' as const });
  const recept = (naam: string, ingredienten: string[]) => ({
    id: naam,
    naam,
    soort: 'vegetarisch' as const,
    minuten: 20,
    stijlen: ['italiaans' as const],
    ingredienten: ingredienten.map(ing),
  });
  const dag = (d: 'maandag' | 'dinsdag', r: ReturnType<typeof recept>) => ({ dag: d, recept: r, bevestigd: true });

  test('na het koken van recept 1 blijven alleen de ingrediënten van recept 2 op de lijst', () => {
    const r1 = recept('Pasta', ['pasta', 'tomaat']);
    const r2 = recept('Soep', ['wortel', 'ui']);
    const metBeide = voegPlanToe([], [dag('maandag', r1), dag('dinsdag', r2)], 'nl', undefined, 'p1');
    assert.ok(metBeide.some((i) => i.naam === 'pasta'));
    const naKoken = voegPlanToe(metBeide, [dag('dinsdag', r2)], 'nl', undefined, 'p1');
    assert.deepEqual(naKoken.map((i) => i.naam).sort(), ['ui', 'wortel']);
  });

  test('regressie: bij het bevestigen van een tweede recept komen de vaste items nog steeds niet op de lijst', () => {
    const r1 = recept('Pasta', ['pasta']);
    const lijst = voegPlanToe([], [dag('maandag', r1)], 'nl', undefined, 'p1');
    assert.ok(lijst.every((i) => i.recept || i.categorie === 'avondeten' || !i.categorie.startsWith('brood')));
    assert.equal(lijst.filter((i) => i.categorie !== 'avondeten' && !i.recept).length, 0);
  });
});

describe('de teller telt de som van de secties (WEEK-137)', () => {
  const ing = (naam: string, categorie = 'avondeten') => ({ id: `${categorie}-${naam}`, naam, categorie, afgevinkt: false, eenheid: 'g' });
  const recept = (dag: 'maandag' | 'dinsdag', naam: string, ingredienten: string[]) =>
    ingredienten.map((n) => ({ ...ing(n), recept: { dag, naam } }));

  test('per recept: het totaal is de som van de tellers per recept, ook als ingrediënten dubbel voorkomen', () => {
    const items = [...recept('maandag', 'Pasta', ['ui', 'tomaat']), ...recept('dinsdag', 'Soep', ['ui', 'wortel'])];
    const secties = perRecept(items);
    const telling = telRegels(secties);
    assert.equal(telling.totaal, secties.reduce((som, sectie) => som + sectie.regels.length, 0));
    assert.equal(telling.totaal, 4);
    assert.equal(telling.open, 4);
  });

  test('per categorie: de teller telt de unieke ingrediënten per categorie en het totaal is de som', () => {
    const items = [...recept('maandag', 'Pasta', ['ui']), ...recept('dinsdag', 'Soep', ['ui', 'wortel'])];
    const secties = perAfdeling(items);
    const telling = telRegels(secties);
    assert.equal(telling.totaal, secties.reduce((som, sectie) => som + sectie.regels.length, 0));
  });

  test('afgevinkte regels tellen niet mee als open', () => {
    const items = recept('maandag', 'Pasta', ['ui', 'tomaat']).map((i) => (i.naam === 'ui' ? { ...i, afgevinkt: true } : i));
    assert.deepEqual(telRegels(perRecept(items)), { open: 1, totaal: 2 });
  });

  test('een lege lijst telt niets', () => {
    assert.deepEqual(telRegels([]), { open: 0, totaal: 0 });
  });
});

describe('alleen recepten van het huidige plan op de lijst (WEEK-138)', () => {
  const ing = (naam: string) => ({ id: `recept-${naam}`, naam, categorie: 'avondeten', afgevinkt: false, eenheid: 'g', recept: { dag: 'maandag' as const, naam: 'Pasta' } });
  const eigen = { id: 'eigen-appels', naam: 'appels', categorie: 'fruit', afgevinkt: false };
  const dag = (d: 'maandag' | 'dinsdag', naam: string, bevestigd: boolean, gedaan = false) => ({
    dag: d,
    recept: { id: naam, naam, soort: 'vegetarisch' as const, minuten: 20, stijlen: ['italiaans' as const], ingredienten: [] },
    bevestigd,
    gedaan,
  });
  const plan = (dagen: ReturnType<typeof dag>[]) => ({ dagen, kooktijden: [], stijlen: [], taal: 'nl' as const, porties: 1, bron: 'db' as const, gemaaktOp: '2026-10-20T08:00:00.000Z' });
  const lijst = [ing('ui'), { ...ing('tomaat'), recept: { dag: 'maandag' as const, naam: 'Pasta' } }, eigen];

  test('zonder weekplan: geen recepten, wel eigen items', () => {
    assert.deepEqual(alleenHuidigPlan(lijst, null).map((i) => i.id), ['eigen-appels']);
  });

  test('een gekookt recept of een niet-bevestigd recept toont geen ingrediënten', () => {
    const gekookt = plan([dag('maandag', 'Pasta', true, true)]);
    assert.deepEqual(alleenHuidigPlan(lijst, gekookt).map((i) => i.id), ['eigen-appels']);
    const nietBevestigd = plan([dag('maandag', 'Pasta', false)]);
    assert.deepEqual(alleenHuidigPlan(lijst, nietBevestigd).map((i) => i.id), ['eigen-appels']);
  });

  test('een bevestigd, niet gekookt recept van het huidige plan blijft staan', () => {
    const open = plan([dag('maandag', 'Pasta', true)]);
    assert.equal(alleenHuidigPlan(lijst, open).filter((i) => i.recept).length, 2);
  });

  test('ingrediënten van een recept dat niet (meer) op het plan staat, verdwijnen', () => {
    const andereRecept = plan([dag('dinsdag', 'Soep', true)]);
    assert.deepEqual(alleenHuidigPlan(lijst, andereRecept).map((i) => i.id), ['eigen-appels']);
  });
});

describe('lijst: tabbladen en bewerken (WEEK-182)', () => {
  const nu = new Date('2026-11-02T10:00:00Z');
  const plan: LijstItem = { id: 'p1', naam: 'Ui', categorie: 'avondeten', afgevinkt: false, code: 'ui', recept: { dag: 'maandag', naam: 'Pasta' } };
  const eigenRecept: LijstItem = { id: 'e1', naam: 'Melk', categorie: 'extra', afgevinkt: false, code: 'melk', eenheid: 'ml', hoeveelheid: 500 };
  const los: LijstItem = { id: 'l1', naam: 'Chips', categorie: 'extra', afgevinkt: false };

  test('planner-items en zelf gekozen databank-producten horen bij Recepten; de rest bij Losse producten', () => {
    assert.equal(lijstSheet(plan), 'recept');
    assert.equal(lijstSheet(eigenRecept), 'recept');
    assert.equal(lijstSheet(los), 'los');
    assert.deepEqual(opSheet([plan, eigenRecept, los], 'los').map((i) => i.id), ['l1']);
    assert.deepEqual(opSheet([plan, eigenRecept, los], 'recept').map((i) => i.id), ['p1', 'e1']);
  });

  test('wijzigen en verwijderen enkel voor wat de gebruiker zelf toevoegde', () => {
    assert.equal(magBewerken(plan), false);
    assert.equal(magBewerken(eigenRecept), true);
    assert.equal(magBewerken(los), true);
  });

  test('een databank-product houdt zijn eenheid; enkel de hoeveelheid verandert', () => {
    const [na] = bewerkLijstItem([eigenRecept], 'e1', { hoeveelheid: 250, eenheid: 'g' });
    assert.equal(na.hoeveelheid, 250);
    assert.equal(na.eenheid, 'ml');
    assert.equal(na.afdeling, undefined);
  });

  test('een losse product krijgt hoeveelheid, eenheid en afdeling', () => {
    const [na] = bewerkLijstItem([los], 'l1', { hoeveelheid: 2, eenheid: 'stuk', afdeling: 'droge-voeding' });
    assert.deepEqual([na.hoeveelheid, na.eenheid, na.afdeling], [2, 'stuk', 'droge-voeding']);
  });

  test('een planner-item blijft ongewijzigd', () => {
    assert.deepEqual(bewerkLijstItem([plan], 'p1', { hoeveelheid: 9 }), [plan]);
  });

  test('eigenItem met hoeveelheid, eenheid en afdeling', () => {
    const item = eigenItem('Kaas', nu, undefined, { hoeveelheid: 3, eenheid: 'g', afdeling: 'zuivel-eieren' });
    assert.deepEqual(item, { id: `extra-${nu.getTime()}`, naam: 'Kaas', categorie: 'extra', afgevinkt: false, hoeveelheid: 3, eenheid: 'g', afdeling: 'zuivel-eieren' });
  });
});

