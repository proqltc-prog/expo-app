# Changelog

Alle wijzigingen aan Gezond Boodschappen. Versies volgen [Semantic Versioning](https://semver.org/lang/nl/):

- **MAJOR** (1.0.0) – grote, niet-compatibele wijziging (bv. eerste publieke release)
- **MINOR** (0.2.0) – nieuwe functionaliteit of verbetering
- **PATCH** (0.1.1) – bugfix of kleine aanpassing

Elke versie verwijst naar zijn Jira-workitem(s) en Confluence-pagina.

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
