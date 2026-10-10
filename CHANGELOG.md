# Changelog

Alle wijzigingen aan Gezond Boodschappen. Versies volgen [Semantic Versioning](https://semver.org/lang/nl/):

- **MAJOR** (1.0.0) – grote, niet-compatibele wijziging (bv. eerste publieke release)
- **MINOR** (0.2.0) – nieuwe functionaliteit of verbetering
- **PATCH** (0.1.1) – bugfix of kleine aanpassing

Elke versie verwijst naar zijn Jira-workitem(s) en Confluence-pagina.

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
