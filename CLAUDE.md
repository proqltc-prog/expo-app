# Werkafspraken – Gezond Boodschappen

## Elke wijziging = workitem + Confluence-pagina + versie

Voor **elke** nieuwe functionaliteit, verbetering of bugfix:

1. **Jira** – maak een workitem aan op proqltc.atlassian.net (of neem het bestaande backlog-item) en zet het op *In Progress*.
2. **Code** – werk op een branch `feature/<JIRA-KEY>-korte-naam` of `fix/<JIRA-KEY>-korte-naam`; vermeld de Jira-key in elke commitboodschap (`GB-12: ...`).
3. **Versie** – verhoog de versie volgens SemVer in `package.json` **en** `app.json`:
   - MINOR (0.x.0) voor nieuwe functionaliteit of verbetering
   - PATCH (0.x.y) voor bugfixes en kleine aanpassingen
4. **CHANGELOG.md** – voeg bovenaan een sectie toe voor de nieuwe versie met de Jira-key en de link naar de Confluence-pagina.
5. **Confluence** – maak een pagina per workitem onder "Gezond Boodschappen › Workitems" met: doel, wat er gewijzigd is, hoe te testen, versie, links naar Jira-item, commit/tag en GitHub-release; vul de versietabel op de pagina "Versies" aan.
6. **GitHub** – merge naar `main`. De workflow `.github/workflows/release.yml` maakt dan automatisch tag `vX.Y.Z` en de GitHub-release aan met de tekst uit CHANGELOG.md (zet daar dus de links naar Jira en Confluence in).
7. **Jira** – zet het workitem op *Done*, met de fixVersion `vX.Y.Z` en links naar Confluence en de GitHub-release.

## Taal

UI-teksten, Jira, Confluence en changelog in het Nederlands (Vlaams). Code-identifiers mogen Nederlands blijven zoals nu.
