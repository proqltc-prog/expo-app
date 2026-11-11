---
name: gebruikerstest
description: Test Famenu zoals een gewone gebruiker, van A tot Z, in de webversie op telefoonformaat, en valideer tegen de acceptatiecriteria in Jira. Gebruik voor elke merge of APK, en wanneer de eigenaar vraagt om "grondig te testen", "als gebruiker te testen" of "de flow te controleren". Bevat ook de regels om GitHub niet te overbelasten.
---

# Gebruikerstest Famenu

Doel: de app gebruiken zoals een gezin dat doet, niet zoals een ontwikkelaar. Elke stap eindigt met wat de
gebruiker ziet, niet met wat de code zegt.

## Voorbereiding

1. Alle automatische controles eerst: `npm test`, `npm run typecheck:logica`, `npm run typecheck`.
   Rood? Eerst oplossen, dan pas klikken.
2. Test de code die online komt: voeg de te mergen branches lokaal samen op een **lokale** testbranch
   (`git checkout -b test/samen origin/main` en `git merge` per branch). Nooit pushen.
3. Start de webversie met `preview_start` (configuratie `famenu-web` in `.claude/launch.json`).
   `expo start` past soms `tsconfig.json` aan: zet dat terug met `git checkout -- tsconfig.json`, nooit committen.
4. Telefoonformaat: `resize_window` met preset `mobile`. Aan het einde terug naar `desktop`.
5. Nieuwe gebruiker simuleren: `localStorage.clear()` en de pagina herladen. Een terugkerende gebruiker:
   de opslag laten staan.

## Klikken zoals een gebruiker

- Gebruik `find` en klik op de **ref** van een knop. Geen coördinaten uit een schermafdruk: de schaal wisselt
  en dan klik je naast de knop.
- Na elke stap: `get_page_text` of een kleine `zoom` om te zien wat de gebruiker ziet. Een schermafdruk kan
  achterlopen; bij twijfel `javascript_tool` om waarden te lezen (niet om te klikken of iets te veranderen).
- Kijk na elke flow in de console: `read_console_messages` met `onlyErrors`.
- Let op wat **even** zichtbaar is: lees de URL in de tab-context na elke klik (bv. een pagina die heel kort
  verschijnt voor een doorverwijzing is een fout).

## De flow van A tot Z

| Stap | Wat de gebruiker doet | Verwacht |
|---|---|---|
| 1 | App openen voor het eerst | Startscherm met Aan de slag en Aanmelden; geen weekplanner ervoor |
| 2 | Aanmelden | Enkel Google en Verder zonder account (WEEK-225) |
| 3 | Aanmelden met Google | Meteen naar Google, **zonder** eerst de weekplanner (WEEK-231); terugkeeradres eindigt op `/aangemeld` |
| 4 | Terug van Google, eerste keer | Gezinsprofiel (instellingen met gezinsruimte) |
| 5 | Terug van Google, gezin al ingesteld | Weekplanner |
| 6 | Verder zonder account | Gezinsprofiel |
| 7 | Gezin instellen (volwassenen, kinderen, postcode) | Gemeente vult zich in; menu toont "Voor N personen" |
| 8 | Weekmenu: periode, kooktijd, stijl, vermijden, plan | Gerechten passen bij de keuzes |
| 9 | Dag bevestigen | Status Bevestigd, knop Gekookt |
| 10 | Lijst: recepten | Hoeveelheden voor het gezin; geen water, zout, peper (WEEK-211) |
| 11 | Lijst: los product toevoegen | Juiste categorie; frigo nog leeg (WEEK-183) |
| 12 | Afvinken, dan frigo | Recepten onder Recepten, losse onder Losse producten (WEEK-204) |
| 13 | Frigo: los product toevoegen en wijzigen | Hoeveelheid, categorie, houdbaarheid, waarschuwing bijna verlopen (WEEK-180) |
| 14 | Bereiding | "in huis" bij wat in de frigo ligt (WEEK-217); stappen vanaf 1 |
| 15 | Gekookt | Receptingrediënten uit de frigo, losse blijven |
| 16 | Productdetails/scan | Score bovenaan, plus- en minpunten, additieven met EU-waarschuwing (WEEK-220, WEEK-224) |

Zonder camera: zet in de lokale opslag een **verzonnen** gescand product in de frigo (sleutel `frigo:v1`,
veld `product`) en open de productdetails. Zeg altijd dat het verzonnen testgegevens zijn.

Wat niet kan: echt aanmelden met Google gebeurt met het account van de eigenaar. Test tot aan het keuzescherm
van Google en laat de rest aan de eigenaar; zeg dat duidelijk.

## Acceptatiecriteria

Haal de criteria uit de Jira-items (beschrijving en de laatste opmerkingen; afspraken van de eigenaar in de
chat gaan voor op een oudere beschrijving). Rapporteer per criterium: ✓, ✗ (met wat je zag) of niet getest
(met de reden). Kleine bevindingen die niet blokkeren: één verzamelitem in Jira.

## GitHub niet overbelasten

De eigenaar wil niet opnieuw geschorst worden. Daarom:

- **Geen lussen op de GitHub-API.** Niet-aangemelde API-vragen zijn beperkt tot 60 per uur per IP.
- Controleer releases en tags met `git ls-remote --tags origin vX.Y.Z` (geen API).
- Controleer of de webapp online staat door de live pagina te lezen (GitHub Pages telt niet mee), bv. het
  versienummer in de bundel.
- CI-status: hoogstens één vraag per minuut, en hoogstens 10 per merge. Liever de PR-pagina één keer openen
  in de browser.
- Merge één pull request tegelijk en wacht op de groene test; geen herhaalde pushes om CI te "porren".
- Geen massa-acties (veel PR's, labels, comments) zonder vraag van de eigenaar.

## Rapport

Kort, in gewone taal, in het Nederlands: wat werkt, wat niet (met oorzaak), wat niet getest kon worden, en
wat de eigenaar zelf nog moet doen.
