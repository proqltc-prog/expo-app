import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { wachtOpAanmelding } from '@/opslag/aanmelden';
import { haalGezinNaAanmelden } from '@/opslag/sync';
import { laadProfiel } from '@/opslag/profiel';
import { isProfielIngesteld } from '@/lib/profiel';
import { bestemmingNaAanmelden, ROUTE_WELKOM } from '@/lib/welkom';
import { useTaal } from '@/ui/taal';

const KLEUR = '#0F6B66';
const PAPIER = '#F8F8F4';
const MUTED = '#5E6B63';
/** Hoe lang de tussenpagina op de aanmelding wacht (de gebruiker kiest intussen een account in de browser). */
const MAX_WACHTEN_MS = 120_000;

/**
 * Tussenpagina na aanmelden met Google (WEEK-231). Google stuurt de gebruiker hierheen terug.
 * Ze wacht op de aanmelding, haalt een bestaand gezin op en kiest dan de pagina:
 * gezin nog niet ingesteld → de instellingen met de gezinsruimte; al ingesteld → de weekplanner.
 * Zo is de weekplanner nooit even zichtbaar tijdens het aanmelden.
 */
export default function Aangemeld() {
  const { t } = useTaal();

  useEffect(() => {
    let gestopt = false;
    (async () => {
      const aangemeld = await wachtOpAanmelding(MAX_WACHTEN_MS, () => gestopt);
      if (gestopt) return;
      if (aangemeld) await haalGezinNaAanmelden();
      const ingesteld = isProfielIngesteld(await laadProfiel());
      if (!gestopt) router.replace(bestemmingNaAanmelden(aangemeld, ingesteld));
    })();
    return () => {
      gestopt = true;
    };
  }, []);

  return (
    <View style={s.midden} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={KLEUR} />
      <Text style={s.tekst}>{t('aangemeld.bezig')}</Text>
      <Pressable onPress={() => router.replace(ROUTE_WELKOM)} accessibilityRole="button" hitSlop={12}>
        <Text style={s.link}>{t('aangemeld.annuleren')}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  midden: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, backgroundColor: PAPIER },
  tekst: { fontSize: 16, color: MUTED, textAlign: 'center' },
  link: { color: KLEUR, fontWeight: '700', fontSize: 15 },
});
