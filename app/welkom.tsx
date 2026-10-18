import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { TALEN, Taal, vertaal } from '@/i18n';
import { zetWelkomGezien } from '@/opslag/welkom';
import { ROUTE_NA_WELKOM } from '@/lib/welkom';
import { useTaal } from '@/ui/taal';

const KLEUR = '#0F6B66';
const PAPIER = '#F8F8F4';
const INKT = '#17201A';
const MUTED = '#5E6B63';

/** Welkomstscherm (WEEK-79): eerst de taal kiezen, daarna gaat de app naar de gezinsruimte. */
export default function Welkom() {
  const { t, zetVoorkeur } = useTaal();

  const kies = async (code: Taal) => {
    // Enkel op dit toestel (WEEK-80): de taal gaat niet naar het gezin of naar andere toestellen.
    zetVoorkeur(code);
    await zetWelkomGezien();
    router.replace(ROUTE_NA_WELKOM);
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.titel}>{t('welkom.titel')}</Text>
      <Text style={s.tekst}>{t('welkom.tekst')}</Text>
      <View style={s.lijst}>
        {TALEN.map((code) => (
          <Pressable key={code} style={s.keuze} onPress={() => kies(code)} accessibilityRole="button">
            <Text style={s.keuzeTekst}>{vertaal(code, 'taal.naam')}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, gap: 16, backgroundColor: PAPIER, flexGrow: 1, justifyContent: 'center' },
  titel: { fontSize: 26, fontWeight: '800', color: INKT },
  tekst: { fontSize: 16, color: MUTED, marginBottom: 12 },
  lijst: { gap: 10 },
  keuze: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: KLEUR, paddingVertical: 16, paddingHorizontal: 18 },
  keuzeTekst: { fontSize: 17, fontWeight: '700', color: KLEUR },
});
