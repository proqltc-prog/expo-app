// Kookwekkers (WEEK-334): de lopende wekkers voor de hele app, met het signaal als de tijd om is.
// De wekkers staan buiten de schermen, zodat ze blijven lopen als je even naar Boodschappen of In huis gaat.
// Signaal: een melding van het toestel met geluid (ook met het scherm uit of de app op de achtergrond) en, zolang de
// app open is, trillen en een balk bovenaan tot je op Stop tikt. Zonder toestemming voor meldingen blijven trillen en balk.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { hervat, heeftAlarm, pauzeer, startWekker, tijdLabel, werkBij, type Wekker } from '@/lib/kookwekker';
import { useTaal } from '@/ui/taal';

const ORANJE = '#E8680F';
const KANAAL = 'kookwekker';
const TRIL = [0, 700, 500, 700, 500];

let wekkers: Wekker[] = [];
/** Het tijdstip van de laatste tik (ms), voor de schermen die de resterende tijd tonen. */
let nu = Date.now();
const luisteraars = new Set<() => void>();
const meldingen = new Map<string, string>();

function zet(nieuw: Wekker[]) {
  if (nieuw === wekkers) return;
  const hadAlarm = heeftAlarm(wekkers);
  wekkers = nieuw;
  const nuAlarm = heeftAlarm(wekkers);
  if (nuAlarm && !hadAlarm) trilStart();
  if (!nuAlarm && hadAlarm) trilStop();
  regelKlok();
  luisteraars.forEach((l) => l());
}

// ---------------------------------------------------------------- klok

let klok: ReturnType<typeof setInterval> | undefined;
function regelKlok() {
  const loopt = wekkers.some((w) => w.eind !== undefined && !w.afgelopen);
  if (loopt && !klok) klok = setInterval(tik, 1000);
  if (!loopt && klok) {
    clearInterval(klok);
    klok = undefined;
  }
}
function tik() {
  nu = Date.now();
  zet(werkBij(wekkers, nu));
  // Ook zonder verandering: de schermen tonen de resterende tijd.
  luisteraars.forEach((l) => l());
}
// Terug op de voorgrond: meteen bijwerken (de tijd liep verder op het toestel).
AppState.addEventListener?.('change', (staat) => {
  if (staat === 'active') tik();
});

// ---------------------------------------------------------------- signaal

let webGeluid: ReturnType<typeof setInterval> | undefined;
function biep() {
  try {
    const Ctx = (globalThis as { AudioContext?: new () => AudioContext }).AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    for (const [i, f] of [880, 660, 880].entries()) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.value = 0.15;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.25);
      o.stop(ctx.currentTime + i * 0.25 + 0.18);
    }
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    // Geen geluid mogelijk: de balk en het trillen blijven.
  }
}
function trilStart() {
  if (Platform.OS === 'web') {
    biep();
    webGeluid = setInterval(biep, 2500);
    (globalThis.navigator as Navigator | undefined)?.vibrate?.([700, 500, 700]);
    return;
  }
  Vibration.vibrate(TRIL, true);
}
function trilStop() {
  if (webGeluid) clearInterval(webGeluid);
  webGeluid = undefined;
  if (Platform.OS !== 'web') Vibration.cancel();
}

// ---------------------------------------------------------------- meldingen van het toestel

let meldingKlaar: Promise<boolean> | undefined;
/** Eenmalig: kanaal aanmaken en toestemming vragen. Geeft false als meldingen niet mogen of niet bestaan (web). */
function meldingenKlaar(kanaalNaam: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(false);
  meldingKlaar ??= (async () => {
    try {
      Notifications.setNotificationHandler({
        // In de app: de balk bovenaan toont het al; enkel het geluid van de melding.
        handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: true }),
      });
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(KANAAL, {
          name: kanaalNaam,
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: TRIL,
          sound: 'default',
        });
      }
      const huidig = await Notifications.getPermissionsAsync();
      if (huidig.granted) return true;
      if (!huidig.canAskAgain) return false;
      return (await Notifications.requestPermissionsAsync()).granted;
    } catch {
      return false;
    }
  })();
  return meldingKlaar;
}

async function planMelding(w: Wekker, titel: string, tekst: string, kanaalNaam: string) {
  if (w.eind === undefined || !(await meldingenKlaar(kanaalNaam))) return;
  try {
    const seconden = Math.max(1, Math.round((w.eind - Date.now()) / 1000));
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: titel, body: tekst, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: seconden, channelId: KANAAL },
    });
    // Intussen gepauzeerd of gewist? Dan meteen weer weg.
    const nu = wekkers.find((x) => x.id === w.id);
    if (!nu || nu.eind !== w.eind) void Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
    else meldingen.set(w.id, id);
  } catch {
    // Geen melding: de balk en het trillen in de app blijven.
  }
}
function schrapMelding(id: string) {
  const m = meldingen.get(id);
  meldingen.delete(id);
  if (m && Platform.OS !== 'web') void Notifications.cancelScheduledNotificationAsync(m).catch(() => undefined);
}

