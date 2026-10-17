// Reclamefilmpjes met beloning op het toestel (WEEK-38). Dun: de keuzes zitten in src/lib/advertentie.ts.
import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { ECHTE_BELONING_EENHEDEN, kiesEenheid } from '@/lib/advertentie';

const WACHTTIJD_MS = 15000;

let klaar: Promise<boolean> | null = null;

/** Eenmalig: toestemming (UMP/GDPR) vragen en de advertenties initialiseren. */
function startAdvertenties(): Promise<boolean> {
  if (!klaar) {
    klaar = (async () => {
      try {
        const info = await AdsConsent.gatherConsent();
        if (!info.canRequestAds) return false;
        await mobileAds().initialize();
        return true;
      } catch {
        return false;
      }
    })();
  }
  return klaar;
}

/**
 * Toont één beloond filmpje. Geeft true enkel als de gebruiker het volledig bekeek;
 * bij een fout, een time-out of als het sluiten vóór het einde gebeurt, false.
 */
export async function bekijkBeloondFilmpje(): Promise<boolean> {
  if (!(await startAdvertenties())) return false;
  const platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android';
  const eenheid = kiesEenheid(ECHTE_BELONING_EENHEDEN[platform], TestIds.REWARDED);
  const filmpje = RewardedAd.createForAdRequest(eenheid);

  return new Promise<boolean>((resolve) => {
    let beloond = false;
    let klaarMet = false;
    const uit: Array<() => void> = [];
    const timer = setTimeout(() => eindig(false), WACHTTIJD_MS);

    function eindig(uitkomst: boolean) {
      if (klaarMet) return;
      klaarMet = true;
      clearTimeout(timer);
      uit.forEach((stop) => stop());
      resolve(uitkomst);
    }

    uit.push(filmpje.addAdEventListener(RewardedAdEventType.LOADED, () => {
      filmpje.show().catch(() => eindig(false));
    }));
    uit.push(filmpje.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      beloond = true;
    }));
    uit.push(filmpje.addAdEventListener(AdEventType.CLOSED, () => eindig(beloond)));
    uit.push(filmpje.addAdEventListener(AdEventType.ERROR, () => eindig(false)));
    filmpje.load();
  });
}
