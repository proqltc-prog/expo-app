// WEEK-264: uitleg bij de icoontjes op een kaart van het weekmenu, in dezelfde volgorde als op de kaart.
// Pure gegevens: het scherm tekent elk icoon in dezelfde vorm als op de kaart en zet de vertaalde uitleg ernaast.

/** Hoe het icoon op de kaart getekend is: rond (acties), afgerond vak (recept) of knop met tekst (Gekookt). */
export type IcoonVorm = 'rond' | 'vak' | 'knop';

export type WeekmenuIcoon = {
  /** Naam van het Ionicons-icoon, dezelfde als op de kaart. */
  icoon: string;
  vorm: IcoonVorm;
  /** Deel van de vertaalsleutels planning.iconen.<sleutel>.titel en .uitleg. */
  sleutel: string;
};

export const WEEKMENU_ICONEN: readonly WeekmenuIcoon[] = [
  { icoon: 'checkmark-circle-outline', vorm: 'rond', sleutel: 'bevestigen' },
  { icoon: 'refresh-outline', vorm: 'rond', sleutel: 'anderGerecht' },
  { icoon: 'create-outline', vorm: 'rond', sleutel: 'zelfKiezen' },
  // WEEK-284: het vuilbakje is terug, enkel bij een gerecht dat nog niet bevestigd is.
  { icoon: 'trash-outline', vorm: 'rond', sleutel: 'verwijderen' },
  { icoon: 'book-outline', vorm: 'rond', sleutel: 'recept' },
  { icoon: 'ellipse-outline', vorm: 'knop', sleutel: 'gekookt' },
];

export const icoonTitelSleutel = (i: WeekmenuIcoon) => `planning.iconen.${i.sleutel}.titel`;
export const icoonUitlegSleutel = (i: WeekmenuIcoon) => `planning.iconen.${i.sleutel}.uitleg`;