// ---------------------------------------------------------------- acties

/** Teksten voor de melding; de schermen geven ze mee in de taal van de app. */
export type MeldingTeksten = { titel: string; tekst: (w: Wekker) => string; kanaal: string };

export const kookwekkers = {
  start(receptId: string, naam: string, stap: number, seconden: number, teksten: MeldingTeksten) {
    nu = Date.now();
    const w = startWekker(receptId, stap, seconden, nu, naam);
    schrapMelding(w.id);
    zet([...wekkers.filter((x) => x.id !== w.id), w]);
    void planMelding(w, teksten.titel, teksten.tekst(w), teksten.kanaal);
  },
  pauzeer(id: string) {
    nu = Date.now();
    schrapMelding(id);
    zet(wekkers.map((w) => (w.id === id ? pauzeer(w, Date.now()) : w)));
  },
  hervat(id: string, teksten: MeldingTeksten) {
    nu = Date.now();
    zet(wekkers.map((w) => (w.id === id ? hervat(w, Date.now()) : w)));
    const w = wekkers.find((x) => x.id === id);
    if (w) void planMelding(w, teksten.titel, teksten.tekst(w), teksten.kanaal);
  },
  /** Wissen, of na "Stop" de afgelopen wekker weg. */
  wis(id: string) {
    schrapMelding(id);
    zet(wekkers.filter((w) => w.id !== id));
  },
  /** Stop: alle afgelopen wekkers weg en het signaal uit. */
  stopAlarm() {
    for (const w of wekkers) if (w.afgelopen) schrapMelding(w.id);
    zet(wekkers.filter((w) => !w.afgelopen));
  },
};

/** De wekkers en het huidige tijdstip; het scherm wordt elke seconde bijgewerkt zolang er een loopt. */
export function useKookwekkers(): Wekker[] {
  return useSyncExternalStore(
    (l) => {
      luisteraars.add(l);
      return () => luisteraars.delete(l);
    },
    () => wekkers,
  );
}

/** Het tijdstip van de laatste tik: een scherm met lopende wekkers tekent elke seconde opnieuw. */
export function useNu(): number {
  return useSyncExternalStore(
    (l) => {
      luisteraars.add(l);
      return () => luisteraars.delete(l);
    },
    () => nu,
  );
}

/** De teksten voor de melding, in de taal van de app. */
export function useMeldingTeksten(): MeldingTeksten {
  const { t } = useTaal();
  return {
    titel: t('kookwekker.klaar'),
    tekst: (w) =>
      t('kookwekker.meldingTekst', {
        naam: w.naam ?? '',
        n: w.stap,
        tijd: tijdLabel(w.seconden, { u: t('kookwekker.u'), min: t('kookwekker.min'), s: t('kookwekker.s') }),
      }),
    kanaal: t('kookwekker.kanaal'),
  };
}

/** De balk bovenaan als een kookwekker afgelopen is, op elk scherm van de app, met Stop. */
export function KookwekkerAlarm() {
  const { t } = useTaal();
  const lijst = useKookwekkers();
  const boven = useSafeAreaInsets().top;
  const af = lijst.filter((w) => w.afgelopen);
  // Weg van de app en weer terug: het signaal opnieuw starten als er nog een afgelopen wekker is.
  useEffect(() => {
    if (!af.length) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') trilStart();
      else trilStop();
    });
    return () => sub.remove();
  }, [af.length]);
  if (!af.length) return null;
  return (
    <View style={[s.balk, { paddingTop: boven + 10 }]} accessibilityLiveRegion="assertive" accessibilityRole="alert">
      <Ionicons name="alarm-outline" size={30} color="#fff" />
      <View style={s.tekstVak}>
        <Text style={s.titel}>{t('kookwekker.klaar')}</Text>
        {af.map((w) => (
          <Text key={w.id} style={s.tekst} numberOfLines={1}>
            {t('kookwekker.klaarTekst', { naam: w.naam ?? '', n: w.stap })}
          </Text>
        ))}
      </View>
      <Pressable style={s.stop} onPress={kookwekkers.stopAlarm} accessibilityRole="button" hitSlop={8}>
        <Text style={s.stopTekst}>{t('kookwekker.stop')}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  balk: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 12,
    backgroundColor: ORANJE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  tekstVak: { flex: 1 },
  titel: { color: '#fff', fontSize: 20, fontWeight: '800' },
  tekst: { color: '#fff', fontSize: 15, fontWeight: '600' },
  stop: { backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 22, paddingVertical: 12 },
  stopTekst: { color: ORANJE, fontSize: 18, fontWeight: '800' },
});
