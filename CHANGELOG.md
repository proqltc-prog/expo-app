# Changelog

Alle wijzigingen aan Gezond Boodschappen. Versies volgen [Semantic Versioning](https://semver.org/lang/nl/):

- **MAJOR** (1.0.0) – grote, niet-compatibele wijziging (bv. eerste publieke release)
- **MINOR** (0.2.0) – nieuwe functionaliteit of verbetering
- **PATCH** (0.1.1) – bugfix of kleine aanpassing

Elke versie verwijst naar zijn Jira-workitem(s) en Confluence-pagina.

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
