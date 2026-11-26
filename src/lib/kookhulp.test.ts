// WEEK-334/335/336: kookwekker, hoeveelheden in de stap en tekstgrootte in de bereiding.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aftellen,
  heeftAlarm,
  hervat,
  isGepauzeerd,
  MAX_SECONDEN,
  pauzeer,
  resterend,
  startWekker,
  tijdLabel,
  vindTijden,
  werkBij,
} from './kookwekker';
import { alsTekst, stappenMetHoeveelheden, zoekIngredient } from './stapHoeveelheden';
import { doelBereikt, naastDoel } from './bereiding';
import { geschaald, groter, kanGroter, kanKleiner, kleiner, leesStand, TEKST_STANDEN } from './tekstgrootte';

const sec = (stap: string) => vindTijden(stap).map((t) => t.seconden);

describe('WEEK-334: tijden in een stap', () => {
  it('Nederlands: minuten, minuut, uur, seconden', () => {
    assert.deepEqual(sec('Laat 15 minuten zacht koken en roer af en toe.'), [900]);
    assert.deepEqual(sec('Bak 1 minuut mee.'), [60]);
    assert.deepEqual(sec('Laat 2 uur rijzen.'), [7200]);
    assert.deepEqual(sec('Mix 30 seconden.'), [30]);
    assert.deepEqual(sec('Laat 1,5 uur stoven.'), [5400]);
    assert.deepEqual(sec('Bak 10 min. in de oven.'), [600]);
  });
  it('meerdere tijden in één stap, in volgorde', () => {
    assert.deepEqual(sec('Kook de eieren 8 minuten hard. Bak de aardappelen 4 minuten. Roer de currypasta erdoor en bak 1 minuut mee.'), [480, 240, 60]);
  });
  it('dezelfde tijd twee keer in één stap: één wekker', () => {
    assert.deepEqual(sec('Bak 2 minuten, draai om en bak nog 2 minuten.'), [120]);
  });
  it('bereik: de kortste tijd', () => {
    assert.deepEqual(sec('Kook 5-7 minuten.'), [300]);
    assert.deepEqual(sec('Kook 10 à 12 minuten.'), [600]);
    assert.deepEqual(sec('Laat 20 tot 25 minuten garen.'), [1200]);
    assert.deepEqual(sec('Simmer for 10 to 15 minutes.'), [600]);
    assert.deepEqual(sec('10 bis 12 Minuten garen.'), [600]);
  });
  it('woorden: kwartier, halfuur (4 talen)', () => {
    assert.deepEqual(sec('Laat een kwartier rusten.'), [900]);
    assert.deepEqual(sec('Laat een half uur marineren.'), [1800]);
    assert.deepEqual(sec('Leave for half an hour.'), [1800]);
    assert.deepEqual(sec('Laissez reposer une demi-heure.'), [1800]);
    assert.deepEqual(sec("Laissez reposer un quart d'heure."), [900]);
    assert.deepEqual(sec('Eine halbe Stunde ziehen lassen.'), [1800]);
  });
  it('Engels, Frans, Duits', () => {
    assert.deepEqual(sec('Simmer for 15 minutes, stirring now and then.'), [900]);
    assert.deepEqual(sec('Laissez mijoter 15 minutes en remuant.'), [900]);
    assert.deepEqual(sec('Faites cuire 1 h 30 à feu doux.'), [5400]);
    assert.deepEqual(sec('Cuire 1h30.'), [5400]);
    assert.deepEqual(sec('15 Minuten sanft köcheln lassen.'), [900]);
    assert.deepEqual(sec('Eier 8 Minuten hart kochen.'), [480]);
    assert.deepEqual(sec('1 ½ Stunden schmoren.'), [5400]);
  });
  it('negatief: geen wekker bij temperaturen, aantallen of gewichten', () => {
    assert.deepEqual(sec('Verwarm de oven voor op 180 graden.'), []);
    assert.deepEqual(sec('Préchauffez le four à 200 °C.'), []);
    assert.deepEqual(sec('Klop 2 eieren met 200 g bloem.'), []);
    assert.deepEqual(sec('Snijd in 4 stukken van 2 cm.'), []);
    assert.deepEqual(sec('Serveer met 1 el sojasaus.'), []);
    assert.deepEqual(sec('Kook de spaghetti al dente.'), []);
    assert.deepEqual(sec(''), []);
  });
  it('negatief: geen deel van een ander woord ("3 minimarkten", "2 hoeken")', () => {
    assert.deepEqual(sec('Koop 3 minimarkten leeg.'), []);
    assert.deepEqual(sec('Snijd 2 hoeken af.'), []);
    assert.deepEqual(sec('Voeg 2 sjalotten toe.'), []);
  });
  it('negatief: langer dan 4 uur is geen kookwekker', () => {
    assert.deepEqual(sec('Laat 24 uur marineren.'), []);
    assert.deepEqual(sec('Laat 4 uur stoven.'), [MAX_SECONDEN]);
  });
  it('de gevonden tekst om te tonen', () => {
    assert.equal(vindTijden('Laat 15 minuten zacht koken.')[0].tekst, '15 minuten');
  });
});

