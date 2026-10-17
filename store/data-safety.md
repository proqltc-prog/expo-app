# Play Data safety – Famenu

*Versie 1 – 17 oktober 2026 · concept om over te nemen in de Google Play Console (Data safety). Nog na te kijken door de eigenaar.*

Google vraagt de categorieën in het Engels. Hieronder staat per categorie wat de app verzamelt of doorstuurt, en waarom. Gegevens die enkel op het toestel blijven, tellen niet mee.

## Gegevens die de app verzamelt of doorstuurt

| Categorie (Play) | Gegeven | Doorgestuurd naar | Verplicht of optioneel | Doel |
| --- | --- | --- | --- | --- |
| Location – Approximate location | Postcode en gemeente (enkel bij het winkelvoorstel) | OpenStreetMap (Nominatim, Overpass) | Optioneel: enkel als je het winkelvoorstel gebruikt | App functionality |
| Personal info – Address | Postcode en gemeente uit het profiel | Zelfde als hierboven | Optioneel, zelfde voorwaarde | App functionality |
| Personal info – Other / User IDs | Anonieme gebruikers-id per toestel | Supabase (EU) | Verplicht voor de gezinsruimte | Account management, app functionality |
| App activity – Other actions | Aantal AI-aanvragen per dag | Supabase (EU) | Verplicht voor de AI-planner | App functionality (daglimiet) |
| Messages / User-generated content | Kooktijd- en stijlkeuzes, te vermijden ingrediënten, gezinsprofiel en frigo-inhoud bij een AI-voorstel | Anthropic (Claude), via onze server | Optioneel: enkel bij gebruik van de AI-planner | App functionality |
| Food / Other | Gescande barcode | Open Food Facts | Optioneel: enkel bij het scannen | App functionality |
| Device or other IDs – Advertising ID | Google advertentie-id | Google AdMob | Automatisch zodra advertenties actief zijn | Advertising or marketing |

## Niet verzameld

- GPS- of exacte locatie van het toestel.
- Foto's, video's of audio (de camera leest enkel barcodes; de microfoon wordt niet gebruikt).
- Naam, e-mailadres, telefoonnummer of financiële gegevens.
- Contacten, agenda, bestanden buiten de app.

## Beveiliging en rechten

- Gegevens worden versleuteld verstuurd (HTTPS).
- Gebruikers kunnen vragen om hun gegevens te laten wissen: via proqltc@gmail.com of door de app te verwijderen (gegevens op het toestel).
- Gegevens worden niet verkocht.

## Opmerkingen voor de Play Console

- Het advertentie-id staat pas op "ja" wanneer de AdMob-integratie (WEEK-38) live staat. Zet het dan aan en pas het privacybeleid aan.
- Bij twijfel over een categorie: kies de strengste keuze, zodat de verklaring klopt met wat de app echt doet.
