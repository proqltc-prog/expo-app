import AsyncStorage from '@react-native-async-storage/async-storage';
import { SLEUTEL } from './sleutels';

// Het welkomstscherm is eenmaal per toestel te zien (WEEK-79). Enkel lokaal, dus niet in de gezinssynchronisatie.

export async function laadWelkomGezien(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SLEUTEL.welkom)) === 'ja';
  } catch {
    return false;
  }
}

export async function zetWelkomGezien(): Promise<void> {
  try {
    await AsyncStorage.setItem(SLEUTEL.welkom, 'ja');
  } catch {
    // Geen opslag beschikbaar: het welkomstscherm komt dan bij de volgende opening terug.
  }
}