describe('WEEK-334: labels en aftellen', () => {
  it('label', () => {
    assert.equal(tijdLabel(900), '15 min');
    assert.equal(tijdLabel(5400), '1 u 30 min');
    assert.equal(tijdLabel(45), '45 s');
    assert.equal(tijdLabel(3600, { u: 'h', min: 'min', s: 's' }), '1 h');
  });
  it('aftellen', () => {
    assert.equal(aftellen(545), '9:05');
    assert.equal(aftellen(3723), '1:02:03');
    assert.equal(aftellen(0.2), '0:01');
    assert.equal(aftellen(-5), '0:00');
  });
});

describe('WEEK-334: de stand van een wekker', () => {
  const NU = 1_000_000;
  it('start en resterende tijd', () => {
    const w = startWekker('db-408', 3, 900, NU);
    assert.equal(resterend(w, NU), 900);
    assert.equal(resterend(w, NU + 60_000), 840);
    assert.equal(resterend(w, NU + 2_000_000), 0);
  });
  it('pauzeren houdt de tijd vast, hervatten loopt verder', () => {
    const w = startWekker('db-408', 3, 900, NU);
    const p = pauzeer(w, NU + 100_000);
    assert.ok(isGepauzeerd(p));
    assert.equal(resterend(p, NU + 500_000), 800);
    const h = hervat(p, NU + 500_000);
    assert.ok(!isGepauzeerd(h));
    assert.equal(resterend(h, NU + 560_000), 740);
  });
  it('afgelopen na de eindtijd, ook als de app in de achtergrond stond', () => {
    const w = startWekker('db-408', 3, 60, NU);
    assert.equal(heeftAlarm(werkBij([w], NU + 59_000)), false);
    const na = werkBij([w], NU + 3_600_000);
    assert.equal(heeftAlarm(na), true);
    assert.equal(resterend(na[0], NU + 3_600_000), 0);
  });
  it('regressie: een gepauzeerde wekker loopt niet af', () => {
    const p = pauzeer(startWekker('db-1', 1, 60, NU), NU + 10_000);
    assert.equal(heeftAlarm(werkBij([p], NU + 10_000_000)), false);
  });
  it('werkBij geeft dezelfde lijst als er niets veranderde', () => {
    const lijst = [startWekker('db-1', 1, 60, NU)];
    assert.equal(werkBij(lijst, NU + 1000), lijst);
  });
  it('negatief: dubbel pauzeren of hervatten verandert niets', () => {
    const w = startWekker('db-1', 1, 60, NU);
    assert.equal(hervat(w, NU), w);
    const p = pauzeer(w, NU + 1000);
    assert.equal(pauzeer(p, NU + 5000), p);
  });
});

