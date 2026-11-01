# Changelog

Alle wijzigingen aan Gezond Boodschappen. Versies volgen [Semantic Versioning](https://semver.org/lang/nl/):

- **MAJOR** (1.0.0) – grote, niet-compatibele wijziging (bv. eerste publieke release)
- **MINOR** (0.2.0) – nieuwe functionaliteit of verbetering
- **PATCH** (0.1.1) – bugfix of kleine aanpassing

Elke versie verwijst naar zijn Jira-workitem(s) en Confluence-pagina.

## [0.93.0] – 2026-11-01

**WEEK-167** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-167)

- Nieuw: de app is ook als webversie beschikbaar, zodat je ze op een iPhone kan gebruiken via Safari ("Zet op beginscherm"). Zonder Apple Developer-account is een native iPhone-installatie niet mogelijk.
- Op de webversie zijn er geen advertentiefilmpjes; de scanner geeft dan geen extra scans.
- Een workflow bouwt de webversie en publiceert ze op GitHub Pages bij elke merge naar main.

## [0.92.0] – 2026-11-01

**WEEK-163** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-163)

- Bij de eerste start wordt na de taalkeuze de voornaam gevraagd (max. 20 tekens, enkel letters; een spatie, koppelteken of apostrof mag tussen de letters).
- De voornaam wordt meegegeven bij het aansluiten bij een gezin, in plaats van een lege naam. Zo zien de andere leden wie iets gekocht of toegevoegd heeft.
- In het gezinsscherm is de voornaam aan te passen, ook als je al lid bent. De wijziging gaat naar het gezin.

## [0.91.5] – 2026-10-25

**WEEK-162** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-162)

- De planner-frigo bevat enkel ingrediënten die de receptenbank kent. Generieke items zonder equivalent (pasta, kaas, rijst, fruit, bouillon…) zijn niet meer zoekbaar in de planner-frigo; ze kunnen wel als losse product worden toegevoegd.
- Losse producten worden nooit door de weekplanner gebruikt (ongewijzigd).

## [0.91.4] – 2026-10-25

**WEEK-161** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-161)

- Groenten en fruit die je per stuk koopt (ui, tomaat, wortel, paprika, sla, prei, courgette, citroen, sjalot…) staan op stuk, in de databank, in de frigo en in de recepten. Hoeveelheden in recepten zijn omgerekend met een gemiddeld stukgewicht, afgerond op een halve stuk.
- Oude frigo-items in gram koppelen aan recepten op stuk via het gemiddelde stukgewicht.

## [0.91.3] – 2026-10-25

**WEEK-160** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-160) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/14843905)

- Ontbreekt-markers en "in frigo" volgen dezelfde koppeling als het verbruik: op code, ook over talen heen.
- Ingrediënten uit de catalogus koppelen aan de databankcode; afwijkende catalogus-codes worden omgezet.
- Eenheden binnen dezelfde familie (g/kg, ml/l) worden omgerekend. Stuk tegen gram past niet, dus er wordt niets verbruikt.
- Een recept zonder hoeveelheid haalt geen hoeveelheid af van een product met een gekende hoeveelheid.
- Het eerste recept van een gedeeld ingrediënt houdt zijn id: vinkjes en frigo-koppelingen blijven geldig bij het overzetten van het plan.
- Recepten met dezelfde naam op één dag blijven apart op de lijst.
- Catalogus-ingrediënten zonder databankequivalent (pasta, kaas, rijst…) koppelen weer op naam, ook als het recept een databankcode heeft.
- Producten uit de zoekfunctie van de planner-frigo krijgen de databankcode en de vaste eenheid: stuk (eieren, appel…), teentje (knoflook), ml (olijfolie, melk…) of g (rijst, pasta…). Je kan er optioneel een hoeveelheid bij geven.

## [0.91.2] – 2026-10-24

**WEEK-159** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-159) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/14680065)

- Recepten die een ingrediënt delen op dezelfde dag krijgen elk een eigen regel met de juiste hoeveelheid. Per categorie blijft het één regel met de som.
- Gekookt zetten verwijdert enkel de ingrediënten van dat recept uit de boodschappenlijst én uit de frigo. Restjes blijven staan.
- Gekochte frigo-producten worden na een taalwissel nog steeds aan het juiste recept gekoppeld (via de vaste ingrediëntcode).
- "Gekocht door" en "toegevoegd door" tonen de voornaam.

## [0.91.1] – 2026-10-24

**WEEK-158** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-158) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/14581761)

- Losse frigo-producten (die je zelf toevoegt) tellen niet meer mee voor recepten van de weekplanner: ze trekken niets af van de boodschappenlijst en geven geen \"uit de frigo\" of ingrediënt-status. Enkel producten van de planner worden gebruikt.
## [0.91.0] – 2026-10-23

**WEEK-156** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-156) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/14024705)

- Seizoensrecepten: de planner kiest per dag recepten van het seizoen van die dag (lente, zomer, herfst, winter). Seizoensrecepten krijgen voorrang; anders vallen we terug op recepten van het hele jaar. Zonder gekozen datums verandert er niets.
- Databank: nieuwe kolom `seizoenen` op de recepten; recepten met seizoensgroenten of -fruit zijn ingevuld op basis van hun ingrediënten.

## [0.90.1] – 2026-10-21

**WEEK-155** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-155) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12976129)

- Vaste items (brood en beleg, fruit, huishouden, school) zijn verwijderd uit de app: een nieuw weekplan zet ze niet meer op de lijst, en oude kopieën worden bij het inlezen weggelaten.

## [0.90.0] – 2026-10-21

**WEEK-154** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-154) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12943361)

- Taalwissel: weekmenu-recepten, ingrediënten op de lijst en de bereidingspagina volgen de gekozen taal. Nieuwe plannen bewaren de vaste code en de namen in alle talen; de weergave kiest de taal.
- Bestaande plannen met een recept uit de database houden hun oorspronkelijke tekst tot het plan opnieuw gemaakt wordt.

## [0.89.4] – 2026-10-20

**WEEK-153** – [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-153) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12615681)

- Android-build (GitHub Actions): eas-cli vastgepind op versie 16 in plaats van @latest, runner vastgezet op ubuntu-24.04, en de foutuitvoer van EAS wordt bij een mislukte start getoond.

## [0.89.3] – 2026-10-20

