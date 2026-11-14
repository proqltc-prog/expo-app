// WEEK-289: de bestanden bij de sleutels uit src/lib/welkomFotos.ts (require kan enkel met een vaste tekst).
import type { ImageSourcePropType } from 'react-native';
import type { FotoSleutel } from '@/lib/welkomFotos';

export const WELKOM_FOTO: Record<FotoSleutel, ImageSourcePropType> = {
  start: require('../../assets/welkom/start.jpg'),
  weekplan: require('../../assets/welkom/weekplan.jpg'),
  huishouden: require('../../assets/welkom/huishouden.jpg'),
  frigo: require('../../assets/welkom/frigo.jpg'),
  lijst: require('../../assets/welkom/lijst.jpg'),
  scan: require('../../assets/welkom/scan.jpg'),
  seizoen: require('../../assets/welkom/seizoen.jpg'),
  winkels: require('../../assets/welkom/winkels.jpg'),
};
