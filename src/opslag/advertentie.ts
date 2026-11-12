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
import type { FilmpjeUitkomst } from '@/lib/inlezenFilmpje';

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
  return (await speelFilmpje()) === 'bekeken';
}

/** WEEK-280: het filmpje vóór het inlezen van een recept, met de drie mogelijke uitkomsten. */
export function toonFilmpjeVoorInlezen(): Promise<FilmpjeUitkomst> {
  return speelFilmpje();
}

/**
 * Speelt één beloond filmpje af. "niet_beschikbaar": geen toestemming, geen filmpje of een fout vóór het tonen;
 * "afgebroken": getoond maar gesloten vóór het einde; "bekeken": volledig bekeken.
 */
async function speelFilmpje(): Promise<FilmpjeUitkomst> {
  if (!(await startAdvertenties())) return 'niet_beschikbaar';
  const platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android';
  const eenheid = kiesEenheid(ECHTE_BELONING_EENHEDEN[platform], TestIds.REWARDED);
  const filmpje = RewardedAd.createForAdRequest(eenheid);

  return new Promise<FilmpjeUitkomst>((resolve) => {
    let beloond = false;
    let getoond = false;
    let klaarMet = false;
    const uit: Array<() => void> = [];
    const timer = setTimeout(() => eindig(getoond ? 'afgebroken' : 'niet_beschikbaar'), WACHTTIJD_MS);

    function eindig(uitkomst: FilmpjeUitkomst) {
      if (klaarMet) return;
      klaarMet = true;
      clearTimeout(timer);
      uit.forEach((stop) => stop());
      resolve(uitkomst);
    }

    uit.push(filmpje.addAdEventListener(RewardedAdEventType.LOADED, () => {
      getoond = true;
      filmpje.show().catch(() => eindig('niet_beschikbaar'));
    }));
    uit.push(filmpje.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      beloond = true;
    }));
    uit.push(filmpje.addAdEventListener(AdEventType.CLOSED, () => eindig(beloond ? 'bekeken' : 'afgebroken')));
    uit.push(filmpje.addAdEventListener(AdEventType.ERROR, () => eindig(getoond ? 'afgebroken' : 'niet_beschikbaar')));
    filmpje.load();
  });
}
