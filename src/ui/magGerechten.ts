// WEEK-276: mag dit toestel de eigen gerechten van het gezin beheren? Zonder gezinsruimte ja; met een gezin enkel de beheerder.
// Tot het antwoord er is: nee (zo verschijnt er geen knop die daarna weer verdwijnt bij een ander gezinslid).
import { useEffect, useState } from 'react';
import { magGerechtenBeheren } from '@/lib/gezinbeheer';
import { ikId, laadBeheerderId, laadGezin } from '@/opslag/sync';

export function useMagGerechtenBeheren(): boolean {
  const [mag, setMag] = useState(false);
  useEffect(() => {
    let actief = true;
    laadGezin()
      .then(async (gezin) => (gezin ? magGerechtenBeheren(true, await laadBeheerderId(), await ikId()) : true))
      .catch(() => false)
      .then((m) => {
        if (actief) setMag(m);
      });
    return () => {
      actief = false;
    };
  }, []);
  return mag;
}
