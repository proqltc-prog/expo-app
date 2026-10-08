# Gezond Boodschappen

Smartphone-app (React Native / Expo) voor de wekelijkse boodschappen:

- **Weekmenu** – snelle avondmaaltijden zondag–vrijdag, afwisselend vlees, vegetarisch en vis.
- **Boodschappenlijst** – automatisch uit het weekmenu + vaste items (brood & beleg, fruit, school, huishouden), af te vinken in de winkel.
- **Scan** – scan de barcode van een product en zie hoe gezond het is (Nutri-Score, bewerkingsgraad, additieven, suikers, calorieën, eiwitten). Accepteren of afwijzen en een ander product zoeken.

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

## Structuur

```
app/            schermen (expo-router, tabs)
  index.tsx     weekmenu
  lijst.tsx     boodschappenlijst
  scan.tsx      barcode scannen + gezondheidsscore
src/data/       recepten en vaste items
src/lib/        opslag van de lijst, Open Food Facts + score
```

## Volgende stappen

- Weekmenu laten voorstellen door AI (met budget en gezinsvoorkeuren)
- Lijst delen tussen twee telefoons
- Alternatieven voorstellen bij een afgewezen product