describe('WEEK-335: hoeveelheden in de stap', () => {
  const ING = [
    { naam: 'kokosmelk', hoeveelheid: '100 ml' },
    { naam: 'bloemkool', hoeveelheid: '1 ×' },
    { naam: 'eieren', hoeveelheid: '6 ×' },
    { naam: 'aardappelen', hoeveelheid: '300 g' },
    { naam: 'currypasta', hoeveelheid: '30 g' },
    { naam: 'peterselie', hoeveelheid: '10 g' },
    { naam: 'ui', hoeveelheid: '1 ×' },
    { naam: 'witte wijn', hoeveelheid: '110 ml' },
    { naam: 'olie', hoeveelheid: '2 el' },
  ];
  const tekst = (stappen: string[], ing = ING) => stappenMetHoeveelheden(stappen, ing).map(alsTekst);

  it('na de eerste vermelding', () => {
    assert.deepEqual(tekst(['Giet de kokosmelk erbij en breng aan de kook.']), ['Giet de kokosmelk (100 ml) erbij en breng aan de kook.']);
  });
  it('enkel de eerste keer in de hele bereiding', () => {
    assert.deepEqual(tekst(['Kook de eieren hard.', 'Pel de eieren.']), ['Kook de eieren (6 ×) hard.', 'Pel de eieren.']);
  });
  it('samengestelde woorden en meervoud', () => {
    assert.deepEqual(tekst(['Voeg de bloemkoolroosjes toe.']), ['Voeg de bloemkoolroosjes (1 ×) toe.']);
    assert.deepEqual(tekst(['Snijd de aardappel in blokjes.']), ['Snijd de aardappel (300 g) in blokjes.']);
  });
  it('meerdere ingrediënten in één stap, in de juiste volgorde', () => {
    assert.deepEqual(tekst(['Roer de currypasta door de aardappelen.']), ['Roer de currypasta (30 g) door de aardappelen (300 g).']);
  });
  it('langere naam eerst: "witte wijn" en niet nog eens apart', () => {
    assert.deepEqual(tekst(['Blus met de witte wijn.']), ['Blus met de witte wijn (110 ml).']);
  });
  it('negatief: "de helft van" en "de rest van": nergens een hoeveelheid', () => {
    assert.deepEqual(tekst(['Schep er de helft van de peterselie door.', 'Strooi de rest van de peterselie erover.']), [
      'Schep er de helft van de peterselie door.',
      'Strooi de rest van de peterselie erover.',
    ]);
    assert.deepEqual(tekst(['Toss with half the parsley.'], [{ naam: 'parsley', hoeveelheid: '10 g' }]), ['Toss with half the parsley.']);
    assert.deepEqual(tekst(['Mélangez avec la moitié du persil.'], [{ naam: 'persil', hoeveelheid: '10 g' }]), ['Mélangez avec la moitié du persil.']);
    assert.deepEqual(tekst(['Mit der Hälfte der Petersilie bestreuen.'], [{ naam: 'Petersilie', hoeveelheid: '10 g' }]), ['Mit der Hälfte der Petersilie bestreuen.']);
  });
  it('negatief: "een klontje", "een derde van", "un filet de" (echte recepten)', () => {
    const boter = [{ naam: 'boter', hoeveelheid: '40 g' }];
    assert.deepEqual(tekst(['Bak de worst in een klontje boter.', 'Bak de ui in de rest van de boter.'], boter), [
      'Bak de worst in een klontje boter.',
      'Bak de ui in de rest van de boter.',
    ]);
    assert.deepEqual(tekst(['Stoof ui in een derde van de olie.'], [{ naam: 'olie', hoeveelheid: '3 el' }]), ['Stoof ui in een derde van de olie.']);
    assert.deepEqual(tekst(["Ajoutez un filet d'huile."], [{ naam: 'huile', hoeveelheid: '3 c. à s.' }]), ["Ajoutez un filet d'huile."]);
    assert.deepEqual(tekst(['Pers er een halve limoen over.'], [{ naam: 'limoen', hoeveelheid: '1 ×' }]), ['Pers er een halve limoen over.']);
  });
  it('echt recept (bloemkoolcurry met ei, 4 personen)', () => {
    const stappen = [
      'Kook de eieren 8 minuten hard. Snijd de aardappelen in blokjes en bak ze 4 minuten in de olie in een braadpan. Roer de currypasta erdoor en bak 1 minuut mee.',
      'Voeg paprikablokjes en bloemkoolroosjes toe, giet kokosmelk en water erbij en breng aan de kook. Laat 15 minuten zacht koken en roer af en toe.',
      'Pel en halveer de eieren en warm ze de laatste 2 minuten mee. Haal de pan van het vuur, roer de gekruide yoghurt erdoor en bestrooi met gehakte koriander.',
    ];
    const ing = [
      { naam: 'paprika', hoeveelheid: '1 ×' },
      { naam: 'aardappel', hoeveelheid: '300 g' },
      { naam: 'eieren', hoeveelheid: '6 ×' },
      { naam: 'bloemkool', hoeveelheid: '1 ×' },
      { naam: 'yoghurt', hoeveelheid: '100 g' },
      { naam: 'koriander', hoeveelheid: '15 g' },
      { naam: 'currypasta', hoeveelheid: '30 g' },
      { naam: 'zonnebloemolie', hoeveelheid: '2 el' },
      { naam: 'kokosmelk', hoeveelheid: '100 ml' },
      { naam: 'water', hoeveelheid: '200 ml' },
    ];
    assert.deepEqual(tekst(stappen, ing), [
      'Kook de eieren (6 ×) 8 minuten hard. Snijd de aardappelen (300 g) in blokjes en bak ze 4 minuten in de olie in een braadpan. Roer de currypasta (30 g) erdoor en bak 1 minuut mee.',
      'Voeg paprikablokjes (1 ×) en bloemkoolroosjes (1 ×) toe, giet kokosmelk (100 ml) en water (200 ml) erbij en breng aan de kook. Laat 15 minuten zacht koken en roer af en toe.',
      'Pel en halveer de eieren en warm ze de laatste 2 minuten mee. Haal de pan van het vuur, roer de gekruide yoghurt (100 g) erdoor en bestrooi met gehakte koriander (15 g).',
    ]);
  });
  it('negatief: een "deel"-woord in een vorige zin telt niet', () => {
    assert.deepEqual(tekst(['Bak in een deel van de boter. Voeg de kokosmelk toe.']), ['Bak in een deel van de boter. Voeg de kokosmelk (100 ml) toe.']);
  });
  it('negatief: er staat al een hoeveelheid', () => {
    assert.deepEqual(tekst(['Klop 2 eieren los.']), ['Klop 2 eieren los.']);
  });
  it('negatief: korte namen niet als begin van een ander woord', () => {
    assert.deepEqual(tekst(['Haal uit de pan en laat uitlekken.']), ['Haal uit de pan en laat uitlekken.']);
    assert.deepEqual(tekst(['Snijd de ui fijn.']), ['Snijd de ui (1 ×) fijn.']);
    assert.deepEqual(tekst(['Snijd de uien fijn.']), ['Snijd de uien (1 ×) fijn.']);
  });
  it('negatief: niet midden in een woord ("olie" in "olijfolie", "ui" in "fruit")', () => {
    assert.deepEqual(tekst(['Verhit de olijfolie en fruit de look.'], [{ naam: 'olie', hoeveelheid: '2 el' }, { naam: 'ui', hoeveelheid: '1 ×' }]), [
      'Verhit de olijfolie en fruit de look.',
    ]);
  });
  it('negatief: ingrediënt zonder hoeveelheid of niet in de stappen', () => {
    assert.deepEqual(tekst(['Kruid met peper en zout.'], [{ naam: 'zout', hoeveelheid: '' }]), ['Kruid met peper en zout.']);
    assert.deepEqual(tekst(['Kook de pasta.'], []), ['Kook de pasta.']);
    assert.deepEqual(stappenMetHoeveelheden([], ING), []);
  });
  it('Frans: na een apostrof (l’ail)', () => {
    const ail = [{ naam: 'ail', hoeveelheid: '3 gousses' }];
    assert.deepEqual(tekst(["Émincez l'ail finement."], ail), ["Émincez l'ail (3 gousses) finement."]);
    assert.deepEqual(tekst(['Émincez l’ail.'], ail), ['Émincez l’ail (3 gousses).']);
    assert.deepEqual(tekst(['Faites un bon travail.'], ail), ['Faites un bon travail.']);
  });
  it('hoofdletters en Duitse samenstellingen', () => {
    assert.deepEqual(tekst(['Blumenkohlröschen zugeben.'], [{ naam: 'Blumenkohl', hoeveelheid: '1 ×' }]), ['Blumenkohlröschen (1 ×) zugeben.']);
    assert.ok(zoekIngredient('Kokosmelk erbij.', 'kokosmelk'));
  });
  it('regressie: de stap blijft woord voor woord dezelfde tekst', () => {
    const stap = 'Voeg paprikablokjes en bloemkoolroosjes toe, giet kokosmelk en water erbij en breng aan de kook.';
    const delen = stappenMetHoeveelheden([stap], ING)[0];
    assert.equal(delen.map((d) => d.tekst).join(''), stap);
  });
});

