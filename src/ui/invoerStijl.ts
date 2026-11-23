// WEEK-329: één uitzicht voor alle invoervelden van de app (rand, hoeken, ruimte, letters) en voor de voorbeeldtekst
// (placeholder): lichtgrijs en schuin, zodat ze niet lijkt op tekst die al ingevuld is. Het schuine geldt enkel zolang
// het veld leeg is. Een scherm voegt enkel toe wat echt anders is (breedte, meerdere regels, een accentrand).
import type { TextStyle } from 'react-native';

export const PLACEHOLDER_KLEUR = '#9AA39D';

/** Het gewone invoerveld, overal in de app gelijk. */
export const VELD: TextStyle = {
  borderWidth: 1.5,
  borderColor: '#D5DBD3',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
  minHeight: 48,
  fontSize: 16,
  color: '#17201A',
  backgroundColor: '#FFFFFF',
};

/** Een veld met een fout (zelfde rood overal). */
export const VELD_FOUT: TextStyle = { borderColor: '#B3261E' };

/** Bij een leeg veld: schuine letters (de placeholder); zodra er iets getypt is, gewone letters. */
export const LEEG_VELD: TextStyle = { fontStyle: 'italic' };
