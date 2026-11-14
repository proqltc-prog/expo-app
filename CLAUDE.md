# Werkafspraken – Gezond Boodschappen

## Elke wijziging = workitem + Confluence-pagina + versie

Voor **elke** nieuwe functionaliteit, verbetering of bugfix:

1. **Jira** – maak een workitem aan in project **WEEK** (Weekplanner) op proqltc-1791495894841.atlassian.net (of neem het bestaande backlog-item) en zet het op *Actief*.
2. **Code** – werk op een branch `feature/<JIRA-KEY>-korte-naam` of `fix/<JIRA-KEY>-korte-naam`; vermeld de Jira-key in elke commitboodschap (`WEEK-12: ...`).
3. **Tests** – schrijf unit tests voor elke nieuwe of gewijzigde logica en voer ze uit (`npm test`). Voeg daarnaast **regressietests** toe: tests die het bestaande gedrag vastleggen dat de wijziging kan raken, zodat bestaande functionaliteit niet stukgaat. **Geen merge zonder groene tests**: de workflow `.github/workflows/test.yml` draait tests en typecontrole op elke pull request.
4. **Versie** – verhoog de versie volgens SemVer in `package.json` **en** `app.json`:
   - MINOR (0.x.0) voor nieuwe functionaliteit of verbetering
   - PATCH (0.x.y) voor bugfixes en kleine aanpassingen
5. **CHANGELOG.md** – voeg bovenaan een sectie toe voor de nieuwe versie met de Jira-key en de link naar de Confluence-pagina.
6. **Confluence** – maak een pagina per workitem in space **WEEK** onder "Workitems" met: doel, wat er gewijzigd is, hoe te testen, versie, links naar Jira-item, commit/tag en GitHub-release; vul de versietabel op de pagina "Versies" aan.
7. **GitHub** – pull request naar `main`, mergen zodra de tests groen zijn. De workflow `.github/workflows/release.yml` draait de tests opnieuw en maakt dan automatisch tag `vX.Y.Z` en de GitHub-release aan met de tekst uit CHANGELOG.md (zet daar dus de links naar Jira en Confluence in).
8. **Jira** – zet het workitem op *Gereed*, met de fixVersion `vX.Y.Z` en links naar Confluence en de GitHub-release.

## Code-structuur en tests

- `src/lib/`, `src/data/`, `src/i18n/` – **pure logica** zonder React Native-imports, getest met `node:test` (bestanden `*.test.ts` naast de code).
- `src/data/ingredienten.gegenereerd.ts` – de ingrediëntenlijst, uit de databank gegenereerd met `npm run ingredienten` (WEEK-205). Niet met de hand bewerken; opnieuw genereren na elke wijziging aan de ingrediënten in de databank.
- `src/data/additieven.gegenereerd.ts` – alle additieven (naam, functie, EFSA-risico), gegenereerd uit de additievenlijst van Open Food Facts met `npm run additieven` (WEEK-290). Niet met de hand bewerken.
- `src/opslag/` – opslag op het toestel (AsyncStorage); hou die dun.
- `app/` – schermen; zet logica zoveel mogelijk in `src/lib` zodat ze testbaar is.
- `npm test` – unit tests · `npm run typecheck:logica` – typecontrole pure logica · `npm run typecheck` – volledige app · `npm run check` – alles.

## Taal

UI-teksten, Jira, Confluence en changelog in het Nederlands (Vlaams). Code-identifiers mogen Nederlands blijven zoals nu.