describe('WEEK-336: tekstgrootte', () => {
  it('vier standen, A− en A+ stoppen aan de randen', () => {
    assert.equal(TEKST_STANDEN.length, 4);
    assert.equal(kleiner(0), 0);
    assert.equal(groter(0), 1);
    assert.equal(groter(3), 3);
    assert.equal(kanKleiner(0), false);
    assert.equal(kanGroter(3), false);
    assert.equal(kanGroter(2), true);
  });
  it('bewaarde stand lezen; onzin wordt normaal', () => {
    assert.equal(leesStand('2'), 2);
    assert.equal(leesStand(null), 0);
    assert.equal(leesStand('9'), 0);
    assert.equal(leesStand('-1'), 0);
    assert.equal(leesStand('abc'), 0);
    assert.equal(leesStand(1.5), 0);
  });
  it('geschaalde lettergrootte', () => {
    assert.equal(geschaald(18, 0), 18);
    assert.equal(geschaald(18, 3), 30);
  });
});

describe('WEEK-334: snel twee keer op Volgende (regressie WEEK-331)', () => {
  it('de tweede tik telt vanaf het doel, niet vanaf de tussenstand', () => {
    // Index staat nog op 0 (tussenstand), de app schuift al naar kaart 1: de volgende tik gaat naar kaart 2.
    assert.equal(naastDoel(0, 1, 1, 4), 2);
    assert.equal(naastDoel(2, 1, -1, 4), 0);
  });
  it('zonder doel: gewoon vanaf de huidige kaart', () => {
    assert.equal(naastDoel(1, undefined, 1, 4), 2);
    assert.equal(naastDoel(1, undefined, -1, 4), 0);
  });
  it('negatief: nooit voorbij de eerste of laatste kaart', () => {
    assert.equal(naastDoel(0, undefined, -1, 4), 0);
    assert.equal(naastDoel(3, 3, 1, 4), 3);
  });
  it('doel bereikt met een halve pixel afronding, niet halverwege', () => {
    assert.equal(doelBereikt(375.33, 375, 1), true);
    assert.equal(doelBereikt(500, 375, 1), false);
    assert.equal(doelBereikt(0, 375, 0), true);
  });
});