**Jira:** [WEEK-152](https://proqltc-1791495894841.atlassian.net/browse/WEEK-152) · **Confluence:** [WEEK-152 Winkels: geen resultaten meer door time-out](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12091394)

- De winkelzoeker geeft weer winkels binnen 10 km rond de postcode uit het gezinsprofiel. De server-timeout is 20 seconden, en een time-out wordt als fout gemeld in plaats van als lege lijst.
- Lege resultaten worden niet meer bewaard.
## [0.89.2] – 2026-10-20

**Jira:** [WEEK-151](https://proqltc-1791495894841.atlassian.net/browse/WEEK-151) · **Confluence:** [WEEK-151 Weekmenu: recepttitel niet meer midden in een woord afbreken](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12288038)

- Op het weekmenu staat de receptnaam over de volle breedte van de kaart. Het boekje voor de bereiding verhuisde naar de rij met het label en de kooktijd, zodat woorden niet meer midden in het woord afbreken.
## [0.89.1] – 2026-10-20

**Jira:** [WEEK-150](https://proqltc-1791495894841.atlassian.net/browse/WEEK-150) · **Confluence:** [WEEK-150 Kalender weekmenu: geen verleden datums meer](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12484609)

- In de kalender van het weekmenu wordt een eerder gekozen periode in het verleden niet meer voorgeselecteerd, en kan een startdag vóór vandaag niet meer bevestigd worden.

## [0.89.0] – 2026-10-20

**Jira:** [WEEK-149](https://proqltc-1791495894841.atlassian.net/browse/WEEK-149) · **Confluence:** [WEEK-149 Scan: na 10 gratis scans enkel het reclamefilmpje](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12222466)

- Na de 10 gratis scans van de dag toont de scanpagina enkel de knop voor het beloonde filmpje. De aftelling tot middernacht is verwijderd.
## [0.88.1] – 2026-10-20

**Jira:** [WEEK-148](https://proqltc-1791495894841.atlassian.net/browse/WEEK-148) · **Confluence:** [WEEK-148 Winkels: resultaat per postcode bewaard en knop Opnieuw proberen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12288020)

- Winkels die al gezocht zijn, staan meteen klaar, ook na een herstart van de app. Een verouderd resultaat wordt op de achtergrond ververst.
- Bij een fout bij het zoeken komt de knop 'Opnieuw proberen'.
## [0.88.0] – 2026-10-20

**Jira:** [WEEK-147](https://proqltc-1791495894841.atlassian.net/browse/WEEK-147) · **Confluence:** [WEEK-147 Bereiding: vinkje bij ingrediënten die al in de frigo staan](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12189715)

- Op de bereidingspagina staat een vinkje naast ingrediënten die al volledig in de frigo liggen, en de tekst 'Deels in de frigo' bij gedeeltelijk aanwezige ingrediënten.

## [0.87.0] – 2026-10-20

**Jira:** [WEEK-146](https://proqltc-1791495894841.atlassian.net/browse/WEEK-146) · **Confluence:** [WEEK-146 Bereiding toont de ingrediënten van het gerecht](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12288002)

- De bereidingspagina toont boven de stappen de ingrediënten van het gerecht, met de hoeveelheden uit het weekplan.
## [0.86.15] – 2026-10-20

**Jira:** [WEEK-145](https://proqltc-1791495894841.atlassian.net/browse/WEEK-145) · **Confluence:** [WEEK-145 Winkels laden: parallel zoeken en kortere wachttijd](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12255233)

- Winkels in de buurt worden bij beide servers tegelijk opgevraagd; het eerste antwoord telt. Een trage server houdt het zoeken niet meer tegen.
- De wachttijd is verkort (12 seconden op de server, 15 seconden in de app), zodat een storing sneller gemeld wordt dan na 25 seconden.
## [0.86.14] – 2026-10-20

**Jira:** [WEEK-144](https://proqltc-1791495894841.atlassian.net/browse/WEEK-144) · **Confluence:** [WEEK-144 Recepten op de lijst in kalendervolgorde](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12189697)

- Op de lijst (weergave 'Per recept') staan de recepten in de volgorde van het weekplan, dus in de kalender, en niet meer op vaste weekdag.

## [0.86.13] – 2026-10-20

**Jira:** [WEEK-143](https://proqltc-1791495894841.atlassian.net/browse/WEEK-143) · **Confluence:** [WEEK-143 Weekmenu: bevestigingspopup enkel bij zichtbare bevestigde recepten](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/12124161)

- De popup 'Er zijn al bevestigde dagen' bij een nieuw weekmenu verschijnt enkel als er bevestigde recepten zichtbaar zijn.

## [0.86.12] – 2026-10-20

**Jira:** [WEEK-142](https://proqltc-1791495894841.atlassian.net/browse/WEEK-142) · **Confluence:** [WEEK-142 Android terugknop op het weekmenu sluit de app](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11763714)

- Op het weekmenu sluit de fysieke terugknop van Android de app, in plaats van terug te gaan naar de taalkeuze.

## [0.86.11] – 2026-10-20

**Jira:** [WEEK-141](https://proqltc-1791495894841.atlassian.net/browse/WEEK-141) · **Confluence:** [WEEK-141 Frigo: producten van de lijst weg na koken van alle recepten](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11993089)

- Zodra alle recepten van het weekplan gekookt zijn, gaan de producten van de boodschappenlijst uit de frigo. Losse producten blijven staan.
- Ontkook je het laatste recept, dan komen die producten weer in de frigo.

## [0.86.6] – 2026-10-20

**Jira:** [WEEK-136](https://proqltc-1791495894841.atlassian.net/browse/WEEK-136) · **Confluence:** [WEEK-136 Boodschappenlijst: geen vaste items bij een nieuw weekplan](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11599873)

- Bij het genereren van een nieuw weekplan komen brood & beleg, fruit en huishouden niet meer op de boodschappenlijst.
- Vaste items die al op de lijst stonden, verdwijnen bij een nieuw weekplan.

## [0.86.10] – 2026-10-20

**Jira:** [WEEK-140](https://proqltc-1791495894841.atlassian.net/browse/WEEK-140) · **Confluence:** [WEEK-140 Planner: periode pas als alle recepten bevestigd en gekookt zijn](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11927553)

- Na het koken gaat de planner pas naar de periode als alle recepten van het weekplan bevestigd én gekookt zijn.

## [0.86.9] – 2026-10-20

**Jira:** [WEEK-139](https://proqltc-1791495894841.atlassian.net/browse/WEEK-139) · **Confluence:** [WEEK-139 Weekmenu: geen receptkaarten zonder plan of na koken van alle recepten](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11796481)

- Het weekmenu toont geen receptkaarten zonder gegenereerd plan.
- Als alle recepten van het weekmenu gekookt zijn, is de lijst met receptkaarten leeg.

## [0.86.8] – 2026-10-20

**Jira:** [WEEK-138](https://proqltc-1791495894841.atlassian.net/browse/WEEK-138) · **Confluence:** [WEEK-138 Boodschappenlijst: enkel recepten van het huidige weekplan](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11730945)

- Zonder weekplan staan er geen recepten op de boodschappenlijst; eigen en gescande items blijven staan.
- Wanneer alle recepten van het weekplan gekookt zijn, is de lijst voor de recepten leeg.

## [0.86.7] – 2026-10-20

**Jira:** [WEEK-137](https://proqltc-1791495894841.atlassian.net/browse/WEEK-137) · **Confluence:** [WEEK-137 Boodschappenlijst: teller klopt met de tellers per recept of categorie](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11665409)

- De teller bovenaan de boodschappenlijst is de som van de tellers per recept of categorie in de huidige weergave.

## [0.86.5] – 2026-10-20

**Jira:** [WEEK-135](https://proqltc-1791495894841.atlassian.net/browse/WEEK-135) · **Confluence:** [WEEK-135 Frigo en lijst na koken van alle recepten](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11534337)

- Na het koken van alle recepten staan er geen ingrediënten meer op de boodschappenlijst die niet meer nodig zijn, ook niet met de frigo erbij.
- Regressietests voor het koken van recepten en de lijst (gedrag van v0.86.4 vastgelegd).

## [0.86.4] – 2026-10-20

**Jira:** [WEEK-134](https://proqltc-1791495894841.atlassian.net/browse/WEEK-134) · **Confluence:** [WEEK-134 Boodschappenlijst: gekookt recept verdwijnt van de lijst](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11501569)

- Op de boodschappenlijst staan enkel de ingrediënten van bevestigde recepten die nog niet gekookt zijn.
- Een gekookt recept verdwijnt van de lijst; ontkook je het, dan komt het terug.

## [0.86.3] – 2026-10-20

**Jira:** [WEEK-133](https://proqltc-1791495894841.atlassian.net/browse/WEEK-133) · **Confluence:** [WEEK-133 Weekmenu start: opnieuw beginnen of weekplan tonen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11436033)

- De weekplanner start bij Periode als er nog geen weekplan is, of als alle recepten van het weekplan gekookt zijn.
- In alle andere gevallen opent de planner het weekplan, ook als er nog niets bevestigd is.

## [0.86.2] – 2026-10-20

**Jira:** [WEEK-132](https://proqltc-1791495894841.atlassian.net/browse/WEEK-132) · **Confluence:** [WEEK-132 Groepsteller bij lange titel op lijst](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11370497)

- Bij een lange groepstitel op de lijst breekt de titel af; de teller en het selectievakje blijven op hun plaats.

## [0.86.1] – 2026-10-20

**Jira:** [WEEK-131](https://proqltc-1791495894841.atlassian.net/browse/WEEK-131) · **Confluence:** [WEEK-131 Vaste items niet op de lijst bij bevestigen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11337729)

- Bij het bevestigen van één recept komen brood & beleg, fruit en huishouden niet meer op de boodschappenlijst.

## [0.86.0] – 2026-10-19

**Jira:** [WEEK-126](https://proqltc-1791495894841.atlassian.net/browse/WEEK-126) · **Confluence:** [WEEK-126 Gezinsprofiel: taal kiezen en secties ingeklapt](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11141121)

- Op het gezinsprofiel kies je de taal van het toestel (of de taal van het toestel zelf).
- De secties Taal, Gezinsruimte, Gezin en Adres staan standaard ingeklapt en klap je open of dicht.

## [0.85.3] – 2026-10-19

**Jira:** [WEEK-127](https://proqltc-1791495894841.atlassian.net/browse/WEEK-127) · **Confluence:** [WEEK-127 Winkelvoorstel blijft laden](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10747906)

- De winkelzoeker wacht even lang als de zoekopdracht van de server mag duren (30 s in plaats van 10 s), met één poging per server. Zo blijft het laden niet eindeloos draaien.

## [0.85.2] – 2026-10-19

**Jira:** [WEEK-128](https://proqltc-1791495894841.atlassian.net/browse/WEEK-128) · **Confluence:** [WEEK-128 Terugknop gaat naar het weekmenu](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11108370)

- De terugknop van Android gaat op elk scherm naar het weekmenu, niet meer naar de taalkeuze.

## [0.85.1] – 2026-10-19

**Jira:** [WEEK-129](https://proqltc-1791495894841.atlassian.net/browse/WEEK-129) · **Confluence:** [WEEK-129 Gezinsruimte: toestel hoort al bij een gezin](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11108353)

- Hoort het toestel volgens de server al bij een gezinsruimte, dan wordt die koppeling hersteld en wordt het gezin getoond.
- De placeholder van de code-invoer is leesbaar in het donkere en het lichte thema.

## [0.85.0] – 2026-10-19

**Jira:** [WEEK-125](https://proqltc-1791495894841.atlassian.net/browse/WEEK-125) · **Confluence:** [WEEK-125 Periode-kalender opnieuw tonen na koken](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11075585)

- Zijn alle bevestigde recepten van het weekmenu gekookt, dan toont de planner weer de periode-kalender, zodat de gebruiker een nieuwe periode kan kiezen.

## [0.84.0] – 2026-10-19

**Jira:** [WEEK-124](https://proqltc-1791495894841.atlassian.net/browse/WEEK-124) · **Confluence:** [WEEK-124 Groepen op lijst en frigo standaard ingeklapt](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/11042817)

- Groepen op de lijst en in de frigo zijn standaard ingeklapt en tonen het aantal items.
- Tik op de titel van een groep om die open of dicht te klappen.

## [0.83.2] – 2026-10-19

**Jira:** [WEEK-123](https://proqltc-1791495894841.atlassian.net/browse/WEEK-123)

- Koekjes en drinkbrikjes (schooltas) komen niet meer standaard op de boodschappenlijst.

## [0.83.1] – 2026-10-19

**Jira:** [WEEK-122](https://proqltc-1791495894841.atlassian.net/browse/WEEK-122) · **Confluence:** [WEEK-122 Weekmenu kiest bij aanvullen korte recepten](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10846218)

- Bij aanvullen van het weekmenu kiest de planner korte recepten van het moment, niet meer recepten van 150 of 290 minuten.
- Vermeden ingrediënten en het moment blijven altijd uitgesloten; recepten die bij de gekozen kooktijd passen, gaan voor.

## [0.83.0] – 2026-10-19

**Jira:** [WEEK-121](https://proqltc-1791495894841.atlassian.net/browse/WEEK-121) (verbetering) · **Confluence:** [WEEK-121](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10911745)

- Databank: alle 100 goedgekeurde recepten hebben bereidingsstappen in nl, fr, de, en, es en pt.
- Bereiding: databankrecepten tonen hun stappen in de gekozen taal (terugval op nl).
- Nieuwe tabel recept_bereidingen in Supabase, met leesrecht voor iedereen.

## [0.82.0] – 2026-10-19

**Jira:** [WEEK-120](https://proqltc-1791495894841.atlassian.net/browse/WEEK-120) (bugfix en verbetering) · **Confluence:** [WEEK-120](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10813441)

- Weekmenu: na 'zelf kiezen' ga je terug naar het weekmenu, niet naar de taalkeuze.
- Weekmenu: de knop Gekookt staat enkel bij een bevestigd recept.
- Weekmenu: de acties (bevestigen, reset, zelf kiezen, verwijderen) staan onder de stijlafbeelding.
- Winkels: netwerkaanvragen stoppen na 10 seconden met een melding over de verbinding, in plaats van eindeloos te laden.
- Bereiding: de fysieke terugknop gaat naar het weekmenu.
- Scanner: na het zetten van een product in de frigo blijf je op de scanner.
- Scanner: het kruisje verschijnt enkel bij scannen vanuit de lijst of de frigo.
- Frigo: geen scanlink per los product meer; de scanknop bovenaan volstaat.
- Regressietests voor de wachttijd van de winkelzoeker.

## [0.81.2] – 2026-10-19

**Jira:** [WEEK-119](https://proqltc-1791495894841.atlassian.net/browse/WEEK-119) (bugfix) · **Confluence:** [WEEK-119](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10584065)

- Hoeveelheden: één schaalfactor voor alle recepten. Een gezin van 2 volwassenen en 1 kind krijgt 2,5 keer de basis, ook bij recepten uit de ingebouwde receptenbank (die rondde eerder naar 3 af).
- Regressietest toegevoegd die de hoeveelheden van de ingebouwde receptenbank vastlegt.

## [0.81.1] – 2026-10-19

**Jira:** [WEEK-118](https://proqltc-1791495894841.atlassian.net/browse/WEEK-118) (opruiming, vervolg op WEEK-116) · **Confluence:** [WEEK-118](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10485761)

- Verwijderd: de AI-serverfunctie plan-week, de AI-limiettest en de AI-limietobjecten in de database (migratie verwijder_ai_objecten). De recepten blijven behouden.

## [0.81.0] – 2026-10-19

**Jira:** [WEEK-116](https://proqltc-1791495894841.atlassian.net/browse/WEEK-116) (verbetering) · **Confluence:** [WEEK-116](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10125333)

- Geen AI meer: het weekmenu en het vervangen van een dag komen enkel uit de recepten in de databank (of, als die niet beschikbaar is, uit de ingebouwde lokale receptenbank).
- Als er te weinig recepten passen bij de keuzes, wordt het weekmenu aangevuld met recepten van een andere stijl of kooktijd, met een melding dat dit gebeurde.
- Vermeden ingrediënten (bv. varkensvlees, melk, noten) en het moment (ontbijt/avond) worden nooit overtreden, ook niet bij het aanvullen.
- Regressietests toegevoegd voor deze regels.

## [0.80.0] – 2026-10-19

**Jira:** [WEEK-107](https://proqltc-1791495894841.atlassian.net/browse/WEEK-107) (verbetering) · **Confluence:** [WEEK-107](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10420225)

- Weekmenu: de knop 'Op de lijst zetten' bij een ontbrekend ingrediënt is weg. Ingrediënten komen enkel op de boodschappenlijst via bevestigen, en dan enkel de ingrediënten die nog ontbreken.

## [0.79.3] – 2026-10-19

**Jira:** [WEEK-115](https://proqltc-1791495894841.atlassian.net/browse/WEEK-115) (bugfix, vervolg op WEEK-112) · **Confluence:** [WEEK-115](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10354689)

- Boodschappenlijst, tab Winkels: winkels worden gezocht binnen 10 km rond de postcode, in plaats van in heel België. Een storing wordt één keer opnieuw geprobeerd.
- De melding bij een mislukte zoekopdracht zegt of de winkelzoeker te druk is of dat er geen verbinding is.

## [0.79.2] – 2026-10-19

**Jira:** [WEEK-114](https://proqltc-1791495894841.atlassian.net/browse/WEEK-114) (bugfix) · **Confluence:** [WEEK-114](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10321921)

- Weekmenu: de knop Gekookt staat op een eigen regel, links uitgelijnd, en loopt niet meer buiten de dagkaart.

## [0.79.1] – 2026-10-19

**Jira:** [WEEK-113](https://proqltc-1791495894841.atlassian.net/browse/WEEK-113) (bugfix) · **Confluence:** [WEEK-113](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10289153)

- Weekmenu: het icoon om de bereidingsstappen is altijd zichtbaar bij een bevestigd recept, ook als er (nog) geen stappen bekend zijn. De pagina Bereiding toont dan een melding.

## [0.79.0] – 2026-10-19

**Jira:** [WEEK-105](https://proqltc-1791495894841.atlassian.net/browse/WEEK-105) (verbetering) · [WEEK-106](https://proqltc-1791495894841.atlassian.net/browse/WEEK-106) (verbetering) · [WEEK-108](https://proqltc-1791495894841.atlassian.net/browse/WEEK-108) (verbetering) · [WEEK-109](https://proqltc-1791495894841.atlassian.net/browse/WEEK-109) (verbetering) · [WEEK-110](https://proqltc-1791495894841.atlassian.net/browse/WEEK-110) (bugfix) · [WEEK-111](https://proqltc-1791495894841.atlassian.net/browse/WEEK-111) (verbetering) · [WEEK-112](https://proqltc-1791495894841.atlassian.net/browse/WEEK-112) (bugfix)

**Confluence:** [WEEK-105](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10059777) · [WEEK-106](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10092545) · [WEEK-108](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10125313) · [WEEK-109](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10158081) · [WEEK-110](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10190849) · [WEEK-111](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10223617) · [WEEK-112](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10256385)

- WEEK-105: Bij terugkeren naar een stap van de weekplanner staan de stijlen niet langer vooraf geselecteerd.
- WEEK-106: Weekmenu: de acties en labels op de plankaarten lijnen links uit, de status staat onder de dagnaam, en de twee onderste knoppen zijn weg.
- WEEK-108: Bereiding: een kruisje rechtsboven laat je de bereiding sluiten en terugkeren naar het weekmenu.
- WEEK-109: Frigo: het label van de planner staat op één regel (Recepten, in alle talen).
- WEEK-110: Scanner: het kruisje brengt je terug naar het scherm waar de scanner gestart werd, in plaats van naar de startpagina.
- WEEK-111: Boodschappenlijst: de tabnamen zijn volledig zichtbaar, en naast elke rubriek of elk recept staat een selectievakje om alle ingrediënten samen af te vinken.
- WEEK-112: Boodschappenlijst: de winkels worden getoond, ook als het postcodepunt niet opgehaald kan worden.

## [0.78.0] – 2026-10-19

**Jira:** [WEEK-104](https://proqltc-1791495894841.atlassian.net/browse/WEEK-104) (verbetering) · **Confluence:** [WEEK-104](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/10027009)

- Gezinsprofiel: de taalkeuze op het scherm is weggehaald, en onder Gezinsruimte zijn de invulvelden voor naam weg; een nieuw gezin krijgt de standaardnaam Gezin.
- Gezinsprofiel: de tellers heten Volwassenen en Kinderen, en een nieuw profiel start op 0 en 0.
- Gezinsprofiel: boven de adresvelden staan labels (Postcode, Gemeente, Land), en de zin over de AI is weggehaald.
- Gezinsprofiel: postcode invullen vult gemeente en land weer automatisch in; lukt het opzoeken niet, dan verschijnt een melding.

## [0.77.1] – 2026-10-19

**Jira:** [WEEK-103](https://proqltc-1791495894841.atlassian.net/browse/WEEK-103) (bugfix) · **Confluence:** [WEEK-103](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9961473)

- De Android-build-workflow maakt een werkende link naar de buildpagina op expo.dev (de eigenaarsnaam bevat geen extra tekst meer).

## [0.77.0] – 2026-10-19

**Jira:** [WEEK-96](https://proqltc-1791495894841.atlassian.net/browse/WEEK-96) (verbetering) · **Confluence:** [WEEK-96](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9797633)

- De twee sheets van de frigo hebben duidelijke lijnicoontjes en een subtiele paginatitel; de labels worden niet meer afgesneden.
- In de planner-frigo verdwijnen de ingrediëntknoppen (ze verschijnen enkel bij zoeken) en de link "Scan voor details".
- De teller op de tab en de teller onderaan tellen dezelfde producten (dubbele regels tellen één keer): het getal klopt nu.

## [0.76.2] – 2026-10-19

**Jira:** [WEEK-95](https://proqltc-1791495894841.atlassian.net/browse/WEEK-95) (bugfix) · **Confluence:** [WEEK-95](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9732097)

- Winkels zoeken: bij een storing van de eerste Overpass-server wordt een tweede server geprobeerd voordat de melding "Winkels zoeken lukte niet" verschijnt.
- In de boodschappenlijst is het camera-emoji vervangen door een scannericoon.

## [0.76.1] – 2026-10-19

**Jira:** [WEEK-94](https://proqltc-1791495894841.atlassian.net/browse/WEEK-94) (bugfix) · **Confluence:** [WEEK-94](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9011203)

- De keukenkaarten op de stap Stijl vullen de volledige breedte: het icoon en de naam zijn even groot en volledig zichtbaar.

## [0.76.0] – 2026-10-19

**Jira:** [WEEK-93](https://proqltc-1791495894841.atlassian.net/browse/WEEK-93) (verbetering) · **Confluence:** [WEEK-93](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9633793)

- Elk recept in het weekmenu toont de weekdag met de exacte datum (bv. "ma 19 okt"), in de taal van de app.

## [0.75.0] – 2026-10-19

**Jira:** [WEEK-97](https://proqltc-1791495894841.atlassian.net/browse/WEEK-97) (verbetering) · **Confluence:** [WEEK-97](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9502721)

- De periode van het weekmenu is een kalender met datums: kies een startdag en een laatste dag (max. 7 dagen, vanaf vandaag).
- Elke gekozen dag kan uit- en weer aangezet worden; het plan gebruikt de geselecteerde dagen.

## [0.74.2] – 2026-10-19

**Jira:** [WEEK-99](https://proqltc-1791495894841.atlassian.net/browse/WEEK-99) (bugfix) · **Confluence:** [WEEK-99](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9404417)

- Bij bewaren van het gezinsprofiel zijn postcode, gemeente en land verplicht; een duidelijke melding toont wat ontbreekt.

## [0.74.1] – 2026-10-19

**Jira:** [WEEK-100](https://proqltc-1791495894841.atlassian.net/browse/WEEK-100), [WEEK-101](https://proqltc-1791495894841.atlassian.net/browse/WEEK-101) (bugfix) · **Confluence:** [WEEK-100](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9338890), [WEEK-101](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9338909)

- Na het bewaren van de gezinssamenstelling gaat de app direct naar het menu.
- Vanuit de gezinssamenstelling start de weekplanner bij Periode zolang er geen dag bevestigd is.
- Na het koken van alle recepten start de weekplanner opnieuw bij Periode.

## [0.74.0] – 2026-10-19

**Jira:** [WEEK-102](https://proqltc-1791495894841.atlassian.net/browse/WEEK-102) (verbetering) · **Confluence:** [WEEK-102](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9240577)

- In de scanner staat rechtsboven een Annuleer-knop om de scan te sluiten.

## [0.73.1] – 2026-10-19

**Jira:** [WEEK-98](https://proqltc-1791495894841.atlassian.net/browse/WEEK-98) (bugfix) · **Confluence:** [WEEK-98](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/9043977)

- De vraag en de uitleg op het taalscherm volgen de gekozen taal.

## [0.73.0] – 2026-10-19

**Jira:** [WEEK-92](https://proqltc-1791495894841.atlassian.net/browse/WEEK-92) (verbetering) · **Confluence:** [WEEK-92](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8978433)

- De AI-teller en de AI-terugvalmeldingen zijn weg uit het weekmenu.
- Dagacties (bevestigen, ander gerecht, zelf kiezen, verwijderen) zijn duidelijke icoonknoppen, uitgelijnd op één rij.
- Een dagactie die niet mag (geen beheerder) legt uit waarom, in plaats van stil te blijven.
- De knop 'Gekookt' toont de status duidelijk; een afgewerkt gerecht toont '✓ Gekookt' in de kop.

## [0.72.6] – 2026-10-19

**Jira:** [WEEK-91](https://proqltc-1791495894841.atlassian.net/browse/WEEK-91) (bugfix) · **Confluence:** [WEEK-91](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8847371)

- Het welkomstscherm met de taalkeuze verschijnt bij de eerste opening, ook als er al een taal in de opslag staat.
- Een nieuw gezin start met 0 volwassenen en 0 kinderen.
- Terugnavigeren vanuit de scanner komt niet meer op de taalkeuze terecht.

## [0.72.5] – 2026-10-19

**Jira:** [WEEK-68](https://proqltc-1791495894841.atlassian.net/browse/WEEK-68) (verbetering) · **Confluence:** [WEEK-68 deel 5](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8749057)

- Onder de knop Volgende van het weekmenu staat een melding als er nog geen maaltijd, kooktijd of keuken is gekozen.

## [0.72.4] – 2026-10-18

**Jira:** [WEEK-89](https://proqltc-1791495894841.atlassian.net/browse/WEEK-89) (verbetering) · **Confluence:** [WEEK-89](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8060953)

- De tekstparser voor vrije opdrachten is verwijderd. De planner heeft geen tekstveld, dus de woorden hadden geen effect.
- Het aantal dagen komt enkel uit de gekozen periode. Soortkeuze, snelheidsvoorkeur en de goedkoop-regel zijn uit de planner gehaald.
- De lijst met opgeslagen vrije opdrachten is verwijderd. Oude plannen blijven leesbaar.
- De tekst van de lege planner vraagt niet meer om een opdracht te typen (zes talen).

## [0.72.3] – 2026-10-18

**Jira:** [WEEK-88](https://proqltc-1791495894841.atlassian.net/browse/WEEK-88) (verbetering) · **Confluence:** [WEEK-88](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8192077)

- 19 ongebruikte vertaalsleutels van kookboek, recepten en favoriet zijn verwijderd uit de zes taalbestanden.

## [0.72.2] – 2026-10-18

**Jira:** [WEEK-86](https://proqltc-1791495894841.atlassian.net/browse/WEEK-86) (herstel) · **Confluence:** [WEEK-86](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8060931)

- De Confluence-link in de sectie van 0.72.0 verwees naar de pagina van WEEK-73. Die verwijst nu naar de pagina van WEEK-86.

## [0.72.1] – 2026-10-18

**Jira:** [WEEK-87](https://proqltc-1791495894841.atlassian.net/browse/WEEK-87) (verbetering) · **Confluence:** [WEEK-87](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8421386)

- De scoreregel "goedkoop" is verwijderd uit de lokale planner. De planner heeft geen tekstveld, dus de wens kon nooit gekozen worden.
- Regressietest voor "goedkoop" is verwijderd.

## [0.72.0] – 2026-10-18

**Jira:** [WEEK-86](https://proqltc-1791495894841.atlassian.net/browse/WEEK-86) (verbetering) · **Confluence:** [WEEK-86](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8060931)

- De stijlen Thais, Japans en Koreaans hebben elk een eigen databasestijl. Eerder vielen ze onder aziatisch.
- Dagkaarten van het weekplan tonen het eigen stijlbeeld van deze drie keukens.
- Negen nieuwe recepten (drie per keuken) in de lokale receptenbank, met bereidingsstappen in zes talen.
- Database: de check-constraint op de stijl van een recept accepteert de drie nieuwe codes (migratie 20261018200000).
- Regressietests: de bestaande stijlen blijven ongewijzigd, en het goedkoop-filter vermijdt zalm.

## [0.71.0] – 2026-10-18

**Jira:** [WEEK-73](https://proqltc-1791495894841.atlassian.net/browse/WEEK-73) (verbetering) · **Confluence:** [WEEK-73](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8159262)

- Nieuwe lay-out op basis van het goedgekeurde thema, met petrol als accent en oranje voor de aandacht.
- Het weekmenu toont per keuken een eigen stijlbeeld, met een subtiele vlag van het land onderaan.
- Dagkaarten tonen het stijlbeeld van het gerecht, de bevestigingsstatus in de kop en de juiste knoptekst.
- De stappenbalk toont de namen van de stappen: Periode, Moment, Stijl, Vermijden, Plan.
- De onderste navigatie heeft iconen voor menu, lijst, frigo en scan.
- Regressietests voor de stappen, de statussen en de vertalingen van het weekmenu (nl, fr, de, en, es, pt).

## [0.70.0] – 2026-10-18

**Jira:** [WEEK-72](https://proqltc-1791495894841.atlassian.net/browse/WEEK-72) (verbetering) · **Confluence:** [WEEK-72](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8192058)

- Het kookboek (favorieten) en de pagina Mijn recepten zijn verwijderd. Bestaande favorieten in de database worden gewist.
- Eigen recepten die al op het toestel staan, blijven bruikbaar voor de bereidingsstappen in het weekmenu.
- Opgeslagen plannen met de bron favorieten worden als lokaal plan ingelezen.
- Regressietests: de lokale, AI- en databaseplanner, en het inlezen van oude plannen, zijn groen.

## [0.69.3] – 2026-10-18

**Jira:** [WEEK-85](https://proqltc-1791495894841.atlassian.net/browse/WEEK-85) (opruiming, testfout) · **Confluence:** [WEEK-85](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8323073)

- De test "met hetzelfde seed is het plan hetzelfde" faalde af en toe, omdat het moment van maken van het plan verschilt. De test vergelijkt nu de plannen zonder dat moment.
- Geen wijziging in de planner zelf.

## [0.69.2] – 2026-10-18

**Jira:** [WEEK-74](https://proqltc-1791495894841.atlassian.net/browse/WEEK-74) (controle, Actief) · **Confluence:** [WEEK-74](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8192040)

- Regressietest: geen enkele bereidingsstap in de zes talen bevat nog een hoeveelheid. De stappen zijn schaalbaar.
- De native-speaker controle van de fr- en en-teksten staat nog open; het workitem blijft daarom Actief.

## [0.69.1] – 2026-10-18

**Jira:** [WEEK-83](https://proqltc-1791495894841.atlassian.net/browse/WEEK-83) (opruiming) · **Confluence:** [WEEK-83](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8159234)

- Confluence-links in het changelog voor v0.53.0 t/m v0.56.0 wijzen nu naar de juiste pagina's.
- Ontbrekende Confluence-pagina voor [WEEK-68 deel 4a](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7602210) alsnog aangemaakt.
- Opmerking in het scan-scherm bijgewerkt naar de huidige scanlimiet.

## [0.69.0] – 2026-10-18

**Jira:** [WEEK-78](https://proqltc-1791495894841.atlassian.net/browse/WEEK-78) (verbetering, deel 2) · **Confluence:** [WEEK-78 deel 2](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/8192022)

- De stijlen licht en comfort zijn verwijderd uit de receptenbank, ook in de database. Het weekmenu kiest nog uit klassiek, italiaans, aziatisch, mexicaans en mediterraan.
- Keuzes belgisch en hartig vallen nu onder klassiek. Recept 10 hoort bij italiaans in plaats van belgisch.
- Regressietests leggen de stijlmapping vast, zodat de lokale, AI- en databaseplanner dezelfde geldige stijlen gebruiken.

## [0.68.0] – 2026-10-18

**Jira:** [WEEK-81](https://proqltc-1791495894841.atlassian.net/browse/WEEK-81) (verbetering) · **Confluence:** [WEEK-81](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7766089)

- Een bevestigd gerecht op het weekmenu krijgt een icoon. Met dat icoon open je de bereidingsstappen om tijdens het koken te volgen.
- De stappen van de 37 ingebouwde recepten staan in alle zes talen. Eigen recepten tonen de stappen uit de editor.
- Recepten zonder bekende stappen krijgen geen icoon.

## [0.67.0] – 2026-10-18

**Jira:** [WEEK-82](https://proqltc-1791495894841.atlassian.net/browse/WEEK-82) (verbetering) · **Confluence:** [WEEK-82](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7995418)

- Het welkomstscherm krijgt de goedgekeurde visual: het app-logo, de slogan, en een taalkeuze met de zes talen in het thema.
- Nieuwe vertalingen in alle zes talen voor het welkomstscherm.

## [0.66.0] – 2026-10-18

**Jira:** [WEEK-80](https://proqltc-1791495894841.atlassian.net/browse/WEEK-80) (verbetering) · **Confluence:** [WEEK-80](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7471141)

- De taal van de app hoort bij het toestel van één gebruiker. Ze gaat niet meer naar het gezin of naar andere toestellen.
- De taalkeuze staat op het instellingenscherm in een eigen blok 'Taal op dit toestel', los van de gezinsgegevens.

## [0.65.0] – 2026-10-18

**Jira:** [WEEK-79](https://proqltc-1791495894841.atlassian.net/browse/WEEK-79) (verbetering) · **Confluence:** [WEEK-79](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7962626)

- Bij de eerste opening kiest de gebruiker eerst zijn taal. Daarna gaat de app naar de gezinsruimte. Bij elke volgende opening komt de gebruiker op het menu.
- De taal wordt op het toestel opgeslagen, niet in het gedeelde gezinsprofiel (vervolg in WEEK-80).

## [0.64.0] – 2026-10-18

**Jira:** [WEEK-78](https://proqltc-1791495894841.atlassian.net/browse/WEEK-78) (verbetering) · **Confluence:** [WEEK-78](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7766072)

- De stijlen 'licht' en 'comfort' zijn verwijderd uit de lokale receptenbank. De vijf recepten die alleen zo waren, krijgen nu een andere stijl.
- De voorkeur 'gezond' geeft geen extra gewicht meer aan recepten in de lokale planner.

## [0.63.0] – 2026-10-18

**Jira:** [WEEK-71](https://proqltc-1791495894841.atlassian.net/browse/WEEK-71) (verbetering, deel 4) · **Confluence:** [WEEK-71 deel 4](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7995401)

- Het scan-scherm gebruikt het thema van frigo en lijst: petrol voor de hoofdacties, oranje voor afwijzen, lichte achtergrond.

## [0.62.0] – 2026-10-18

**Jira:** [WEEK-71](https://proqltc-1791495894841.atlassian.net/browse/WEEK-71) (verbetering, deel 3) · **Confluence:** [WEEK-71 deel 3](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7700533)

- Op het scan-scherm krijgt elk additief een korte uitleg: code, naam en functie (bv. E322: Lecithine · emulgator). Onbekende codes tonen enkel de code.
- Bij gewoon scannen (vanaf het scan-tabblad) is er enkel de knop Terug; Afwijzen, Op de lijst en In de frigo zijn daar weggehaald.

## [0.61.0] – 2026-10-18

**Jira:** [WEEK-77](https://proqltc-1791495894841.atlassian.net/browse/WEEK-77) (verbetering) · **Confluence:** [WEEK-77](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7700514)

- De tabbladen Winkels en Boodschappen hebben nu een lijnicoontje.
- Elke categorie in de lijst heeft een eigen lijnicoontje, zoals fruit, huishouden en avondeten.
- Nieuwe dependency: @expo/vector-icons (de versie die bij Expo 54 hoort).

## [0.60.0] – 2026-10-18

**Jira:** [WEEK-76](https://proqltc-1791495894841.atlassian.net/browse/WEEK-76) (verbetering) · **Confluence:** [WEEK-76](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7503935)

- De boodschappenpagina heeft twee hoofdtabbladen: Winkels (petrol, met het winkelvoorstel) en Boodschappen (oranje, met de lijst).
- In de lijst groepeer je per categorie of per recept, met pillen in plaats van een schakelaar.
- De lijst gebruikt de kleuren van de frigo: oranje voor het afvinken en het wissen van afgevinkte items.
- Gedrag en gegevens zijn ongewijzigd; de tekst van de tabbladen staat in alle zes talen.

## [0.59.0] – 2026-10-18

**Jira:** [WEEK-75](https://proqltc-1791495894841.atlassian.net/browse/WEEK-75) (verbetering) · **Confluence:** [WEEK-75](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7766025)

- De twee frigo-sheets zijn een schakelaar met een verhoogd actief vlak, icoon en teller, in plaats van losse tabbladen.
- Elke sheet heeft een eigen kleur: planner-frigo in petrol, losse producten in oranje. De kleurstreep, de toevoegknop en de scanknop volgen de actieve sheet.
- Gedrag en data zijn ongewijzigd; de kleurkeuze staat in een pure functie met unit tests.

## [0.58.1] – 2026-10-18

**Jira:** [WEEK-71](https://proqltc-1791495894841.atlassian.net/browse/WEEK-71) (deel 2, kleine aanpassing) · **Confluence:** [WEEK-71 deel 2](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7503897)

- De twee sheets van de frigo zijn tabbladen bovenaan, met een icoontje per tab. Ze blijven zichtbaar als de lijst scrolt.
- Het frigo-scherm gebruikt het goedgekeurde thema: petrol voor acties, oranje voor aandacht, papier als achtergrond en afgeronde kaarten voor de producten.

## [0.58.0] – 2026-10-18

**Jira:** [WEEK-71](https://proqltc-1791495894841.atlassian.net/browse/WEEK-71) (deel 2) · **Confluence:** [WEEK-71 deel 2](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7503897)

- De frigo heeft twee sheets: planner-frigo en losse producten.
- Planner-frigo: zoekbaar op ingrediënten uit de app. Alleen deze tellen mee bij het weekmenu; bij "Gekookt" gaan ze uit de frigo.
- Losse producten: vrij in te vullen, met scanner. Ze tellen niet mee bij het weekmenu, en de app ruimt ze nooit automatisch op.
- Bestaande frigo-items worden eenmalig gekoppeld: wat overeenkomt met een ingrediënt uit de app wordt planner-frigo, de rest wordt een los product. Niets wordt verwijderd.
- Zelfde ingrediënt twee keer kiezen in de planner-frigo geeft geen dubbele regel.
- Unit tests voor zoeken, de twee sheets, koppelen en het niet-verdwijnen van items.

## [0.57.0] – 2026-10-18

**Jira:** [WEEK-68](https://proqltc-1791495894841.atlassian.net/browse/WEEK-68) (deel 4b) · **Confluence:** [WEEK-68 deel 4b](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7700481)

- Het weekmenu heeft vijf stappen: periode (met kalender-icoon), moment en kooktijd, stijl (met landenkleuren), vermijden (optioneel) en het plan.
- Met een bestaand plan opent het scherm direct op het plan.
- De keuze "favorieten of nieuwe recepten" en het blok met voorkeuren zijn weggehaald; het plan komt altijd uit de database.
- Per dag bevestigen: een bevestigde dag ligt vast en zet zijn ingrediënten op de boodschappenlijst. Enkel bevestigde dagen komen op de lijst; de knop "Naar boodschappenlijst" opent de lijst.
- Een nieuw weekmenu vraagt eerst bevestiging als er al bevestigde dagen zijn; dan vervalt ook de boodschappenlijst.
- Tijdelijke vertaallaag tussen de nieuwe keuzes en de databasecodes, tot de database in WEEK-68 deel 4c is aangepast.
- Nieuwe pure logica en landenkleuren, met unit tests (regressietests op de bestaande planner en keuzes).

## [0.56.0] – 2026-10-18

**Jira:** [WEEK-71](https://proqltc-1791495894841.atlassian.net/browse/WEEK-71) (deel 1) · **Confluence:** [WEEK-71 deel 1](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7831553)

- De frigo kent twee soorten producten: planner-frigo (uit de catalogus, telt mee bij het koken) en losse producten (vrij ingegeven, de gebruiker beheert ze zelf).
- Bij "Gekookt" gaan enkel planner-producten uit de frigo; losse producten blijven staan.
- Oude frigo-items blijven werken: items uit de boodschappenlijst tellen mee, de rest is los.
- Nog niet in het scherm; de twee sheets volgen met het frigo-scherm.
- 12 nieuwe unit tests; bestaande testdata is expliciet als planner-product gemarkeerd.

## [0.55.0] – 2026-10-18

**Jira:** [WEEK-68](https://proqltc-1791495894841.atlassian.net/browse/WEEK-68) (deel 4a) · **Confluence:** [WEEK-68 deel 4a](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7602210)

- Kooktijden, stijlen en vermijden hangen af van het moment: ochtend heeft Snel, Rustig en Uitgebreid; middag en avond hebben Snel en Verfijnd.
- Nieuwe landenkeuken-stijlen voor middag en avond; "Ovenschotels" en "Snel en eenvoudig" zijn weggehaald.
- Keuzes die bij een ander moment niet meer passen, vallen weg.
- Het scherm gebruikt deze keuzes nog niet; de fasen van het weekmenu volgen in deel 4b.
- 14 nieuwe unit tests.

## [0.54.0] – 2026-10-18

**Jira:** [WEEK-68](https://proqltc-1791495894841.atlassian.net/browse/WEEK-68) (deel 3) · **Confluence:** [WEEK-68 deel 3](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7634945)

- Het weekmenu stelt het plan nu eerst samen uit de goedgekeurde recepten in de database, met het gezin als schaal.
- Wanneer de database geen passend recept geeft, blijft de AI-planner de terugval.
- Eén dag vervangen werkt ook voor een plan uit de database; de rest van de week blijft staan.

## [0.53.0] – 2026-10-18

**Jira:** [WEEK-68](https://proqltc-1791495894841.atlassian.net/browse/WEEK-68) (deel 2) · **Confluence:** [WEEK-68 deel 2](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7503874)

- Weekplan uit de database: kiezen uit de goedgekeurde recepten, met moment, kooktijd en stijl als filter.
- Gezin en kooktijden worden afgewogen; wanneer er te weinig recepten passen, worden de eisen stap voor stap versoepeld.
- Eén dag vervangen binnen de database-bron, zonder het recept van die dag opnieuw te kiezen.
- Nieuwe bron `db` in het plan; de normalisatie accepteert die.
- Het weekmenu gebruikt deze planner nog niet; de koppeling volgt in deel 3 van WEEK-68.
- Unit tests voor de nieuwe planner.

## [0.52.0] – 2026-10-18

**Jira:** [WEEK-68](https://proqltc-1791495894841.atlassian.net/browse/WEEK-68) (deel 1) · **Confluence:** [WEEK-68 deel 1](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7536650)

- Recepten uit de database omzetten naar het weekplan-formaat: titels en ingrediënten in de taal van de gebruiker, hoeveelheden geschaald naar het gezin.
- Ophalen van de goedgekeurde recepten uit Supabase (één keer per app-start).
- Het weekmenu gebruikt deze bron nog niet; het scherm volgt in de volgende delen van WEEK-68.
- 22 nieuwe unit tests.

## [0.51.0] – 2026-10-18

**Jira:** [WEEK-70](https://proqltc-1791495894841.atlassian.net/browse/WEEK-70) · **Confluence:** [WEEK-70 Boodschappenlijst](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7471122)

- Winkelvoorstel ingeklapt standaard, met een kaartje per winkel: adres, afstand, openingsuren en een link naar Google Maps.
- 📍 opent de winkels in een popup.
- Invoerveld en scanknop bovenaan de boodschappenlijst verwijderd.
- Per open product een 📷: het gescande product gaat enkel naar dat lijstitem (toevoegen of weigeren).
- Tests: adres, Google Maps-link en openingsuren, plus regressietest voor het uitlezen van OpenStreetMap.

## [0.50.0] – 2026-10-18

**Jira:** [WEEK-69](https://proqltc-1791495894841.atlassian.net/browse/WEEK-69) · **Confluence:** [WEEK-69 Gezinssamenstelling](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7471105)

- Budget en maximale afstand verdwenen uit het gezinsprofiel. Oude opgeslagen waarden worden genegeerd.
- Bij het invullen van een Belgische postcode worden gemeente en land automatisch voorgesteld.
- Winkelvoorstel: geen km-limiet meer; de dichtstbijzijnde winkel wordt gekozen.
- Tests bijgewerkt, regressietests toegevoegd voor oude profielen en het postcode-voorstel.

## [0.49.0] – 2026-10-18

**Jira:** [WEEK-67](https://proqltc-1791495894841.atlassian.net/browse/WEEK-67) · **Confluence:** [WEEK-67 Schaalregel en dagbevestiging](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/7340033)

- Schaalregel voor het gezin: 1 per volwassene, 0,5 per kind van 0 tot 12 jaar (`src/lib/schaal.ts`).
- Dagbevestiging in het weekplan: een bevestigde dag ligt vast, een nieuw weekplan vraagt bevestiging als er al dagen bevestigd zijn (`src/lib/planner/bevestiging.ts`).
- 20 nieuwe unit tests, bestaande tests ongewijzigd.

## [0.48.5] – 2026-10-17

**WEEK-38** – AdMob-bibliotheek naar 15, zodat de Android-build slaagt. [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-38) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6652037)

- `react-native-google-mobile-ads` naar 15.x: de nieuwere versies gebruiken een Google-SDK die niet compileert met de Kotlin-versie van Expo SDK 54.

## [0.48.4] – 2026-10-17

**WEEK-38** – Android-build met de juiste Kotlin-versie, zodat de AdMob-advertenties in de build werken. [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-38) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6193252)

- `react-native-google-mobile-ads` terug naar 17.3.0; Kotlin 2.3.0 ingesteld via `expo-build-properties`, zodat de nieuwste AdMob-SDK compileert.

## [0.48.3] – 2026-10-17

**WEEK-38** – AdMob-bibliotheek terug naar versie 16, zodat de Android-build slaagt. [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-38) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6520892)

- `react-native-google-mobile-ads` van 17.3.0 naar 16.x: 17.3.0 gaf Kotlin-fouten in de EAS-build met Expo SDK 54.

## [0.48.2] – 2026-10-17

**WEEK-38** – Privacybeleid vermeldt advertenties. [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-38) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6193229)

- Het privacybeleid (versie 4) beschrijft de Google AdMob-advertenties, het advertentie-id en de toestemming in de EU.

## [0.48.1] – 2026-10-17

**WEEK-38** – Echte beloningseenheid voor Android. [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-38) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6291501)

- Beloonde filmpjes op Android tonen echte advertenties in plaats van testadvertenties.

## [0.48.0] – 2026-10-17

**WEEK-38** – Reclamefilmpjes met beloning (AdMob), eerste stap: extra scans. [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-38) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6652012)

- Op het scherm "limiet bereikt" kan je een filmpje bekijken voor 10 extra scans; de bonus geldt enkel voor die dag.
- Het toestemmingsscherm (GDPR/UMP) en de advertenties via `react-native-google-mobile-ads`. Echte eenheid-ID's volgen voor de store-release; tot dan testadvertenties.
- Het tijdelijke installatie-workflow voor de typings is verwijderd.

## [0.47.0] – 2026-10-17

**WEEK-65** – Beheer van de gezinsruimte. [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-65) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6651991)

- De beheerder kan andere leden tot beheerder maken; het weekplan volgt die beheerder.
- De beheerder die vertrekt, kiest eerst een opvolger. Het laatste lid dat vertrekt, verwijdert het gezin.
- De beheerder kan de gezinsruimte opheffen; daarna is ze voor niemand meer toegankelijk.
- Server: migratie `20261017180000_gezin_beheerder` (beheerder op het gezin, nieuwe functies), met SQL-test.

## [0.46.0] – 2026-10-17

**WEEK-30** – Eén beheerder van het weekplan. [Jira](https://proqltc-1791495894841.atlassian.net/browse/WEEK-30) · [Confluence](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6651972)

- Het weekplan heeft één beheerder: wie het aanmaakt. Alleen die persoon kiest, vervangt, verwijdert of zet statussen op het plan; anderen zien het mee en krijgen de melding "Alleen {naam} kan dit weekplan wijzigen."
- Het tabblad Kies toont een ander gezinslid enkel de melding, geen keuzelijst.
- Zonder aanmelding (geen gezin) is er geen beheerder en blijft alles zoals voorheen.

## [0.45.0] – 2026-10-17

Nieuw: de scanner geeft dagelijks 10 gratis scans (was 3). Is de limiet op, dan zie je hoe lang het nog duurt tot de teller om middernacht gereset wordt.

- Jira: [WEEK-51](https://proqltc-1791495894841.atlassian.net/browse/WEEK-51)
- Confluence: [WEEK-51 – Scanner: 10 scans per dag en aftelling tot de reset](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6324312)

### Gewijzigd
- Gewijzigd: gratis limiet van 3 naar 10 scans per dag.
- Nieuw: bij een bereikte limiet de aftelling tot middernacht.
- Gewijzigd: store-tekst in zes talen noemt 10 scans per dag.
- Niet in deze versie: extra scans na een reclamefilmpje (WEEK-38, wacht op AdMob).

## [0.44.1] – 2026-10-17

Herstel in de Play Store-tekst: de privacy-link stond nog als placeholder. Nu staat de echte link erin.

- Jira: [WEEK-64](https://proqltc-1791495894841.atlassian.net/browse/WEEK-64)
- Confluence: [WEEK-64 – Privacy-link in de store-tekst](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6848544)

### Gewijzigd
- `store/listing.md`: de placeholder vervangen door https://proqltc-prog.github.io/famenu-privacy/.

## [0.44.0] – 2026-10-17

Nieuw: houdbaarheidsdatum op de frigo. Vul de datum van de verpakking in; de app waarschuwt als een product bijna verloopt of verlopen is. Zonder datum staat er niets: er wordt niets geschat.

- Jira: [WEEK-20](https://proqltc-1791495894841.atlassian.net/browse/WEEK-20)
- Confluence: [WEEK-20 – Houdbaarheidsdatum van producten in de frigo](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6455325)

### Gewijzigd
- Nieuw: bij een frigo-item de knop "Houdbaarheid" om een datum (dd-mm-jjjj) in te vullen of te wissen. De datum geldt voor het oudste exemplaar.
- Nieuw: waarschuwing "Bijna verlopen" tot 3 dagen voor de datum, en "Verlopen" daarna.
- Niet in deze versie: uitlezen van de datum met de camera of uit de barcode, en AI-recepten op basis van bijna-verlopen producten.

## [0.43.0] – 2026-10-17

Nieuw: het totaal van een gerecht. Als alle producten van een recept gescand en afgevinkt zijn, zie je op de boodschappenlijst de voeding (kcal, suikers, eiwitten, vet, zout) voor het hele gezin, en alle additieven.

- Jira: [WEEK-50](https://proqltc-1791495894841.atlassian.net/browse/WEEK-50)
- Confluence: [WEEK-50 – Totaal voeding en additieven van een gerecht na scannen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6455306)

### Gewijzigd
- Nieuw: boven elk recept op de lijst een blok "Totaal voor het gezin", zodra alle ingrediënten gescand zijn.
- Nieuw: bij afvinken via de scanner krijgt het ingrediënt de productdetails mee (WEEK-49).
- Ingrediënten in stuk of teentje tellen niet mee in het totaal; ze staan bij "Niet berekend".

## [0.42.0] – 2026-10-17

Nieuw: productdetails bij frigo-items. Een gescand product in de frigo kan je later opnieuw bekijken: oordeel, voeding per 100 g en additieven. Een product zonder details toon je met één tik "Scan voor details".

- Jira: [WEEK-49](https://proqltc-1791495894841.atlassian.net/browse/WEEK-49)
- Confluence: [WEEK-49 – Productdetails raadplegen van aangekochte producten in de frigo](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6848516)

### Gewijzigd
- Nieuw: bij een gescand product in de frigo staat "Productdetails" om oordeel, voeding en additieven te zien.
- Nieuw: bij een product zonder details staat "Scan voor details"; de scanner koppelt de gegevens aan dat frigo-item.
- Bestaande frigo-items zonder scan blijven ongewijzigd.

## [0.41.0] – 2026-10-17

Nieuw: scannen op de frigo. Tik op Scan en scan een product dat je net gekocht hebt; het gaat direct in de frigo, in de juiste afdeling.

- Jira: [WEEK-47](https://proqltc-1791495894841.atlassian.net/browse/WEEK-47)
- Confluence: [WEEK-47 – Aangekochte producten scannen in de frigo](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6258754)

### Gewijzigd
- Nieuw: knop Scan op de frigo-pagina.
- Nieuw: na een scan vanaf de frigo staat "In de frigo zetten" vooraan; daarna keer je terug naar de frigo.

## [0.40.0] – 2026-10-17

Nieuw: als je op de boodschappenlijst scant en het product staat al in je frigo, kun je het van de lijst halen. De frigo blijft dan ongewijzigd.

- Jira: [WEEK-48](https://proqltc-1791495894841.atlassian.net/browse/WEEK-48)
- Confluence: [WEEK-48 – Product van de lijst verwijderen als het al in de frigo staat](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6520854)

### Gewijzigd
- Nieuw: "Dit staat al in je frigo." na een scan vanaf de lijst, met de knop "Verwijderen van de lijst".
- Matchen op hele woorden, nu ook voor de frigo.

## [0.39.0] – 2026-10-17

Nieuw: scannen vanaf de boodschappenlijst. Tik op Scan, scan een product en vink het af als het op je lijst staat. Het product gaat dan naar de frigo, net als bij afvinken in de lijst. Het tabblad Scan werkt zoals voorheen, los van lijst en frigo.

- Jira: [WEEK-46](https://proqltc-1791495894841.atlassian.net/browse/WEEK-46)
- Confluence: [WEEK-46 – Scannen vanaf de boodschappenlijst om af te vinken](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6422568)

### Gewijzigd
- Nieuw: knop Scan op de boodschappenlijst.
- Nieuw: "Afvinken op de lijst" na een scan, voor openstaande items die bij het product horen (op hele woorden).
- Gewijzigd: als een gescand product niet op de lijst staat, komt er een melding.

## [0.38.0] – 2026-10-17

Nieuw: Mijn recepten. Voeg eigen recepten toe, wijzig ze of verwijder ze. Een recept geldt voor één volwassene; het gezin rekent de hoeveelheden om. Ingrediënten zoek je in de lijst van de app; een ingrediënt dat er niet tussen staat, voeg je zelf toe en vind je later terug. Eigen recepten blijven op dit toestel.

- Jira: [WEEK-45](https://proqltc-1791495894841.atlassian.net/browse/WEEK-45)
- Confluence: [WEEK-45 – Pagina Mijn recepten](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6651932)

### Gewijzigd
- Nieuw: pagina Mijn recepten met bron Alle / Eigen / Favorieten, filters op soort, kooktijd en stijl, en een zoekbalk. Bereikbaar onder het weekmenu.
- Nieuw: recept toevoegen en wijzigen (naam, soort, kooktijd, stijlen, ingrediënten, bereiding stap per stap) en verwijderen na bevestiging.
- Nieuw: handmatig ingrediënt wordt meegezocht bij latere zoekopdrachten.

## [0.37.0] – 2026-10-17

Nieuw: op het weekmenu kan je een gerecht zelf kiezen uit de receptenbank, een gerecht verwijderen, of een maaltijd toevoegen. Reset (↻) blijft zoals het was. Verwijderen haalt ook de ingrediënten van de boodschappenlijst, als ze er al op stonden.

- Jira: [WEEK-44](https://proqltc-1791495894841.atlassian.net/browse/WEEK-44)
- Confluence: [WEEK-44 – Gerechten op het weekmenu resetten, verwijderen of zelf kiezen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6422550)

### Gewijzigd
- Nieuw: knop "Zelf kiezen" per gerecht; een lijst met recepten voor hetzelfde moment, met zoekbalk en de voorkeuren als filter.
- Nieuw: knop "Verwijderen" per gerecht (met bevestiging). Ingrediënten die op de boodschappenlijst staan, gaan mee weg, met een melding.
- Nieuw: "+ Gerecht toevoegen" onder het weekmenu, op de eerste vrije dag voor het gekozen moment.
- Gekookte gerechten kunnen niet verwijderd worden.

## [0.36.0] – 2026-10-17

Nieuw: kies voor welke maaltijden het weekmenu is: ontbijt, middag en/of avond. Standaard blijft het avondmenu. Per dag komt er een plek per gekozen moment, en een vervangen ontbijt blijft een ontbijt. Er zijn nieuwe ontbijt- en middagrecepten in alle zes talen.

- Jira: [WEEK-43](https://proqltc-1791495894841.atlassian.net/browse/WEEK-43)
- Confluence: [WEEK-43 – Ontbijt, middag en/of avond kiezen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6717441)

### Gewijzigd
- Nieuw: keuze voor de maaltijden (ontbijt, middag, avond), onthouden op het toestel. Op het kookboek niet zichtbaar.
- Nieuw: 4 ontbijtrecepten en 4 middagrecepten, met nieuwe ingrediënten (yoghurt, muesli, havermout, fruit, komkommer, avocado, honing).
- Ontbijt en middag gaan via de lokale planner; de AI-planner kent nog enkel avondrecepten.

## [0.35.0] – 2026-10-17

Nieuw: periode kiezen. Op het eerste tabblad kies je hoeveel dagen het weekmenu telt: 2 tot en met 7 (7 is een volle week). De keuze wordt onthouden en geldt voor de lokale planner, de AI en het kookboek. Zonder keuze blijft het standaard 6 dagen.

- Jira: [WEEK-42](https://proqltc-1791495894841.atlassian.net/browse/WEEK-42)
- Confluence: [WEEK-42 – Periode kiezen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6324276)

### Gewijzigd
- Nieuw: keuze voor de periode (aantal dagen) op het eerste tabblad, onthouden op het toestel.
- Een gekozen periode gaat voor een getal in de opdracht; het plan, de AI-aanvraag en het kookboek gebruiken hetzelfde aantal dagen.
- Privacybeleid versie 3: het aantal dagen wordt, net als de andere keuzes, meegestuurd naar de AI.

## [0.34.0] – 2026-10-17

Nieuw: ingrediënten vermijden. Het vrije tekstveld op het eerste tabblad is weg; in de plaats kies je wat je niet wil (varkensvlees, schaaldieren, zuivel, vis, eieren, noten). De keuze geldt voor de lokale planner, de AI, het kookboek en het vervangen van één dag.

- Jira: [WEEK-41](https://proqltc-1791495894841.atlassian.net/browse/WEEK-41)
- Confluence: [WEEK-41 – Ingrediënten vermijden](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6553602)

### Gewijzigd
- Verwijderd: vrij tekstveld en de lijst met vorige opdrachten op het eerste tabblad. Het aantal dagen wordt niet meer via tekst gekozen (standaard 6 dagen).
- Nieuw: keuzes om ingrediënten te vermijden, onthouden op het toestel en opgeslagen bij het weekplan.
- Recepten met een verboden ingrediënt komen niet in het plan, ook niet bij het vervangen van één dag.
- De AI krijgt de uitsluitingen mee. Een AI-recept met een verboden ingrediënt wordt afgekeurd; dan neemt de lokale planner het over.
- Privacybeleid bijgewerkt: de keuzes gaan mee naar de AI.
- Regressietests op de planner, het vervangen van een dag en het opslaan van plannen.

## [0.33.4] – 2026-10-17

Documentatie: de privacypagina heeft een link naar de Engelse versie, zodat die meteen zichtbaar is.

- Jira: [WEEK-63](https://proqltc-1791495894841.atlassian.net/browse/WEEK-63) (vervolg op [WEEK-62](https://proqltc-1791495894841.atlassian.net/browse/WEEK-62))

### Gewijzigd
- `scripts/build-privacybeleid.py`: taallinks bovenaan en bij de Engelse versie.

## [0.33.3] – 2026-10-17

Documentatie: het privacybeleid is klaar als webpagina (`docs/privacybeleid/index.html`), om te publiceren als link in de Play Console. Het advertentiedeel staat er nog niet in; dat komt bij de AdMob-release.

- Jira: [WEEK-62](https://proqltc-1791495894841.atlassian.net/browse/WEEK-62)
- Confluence: [WEEK-62 – Privacybeleid als publieke webpagina](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6324255)

### Gewijzigd
- Nieuw: `scripts/build-privacybeleid.py` bouwt de pagina uit `store/privacybeleid.md`.
- Nieuw: `docs/privacybeleid/index.html`, in Nederlands en Engels.

## [0.33.2] – 2026-10-17

Documentatie: de uitgeversgegevens (Proqltc, Roosdaal, België) en het contactadres zijn ingevuld in het privacybeleid, de Play Data safety-tekst en de winkelteksten.

- Jira: [WEEK-61](https://proqltc-1791495894841.atlassian.net/browse/WEEK-61) (vervolg op [WEEK-59](https://proqltc-1791495894841.atlassian.net/browse/WEEK-59))
- Confluence: [WEEK-61 – Uitgeversgegevens invullen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6520833)

### Gewijzigd
- `store/privacybeleid.md`, `store/data-safety.md`, `store/listing.md`: placeholders voor uitgever en contact ingevuld.

## [0.33.1] – 2026-10-17

Documentatie: het privacybeleid en de Play Data safety-tekst beschrijven nu de postcode die naar OpenStreetMap gaat voor het winkelvoorstel, en dat er geen GPS-locatie gebruikt wordt.

- Jira: [WEEK-59](https://proqltc-1791495894841.atlassian.net/browse/WEEK-59)
- Confluence: [WEEK-59 – Privacybeleid bijwerken](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6127626)

### Gewijzigd
- `store/privacybeleid.md`: versie 2, nieuwe rij voor postcode en gemeente, open deel voor advertenties.
- Nieuw: `store/data-safety.md` met de Play Data safety-tekst.

## [0.33.0] – 2026-10-17

Gewijzigd: het winkelvoorstel gebruikt de postcode uit het profiel in plaats van GPS. Bij elke wijziging van de boodschappenlijst wordt het voorstel opnieuw berekend. De GPS-toestemming vervalt.

- Jira: [WEEK-60](https://proqltc-1791495894841.atlassian.net/browse/WEEK-60) (vervangt [WEEK-58](https://proqltc-1791495894841.atlassian.net/browse/WEEK-58) voor de locatie)
- Confluence: [WEEK-60 – Winkelvoorstel op basis van postcode i.p.v. GPS](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6258726)

### Gewijzigd
- Verwijderd: GPS-locatie, expo-location en de toestemmingstekst. Geen knop meer; het voorstel verschijnt automatisch.
- Nieuw: postcode wordt eenmalig omgezet naar een punt (OpenStreetMap Nominatim), zodat de maximale afstand uit het profiel werkt.
- Winkels en postcodepunt worden per postcode bewaard; een andere postcode vraagt opnieuw het netwerk.
- Zonder geldige postcode verschijnt een melding.
- Regressietests op de winkelquery en het antwoord lezen.

## [0.32.0] – 2026-10-17

Nieuw: het winkelvoorstel staat bovenaan de boodschappenpagina en werkt automatisch bij. Afstanden worden berekend met de GPS-locatie van het toestel (met terugval op de postcode). De locatie wordt enkel gevraagd na een tik op de knop en niet bewaard.

- Jira: [WEEK-57](https://proqltc-1791495894841.atlassian.net/browse/WEEK-57) (stap 2: weergave), [WEEK-58](https://proqltc-1791495894841.atlassian.net/browse/WEEK-58)
- Confluence: [WEEK-58 – GPS-locatie voor afstand naar winkels](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6094890)

### Gewijzigd
- Nieuw: knop "Toon winkelvoorstel" op de boodschappenpagina, met de winkels per type en hun afstand.
- Nieuw: GPS-locatie via expo-location; zonder toestemming wordt de postcode uit het profiel gebruikt.
- Winkels worden per locatie en straal in het geheugen bewaard; een wijziging van de lijst vraagt geen nieuw netwerkverzoek.
- Het voorstel wordt opnieuw berekend bij elke wijziging van de lijst, ook na het aanvaarden van een recept.
- Winkels die niet binnen de maximale afstand liggen, worden expliciet vermeld.
- De postcode-zoekknop is verplaatst van het profiel naar de boodschappenpagina.
- Vertalingen in zes talen.
- Regressietests op de winkelzoeker van WEEK-53.

## [0.31.0] – 2026-10-17

Nieuw (stap 1): logica voor een automatisch winkelvoorstel. Het kiest het minste aantal winkels dat de boodschappenlijst dekt, binnen de maximale afstand. De weergave volgt later.

- Jira: [WEEK-57](https://proqltc-1791495894841.atlassian.net/browse/WEEK-57)
- Confluence: [WEEK-57 – Automatisch winkelvoorstel (stap 1: logica)](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6422529)

### Gewijzigd
- Nieuw: afdeling naar winkeltype, dekking door supermarkten, keuze met zo weinig mogelijk stops, afstand (haversine).
- Regressietests op de winkelzoeker van WEEK-53.

## [0.30.0] – 2026-10-17

Nieuw: winkels in de buurt. Met één tik zoekt de app supermarkten, slagers, bakkers en groentehandelaars bij je postcode en gemeente. Lokaal eerst, zonder iets op te leggen.

- Jira: [WEEK-53](https://proqltc-1791495894841.atlassian.net/browse/WEEK-53)
- Confluence: [WEEK-53 – Winkels in de buurt op basis van postcode](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6094860)

### Gewijzigd
- Knop 'Zoek winkels in de buurt' bij het adres. Enkel op verzoek.
- Winkels via OpenStreetMap: eerst dezelfde postcode, dan dezelfde gemeente.
- Bronvermelding © OpenStreetMap-bijdragers.

## [0.29.0] – 2026-10-17

Nieuw: bovenaan de instellingen staat een korte uitleg 'Hoe werkt het?' met de vijf onderdelen van de app.

- Jira: [WEEK-56](https://proqltc-1791495894841.atlassian.net/browse/WEEK-56)
- Confluence: [WEEK-56 – Hoe werkt het? (uitleg in de instellingen)](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6324234)

### Gewijzigd
- Kaart 'Hoe werkt het?' bovenaan het instellingenscherm, in zes talen.

## [0.28.0] – 2026-10-17

Verbetering: het gezinstabblad is weg. Taal en gezinsruimte staan achter een instellingen-icoon rechtsboven op het menu.

- Jira: [WEEK-39](https://proqltc-1791495894841.atlassian.net/browse/WEEK-39)
- Confluence: [WEEK-39 – Instellingen-icoon op het menu](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6258708)

### Gewijzigd
- Instellingen-icoon (⚙) rechtsboven op het menu, opent het gezinsscherm met taal en gezinsruimte.
- Het gezin-tabblad is verwijderd uit de tabbalk.

## [0.27.1] – 2026-10-17

Aanpassing: de uitleg bij de postcode zegt nu dat we winkels in de buurt voorstellen, eerst lokaal, zonder iets op te leggen.

- Jira: [WEEK-52](https://proqltc-1791495894841.atlassian.net/browse/WEEK-52)
- Confluence: [WEEK-52 – Tekst: postcode om winkels in de buurt voor te stellen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6389761)

## [0.27.0] – 2026-10-17

Verbetering: het gezinsscherm legt uit waarom we de postcode vragen: om lokale winkels te vinden.

- Jira: [WEEK-52](https://proqltc-1791495894841.atlassian.net/browse/WEEK-52)
- Confluence: [WEEK-52 – Uitleg bij postcode in het gezinsscherm](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6193191)

### Gewijzigd
- Informatieve box boven de postcode, vertaald in alle zes talen.

## [0.26.1] – 2026-10-17

Aanpassing: een bekeken reclamefilmpje geeft 10 extra scans voor die dag, in plaats van 3.

- Jira: [WEEK-38](https://proqltc-1791495894841.atlassian.net/browse/WEEK-38)
- Confluence: [WEEK-38 – Reclamefilmpje geeft 10 extra scans](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6291457)

## [0.26.0] – 2026-10-17

Nieuw (stap 1): logica voor reclamefilmpjes met beloning. Een filmpje geeft extra scans voor die dag. De knop en de advertentie volgen later.

- Jira: [WEEK-38](https://proqltc-1791495894841.atlassian.net/browse/WEEK-38)
- Confluence: [WEEK-38 – Reclamefilmpjes via AdMob (stap 1: beloningslogica)](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6258689)

### Gewijzigd
- Nieuw: beloning per filmpje, 1 extra AI-vraag of 3 extra scans.
- Scanteller: extra scans van vandaag als bonus. Het gratis maximum blijft 3 per dag.
- Regressietests op de bestaande scanlimiet.

## [0.25.1] – 2026-10-17

Werkafspraak: bij elke nieuwe functionaliteit of wijziging voegen we ook regressietests toe, zodat bestaand gedrag niet stukgaat.

- Jira: [WEEK-55](https://proqltc-1791495894841.atlassian.net/browse/WEEK-55)
- Confluence: [WEEK-55 – Regressietests bij elke nieuwe bouw](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/6193163)

### Gewijzigd
- CLAUDE.md, punt 3: regressietests voor het bestaande gedrag, naast de unit tests voor nieuwe logica.

## [0.25.0] – 2026-10-17

Verbetering: het gezinsscherm vraagt enkel nog postcode en gemeente, en je kan een maximale afstand voor de boodschappen instellen. Het straatveld en het vrije veld voor de gezinssamenstelling zijn weg.

- Jira: [WEEK-40](https://proqltc-1791495894841.atlassian.net/browse/WEEK-40)
- Confluence: [WEEK-40 – Postcode, gemeente en maximale afstand](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/5996546)

### Gewijzigd
- Adres: enkel postcode en gemeente (en land), geen straat meer.
- Nieuw: maximale afstand voor de boodschappen in km (1 tot 100, optioneel).
- Het vrije veld voor de gezinssamenstelling is verwijderd.
- Bestaande profielen met een straat of gezinssamenstelling blijven werken; die gegevens worden genegeerd.

## [0.24.0] – 2026-10-17

Verbetering: het gezinsscherm vraagt het aantal kinderen tot 12 jaar in plaats van hun leeftijd. Elk kind telt als een halve portie.

- Jira: [WEEK-40](https://proqltc-1791495894841.atlassian.net/browse/WEEK-40)
- Confluence: [WEEK-40 – Gezin met aantal kinderen i.p.v. leeftijd](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/5931033)

### Gewijzigd
- Gezinsprofiel: aantal volwassenen en aantal kinderen (0 tot 12 jaar), zonder leeftijd per kind.
- Porties: volwassenen + 0,5 per kind, het totaal naar boven afgerond (2 volwassenen + 1 kind = 3).
- Ingrediënten in stuks worden altijd naar boven afgerond op een heel stuk.
- Het profiel legt uit waarom we de aantallen vragen.
- Bestaande profielen met een leeftijd per kind worden automatisch omgezet naar een aantal.

## [0.23.0] – 2026-10-17

Verbetering: de betaalde versie is verwijderd. Alle functies zijn gratis; later bepalen we wat er via reclame toegankelijk wordt (WEEK-38).

- Jira: [WEEK-54](https://proqltc-1791495894841.atlassian.net/browse/WEEK-54)
- Confluence: [WEEK-54 – Betaalde versie verwijderd](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/5931010)

### Gewijzigd
- Frigo: hoeveelheid, eenheid, afdeling en scannen rechtstreeks in de frigo zijn voor iedereen beschikbaar.
- Scanner: het product in de frigo zetten kan voor iedereen. De limiet van 3 scans per dag blijft als basis.
- AI-planner: de limiet van 1 voorstel per gezin per dag blijft als basis.

### Verwijderd
- De tabel `gezin_abonnement` in de database, en de functies en teksten die erover gaan (WEEK-35, WEEK-36).

## [0.22.2] – 2026-10-11

Bugfix: de Android-build bij Expo faalde bij het installeren van de afhankelijkheden. npm haalde react-dom 19.3 binnen, dat niet past bij react 19.1.

- Jira: [WEEK-37](https://proqltc-1791495894841.atlassian.net/browse/WEEK-37)
- Confluence: [WEEK-37 – Famenu in de Google Play Store](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2654209)

### Opgelost
- react-dom staat nu vast op 19.1.0, gelijk aan react, en react-native op 0.81.5, de versie die Expo SDK 54 verwacht.
- De workflow "Android-build" toont opnieuw de link naar de build.

## [0.22.1] – 2026-10-11

Bugfix: de Android-build voerde de tests uit met Node 20, waar het testcommando niet werkt. De build gebruikt nu Node 22, net als de andere workflows.

- Jira: [WEEK-37](https://proqltc-1791495894841.atlassian.net/browse/WEEK-37)
- Confluence: [WEEK-37 – Famenu in de Google Play Store](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2654209)

## [0.22.0] – 2026-10-11

De app heet voortaan **Famenu** en is klaar om voor de Google Play Store gebouwd te worden.

- Jira: [WEEK-37](https://proqltc-1791495894841.atlassian.net/browse/WEEK-37)
- Confluence: [WEEK-37 – Famenu in de Google Play Store](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2654209)

### Toegevoegd
- Nieuwe naam: Famenu (`be.famenu.app`), met een eerste icoon.
- Build-configuratie (EAS): een APK om zelf te testen en een AAB voor de Play Store, plus een GitHub-workflow "Android-build".
- Winkelteksten in 6 talen, afbeeldingen voor de winkel en een ontwerp van het privacybeleid (`store/`).

### Gewijzigd
- De app vraagt enkel toegang tot de camera, niet tot de microfoon.

## [0.21.0] – 2026-10-11

Scanlimiet: 3 gratis scans per dag, onbeperkt voor betalende gezinnen.

- Jira: [WEEK-34](https://proqltc-1791495894841.atlassian.net/browse/WEEK-34)
- Confluence: [WEEK-34 – Scanlimiet](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2621441)

### Gewijzigd
- De gratis versie scant 3 producten per dag. Het scherm toont hoeveel scans er nog over zijn, en na 3 scans verschijnt een melding.
- Betalende gezinnen scannen onbeperkt.

## [0.20.0] – 2026-10-11

Betalende versie: zelf producten in de frigo zetten, met hoeveelheid en afdeling of via de scanner.

- Jira: [WEEK-35](https://proqltc-1791495894841.atlassian.net/browse/WEEK-35)
- Confluence: [WEEK-35 – Zelf producten in de frigo](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2228305)

### Toegevoegd
- Frigo (betalend): hoeveelheid, eenheid (g, ml, stuks) en afdeling bij zelf toevoegen.
- Scanner (betalend): de knop "In de frigo" zet het product in de juiste afdeling.
- Gratis gezinnen houden het eenvoudige invoerveld, met een korte uitleg over de betalende versie.

## [0.19.0] – 2026-10-11

AI-limiet per gezin: 1 AI-voorstel per dag (gratis) of 3 (betalend gezin).

- Jira: [WEEK-33](https://proqltc-1791495894841.atlassian.net/browse/WEEK-33)
- Confluence: [WEEK-33 – AI-limiet per gezin](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2228284)

### Gewijzigd
- Alle toestellen van een gezin delen de daglimiet. Een nieuwe dag begint om middernacht (Belgische tijd).
- Gratis: 1 AI-voorstel per dag. Betalend gezin: 3. Daarna komt het voorstel uit de receptenbank, ook bij ↻.

### Toegevoegd
- Onder de knop staat hoeveel AI-voorstellen er vandaag nog over zijn (in 6 talen).

## [0.18.1] – 2026-10-10

De AI-planner gebruikt standaard het goedkoopste model.

- Jira: [WEEK-32](https://proqltc-1791495894841.atlassian.net/browse/WEEK-32)
- Confluence: [WEEK-32 – AI-planner op het goedkoopste model](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2195632)

### Gewijzigd
- Standaardmodel Claude Haiku 5.5 in plaats van Sonnet 5.5. Een weekmenu kost ongeveer $0,001 in plaats van $0,025. Een ander model kan met het secret `PLANNER_MODEL`.

## [0.18.0] – 2026-10-10

De AI-planner werkt standaard in de app, via de server-functie in Supabase, met aanmelding en een limiet.

- Jira: [WEEK-31](https://proqltc-1791495894841.atlassian.net/browse/WEEK-31)
- Confluence: [WEEK-31 – AI-planner uitrollen op Supabase](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2195603)

### Toegevoegd
- *Voorstel van de AI* werkt zonder extra instellingen. De API-sleutel blijft op de server.
- Enkel aangemelde toestellen mogen de AI gebruiken. Daglimiet per toestel: 5 AI-voorstellen (gratis) of 30 (betalend gezin).
- Is de daglimiet bereikt, dan meldt de app dat en komt het voorstel uit de receptenbank. Bij een andere fout neemt de lokale planner ook over.
- Integratietest voor de AI-planner.

## [0.17.3] – 2026-10-10

Bugfix: het weekplan veilig bijwerken bij "Gekookt?" en bij een reset (gevonden bij een onafhankelijke review).

- Jira: [WEEK-28](https://proqltc-1791495894841.atlassian.net/browse/WEEK-28)
- Confluence: [WEEK-28 – Weekplan veilig bijwerken](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2195571)

### Opgelost
- Dubbel tikken op "Gekookt?" verbruikte de ingrediënten twee keer.
- Een trage reset (AI) overschreef wat intussen in het plan veranderde.

## [0.17.2] – 2026-10-10

Bugfix: lijstitems hebben per weekplan een eigen id (gevonden bij een onafhankelijke review).

- Jira: [WEEK-29](https://proqltc-1791495894841.atlassian.net/browse/WEEK-29)
- Confluence: [WEEK-29 – Lijstitems per weekplan een eigen id](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2228246)

### Opgelost
- Hetzelfde gerecht in een volgende week bracht de frigo in de war (nieuw gekocht kwam niet in de frigo, restjes werden opnieuw gekocht).
- Hetzelfde ingrediënt twee keer in één recept wordt één item met de som.

## [0.17.1] – 2026-10-10

Bugfix: synchronisatie van de gezinsruimte robuuster (gevonden bij een onafhankelijke review).

- Jira: [WEEK-27](https://proqltc-1791495894841.atlassian.net/browse/WEEK-27)
- Confluence: [WEEK-27 – Synchronisatie gezinsruimte robuuster](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1802289)

### Opgelost
- Een dubbel item kon een toestel blijvend blokkeren (de database weigerde de hele batch).
- Een mislukte eerste samenvoeging na het aansluiten wordt opnieuw geprobeerd tot ze lukt.
- Eigen favorieten en frigo-items verdwijnen niet meer bij het aansluiten omdat het gezin vroeger een item met dezelfde naam verwijderde.
- Verloren aanmelding: het toestel sluit automatisch opnieuw aan met de bewaarde code in plaats van stil los te koppelen.

## [0.17.0] – 2026-10-10

Planmodus "Random uit favorieten": een week uit het eigen kookboek.

- Jira: [WEEK-14](https://proqltc-1791495894841.atlassian.net/browse/WEEK-14)
- Confluence: [WEEK-14 – Planmodus: random uit favorieten](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1736727)

### Toegevoegd
- Keuze **Nieuwe recepten** / **Random uit favorieten** in het weekmenu.
- Random uit favorieten: frigo-voorrang op dag 1, filters op kooktijd, stijl en harde wensen, geen herhaling binnen de week of t.o.v. vorige week (met meldingen als het kookboek te klein is).
- Hoeveelheden herrekend naar het huidige gezin; ↻ kiest een andere favoriet.

## [0.16.0] – 2026-10-10

Favorieten: een geslaagd recept bewaren in het gezinskookboek.

- Jira: [WEEK-21](https://proqltc-1791495894841.atlassian.net/browse/WEEK-21)
- Confluence: [WEEK-21 – Geslaagd recept opslaan als favoriet](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2228226)

### Toegevoegd
- **☆ Geslaagd? Bewaar als favoriet** op een gekookte dag; bewaart naam, stijl, kooktijd, ingrediënten en aantal personen.
- Scherm **Kookboek** (via het weekmenu) met alle favorieten, ingrediënten en verwijderen.
- Favorieten worden gedeeld via de gezinsruimte.

## [0.15.1] – 2026-10-10

Bugfix: na een lange stilte kwam de eerste wijziging van een gezinslid niet live binnen.

- Jira: [WEEK-26](https://proqltc-1791495894841.atlassian.net/browse/WEEK-26)
- Confluence: [WEEK-26 – Eerste wijziging na een lange stilte komt niet live binnen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2195458)

### Opgelost
- De app haalt na het verbinden nog twee keer bij (na 5 en 20 seconden) en daarna elke minuut zolang ze open is; een gemiste live-update komt zo ten laatste na een minuut binnen.
- Integratietest bestand tegen een koude start van Supabase Realtime (meldt een waarschuwing).

## [0.15.0] – 2026-10-10

Frigo-voorrang: eerst opmaken wat al in huis is, en niet opnieuw kopen wat je al hebt.

- Jira: [WEEK-12](https://proqltc-1791495894841.atlassian.net/browse/WEEK-12)
- Confluence: [WEEK-12 – Frigo-voorrang bij weekplanning](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2031626)

### Toegevoegd
- Dag 1 krijgt het recept dat het meest opmaakt van wat al (het langst) in huis is; ook de AI-planner krijgt de frigo mee.
- "♻ Al in huis: …" op de dagkaart.
- Bij het overzetten naar de boodschappenlijst gaat wat al in huis is eraf (of enkel het verschil komt erop).

### Gewijzigd
- Opnieuw overzetten behoudt ook wie iets afvinkte.

## [0.14.1] – 2026-10-10

Bugfix: live updates van de gezinsruimte kwamen soms niet binnen.

- Jira: [WEEK-25](https://proqltc-1791495894841.atlassian.net/browse/WEEK-25)
- Confluence: [WEEK-25 – Live updates van de gezinsruimte komen soms niet binnen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2031646)

### Opgelost
- Het live-kanaal kreeg soms het toegangstoken van de gebruiker pas na het inschrijven en zag dan niets; het token wordt nu vooraf doorgegeven.

## [0.14.0] – 2026-10-10

Receptstatussen: gepland, ingrediënt ontbreekt, gedaan — gekoppeld aan de frigo.

- Jira: [WEEK-13](https://proqltc-1791495894841.atlassian.net/browse/WEEK-13)
- Confluence: [WEEK-13 – Receptstatussen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/2064386)

### Toegevoegd
- Een product met × uit de frigo halen zet elk gepland recept dat het nodig heeft op **Ingrediënt ontbreekt**, met de knoppen **Op de lijst zetten** en **Ander gerecht**.
- Opnieuw gekocht (afgevinkt) → het recept staat weer op **Gepland**. Alle ingrediënten weg → **Gedaan**.

### Gewijzigd
- Het weekmenu laadt het plan opnieuw bij elk bezoek; *Gekookt?* werkt altijd op het bewaarde plan.

## [0.13.0] – 2026-10-10

Producten uit de frigo halen: gekookte recepten verbruiken hun ingrediënten, en zelf iets weghalen kan met één tik.

- Jira: [WEEK-19](https://proqltc-1791495894841.atlassian.net/browse/WEEK-19)
- Confluence: [WEEK-19 – Producten uit de frigo halen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1802269)

### Toegevoegd
- Knop **Gekookt?** per dag: het recept komt op **✓ Gedaan** en de ingrediënten gaan uit de frigo (enkel de nodige hoeveelheid, oudste producten eerst).
- Nog eens tikken zet alles precies terug.
- **×** naast elk product in de frigo om het eruit te halen.

## [0.12.0] – 2026-10-10

Gedeelde boodschappenlijst: zien wie wat toevoegde en wie wat al kocht.

- Jira: [WEEK-17](https://proqltc-1791495894841.atlassian.net/browse/WEEK-17)
- Confluence: [WEEK-17 – Gedeelde lijst: live afvinken en losse items toevoegen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1703940)

### Toegevoegd
- "Gekocht door <naam>" onder afgevinkte items en "toegevoegd door <naam>" onder zelf toegevoegde items.
- Bovenaan de lijst: gedeeld met je gezin en de status van de synchronisatie.

## [0.11.0] – 2026-10-10

Gezinsruimte: weekplanning, boodschappenlijst, frigo en gezinsprofiel delen met het hele gezin, live op elk toestel.

- Jira: [WEEK-8](https://proqltc-1791495894841.atlassian.net/browse/WEEK-8)
- Confluence: [WEEK-8 – Gedeelde gezinsruimte met meerdere leden](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1802249)

### Toegevoegd
- Tabblad **Gezin** › **Gezinsruimte**: een gezinsruimte maken of lid worden met een code van 6 tekens; code delen, leden en status zien, gezinsruimte verlaten.
- Lijst, frigo, weekplan en gezinsprofiel worden gedeeld en verversen live. Taal, vorige opdrachten en keuzes blijven per toestel.
- Synchronisatie per item (gelijktijdig afvinken verliest niets), laatste wijziging wint; werkt offline en verstuurt later.
- Supabase-project *gezond-boodschappen* met database, toegangsregels (enkel leden zien hun gezin) en anonieme aanmelding per toestel.
- Integratietest (GitHub Actions) tegen het echte project en een SQL-test voor de toegangsregels.

### Gewijzigd
- Wijzigingen aan lijst, frigo, plan en profiel lopen via één wachtrij op het toestel, zodat niets elkaar overschrijft.

## [0.10.0] – 2026-10-10

Virtuele frigo: wat je afvinkt op de boodschappenlijst, staat daarna vanzelf in de frigo.

- Jira: [WEEK-18](https://proqltc-1791495894841.atlassian.net/browse/WEEK-18)
- Confluence: [WEEK-18 – Afgevinkte producten automatisch in de frigo](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1867786)

### Toegevoegd
- Tabblad **Frigo**, per winkelafdeling, met hoeveelheid en "sinds <datum>".
- Afvinken op de lijst (= gekocht) zet het product in de frigo; het vinkje weghalen haalt het er weer uit.
- Elk gekocht item wordt apart bewaard met het tijdstip van aankoop (basis om later de oudste producten eerst te gebruiken).
- Zelf iets toevoegen dat al in huis is.

### Opmerking
- Huishoudproducten (wc-papier, tandpasta) komen niet in de frigo.

## [0.9.0] – 2026-10-10

Twee weergaven van de boodschappenlijst: per recept en per categorie.

- Jira: [WEEK-16](https://proqltc-1791495894841.atlassian.net/browse/WEEK-16)
- Confluence: [WEEK-16 – Twee weergaven: per recept en per categorie](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1540098)

### Toegevoegd
- Schakelaar **Per recept** / **Per categorie** bovenaan de lijst; de keuze wordt onthouden.
- Per recept: één sectie per gerecht in de volgorde van de week, met de hoeveelheden van dat recept.
- Per categorie: alles per winkelafdeling in winkelvolgorde, dubbele items samengeteld, met de receptnamen eronder.
- Afvinken werkt in beide weergaven samen.

## [0.8.0] – 2026-10-10

Weekplanning overzetten naar de boodschappenlijst, zonder dubbels en zonder vinkjes te verliezen.

- Jira: [WEEK-15](https://proqltc-1791495894841.atlassian.net/browse/WEEK-15)
- Confluence: [WEEK-15 – Weekplanning overzetten naar boodschappenlijst](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1277989)

### Toegevoegd
- Knop **Voeg items toe aan boodschappenlijst** met bevestiging van het aantal ingrediënten.
- Elk lijstitem kent zijn recept, dag en winkelafdeling.

### Gewijzigd
- Overzetten vervangt de items van het vorige weekplan; zelf toegevoegde en gescande items en vinkjes blijven behouden.
- Hetzelfde ingrediënt uit meerdere recepten staat als één regel met opgetelde hoeveelheid; afvinken geldt voor alle recepten.

## [0.7.0] – 2026-10-10

Reset-knop per dag: één gerecht vervangen, de rest van de week blijft staan.

- Jira: [WEEK-11](https://proqltc-1791495894841.atlassian.net/browse/WEEK-11)
- Confluence: [WEEK-11 – Reset-knop per dag met variatiebewaking](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1310787)

### Toegevoegd
- ↻-knop op elke dag van de weekkalender.
- Het nieuwe recept staat nog nergens in de week, heeft niet dezelfde basis als de dag ervoor of erna en volgt de oorspronkelijke wensen (opdracht, kooktijd, stijl).
- Met AI wordt enkel die dag gevraagd, met de andere recepten als "vermijden"; bij een fout kiest de lokale planner.

## [0.6.0] – 2026-10-10

AI-planner met recepten in de gekozen taal, met terugval op de lokale planner.

- Jira: [WEEK-23](https://proqltc-1791495894841.atlassian.net/browse/WEEK-23)
- Confluence: [WEEK-23 – AI-output in de gekozen taal](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1310767)

### Toegevoegd
- AI-client: stuurt taal, profiel (zonder straat of postcode), porties, opdracht, kooktijd, stijl en dagen naar een server-functie.
- Server-functie `supabase/functions/plan-week`: vraagt het weekmenu aan Claude met een vast JSON-schema; de API-sleutel blijft op de server.
- Strikte controle van het AI-antwoord; harde regels (geen vlees/vis, kooktijd) worden in de app opnieuw afgedwongen.
- Terugval op de lokale planner als de AI niet ingesteld is of faalt, met melding.
- README: stappen om de AI-planner in te schakelen.

### Opmerking
- De server-functie is nog niet uitgerold; tot dan gebruikt de app de lokale planner.

## [0.5.0] – 2026-10-10

Keuze voor kooktijd en stijl, voor de hele week.

- Jira: [WEEK-10](https://proqltc-1791495894841.atlassian.net/browse/WEEK-10)
- Confluence: [WEEK-10 – Keuze kooktijd en stijl](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/983283)

### Toegevoegd
- Keuzeblokken **kooktijd** (snel, gemiddeld, uitgebreid) en **stijl** (7 stijlen) met meerdere selecties op de startpagina.
- De keuzes gaan mee naar de planner en blijven bewaard.
- Melding als er te weinig recepten waren en de planner moest versoepelen; "geen vlees/vis" blijft altijd gelden.

## [0.4.0] – 2026-10-10

Weekplanning met een vrije opdracht en de laatste 3 opdrachten.

- Jira: [WEEK-9](https://proqltc-1791495894841.atlassian.net/browse/WEEK-9)
- Confluence: [WEEK-9 – Promptveld met placeholder en laatste 3 opdrachten](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1146896)

### Toegevoegd
- Tekstveld om de weekplanning te sturen, met uitleg in de placeholder.
- De laatste 3 opdrachten onder het veld; aantikken laadt ze in het veld, versturen pas met *Plan mijn week*.
- Receptenbank met 29 recepten en 57 ingrediënten, in alle 6 talen, met winkelafdeling en hoeveelheid per portie.
- Lokale planner: leest aantal dagen, geen vlees/vis, meer vis, snel, gezond en goedkoop uit de opdracht (6 talen) en zorgt voor variatie.
- Hoeveelheden berekend voor het hele gezin (kinderen eten kleinere porties) en zichtbaar op de boodschappenlijst.
- Weekplan en opdrachten worden op het toestel bewaard.

### Gewijzigd
- Het vaste weekmenu met 10 recepten is vervangen door de planner.

## [0.3.0] – 2026-10-10

App-interface in 6 talen: Nederlands, Frans, Duits, Engels, Spaans en Portugees.

- Jira: [WEEK-22](https://proqltc-1791495894841.atlassian.net/browse/WEEK-22)
- Confluence: [WEEK-22 – App-interface in 6 talen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1310739)

### Toegevoegd
- Vertaalmodule met één bestand per taal; alle schermteksten vertaald.
- Taal volgt het toestel (niet-ondersteunde taal → Engels) en is aanpasbaar in het tabblad **Gezin**.
- Lijstcategorieën, vaste items, gezondheidsscore en voedingswaarden in de gekozen taal; getallen met het juiste decimaalteken.
- Productnaam van Open Food Facts in de taal van de gebruiker als die bestaat.

### Gewijzigd
- Gezondheidsscore en lijstcategorieën gebruiken taalonafhankelijke codes; bestaande lijsten blijven werken.

## [0.2.0] – 2026-10-10

Gezinsprofiel met vaste instellingen.

- Jira: [WEEK-7](https://proqltc-1791495894841.atlassian.net/browse/WEEK-7)
- Confluence: [WEEK-7 – Gezinsprofiel met vaste instellingen](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1441794)

### Toegevoegd
- Tabblad **Gezin**: volwassenen, kinderen met leeftijd, weekbudget, gezinssamenstelling en adres; bewaard op het toestel.
- Controle bij het bewaren (minstens 1 volwassene, leeftijd 0–17, geldig budget en postcode).
- Profielcontext die automatisch met elke AI-vraag meegaat (enkel gemeente en land, nooit straat of postcode).
- Weekmenu toont voor hoeveel personen er gepland wordt.

## [0.1.1] – 2026-10-10

Testinfrastructuur: unit tests verplicht voor elke merge.

- Jira: [WEEK-24](https://proqltc-1791495894841.atlassian.net/browse/WEEK-24)
- Confluence: [WEEK-24 – Testinfrastructuur en CI](https://proqltc-1791495894841.atlassian.net/wiki/spaces/WEEK/pages/1212504)

### Toegevoegd
- Unit tests met de ingebouwde Node-testrunner (`npm test`) voor weekmenu, boodschappenlijst en gezondheidsscore.
- Workflow **Tests**: draait tests en typecontrole op elke pull request en push naar `main`.
- De release-workflow maakt pas een release als de tests slagen.

### Gewijzigd
- Opslag van de lijst verhuisd naar `src/opslag/lijst.ts`; de pure lijstlogica blijft in `src/lib/lijst.ts`.
- Werkafspraken (CLAUDE.md) bijgewerkt naar Jira-project WEEK en Confluence-space WEEK.

## [0.1.0] – 2026-10-08

Eerste versie van de app (Expo / React Native, expo-router met drie tabs).

### Toegevoegd
- **Weekmenu** – snelle avondmaaltijden zondag–vrijdag, afwisselend vlees, vegetarisch en vis; knop "Nieuw voorstel".
- **Boodschappenlijst** – automatisch opgebouwd uit het weekmenu + vaste items (brood & beleg, fruit, school, huishouden); afvinken, zelf items toevoegen, afgevinkte items wissen; lokaal bewaard op het toestel.
- **Barcode scannen** – scan EAN/UPC-barcodes met de camera; productgegevens via Open Food Facts.
- **Gezondheidsscore** – score 0–100 met label Goed / Matig / Liever niet op basis van Nutri-Score, NOVA, additieven, suiker, zout en eiwit; voedingswaarden per 100 g; product accepteren of afwijzen.

[0.1.0]: https://github.com/Proqltc-prog/expo-app/releases/tag/v0.1.0

[0.1.1]: https://github.com/Proqltc-prog/expo-app/releases/tag/v0.1.1
[0.2.0]: https://github.com/Proqltc-prog/expo-app/releases/tag/v0.2.0
[0.3.0]: https://github.com/Proqltc-prog/expo-app/releases/tag/v0.3.0
[0.4.0]: https://github.com/Proqltc-prog/expo-app/releases/tag/v0.4.0
[0.5.0]: https://github.com/Proqltc-prog/expo-app/releases/tag/v0.5.0
[0.6.0]: https://github.com/Proqltc-prog/expo-app/releases/tag/v0.6.0
[0.7.0]: https://github.com/Proqltc-prog/expo-app/releases/tag/v0.7.0
[0.8.0]: https://github.com/Proqltc-prog/expo-app/releases/tag/v0.8.0
[0.9.0]: https://github.com/Proqltc-prog/expo-app/releases/tag/v0.9.0
