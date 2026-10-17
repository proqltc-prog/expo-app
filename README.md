# Famenu

*(werknaam: Gezond Boodschappen)*

Smartphone-app (React Native / Expo) voor de wekelijkse maaltijdplanning en boodschappen van een gezin.

- **Weekplanning** – beschrijf je week in een vrij tekstveld (aantal dagen, geen vlees, Nutri-Score, snel klaar…), kies kooktijd en stijl, en krijg een gevarieerd weekmenu. Je laatste 3 opdrachten staan klaar om te hergebruiken.
- **Gezinsprofiel** – volwassenen, kinderen, budget, maximale afstand en postcode/gemeente vul je één keer in; ze gaan automatisch mee bij elke planning.
- **Boodschappenlijst** – automatisch uit het weekplan, met hoeveelheden voor je gezin + vaste items; af te vinken in de winkel.
- **Kookboek** – bewaar geslaagde recepten als favoriet en laat een week willekeurig uit je kookboek samenstellen.
- **Gezinsruimte** – deel weekplanning, boodschappenlijst, frigo en gezinsprofiel met je gezin via een code van 6 tekens; wijzigingen zijn meteen zichtbaar op elk toestel.
- **Frigo** – wat je op de lijst afvinkt, staat vanzelf in je virtuele frigo; zo weet je wat er in huis is.
- **Scan** – scan de barcode van een product en zie hoe gezond het is (Nutri-Score, bewerkingsgraad, additieven, suikers, calorieën, eiwitten).
- **6 talen** – Nederlands, Frans, Duits, Engels, Spaans en Portugees; volgt de taal van je toestel of kies zelf in het tabblad *Gezin*.

Productgegevens komen van [Open Food Facts](https://openfoodfacts.org). De score is een eenvoudige indicatie, geen medisch advies.

## Starten

Vereist: [Node.js](https://nodejs.org) (LTS) en de app **Expo Go** op je Android-toestel of iPhone.

```bash
git clone https://github.com/Proqltc-prog/expo-app.git
cd expo-app
npm install
npx expo install expo@latest --fix   # brengt alle pakketten op de versie die Expo Go verwacht
npx expo start
```

Scan de QR-code met Expo Go (Android) of de Camera-app (iPhone).

## Testen

```bash
npm test                 # unit tests (node:test via tsx)
npm run typecheck        # TypeScript-controle van de hele app
npm run check            # alles samen
```

Elke pull request draait automatisch de workflow **Tests**; er wordt pas gemerged als die groen is.

## Gezinsruimte (Supabase)

De gezinsruimte gebruikt het Supabase-project **gezond-boodschappen** (regio Frankfurt, gratis plan). Adres en publieke sleutel staan in `src/config.ts`; de toegang tot de gegevens wordt in de database afgeschermd (row level security): enkel leden van een gezin zien of wijzigen de gegevens van dat gezin.

- **Aanmelden** gebeurt anoniem per toestel (instelling *Allow anonymous sign-ins* in Supabase › Authentication).
- **Database**: `supabase/migrations/` (tabellen `gezinnen`, `gezinsleden`, `gezin_items`, `gezin_documenten`; functies `maak_gezin`, `word_lid`, `verlaat_gezin`).
- **Synchroniseren**: de app bewaart alles op het toestel en werkt ook offline; wijzigingen gaan per item naar het gezin (laatste wijziging wint) en komen live binnen. Logica in `src/lib/sync.ts` (getest), verbinding in `src/opslag/sync.ts`.
- **Testen**: `supabase/tests/gezinsruimte_test.sql` (toegangsregels, in de SQL-editor) en de GitHub-workflow *Integratietest* (twee toestellen + een buitenstaander tegen het echte project).
- Gratis projecten worden na een week zonder gebruik gepauzeerd; heractiveren kan met één klik in het Supabase-dashboard.

## AI-planner

De app gebruikt standaard de **AI-planner**: Claude maakt een weekmenu op maat, in de taal van de gebruiker. Lukt dat niet (geen internet, fout, limiet bereikt), dan neemt de **lokale planner** het automatisch over (29 recepten in 6 talen, werkt zonder internet).

De AI loopt via de server-functie `plan-week` in hetzelfde Supabase-project als de gezinsruimte (`supabase/functions/plan-week`):

- de Anthropic API-sleutel staat enkel op de server, als secret `ANTHROPIC_API_KEY` (dashboard › Edge Functions › Secrets); standaardmodel Claude Haiku 5.5, het goedkoopste: ongeveer $0,001 per weekmenu. Een ander model kies je met het secret `PLANNER_MODEL`, bv. `claude-sonnet-5-5`, dat ongeveer $0,025 per weekmenu kost;
- enkel aangemelde toestellen (anonieme sessie van de app) mogen de functie gebruiken;
- daglimiet per gezin per kalenderdag (Belgische tijd): **1** voor iedereen. Een toestel zonder gezin telt als een gezin van één (`ai_toegestaan()`, `ai_daglimiet()` en `ai_tegoed()` in de database). De app toont hoeveel AI-voorstellen er vandaag nog over zijn. Bij de limiet komt het voorstel uit de receptenbank, ook bij ↻;

Opnieuw uitrollen: `supabase functions deploy plan-week`. Enkel de lokale planner gebruiken: zet `EXPO_PUBLIC_PLANNER_URL=` (leeg) in `.env.local`.

## Android-build en Google Play Store

De app heet **Famenu**, met de vaste interne naam `be.famenu.app`. Die naam kan niet meer veranderen zodra de app in de Play Store staat.

- `eas.json` bevat drie profielen:
  - `preview` maakt een APK die je zelf op een gsm installeert;
  - `production` maakt een AAB voor de Play Store;
  - `development` maakt een ontwikkelversie.
- Een build start je via GitHub › Actions › **Android-build** › Run workflow, waar je het profiel kiest. Daarvoor is het GitHub-secret `EXPO_TOKEN` nodig (expo.dev › Account settings › Access tokens).
- De versiecode beheert EAS zelf (`appVersionSource: remote`). De zichtbare versie volgt `app.json`.
- Teksten voor de winkel in 6 talen, het icoon en de feature graphic staan in `store/`. Het ontwerp van het privacybeleid staat in `store/privacybeleid.md`.
- Het icoon (`assets/`) is een eerste versie en mag vervangen worden door een eigen ontwerp.

## Structuur

```
app/                 schermen (expo-router, tabs)
  index.tsx          weekplanning
  lijst.tsx          boodschappenlijst
  scan.tsx           barcode scannen + gezondheidsscore
  profiel.tsx        gezinsprofiel en taal
src/data/            receptenbank, ingrediënten, vaste items
src/i18n/            vertalingen (nl, fr, de, en, es, pt)
src/lib/             pure logica (getest): profiel, lijst, frigo, score, opdrachten
src/lib/planner/     lokale planner, AI-client, controle van plannen
src/opslag/          opslag op het toestel (AsyncStorage) en synchronisatie met de gezinsruimte
src/ui/              React-context voor de taal
supabase/functions/  server-functie voor de AI-planner
```

## Werkwijze

Zie [CLAUDE.md](CLAUDE.md): elke wijziging heeft een Jira-item (project WEEK), een Confluence-pagina (space WEEK), unit tests en een eigen versie met GitHub-release.
