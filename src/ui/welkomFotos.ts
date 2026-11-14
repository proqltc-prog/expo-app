// WEEK-289: de bestanden bij de sleutels uit src/lib/welkomFotos.ts (require kan enkel met een vaste tekst).
import type { ImageSourcePropType } from 'react-native';
import type { DagCode } from '@/lib/planner/types';
import type { FotoSleutel } from '@/lib/welkomFotos';

export const WELKOM_FOTO: Record<Exclude<FotoSleutel, 'weekplan'>, ImageSourcePropType> = {
  start: require('../../assets/welkom/start.jpg'),
  huishouden: require('../../assets/welkom/huishouden.jpg'),
  frigo: require('../../assets/welkom/frigo.jpg'),
  lijst: require('../../assets/welkom/lijst.jpg'),
  scan: require('../../assets/welkom/scan.jpg'),
  seizoen: require('../../assets/welkom/seizoen.jpg'),
  winkels: require('../../assets/welkom/winkels.jpg'),
};

/** Plan je week: de zeven borden (WEEK-289). */
export const WEEK_BORD: Record<DagCode, ImageSourcePropType> = {
  maandag: require('../../assets/welkom/bord-maandag.jpg'),
  dinsdag: require('../../assets/welkom/bord-dinsdag.jpg'),
  woensdag: require('../../assets/welkom/bord-woensdag.jpg'),
  donderdag: require('../../assets/welkom/bord-donderdag.jpg'),
  vrijdag: require('../../assets/welkom/bord-vrijdag.jpg'),
  zaterdag: require('../../assets/welkom/bord-zaterdag.jpg'),
  zondag: require('../../assets/welkom/bord-zondag.jpg'),
};
