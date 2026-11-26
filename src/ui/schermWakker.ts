// WEEK-333: het scherm blijft aan zolang een pagina in beeld is (bv. de bereiding tijdens het koken).
// Aan bij het in beeld komen, uit bij het verlaten: het bereidingsscherm wordt hergebruikt (WEEK-210), dus niet
// enkel bij het aanmaken. Lukt het niet (bv. een browser zonder Wake Lock), dan gewoon het normale gedrag.
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export function useSchermWakker(tag: string): void {
  useFocusEffect(
    useCallback(() => {
      activateKeepAwakeAsync(tag).catch(() => undefined);
      return () => {
        deactivateKeepAwake(tag).catch(() => undefined);
      };
    }, [tag])
  );
}
